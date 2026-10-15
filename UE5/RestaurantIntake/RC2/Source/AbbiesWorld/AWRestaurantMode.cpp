#include "AWRestaurantMode.h"
#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "Components/BoxComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "Engine/World.h"
#include "Engine/LocalPlayer.h"
#include "Engine/StaticMeshActor.h"
#include "EngineUtils.h"
#include "Engine/Level.h"
#include "Components/ModelComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Kismet/KismetSystemLibrary.h"
#include "TimerManager.h"
#include "GameMapsSettings.h"
#include "Sound/SoundBase.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/WorldSettings.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Widgets/SLeafWidget.h"
#include "Rendering/DrawElements.h"
#include "Styling/CoreStyle.h"
#include "Framework/Application/SlateApplication.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "Misc/FileHelper.h"
#include "UnrealClient.h"

namespace KitchenNative
{
static const TCHAR* Names[]={TEXT("Abbie"),TEXT("Mommy"),TEXT("Daddy"),TEXT("Guest")};
static const FLinearColor Colors[]={FLinearColor(.96f,.60f,.34f),FLinearColor(.51f,.79f,.70f),FLinearColor(.56f,.67f,.94f),FLinearColor(.81f,.55f,.82f)};
static constexpr float Cell=100.f;
static FVector2D Pos(const AAWRestaurantPawn* P){const FVector V=P->GetActorLocation();return FVector2D(V.X/Cell+5.5f,V.Y/Cell+4.f);}
static FVector2D ScreenDirection(const ACameraActor* Camera,FVector2D Input){if(!Camera)return FVector2D::ZeroVector;const FVector R=Camera->GetActorRightVector(),U=Camera->GetActorUpVector();const FVector2D Right=FVector2D(R.X,R.Y).GetSafeNormal(),Up=FVector2D(U.X,U.Y).GetSafeNormal();const FVector2D World=Right*Input.X-Up*Input.Y;return World.GetSafeNormal()*FMath::Min(1.0,Input.Size());}
static uint8 Recipes[]={uint8(1|4),uint8(2|4),uint8(1|2)};
static FRTItem NewItem(ERTItem Kind){FRTItem I;I.Kind=Kind;return I;}
}

class SRestaurantHUD : public SLeafWidget
{
public:
    SLATE_BEGIN_ARGS(SRestaurantHUD){} SLATE_ARGUMENT(AAWRestaurantMode*,Mode) SLATE_END_ARGS()
    void Construct(const FArguments& Args){Owner=Args._Mode;}
    virtual FVector2D ComputeDesiredSize(float) const override{return FVector2D(1280,720);}
    virtual FReply OnMouseButtonDown(const FGeometry& G,const FPointerEvent& E) override
    {
        if(!Owner.IsValid())return FReply::Unhandled();
        const FVector2D P=G.AbsoluteToLocal(E.GetScreenSpacePosition());const float W=G.GetLocalSize().X;
        if(P.Y<58 && P.X>W-130){Owner->ReturnToWorld();return FReply::Handled();}
        if(P.Y<58 && P.X>W-260){Owner->TogglePause();return FReply::Handled();}
        if(P.Y<58 && P.X>W-410){Owner->SetDemo(!Owner->bDemo);return FReply::Handled();}
        if(Owner->bFinished && P.Y>G.GetLocalSize().Y*.5f){Owner->Restart();return FReply::Handled();}
        return FReply::Unhandled();
    }
    virtual int32 OnPaint(const FPaintArgs& A,const FGeometry& G,const FSlateRect& C,FSlateWindowElementList& Out,int32 Layer,const FWidgetStyle& Style,bool ParentEnabled) const override
    {
        if(!Owner.IsValid())return Layer;const auto* M=Owner.Get();const FVector2D Size=G.GetLocalSize();const float S=FMath::Clamp(Size.X/1280.f,.6f,2.f);
        auto Box=[&](FVector2D P,FVector2D D,FLinearColor Color,int L=0){FSlateDrawElement::MakeBox(Out,Layer+L,G.ToPaintGeometry(D,FSlateLayoutTransform(P)),FCoreStyle::Get().GetBrush("WhiteBrush"),ESlateDrawEffect::None,Color);};
        auto Text=[&](const FString& T,FVector2D P,int Font,FLinearColor Color,int L=1){FSlateDrawElement::MakeText(Out,Layer+L,G.MakeChild(FVector2D(1200,120),FSlateLayoutTransform(P)).ToPaintGeometry(),T,FCoreStyle::GetDefaultFontStyle("Bold",Font),ESlateDrawEffect::None,Color);};
        Box(FVector2D(0,0),FVector2D(Size.X,60*S),FLinearColor(.025f,.035f,.055f,.96f));Text(TEXT("FOREST FAIRY BURGER JOINT"),FVector2D(24,16)*S,16*S,FLinearColor(1,.85f,.60f));
        Text(M->bDemo?TEXT("WATCHING FAMILY DEMO"):TEXT("FAMILY CO-OP"),FVector2D(430,21)*S,11*S,FLinearColor(.7f,.85f,.8f));
        Text(M->bDemo?TEXT("Take over"):TEXT("Watch demo"),FVector2D(Size.X-395*S,20*S),12*S,FLinearColor::White);Text(M->bPaused?TEXT("Resume"):TEXT("Pause"),FVector2D(Size.X-230*S,20*S),12*S,FLinearColor::White);Text(TEXT("World menu"),FVector2D(Size.X-120*S,20*S),12*S,FLinearColor::White);
        for(int I=0;I<M->Orders.Num();I++){const auto& O=M->Orders[I];const FVector2D P=FVector2D(24+I*230,76)*S;Box(P,FVector2D(214,78)*S,FLinearColor(.035f,.055f,.07f,.94f));Text(FString::Printf(TEXT("#%02d  %s"),O.Id,*AAWRestaurantMode::Recipe(O.Parts)),P+FVector2D(12,9)*S,13*S,FLinearColor(1,.90f,.70f));Text(O.Parts==5?TEXT("CHOPPED FISH + COOKED RICE"):O.Parts==6?TEXT("CUCUMBER + COOKED RICE"):TEXT("FISH + CUCUMBER"),P+FVector2D(12,35)*S,9*S,FLinearColor(.75f,.85f,.83f));Box(P+FVector2D(0,74)*S,FVector2D(214*FMath::Clamp(O.Left/O.Total,0.f,1.f),4)*S,O.Left<15?FLinearColor(.95f,.35f,.25f):FLinearColor(.45f,.8f,.6f),2);}
        Text(FString::Printf(TEXT("%d POINTS    x%d"),M->Score,M->Combo),FVector2D(Size.X-300*S,83*S),18*S,FLinearColor(1,.86f,.56f));const int Seconds=FMath::CeilToInt(M->Remaining);Text(FString::Printf(TEXT("%d:%02d   %d SERVED"),Seconds/60,Seconds%60,M->Served),FVector2D(Size.X-300*S,115*S),15*S,FLinearColor::White);
        if(APlayerController* PC=M->GetWorld()->GetFirstPlayerController())
        {
            const FIntPoint Pixels=GEngine->GameViewport->Viewport->GetSizeXY();const FVector2D ScreenToSlate(Size.X/FMath::Max(1,Pixels.X),Size.Y/FMath::Max(1,Pixels.Y));
            for(int I=0;I<M->Chefs.Num();I++){const AAWRestaurantPawn* P=M->Chefs[I];FVector2D Screen;if(PC->ProjectWorldLocationToScreen(FVector(P->GetActorLocation().X,P->GetActorLocation().Y,P->Visual->CalcBounds(P->Visual->GetComponentTransform()).GetBox().Max.Z+42),Screen,true)){Screen*=ScreenToSlate;Text(KitchenNative::Names[I],Screen-FVector2D(20,0),12*S,KitchenNative::Colors[I],4);if(!P->Held.Empty())Text(AAWRestaurantMode::ItemName(P->Held),Screen+FVector2D(-30,-18)*S,9*S,FLinearColor::White,4);}}
            for(const auto& Station:M->Stations){const bool Progress=(Station.AssetRole==TEXT("Board")&&!Station.Item.Empty()&&!Station.Item.Ready)||(Station.AssetRole==TEXT("Pot")&&!Station.Item.Empty()&&!Station.Item.Ready&&!Station.Item.Burned);FVector2D Screen;if(PC->ProjectWorldLocationToScreen(M->TileLocation(FVector2D(Station.Tile)+FVector2D(.5f,.5f),140),Screen,true)){Screen*=ScreenToSlate;if(Screen.Y<166*S||Screen.Y>Size.Y-78*S)continue;if(!Progress&&Station.Item.Empty())Text(Station.Label,Screen-FVector2D(25,0),9*S,FLinearColor(.95f,.9f,.75f),4);if(Progress){Box(Screen-FVector2D(25,0)*S,FVector2D(50,5)*S,FLinearColor(.08f,.1f,.1f),3);Box(Screen-FVector2D(25,0)*S,FVector2D(50*Station.Item.Progress,5)*S,FLinearColor(1,.8f,.45f),4);}else if(Station.Item.Burned)Text(TEXT("BURNT - BIN IT"),Screen-FVector2D(40,0),10*S,FLinearColor(1,.4f,.25f),4);else if(Station.Item.Ready)Text(TEXT("READY"),Screen-FVector2D(20,0),10*S,FLinearColor(.55f,1,.65f),4);}}
        }
        Box(FVector2D(0,Size.Y-64*S),FVector2D(Size.X,64*S),FLinearColor(.025f,.035f,.055f,.93f));Text(M->Status,FVector2D(24,Size.Y-54*S),12*S,FLinearColor(1,.9f,.72f));Text(TEXT("WASD / stick: move   E / A: pick-place   Hold F / X: work   Space / B: dash   P: pause   Esc: world"),FVector2D(24,Size.Y-28*S),10*S,FLinearColor(.72f,.8f,.85f));
        if(!M->bNativeAssetsReady||M->bPaused||M->bFinished){Box(FVector2D(Size.X*.13f,Size.Y*.35f),FVector2D(Size.X*.74f,Size.Y*.25f),FLinearColor(.025f,.035f,.055f,.97f),6);Text(!M->bNativeAssetsReady?TEXT("RESTAURANT ASSET KIT IS NOT READY"):M->bFinished?TEXT("SERVICE COMPLETE - CLICK TO RESTART"):TEXT("KITCHEN PAUSED"),FVector2D(Size.X*.17f,Size.Y*.39f),21*S,FLinearColor(1,.85f,.60f),7);Text(!M->bNativeAssetsReady?M->AssetBlocker:FString::Printf(TEXT("%d dishes served together. %d points."),M->Served,M->Score),FVector2D(Size.X*.17f,Size.Y*.47f),12*S,FLinearColor::White,7);}
        return Layer+10;
    }
private:TWeakObjectPtr<AAWRestaurantMode> Owner;
};

AAWRestaurantPawn::AAWRestaurantPawn()
{
    PrimaryActorTick.bCanEverTick=false;Body=CreateDefaultSubobject<UBoxComponent>(TEXT("ChefBody"));SetRootComponent(Body);Body->SetBoxExtent(FVector(21,21,40));Body->SetCollisionProfileName(TEXT("Pawn"));Body->SetCollisionResponseToChannel(ECC_Pawn,ECR_Ignore);Visual=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RecoveredChef"));Visual->SetupAttachment(Body);Visual->SetCollisionEnabled(ECollisionEnabled::NoCollision);HeldVisual=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("HeldIngredient"));HeldVisual->SetupAttachment(Body);HeldVisual->SetRelativeLocation(FVector(32,0,32));HeldVisual->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}
AAWRestaurantMode::AAWRestaurantMode(){PrimaryActorTick.bCanEverTick=true;PlayerControllerClass=AAWRestaurantController::StaticClass();DefaultPawnClass=nullptr;}
FVector AAWRestaurantMode::TileLocation(FVector2D P,float Z)const{return FVector((P.X-5.5f)*100,(P.Y-4)*100,Z);}
uint8 AAWRestaurantMode::Part(ERTItem K){return K==ERTItem::Fish?1:K==ERTItem::Cucumber?2:K==ERTItem::Rice?4:0;}
FString AAWRestaurantMode::Recipe(uint8 P){return P==5?TEXT("Ocean roll"):P==6?TEXT("Garden roll"):P==3?TEXT("Fresh platter"):TEXT("Incomplete plate");}
FString AAWRestaurantMode::ItemName(const FRTItem& I){if(I.Kind==ERTItem::Plate)return I.Parts?Recipe(I.Parts):TEXT("Clean plate");return I.Burned?TEXT("Burnt rice"):FString(I.Ready?TEXT("Prepared "):TEXT("Raw "))+(I.Kind==ERTItem::Fish?TEXT("fish"):I.Kind==ERTItem::Cucumber?TEXT("cucumber"):TEXT("rice"));}
UStaticMesh* AAWRestaurantMode::LoadRole(const FString& AssetRole){if(auto* Found=Meshes.Find(AssetRole))return Found->Get();const FString P=FString::Printf(TEXT("/Game/AbbiesRestaurant/SM_%s.SM_%s"),*AssetRole,*AssetRole);UStaticMesh* Mesh=LoadObject<UStaticMesh>(nullptr,*P);if(Mesh){Meshes.Add(AssetRole,Mesh);NativeMeshes.Add(Mesh);}return Mesh;}
void AAWRestaurantMode::SetupMesh(UStaticMeshComponent* C,const FString& AssetRole,float W,float D,float H,bool Ground){UStaticMesh* Mesh=LoadRole(AssetRole);C->SetStaticMesh(Mesh);if(!Mesh){C->SetVisibility(false);return;}C->SetVisibility(true);const FBox B=Mesh->GetBoundingBox();const FVector Size=B.GetSize();const float S=FMath::Min3(W/FMath::Max(Size.X,.01f),D/FMath::Max(Size.Y,.01f),H/FMath::Max(Size.Z,.01f));C->SetRelativeScale3D(FVector(S));if(Ground){FVector L=C->GetRelativeLocation();L.Z-=B.Min.Z*S;C->SetRelativeLocation(L);}C->SetCollisionEnabled(ECollisionEnabled::NoCollision);}
static void KitchenCue(UObject*,const TCHAR*) { /* Original audio to be supplied by the art/audio owner. */ }
void AAWRestaurantMode::Message(const FString& T){Status=T;UE_LOG(LogTemp,Display,TEXT("AW_KITCHEN_EVENT %s"),*T);}
void AAWRestaurantMode::BeginPlay()
{
    Super::BeginPlay();UGameMapsSettings::GetGameMapsSettings()->SetSkipAssigningGamepadToPlayer1(true);FParse::Value(FCommandLine::Get(),TEXT("RestaurantPlayers="),PlayerCount);PlayerCount=FMath::Clamp(PlayerCount,1,4);FParse::Value(FCommandLine::Get(),TEXT("RestaurantVisualYaw="),ChefVisualYawOffset);bDemo=!FParse::Param(FCommandLine::Get(),TEXT("RestaurantHuman"))&&!FParse::Param(FCommandLine::Get(),TEXT("AWRestaurantCalibrationProof"));
    TArray<FString> Missing;for(const FString AssetRole:{TEXT("Floor"),TEXT("Counter"),TEXT("Chef"),TEXT("Fish"),TEXT("Cucumber"),TEXT("Rice"),TEXT("Plate"),TEXT("Board"),TEXT("Pot"),TEXT("Sink"),TEXT("Crate")})if(!LoadRole(AssetRole))Missing.Add(AssetRole);
    bNativeAssetsReady=Missing.Num()==0;AssetBlocker=TEXT("Missing imported roles: ")+FString::Join(Missing,TEXT(", "));if(bNativeAssetsReady)BuildKitchen();else Message(TEXT("The restaurant asset kit is required. Run the graybox setup or supply approved original assets."));
    if(GEngine&&GEngine->GameViewport){GEngine->GameViewport->SetForceDisableSplitscreen(true);SAssignNew(HUD,SRestaurantHUD).Mode(this);GEngine->GameViewport->AddViewportWidgetContent(HUD.ToSharedRef(),100);}
    if(!bNativeAssetsReady){if(FParse::Param(FCommandLine::Get(),TEXT("AWRestaurantSmokeTest"))){UE_LOG(LogTemp,Error,TEXT("AW_RESTAURANT_ASSET_BLOCKED %s"),*AssetBlocker);GetWorld()->GetTimerManager().SetTimerForNextTick([this](){UKismetSystemLibrary::QuitGame(this,nullptr,EQuitPreference::Quit,false);});}return;}
    for(int I=0;I<PlayerCount;I++){APlayerController* PC=UGameplayStatics::GetPlayerController(this,I);if(!PC)PC=UGameplayStatics::CreatePlayer(this,I,true);if(PC){PC->Possess(Chefs[I]);PC->SetViewTarget(SharedCamera);PC->bAutoManageActiveCameraTarget=false;PC->bShowMouseCursor=I==0;FInputModeGameAndUI Input;Input.SetHideCursorDuringCapture(false);PC->SetInputMode(Input);}}
    Message(TEXT("Abbie, Mommy and Daddy share one kitchen. Watch the demo, or take over."));
}
void AAWRestaurantMode::BuildKitchen()
{
    for(TActorIterator<AStaticMeshActor> It(GetWorld());It;++It)It->Destroy();
    for(UModelComponent* Model:GetWorld()->PersistentLevel->ModelComponents){Model->SetVisibility(false);Model->SetCollisionEnabled(ECollisionEnabled::NoCollision);}
    auto Add=[&](FString AssetRole,FString Label,int X,int Y){FRTStation S;S.AssetRole=AssetRole;S.Label=Label;S.Tile=FIntPoint(X,Y);Stations.Add(S);};
    Add(TEXT("Fish"),TEXT("Fish"),1,0);Add(TEXT("Cucumber"),TEXT("Cucumber"),2,0);Add(TEXT("Rice"),TEXT("Rice"),3,0);Add(TEXT("Board"),TEXT("Chop"),5,0);Add(TEXT("Board"),TEXT("Chop"),6,0);Add(TEXT("Board"),TEXT("Chop"),7,0);Add(TEXT("Pot"),TEXT("Cook"),8,0);Add(TEXT("Pot"),TEXT("Cook"),9,0);Add(TEXT("Serve"),TEXT("Serving pass"),10,2);Add(TEXT("Plates"),TEXT("Clean plates"),10,4);Add(TEXT("Sink"),TEXT("Wash"),10,6);Add(TEXT("Bin"),TEXT("Bin"),0,5);
    for(int X=2;X<=8;X++)Add(TEXT("Counter"),TEXT("Prep counter"),X,7);for(const FIntPoint T:{FIntPoint(4,3),FIntPoint(5,3),FIntPoint(4,4),FIntPoint(5,4)})Add(TEXT("Counter"),TEXT("Shared counter"),T.X,T.Y);Homes.Add(0,FIntPoint(3,7));Homes.Add(1,FIntPoint(5,7));Homes.Add(2,FIntPoint(7,7));Homes.Add(3,FIntPoint(2,7));
    for(int Y=0;Y<8;Y++)for(int X=0;X<11;X++){AActor* A=GetWorld()->SpawnActor<AActor>();UStaticMeshComponent* C=NewObject<UStaticMeshComponent>(A);A->SetRootComponent(C);C->RegisterComponent();A->SetActorLocation(TileLocation(FVector2D(X+.5f,Y+.5f),-8));SetupMesh(C,TEXT("Floor"),100,100,12);KitchenActors.Add(A);}
    for(FRTStation& S:Stations){AActor* A=GetWorld()->SpawnActor<AActor>();USceneComponent* Root=NewObject<USceneComponent>(A);A->SetRootComponent(Root);Root->RegisterComponent();A->SetActorLocation(TileLocation(FVector2D(S.Tile)+FVector2D(.5f,.5f)));UStaticMeshComponent* Base=NewObject<UStaticMeshComponent>(A);Base->SetupAttachment(Root);Base->RegisterComponent();SetupMesh(Base,S.AssetRole==TEXT("Serve")?TEXT("Pass"):S.AssetRole==TEXT("Bin")?TEXT("Bin"):TEXT("Counter"),99,99,80);S.SurfaceZ=Base->CalcBounds(Base->GetComponentTransform()).GetBox().Max.Z-A->GetActorLocation().Z;UBoxComponent* Block=NewObject<UBoxComponent>(A);Block->SetupAttachment(Root);Block->SetBoxExtent(FVector(49,49,45));Block->SetRelativeLocation(FVector(0,0,40));Block->SetCollisionProfileName(TEXT("BlockAllDynamic"));Block->RegisterComponent();
        const FString TopRole=S.AssetRole==TEXT("Board")||S.AssetRole==TEXT("Pot")||S.AssetRole==TEXT("Sink")?S.AssetRole:S.AssetRole==TEXT("Plates")?TEXT("Plate"):S.AssetRole==TEXT("Counter")||S.AssetRole==TEXT("Serve")||S.AssetRole==TEXT("Bin")?TEXT(""):TEXT("Crate");if(!TopRole.IsEmpty()){UStaticMeshComponent* Top=NewObject<UStaticMeshComponent>(A);Top->SetupAttachment(Root);Top->SetRelativeLocation(FVector(0,0,S.SurfaceZ+.6f));Top->RegisterComponent();SetupMesh(Top,TopRole,TopRole==TEXT("Plate")?58:70,TopRole==TEXT("Plate")?58:70,TopRole==TEXT("Crate")?40:25);if(S.AssetRole==TEXT("Board"))S.SurfaceZ=Top->CalcBounds(Top->GetComponentTransform()).GetBox().Max.Z-A->GetActorLocation().Z;}
        if(S.AssetRole==TEXT("Pot")){auto* Stove=NewObject<UStaticMeshComponent>(A);Stove->SetupAttachment(Root);Stove->SetRelativeLocation(FVector(0,0,S.SurfaceZ+.5f));Stove->RegisterComponent();SetupMesh(Stove,TEXT("Cooker"),85,85,10);}
        if(S.AssetRole==TEXT("Fish")||S.AssetRole==TEXT("Cucumber")||S.AssetRole==TEXT("Rice")){auto* Food=NewObject<UStaticMeshComponent>(A);Food->SetupAttachment(Root);Food->SetRelativeLocation(FVector(0,0,S.SurfaceZ+38));Food->RegisterComponent();SetupMesh(Food,S.AssetRole,45,45,25);}
        S.ItemVisual=NewObject<UStaticMeshComponent>(A);S.ItemVisual->SetupAttachment(Root);S.ItemVisual->SetRelativeLocation(FVector(0,0,S.SurfaceZ+.6f));S.ItemVisual->RegisterComponent();S.ItemVisual->SetCollisionEnabled(ECollisionEnabled::NoCollision);S.Actor=A;KitchenActors.Add(A);}
    for(int I=0;I<PlayerCount;I++){FActorSpawnParameters Spawn;Spawn.SpawnCollisionHandlingOverride=ESpawnActorCollisionHandlingMethod::AlwaysSpawn;AAWRestaurantPawn* P=GetWorld()->SpawnActor<AAWRestaurantPawn>(AAWRestaurantPawn::StaticClass(),TileLocation(FVector2D(2.5f+I*2,5.5f),40),FRotator::ZeroRotator,Spawn);P->ChefIndex=I;P->SetActorLocation(TileLocation(FVector2D(2.5f+I*2,5.5f),40));P->Visual->SetRelativeLocation(FVector(0,0,-40));SetupMesh(P->Visual,TEXT("Chef"),65,65,115);Chefs.Add(P);}
    SharedCamera=GetWorld()->SpawnActor<ACameraActor>();SharedCamera->SetActorLocation(FVector(900,1050,1600));SharedCamera->SetActorRotation((-SharedCamera->GetActorLocation()+FVector(0,0,0)).Rotation());SharedCamera->GetCameraComponent()->SetProjectionMode(ECameraProjectionMode::Orthographic);SharedCamera->GetCameraComponent()->SetOrthoWidth(2250);SharedCamera->GetCameraComponent()->bConstrainAspectRatio=false;
    ADirectionalLight* Light=GetWorld()->SpawnActor<ADirectionalLight>();Light->SetActorRotation(FRotator(-55,-40,0));Light->GetLightComponent()->SetIntensity(3.4f);ASkyLight* Sky=GetWorld()->SpawnActor<ASkyLight>();Sky->GetLightComponent()->SetIntensity(.9f);Sky->GetLightComponent()->RecaptureSky();Restart();
}
void AAWRestaurantMode::AddOrder(uint8 Parts,float Time){if(Orders.Num()>=3)return;FRTOrder O;O.Id=NextOrderId++;O.Parts=Parts?Parts:KitchenNative::Recipes[(O.Id*7)%3];O.Left=O.Total=Time;Orders.Add(O);}
void AAWRestaurantMode::Restart(){Remaining=180;Elapsed=0;Score=Served=Missed=Combo=0;CleanPlates=4;DirtyPlates=0;Orders.Empty();Returns.Empty();NextOrderId=1;NextOrderAt=14;bFinished=bPaused=false;for(auto& S:Stations){S.Item=FRTItem();S.Clock=S.Wash=0;S.Reserved=-1;}for(int I=0;I<Chefs.Num();I++){AAWRestaurantPawn* C=Chefs[I];C->Held=FRTItem();C->Route.Empty();C->DemoOrder=-1;C->TargetStation=-1;C->SetActorLocation(TileLocation(FVector2D(2.5f+I*2,5.5f),40));}AddOrder(5,65);AddOrder(6,80);AddOrder(3,95);Message(TEXT("First service: chop ingredients, cook rice, plate and serve together."));}
int AAWRestaurantMode::NearestStation(const AAWRestaurantPawn* C)const{const FVector2D P=KitchenNative::Pos(C);int Best=-1;float D=1.3f;for(int I=0;I<Stations.Num();I++){const FVector2D V=FVector2D(Stations[I].Tile)+FVector2D(.5f,.5f)-P;const float Dist=V.Size();const float Rank=Dist-.22f*FVector2D::DotProduct(V.GetSafeNormal(),C->Facing);if(Dist<1.3f&&Rank<D){D=Rank;Best=I;}}return Best;}
bool AAWRestaurantMode::IsWalkable(FIntPoint T)const{return T.X>=0&&T.Y>=0&&T.X<11&&T.Y<8&&!Stations.ContainsByPredicate([&](const FRTStation& S){return S.Tile==T;});}
int AAWRestaurantMode::FindStation(const FString& AssetRole,int Chef,bool Free)const{for(int I=0;I<Stations.Num();I++){const auto& S=Stations[I];if(S.AssetRole==AssetRole&&(!Free||S.Item.Empty())&&(Chef<0||S.Reserved==Chef||S.Reserved<0))return I;}return -1;}
void AAWRestaurantMode::MoveChef(int I,FVector2D D,float DT,bool Dash){if(!Chefs.IsValidIndex(I)||bPaused||bFinished||!bNativeAssetsReady)return;AAWRestaurantPawn* C=Chefs[I];if(D.SizeSquared()<.01f)return;D=D.GetSafeNormal()*FMath::Min(1.0,D.Size());C->Facing=D.GetSafeNormal();if(Dash&&C->DashCooldown<=0){C->DashLeft=.18f;C->DashCooldown=1.1f;}const FVector Delta(D.X,D.Y,0);FVector Dest=C->GetActorLocation()+Delta*250*DT*(C->DashLeft>0?2.f:1.f);const FVector2D P(Dest.X/100+5.5f,Dest.Y/100+4.f);if(P.X>.25f&&P.Y>.25f&&P.X<10.75f&&P.Y<7.75f)C->AddActorWorldOffset(Dest-C->GetActorLocation(),true);C->Visual->SetRelativeRotation(FRotator(0,FMath::RadiansToDegrees(FMath::Atan2(D.Y,D.X))+ChefVisualYawOffset,0));}
bool AAWRestaurantMode::Place(FRTItem& H,FRTStation& S,int Chef)
{
    if(S.AssetRole==TEXT("Bin")){if(H.Kind==ERTItem::Plate)H.Parts=0;else H=FRTItem();return true;}
    if(S.AssetRole==TEXT("Serve")){if(H.Kind!=ERTItem::Plate){Message(TEXT("Serve a completed plate."));return false;}const int Index=Orders.IndexOfByPredicate([&](const FRTOrder& O){return O.Parts==H.Parts;});if(Index<0){Message(TEXT("That plate does not match a waiting order."));return false;}const auto O=Orders[Index];Combo=Index==0?FMath::Min(4,Combo+1):0;const int Points=65+FMath::RoundToInt(15*O.Left/O.Total)+Combo*5;Score+=Points;++Served;KitchenCue(this,TEXT("Serve"));Returns.Add(2.4f);Orders.RemoveAt(Index);H=FRTItem();Message(FString::Printf(TEXT("%s served %s! +%d points."),KitchenNative::Names[Chef],*Recipe(O.Parts),Points));return true;}
    if(S.AssetRole==TEXT("Plates")||S.AssetRole==TEXT("Sink")||S.AssetRole==TEXT("Fish")||S.AssetRole==TEXT("Cucumber")||S.AssetRole==TEXT("Rice")){Message(TEXT("Put held items on a prep counter."));return false;}
    if(S.Item.Kind==ERTItem::Plate&&H.Kind!=ERTItem::Plate){if(!H.Ready||H.Burned){Message(TEXT("Chop or cook the ingredient first."));return false;}const uint8 P=Part(H.Kind);if(S.Item.Parts&P){Message(TEXT("That ingredient is already on this plate."));return false;}S.Item.Parts|=P;H=FRTItem();return true;}
    if(!S.Item.Empty()){Message(TEXT("That station is occupied."));return false;}if(S.AssetRole==TEXT("Board")&&(H.Kind==ERTItem::Rice||H.Kind==ERTItem::Plate))return false;if(S.AssetRole==TEXT("Pot")&&(H.Kind!=ERTItem::Rice||H.Ready))return false;S.Item=H;H=FRTItem();S.Clock=0;S.Reserved=Chef;return true;
}
void AAWRestaurantMode::Interact(int I){if(!Chefs.IsValidIndex(I)||bPaused||bFinished||!bNativeAssetsReady)return;AAWRestaurantPawn* C=Chefs[I];if(C->ActionCooldown>0)return;C->ActionCooldown=.20f;KitchenCue(this,TEXT("Place"));const int SI=NearestStation(C);if(SI<0){Message(TEXT("Move closer to a station."));return;}auto& S=Stations[SI];if(!C->Held.Empty()){Place(C->Held,S,I);return;}if(S.AssetRole==TEXT("Fish")||S.AssetRole==TEXT("Cucumber")||S.AssetRole==TEXT("Rice")){C->Held=KitchenNative::NewItem(S.AssetRole==TEXT("Fish")?ERTItem::Fish:S.AssetRole==TEXT("Cucumber")?ERTItem::Cucumber:ERTItem::Rice);return;}if(S.AssetRole==TEXT("Plates")){if(CleanPlates>0){--CleanPlates;C->Held=KitchenNative::NewItem(ERTItem::Plate);}else Message(TEXT("No clean plates. Hold work at the sink."));return;}if(!S.Item.Empty()){if(S.AssetRole==TEXT("Pot")&&!S.Item.Ready&&!S.Item.Burned){Message(TEXT("Rice is still cooking."));return;}C->Held=S.Item;S.Item=FRTItem();S.Reserved=-1;}}
void AAWRestaurantMode::Work(int I,float DT){if(!Chefs.IsValidIndex(I)||bPaused||bFinished)return;AAWRestaurantPawn* C=Chefs[I];if(!C->Held.Empty())return;const int SI=NearestStation(C);if(SI<0)return;auto& S=Stations[SI];if(S.AssetRole==TEXT("Board")&&!S.Item.Empty()&&!S.Item.Ready){C->Working=true;const int Before=FMath::FloorToInt(S.Item.Progress*5);S.Item.Progress=FMath::Min(1.f,S.Item.Progress+DT/2.2f);if(FMath::FloorToInt(S.Item.Progress*5)!=Before)KitchenCue(this,TEXT("Chop"));S.Item.Ready=S.Item.Progress>=1;}if(S.AssetRole==TEXT("Sink")&&DirtyPlates>0){C->Working=true;S.Wash+=DT/2.1f;if(S.Wash>=1){S.Wash=0;--DirtyPlates;++CleanPlates;Message(TEXT("A clean plate is back in circulation."));}}}
void AAWRestaurantMode::Throw(int I){if(!Chefs.IsValidIndex(I)||bPaused||bFinished)return;AAWRestaurantPawn* C=Chefs[I];if(C->Held.Empty()||C->Held.Kind==ERTItem::Plate)return;const FVector2D P=KitchenNative::Pos(C);for(AAWRestaurantPawn* Other:Chefs)if(Other!=C&&Other->Held.Empty()){const FVector2D D=KitchenNative::Pos(Other)-P;if(D.Size()<3.3f&&FVector2D::DotProduct(D.GetSafeNormal(),C->Facing)>.8f){Other->Held=C->Held;C->Held=FRTItem();Message(TEXT("Ingredient hand-off caught!"));return;}}Message(TEXT("Face an empty-handed teammate to pass the ingredient."));}
bool AAWRestaurantMode::WalkTo(int I,int SI,float DT){if(!Stations.IsValidIndex(SI))return false;AAWRestaurantPawn* C=Chefs[I];const auto& S=Stations[SI];const FVector2D P=KitchenNative::Pos(C);if(C->TargetStation!=SI||C->Route.IsEmpty()){TArray<FIntPoint> Q;TMap<FIntPoint,FIntPoint> Prev;const FIntPoint Start(FMath::FloorToInt(P.X),FMath::FloorToInt(P.Y));Q.Add(Start);Prev.Add(Start,Start);FIntPoint End(-1,-1);for(int N=0;N<Q.Num();N++){const auto T=Q[N];if(FMath::Abs(T.X-S.Tile.X)+FMath::Abs(T.Y-S.Tile.Y)==1){End=T;break;}for(const FIntPoint D:{FIntPoint(1,0),FIntPoint(-1,0),FIntPoint(0,1),FIntPoint(0,-1)}){const auto Next=T+D;if(IsWalkable(Next)&&!Prev.Contains(Next)){Prev.Add(Next,T);Q.Add(Next);}}}if(End.X<0)return false;C->Route.Empty();for(auto T=End;T!=Start;T=Prev[T])C->Route.Insert(T,0);C->Route.Insert(Start,0);C->TargetStation=SI;}
    while(C->Route.Num()&&(FVector2D(C->Route[0])+FVector2D(.5f,.5f)-KitchenNative::Pos(C)).Size()<.09f)C->Route.RemoveAt(0);if(C->Route.IsEmpty()){C->Facing=(FVector2D(S.Tile)+FVector2D(.5f,.5f)-KitchenNative::Pos(C)).GetSafeNormal();return true;}const FVector2D D=FVector2D(C->Route[0])+FVector2D(.5f,.5f)-KitchenNative::Pos(C);MoveChef(I,D.GetSafeNormal()*FMath::Min(1.f,D.Size()/(2.5f*DT)),DT);return false;}
void AAWRestaurantMode::DemoChef(int I,float DT)
{
    AAWRestaurantPawn* C=Chefs[I];auto O=Orders.FindByPredicate([&](const FRTOrder& Order){return Order.Id==C->DemoOrder;});if(!O){for(const auto& Order:Orders)if(!Chefs.ContainsByPredicate([&](const AAWRestaurantPawn* P){return P!=C&&P->DemoOrder==Order.Id;})){C->DemoOrder=Order.Id;O=Orders.FindByPredicate([&](const FRTOrder& A){return A.Id==Order.Id;});break;}}if(!O)return;
    const int Home=Stations.IndexOfByPredicate([&](const FRTStation& S){return S.Tile==Homes[I];});auto Use=[&](int SI,bool Working=false){if(WalkTo(I,SI,DT)){if(Working)Work(I,DT);else Interact(I);}};
    if(C->Held.Burned){Use(FindStation(TEXT("Bin")));return;}if(C->Held.Kind==ERTItem::Plate){if(C->Held.Parts==3||C->Held.Parts==5||C->Held.Parts==6)Use(FindStation(TEXT("Serve")));else Use(Home);return;}if(!C->Held.Empty()){if(C->Held.Ready){Use(Home);return;}const FString AssetRole=C->Held.Kind==ERTItem::Rice?TEXT("Pot"):TEXT("Board");const int S=FindStation(AssetRole,I,true);if(S>=0){Stations[S].Reserved=I;Use(S);}return;}
    auto& H=Stations[Home];if(H.Item.Empty()){if(CleanPlates>0)Use(FindStation(TEXT("Plates")));else Use(FindStation(TEXT("Sink")),true);return;}if(H.Item.Kind!=ERTItem::Plate){Use(Home);return;}if(H.Item.Parts==O->Parts){Use(Home);return;}
    for(int S=0;S<Stations.Num();S++)if(Stations[S].Reserved==I&&!Stations[S].Item.Empty()&&Stations[S].AssetRole==TEXT("Board")){Use(S,!Stations[S].Item.Ready);return;}
    for(int S=0;S<Stations.Num();S++)if(Stations[S].Reserved==I&&!Stations[S].Item.Empty()&&Stations[S].AssetRole==TEXT("Pot")&&(Stations[S].Item.Ready||Stations[S].Item.Burned)){Use(S);return;}
    for(ERTItem Kind:{ERTItem::Rice,ERTItem::Fish,ERTItem::Cucumber})if((O->Parts&Part(Kind))&&!(H.Item.Parts&Part(Kind))&&!Stations.ContainsByPredicate([&](const FRTStation& S){return S.Reserved==I&&S.Item.Kind==Kind;})){Use(FindStation(Kind==ERTItem::Rice?TEXT("Rice"):Kind==ERTItem::Fish?TEXT("Fish"):TEXT("Cucumber")));return;}
}
void AAWRestaurantMode::UpdateVisuals()
{
    auto ItemRole=[](const FRTItem& I)->FString{return I.Kind==ERTItem::Plate?TEXT("Plate"):I.Kind==ERTItem::Fish?(I.Ready?TEXT("FishChopped"):TEXT("Fish")):I.Kind==ERTItem::Cucumber?(I.Ready?TEXT("CucumberChopped"):TEXT("Cucumber")):(I.Ready?TEXT("RiceCooked"):TEXT("Rice"));};
    for(auto& S:Stations)
    {
        S.ItemVisual->SetVisibility(!S.Item.Empty());
        if(!S.Item.Empty())
        {
            const bool Plate=S.Item.Kind==ERTItem::Plate;
            S.ItemVisual->SetRelativeLocation(FVector(0,0,S.SurfaceZ+.6f));
            SetupMesh(S.ItemVisual,ItemRole(S.Item),Plate?58:38,Plate?58:45,Plate?12:25);
        }
    }
    for(AAWRestaurantPawn* C:Chefs)
    {
        const float FacingYaw=FMath::RadiansToDegrees(FMath::Atan2(C->Facing.Y,C->Facing.X));
        C->Visual->SetRelativeRotation(FRotator(0,FacingYaw+ChefVisualYawOffset,0));
        C->HeldVisual->SetVisibility(!C->Held.Empty());
        if(!C->Held.Empty())
        {
            const bool Plate=C->Held.Kind==ERTItem::Plate;
            C->HeldVisual->SetRelativeLocation(FVector(C->Facing.X*18,C->Facing.Y*18,C->Visual->GetStaticMesh()->GetBoundingBox().GetSize().Z*C->Visual->GetRelativeScale3D().Z*.30f-40));
            C->HeldVisual->SetRelativeRotation(FRotator(0,FacingYaw,0));
            SetupMesh(C->HeldVisual,ItemRole(C->Held),Plate?58:34,Plate?58:34,Plate?10:26,true);
        }
    }
}

void AAWRestaurantMode::Tick(float Delta){Super::Tick(Delta);if(!bNativeAssetsReady||bPaused||bFinished)return;const float DT=FMath::Min(Delta,.05f);const float PreviousElapsed=Elapsed;Elapsed+=DT;if(PreviousElapsed<1&&Elapsed>=1){if(auto* PC=GetWorld()->GetFirstPlayerController()){FVector2D Origin;PC->ProjectWorldLocationToScreen(FVector(0,0,50),Origin);bool Passed=true;const FVector2D Inputs[]={FVector2D(1,0),FVector2D(-1,0),FVector2D(0,-1),FVector2D(0,1)};for(const auto Input:Inputs){const auto D=KitchenNative::ScreenDirection(SharedCamera,Input);FVector2D End;PC->ProjectWorldLocationToScreen(FVector(D.X*100,D.Y*100,50),End);const auto DeltaScreen=End-Origin;Passed&=(Input.X==0?DeltaScreen.Y*Input.Y>0:DeltaScreen.X*Input.X>0);UE_LOG(LogTemp,Display,TEXT("AW_CONTROL_PROJECTION Input=(%.0f,%.0f) ScreenDelta=(%.2f,%.2f)"),Input.X,Input.Y,DeltaScreen.X,DeltaScreen.Y);}UE_LOG(LogTemp,Display,TEXT("AW_CONTROL_PROJECTION_PASS=%d"),Passed?1:0);FFileHelper::SaveStringToFile(Passed?TEXT("{\"four_directions_passed\":true}"):TEXT("{\"four_directions_passed\":false}"),*(FPaths::ProjectSavedDir()/TEXT("KitchenControlResult.json")));}}if(FParse::Param(FCommandLine::Get(),TEXT("AWRestaurantProof"))&&PreviousElapsed<12&&Elapsed>=12)FScreenshotRequest::RequestScreenshot(FPaths::ProjectSavedDir()/TEXT("Screenshots/KitchenProof.png"),true,false);Remaining=FMath::Max(0.f,Remaining-DT);for(AAWRestaurantPawn* C:Chefs){C->Working=false;C->ActionCooldown=FMath::Max(0.f,C->ActionCooldown-DT);C->DashCooldown=FMath::Max(0.f,C->DashCooldown-DT);C->DashLeft=FMath::Max(0.f,C->DashLeft-DT);}if(bDemo)for(int I=0;I<Chefs.Num();I++)DemoChef(I,DT);
    for(auto& S:Stations)if(S.AssetRole==TEXT("Pot")&&!S.Item.Empty()&&!S.Item.Burned){S.Clock+=DT;S.Item.Progress=FMath::Min(1.f,S.Clock/5.6f);S.Item.Ready=S.Clock>=5.6f;if(S.Clock>20){S.Item.Burned=true;S.Item.Ready=false;Message(TEXT("Rice burnt! Empty the pot and start fresh."));}}
    for(int I=Returns.Num()-1;I>=0;I--){Returns[I]-=DT;if(Returns[I]<=0){Returns.RemoveAt(I);++DirtyPlates;}}for(int I=Orders.Num()-1;I>=0;I--){Orders[I].Left-=DT;if(Orders[I].Left<=0){Orders.RemoveAt(I);++Missed;Combo=0;Message(TEXT("An order expired. Keep the next one moving."));}}
    if(Elapsed>NextOrderAt&&Orders.Num()<3){AddOrder();NextOrderAt=Elapsed+14;}if(FParse::Param(FCommandLine::Get(),TEXT("AWRestaurantCalibrationProof")))
    {
        const FVector2D Inputs[]={FVector2D(1,0),FVector2D(0,-1),FVector2D(-1,0),FVector2D(0,1)};
        const int Stage=FMath::Clamp(FMath::FloorToInt((Elapsed-.2f)/3),0,3);
        for(int I=0;I<Chefs.Num();I++){Chefs[I]->Facing=KitchenNative::ScreenDirection(SharedCamera,Inputs[Stage]);Chefs[I]->Held=KitchenNative::NewItem(ERTItem::Plate);}
        for(auto& Station:Stations)if(Station.Tile==FIntPoint(3,7))Station.Item=KitchenNative::NewItem(ERTItem::Plate);
    }
    UpdateVisuals();
    if(FParse::Param(FCommandLine::Get(),TEXT("AWRestaurantCalibrationProof")))
    {
        const int Shot=FMath::FloorToInt((Elapsed-2)/3);
        if(Elapsed>=2&&Shot<4&&Shot>=CalibrationRecords.Num())VerifyCalibrationShot(Shot);
        if(Elapsed>=12.5f){const FString Report=FString::Printf(TEXT("{\"passed\":%s,\"shots\":[%s]}"),bCalibrationPassed?TEXT("true"):TEXT("false"),*FString::Join(CalibrationRecords,TEXT(",")));FFileHelper::SaveStringToFile(Report,*(FPaths::ProjectSavedDir()/TEXT("KitchenCalibrationResult.json")));UKismetSystemLibrary::QuitGame(this,nullptr,EQuitPreference::Quit,false);}
    }
    if(Remaining<=0){bFinished=true;KitchenCue(this,TEXT("Finish"));Message(FString::Printf(TEXT("SERVICE COMPLETE: %d dishes, %d points"),Served,Score));UE_LOG(LogTemp,Display,TEXT("AW_RESTAURANT_SERVICE_END Served=%d Score=%d Missed=%d"),Served,Score,Missed);if(FParse::Param(FCommandLine::Get(),TEXT("AWRestaurantSmokeTest"))){FString Report=FString::Printf(TEXT("{\"served\":%d,\"score\":%d,\"missed\":%d,\"players\":%d,\"native_assets_ready\":true}"),Served,Score,Missed,Chefs.Num());FFileHelper::SaveStringToFile(Report,*(FPaths::ProjectSavedDir()/TEXT("KitchenServiceResult.json")));UKismetSystemLibrary::QuitGame(this,nullptr,EQuitPreference::Quit,false);}}
}
void AAWRestaurantMode::SetDemo(bool Enabled){bDemo=Enabled;for(AAWRestaurantPawn* C:Chefs){C->Human=!Enabled;C->Route.Empty();C->TargetStation=-1;}Message(Enabled?TEXT("The family chefs are demonstrating a real service."):TEXT("Family co-op: keyboard for Abbie, controllers for Mommy and Daddy."));}
void AAWRestaurantMode::TogglePause(){bPaused=!bPaused;Message(bPaused?TEXT("Kitchen paused. Make a plan together."):TEXT("Back to the kitchen."));}
void AAWRestaurantMode::ReturnToWorld(){UGameplayStatics::OpenLevel(this,FName(TEXT("/Engine/Maps/Entry")),true,TEXT("game=/Script/AbbiesWorld.AWFrontEndMode"));}
void AAWRestaurantMode::EndPlay(const EEndPlayReason::Type R){if(HUD.IsValid()&&GEngine&&GEngine->GameViewport)GEngine->GameViewport->RemoveViewportWidgetContent(HUD.ToSharedRef());HUD.Reset();for(int I=UGameplayStatics::GetNumLocalPlayerControllers(this)-1;I>=1;--I)if(auto* PC=UGameplayStatics::GetPlayerController(this,I))UGameplayStatics::RemovePlayer(PC,true);Super::EndPlay(R);}
void AAWRestaurantController::PlayerTick(float DT)
{
    Super::PlayerTick(DT);auto* M=Cast<AAWRestaurantMode>(UGameplayStatics::GetGameMode(this));if(!M)return;if((FParse::Param(FCommandLine::Get(),TEXT("AWRestaurantSmokeTest"))||FParse::Param(FCommandLine::Get(),TEXT("AWRestaurantCalibrationProof"))))return;const int Index=GetLocalPlayer()?GetLocalPlayer()->GetControllerId():0;
    if(Index==0&&WasInputKeyJustPressed(EKeys::Escape)){M->ReturnToWorld();return;}if(Index==0&&WasInputKeyJustPressed(EKeys::P))M->TogglePause();if(Index==0&&WasInputKeyJustPressed(EKeys::R))M->Restart();
    FVector2D Screen(GetInputAnalogKeyState(EKeys::Gamepad_LeftX),-GetInputAnalogKeyState(EKeys::Gamepad_LeftY));if(Index==0){Screen.X+=(IsInputKeyDown(EKeys::D)?1.f:0.f)-(IsInputKeyDown(EKeys::A)?1.f:0.f);Screen.Y+=(IsInputKeyDown(EKeys::S)?1.f:0.f)-(IsInputKeyDown(EKeys::W)?1.f:0.f);}if(Screen.Size()<.18f)Screen=FVector2D::ZeroVector;
    const bool Act=WasInputKeyJustPressed(EKeys::Gamepad_FaceButton_Bottom)||(Index==0&&WasInputKeyJustPressed(EKeys::E));const bool Work=IsInputKeyDown(EKeys::Gamepad_FaceButton_Left)||(Index==0&&IsInputKeyDown(EKeys::F));const bool Toss=WasInputKeyJustPressed(EKeys::Gamepad_FaceButton_Left)||(Index==0&&WasInputKeyJustPressed(EKeys::F));
    if(M->bDemo&&(Screen.Size()>.2f||Act))M->SetDemo(false);if(!M->bDemo){const FVector2D World=KitchenNative::ScreenDirection(M->SharedCamera,Screen);M->MoveChef(Index,World,DT,WasInputKeyJustPressed(EKeys::Gamepad_FaceButton_Right)||(Index==0&&WasInputKeyJustPressed(EKeys::SpaceBar)));if(Act)M->Interact(Index);if(Toss&&M->Chefs.IsValidIndex(Index)&&!M->Chefs[Index]->Held.Empty())M->Throw(Index);if(Work)M->Work(Index,DT);}
}

void AAWRestaurantMode::VerifyCalibrationShot(int Index)
{
    const TCHAR* Names[]={TEXT("Right"),TEXT("Up"),TEXT("Left"),TEXT("Down")};
    bool FacingPassed=true,CarryPassed=true,ContactPassed=true;
    for(const AAWRestaurantPawn* Chef:Chefs)
    {
        const FVector Forward=Chef->Visual->GetRelativeRotation().RotateVector(FVector(0,1,0));
        FacingPassed&=FVector2D::DotProduct(FVector2D(Forward.X,Forward.Y),Chef->Facing)>.999;
        const FVector Held=Chef->HeldVisual->GetRelativeLocation();
        CarryPassed&=FVector2D::DotProduct(FVector2D(Held.X,Held.Y).GetSafeNormal(),Chef->Facing)>.999;
    }
    float Gap=-999;
    for(const auto& Station:Stations)if(Station.Tile==FIntPoint(3,7))
    {
        Gap=Station.ItemVisual->CalcBounds(Station.ItemVisual->GetComponentTransform()).GetBox().Min.Z-(Station.Actor->GetActorLocation().Z+Station.SurfaceZ);
        ContactPassed&=FMath::Abs(Gap-.6f)<.1f;
    }
    bCalibrationPassed&=FacingPassed&&CarryPassed&&ContactPassed;
    CalibrationRecords.Add(FString::Printf(TEXT("{\"direction\":\"%s\",\"mesh_forward_matches_movement\":%s,\"carry_follows_facing\":%s,\"plate_surface_gap_cm\":%.3f}"),Names[Index],FacingPassed?TEXT("true"):TEXT("false"),CarryPassed?TEXT("true"):TEXT("false"),Gap));
    FScreenshotRequest::RequestScreenshot(FPaths::ProjectSavedDir()/FString::Printf(TEXT("Screenshots/Calibration%s.png"),Names[Index]),true,false);
    UE_LOG(LogTemp,Display,TEXT("AW_CALIBRATION %s Facing=%d Carry=%d SurfaceGap=%.3f"),Names[Index],FacingPassed?1:0,CarryPassed?1:0,Gap);
}
