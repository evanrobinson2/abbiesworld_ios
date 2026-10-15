#pragma once
#include "CoreMinimal.h"
namespace AmberCredentials {
 bool Save(const FString& Target,const FString& Value);
 bool Load(const FString& Target,FString& Value);
 bool Remove(const FString& Target);
}
