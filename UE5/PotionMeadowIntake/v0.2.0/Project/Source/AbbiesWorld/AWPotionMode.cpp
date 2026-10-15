#include "AWPotionMode.h"
#include "PMRules.h"
#include "Widgets/SLeafWidget.h"
#include "Rendering/DrawElements.h"
#include "Styling/CoreStyle.h"
#include "Engine/Texture2D.h"
#include "Engine/GameViewportClient.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Framework/Application/SlateApplication.h"
#include "HighResScreenshot.h"
#include "Misc/Paths.h"
#include "Misc/FileHelper.h"
#include "HAL/PlatformApplicationMisc.h"
#include "Misc/ConfigCacheIni.h"

static const TCHAR* PMNames[]={TEXT("Abbie"),TEXT("Daddy"),TEXT("Mommy"),TEXT("Goon0"),TEXT("Goon1"),TEXT("Goon2"),TEXT("Goon3"),TEXT("PotionHealth"),TEXT("PotionMagic"),TEXT("BerryIngredient"),TEXT("MoonflowerIngredient"),TEXT("Cauldron"),TEXT("Grass"),TEXT("Path"),TEXT("Stone"),TEXT("BoardBackground")};
#include "SPMAdventure.h"
AAWPotionMode::AAWPotionMode(){DefaultPawnClass=nullptr;}
void AAWPotionMode::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if(Board.IsValid()&&GEngine&&GEngine->GameViewport)GEngine->GameViewport->RemoveViewportWidgetContent(Board.ToSharedRef());
    Board.Reset();Effects.Reset();Art.Reset();
    Super::EndPlay(EndPlayReason);
}
void AAWPotionMode::ReturnHome()
{
    FString overrideMap;
    if(FParse::Value(FCommandLine::Get(),TEXT("PMReturnMap="),overrideMap)&&overrideMap.StartsWith(TEXT("/Game/")))
        UGameplayStatics::OpenLevel(this,FName(*overrideMap));
    else if(!ReturnLevel.IsNone())UGameplayStatics::OpenLevel(this,ReturnLevel);
    else FPlatformMisc::RequestExit(false);
}
void AAWPotionMode::BeginPlay()
{
    Super::BeginPlay();
    if(FParse::Param(FCommandLine::Get(),TEXT("PMRandomQA")))
    {
        FString report;bool ok=PMValidateRandomBoards(report);
        FFileHelper::SaveStringToFile(ok?*report:*(FString(TEXT("FAIL: "))+report),*(FPaths::ProjectSavedDir()/TEXT("PotionMeadowRandomQA.txt")));
        if(ok){UE_LOG(LogTemp,Display,TEXT("PM_3000_RANDOM_BOARDS_PASS"));}
        else {UE_LOG(LogTemp,Error,TEXT("PM_RANDOM_BOARDS_FAILED"));}
        FPlatformMisc::RequestExit(false);return;
    }
    if(FParse::Param(FCommandLine::Get(),TEXT("PMPotionQA")))
    {
        FPMRules bad;for(int e=0;e<4&&!bad.Lost;e++)while(bad.EnemyHealth[e]>0&&!bad.Lost)bad.Hit(e);
        checkf(bad.Lost,TEXT("Ignoring potions should require a retry"));
        FPMRules good;for(int e=0;e<3;e++)while(good.EnemyHealth[e]>0)good.Hit(e);
        check(good.Level==3 && good.Health==1);check(good.DrinkRed());check(good.DrinkBlue());
        while(good.EnemyHealth[3]>0)good.Hit(3);
        check(good.CanWin() && good.Health>0);
        FPMRules brew;check(!brew.Brew(true));brew.Berries=1;check(brew.Brew(true)&&brew.Red==2&&brew.Berries==0);
        check(!brew.DrinkRed() && brew.Red==2);
        FString result=TEXT("PASS: no-potion loss; potion-assisted win; level 3; brewing consumes ingredients; full-health potion preserved.");
        FFileHelper::SaveStringToFile(result,*(FPaths::ProjectSavedDir()/TEXT("PotionMeadowQA.txt")));
        UE_LOG(LogTemp,Display,TEXT("POTION_MEADOW_RULES_PASS"));
        FPlatformMisc::RequestExit(false);return;
    }
    for(auto n:PMNames)
    {
        FString path=FString::Printf(TEXT("/Game/PotionMeadow/Textures/T_PM_%s.T_PM_%s"),n,n);
        Art.Add(LoadObject<UTexture2D>(nullptr,*path));
    }
    SAssignNew(Board,SPMAdventure).Mode(this);
    if(GEngine&&GEngine->GameViewport)
    {
        GEngine->GameViewport->AddViewportWidgetContent(Board.ToSharedRef(),20);
        APlayerController* pc=GetWorld()->GetFirstPlayerController();
        if(pc){pc->bShowMouseCursor=true;FInputModeUIOnly input;input.SetWidgetToFocus(Board);pc->SetInputMode(input);}
        FSlateApplication::Get().SetKeyboardFocus(Board);
    }
}
