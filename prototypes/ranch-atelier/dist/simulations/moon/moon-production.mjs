// Authored game units per simulated second, not engineering yield estimates.
export const CAPACITY={ice:24,water:32,food:24,energy:400};
export function createProduction(){return {version:1,remainder:0,reactorOnline:true,stock:{ice:4,water:18,food:12,energy:200},initial:{ice:4,water:18,food:12,energy:200},mined:0,melted:0,grown:0,cropWater:0,usedWater:0,usedFood:0,generated:0,spent:0,curtailed:0,support:{water:0,food:0},shortfall:{water:0,food:0},cropProgress:0,harvests:0,active:{},power:0};}
export function advanceProduction(p,dt,population=7){
 if(!Number.isFinite(dt)||dt<0||dt>60||!Number.isInteger(population)||population<0)throw new RangeError('Invalid production step');
 p.remainder+=dt;
 while(p.remainder+1e-10>=.25){p.remainder=Math.max(0,p.remainder-.25);if(p.remainder<1e-10)p.remainder=0;const t=.25,s=p.stock;p.active={};p.power=p.reactorOnline?80:0;
 const generated=p.power*t;p.generated+=generated;const accepted=Math.min(generated,CAPACITY.energy-s.energy);s.energy+=accepted;p.curtailed+=generated-accepted;
 const spend=(key,rate)=>{const amount=rate*t;if(s.energy+1e-9<amount)return false;s.energy=Math.max(0,s.energy-amount);p.spent+=amount;p.active[key]=true;return true;};
 const habitatPowered=spend('habitat',18);
 const waterDemand=population*.002*t,foodDemand=population*.003*t,water=Math.min(s.water,waterDemand),food=Math.min(s.food,foodDemand);s.water-=water;s.food-=food;p.usedWater+=water;p.usedFood+=food;p.shortfall.water+=waterDemand-water;p.shortfall.food+=foodDemand-food;
 if(!habitatPowered)continue;
 if(s.ice<CAPACITY.ice&&spend('excavator',16)){const q=Math.min(.08*t,CAPACITY.ice-s.ice);s.ice+=q;p.mined+=q;}
 if(s.ice>0&&s.water<CAPACITY.water&&spend('processor',14)){const q=Math.min(.06*t,s.ice,CAPACITY.water-s.water);s.ice-=q;s.water+=q;p.melted+=q;}
 if(s.food<CAPACITY.food&&s.water>0&&spend('greenhouse',20)){const q=Math.min(.025*t,CAPACITY.food-s.food,s.water*2);s.water-=q*.5;p.cropWater+=q*.5;p.cropProgress+=q;
 // A half-unit batch is visibly harvested; unharvested growth remains on the beds.
 if(p.cropProgress>=.5){const harvest=Math.min(.5,CAPACITY.food-s.food);s.food+=harvest;p.grown+=harvest;p.cropProgress-=harvest;p.harvests++;}}
 }
}
export function resupplyProduction(p){for(const key of ['water','food']){const q=Math.max(0,(key==='water'?18:12)-p.stock[key]);p.stock[key]+=q;p.support[key]+=q;}}
export function productionBalance(p){return {ice:p.initial.ice+p.mined-p.melted-p.stock.ice,water:p.initial.water+p.melted+p.support.water-p.cropWater-p.usedWater-p.stock.water,food:p.initial.food+p.grown+p.support.food-p.usedFood-p.stock.food,energy:p.initial.energy+p.generated-p.spent-p.curtailed-p.stock.energy};}
