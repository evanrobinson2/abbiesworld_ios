#pragma once
#include "CoreMinimal.h"
#include "PMRules.h"

struct FPMLayout
{
    int Tier=0,Seed=1,ItemCount=6;
    TSet<FIntPoint> Rocks;
    FIntPoint Goons[4];
    FIntPoint Items[6];
    static bool Land(FIntPoint p){return p.X>=1&&p.X<=14&&p.Y>=1&&p.Y<=8&&(p.X!=8||p.Y==5);}
    bool Floor(FIntPoint p)const{return Land(p)&&!Rocks.Contains(p);}
    static const TCHAR* Label(int t){return t==0?TEXT("EASY"):t==1?TEXT("MEDIUM"):TEXT("HARD");}
    TSet<FIntPoint> Reach(bool enemies=true)const
    {
        TSet<FIntPoint> seen;TArray<FIntPoint> queue;FIntPoint start(2,7);seen.Add(start);queue.Add(start);
        FIntPoint ds[]={FIntPoint(1,0),FIntPoint(-1,0),FIntPoint(0,1),FIntPoint(0,-1)};
        for(int n=0;n<queue.Num();n++)for(auto d:ds)
        {
            auto v=queue[n]+d;bool occupied=false;if(enemies)for(auto g:Goons)if(g==v)occupied=true;
            if(Floor(v)&&!occupied&&!seen.Contains(v)){seen.Add(v);queue.Add(v);}
        }
        return seen;
    }
    bool Valid()const
    {
        auto reachable=Reach();
        if(!reachable.Contains(FIntPoint(14,1))||!reachable.Contains(FIntPoint(3,6)))return false;
        for(int i=0;i<ItemCount;i++)if(!reachable.Contains(Items[i]))return false;
        FIntPoint ds[]={FIntPoint(1,0),FIntPoint(-1,0),FIntPoint(0,1),FIntPoint(0,-1)};
        for(auto g:Goons){bool adjacent=false;for(auto d:ds)if(reachable.Contains(g+d))adjacent=true;if(!adjacent)return false;}
        int count=0;for(int y=1;y<=8;y++)for(int x=1;x<=14;x++){FIntPoint q(x,y);bool goon=false;for(auto g:Goons)if(g==q)goon=true;if(Floor(q)&&!goon)count++;}
        return reachable.Num()==count;
    }
    void Generate(int tier,int seed)
    {
        Tier=FMath::Clamp(tier,0,2);Seed=seed;ItemCount=Tier==0?6:4;
        FRandomStream rng(seed);
        for(int attempt=0;attempt<500;attempt++)
        {
            Rocks.Empty();TSet<FIntPoint> used;
            const FIntPoint reserved[]={FIntPoint(2,7),FIntPoint(2,8),FIntPoint(3,8),FIntPoint(3,6),FIntPoint(14,1),FIntPoint(7,5),FIntPoint(8,5),FIntPoint(9,5)};
            for(auto q:reserved)used.Add(q);
            auto cell=[&](bool left)
            {
                FIntPoint p;do{p=FIntPoint(rng.RandRange(left?2:10,left?6:13),rng.RandRange(2,7));}while(used.Contains(p));used.Add(p);return p;
            };
            for(int i=0;i<4;i++)Goons[i]=cell(i<2);
            for(int i=0;i<ItemCount;i++)Items[i]=cell(i<ItemCount/2);
            for(int n=0;n<(Tier==0?3:Tier==1?9:15);n++)Rocks.Add(cell(n%2==0));
            if(Valid())return;
        }
        // Unobstructed fallback retains the generated, unique placements.
        Rocks.Empty();check(Valid());
    }
};

// Find a potion/attack plan. Ingredients are reachable before combat and may be brewed first.
inline bool PMFindPlan(FPMRules state,TArray<int>& out)
{
    TSet<FString> visited;
    TFunction<bool(FPMRules,TArray<int>&)> search;
    search=[&](FPMRules s,TArray<int>& path)->bool
    {
        if(s.Lost)return false;if(s.CanWin())return true;
        int e=0;while(e<4&&s.EnemyHealth[e]<=0)e++;
        FString key=FString::Printf(TEXT("%d,%d,%d,%d,%d,%d"),e,s.Health,s.Red,s.Blue,s.Shield,e<4?s.EnemyHealth[e]:0);
        if(visited.Contains(key))return false;visited.Add(key);
        // Heal only once damaged; shield before dangerous replies, then commit an attack.
        for(int action:{1,2,0})
        {
            auto n=s;bool ok=action==1?n.DrinkRed():action==2?n.DrinkBlue():n.Hit(e);
            if(!ok)continue;path.Add(action);if(search(n,path))return true;path.Pop();
        }
        return false;
    };
    return search(state,out);
}

inline bool PMValidateRandomBoards(FString& report)
{
    int checked=0;TSet<FString> layouts;
    for(int tier=0;tier<3;tier++)
    {
        FPMRules reckless;reckless.Configure(tier);
        for(int e=0;e<4&&!reckless.Lost;e++)while(reckless.EnemyHealth[e]>0&&!reckless.Lost)reckless.Hit(e);
        if(!reckless.Lost)return false;
        FPMRules supplies;supplies.Configure(tier);int red=supplies.Red;
        if(supplies.DrinkRed()||supplies.Red!=red||supplies.Brew(true))return false;
        if(!supplies.DrinkBlue()||supplies.DrinkBlue())return false;
    }
    for(int tier=0;tier<3;tier++)for(int seed=1;seed<=1000;seed++)
    {
        FPMLayout a,b;a.Generate(tier,seed);b.Generate(tier,seed);
        if(!a.Valid()||a.Rocks.Num()!=b.Rocks.Num())return false;
        for(auto rock:a.Rocks)if(!b.Rocks.Contains(rock))return false;
        for(int i=0;i<a.ItemCount;i++)if(a.Items[i]!=b.Items[i])return false;
        FString signature;for(int i=0;i<4;i++){if(a.Goons[i]!=b.Goons[i])return false;signature+=a.Goons[i].ToString();}
        layouts.Add(signature);
        FPMRules s;s.Configure(tier);s.Red+=a.ItemCount/2;s.Blue+=a.ItemCount/2;
        TArray<int> plan;if(!PMFindPlan(s,plan))return false;
        for(int action:plan){int e=0;while(e<4&&s.EnemyHealth[e]<=0)e++;if(action==1)s.DrinkRed();else if(action==2)s.DrinkBlue();else s.Hit(e);}
        if(!s.CanWin())return false;checked++;
    }
    report=FString::Printf(TEXT("PASS: %d boards across Easy/Medium/Hard; %d distinct encounter layouts; connected traversable regions; reachable ingredients, cauldron and goal; deterministic seeds; replayed winning potion plans."),checked,layouts.Num());
    return layouts.Num()>900;
}
