// Simulation facts precede discovered biography. Appearance never determines role or character.
export const ROLES = [
 ['delivery','Delivery worker','logistics','cap','satchel','depot','shops','Delivering parcels'],
 ['post','Postal worker','logistics','cap','satchel','post','homes','Delivering letters'],
 ['milk','Milk delivery worker','food','cap','crate','farm','homes','Delivering milk'],
 ['road','Road maintenance worker','civic','cap','tool','works','road','Repairing the road'],
 ['water','Waterworks technician','civic','cap','tool','works','water','Inspecting the water supply'],
 ['sanitation','Sanitation worker','civic','cap','crate','works','homes','Collecting refuse'],
 ['parks','Parks gardener','civic','brim','tool','works','park','Tending the public garden'],
 ['police','Police officer','safety','peaked','badge','station','shops','Walking the neighborhood beat'],
 ['fire','Firefighter','safety','helmet','tool','station','works','Checking fire equipment'],
 ['nurse','Nurse','care','none','apron','clinic','homes','Making a care visit'],
 ['doctor','Doctor','care','none','coat','clinic','clinic','Seeing patients'],
 ['teacher','Teacher','education','none','book','school','school','Teaching a class'],
 ['librarian','Librarian','education','none','book','library','library','Helping readers'],
 ['clerk','Town clerk','civic','none','book','hall','hall','Helping with town records'],
 ['baker','Baker','food','cap','apron','shops','shops','Baking bread'],
 ['grocer','Grocer','food','none','apron','shops','depot','Collecting shop supplies'],
 ['mechanic','Mechanic','industry','cap','tool','works','works','Repairing equipment'],
 ['rail','Railway porter','logistics','peaked','crate','depot','post','Moving station cargo'],
 ['farmer','Farm worker','food','brim','crate','farm','shops','Bringing produce to market'],
 ['carer','Household carer','household','none','bag','homes','park','Accompanying a neighbor'],
 ['resident','Retired resident','household','brim','book','homes','library','Visiting the reading room'],
 ['student','School pupil','education','none','book','homes','school','Going to school'],
 ['dock','Dock worker','industry','cap','crate','depot','shops','Unloading harbor supplies'],
 ['boat','Boat repairer','industry','cap','tool','works','water','Maintaining a workboat'],
 ['cook','Community cook','food','none','apron','hall','hall','Preparing a shared meal'],
 ['musician','Musician','culture','brim','case','homes','hall','Rehearsing for the evening'],
 ['soldier','Service member','military','cap','belt','barracks','training','Practicing a field drill'],
 ['medic','Military medic','military','cap','bag','barracks','clinic','Preparing medical supplies'],
 ['engineer','Military engineer','military','helmet','tool','barracks','works','Maintaining a service crossing'],
 ['signals','Signals operator','military','cap','satchel','barracks','signals','Relaying a scheduled message'],
 ['quartermaster','Quartermaster','military','peaked','book','barracks','depot','Checking supply stores'],
 ['service-driver','Military driver','military','cap','crate','depot','barracks','Delivering service supplies'],
 ['service-cook','Military cook','military','none','apron','barracks','barracks','Preparing the unit meal'],
 ['officer','Duty officer','military','peaked','book','barracks','training','Coordinating the duty roster']
].map(([id,label,sector,hat,accessory,work,target,task])=>({id,label,sector,hat,accessory,work,target,task}));
export const SOCIETIES = {
 alder: {id:'alder',name:'Alder Vale',subtitle:'An inland town of farms, workshops and public services',color:'#677c62',institution:'town council',tradition:'a weekly repair-and-share evening',extra:['farmer','milk','road','parks']},
 harbor: {id:'harbor',name:'Bracken Harbor',subtitle:'A coastal town of deliveries, boatyards and shared civic life',color:'#537c8c',institution:'harbor council',tradition:'a community supper after the weekly market',extra:['dock','boat','delivery','cook']}
};
export const PLACES = {
 homes:{name:'Neighborhood homes',x:-22,z:16}, farm:{name:'Meadowlands road',x:-30,z:-16},
 shops:{name:'Market street',x:-11,z:-16}, depot:{name:'Delivery depot',x:12,z:-16},
 post:{name:'Post office',x:25,z:-16}, works:{name:'Public works',x:28,z:15},
 station:{name:'Police & fire station',x:16,z:16}, clinic:{name:'Clinic',x:3,z:16},
 school:{name:'School',x:-10,z:16}, library:{name:'Library',x:-23,z:-16},
 hall:{name:'Town hall',x:0,z:-16}, park:{name:'Public garden',x:0,z:0},
 road:{name:'Road repair',x:24,z:0},water:{name:'Waterworks',x:34,z:-2},
 barracks:{name:'Service quarters',x:-18,z:38},training:{name:'Training ground',x:0,z:38},signals:{name:'Signals office',x:18,z:38}
};
export function hash(s){let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
const pick=(values,key)=>values[hash(key)%values.length];
export function population(seed,societyId,military=false){
 const society=SOCIETIES[societyId];if(!society)throw Error('Unknown society');
 const roles=ROLES.filter(r=>military?r.sector==='military':r.sector!=='military'&&!['dock','boat'].includes(r.id));
 if(!military)roles.push(...society.extra.map(id=>ROLES.find(r=>r.id===id)));
 return roles.map((role,i)=>{const id=`${societyId}-${military?'service':'civil'}-${i}`,key=`${seed}:${id}`;
 return {id,world:String(seed),society:societyId,role:role.id,household:`${societyId}-home-${Math.floor(i/3)}`,home:'homes',
  age:role.id==='student'?12:role.id==='resident'?68:23+hash(key+'age')%37,
  appearance:{skin:pick(['#e2ba98','#bc8969','#8e6148','#654434','#d4a380'],key+'skin'),hair:pick(['#332d28','#70543d','#a68353','#adaba0'],key+'hair'),
  height:role.id==='student'?1.3:1.63+(hash(key+'height')%22)/100,build:.9+(hash(key+'build')%20)/100,hairStyle:hash(key+'style')%3},
  wardrobe:{top:role.sector==='military'?'#697359':role.id==='police'?'#364d65':role.sector==='care'?'#e2ddd0':pick(['#7d8b75','#89756a','#697f89','#9d8666'],key+'top'),bottom:role.sector==='military'?'#58604b':'#535d60',hat:role.hat,accessory:role.accessory},index:i};});
}
export function roleOf(person){return ROLES.find(r=>r.id===person.role);}
// Routes remain on a shared street network; replay is deterministic and has no frame-rate dependence.
export function route(a,b){return [[a.x,a.z],[a.x,6],[b.x,6],[b.x,b.z]];}
function onRoute(points,f){const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let d=f*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]){const t=lengths[i]?d/lengths[i]:0;return [points[i][0]+(points[i+1][0]-points[i][0])*t,points[i][1]+(points[i+1][1]-points[i][1])*t];}d-=lengths[i];}return points.at(-1);}
export function stateAt(person,seconds){
 const role=roleOf(person),minute=480+Math.max(0,seconds),day=Math.floor(minute/1440),dayMinute=minute%1440,h=dayMinute/60;
 const origin=PLACES[role.work],target=PLACES[role.target],home=PLACES[role.sector==='military'?'barracks':person.home],offset=(person.index%5)*.65;
 const elapsed=Math.max(0,Math.min(540,dayMinute-480));
 const completed=day*6+Math.min(6,Math.floor((elapsed+25)/90));
 let p,activity,location,animationPhase;
 if(h<7||h>=18){animationPhase='home';p=[home.x,home.z];activity='Off duty · at home';location=home.name;}
 else if(h<8){animationPhase='travel';p=onRoute(route(home,origin),h-7);activity='Heading to '+origin.name;location=origin.name;}
 else if(h>=17){animationPhase='travel';p=onRoute(route(origin,home),h-17);activity='Heading home';location=home.name;}
 else {
  const phase=elapsed%90;
  if(phase<15){animationPhase='prepare';p=[origin.x,origin.z];activity=['household','culture'].includes(role.sector)||role.id==='student'?'Preparing for the day':'Preparing for work';location=origin.name;}
  else if(phase<40){animationPhase='travel';p=onRoute(route(origin,target),(phase-15)/25);activity=role.task;location=`${origin.name} → ${target.name}`;}
  else if(phase<65){animationPhase='work';p=[target.x,target.z];activity=role.task;location=target.name;}
  else {animationPhase='travel';p=onRoute(route(target,origin),(phase-65)/25);activity='Returning to '+origin.name;location=origin.name;}
 }
 return {position:[p[0]+offset,p[1]+(person.index%3)*.48],activity,location,completed,phase:animationPhase};
}
// A replayable public-service ledger: completion counters are derived from the clock,
// never from render ticks or discovery. An economy can consume these recorded outputs.
export function serviceLedger(people,seconds){
 return people.filter(p=>!['household','culture'].includes(roleOf(p).sector)&&p.role!=='student').map(p=>({
  person:p.id,role:p.role,recipient:roleOf(p).target,service:roleOf(p).task,completed:stateAt(p,seconds).completed
 }));
}
const firstNames=['Robin','Alex','Morgan','Jamie','Evelyn','Francis','Ruth','Sam','Clara','Lee','Marion','Ellis','Dorothy','Jesse','Arthur','Ada'];
const surnames=['Bell','Reed','Ellis','Ward','Hayes','Lane','Wells','Brooks','Green','Bennett','Gray','Morgan','Hill','Parker','Cole','Shaw'];
export function inventIdentity(person){const key=`${person.world}:${person.id}`,role=roleOf(person),society=SOCIETIES[person.society];
 return {version:1,id:person.id,world:person.world,role:person.role,society:person.society,household:person.household,
 name:`${pick(firstNames,key+'first')} ${pick(surnames,person.world+person.household)}`,age:person.age,
 disposition:pick(['patient and observant','warm and practical','quietly humorous','curious and methodical','reserved and dependable','outgoing and thoughtful'],key+'temperament'),
 interest:pick(['sketching local buildings','growing kitchen herbs','listening to radio plays','repairing old bicycles','singing with neighbors','reading adventure stories','keeping a garden notebook','playing board games'],key+'interest'),
 aspiration:person.age<18?'Learn a new skill with friends':pick(['Organize a neighborhood picnic','Make more time for an evening class','Help a neighbor finish a home project','Save for a visit to a distant friend'],key+'wish'),
 biography:`A resident of ${society.name}, ${person.age<18?"attending the local school":person.role==='resident'?"enjoying retirement":'working as '+role.label.toLowerCase()}. Their week includes ${society.tradition}.`,
 facts:{workplace:role.work,home:person.home},generator:'local-role-aware-v1'};
}
export function canonKey(person){return `society-canon:v1:${person.world}:${person.id}`;}
export class CanonStore {
 constructor(storage){this.storage=storage;this.memory=new Map();this.pending=new Map();this.warning='';}
 get(person){const key=canonKey(person);if(this.memory.has(key))return this.memory.get(key);try{const raw=this.storage?.getItem(key);if(raw){const record=JSON.parse(raw);if(record.version===1&&record.id===person.id&&record.world===person.world&&record.role===person.role&&record.society===person.society&&typeof record.name==='string'){this.memory.set(key,record);return record;}}}catch{this.warning='Saved identities could not be read. This visit uses session memory.';}return null;}
 discover(person){const existing=this.get(person);if(existing)return Promise.resolve(existing);const key=canonKey(person);if(this.pending.has(key))return this.pending.get(key);
 const task=Promise.resolve().then(()=>{const record=inventIdentity(person);this.memory.set(key,record);try{if(!this.storage)throw Error('No storage');this.storage.setItem(key,JSON.stringify(record));}catch{this.warning='Identity saved for this visit only; browser storage is unavailable.';}return record;}).finally(()=>this.pending.delete(key));this.pending.set(key,task);return task;
 }
}
