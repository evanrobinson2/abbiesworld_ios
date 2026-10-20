// Household economy. All quantities and prices are game abstractions.
import {available,advanceCivics} from './civics.mjs';
export const GOODS={grain:{price:1},timber:{price:2},bread:{price:3},crafts:{price:6}};
export const JOBS=[['farmer','Growers','grain'],['woodland','Foresters','timber'],['baker','Bakery','bread'],['craft','Craft workshop','crafts'],['merchant','Market','trade'],['road','Public works','maintenance'],['water','Water service','water'],['sanitation','Sanitation','sanitation'],['nurse','Clinic','care'],['police','Safety service','safety'],['teacher','School','education'],['delivery','Carriers','transport']];
const names=['Alder','Birch','Cedar','Dale','Elm','Fern','Grove','Hazel','Ivy','Juniper','Linden','Moss'];
export function createTown(count=12){
 if(!Number.isInteger(count)||count<1||count>24)throw Error('Choose 1–24 households');
 const s={version:1,hour:5,day:1,households:[],businesses:JOBS.map(([id,label,output])=>({id,label,output,open:true,cash:120,produced:0,sold:0})),market:{grain:0,timber:0,bread:0,crafts:0},treasury:0,externalFunding:0,imports:0,transactions:0,events:[],ledger:[],services:{},schoolHours:0,meals:0};
 for(let i=0;i<count;i++)s.households.push({id:i,name:(names[i%12]+(i>=12?' II':'')),adults:2,children:i%3===0?2:1,cash:40,food:0,crafts:0,jobs:[JOBS[(i*2)%12][0],JOBS[(i*2+1)%12][0]],wellbeing:100,education:0});
 return s;
}
function note(s,text){s.events.unshift({day:s.day,hour:s.hour,text});s.events=s.events.slice(0,35);}
function record(s,from,to,good,quantity,value,kind='trade'){s.ledger.unshift({day:s.day,hour:s.hour,from,to,good,quantity,value,kind});s.ledger=s.ledger.slice(0,100);if(kind==='trade')s.transactions++;}
export function staffing(s,id){return s.businesses.find(b=>b.id===id)?.open?s.households.reduce((n,h)=>n+h.jobs.filter((j,i)=>j===id&&available(s,`${h.id}:${i}`)).length,0):0;}
function fund(s,account,amount){const gap=Math.max(0,amount-account.cash);if(gap){account.cash+=gap;s.externalFunding+=gap;record(s,'Outside support',account.label||account.name,'credits',gap,gap,'support');}}
function importGood(s,good,quantity){if(quantity<=0)return;s.market[good]+=quantity;s.imports+=quantity;s.externalFunding+=quantity*GOODS[good].price;record(s,'Outside suppliers','Market',good,quantity,quantity*GOODS[good].price,'import');}
function buy(s,buyer,good,quantity){importGood(s,good,Math.max(0,quantity-s.market[good]));const cost=quantity*GOODS[good].price;fund(s,buyer,cost);buyer.cash-=cost;s.treasury+=cost;s.market[good]-=quantity;record(s,buyer.label||buyer.name,'Market',good,quantity,cost);return quantity;}
function sell(s,b,good,quantity){const cost=quantity*GOODS[good].price,gap=Math.max(0,cost-s.treasury);s.externalFunding+=gap;s.treasury+=gap-cost;b.cash+=cost;b.produced+=quantity;b.sold+=quantity;s.market[good]+=quantity;record(s,'Market',b.label,good,quantity,cost);}
export function advanceHour(state){
 const s=structuredClone(state);s.hour++;if(s.hour===24){s.hour=0;s.day++;}
 const staff=id=>staffing(s,id),business=id=>s.businesses.find(b=>b.id===id);
 advanceCivics(s,staff);
 s.services=Object.fromEntries(['maintenance','water','sanitation','care','safety','education','transport'].map(service=>{const job=JOBS.find(j=>j[2]===service)[0],capacity=staff(job)*(service==='education'?8:12),demand=service==='education'?s.households.reduce((n,h)=>n+h.children,0):s.households.length;return [service,{staff:staff(job),capacity,demand,local:Math.min(capacity,demand),outside:Math.max(0,demand-capacity)}];}));
 if(s.hour===6){const n=staff('farmer')*8,t=staff('woodland')*4;sell(s,business('farmer'),'grain',n);sell(s,business('woodland'),'timber',t);note(s,`Rural suppliers brought ${n} grain and ${t} timber to the market.`);}
 if(s.hour===9){for(const [id,input,out,per,yieldPer] of [['baker','grain','bread',4,2],['craft','timber','crafts',2,1]]){const n=staff(id)*per;if(n){buy(s,business(id),input,n);sell(s,business(id),out,n*yieldPer);note(s,`${business(id).label} bought ${n} ${input} and sold ${n*yieldPer} ${out}.`);}}}
 if(s.hour>=9&&s.hour<15){const coverage=s.services.education;s.schoolHours+=coverage.local;for(const h of s.households)h.education+=coverage.demand?coverage.local/coverage.demand:0;}
 if(s.hour===15)note(s,`School finished: ${s.services.education.local} local places; ${s.services.education.outside} children supported by visiting educators.`);
 if(s.hour===16){let paid=0;for(const h of s.households)for(const [i,id] of h.jobs.entries()){if(!business(id).open||!available(s,`${h.id}:${i}`)){h.cash+=8;s.externalFunding+=8;record(s,'Household support',h.name,'support',1,8,'support');continue;}const b=business(id);fund(s,b,8);b.cash-=8;h.cash+=8;paid+=8;record(s,b.label,h.name,'wages',1,8,'wage');}note(s,`${paid} credits paid in wages; household support covers interrupted work.`);}
 if(s.hour===17){for(const h of s.households){const need=h.adults+h.children;h.food+=buy(s,h,'bread',Math.max(0,need-h.food));if(s.day%3===0){h.crafts+=buy(s,h,'crafts',1);}}note(s,'Households bought supper at the market. Imports covered any missing stock.');}
 if(s.hour===19){for(const h of s.households){const need=h.adults+h.children;if(h.food<need){const gap=need-h.food;importGood(s,'bread',gap);h.food+=buy(s,h,'bread',gap);}h.food-=need;s.meals+=need;h.wellbeing=100;}note(s,'Every household ate together. Basic needs are guaranteed.');}
 if(s.hour===12)note(s,`Civic services cover ${s.households.length} households; visiting crews fill any staffing gaps.`);
 return s;
}
export function toggleBusiness(s,id){if(!s.businesses.some(b=>b.id===id))throw Error('Unknown workplace');const next=structuredClone(s),b=next.businesses.find(b=>b.id===id);b.open=!b.open;note(next,`${b.label} ${b.open?'reopened':'closed'}. Outside support keeps essential needs covered.`);return next;}
export function addHousehold(s){if(s.households.length>=24)return s;const next=structuredClone(s),i=next.households.length,h=createTown(i+1).households[i];next.households.push(h);next.externalFunding+=h.cash;note(next,`${h.name} household arrived: two adults and ${h.children} children.`);return next;}
export function routine(s,h,member){
 const hour=s.hour,child=member>=h.adults,id=child?'student':h.jobs[member],open=child||s.businesses.find(b=>b.id===id)?.open;
 const condition=(s.conditions||[]).find(c=>c.person===`${h.id}:${member}`);
 if(condition)return {place:condition.kind==='custody'?'jail':'nurse',phase:'rest',text:condition.kind==='custody'?'Time-limited custody · family support':'Receiving care and recovering'};
 if(hour<7||hour>=20)return {place:`home${h.id}`,phase:'home',text:'At home'};
 if(child){if(hour<9)return {place:'school',phase:'travel',text:'Going to school'};if(hour<15)return {place:'school',phase:'work',text:'Learning with classmates'};if(hour<18)return {place:'park',phase:'rest',text:'Playing after school'};return {place:`home${h.id}`,phase:'home',text:'Family time'};}
 if(hour===7)return {place:open?id:'market',phase:'travel',text:open?'Going to work':'Looking for work'};
 if(hour===8&&['baker','craft','delivery','merchant'].includes(id))return {place:'market',phase:'work',text:'Collecting market supplies'};
 if(hour<16)return {place:open?id:'park',phase:'work',text:open?JOBS.find(j=>j[0]===id)[1]:'Taking time in the square'};
 if(hour<18)return {place:'market',phase:'work',text:'Shopping at the market'};
 if(hour===18)return {place:'park',phase:'rest',text:'Meeting neighbors'};
 return {place:`home${h.id}`,phase:'home',text:'Sharing supper'};
}
