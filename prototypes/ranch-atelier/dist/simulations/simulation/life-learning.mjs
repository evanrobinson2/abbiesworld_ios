// Social influence is separate from biological trait inheritance.
const ACTIVITIES=['garden','eggs','groom','apples'];
function unit(key){let n=2166136261;for(const c of String(key)){n=Math.imul(n^c.charCodeAt(0),16777619);}return (n>>>0)/4294967296;}
export function familyInterests(parents,key){return Object.fromEntries(ACTIVITIES.map(activity=>{const known=parents.map(p=>p?.interests?.[activity]).filter(v=>Number.isFinite(v)),family=known.length?known.reduce((a,b)=>a+b,0)/known.length:.5;return [activity,Math.round(Math.max(.05,Math.min(.95,family*.6+unit(key+activity)*.4))*100)/100];}));}
export function chooseActivity(interests,key){const weights=ACTIVITIES.map(a=>.2+(interests?.[a]??.5));let roll=unit(key)*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<=0)return i;}return weights.length-1;}
export function practice(person,activity){if(!ACTIVITIES.includes(activity))return;person.skills??={};person.interests??=familyInterests([],person.id);person.skills[activity]=Math.min(1,Math.round(((person.skills[activity]||0)+.025)*1000)/1000);person.interests[activity]=Math.min(.95,Math.round((person.interests[activity]+.005)*1000)/1000);}
