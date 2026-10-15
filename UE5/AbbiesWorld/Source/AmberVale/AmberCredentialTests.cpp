#include "AmberCredentialStore.h"
#include "AmberIdentity.h"
#include "Misc/AutomationTest.h"
#if WITH_DEV_AUTOMATION_TESTS && PLATFORM_WINDOWS
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FAmberCredentialsTest,"AbbiesWorld.Identity.CredentialLifecycle",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FAmberCredentialsTest::RunTest(const FString& Parameters){
 const FString Target=TEXT("AbbiesWorld/Tests/")+FGuid::NewGuid().ToString();FString Loaded;
 TestFalse(TEXT("Missing credential is absent"),AmberCredentials::Load(Target,Loaded));
 TestTrue(TEXT("Session can be saved"),AmberCredentials::Save(Target,TEXT("test-session-a")));
 TestTrue(TEXT("Session can be restored"),AmberCredentials::Load(Target,Loaded));TestEqual(TEXT("Stored session is preserved"),Loaded,FString(TEXT("test-session-a")));
 TestTrue(TEXT("Rotated session replaces old session"),AmberCredentials::Save(Target,TEXT("test-session-b")));
 TestTrue(TEXT("Rotated session loads"),AmberCredentials::Load(Target,Loaded));TestEqual(TEXT("Newest rotation survives"),Loaded,FString(TEXT("test-session-b")));
 TestTrue(TEXT("Logout deletes credential"),AmberCredentials::Remove(Target));TestFalse(TEXT("Logout prevents restore"),AmberCredentials::Load(Target,Loaded));
 TestTrue(TEXT("Repeated logout is safe"),AmberCredentials::Remove(Target));auto Session=MakeShared<FAmberIdentity>();Session->SavingUniverse=true;Session->Cancel();TestFalse(TEXT("Cancelled sessions release pending saves"),Session->SavingUniverse);return true;
}
#endif
