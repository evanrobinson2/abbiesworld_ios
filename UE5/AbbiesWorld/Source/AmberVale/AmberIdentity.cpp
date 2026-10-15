#include "AmberIdentity.h"
#include "AmberCredentialStore.h"
#include "Misc/DateTime.h"
#include "Misc/ConfigCacheIni.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
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
void FAmberIdentity::Fail(const FString& Message){Busy=false;SignedIn=false;Token.Empty();Profiles.Empty();ActiveName.Empty();ActiveProfileId.Empty();Universes.Empty();UniversesLoaded=false;LeaveUniverse();Status=Message;Verifier.Empty();State.Empty();if(Router&&Route.IsValid())Router->UnbindRoute(Route);Route.Reset();Notify();}
void FAmberIdentity::Cancel(){++Generation;SavingUniverse=false;Refreshing=false;Restoring=false;SessionRemembered=false;RefreshToken.Empty();PreferredProfileId.Empty();Changed=nullptr;LeaveUniverse();Universes.Empty();UniversesLoaded=false;ActiveName.Empty();ActiveProfileId.Empty();Busy=false;Token.Empty();Verifier.Empty();State.Empty();Profiles.Empty();SignedIn=false;if(Router&&Route.IsValid())Router->UnbindRoute(Route);Route.Reset();}
void FAmberIdentity::Notify(){auto Callback=Changed;if(Callback)Callback();}
FString FAmberIdentity::CredentialTarget() const{return TEXT("AbbiesWorld/Auth0/")+Domain+TEXT("/")+Client;}
bool FAmberIdentity::LoadConfig(){
 FString Text;FFileHelper::LoadFileToString(Text,*(FPaths::ProjectContentDir()/TEXT("Data/identity.json")));auto C=Json(Text);
 if(!C.IsValid()||!C->TryGetStringField(TEXT("domain"),Domain)||!C->TryGetStringField(TEXT("client_id"),Client)||!C->TryGetStringField(TEXT("api_base"),Api)||Client.IsEmpty()||!Api.StartsWith(TEXT("https://"))||Domain.Contains(TEXT("/"))||Domain.Contains(TEXT(":")))return false;
 GConfig->GetBool(TEXT("AbbiesWorld.Identity"),TEXT("ExplicitLogout"),ExplicitLogout,GGameUserSettingsIni);return true;
}
bool FAmberIdentity::SaveSession(){
 auto J=MakeShared<FJsonObject>();J->SetStringField(TEXT("client"),Client);J->SetStringField(TEXT("domain"),Domain);J->SetStringField(TEXT("api"),Api);
 J->SetStringField(TEXT("access_token"),Token);J->SetStringField(TEXT("refresh_token"),RefreshToken);J->SetStringField(TEXT("player"),ActiveProfileId.IsEmpty()?PreferredProfileId:ActiveProfileId);J->SetNumberField(TEXT("expires_at"),FDateTime::UtcNow().ToUnixTimestamp()+FMath::Max(0.0,Expires-FPlatformTime::Seconds()));
 FString Text;FJsonSerializer::Serialize(J,TJsonWriterFactory<>::Create(&Text));return AmberCredentials::Save(CredentialTarget(),Text);
}
void FAmberIdentity::Restore(){
 if(Busy||Refreshing||SignedIn||RequireLogin)return;if(!LoadConfig())return;if(ExplicitLogout){RequireLogin=true;return;}
 FString Text;if(!AmberCredentials::Load(CredentialTarget(),Text))return;auto J=Json(Text);FString SavedClient,SavedDomain,SavedApi;
 if(!J.IsValid()||!J->TryGetStringField(TEXT("client"),SavedClient)||SavedClient!=Client||!J->TryGetStringField(TEXT("domain"),SavedDomain)||SavedDomain!=Domain||!J->TryGetStringField(TEXT("api"),SavedApi)||SavedApi!=Api)return;
 J->TryGetStringField(TEXT("player"),PreferredProfileId);J->TryGetStringField(TEXT("access_token"),Token);J->TryGetStringField(TEXT("refresh_token"),RefreshToken);double At=0;J->TryGetNumberField(TEXT("expires_at"),At);Expires=FPlatformTime::Seconds()+At-FDateTime::UtcNow().ToUnixTimestamp();
 SessionRemembered=!RefreshToken.IsEmpty();Restoring=true;Status=TEXT("Restoring your sign-in...");
 if(FParse::Param(FCommandLine::Get(),TEXT("RefreshLoginProof")))Expires=0;
 if(!Token.IsEmpty()&&Expires>FPlatformTime::Seconds()+60){Busy=true;Started=FPlatformTime::Seconds();FetchHousehold();}
 else if(!RefreshToken.IsEmpty())RefreshSession();else{Restoring=false;RequireLogin=true;Status=TEXT("Connect once to enable remembered sign-in.");}
}
void FAmberIdentity::AcceptTokens(const TSharedPtr<FJsonObject>& J){
 double TTL=3600;J->TryGetNumberField(TEXT("expires_in"),TTL);Expires=FPlatformTime::Seconds()+TTL;
 FString Rotated;if(J->TryGetStringField(TEXT("refresh_token"),Rotated)&&!Rotated.IsEmpty())RefreshToken=Rotated;
 // Persist the rotated token immediately, before making any household API request.
 bool Stored=SaveSession();SessionRemembered=Stored&&!RefreshToken.IsEmpty();ExplicitLogout=false;RequireLogin=false;RetryAt=0;
 GConfig->SetBool(TEXT("AbbiesWorld.Identity"),TEXT("ExplicitLogout"),false,GGameUserSettingsIni);GConfig->Flush(false,GGameUserSettingsIni);
 if(!Stored)Status=TEXT("Signed in, but Windows could not save the session. Reconnect before closing.");
}
void FAmberIdentity::RefreshSession(){
 if(Refreshing||RefreshToken.IsEmpty()||SavingUniverse)return;Refreshing=true;Started=FPlatformTime::Seconds();const uint64 Epoch=Generation;
 if(!SignedIn){Busy=true;Restoring=true;Status=TEXT("Restoring your sign-in...");}
 auto R=FHttpModule::Get().CreateRequest();R->SetURL(TEXT("https://")+Domain+TEXT("/oauth/token"));R->SetVerb(TEXT("POST"));R->SetHeader(TEXT("Content-Type"),TEXT("application/x-www-form-urlencoded"));R->SetTimeout(20);
 R->SetContentAsString(TEXT("grant_type=refresh_token&client_id=")+Encode(Client)+TEXT("&refresh_token=")+Encode(RefreshToken));TWeakPtr<FAmberIdentity> Weak=AsShared();const uint64 RequestEpoch=Generation;
 R->OnProcessRequestComplete().BindLambda([Weak,Epoch](FHttpRequestPtr,FHttpResponsePtr Response,bool OK){auto S=Weak.Pin();if(!S||S->Generation!=Epoch)return;S->Refreshing=false;
  auto J=OK&&Response.IsValid()?Json(Response->GetContentAsString()):nullptr;
  if(!OK||!Response.IsValid()||Response->GetResponseCode()!=200||!J.IsValid()||!J->TryGetStringField(TEXT("access_token"),S->Token)){
   FString Error;if(J.IsValid())J->TryGetStringField(TEXT("error"),Error);
   if(Error==TEXT("invalid_grant")){AmberCredentials::Remove(S->CredentialTarget());S->RefreshToken.Empty();S->SessionRemembered=false;S->RequireLogin=true;S->Fail(TEXT("Your saved sign-in was revoked or expired. Connect to authorize again."));}
   else{S->Busy=false;S->Restoring=false;S->RetryAt=FPlatformTime::Seconds()+30;S->Status=TEXT("Waiting to reconnect. Your saved sign-in is retained.");S->Notify();}return;
  }
  S->AcceptTokens(J);if(S->Restoring||!S->SignedIn){S->Busy=true;S->FetchHousehold();}
 });if(!R->ProcessRequest()){Refreshing=false;Busy=false;RetryAt=FPlatformTime::Seconds()+30;}
}
void FAmberIdentity::ChangePlayer(){if(Busy)return;LeaveUniverse();ActiveName.Empty();ActiveProfileId.Empty();PreferredProfileId.Empty();Universes.Empty();SaveSession();Notify();}
void FAmberIdentity::Logout(){
 const FString OldRefresh=RefreshToken;const FString OldDomain=Domain,OldClient=Client;AmberCredentials::Remove(CredentialTarget());RefreshToken.Empty();
 auto Callback=Changed;Cancel();Changed=Callback;ExplicitLogout=true;RequireLogin=true;RetryAt=0;
 GConfig->SetBool(TEXT("AbbiesWorld.Identity"),TEXT("ExplicitLogout"),true,GGameUserSettingsIni);GConfig->Flush(false,GGameUserSettingsIni);
 if(!OldRefresh.IsEmpty()){auto R=FHttpModule::Get().CreateRequest();R->SetURL(TEXT("https://")+OldDomain+TEXT("/oauth/revoke"));R->SetVerb(TEXT("POST"));R->SetHeader(TEXT("Content-Type"),TEXT("application/x-www-form-urlencoded"));R->SetContentAsString(TEXT("client_id=")+Encode(OldClient)+TEXT("&token=")+Encode(OldRefresh));R->SetTimeout(10);R->ProcessRequest();}
 Status=TEXT("Logged out. Connect when you want to sign in again.");Notify();
}
void FAmberIdentity::Tick(){
 const double Now=FPlatformTime::Seconds();
 if((Busy||Refreshing)&&Now-Started>180){Refreshing=false;RetryAt=Now+30;Fail(TEXT("Connection timed out. Your saved sign-in is retained."));}
 if(!RequireLogin&&!Busy&&!Refreshing&&Now>=RetryAt&&!RefreshToken.IsEmpty()&&Expires-Now<60)RefreshSession();
 if(SignedIn&&Now>=Expires){SignedIn=false;LeaveUniverse();Status=TEXT("Reconnecting your saved sign-in...");Notify();}
 if(!SignedIn&&!Busy&&!Refreshing&&!RequireLogin&&RetryAt>0&&Now>=RetryAt){RetryAt=Now+30;Restore();}
}
void FAmberIdentity::Login(){
 if(Busy)return;
 if(!LoadConfig()){Fail(TEXT("Secure sign-in is not configured. Local preview remains available."));return;}
 RequireLogin=false;
 if(!Random(Verifier)||!Random(State)){Fail(TEXT("Secure sign-in could not initialize."));return;}
 uint8 Digest[32];FTCHARToUTF8 V(*Verifier);SHA256(reinterpret_cast<const uint8*>(V.Get()),V.Length(),Digest);FString Challenge=B64(Digest,32);
 Router=FHttpServerModule::Get().GetHttpRouter(8769,true);if(!Router.IsValid()){Fail(TEXT("Sign-in callback port is busy. Close the other game and retry."));return;}
 Busy=true;SignedIn=false;Started=FPlatformTime::Seconds();Status=TEXT("Complete sign-in in your browser, then return here.");TWeakPtr<FAmberIdentity> Weak=AsShared();const uint64 RequestEpoch=Generation;
 Route=Router->BindRoute(FHttpPath(TEXT("/auth/callback")),EHttpServerRequestVerbs::VERB_GET,FHttpRequestHandler::CreateLambda([Weak,RequestEpoch](const FHttpServerRequest& Request,const FHttpResultCallback& Result){
  auto Self=Weak.Pin();if(Self&&Self->Generation!=RequestEpoch)Self.Reset();auto Response=FHttpServerResponse::Create(TEXT("<!doctype html><title>Abbie's World</title><p>Return to Abbie's World to continue.</p>"),TEXT("text/html; charset=utf-8"));Response->Headers.Add(TEXT("Cache-Control"),{TEXT("no-store")});Response->Headers.Add(TEXT("Referrer-Policy"),{TEXT("no-referrer")});
  if(!Self||!Self->Busy||Request.QueryParams.FindRef(TEXT("state"))!=Self->State){Response->Code=EHttpServerResponseCodes::BadRequest;Result(MoveTemp(Response));return true;}
  FString Code=Request.QueryParams.FindRef(TEXT("code"));Result(MoveTemp(Response));if(Code.IsEmpty())Self->Fail(TEXT("Sign-in was cancelled or denied."));else {Self->State.Empty();Self->Exchange(Code);}return true;
 }));
 if(!Route.IsValid()){Fail(TEXT("Could not register the sign-in callback."));return;}
 FHttpServerModule::Get().StartAllListeners();
 FString URL=TEXT("https://")+Domain+TEXT("/authorize?response_type=code&client_id=")+Encode(Client)+TEXT("&redirect_uri=")+Encode(Redirect)+TEXT("&scope=openid%20profile%20email%20offline_access&audience=https%3A%2F%2Fapi.abbies.world&code_challenge_method=S256&code_challenge=")+Challenge+TEXT("&state=")+State;
 if(ExplicitLogout)URL+=TEXT("&prompt=login");
 FString LaunchError;FPlatformProcess::LaunchURL(*URL,nullptr,&LaunchError);if(!LaunchError.IsEmpty()){Fail(TEXT("Could not open your browser. Check the Windows default browser and try Connect again."));return;}Notify();
}
void FAmberIdentity::Exchange(const FString& Code){
 if(Router&&Route.IsValid())Router->UnbindRoute(Route);Route.Reset();Status=TEXT("Connecting your household...");
 auto Request=FHttpModule::Get().CreateRequest();Request->SetURL(TEXT("https://")+Domain+TEXT("/oauth/token"));Request->SetVerb(TEXT("POST"));Request->SetHeader(TEXT("Content-Type"),TEXT("application/x-www-form-urlencoded"));Request->SetContentAsString(TEXT("grant_type=authorization_code&client_id=")+Encode(Client)+TEXT("&code=")+Encode(Code)+TEXT("&code_verifier=")+Encode(Verifier)+TEXT("&redirect_uri=")+Encode(Redirect));Request->SetTimeout(20);
 TWeakPtr<FAmberIdentity> Weak=AsShared();const uint64 RequestEpoch=Generation;Request->OnProcessRequestComplete().BindLambda([Weak,RequestEpoch](FHttpRequestPtr,FHttpResponsePtr Response,bool OK){auto S=Weak.Pin();if(!S||S->Generation!=RequestEpoch||!S->Busy)return;S->Verifier.Empty();if(!OK||!Response.IsValid()||Response->GetResponseCode()!=200){S->Fail(TEXT("The account provider could not complete sign-in. Check the native callback registration."));return;}auto J=Json(Response->GetContentAsString());if(!J.IsValid()||!J->TryGetStringField(TEXT("access_token"),S->Token)){S->Fail(TEXT("The account provider returned an incomplete session."));return;}S->AcceptTokens(J);S->FetchHousehold();});Request->ProcessRequest();
}
void FAmberIdentity::FetchHousehold(){auto R=FHttpModule::Get().CreateRequest();R->SetURL(Api+TEXT("/api/v1/me"));R->SetVerb(TEXT("GET"));R->SetHeader(TEXT("Authorization"),TEXT("Bearer ")+Token);R->SetTimeout(20);TWeakPtr<FAmberIdentity> Weak=AsShared();const uint64 RequestEpoch=Generation;R->OnProcessRequestComplete().BindLambda([Weak,RequestEpoch](FHttpRequestPtr,FHttpResponsePtr Response,bool OK){auto S=Weak.Pin();if(!S||S->Generation!=RequestEpoch||!S->Busy)return;if(!OK||!Response.IsValid()||Response->GetResponseCode()!=200){S->RetryAt=FPlatformTime::Seconds()+30;S->Fail(TEXT("Your household is temporarily unavailable. Your saved sign-in is retained."));return;}auto J=Json(Response->GetContentAsString());const TArray<TSharedPtr<FJsonValue>>* Ps=nullptr;if(!J.IsValid()||!J->TryGetArrayField(TEXT("profiles"),Ps)){S->Fail(TEXT("Your household response was incomplete."));return;}S->Profiles.Empty();J->TryGetStringField(TEXT("account_role"),S->AccountRole);for(auto P:*Ps){auto O=P->AsObject();FAmberProfile F;if(O.IsValid()&&O->TryGetStringField(TEXT("id"),F.Id)&&O->TryGetStringField(TEXT("display_name"),F.Name)){O->TryGetStringField(TEXT("role"),F.Role);S->Profiles.Add(F);}}S->SignedIn=true;S->Busy=false;S->Restoring=false;S->RetryAt=0;S->Status=TEXT("Choose who is playing.");if(!S->PreferredProfileId.IsEmpty()&&S->Profiles.ContainsByPredicate([&](const FAmberProfile& P){return P.Id==S->PreferredProfileId;})){S->Choose(S->PreferredProfileId);return;}S->Notify();});R->ProcessRequest();}
void FAmberIdentity::Choose(const FString& Id){if(!SignedIn||Busy)return;auto Found=Profiles.FindByPredicate([&](const FAmberProfile& P){return P.Id==Id;});if(!Found)return;FString Name=Found->Name;Busy=true;Started=FPlatformTime::Seconds();auto R=FHttpModule::Get().CreateRequest();R->SetURL(Api+TEXT("/api/v1/session/active-profile"));R->SetVerb(TEXT("POST"));R->SetHeader(TEXT("Authorization"),TEXT("Bearer ")+Token);R->SetHeader(TEXT("Content-Type"),TEXT("application/json"));auto J=MakeShared<FJsonObject>();J->SetStringField(TEXT("profile_id"),Id);FString Body;FJsonSerializer::Serialize(J,TJsonWriterFactory<>::Create(&Body));R->SetContentAsString(Body);R->SetTimeout(20);TWeakPtr<FAmberIdentity> Weak=AsShared();const uint64 RequestEpoch=Generation;R->OnProcessRequestComplete().BindLambda([Weak,RequestEpoch,Name,Id](FHttpRequestPtr,FHttpResponsePtr Response,bool OK){auto S=Weak.Pin();if(!S||S->Generation!=RequestEpoch||!S->Busy)return;S->Busy=false;if(OK&&Response.IsValid()&&Response->GetResponseCode()>=200&&Response->GetResponseCode()<300){S->ActiveName=Name;S->ActiveProfileId=Id;S->PreferredProfileId=Id;S->SaveSession();S->FetchUniverses();return;}else S->Status=TEXT("Could not select this player. Please retry.");S->Notify();});R->ProcessRequest();}
