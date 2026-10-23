import {familyInterests} from './simulation/life-learning.mjs';
import {schedule} from './ranch-rhythm.mjs';
// Compressed fictional calendar. Appearance is inherited; identity and ability are not.
import {population,hash,inventIdentity} from './town-life/people/core.mjs';
export const DAYS_PER_YEAR=20;
const genders=['woman','man','nonbinary'];
const roll=(key)=>hash(key)/4294967296;
export const ageAt=(p,year)=>Math.max(0,year-p.born);
export function canMarry(a,b,year){return a.id!==b.id&&a.species==='human'&&b.species==='human'&&a.alive&&b.alive&&!a.spouse&&!b.spouse&&ageAt(a,year)>=18&&ageAt(b,year)>=18;}
export function createGenerations(seed,people,homes,day=1){return {seed,originDay:day,year:0,next:people.length,events:[],people:people.map((p,i)=>({...structuredClone(p),interests:familyInterests([],p.id+seed),species:'human',gender:genders[hash(p.id+seed)%3],born:-p.age,alive:true,generation:1,parents:[],homeIndex:Math.floor(i/2)%Math.max(1,homes),children:[],spouse:null,deathAge:78+hash(p.id+seed)%19,occupation:i%3===2?'town':'ranch'}))};}
const name=p=>inventIdentity(p).name;
function event(s,text){s.events.unshift({year:s.year,text});s.events.length=Math.min(s.events.length,60);}
function newcomer(s,homeIndex,age=24){const n=s.next++,p=structuredClone(population(s.seed+n*7919,'alder')[n%20]);p.id='generation-'+n;p.index=n;p.world=String(s.seed);for(let k=0;k<100&&s.people.some(q=>name(q)===name(p));k++)p.world=s.seed+':newcomer:'+n+':'+k;Object.assign(p,{species:'human',gender:genders[hash(p.id+s.seed)%3],born:s.year-age,age,alive:true,generation:1,parents:[],children:[],spouse:null,homeIndex,deathAge:78+hash(p.id)%19,occupation:n%3===2?'town':'ranch'});s.people.push(p);return p;}
export function advanceGenerations(s,day,{daysPerYear=DAYS_PER_YEAR,capacity=32,year}={}){const target=Math.floor(year??Math.max(0,day-s.originDay)/daysPerYear);while(s.year<target){s.year++;
 for(const p of s.people.filter(p=>p.alive)){p.age=ageAt(p,s.year);if(p.age>=p.deathAge&&p.storyProtected)p.deathAge=p.age+1;
  if(p.age>=p.deathAge){p.alive=false;if(p.spouse){const partner=s.people.find(q=>q.id===p.spouse);if(partner)partner.spouse=null;}event(s,`${name(p)} died at ${p.age}.`);}}
 for(const p of [...s.people].filter(p=>p.alive&&!p.spouse&&p.age>=22&&p.age<65)){if(s.people.filter(p=>p.alive).length>=capacity||roll(s.seed+p.id+s.year+'marry')>.32)continue;const partner=newcomer(s,p.homeIndex,22+hash(p.id+s.year)%20);if(canMarry(p,partner,s.year)){p.spouse=partner.id;partner.spouse=p.id;event(s,`${name(p)} married ${name(partner)}, a newcomer.`);}}
 for(const p of [...s.people].filter(p=>p.alive&&p.spouse&&p.age>=22&&p.age<48&&p.children.length<2)){const partner=s.people.find(q=>q.id===p.spouse);if(!partner?.alive||p.id>partner.id||partner.age<18||s.people.filter(p=>p.alive).length>=capacity||roll(s.seed+p.id+s.year+'child')>.25)continue;
 const child=newcomer(s,p.homeIndex,0);child.interests=familyInterests([p,partner],child.id+s.seed);child.parents=[p.id,partner.id];child.generation=Math.max(p.generation,partner.generation)+1;child.appearance={...child.appearance,skin:roll(child.id+'skin')<.5?p.appearance.skin:partner.appearance.skin,hair:roll(child.id+'hair')<.5?p.appearance.hair:partner.appearance.hair,height:(p.appearance.height+partner.appearance.height)/2+(roll(child.id+'height')-.5)*.1};p.children.push(child.id);partner.children.push(child.id);event(s,`${name(child)} joined the family · generation ${child.generation}.`);
 }
 }return s;}
export function routine(p,hour){if(!p.alive)return 'Remembered';if(hour<6||hour>=21)return 'Sleeping';if(p.age<5)return 'At home with family';if(p.age<18)return hour>=8&&hour<16?'At school off-ranch': 'Playing at home';if(p.age>=67)return 'Retired · at home';if(p.occupation==='town'&&hour>=8&&hour<18)return 'Working off-ranch';if(hour<8||hour>=18)return 'At home with family';return 'Ranch work';}
export function generationSummary(s){const living=s.people.filter(p=>p.alive);return {year:s.year+1,residents:living.length,children:living.filter(p=>p.age<18).length,generation:Math.max(1,...living.map(p=>p.generation)),events:s.events.slice(0,8)};}

export function farmhandsNeeded(people,hour,animals,urgent=false,day=1,weather='clear'){return urgent||hour>=8&&hour<18?Math.min(8,Math.max(0,Math.ceil(animals/6)-people.filter(p=>p.alive&&schedule(p,{day,hour},weather).id==='care').length)):0;}
