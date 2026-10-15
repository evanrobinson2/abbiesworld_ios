#pragma once
#include "CoreMinimal.h"
#include "HttpRouteHandle.h"
struct FAmberProfile { FString Id,Name,Role; };
struct FAmberUniverse { FString Id,Name,Theme,Map,Role; int32 Revision=0; };
class FAmberIdentity : public TSharedFromThis<FAmberIdentity> {
public:
 FString Status=TEXT("Sign in with your existing Abbie's World account."),AccountRole,ActiveName;
 TArray<FAmberProfile> Profiles;
 TArray<FAmberUniverse> Universes;
 FString ActiveProfileId,UniverseId,UniverseName,UniverseMap;
 bool UniverseJoined=false,UniversesLoaded=false;
 int32 UniverseRevision=0;
 TSharedPtr<class FJsonObject> UniverseState;
 bool SavingUniverse=false,UniverseSaveFailed=false;
 bool Busy=false,SignedIn=false;
 TFunction<void()> Changed;
 void Login(); void Choose(const FString& Id); void Cancel(); void Tick();
 void FetchUniverses(); void JoinUniverse(const FString& Id); void LeaveUniverse();
 void SaveUniverseProgress(int32 Turn,int32 Step);
 ~FAmberIdentity(){Cancel();}
private:
 FString Domain,Client,Api,Verifier,State,Token; double Started=0,Expires=0;
 TSharedPtr<class IHttpRouter> Router; FHttpRouteHandle Route;
 void Exchange(const FString& Code); void FetchHousehold(); void Fail(const FString& Message);
};
