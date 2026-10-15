#include "AmberIdentity.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "GenericPlatform/GenericPlatformHttp.h"
#include "Serialization/JsonSerializer.h"
namespace {
TSharedPtr<FJsonObject> UniverseJson(const FString& Text){TSharedPtr<FJsonObject> J;FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text),J);return J;}
bool KnownMap(const FString& Map){return Map==TEXT("Papercraft")||Map==TEXT("HalloweenCandyland")||Map==TEXT("MoonBase")||Map==TEXT("ChristmasVillage")||Map==TEXT("EnchantedForest");}
}
void FAmberIdentity::LeaveUniverse(){UniverseJoined=false;UniverseId.Empty();UniverseName.Empty();UniverseMap.Empty();UniverseState.Reset();UniverseRevision=0;UniverseSaveFailed=false;}
void FAmberIdentity::FetchUniverses(){
 if(!SignedIn||Busy||SavingUniverse)return;LeaveUniverse();Busy=true;Started=FPlatformTime::Seconds();Status=TEXT("Loading your universes...");
 auto R=FHttpModule::Get().CreateRequest();R->SetURL(Api+TEXT("/api/v1/universes"));R->SetVerb(TEXT("GET"));R->SetHeader(TEXT("Authorization"),TEXT("Bearer ")+Token);R->SetTimeout(20);
 TWeakPtr<FAmberIdentity> Weak=AsShared();const uint64 Epoch=Generation;R->OnProcessRequestComplete().BindLambda([Weak,Epoch](FHttpRequestPtr,FHttpResponsePtr Response,bool OK){auto S=Weak.Pin();if(!S||S->Generation!=Epoch)return;if(!S||!S->Busy||!S->SignedIn)return;S->Busy=false;S->Universes.Empty();S->UniversesLoaded=false;
 if(!OK||!Response.IsValid()||Response->GetResponseCode()!=200){S->Status=TEXT("Your universes could not be loaded. Retry when the service is available.");S->Notify();return;}
 auto J=UniverseJson(Response->GetContentAsString());const TArray<TSharedPtr<FJsonValue>>* Rows=nullptr;
 if(!J.IsValid()||!J->TryGetArrayField(TEXT("universes"),Rows)){S->Status=TEXT("The universe service returned an incomplete list.");S->Notify();return;}
 for(auto V:*Rows){auto O=V->AsObject();FAmberUniverse U;if(O.IsValid()&&O->TryGetStringField(TEXT("id"),U.Id)&&O->TryGetStringField(TEXT("name"),U.Name)&&O->TryGetStringField(TEXT("map"),U.Map)&&KnownMap(U.Map)){O->TryGetStringField(TEXT("theme"),U.Theme);O->TryGetStringField(TEXT("role"),U.Role);S->Universes.Add(U);}}
 S->UniversesLoaded=true;S->Status=S->Universes.Num()?TEXT("Choose a universe to inhabit."):TEXT("No universes are shared with this account yet. Ask the owner for access.");S->Notify();});
 if(!R->ProcessRequest()){Busy=false;Status=TEXT("Could not reach the universe service.");}Notify();
}
void FAmberIdentity::JoinUniverse(const FString& Id){
 if(!SignedIn||Busy||SavingUniverse||ActiveName.IsEmpty())return;auto Found=Universes.FindByPredicate([&](const FAmberUniverse& U){return U.Id==Id;});if(!Found)return;
 LeaveUniverse();Busy=true;Started=FPlatformTime::Seconds();Status=TEXT("Joining ")+Found->Name+TEXT("...");auto R=FHttpModule::Get().CreateRequest();R->SetURL(Api+TEXT("/api/v1/universes/")+FGenericPlatformHttp::UrlEncode(Id)+TEXT("/join"));R->SetVerb(TEXT("POST"));R->SetHeader(TEXT("Authorization"),TEXT("Bearer ")+Token);R->SetHeader(TEXT("Content-Type"),TEXT("application/json"));R->SetContentAsString(TEXT("{}"));R->SetTimeout(20);
 TWeakPtr<FAmberIdentity> Weak=AsShared();const uint64 Epoch=Generation;R->OnProcessRequestComplete().BindLambda([Weak,Epoch,Id](FHttpRequestPtr,FHttpResponsePtr Response,bool OK){auto S=Weak.Pin();if(!S||S->Generation!=Epoch)return;if(!S||!S->Busy||!S->SignedIn)return;S->Busy=false;
 auto J=OK&&Response.IsValid()&&Response->GetResponseCode()==200?UniverseJson(Response->GetContentAsString()):nullptr;FString Map,ReturnedId,Name;
 if(!J.IsValid()||!J->TryGetStringField(TEXT("id"),ReturnedId)||ReturnedId!=Id||!J->TryGetStringField(TEXT("map"),Map)||!KnownMap(Map)||!J->TryGetStringField(TEXT("name"),Name)){S->Status=TEXT("Could not join that universe. Your access may have changed; refresh and retry.");S->Notify();return;}
 const TSharedPtr<FJsonObject>* State=nullptr;if(!J->TryGetObjectField(TEXT("state"),State)){S->Status=TEXT("The universe save could not be loaded.");S->Notify();return;}
 const TSharedPtr<FJsonObject>* Manifest=nullptr;if(!J->TryGetObjectField(TEXT("manifest"),Manifest)){S->Status=TEXT("The universe content manifest is missing.");S->Notify();return;}
 const TArray<TSharedPtr<FJsonValue>>* Assets=nullptr;if(!(*Manifest)->TryGetArrayField(TEXT("assets"),Assets)||Assets->Num()>0){S->Status=TEXT("This universe needs a content pack this preview cannot download yet.");S->Notify();return;}
 S->UniverseId=Id;S->UniverseMap=Map;S->UniverseName=Name;S->UniverseState=*State;double Revision=0;J->TryGetNumberField(TEXT("revision"),Revision);S->UniverseRevision=static_cast<int32>(Revision);S->UniverseJoined=true;S->Status=TEXT("Welcome to ")+Name;S->Notify();});
 if(!R->ProcessRequest()){Busy=false;Status=TEXT("Could not reach the universe service.");}Notify();
}
void FAmberIdentity::SaveUniverseProgress(int32 Turn,int32 Step){
 if(!SignedIn||!UniverseJoined||SavingUniverse||UniverseSaveFailed||!UniverseState.IsValid())return;
 auto Next=MakeShared<FJsonObject>(*UniverseState);const TSharedPtr<FJsonObject>* Existing=nullptr;
 auto Players=Next->TryGetObjectField(TEXT("players"),Existing)?MakeShared<FJsonObject>(**Existing):MakeShared<FJsonObject>();
 auto Progress=MakeShared<FJsonObject>();Progress->SetNumberField(TEXT("turn"),Turn);Progress->SetNumberField(TEXT("step"),Step);Players->SetObjectField(ActiveProfileId,Progress);Next->SetObjectField(TEXT("players"),Players);
 auto Body=MakeShared<FJsonObject>();Body->SetNumberField(TEXT("expectedRevision"),UniverseRevision);Body->SetObjectField(TEXT("state"),Next);FString Text;FJsonSerializer::Serialize(Body,TJsonWriterFactory<>::Create(&Text));
 FString Id=UniverseId;auto R=FHttpModule::Get().CreateRequest();R->SetURL(Api+TEXT("/api/v1/universes/")+FGenericPlatformHttp::UrlEncode(Id)+TEXT("/state"));R->SetVerb(TEXT("PUT"));R->SetHeader(TEXT("Authorization"),TEXT("Bearer ")+Token);R->SetHeader(TEXT("Content-Type"),TEXT("application/json"));R->SetContentAsString(Text);R->SetTimeout(20);SavingUniverse=true;
 TWeakPtr<FAmberIdentity> Weak=AsShared();const uint64 Epoch=Generation;R->OnProcessRequestComplete().BindLambda([Weak,Epoch,Id,Next](FHttpRequestPtr,FHttpResponsePtr Response,bool OK){auto S=Weak.Pin();if(!S||S->Generation!=Epoch)return;if(!S)return;S->SavingUniverse=false;if(S->UniverseId!=Id)return;
 auto J=OK&&Response.IsValid()&&Response->GetResponseCode()==200?UniverseJson(Response->GetContentAsString()):nullptr;double Revision=0;
 if(J.IsValid()&&J->TryGetNumberField(TEXT("revision"),Revision)){S->UniverseRevision=static_cast<int32>(Revision);S->UniverseState=Next;}
 else {S->UniverseSaveFailed=true;S->Status=Response.IsValid()&&Response->GetResponseCode()==409?TEXT("This universe changed on another device. Rejoin to load its latest save."):TEXT("Progress could not be saved. Rejoin when the connection is available.");}
 });if(!R->ProcessRequest()){SavingUniverse=false;UniverseSaveFailed=true;Status=TEXT("Progress could not be saved. Rejoin when the connection is available.");}
}
