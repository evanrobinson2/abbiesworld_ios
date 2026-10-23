// Pointer distance is screen-space: thresholds remain consistent while zooming.
export function pullSample(dx,up,ms){
 const pulling=up>12&&up>Math.abs(dx)*1.65,progress=pulling?Math.min(1,up/110):0;
 return {pulling,ready:pulling&&up>=110&&ms>=180,lift:4*(1-Math.exp(-up/95)),stretch:pulling?.10*Math.sin(progress*Math.PI):0,wiggle:pulling?Math.sin(up*.13)*.035*(1-progress):0};
}
export function dashboardData(card,instance,town){
 if(town){const households=town.households,pop=households.reduce((n,h)=>n+h.adults+h.children,0),children=households.reduce((n,h)=>n+h.children,0),care=town.services.care,school=town.services.education;
 return {live:true,metrics:[{label:'People',value:pop},{label:'Homes',value:households.length},{label:'Food',value:households.reduce((n,h)=>n+h.food,0)},{label:'Care',value:care?`${care.local+care.outside}/${care.demand}`:'—',ratio:care?Math.min(1,(care.local+care.outside)/Math.max(1,care.demand)):0},{label:'School',value:school?`${school.local+school.outside}/${children}`:'—',ratio:school?Math.min(1,(school.local+school.outside)/Math.max(1,children)):0},{label:'Cases',value:(town.cases||[]).filter(c=>!['closed','recovered'].includes(c.status)).length}],bars:Object.entries(town.market).map(([k,v])=>[({grain:'Grain',timber:'Timber',bread:'Bread',crafts:'Crafts'})[k],v])};}
 // Do not invent a live simulation for a composition-only archetype.
 const spatial=instance?.microcosm||card.recipe?.microcosm;if(spatial)return {live:true,kind:'Path activity',metrics:[{label:'Walked metres',value:Math.floor(spatial.metres)},{label:'Visits',value:spatial.trips},{label:'Seconds',value:Math.floor(spatial.seconds)},{label:'Hexes',value:card.recipe.tiles.length}]};
 const caps=card.capabilities||{},metrics=[{label:'Hexes',value:card.recipe?.tiles?.length||card.recipe?.types?.length||1}];
 for(const [key,label]of [['population','People'],['food','Food'],['farming','Farming'],['storage','Storage'],['pottery','Pottery'],['woodland','Woodland']])if(typeof caps[key]==='number')metrics.push({label,value:caps[key]});
 metrics.push({label:'Facing',value:`${(instance.rotation||0)*60}°`});return {live:false,metrics:metrics.slice(0,6)};
}
