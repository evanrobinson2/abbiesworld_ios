// Canonical scene semantics. Terrain's own provider schema stays in terrain-presets.js.
export const SEMANTICS_VERSION='1.0.0';
export const SCENE_FAMILIES={
 'garden-farm':{purpose:'Feed ranch households and supply market surplus',activities:['plant','water','tend','harvest','save-seed','store','compost'],inputs:['seed','water','compost','tools','labor'],outputs:['household-food','market-surplus','saved-seed','plant-residue'],dependencies:['households','water-supply','market','tool-workshop']},
 'working-woodland':{purpose:'Supply timber, handles, fiber and fuel',activities:['cut','haul','split','season','make-charcoal','regrow'],inputs:['tools','labor'],outputs:['timber','fiber','fuel'],dependencies:['workshops','households']},
 'river-wetland':{purpose:'Provide water, fish, reeds and crossings',activities:['gather','fish','process','load','ferry','transport'],inputs:['tools','boats','labor'],outputs:['water','fish','reeds','transport'],dependencies:['settlements','boat-workshop']},
 'upland-pasture':{purpose:'Sustain herds and animal products',activities:['graze','water','shelter','care','milk','shear','move-seasonally'],inputs:['animals','water','care','winter-feed'],outputs:['milk','fiber','manure'],dependencies:['ranch','market','seasonal-grazing']},
 'rocky-foothills':{purpose:'Supply clay, stone and ore',activities:['extract','sort','haul','process'],inputs:['tools','fuel','labor'],outputs:['clay','stone','ore','residue'],dependencies:['workshops','fuel-supply']},
 'coast-estuary':{purpose:'Support salt, preservation, boats and wider trade',activities:['gather','preserve','load','navigate','trade'],inputs:['inland-goods','boats','labor'],outputs:['salt','preserved-food','imports'],dependencies:['inland-producers','ports','boat-workshop']}
};
export const GARDEN_CONTRACT={
 schema:'ranch-atelier/scene-semantics',schemaVersion:SEMANTICS_VERSION,id:'garden-farm',...SCENE_FAMILIES['garden-farm'],
 roles:['gardener','household-collector','market-carrier'],
 quantities:{yield:null,householdsFed:null,waterDemand:null,storageCapacity:null,seasonLength:null,compostDuration:null},
 undecided:['crop species and yields','water source reliability','soil suitability','labor capacity','seasonal timing'],
 interfaces:[{id:'arrival',traffic:['pedestrian','cart'],purpose:'Bring supplies and collect household food or market surplus'}],
 rules:{units:'metres',maxBuildingGrade:.12,maxBedGrade:.10,maxWalkingGrade:.18,maxCartGrade:.12,bankBuffer:5,cartWidth:3,walkingWidth:1.2,bedAccessWidth:.9,ruleStatus:'Authored prototype design parameters; not engineering or agricultural standards'},
 processes:[
  {id:'plant',from:'seed-store',to:'beds',input:'seed',output:'planted-bed'},
  {id:'water',from:'water-point',to:'beds',input:'water',output:'watered-bed'},
  {id:'tend',from:'tool-store',to:'beds',input:'labor',output:'tended-bed'},
  {id:'harvest',from:'beds',to:'packing',input:'mature-crop',output:'harvest'},
  {id:'save-seed',from:'packing',to:'seed-store',input:'selected-seed',output:'saved-seed'},
  {id:'store',from:'packing',to:'produce-store',input:'harvest',output:'stored-food'},
  {id:'dispatch',from:'produce-store',to:'arrival',input:'stored-food',output:'household-food-or-market-surplus'},
  {id:'compost',from:'beds',to:'compost',input:'plant-residue',output:'compost'},
  {id:'amend',from:'compost',to:'beds',input:'compost',output:'amended-bed'}
 ],
 failures:[{id:'water-unavailable',affects:'water',recovery:'Restore supply or change planting plan',implemented:false},{id:'blocked-access',affects:'movement',recovery:'Re-route or reject layout',implemented:true},{id:'unsuitable-ground',affects:'placement',recovery:'Find suitable ground or reject terrain',implemented:true},{id:'crop-loss',affects:'harvest',recovery:'Replant or seek external food',implemented:false}],
 simulation:{implemented:['geometric access validation','terrain suitability checks','semantic process graph'],intended:['resource transfers','plant growth','harvest','seed saving','composting','seasonal scheduling'],preview:'Route highlighting explains intended work; it does not simulate production'},
 sources:['https://www.extension.umd.edu/resource/planning-vegetable-garden','https://www.extension.umd.edu/resource/growing-vegetables-raised-beds'],
 construction:'Compose functional area in continuous metres, validate essential footprints, then clip terrain and optional dressing to the presentation hex.'
};
export function describeGarden({beds,layout,terrain,connections}){return `A ${layout} garden farm on ${terrain}, with ${beds} growing plots linked to water, tools, seed keeping, packing, produce storage and compost; ${connections} arrival route serves household collection and market dispatch; its boundary connection awaits a neighboring scene.`;}
