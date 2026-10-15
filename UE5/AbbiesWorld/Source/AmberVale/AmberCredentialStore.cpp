#include "AmberCredentialStore.h"
#if PLATFORM_WINDOWS
#include "Windows/WindowsHWrapper.h"
#include "Windows/AllowWindowsPlatformTypes.h"
#include <wincred.h>
#include "Windows/HideWindowsPlatformTypes.h"
#endif
bool AmberCredentials::Save(const FString& Target,const FString& Value){
#if PLATFORM_WINDOWS
 FTCHARToUTF8 Bytes(*Value);
 if(Bytes.Length()>CRED_MAX_CREDENTIAL_BLOB_SIZE)return false;
 CREDENTIALW Credential{};Credential.Type=CRED_TYPE_GENERIC;Credential.TargetName=const_cast<wchar_t*>(*Target);
 Credential.CredentialBlobSize=Bytes.Length();Credential.CredentialBlob=reinterpret_cast<LPBYTE>(const_cast<ANSICHAR*>(Bytes.Get()));
 Credential.Persist=CRED_PERSIST_LOCAL_MACHINE;Credential.UserName=const_cast<wchar_t*>(L"AbbiesWorld");
 return CredWriteW(&Credential,0)!=0;
#else
 return false;
#endif
}
bool AmberCredentials::Load(const FString& Target,FString& Value){
 Value.Empty();
#if PLATFORM_WINDOWS
 PCREDENTIALW Credential=nullptr;if(!CredReadW(*Target,CRED_TYPE_GENERIC,0,&Credential))return false;
 const FUTF8ToTCHAR Text(reinterpret_cast<const ANSICHAR*>(Credential->CredentialBlob),Credential->CredentialBlobSize);
 Value=FString(Text.Length(),Text.Get());CredFree(Credential);return true;
#else
 return false;
#endif
}
bool AmberCredentials::Remove(const FString& Target){
#if PLATFORM_WINDOWS
 return CredDeleteW(*Target,CRED_TYPE_GENERIC,0)!=0||GetLastError()==ERROR_NOT_FOUND;
#else
 return false;
#endif
}
