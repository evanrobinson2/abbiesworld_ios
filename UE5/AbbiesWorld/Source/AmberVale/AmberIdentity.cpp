#include "AmberIdentity.h"
#include "HttpServerModule.h"
#include "IHttpRouter.h"
#include "HttpServerResponse.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "GenericPlatform/GenericPlatformHttp.h"
#include "HAL/PlatformProcess.h"
#include "Misc/Base64.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonSerializer.h"
THIRD_PARTY_INCLUDES_START
#define UI OPENSSL_UI
#include <openssl/rand.h>
#include <openssl/sha.h>
#undef UI
THIRD_PARTY_INCLUDES_END
namespace {
 FString B64(const uint8* Data,int32 N){return FBase64::Encode(Data,N).Replace(TEXT("+"),TEXT("-")).Replace(TEXT("/"),TEXT("_")).Replace(TEXT("="),TEXT(""));}
 FString Encode(const FString& S){return FGenericPlatformHttp::UrlEncode(S);}
 bool Random(FString& Out){uint8 Bytes[32];if(RAND_bytes(Bytes,32)!=1)return false;Out=B64(Bytes,32);return true;}
 TSharedPtr<FJsonObject> Json(const FString& S){TSharedPtr<FJsonObject> J;FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(S),J);return J;}
 const FString Redirect=TEXT("http://127.0.0.1:8769/auth/callback");
}
void FAmberIdentity::Fail(const FString& Message){Busy=false;SignedIn=false;Token.Empty();Profiles.Empty();ActiveName.Empty();ActiveProfileId.Empty();Universes.Empty();UniversesLoaded=false;LeaveUniverse();Status=Message;Verifier.Empty();State.Empty();if(Router&&Route.IsValid())Router->UnbindRoute(Route);Route.Reset();if(Changed)Changed();}
void FAmberIdentity::Cancel(){Changed=nullptr;LeaveUniverse();Universes.Empty();UniversesLoaded=false;ActiveName.Empty();ActiveProfileId.Empty();Busy=false;Token.Empty();Verifier.Empty();State.Empty();Profiles.Empty();SignedIn=false;if(Router&&Route.IsValid())Router->UnbindRoute(Route);Route.Reset();}
void FAmberIdentity::Tick(){if(Busy&&FPlatformTime::Seconds()-Started>180)Fail(TEXT("Sign-in timed out. Please try again."));if(SignedIn&&FPlatformTime::Seconds()>Expires){SignedIn=false;Token.Empty();Profiles.Empty();ActiveName.Empty();ActiveProfileId.Empty();LeaveUniverse();Status=TEXT("Your session expired. Please sign in again.");if(Changed)Changed();}}
void FAmberIdentity::Login(){
 if(Busy)return;
 FString Text;FFileHelper::LoadFileToString(Text,*(FPaths::ProjectContentDir()/TEXT("Data/identity.json")));auto Config=Json(Text);
 if(!Config.IsValid()||!Config->TryGetStringField(TEXT("domain"),Domain)||!Config->TryGetStringField(TEXT("client_id"),Client)||!Config->TryGetStringField(TEXT("api_base"),Api)||Client.IsEmpty()||!Api.StartsWith(TEXT("https://"))){Fail(TEXT("Connection unavailable: the secure household API address is not configured. Choose Preview to play locally. Online sign-in needs the HTTPS API restored."));return;}
 if(Domain.Contains(TEXT("/"))||Domain.Contains(TEXT(":"))){Fail(TEXT("Invalid identity domain configuration."));return;}
 if(!Random(Verifier)||!Random(State)){Fail(TEXT("Secure sign-in could not initialize."));return;}
 uint8 Digest[32];FTCHARToUTF8 V(*Verifier);SHA256(reinterpret_cast<const uint8*>(V.Get()),V.Length(),Digest);FString Challenge=B64(Digest,32);
 Router=FHttpServerModule::Get().GetHttpRouter(8769,true);if(!Router.IsValid()){Fail(TEXT("Sign-in callback port is busy. Close the other game and retry."));return;}
 Busy=true;SignedIn=false;Started=FPlatformTime::Seconds();Status=TEXT("Complete sign-in in your browser, then return here.");TWeakPtr<FAmberIdentity> Weak=AsShared();
 Route=Router->BindRoute(FHttpPath(TEXT("/auth/callback")),EHttpServerRequestVerbs::VERB_GET,FHttpRequestHandler::CreateLambda([Weak](const FHttpServerRequest& Request,const FHttpResultCallback& Result){
  auto Self=Weak.Pin();auto Response=FHttpServerResponse::Create(TEXT("<!doctype html><title>Abbie's World</title><p>Return to Abbie's World to continue.</p>"),TEXT("text/html; charset=utf-8"));Response->Headers.Add(TEXT("Cache-Control"),{TEXT("no-store")});Response->Headers.Add(TEXT("Referrer-Policy"),{TEXT("no-referrer")});
  if(!Self||!Self->Busy||Request.QueryParams.FindRef(TEXT("state"))!=Self->State){Response->Code=EHttpServerResponseCodes::BadRequest;Result(MoveTemp(Response));return true;}
  FString Code=Request.QueryParams.FindRef(TEXT("code"));Result(MoveTemp(Response));if(Code.IsEmpty())Self->Fail(TEXT("Sign-in was cancelled or denied."));else {Self->State.Empty();Self->Exchange(Code);}return true;
 }));
 if(!Route.IsValid()){Fail(TEXT("Could not register the sign-in callback."));return;}
 FHttpServerModule::Get().StartAllListeners();
 FString URL=TEXT("https://")+Domain+TEXT("/authorize?response_type=code&client_id=")+Encode(Client)+TEXT("&redirect_uri=")+Encode(Redirect)+TEXT("&scope=openid%20profile%20email&audience=https%3A%2F%2Fapi.abbies.world&code_challenge_method=S256&code_challenge=")+Challenge+TEXT("&state=")+State;
 FString LaunchError;FPlatformProcess::LaunchURL(*URL,nullptr,&LaunchError);if(!LaunchError.IsEmpty()){Fail(TEXT("Could not open your browser. Check the Windows default browser and try Connect again."));return;}if(Changed)Changed();
}
void FAmberIdentity::Exchange(const FString& Code){
 if(Router&&Route.IsValid())Router->UnbindRoute(Route);Route.Reset();Status=TEXT("Connecting your household...");
 auto Request=FHttpModule::Get().CreateRequest();Request->SetURL(TEXT("https://")+Domain+TEXT("/oauth/token"));Request->SetVerb(TEXT("POST"));Request->SetHeader(TEXT("Content-Type"),TEXT("application/x-www-form-urlencoded"));Request->SetContentAsString(TEXT("grant_type=authorization_code&client_id=")+Encode(Client)+TEXT("&code=")+Encode(Code)+TEXT("&code_verifier=")+Encode(Verifier)+TEXT("&redirect_uri=")+Encode(Redirect));Request->SetTimeout(20);
 TWeakPtr<FAmberIdentity> Weak=AsShared();Request->OnProcessRequestComplete().BindLambda([Weak](FHttpRequestPtr,FHttpResponsePtr Response,bool OK){auto S=Weak.Pin();if(!S||!S->Busy)return;S->Verifier.Empty();if(!OK||!Response.IsValid()||Response->GetResponseCode()!=200){S->Fail(TEXT("The account provider could not complete sign-in. Check the native callback registration."));return;}auto J=Json(Response->GetContentAsString());if(!J.IsValid()||!J->TryGetStringField(TEXT("access_token"),S->Token)){S->Fail(TEXT("The account provider returned an incomplete session."));return;}double TTL=3600;J->TryGetNumberField(TEXT("expires_in"),TTL);S->Expires=FPlatformTime::Seconds()+TTL;S->FetchHousehold();});Request->ProcessRequest();
}
void FAmberIdentity::FetchHousehold(){auto R=FHttpModule::Get().CreateRequest();R->SetURL(Api+TEXT("/api/v1/me"));R->SetVerb(TEXT("GET"));R->SetHeader(TEXT("Authorization"),TEXT("Bearer ")+Token);R->SetTimeout(20);TWeakPtr<FAmberIdentity> Weak=AsShared();R->OnProcessRequestComplete().BindLambda([Weak](FHttpRequestPtr,FHttpResponsePtr Response,bool OK){auto S=Weak.Pin();if(!S||!S->Busy)return;if(!OK||!Response.IsValid()||Response->GetResponseCode()!=200){S->Token.Empty();S->Fail(TEXT("Signed in, but your household could not be loaded. Please retry; no local profile was substituted."));return;}auto J=Json(Response->GetContentAsString());const TArray<TSharedPtr<FJsonValue>>* Ps=nullptr;if(!J.IsValid()||!J->TryGetArrayField(TEXT("profiles"),Ps)){S->Fail(TEXT("Your household response was incomplete."));return;}S->Profiles.Empty();J->TryGetStringField(TEXT("account_role"),S->AccountRole);for(auto P:*Ps){auto O=P->AsObject();FAmberProfile F;if(O.IsValid()&&O->TryGetStringField(TEXT("id"),F.Id)&&O->TryGetStringField(TEXT("display_name"),F.Name)){O->TryGetStringField(TEXT("role"),F.Role);S->Profiles.Add(F);}}S->SignedIn=true;S->Busy=false;S->Status=TEXT("Choose who is playing.");if(S->Changed)S->Changed();});R->ProcessRequest();}
void FAmberIdentity::Choose(const FString& Id){if(!SignedIn||Busy)return;auto Found=Profiles.FindByPredicate([&](const FAmberProfile& P){return P.Id==Id;});if(!Found)return;FString Name=Found->Name;Busy=true;Started=FPlatformTime::Seconds();auto R=FHttpModule::Get().CreateRequest();R->SetURL(Api+TEXT("/api/v1/session/active-profile"));R->SetVerb(TEXT("POST"));R->SetHeader(TEXT("Authorization"),TEXT("Bearer ")+Token);R->SetHeader(TEXT("Content-Type"),TEXT("application/json"));auto J=MakeShared<FJsonObject>();J->SetStringField(TEXT("profile_id"),Id);FString Body;FJsonSerializer::Serialize(J,TJsonWriterFactory<>::Create(&Body));R->SetContentAsString(Body);R->SetTimeout(20);TWeakPtr<FAmberIdentity> Weak=AsShared();R->OnProcessRequestComplete().BindLambda([Weak,Name,Id](FHttpRequestPtr,FHttpResponsePtr Response,bool OK){auto S=Weak.Pin();if(!S||!S->Busy)return;S->Busy=false;if(OK&&Response.IsValid()&&Response->GetResponseCode()>=200&&Response->GetResponseCode()<300){S->ActiveName=Name;S->ActiveProfileId=Id;S->FetchUniverses();return;}else S->Status=TEXT("Could not select this player. Please retry.");if(S->Changed)S->Changed();});R->ProcessRequest();}
