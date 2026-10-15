#pragma once
#include "PMAdventureModel.h"
#include "Brushes/SlateRoundedBoxBrush.h"
#include "Sound/SoundBase.h"

// Gameplay owns outcomes; the presentation only reacts to committed state changes.
class SPMAdventure : public SLeafWidget
{
public:
    SLATE_BEGIN_ARGS(SPMAdventure){} SLATE_ARGUMENT(AAWPotionMode*,Mode) SLATE_END_ARGS()
    void Construct(const FArguments& A)
    {
        Owner=A._Mode;
        GConfig->GetBool(TEXT("AbbiesWorld"),TEXT("Motion"),Motion,GGameUserSettingsIni);
        GConfig->GetBool(TEXT("PotionMeadow"),TEXT("Sound"),Sound,GGameUserSettingsIni);
        for(auto texture:Owner->Art){FSlateBrush brush;brush.SetResourceObject(texture);brush.DrawAs=ESlateBrushDrawType::Image;Art.Add(brush);}
        const TCHAR* names[]={TEXT("Step"),TEXT("Pop"),TEXT("Drink"),TEXT("Brew"),TEXT("Hit"),TEXT("Level"),TEXT("Win"),TEXT("Rest")};
        for(auto name:names){auto wave=LoadObject<USoundBase>(nullptr,*FString::Printf(TEXT("/Game/PotionMeadow/Audio/S_PM_%s.S_PM_%s"),name,name));Audio.Add(wave);Owner->Effects.Add(wave);}
        Start(0,1729);Menu=true;
        if(FParse::Param(FCommandLine::Get(),TEXT("PMBoardQA"))){int tier=0;FParse::Value(FCommandLine::Get(),TEXT("PMTier="),tier);Start(tier,1337+tier);Menu=false;}
    }
    virtual FVector2D ComputeDesiredSize(float)const override{return FVector2D(1280,960);}
    virtual bool SupportsKeyboardFocus()const override{return true;}
private:
    struct FPop {FVector2D P,V;FLinearColor Color;float Life,MaxLife,Radius;};
    struct FFloat {FVector2D P;FString Text;FLinearColor Color;float Life=1.25f;};
    AAWPotionMode* Owner=nullptr;
    FPMLayout Layout;
    FPMRules Rules;
    TArray<FSlateBrush> Art;
    TArray<USoundBase*> Audio;
    FSlateRoundedBoxBrush Round=FSlateRoundedBoxBrush(FLinearColor::White,12.f);
    FSlateRoundedBoxBrush Circle=FSlateRoundedBoxBrush(FLinearColor::White);
    TArray<FPop> Pops;
    TArray<FFloat> Floats;
    TArray<FIntPoint> Route;
    FIntPoint Player=FIntPoint(2,7);
    FVector2D Hero,HeroVelocity=FVector2D::ZeroVector,Hover=FVector2D(-100,-100);
    bool Picked[6]={};
    bool Menu=true,Help=false,Won=false,Motion=true,Sound=true;
    float Time=0,Clock=0,StepClock=0,ActionLock=0,HeroPulse=0,EnemyPulse[4]={},WinTime=0,Shake=0;
    FString Message;
    int Turns=0,Wins[3]={};
    // QA drives the same buttons and cell actions as a player.
    float QATime=0;
    int QAItem=0,QAPhase=0,QAAction=0;
    TArray<int> QAPlan;
    bool QACaptured=false,QAEnded=false;

    static FVector2D Cell(FVector2D p){return FVector2D(96+(p.X+.5)*68,140+(p.Y+.5)*56);}
    static bool Inside(FVector2D p,float x,float y,float w,float h){return p.X>=x&&p.X<=x+w&&p.Y>=y&&p.Y<=y+h;}
    void Cue(int i,float volume=.5f){if(Sound&&Audio.IsValidIndex(i)&&Audio[i])UGameplayStatics::PlaySound2D(Owner,Audio[i],volume);}
    void Bubble(FVector2D p,FLinearColor color,int count=20)
    {
        for(int i=0;i<count;i++){float angle=i*2.399963f;float speed=45+(i%7)*17;Pops.Add({p,FVector2D(FMath::Cos(angle)*speed,FMath::Sin(angle)*speed-30),color,.45f+(i%5)*.12f,.45f+(i%5)*.12f,3.f+(i%4)*2});}
    }
    void Float(FString t,FVector2D p,FLinearColor color){Floats.Add({p,MoveTemp(t),color,1.25f});}
    void Start(int tier,int seed)
    {
        Layout.Generate(tier,seed);Rules.Configure(tier);Player=FIntPoint(2,7);Hero=Cell(FVector2D(Player));HeroVelocity=FVector2D::ZeroVector;
        Route.Empty();Pops.Empty();Floats.Empty();Won=false;Help=false;Turns=0;ActionLock=0;HeroPulse=0;Shake=0;WinTime=0;
        for(bool& b:Picked)b=false;for(float& pulse:EnemyPulse)pulse=0;
        for(int i=0;i<3;i++)GConfig->GetInt(TEXT("PotionMeadow"),*FString::Printf(TEXT("Wins%d"),i),Wins[i],GGameUserSettingsIni);
        Message=TEXT("Click a square to explore. Start with goon 0. Heart heals 4; star blocks 3 hits.");
        QAPhase=QAItem=QAAction=0;QAPlan.Empty();QACaptured=QAEnded=false;QATime=0;
    }
    void New(int tier){int seed;do{seed=FMath::RandRange(1,999999);}while(seed==Layout.Seed);Start(tier,seed);Menu=false;Cue(1);}
    int Enemy(FIntPoint p)const {for(int i=0;i<4;i++)if(Layout.Goons[i]==p&&Rules.EnemyHealth[i]>0)return i;return -1;}
    bool Walk(FIntPoint goal)
    {
        if(!Layout.Floor(goal)||Enemy(goal)>=0)return false;
        TMap<FIntPoint,FIntPoint> prev;TArray<FIntPoint> queue;prev.Add(Player,Player);queue.Add(Player);
        const FIntPoint ds[]={FIntPoint(1,0),FIntPoint(-1,0),FIntPoint(0,1),FIntPoint(0,-1)};
        for(int n=0;n<queue.Num();n++){auto q=queue[n];if(q==goal)break;for(auto d:ds){auto v=q+d;if(Layout.Floor(v)&&Enemy(v)<0&&!prev.Contains(v)){prev.Add(v,q);queue.Add(v);}}}
        if(!prev.Contains(goal))return false;
        Route.Empty();for(auto q=goal;q!=Player;q=prev[q])Route.Insert(q,0);return true;
    }
    void Arrive()
    {
        for(int i=0;i<Layout.ItemCount;i++)if(!Picked[i]&&Layout.Items[i]==Player)
        {
            Picked[i]=true;if(i%2==0)Rules.Berries++;else Rules.Flowers++;
            auto color=i%2==0?FLinearColor(1,.25,.35):FLinearColor(.25,.8,1);
            Bubble(Cell(FVector2D(Player)),color);Float(TEXT("+1"),Cell(FVector2D(Player))-FVector2D(0,35),color);HeroPulse=1;Cue(1);
            Message=TEXT("A lovely ingredient! Bring it to the cauldron, then brew a heart or star potion.");
        }
        if(Player==FIntPoint(14,1))
        {
            if(Rules.CanWin())
            {
                Won=true;Route.Empty();WinTime=0;Cue(6,.7f);
                if(!FParse::Param(FCommandLine::Get(),TEXT("PMBoardQA"))){Wins[Layout.Tier]++;
                    GConfig->SetInt(TEXT("PotionMeadow"),*FString::Printf(TEXT("Wins%d"),Layout.Tier),Wins[Layout.Tier],GGameUserSettingsIni);GConfig->Flush(false,GGameUserSettingsIni);}
                if(!FParse::Param(FCommandLine::Get(),TEXT("PMBoardQA")))Owner->OnPotionMeadowRunFinished(true,Layout.Tier,Layout.Seed,Turns);
                Bubble(Hero,FLinearColor(1,.8,.2),60);Message=TEXT("Level 3! The family picnic is ready!");
            }
            else Message=TEXT("Reach level 3 and cheer up pumpkin goon 3 to open the picnic.");
        }
    }
    void Drink(bool red)
    {
        if(Menu||Help||Won||Rules.Lost||Route.Num()>0||ActionLock>0)return;
        int before=Rules.Health;bool ok=red?Rules.DrinkRed():Rules.DrinkBlue();
        if(!ok){Message=red?TEXT("A heart potion is for when you are hurt. Brew more at the cauldron."):TEXT("You need a star potion, or your shield is already shining.");Cue(1,.14f);return;}
        auto color=red?FLinearColor(1,.3,.45):FLinearColor(.2,.85,1);Bubble(Hero,color,30);HeroPulse=1;Cue(2);ActionLock=.18f;
        Float(red?FString::Printf(TEXT("+%d HEARTS"),Rules.Health-before):TEXT("3 BLOCKS!"),Hero-FVector2D(0,70),color);
        Message=red?TEXT("Feeling better! Four hearts restored."):TEXT("Star shield! The next three goon hits will bounce away.");
    }
    void Brew(bool red)
    {
        if(Menu||Help||Won||Rules.Lost||ActionLock>0)return;
        if(FMath::Abs(Player.X-3)+FMath::Abs(Player.Y-6)>1)
        {Walk(FIntPoint(3,6));Message=TEXT("Walking to the cauldron. Click Brew again when Abbie arrives.");return;}
        if(Route.Num()>0)return;
        if(Rules.Brew(red))
        {
            Bubble(Cell(FVector2D(3,6)),red?FLinearColor(1,.3,.4):FLinearColor(.2,.7,1),35);Cue(3);HeroPulse=1;ActionLock=.2f;
            Float(TEXT("+1 POTION"),Hero-FVector2D(0,60),FLinearColor(.9,.65,1));Message=TEXT("Bubble, bubble... a new potion! You made it yourself.");
        }
        else {Cue(1,.15f);Message=red?TEXT("Find a red berry first. Each berry makes one heart potion."):TEXT("Find a blue flower first. Each flower makes one star potion.");}
    }
    void Choose(FIntPoint p)
    {
        if(Menu||Help||Won||Rules.Lost||ActionLock>0)return;
        if(Route.Num()>0){Message=TEXT("Abbie is on her way!");return;}
        int e=Enemy(p);
        if(e>=0)
        {
            if(e>Rules.Level){Message=TEXT("This goon is too strong yet. Start with the lowest number.");Cue(1,.15f);return;}
            int distance=FMath::Abs(p.X-Player.X)+FMath::Abs(p.Y-Player.Y);
            if(distance!=1)
            {
                const FIntPoint ds[]={FIntPoint(-1,0),FIntPoint(0,1),FIntPoint(1,0),FIntPoint(0,-1)};
                for(auto d:ds)if(Walk(p+d)){Message=TEXT("Getting closer! Click the goon again when Abbie arrives.");return;}
                return;
            }
            int hp=Rules.Health,shield=Rules.Shield,level=Rules.Level;Rules.Hit(e);Turns++;ActionLock=.32f;EnemyPulse[e]=1;HeroPulse=.6f;
            Bubble(Cell(FVector2D(p)),FLinearColor(1,.75,.2),15);Float(TEXT("-2"),Cell(FVector2D(p))-FVector2D(0,55),FLinearColor(1,.88,.3));Cue(4,.35f);
            if(Rules.Health<hp){Float(FString::Printf(TEXT("-%d"),hp-Rules.Health),Hero-FVector2D(0,55),FLinearColor(1,.3,.35));Shake=.3f;}
            if(Rules.Shield<shield){Float(TEXT("BOING!"),Hero-FVector2D(0,65),FLinearColor(.3,.9,1));Bubble(Hero,FLinearColor(.2,.8,1),18);}
            if(Rules.Lost){Route.Empty();Pops.Empty();Cue(7);Message=TEXT("A little rest! Try the same board again. Use potions before your last heart.");if(!FParse::Param(FCommandLine::Get(),TEXT("PMBoardQA")))Owner->OnPotionMeadowRunFinished(false,Layout.Tier,Layout.Seed,Turns);}
            else if(Rules.EnemyHealth[e]<=0)
            {
                Bubble(Cell(FVector2D(p)),FLinearColor(.8,1,.35),35);Cue(5,.55f);
                Float(Rules.Level>level?TEXT("LEVEL UP!"):TEXT("GOON CHEERED!"),Hero-FVector2D(0,95),FLinearColor(1,.85,.3));
                Message=Rules.Level==3?TEXT("Level 3! Cheer up pumpkin goon 3, then head to the picnic!"):TEXT("Level up! Look at your hearts and plan your next potion.");
            }
            else Message=Rules.Health<=2?TEXT("Only a few hearts left! A heart potion or star shield will help."):TEXT("Nice try! Check the goon's hearts before your next challenge.");
        }
        else if(Layout.Floor(p))
        {
            Walk(p);
            if(p==FIntPoint(3,6))Message=TEXT("The cauldron! Brew berries into hearts and flowers into star shields.");
        }
    }
    FVector2D Local(const FGeometry& G,FVector2D abs)const
    {
        auto size=G.GetLocalSize();float s=FMath::Min(size.X/1280.f,size.Y/960.f);
        return (G.AbsoluteToLocal(abs)-(size-FVector2D(1280,960)*s)*.5f)/s;
    }
    void Click(FVector2D p)
    {
        if(Help){Help=false;return;}
        if(Menu)
        {
            if(Inside(p,1040,890,150,45)){Owner->ReturnHome();return;}
            for(int i=0;i<3;i++)if(Inside(p,190+i*310,350,280,230)){New(i);return;}
            if(Inside(p,450,625,380,65)){New(FMath::RandRange(0,2));return;}
            if(Inside(p,510,725,260,55)){Help=true;return;}return;
        }
        if(Won||Rules.Lost)
        {
            if(Inside(p,350,570,270,65)){if(Won)New(Layout.Tier);else {Start(Layout.Tier,Layout.Seed);Menu=false;}return;}
            if(Inside(p,660,570,270,65)){Menu=true;return;}return;
        }
        if(Inside(p,95,104,150,28)){Menu=true;return;}
        if(Inside(p,270,104,110,28)){Help=true;return;}
        if(Inside(p,410,104,140,28)){Sound=!Sound;GConfig->SetBool(TEXT("PotionMeadow"),TEXT("Sound"),Sound,GGameUserSettingsIni);GConfig->Flush(false,GGameUserSettingsIni);Cue(1);return;}
        if(Inside(p,580,104,160,28)){Motion=!Motion;GConfig->SetBool(TEXT("AbbiesWorld"),TEXT("Motion"),Motion,GGameUserSettingsIni);GConfig->Flush(false,GGameUserSettingsIni);return;}
        if(Inside(p,90,842,210,60)){Drink(true);return;}
        if(Inside(p,310,842,210,60)){Drink(false);return;}
        if(Inside(p,530,842,210,60)){Brew(true);return;}
        if(Inside(p,750,842,210,60)){Brew(false);return;}
        if(Inside(p,970,842,210,60)){Menu=true;return;}
        Choose(FIntPoint(FMath::FloorToInt((p.X-96)/68),FMath::FloorToInt((p.Y-140)/56)));
    }
public:
    virtual FReply OnMouseMove(const FGeometry& G,const FPointerEvent& E)override{Hover=Local(G,E.GetScreenSpacePosition());Invalidate(EInvalidateWidgetReason::Paint);return FReply::Handled();}
    virtual void OnMouseLeave(const FPointerEvent& E)override{Hover=FVector2D(-100,-100);SLeafWidget::OnMouseLeave(E);}
    virtual FReply OnMouseButtonDown(const FGeometry& G,const FPointerEvent& E)override
    {if(E.GetEffectingButton()!=EKeys::LeftMouseButton)return FReply::Unhandled();Click(Local(G,E.GetScreenSpacePosition()));return FReply::Handled().SetUserFocus(AsShared());}
    virtual FReply OnKeyDown(const FGeometry&,const FKeyEvent& E)override
    {
        auto k=E.GetKey();
        if(k==EKeys::Escape){if(Help)Help=false;else if(Menu)Owner->ReturnHome();else Menu=true;}
        else if(k==EKeys::One)Drink(true);else if(k==EKeys::Two)Drink(false);
        else if(k==EKeys::R){Start(Layout.Tier,Layout.Seed);Menu=false;}
        else if(k==EKeys::N)New(Layout.Tier);else if(k==EKeys::M)Menu=true;else return FReply::Unhandled();
        return FReply::Handled();
    }
    virtual void Tick(const FGeometry&,double,float Delta)override
    {
        float dt=FMath::Min(Delta,.05f);Clock+=dt;if(Motion)Time+=dt;
        ActionLock=FMath::Max(0.f,ActionLock-dt);HeroPulse=FMath::Max(0.f,HeroPulse-dt*3);Shake=FMath::Max(0.f,Shake-dt);
        for(float& pulse:EnemyPulse)pulse=FMath::Max(0.f,pulse-dt*3.5f);
        if(!Menu&&!Help&&!Won&&!Rules.Lost)
        {
            StepClock+=dt;
            if(Route.Num()>0&&StepClock>.15f){Player=Route[0];Route.RemoveAt(0);StepClock=0;HeroPulse=.3f;Arrive();if((Player.X+Player.Y)%2==0)Cue(0,.08f);}
        }
        FVector2D target=Cell(FVector2D(Player));
        if(Motion){HeroVelocity+=(target-Hero)*dt*180;HeroVelocity*=FMath::Exp(-dt*23);Hero+=HeroVelocity*dt;}
        else {Hero=target;HeroVelocity=FVector2D::ZeroVector;}
        for(int i=Pops.Num()-1;i>=0;i--){auto& p=Pops[i];p.Life-=dt;if(Motion){p.P+=p.V*dt;p.V.Y+=dt*75;}if(p.Life<=0)Pops.RemoveAt(i);}
        for(int i=Floats.Num()-1;i>=0;i--){Floats[i].Life-=dt;if(Motion)Floats[i].P.Y-=dt*32;if(Floats[i].Life<=0)Floats.RemoveAt(i);}
        if(Won){WinTime+=dt;if(Motion&&WinTime<4&&FMath::Fmod(WinTime,.3f)<dt)Bubble(FVector2D(FMath::RandRange(220,1060),FMath::RandRange(230,550)),FLinearColor(1,.65,.25),8);}
        if(FParse::Param(FCommandLine::Get(),TEXT("PMBoardQA")))QA(dt);
        if(FParse::Param(FCommandLine::Get(),TEXT("PMMenuQA")))
        {
            QATime+=dt;FString dir;FParse::Value(FCommandLine::Get(),TEXT("PMCaptureDir="),dir);
            if(QATime>2&&!QACaptured){FScreenshotRequest::RequestScreenshot(dir/TEXT("difficulty-menu.png"),true,false);QACaptured=true;}
            if(QATime>4)
            {
                for(int tier=0;tier<3;tier++){Menu=true;Click(FVector2D(250+tier*310,400));check(!Menu&&Layout.Tier==tier);}
                Menu=true;Click(FVector2D(600,650));check(!Menu&&Layout.Tier>=0&&Layout.Tier<=2);
                Start(1,777);Menu=false;Rules.Lost=true;Click(FVector2D(440,600));check(!Menu&&Layout.Seed==777&&!Rules.Lost);
                Won=true;int hp=Rules.Health;Choose(Layout.Goons[0]);check(Rules.Health==hp&&Rules.EnemyHealth[0]==2);
                Click(FVector2D(440,600));check(!Menu&&!Won&&Layout.Seed!=777&&Layout.Tier==1);
                Help=true;int potions=Rules.Red;Click(FVector2D(160,865));check(!Help&&Rules.Red==potions);
                FFileHelper::SaveStringToFile(TEXT("PASS: Easy/Medium/Hard/Surprise choices; retry preserves seed; victory replay changes seed; terminal input blocked; help consumes click without using a potion."),*(dir/TEXT("menu-controls-qa.txt")));
                FPlatformMisc::RequestExit(false);
            }
        }
        Invalidate(EInvalidateWidgetReason::Paint);
    }
private:
    void QA(float dt)
    {
        QATime+=dt;FString dir;FParse::Value(FCommandLine::Get(),TEXT("PMCaptureDir="),dir);
        if(QATime>3&&!QACaptured){FScreenshotRequest::RequestScreenshot(dir/TEXT("cliff-level-start.png"),true,false);QACaptured=true;}
        if(QATime>4&&!QAEnded&&Route.Num()==0&&ActionLock<=0)
        {
            if(QAPhase==0)
            {
                while(QAItem<Layout.ItemCount&&Picked[QAItem])QAItem++;
                if(QAItem<Layout.ItemCount)Click(Cell(FVector2D(Layout.Items[QAItem])));
                else QAPhase=1;
            }
            else if(QAPhase==1)
            {
                if(Rules.Berries>0)Click(FVector2D(600,865));
                else if(Rules.Flowers>0)Click(FVector2D(820,865));
                else {PMFindPlan(Rules,QAPlan);QAPhase=2;}
            }
            else if(QAAction<QAPlan.Num())
            {
                int a=QAPlan[QAAction];
                if(a==1){Click(FVector2D(150,865));QAAction++;}
                else if(a==2){Click(FVector2D(370,865));QAAction++;}
                else {int e=0;while(e<4&&Rules.EnemyHealth[e]<=0)e++;int before=Rules.EnemyHealth[e];Click(Cell(FVector2D(Layout.Goons[e])));if(before!=Rules.EnemyHealth[e])QAAction++;}
            }
            else Click(Cell(FVector2D(14,1)));
            if(Rules.Lost){UE_LOG(LogTemp,Error,TEXT("PM_RANDOM_PLAYTHROUGH_FAILED"));FPlatformMisc::RequestExit(false);}
            if(Won){QAEnded=true;QATime=0;FScreenshotRequest::RequestScreenshot(dir/TEXT("cliff-level-win.png"),true,false);
                FFileHelper::SaveStringToFile(*FString::Printf(TEXT("PASS: %s seed %d; collected ingredients, brewed potions, fought all goons, reached level 3 and won using the live click handlers."),FPMLayout::Label(Layout.Tier),Layout.Seed),*(dir/TEXT("cliff-playthrough.txt")));
                UE_LOG(LogTemp,Display,TEXT("PM_RANDOM_PLAYTHROUGH_PASS"));}
        }
        if(QAEnded&&QATime>3)FPlatformMisc::RequestExit(false);
        if(!QAEnded&&QATime>180){UE_LOG(LogTemp,Error,TEXT("PM_RANDOM_QA_TIMEOUT"));FPlatformMisc::RequestExit(false);}
    }
    virtual int32 OnPaint(const FPaintArgs&,const FGeometry& G,const FSlateRect&,FSlateWindowElementList& Out,int32 L,const FWidgetStyle&,bool)const override
    {
        auto screen=G.GetLocalSize();float scale=FMath::Min(screen.X/1280.f,screen.Y/960.f);FVector2D origin=(screen-FVector2D(1280,960)*scale)*.5f;
        auto geo=[&](FVector2D p,FVector2D z){return G.ToPaintGeometry(z,FSlateLayoutTransform(scale,origin+p*scale));};
        auto rect=[&](FVector2D p,FVector2D z,FLinearColor c,int l=0,bool round=false){FSlateDrawElement::MakeBox(Out,L+l,geo(p,z),round?&Round:FCoreStyle::Get().GetBrush("WhiteBrush"),ESlateDrawEffect::None,c);};
        auto circle=[&](FVector2D p,float r,FLinearColor c,int l=5){FSlateDrawElement::MakeBox(Out,L+l,geo(p-FVector2D(r,r),FVector2D(r*2,r*2)),&Circle,ESlateDrawEffect::None,c);};
        auto text=[&](FString t,FVector2D p,int font,FLinearColor c=FLinearColor::White,int l=7){FSlateDrawElement::MakeText(Out,L+l,geo(p,FVector2D(1120,60)),t,FCoreStyle::GetDefaultFontStyle("Bold",font),ESlateDrawEffect::None,c);};
        auto image=[&](int i,FVector2D p,FVector2D z,int l=3,FLinearColor c=FLinearColor::White){if(Art.IsValidIndex(i))FSlateDrawElement::MakeBox(Out,L+l,geo(p,z),&Art[i],ESlateDrawEffect::None,c);};
        auto button=[&](FVector2D p,FVector2D z,FString label,FLinearColor c,int l=10,int font=17)
        {bool over=Inside(Hover,p.X,p.Y,z.X,z.Y);float n=Motion&&over?2.f:0.f;rect(p-FVector2D(n,n),z+FVector2D(2*n,2*n),over?c*1.25f:c,l,true);rect(p+FVector2D(4,4),FVector2D(z.X-8,2),FLinearColor(1,1,1,.15),l+1);text(label,p+FVector2D(14,13-n),font,FLinearColor::White,l+1);};
        FLinearColor gold(1,.87,.48),cyan(.3,.85,1),pink(1,.3,.48);
        rect(FVector2D(0,0),FVector2D(1280,960),FLinearColor(.022,.055,.09));
        image(15,FVector2D(96,140),FVector2D(1088,680),1);
        for(int i=0;i<8;i++){float x=FMath::Fmod(i*173.f+Time*8,1300.f)-90;rect(FVector2D(x,160+i%4*185),FVector2D(110,2),FLinearColor(.8,.95,1,.08),2);}
        for(int y=1;y<=8;y++)for(int x=1;x<=14;x++)
        {
            FIntPoint q(x,y);if(!FPMLayout::Land(q))continue;FVector2D p(96+x*68,140+y*56);
            rect(p,FVector2D(68,1),FLinearColor(.1,.18,.06,.2),2);rect(p,FVector2D(1,56),FLinearColor(.1,.18,.06,.2),2);
        }
        for(auto q:Layout.Rocks)
        {
            auto p=Cell(FVector2D(q));circle(p+FVector2D(0,7),23,FLinearColor(.05,.06,.04,.22),3);
            circle(p-FVector2D(9,0),16,FLinearColor(.28,.3,.3),3);circle(p+FVector2D(10,-5),18,FLinearColor(.4,.44,.43),3);
            circle(p+FVector2D(6,-11),9,FLinearColor(.52,.57,.52),4);
        }
        for(int y=1;y<10;y++)if(y!=5)for(int n=0;n<3;n++)rect(FVector2D(96+8*68+8+n*16,140+y*56+FMath::Fmod(Time*55+n*19,53.f)),FVector2D(2,7),FLinearColor(.7,.95,1,.18),3);
        FIntPoint hoverCell(FMath::FloorToInt((Hover.X-96)/68),FMath::FloorToInt((Hover.Y-140)/56));
        if(!Menu&&!Help&&!Won&&!Rules.Lost&&Layout.Floor(hoverCell))
        {
            auto p=Cell(FVector2D(hoverCell));rect(p-FVector2D(32,26),FVector2D(64,52),FLinearColor(1,.95,.5,.18+.04*FMath::Sin(Time*5)),3,true);
        }
        for(auto q:Route)circle(Cell(FVector2D(q)),3.2f,gold.CopyWithNewOpacity(.7),3);
        image(1,Cell(FVector2D(3.5,8.7))-FVector2D(30,76),FVector2D(60,90));
        image(2,Cell(FVector2D(1.7,8.7))-FVector2D(30,76),FVector2D(60,90));
        float cauldron=Motion?FMath::Sin(Time*3)*2:0;
        image(11,Cell(FVector2D(3,6))-FVector2D(30,42+cauldron),FVector2D(60,60));
        for(int n=0;n<5;n++){float phase=FMath::Fmod(Time*.6f+n*.2f,1.f);circle(Cell(FVector2D(3,6))+FVector2D(FMath::Sin(Time+n)*12,-35-phase*45),3+(1-phase)*3,FLinearColor(.85,.4,1,(1-phase)*.5f),4);}
        for(int i=0;i<Layout.ItemCount;i++)if(!Picked[i])
        {
            auto p=Cell(FVector2D(Layout.Items[i]));float bob=Motion?FMath::Sin(Time*2.5f+i)*3:0;
            circle(p,21,(i%2==0?pink:cyan).CopyWithNewOpacity(.1f+.04f*FMath::Sin(Time*3)),3);
            image(i%2==0?9:10,p-FVector2D(22,33+bob),FVector2D(44,44));
        }
        for(int i=0;i<4;i++)if(Rules.EnemyHealth[i]>0)
        {
            auto p=Cell(FVector2D(Layout.Goons[i]));float squish=Motion?FMath::Sin(EnemyPulse[i]*PI*3)*EnemyPulse[i]*.13f:0;
            float bob=Motion?FMath::Sin(Time*2+i)*2:0;FVector2D z(88*(1+squish),88*(1-squish));
            circle(p+FVector2D(0,12),24,FLinearColor(0,0,0,.2),3);image(3+i,p-FVector2D(z.X*.5f,z.Y-15+bob),z);
            rect(p+FVector2D(-31,16),FVector2D(62,21),FLinearColor(.04,.08,.05,.9),5,true);
            text(FString::Printf(TEXT("%d | %d HP"),i,Rules.EnemyHealth[i]),p+FVector2D(-27,17),11,gold,6);
        }
        float bounce=Motion?FMath::Sin(HeroPulse*PI*3)*HeroPulse*.15f:0;FVector2D heroSize(68*(1+bounce),102*(1-bounce));
        FVector2D shake=Motion?FVector2D(FMath::Sin(Clock*80)*Shake*7,0):FVector2D::ZeroVector;
        circle(Hero+FVector2D(0,12),20,FLinearColor(0,0,0,.24),3);
        image(0,Hero+shake-FVector2D(heroSize.X*.5f,heroSize.Y-18+(Motion?FMath::Sin(Time*3)*1.3f:0)),heroSize,5);
        if(Rules.Shield>0)for(int n=0;n<Rules.Shield*3;n++){float a=Time*1.6f+n*2*PI/(Rules.Shield*3);circle(Hero+FVector2D(FMath::Cos(a)*34,FMath::Sin(a)*25-25),3.5f,cyan.CopyWithNewOpacity(.8),6);}
        for(int i=0;i<16;i++){float x=170+FMath::Fmod(i*67.f+Time*6,910.f);float y=200+FMath::Fmod(i*47.f-Time*3+2000,410.f);circle(FVector2D(x,y),1.5f,gold.CopyWithNewOpacity(.2),4);}
        if(Rules.CanWin()){auto p=Cell(FVector2D(14,1));circle(p,25+FMath::Sin(Time*3)*3,gold.CopyWithNewOpacity(.2),4);text(TEXT("PICNIC!"),p-FVector2D(26,4),11,gold);}
        for(auto pop:Pops){float t=pop.Life/pop.MaxLife;circle(pop.P,pop.Radius*(.6f+.4f*t),pop.Color.CopyWithNewOpacity(t*.75f),Won?26:8);circle(pop.P-FVector2D(1,1),pop.Radius*.3f,FLinearColor(1,1,1,t*.6f),Won?27:9);}
        for(auto f:Floats)text(f.Text,f.P,18,f.Color.CopyWithNewOpacity(FMath::Min(1.f,f.Life*2)),10);
        text(TEXT("POTION MEADOW"),FVector2D(96,22),31,gold);
        text(FString::Printf(TEXT("CLIFF REGION  /  %s  /  BOARD %d"),FPMLayout::Label(Layout.Tier),Layout.Seed),FVector2D(98,70),12,cyan);
        text(FString::Printf(TEXT("LEVEL %d / 3     HEARTS %d / %d     SHIELD %d"),Rules.Level,Rules.Health,Rules.MaxHealth,Rules.Shield),FVector2D(680,35),17);
        for(int i=0;i<Rules.MaxHealth;i++)circle(FVector2D(955+i*24,83),8,i<Rules.Health?pink:FLinearColor(.13,.18,.22),8);
        text(TEXT("Choose level"),FVector2D(98,106),12,gold);text(TEXT("How to play"),FVector2D(273,106),12,cyan);
        text(Sound?TEXT("Sound: on"):TEXT("Sound: off"),FVector2D(413,106),12,cyan);text(Motion?TEXT("Bubbles: full"):TEXT("Bubbles: gentle"),FVector2D(583,106),12,cyan);
        FString hint=Message;
        int e=Enemy(hoverCell);
        if(!Menu&&!Help&&e>=0)
        {
            int reply=Rules.EnemyHealth[e]<=2?0:(Rules.Shield>0?0:Rules.Damage[e]);
            hint=FString::Printf(TEXT("Goon %d: your tap deals 2. Reply: %d heart%s. %s"),e,reply,reply==1?TEXT(""):TEXT("s"),reply>=Rules.Health?TEXT("Drink a potion first!"):TEXT("Click to approach or challenge."));
        }
        button(FVector2D(90,842),FVector2D(210,60),FString::Printf(TEXT("Heart  x%d"),Rules.Red),FLinearColor(.43,.1,.18));
        button(FVector2D(310,842),FVector2D(210,60),FString::Printf(TEXT("Star  x%d"),Rules.Blue),FLinearColor(.06,.27,.4));
        button(FVector2D(530,842),FVector2D(210,60),FString::Printf(TEXT("Brew  (%d berries)"),Rules.Berries),FLinearColor(.3,.12,.22),10,15);
        button(FVector2D(750,842),FVector2D(210,60),FString::Printf(TEXT("Brew  (%d flowers)"),Rules.Flowers),FLinearColor(.12,.22,.39),10,15);
        button(FVector2D(970,842),FVector2D(210,60),TEXT("New adventure"),FLinearColor(.16,.26,.2),10,15);
        image(7,FVector2D(247,849),FVector2D(40,40),12);image(8,FVector2D(467,849),FVector2D(40,40),12);
        text(hint.Left(125),FVector2D(96,924),12,FLinearColor(1,.92,.76),12);
        if(Menu)
        {
            rect(FVector2D(0,0),FVector2D(1280,960),FLinearColor(.015,.035,.07,.88),20);
            text(TEXT("A LITTLE CLIFFSIDE ADVENTURE"),FVector2D(225,195),30,gold,22);
            text(TEXT("A new board every time. Explore, brew, and reach level 3."),FVector2D(290,258),18,FLinearColor::White,22);
            const TCHAR* subs[]={TEXT("Extra hearts and potions"),TEXT("A little potion planning"),TEXT("Collect, brew, think ahead")};
            for(int i=0;i<3;i++)
            {
                float x=190+i*310;button(FVector2D(x,350),FVector2D(280,230),FPMLayout::Label(i),i==0?FLinearColor(.12,.3,.19):i==1?FLinearColor(.1,.23,.37):FLinearColor(.31,.14,.3),22,27);
                text(subs[i],FVector2D(x+17,423),15,FLinearColor::White,24);
                text(FString::Printf(TEXT("%d picnics won"),Wins[i]),FVector2D(x+17,475),14,gold,24);
                text(TEXT("CLICK TO PLAY"),FVector2D(x+17,530),16,cyan,24);
            }
            button(FVector2D(450,625),FVector2D(380,65),TEXT("Surprise me!"),FLinearColor(.4,.24,.08),22,22);
            button(FVector2D(510,725),FVector2D(260,55),TEXT("How to play"),FLinearColor(.12,.2,.28),22);
            text(TEXT("No timer. Try again anytime. Escape goes back / exits."),FVector2D(335,824),15,cyan,22);
            button(FVector2D(1040,890),FVector2D(150,45),TEXT("Back / exit"),FLinearColor(.18,.23,.28),22,15);
        }
        if((Won||Rules.Lost)&&!Menu)
        {
            rect(FVector2D(0,0),FVector2D(1280,960),FLinearColor(.015,.035,.06,.72),20);
            float enter=Motion?FMath::Sin(FMath::Min(1.f,WinTime+Clock)*PI)*3:0;
            rect(FVector2D(280,290-enter),FVector2D(720,400),FLinearColor(.035,.09,.14,.98),21,true);
            text(Won?TEXT("LEVEL 3! PICNIC TIME!"):TEXT("A LITTLE REST, THEN TRY AGAIN"),FVector2D(320,335),27,gold,23);
            text(Won?TEXT("You explored, brewed and used your potions wisely."):TEXT("You can do this. Heart heals 4; star blocks 3 hits."),FVector2D(320,405),17,FLinearColor::White,23);
            text(FString::Printf(TEXT("%s  |  Board %d  |  %d challenges"),FPMLayout::Label(Layout.Tier),Layout.Seed,Turns),FVector2D(320,463),16,cyan,23);
            button(FVector2D(350,570),FVector2D(270,65),Won?TEXT("Another board!"):TEXT("Try this board again"),FLinearColor(.18,.34,.2),23,17);
            button(FVector2D(660,570),FVector2D(270,65),TEXT("Choose difficulty"),FLinearColor(.16,.24,.37),23,17);
        }
        if(Help)
        {
            rect(FVector2D(0,0),FVector2D(1280,960),FLinearColor(.01,.025,.05,.92),30);
            text(TEXT("ABBIE'S POTION ADVENTURE"),FVector2D(285,210),29,gold,32);
            const TCHAR* lines[]={TEXT("1. Click a square to walk. Everything is already visible."),TEXT("2. Click a goon to approach, then again to challenge it."),TEXT("3. Heart potions heal 4. Star potions block 3 hits."),TEXT("4. Berries and flowers make more potions at the cauldron."),TEXT("5. Reach level 3, cheer pumpkin goon 3, then find the picnic.")};
            for(int i=0;i<5;i++)text(lines[i],FVector2D(265,320+i*65),18,FLinearColor::White,32);
            text(TEXT("No rush! Nothing happens until you choose."),FVector2D(340,700),21,cyan,32);
            text(TEXT("Click anywhere to go back."),FVector2D(445,780),18,gold,32);
        }
        return L+35;
    }
};
