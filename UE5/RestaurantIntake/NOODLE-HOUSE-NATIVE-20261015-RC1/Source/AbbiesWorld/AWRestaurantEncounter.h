#pragma once
#include "CoreMinimal.h"

// Call only after authoritative movement completion, never on selection/spawn/load.
struct FRTEncounterPlacement
{
    FString Universe,World,Instance;
    FIntPoint Hex;
    int32 Revision=0;
    TArray<FIntPoint> Footprint={FIntPoint(0,0),FIntPoint(1,0),FIntPoint(0,1),FIntPoint(1,1)};
    int32 Rotation=0;
    FIntPoint EntryOffset=FIntPoint(-1,0);
    FIntPoint Rotate(FIntPoint P) const{for(int I=0;I<Rotation;++I)P=FIntPoint(-P.Y,P.X+P.Y);return P;}
    TSet<FIntPoint> Cells() const{TSet<FIntPoint> R;for(auto P:Footprint)R.Add(Hex+Rotate(P));return R;}
    bool Contains(FIntPoint P) const{return Cells().Contains(P);}
};
struct FRTEncounterRequest
{
    FString Universe,World,Player,Move,Instance;
    FIntPoint Hex;
    int32 PlacementRevision=0;
};
class FRTEncounterGate
{
public:
    TSet<FIntPoint> WalkableCells; // authoritative land cells, never mesh bounds
    TMap<FString,FRTEncounterPlacement> Placements;
    TMap<FString,FRTEncounterRequest> Pending;
    TSet<FString> CompletedMoves;
    static FString Key(const FString& U,const FString& W,const FString& P){return FString::Printf(TEXT("%d:%s%d:%s%d:%s"),U.Len(),*U,W.Len(),*W,P.Len(),*P);}
    bool Place(const FRTEncounterPlacement& P)
    {
        if(P.Universe.IsEmpty()||P.World.IsEmpty()||P.Instance.IsEmpty())return false;
        if(P.Rotation<0||P.Rotation>5||P.Footprint.Num()!=4)return false;
        for(auto O:{FIntPoint(0,0),FIntPoint(1,0),FIntPoint(0,1),FIntPoint(1,1)})if(!P.Footprint.Contains(O))return false;
        const FString Id=Key(P.Universe,P.World,P.Instance);if(const auto* Old=Placements.Find(Id))if(P.Revision<=Old->Revision)return false;
        const auto Cells=P.Cells();if(Cells.Num()!=4)return false;
        for(auto C:Cells){if(!WalkableCells.Contains(C))return false;for(const auto& Old:Placements)if(Old.Key!=Id&&Old.Value.Universe==P.Universe&&Old.Value.World==P.World&&(Old.Value.Contains(C)||C==Old.Value.Hex+Old.Value.Rotate(Old.Value.EntryOffset)))return false;}
        const FIntPoint Entry=P.Hex+P.Rotate(P.EntryOffset);if(!WalkableCells.Contains(Entry)||Cells.Contains(Entry))return false;
        bool Adjacent=false;for(auto D:{FIntPoint(1,0),FIntPoint(0,1),FIntPoint(-1,1),FIntPoint(-1,0),FIntPoint(0,-1),FIntPoint(1,-1)})if(Cells.Contains(Entry+D))Adjacent=true;
        if(!Adjacent)return false;
        for(const auto& Old:Placements)if(Old.Key!=Id&&Old.Value.Universe==P.Universe&&Old.Value.World==P.World&&Old.Value.Contains(Entry))return false;
        Placements.Add(Id,P);return true;
    }
    bool Land(const FString& U,const FString& W,const FString& Player,const FString& Move,FIntPoint Hex,FRTEncounterRequest& Out)
    {
        if(U.IsEmpty()||W.IsEmpty()||Player.IsEmpty()||Move.IsEmpty())return false;
        const FString K=Key(U,W,Player),Event=K+TEXT("|")+Move;
        if(CompletedMoves.Contains(Event))return false;CompletedMoves.Add(Event);Pending.Remove(K);
        for(const auto& Entry:Placements){const auto& P=Entry.Value;if(P.Universe==U&&P.World==W&&P.Contains(Hex)){
            Out={U,W,Player,Move,P.Instance,Hex,P.Revision};Pending.Add(K,Out);return true;
        }}return false;
    }
    bool Accept(const FRTEncounterRequest& R)
    {
        const FString K=Key(R.Universe,R.World,R.Player);auto* Q=Pending.Find(K);auto* P=Placements.Find(Key(R.Universe,R.World,R.Instance));
        if(!Q||!P||Q->Move!=R.Move||Q->Instance!=R.Instance||Q->Hex!=R.Hex||Q->PlacementRevision!=R.PlacementRevision||P->Universe!=R.Universe||P->World!=R.World||!P->Contains(R.Hex)||P->Revision!=R.PlacementRevision)return false;
        Pending.Remove(K);return true;
    }
    void Decline(const FRTEncounterRequest& R){const auto K=Key(R.Universe,R.World,R.Player);if(const auto* Q=Pending.Find(K))if(Q->Move==R.Move&&Q->Instance==R.Instance&&Q->PlacementRevision==R.PlacementRevision)Pending.Remove(K);}
};

