#pragma once
// Turn-based rules shared by the live board and automated balance checks.
struct FPMRules
{
    int Health=6, MaxHealth=6, Red=1, Blue=1, Shield=0, Level=0, Berries=0, Flowers=0;
    int Damage[4]={0,1,2,2};
    int EnemyHealth[4]={2,4,6,8};
    int MaxEnemyHealth[4]={2,4,6,8};
    bool Lost=false;
    void Configure(int tier)
    {
        *this=FPMRules();
        if(tier==0){Health=MaxHealth=8;Red=Blue=1;}
        if(tier==1){EnemyHealth[2]=8;EnemyHealth[3]=10;}
        if(tier==2){EnemyHealth[1]=6;EnemyHealth[2]=10;EnemyHealth[3]=12;Damage[3]=3;}
        for(int i=0;i<4;i++)MaxEnemyHealth[i]=EnemyHealth[i];
    }
    int ExploreFog()
    {
        if(Lost)return 0;
        int before=Health;if(Health<MaxHealth)++Health;
        for(int i=0;i<4;i++)if(EnemyHealth[i]>0&&EnemyHealth[i]<MaxEnemyHealth[i])++EnemyHealth[i];
        return Health-before;
    }
    bool DrinkRed() { if(Red<=0 || Health>=MaxHealth || Lost) return false; --Red; Health=Health+4>MaxHealth?MaxHealth:Health+4; return true; }
    bool DrinkBlue() { if(Blue<=0 || Shield>0 || Lost) return false; --Blue; Shield=3; return true; }
    bool Brew(bool red) { int& ingredient=red?Berries:Flowers; if(ingredient<=0 || Lost) return false; --ingredient; if(red)++Red;else ++Blue; return true; }
    bool Hit(int enemy)
    {
        if(Lost || enemy<0 || enemy>3 || EnemyHealth[enemy]<=0) return false;
        EnemyHealth[enemy]-=2;
        if(EnemyHealth[enemy]<=0) { if(Level<3)++Level; return true; }
        const int damage=Damage[enemy];
        if(Shield>0 && damage>0)--Shield;
        else Health-=damage;
        if(Health<=0) {Health=0;Lost=true;}
        return true;
    }
    bool CanWin() const {return !Lost && Level>=3 && EnemyHealth[3]<=0;}
};
