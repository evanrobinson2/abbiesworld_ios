import {composeGarden,findRoute,GARDEN_LAYOUTS} from './garden-farm.js';

export const GARDEN_V2={label:'Garden',name:'Working garden',presets:GARDEN_LAYOUTS,purpose:'Feed households and organize growing, tending and harvest.',capabilities:{},simulation:'planned',uses:['gardeners'],inputs:['seed','water','labor'],outputs:['food (planned)']};
// Tile previews use a level working surface. Placement is separately graded and
// verified on the Board's rendered height field; this does not certify a site.
export const levelGardenTerrain={height:()=>0,sample:()=>({height:0,grade:0,bank:Infinity}),datum:0,provider:{kind:'level-working-surface',placementVerification:'required'}};
export function gardenCardRecipe(preset,seed,dimensions,{beds=8,terrain=levelGardenTerrain}={}){
 const plan=composeGarden({layout:preset,seed,beds,terrain:'working-surface'},dimensions,terrain);
 return {generator:'garden-composer',version:2,type:'garden',preset,seed,beds,gardenPlan:plan,requirements:[],landscape:{height:0,vegetation:0,props:0,seed},tiles:[{id:'garden',type:'garden',cell:0,rotation:0,seed}]};
}
const rotate=(p,angle)=>({x:p.x*Math.cos(angle)+p.z*Math.sin(angle),z:-p.x*Math.sin(angle)+p.z*Math.cos(angle)});
export function applyGardenPlan(plan,recipe){
 if(recipe.generator!=='garden-composer'||recipe.version!==2)return plan;
 const source=recipe.gardenPlan;
 if(!source?.items?.length||!source.routes?.length)throw Error('Garden card has no frozen composition');
 const angle=(plan.rotation||0)*Math.PI/3,point=p=>rotate(p,angle);
 plan.gardenSource=structuredClone(source);plan.hub=point(source.hub);
 plan.placements=source.items.map(o=>({...o,...point(o),id:plan.id+':'+o.id,model:null,gardenItem:structuredClone(o),angle,radius:Math.hypot(o.w,o.d)/2,door:point(o.interaction),approach:point(o.interaction)}));
 plan.paths=source.routes.map(r=>({...r,kind:r.surface==='threshold'?'garden-threshold':'garden-aisle',points:r.points.map(point)}));
 // Neighbour paths connect to the preserved working network, not a regenerated
 // interior. Routing is geometric here; the Board verifies the graded surface.
 for(const port of plan.ports){const local=rotate(port,-angle),length=Math.hypot(local.x,local.z),inside={x:local.x*(1-3/length),z:local.z*(1-3/length)},route=findRoute(source.hub,inside,source.items,levelGardenTerrain,1.4,.25);
  if(!route){plan.warnings.push('No clear garden approach to neighbor');continue;}
  plan.paths.push({kind:'connector',width:1.4,points:[...route.map(point),{x:port.x,z:port.z}]});
 }
 return plan;
}
export function applyGardenAssembly(assembly,recipeForPlan){for(const p of assembly.plans)applyGardenPlan(p,recipeForPlan(p));assembly.warnings=assembly.plans.flatMap(p=>(p.warnings||[]).map(w=>p.id+': '+w));return assembly;}
