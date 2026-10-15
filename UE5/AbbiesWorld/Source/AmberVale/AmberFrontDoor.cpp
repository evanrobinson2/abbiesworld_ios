#include "AmberGameMode.h"
#include "AmberIdentity.h"
#include "Engine/GameViewportClient.h"
#include "UnrealClient.h"
#include "HAL/IConsoleManager.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "Misc/FileHelper.h"
#include "Kismet/GameplayStatics.h"
#include "Components/AudioComponent.h"
#include "Sound/SoundBase.h"
#include "MediaPlayer.h"
#include "MediaTexture.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Brushes/SlateRoundedBoxBrush.h"
#include "Widgets/SOverlay.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Images/SImage.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SCheckBox.h"
#include "Widgets/Input/SSlider.h"
#include "Widgets/Text/STextBlock.h"
namespace {
 FSlateRoundedBoxBrush Paper(FLinearColor(.98,.965,.93,1),28),Mint(FLinearColor(.76,.9,.8,1),20),Cream(FLinearColor(.98,.93,.82,1),20),Hover(FLinearColor(.89,.94,.88,1),20),Press(FLinearColor(.67,.83,.73,1),20);
 FButtonStyle ButtonStyle=FButtonStyle().SetNormal(Cream).SetHovered(Hover).SetPressed(Press).SetNormalPadding(FMargin(20,14)).SetPressedPadding(FMargin(20,15,20,13));
 TSharedPtr<FAmberIdentity> Session;
 TSharedRef<STextBlock> Label(const FString& Text,int32 Size=16,FLinearColor Color=FLinearColor(.13,.18,.16)){return SNew(STextBlock).Text(FText::FromString(Text)).Font(FCoreStyle::GetDefaultFontStyle(Size>=20?"Bold":"Regular",Size)).ColorAndOpacity(Color).AutoWrapText(true).WrapTextAt(360);}
 TSharedRef<SButton> Action(const FString& Text,TFunction<void()> Do){return SNew(SButton).ButtonStyle(&ButtonStyle).HAlign(HAlign_Left).OnClicked_Lambda([Do](){Do();return FReply::Handled();})[Label(Text,20)];}
}
FString AAmberHUD::DisplayMetrics() const {FIntPoint Size=GEngine&&GEngine->GameViewport&&GEngine->GameViewport->Viewport?GEngine->GameViewport->Viewport->GetSizeXY():FIntPoint::ZeroValue;auto SP=IConsoleManager::Get().FindConsoleVariable(TEXT("r.ScreenPercentage"));float Scale=SP?SP->GetFloat():100;return FString::Printf(TEXT("Output %d x %d  |  Render scale %.0f%%\n%.0f FPS  |  %s"),Size.X,Size.Y,Scale,SmoothedFPS,DeveloperMode?TEXT("LOCAL DEVELOPER MODE"):TEXT("PLAYER MODE"));}
void AAmberHUD::CloseFrontDoor(){if(IntroPlayer)IntroPlayer->Close();if(IntroAudio)IntroAudio->Stop();if(Identity)Identity->Changed=nullptr;if(GEngine&&GEngine->GameViewport&&FrontDoor.IsValid())GEngine->GameViewport->RemoveViewportWidgetContent(FrontDoor.ToSharedRef());FrontDoor.Reset();}
void AAmberHUD::ShowIntro(){
 GameStarted=false;FrontStage=0;FrontTime=0;FadeTime=0;SetMusic(false);if(!Session)Session=MakeShared<FAmberIdentity>();Identity=Session;
 IntroPlayer=NewObject<UMediaPlayer>(this);IntroPlayer->PlayOnOpen=true;IntroPlayer->SetLooping(true);IntroTexture=NewObject<UMediaTexture>(this);IntroTexture->SetMediaPlayer(IntroPlayer);IntroTexture->UpdateResource();
 auto Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/AbbiesWorld/UI/M_IntroVideo.M_IntroVideo"));if(Base){IntroMaterial=UMaterialInstanceDynamic::Create(Base,this);IntroMaterial->SetTextureParameterValue(TEXT("Video"),IntroTexture);IntroBrush.SetResourceObject(IntroMaterial);IntroBrush.ImageSize=FVector2D(1920,1080);}
 IntroPlayer->OpenFile(FPaths::ConvertRelativePathToFull(FPaths::ProjectContentDir()/TEXT("Movies/world2_intro.mp4")));
 auto Sound=LoadObject<USoundBase>(nullptr,TEXT("/Game/AbbiesWorld/Audio/UserMusic/Score_Intro.Score_Intro"));if(Sound)IntroAudio=UGameplayStatics::SpawnSound2D(this,Sound,.72);
 TSharedRef<SOverlay> UI=SNew(SOverlay);
 UI->AddSlot()[SNew(SBorder).BorderImage(FCoreStyle::Get().GetBrush("WhiteBrush")).BorderBackgroundColor(FLinearColor(.025,.07,.065))];
 UI->AddSlot()[SNew(SImage).Image(&IntroBrush)];
 UI->AddSlot().HAlign(HAlign_Center).VAlign(VAlign_Center)[SNew(SVerticalBox)+SVerticalBox::Slot().AutoHeight()[Label(TEXT("ABBIE'S WORLD"),48,FLinearColor(1,.84,.87))]+SVerticalBox::Slot().AutoHeight().Padding(0,18)[Label(TEXT("A place to wander. A place to come home."),20,FLinearColor::White)]];
 UI->AddSlot().HAlign(HAlign_Right).VAlign(VAlign_Bottom).Padding(30)[Action(TEXT("Continue"),[this](){ShowMenu();})];
 FrontDoor=UI;GEngine->GameViewport->AddViewportWidgetContent(UI,30);
}
void AAmberHUD::ShowMenu(){
 ResumeAvailable=ResumeAvailable||GameStarted;GameStarted=false;if(!Identity){if(!Session)Session=MakeShared<FAmberIdentity>();Identity=Session;}CloseFrontDoor();FrontStage=1;FadeTime=0;SetMusic(true);
 Identity->Changed=[Weak=TWeakObjectPtr<AAmberHUD>(this)](){if(auto H=Weak.Get()){if(H->Identity&&H->Identity->UniverseJoined)H->StartGame(false);else H->ShowMenu();}};
 TSharedRef<SOverlay> UI=SNew(SOverlay);UI->AddSlot()[SNew(SBorder).BorderImage(FCoreStyle::Get().GetBrush("WhiteBrush")).BorderBackgroundColor(FLinearColor(.035,.07,.065,.62))];
 SAssignNew(MenuItems,SVerticalBox);
 auto Add=[this](TSharedRef<SWidget> W){MenuItems->AddSlot().AutoHeight().Padding(0,6)[W];};
 Add(Label(TEXT("ABBIE'S WORLD"),14,FLinearColor(.29,.48,.38)));Add(Label(TEXT("Your next adventure."),30));Add(Label(TEXT("The Amber Vale  /  Overland edition"),16));
 if(ResumeAvailable)Add(Action(TEXT("Continue"),[this](){ResumeGame();}));
 else {Add(Action(TEXT("Close"),[this](){EscapeUI();}));Add(Label(TEXT("Close or Escape explores locally until you join a shared universe."),14));}
 if(Identity->SignedIn){
  Add(Label(Identity->Status,16));
  if(!Identity->ActiveName.IsEmpty()){
   Add(Label(TEXT("UNIVERSES FOR ")+Identity->ActiveName,14));
   for(auto Universe:Identity->Universes)Add(Action(Universe.Name+TEXT("  /  ")+Universe.Theme,[this,Universe](){Identity->JoinUniverse(Universe.Id);}));
   Add(Action(Identity->Busy?TEXT("Connecting..."):TEXT("Refresh"),[this](){Identity->FetchUniverses();}));
   Add(Action(TEXT("Player"),[this](){if(Identity->Busy)return;Identity->LeaveUniverse();Identity->ActiveName.Empty();Identity->ActiveProfileId.Empty();Identity->Universes.Empty();ShowMenu();}));
  }else for(auto Profile:Identity->Profiles)Add(Action(Profile.Name,[this,Profile](){Identity->Choose(Profile.Id);}));
 }
 else {Add(Action(Identity->Busy?TEXT("Waiting"):TEXT("Connect"),[this](){BeginLogin();}));Add(Label(Identity->Status,14));}
 Add(Action(TEXT("Settings"),[this](){ShowSettings();}));
 Add(Action(TEXT("Tools"),[this](){StartGame(true);DrawerShell->SetVisibility(EVisibility::Visible);Scrim->SetVisibility(EVisibility::Visible);}));
 Add(Action(TEXT("Preview"),[this](){StartGame(true);}));
 Add(Label(TEXT("Preview stays on this computer. It does not sign in or import a household save."),13,FLinearColor(.37,.42,.39)));
 Add(Action(TEXT("Intro"),[this](){CloseFrontDoor();ShowIntro();}));
 Add(Action(TEXT("Quit"),[this](){GetOwningPlayerController()->ConsoleCommand(TEXT("quit"));}));
 UI->AddSlot().HAlign(HAlign_Left).VAlign(VAlign_Fill).Padding(24,24)[SNew(SBox).WidthOverride(440)[SNew(SBorder).BorderImage(&Paper).Padding(24)[SNew(SScrollBox).ScrollBarVisibility(EVisibility::Visible)+SScrollBox::Slot()[MenuItems.ToSharedRef()]]]];
 UI->AddSlot().HAlign(HAlign_Right).VAlign(VAlign_Bottom).Padding(30)[SNew(STextBlock).Text_Lambda([this](){return FText::FromString(DisplayMetrics());}).Font(FCoreStyle::GetDefaultFontStyle("Regular",14)).ColorAndOpacity(FLinearColor::White)];
 FrontDoor=UI;GEngine->GameViewport->AddViewportWidgetContent(UI,30);
}
void AAmberHUD::BeginLogin(){if(!Identity)return;Identity->Login();}
void AAmberHUD::StartGame(bool LocalPreview){
 if(!LocalPreview&&(!Identity||!Identity->SignedIn||!Identity->UniverseJoined))return;
 CloseFrontDoor();ResumeAvailable=true;DeveloperMode=LocalPreview;GameStarted=true;if(DrawerShell)DrawerShell->SetVisibility(EVisibility::Collapsed);if(Scrim)Scrim->SetVisibility(EVisibility::Collapsed);FrontStage=2;SetMusic(true);GetOwningPlayerController()->SetInputMode(FInputModeGameAndUI());
 if(!LocalPreview){SwitchWorld(Identity->UniverseMap);RestoreUniverseProgress();}
}
void AAmberHUD::ResumeGame(){
 if(!ResumeAvailable)return;
 if(!DeveloperMode&&(!Identity||!Identity->SignedIn||!Identity->UniverseJoined||Identity->UniverseSaveFailed)){ResumeAvailable=false;ShowMenu();return;}
 CloseFrontDoor();GameStarted=true;FrontStage=2;if(DrawerShell)DrawerShell->SetVisibility(EVisibility::Collapsed);if(Scrim)Scrim->SetVisibility(EVisibility::Collapsed);GetOwningPlayerController()->SetInputMode(FInputModeGameAndUI());
}
void AAmberHUD::EscapeUI(){
 if(FrontDoor.IsValid()){if(ResumeAvailable)ResumeGame();else if(FrontStage==1)StartGame(true);else ShowMenu();return;}
 if(DrawerShell&&DrawerShell->GetVisibility()==EVisibility::Visible){DrawerShell->SetVisibility(EVisibility::Collapsed);if(Scrim)Scrim->SetVisibility(EVisibility::Collapsed);return;}
 ShowMenu();
}
void AAmberHUD::ToggleSettings(){if(FrontStage==3&&FrontDoor.IsValid()){if(ResumeAvailable)ResumeGame();else ShowMenu();}else ShowSettings();}
void AAmberHUD::ShowSettings(){
 ResumeAvailable=ResumeAvailable||GameStarted;CloseFrontDoor();FrontStage=3;GameStarted=false;TSharedRef<SVerticalBox> Items=SNew(SVerticalBox);
 auto Add=[&](TSharedRef<SWidget> W){Items->AddSlot().AutoHeight().Padding(0,7)[W];};
 Add(Label(TEXT("Make yourself at home."),32));Add(Label(TEXT("DISPLAY & CAMERA"),14));Add(SNew(STextBlock).Text_Lambda([this](){return FText::FromString(DisplayMetrics());}).ColorAndOpacity(FLinearColor(.13,.18,.16)));
 Add(SNew(STextBlock).Font(FCoreStyle::GetDefaultFontStyle("Regular",16)).Text_Lambda([this](){auto PC=Cast<AAmberController>(GetOwningPlayerController());return FText::FromString(FString::Printf(TEXT("Orbit sensitivity: %.2fx"),PC?PC->GetOrbitSensitivity():2.f));}).ColorAndOpacity(FLinearColor(.13,.18,.16)));
 Add(SNew(SSlider).Value_Lambda([this](){auto PC=Cast<AAmberController>(GetOwningPlayerController());return PC?(PC->GetOrbitSensitivity()-.25f)/3.75f:1.75f/3.75f;}).OnValueChanged_Lambda([this](float V){if(auto PC=Cast<AAmberController>(GetOwningPlayerController()))PC->SetOrbitSensitivity(.25f+V*3.75f);}));
 Add(Label(TEXT("Right-drag rotation: 0.25x to 4x. Saved automatically. Escape closes panels; F2 toggles settings."),14));
 Add(Action(TEXT("Ultra"),[this](){for(auto Name:{TEXT("sg.ViewDistanceQuality"),TEXT("sg.AntiAliasingQuality"),TEXT("sg.ShadowQuality"),TEXT("sg.GlobalIlluminationQuality"),TEXT("sg.ReflectionQuality"),TEXT("sg.PostProcessQuality"),TEXT("sg.TextureQuality"),TEXT("sg.EffectsQuality"),TEXT("sg.FoliageQuality")})GetOwningPlayerController()->ConsoleCommand(FString(Name)+TEXT(" 4"));GetOwningPlayerController()->ConsoleCommand(TEXT("r.ScreenPercentage 100"));}));
 Add(Action(TEXT("Fullscreen"),[this](){GetOwningPlayerController()->ConsoleCommand(TEXT("r.SetRes 3840x2160f"));GetOwningPlayerController()->ConsoleCommand(TEXT("r.ScreenPercentage 100"));}));
 Add(Action(TEXT("Smooth"),[this](){GetOwningPlayerController()->ConsoleCommand(TEXT("r.ScreenPercentage 75"));}));
 Add(Label(TEXT("The live readout above reports the actual output. Ultra does not guarantee 60 FPS."),14));
 Add(Action(TEXT("Tilt"),[this](){static bool On=true;On=!On;SetLayer(TEXT("TiltShift"),On);}));
 Add(Label(TEXT("Orbit: right drag  /  Pan: middle drag\nZoom: wheel  /  Home: reset\n1: Abbie  /  2: cafe  /  3: bunker\nDeveloper: F toggles free flight; WASD + Q/E move; Shift faster."),16));
 Add(Action(TEXT("Back"),[this](){if(ResumeAvailable)ResumeGame();else ShowMenu();}));
 TSharedRef<SOverlay> UI=SNew(SOverlay);UI->AddSlot()[SNew(SBorder).BorderImage(FCoreStyle::Get().GetBrush("WhiteBrush")).BorderBackgroundColor(FLinearColor(.035,.07,.065,.7))];UI->AddSlot().HAlign(HAlign_Center).VAlign(VAlign_Fill).Padding(24)[SNew(SBox).WidthOverride(440)[SNew(SBorder).BorderImage(&Paper).Padding(30)[SNew(SScrollBox).ScrollBarVisibility(EVisibility::Visible)+SScrollBox::Slot()[Items]]]];FrontDoor=UI;GEngine->GameViewport->AddViewportWidgetContent(UI,30);
}
void AAmberHUD::TickFrontDoor(float Dt){
 if(FParse::Param(FCommandLine::Get(),TEXT("CameraUIProof"))){
  static int32 Stage=0,SavedTurn=0,SavedStep=0;static bool EntryClosed=false,DrawerClosed=false,SettingsOpened=false,SettingsClosed=false,MenuClosed=false,PositionPreserved=false;
  if(Clock>3&&Stage==0){ResumeAvailable=false;GameStarted=false;ShowMenu();EscapeUI();EntryClosed=GameStarted&&DeveloperMode&&!FrontDoor.IsValid();Turn=3;Step=FMath::Min(2,Route.Num()-1);SavedTurn=Turn;SavedStep=Step;DrawerShell->SetVisibility(EVisibility::Visible);Scrim->SetVisibility(EVisibility::Visible);EscapeUI();DrawerClosed=GameStarted&&DrawerShell->GetVisibility()==EVisibility::Collapsed&&Scrim->GetVisibility()==EVisibility::Collapsed;if(auto PC=Cast<AAmberController>(GetOwningPlayerController()))PC->SettingsKey();SettingsOpened=FrontStage==3&&FrontDoor.IsValid()&&!GameStarted;Stage=1;}
  if(Clock>6&&Stage==1){FScreenshotRequest::RequestScreenshot(FPaths::ProjectDir()/TEXT("native-camera-settings.png"),true,false);Stage=2;}
  if(Clock>8&&Stage==2){if(auto PC=Cast<AAmberController>(GetOwningPlayerController()))PC->SettingsKey();SettingsClosed=GameStarted&&!FrontDoor.IsValid();ShowMenu();EscapeUI();MenuClosed=GameStarted&&!FrontDoor.IsValid();ShowSettings();EscapeUI();SettingsClosed=SettingsClosed&&GameStarted&&!FrontDoor.IsValid();PositionPreserved=Turn==SavedTurn&&Step==SavedStep;FString Result=FString::Printf(TEXT("{\"entry_menu_escape\":%s,\"drawer_escape\":%s,\"f2_settings_open\":%s,\"settings_close\":%s,\"menu_escape_resume\":%s,\"position_preserved\":%s}"),EntryClosed?TEXT("true"):TEXT("false"),DrawerClosed?TEXT("true"):TEXT("false"),SettingsOpened?TEXT("true"):TEXT("false"),SettingsClosed?TEXT("true"):TEXT("false"),MenuClosed?TEXT("true"):TEXT("false"),PositionPreserved?TEXT("true"):TEXT("false"));FFileHelper::SaveStringToFile(Result,*(FPaths::ProjectDir()/TEXT("camera-ui-proof.json")));Stage=3;}
  if(Clock>10&&Stage==3)GetOwningPlayerController()->ConsoleCommand(TEXT("quit"));
 }

 if(FParse::Param(FCommandLine::Get(),TEXT("WorldToolsProof"))){
  static int32 Stage=0;static bool FlightOK=false,ResetOK=false;static FString Results;
  if(Clock>3&&Stage%3==0){StartGame(true);DrawerShell->SetVisibility(EVisibility::Visible);Scrim->SetVisibility(EVisibility::Visible);if(auto PC=Cast<AAmberController>(GetOwningPlayerController())){PC->FocusAbbie();PC->SetFreeCamera(true);FlightOK=PC->IsFreeCamera();PC->ResetToFocus();ResetOK=!PC->IsFreeCamera();PC->ResetCamera();}Stage++;}
  if(Clock>7&&Stage%3==1){const FString Map=GetWorld()->GetMapName();FScreenshotRequest::RequestScreenshot(FPaths::ProjectDir()/TEXT("world-tools-")+Map+TEXT(".png"),true,false);Results+=FString::Printf(TEXT("%s free_camera=%s focus_reset=%s route=%d developer=%s\n"),*Map,FlightOK?TEXT("PASS"):TEXT("FAIL"),ResetOK?TEXT("PASS"):TEXT("FAIL"),Route.Num(),DeveloperMode?TEXT("true"):TEXT("false"));FFileHelper::SaveStringToFile(Results,*(FPaths::ProjectDir()/TEXT("world-tools-proof.txt")));Stage++;}
  if(Clock>10&&Stage%3==2){Stage++;if(Stage==3)SwitchWorld(TEXT("HalloweenCandyland"));else if(Stage==6)SwitchWorld(TEXT("Papercraft"));else if(Stage==9)SwitchWorld(TEXT("ChristmasVillage"));else if(Stage==12)SwitchWorld(TEXT("EnchantedForest"));else GetOwningPlayerController()->ConsoleCommand(TEXT("quit"));}
 }
if(Identity)Identity->Tick();if(GameStarted&&!DeveloperMode&&Identity&&Identity->UniverseSaveFailed)ShowMenu();if(GameStarted&&!DeveloperMode&&Identity&&!Identity->SignedIn)ShowMenu();if(FrontDoor.IsValid()){FadeTime=FMath::Min(1.f,FadeTime+Dt*3);FrontDoor->SetRenderOpacity(FadeTime);}if(FrontStage==0){FrontTime+=Dt;if(FrontTime>3&&IntroAudio&&!IntroAudio->IsPlaying())ShowMenu();else if(FrontTime>30||(!IntroAudio&&FrontTime>12))ShowMenu();}
 if(FParse::Param(FCommandLine::Get(),TEXT("FrontDoorFlowProof"))){
  static int32 TestStage=0;static bool Guard=false,Flight=false;
  if(Clock>32&&TestStage==0){ShowMenu();BeginLogin();Guard=Identity&&!Identity->SignedIn&&!Identity->Busy&&Identity->Status.Contains(TEXT("awaiting"));TestStage=1;}
  if(Clock>34&&TestStage==1){ShowSettings();TestStage=2;}
  if(Clock>36&&TestStage==2){FScreenshotRequest::RequestScreenshot(FPaths::ProjectDir()/TEXT("native-display-settings.png"),true,false);TestStage=3;}
  if(Clock>38&&TestStage==3){StartGame(true);if(auto PC=Cast<AAmberController>(GetOwningPlayerController()))PC->ToggleCameraMode();TestStage=4;}
  if(Clock>40&&TestStage==4){auto PC=Cast<AAmberController>(GetOwningPlayerController());Flight=PC&&PC->GetViewTarget()==PC->GetPawn();if(PC)PC->ResetCamera();TestStage=5;}
  if(TestStage==5&&Turn<5&&!Moving)MoveStep();
  if(Clock>49&&TestStage==5){FScreenshotRequest::RequestScreenshot(FPaths::ProjectDir()/TEXT("native-frontdoor-gameplay.png"),true,false);FString Data=FString::Printf(TEXT("{\"auth_unconfigured_guard\":%s,\"local_developer_mode\":%s,\"free_flight_view_target\":%s,\"completed_moves\":%d,\"fps_sample\":%.1f}"),Guard?TEXT("true"):TEXT("false"),DeveloperMode?TEXT("true"):TEXT("false"),Flight?TEXT("true"):TEXT("false"),Turn,SmoothedFPS);FFileHelper::SaveStringToFile(Data,*(FPaths::ProjectDir()/TEXT("native-frontdoor-flow-test.json")));TestStage=6;}
  if(Clock>52&&TestStage==6)GetOwningPlayerController()->ConsoleCommand(TEXT("quit"));
 }

 if(FParse::Param(FCommandLine::Get(),TEXT("FrontDoorProof"))){static bool Shot=false,IntroShot=false;if(Clock>6&&!IntroShot){FScreenshotRequest::RequestScreenshot(FPaths::ProjectDir()/TEXT("native-intro.png"),true,false);IntroShot=true;}if(Clock>33&&!Shot){if(FrontStage==0)ShowMenu();FScreenshotRequest::RequestScreenshot(FPaths::ProjectDir()/TEXT("native-frontdoor.png"),true,false);FFileHelper::SaveStringToFile(DisplayMetrics(),*(FPaths::ProjectDir()/TEXT("native-frontdoor-metrics.txt")));Shot=true;}}
}

void AAmberHUD::RestoreUniverseProgress(){
 if(!Identity){Identity=Session;}if(!Identity||!Identity->UniverseJoined||!Identity->UniverseState.IsValid())return;
 Turn=0;Step=0;if(Token.IsValid()&&Route.Num())Token->SetActorLocation(Route[0]+FVector(0,0,45));
 const TSharedPtr<FJsonObject>* Players=nullptr;const TSharedPtr<FJsonObject>* Progress=nullptr;
 if(Identity->UniverseState->TryGetObjectField(TEXT("players"),Players)&&(*Players)->TryGetObjectField(Identity->ActiveProfileId,Progress)){
  double T=0,S=0;(*Progress)->TryGetNumberField(TEXT("turn"),T);(*Progress)->TryGetNumberField(TEXT("step"),S);Turn=static_cast<int32>(FMath::Clamp(T,0.0,1000000.0));Step=static_cast<int32>(FMath::Clamp(S,0.0,static_cast<double>(FMath::Max(0,Route.Num()-1))));if(Token.IsValid()&&Route.IsValidIndex(Step))Token->SetActorLocation(Route[Step]+FVector(0,0,45));
 }
}
