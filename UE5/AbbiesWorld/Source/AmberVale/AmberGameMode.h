#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/HUD.h"
#include "GameFramework/PlayerController.h"
#include "Styling/SlateBrush.h"
#include "AmberGameMode.generated.h"
UCLASS() class AMBERVALE_API AAmberController : public APlayerController {
 GENERATED_BODY()
 public: virtual void BeginPlay() override; virtual void SetupInputComponent() override; virtual void PlayerTick(float Dt) override; void SelectTile(); void ToggleCameraMode(); bool IsFreeCamera() const { return !OrbitMode; } void SetFreeCamera(bool Enabled); void ResetCamera(); void ResetToFocus(); void FocusPoint(FVector Point); void ZoomIn(); void ZoomOut(); void FocusAbbie(); void FocusCafe(); void FocusBunker(); void ToggleDrift(); void MenuKey(); void SettingsKey(); void TogglePerspective(); void SetPerspective(bool Cinematic); bool IsCinematic() const { return CinematicView; } bool CanInspect() const { return HasFocus; } void DeveloperKey(); float GetOrbitSensitivity() const { return OrbitSensitivity; } void SetOrbitSensitivity(float Value);
 private: TWeakObjectPtr<AActor> FocusActor; FVector FocusPosition=FVector::ZeroVector; bool HasFocus=false; TWeakObjectPtr<AActor> Overview; FVector Pivot=FVector(0,0,1500),WantedPivot=Pivot,HomePivot=Pivot; float Yaw=54,Pitch=40,Distance=32000,WantedDistance=32000,HomeDistance=32000,HomeYaw=54,HomePitch=40,FlightSpeed=2200,OrbitSensitivity=2.f; TMap<TWeakObjectPtr<class UExponentialHeightFogComponent>,bool> CinematicFogStates; TMap<TWeakObjectPtr<class UExponentialHeightFogComponent>,bool> CinematicFogVisibility; TMap<TWeakObjectPtr<AActor>,bool> CinematicLocalFog; bool OrbitMode=true,Drift=false,CinematicView=false; FVector SavedOverlandPivot; float SavedOverlandDistance=32000,SavedOverlandYaw=54,SavedOverlandPitch=40; void Zoom(float Factor); void FocusTag(FName Tag,const FString& Label); void Bound(FVector& Position,float Margin);
};
UCLASS() class AMBERVALE_API AAmberHUD : public AHUD {
 GENERATED_BODY()
 public: virtual void BeginPlay() override; virtual void Tick(float Dt) override; virtual void EndPlay(const EEndPlayReason::Type Reason) override;
 bool GameStarted=false,DeveloperMode=false; void ShowMenu(); void ShowSettings(); void StartGame(bool LocalPreview); void ShowIntro(); void BeginLogin(); void TickFrontDoor(float Dt); void CloseFrontDoor(); FString DisplayMetrics() const;
 void RestoreUniverseProgress(); void EscapeUI(); void ToggleSettings(); void ResumeGame();
 void PlayTrack(const FString& Name); void SetDensity(float Value); void SetLayer(FName Tag,bool Visible); void MoveStep(); void SwitchSkin(bool Halloween); void SwitchWorld(const FString& Name); void SetMusic(bool Enabled); void SelectAt(FVector Origin,FVector Direction);
 private: TSharedPtr<class SWidget> FrontDoor; TSharedPtr<class SVerticalBox> MenuItems; TSharedPtr<class FAmberIdentity> Identity; int32 FrontStage=0; float FrontTime=0,FadeTime=0; bool IntroReady=false,ResumeAvailable=false; FSlateBrush IntroBrush;
 UPROPERTY() class UMediaPlayer* IntroPlayer=nullptr; UPROPERTY() class UMediaTexture* IntroTexture=nullptr; UPROPERTY() class UMaterialInstanceDynamic* IntroMaterial=nullptr; UPROPERTY() class UAudioComponent* IntroAudio=nullptr;
 TSharedPtr<class SWidget> Panel,DrawerShell,Scrim; TSharedPtr<class SVerticalBox> Drawer; TArray<FVector> Route,Tiles; TArray<FString> TileKeys; TArray<TWeakObjectPtr<class UInstancedStaticMeshComponent>> Foliage; TArray<TArray<FTransform>> FullTransforms; FVector Selected=FVector::ZeroVector,DeerFrom,DeerTo; TWeakObjectPtr<AActor> Deer,Token; int32 Turn=0,Step=0; bool Moving=false,DeerMoving=false,HasSelection=false; float MoveTime=0,DeerTime=0,Clock=0,SmoothedFPS=60; void ReadBoard(); void ShuffleDeer();
};
UCLASS() class AMBERVALE_API AAmberGameMode : public AGameModeBase {
 GENERATED_BODY()
 public: AAmberGameMode();
};
