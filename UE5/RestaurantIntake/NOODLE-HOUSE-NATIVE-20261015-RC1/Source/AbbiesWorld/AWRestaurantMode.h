#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/Pawn.h"
#include "AWRestaurantMode.generated.h"

class UStaticMesh;
class UStaticMeshComponent;
class USceneComponent;
class UBoxComponent;
class ACameraActor;
class SRestaurantHUD;

// Independent gameplay state. Native visual references do not supply algorithms.
enum class ERTItem : uint8 { Empty, Patty, Tomato, Bun, Plate, Cheese };
struct FRTItem
{
    ERTItem Kind=ERTItem::Empty;
    bool Ready=false, Burned=false;
    float Progress=0;
    uint8 Parts=0;
    bool Empty() const {return Kind==ERTItem::Empty;}
};
struct FRTStation
{
    FString AssetRole, Label;
    FIntPoint Tile;
    FRTItem Item;
    float Clock=0, Wash=0, SurfaceZ=80;
    int Reserved=-1;
    TObjectPtr<AActor> Actor=nullptr;
    TObjectPtr<UStaticMeshComponent> ItemVisual=nullptr;
};
struct FRTOrder {int Id=0;uint8 Parts=0;float Left=70,Total=70;};

UCLASS()
class ABBIESWORLD_API AAWRestaurantPawn : public APawn
{
    GENERATED_BODY()
public:
    AAWRestaurantPawn();
    UPROPERTY() TObjectPtr<UStaticMeshComponent> Visual;
    UPROPERTY() TObjectPtr<UStaticMeshComponent> HeldVisual;
    UPROPERTY() TObjectPtr<UBoxComponent> Body;
    float Bonk=0;
    int ChefIndex=0;
    FRTItem Held;
    FVector2D Facing=FVector2D(0,-1);
    bool Working=false, Human=false;
    float ActionCooldown=0, DashLeft=0, DashCooldown=0;
    int TargetStation=-1, DemoOrder=-1, DemoStep=0;
    TArray<FIntPoint> Route;
};

UCLASS()
class ABBIESWORLD_API AAWRestaurantController : public APlayerController
{
    GENERATED_BODY()
public:
    virtual void PlayerTick(float Delta) override;
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const override;
    UPROPERTY(Replicated) int32 ChefSlot=-1;
    UFUNCTION(Server,Unreliable) void ServerMove(FVector2D Screen,bool Working,bool Dash);
    UFUNCTION(Server,Reliable) void ServerAction(uint8 Action,FVector2D Facing);
    FVector2D PendingMove=FVector2D::ZeroVector;
    bool PendingWork=false,PendingDash=false;
    double LastMoveAt=-100,LastActionAt=-100;

};

UCLASS()
class ABBIESWORLD_API AAWRestaurantArena : public AActor
{
    GENERATED_BODY()
public:
    AAWRestaurantArena();
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const override;
    UPROPERTY(ReplicatedUsing=OnRep_Kitchen) FString KitchenSnapshot;
    UFUNCTION() void OnRep_Kitchen();
    void PublishKitchen();
    void TickNetwork(float Delta);
    int SnapshotSequence=0,ObservedSnapshots=0,ObservedServed=0,RemoteCommands=0;
    float NetworkClock=0,ProofClock=0;
    bool bNetwork=false;

    virtual void BeginPlay() override;
    virtual void Tick(float Delta) override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
    void MoveChef(int Chef,FVector2D Direction,float Delta,bool Dash=false);
    void Interact(int Chef);
    void Work(int Chef,float Delta);
    void Throw(int Chef);
    void ReturnToWorld();
    void TogglePause();
    void Restart();
    void SetDemo(bool bEnabled);
    bool bPaused=false,bFinished=false,bDemo=true,bNativeAssetsReady=false;
    FString Status=TEXT("Preparing the private reference kitchen"), AssetBlocker;
    float Remaining=180,Elapsed=0;
    float ChefVisualYawOffset=0.f;
    bool bCalibrationPassed=true;
    TArray<FString> CalibrationRecords;
    void VerifyCalibrationShot(int Index);
    int Score=0,Combo=0,Served=0,Missed=0,CleanPlates=4,DirtyPlates=0,PlayerCount=3;
    TArray<float> Returns;
    TArray<FRTOrder> Orders;
    TArray<FRTStation> Stations;
    UPROPERTY() TArray<TObjectPtr<AAWRestaurantPawn>> Chefs;
    UPROPERTY() TObjectPtr<ACameraActor> SharedCamera;
    UPROPERTY() TArray<TObjectPtr<UStaticMesh>> NativeMeshes;
    TSharedPtr<SRestaurantHUD> HUD;
    int NearestStation(const AAWRestaurantPawn* Chef) const;
    static uint8 Part(ERTItem Kind);
    static FString Recipe(uint8 Parts);
    static FString ItemName(const FRTItem& Item);
    FVector TileLocation(FVector2D Tile,float Z=0) const;
    bool IsWalkable(FIntPoint Tile) const;
private:
    int NextOrderId=1;
    float NextOrderAt=14;
    TMap<FString,TObjectPtr<UStaticMesh>> Meshes;
    TArray<TObjectPtr<AActor>> KitchenActors;
    TMap<int,FIntPoint> Homes;
    UStaticMesh* LoadRole(const FString& AssetRole);
    void BuildKitchen();
    void UpdateVisuals();
    void AddOrder(uint8 Parts=0,float Time=70);
    void DemoChef(int Chef,float Delta);
    bool WalkTo(int Chef,int Station,float Delta);
    bool Place(FRTItem& Held,FRTStation& Station,int Chef);
    void Message(const FString& Text);
    int FindStation(const FString& AssetRole,int Chef=-1,bool bFree=false) const;
    void SetupMesh(UStaticMeshComponent* Component,const FString& AssetRole,float Width,float Depth,float Height,bool bGround=true);
};

UCLASS()
class ABBIESWORLD_API AAWRestaurantMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    AAWRestaurantMode();
    virtual void StartPlay() override;
    virtual void PreLogin(const FString& Options,const FString& Address,const FUniqueNetIdRepl& UniqueId,FString& ErrorMessage) override;
    virtual void PostLogin(APlayerController* NewPlayer) override;
    virtual void Logout(AController* Exiting) override;
};

