#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "AWPotionMode.generated.h"

UCLASS()
class AAWPotionMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    AAWPotionMode();
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Potion Meadow") FName ReturnLevel;
    UFUNCTION(BlueprintCallable, Category="Potion Meadow") void ReturnHome();
    UFUNCTION(BlueprintImplementableEvent, Category="Potion Meadow") void OnPotionMeadowRunFinished(bool bWon, int32 Difficulty, int32 Seed, int32 Challenges);
    UPROPERTY() TArray<TObjectPtr<class UTexture2D>> Art;
    UPROPERTY() TArray<TObjectPtr<class USoundBase>> Effects;
    TSharedPtr<class SWidget> Board;
};
