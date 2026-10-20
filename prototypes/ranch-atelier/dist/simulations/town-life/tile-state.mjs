import {townLayout,layoutSites} from './layouts.mjs';
import {createTown,advanceHour} from './economy.mjs';
export function townForPreset(preset,seed=41,stage=3){return {...createTown(townLayout(preset,seed,stage).homes.length),layoutVersion:2,layoutSeed:seed,growthStage:stage};}
export function townState(card,instance){return instance?.townLife||card.recipe.townLife||townForPreset(card.recipe.preset);}
export function stepTownInstance(board,id){const instance=board.instances.find(i=>i.instanceId===id);if(!instance)throw Error('Select a Town tile');const card=board.cards[instance.cardId+'@'+instance.cardRevision];if(card?.type!=='town')throw Error('Select a Town tile');return {...board,revision:board.revision+1,instances:board.instances.map(i=>i===instance?{...i,townLife:advanceHour(townState(card,i))}:i)};}
export const townSites=layoutSites;

export function legacyTownSites(preset){const rows=preset==='market'?[-21,-7,7,21]:[-20,0,20],x=preset==='market'?10:14,sites={market:[0,14],park:[0,0],school:[0,-14],teacher:[0,-14],nurse:[0,-7],jail:[0,7],farmer:[0,32],woodland:[0,-30],baker:[0,-14],craft:[0,14],merchant:[0,14],road:[0,25],water:[0,-20],sanitation:[0,20],police:[0,7],delivery:[0,28]};let i=0;for(const side of [-1,1])for(const z of rows)sites['home'+i++]=[side*(x-4),z];return sites;}
