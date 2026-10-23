'use strict';
function magnitude(n){if(!Number.isInteger(n)||n<0)throw Error('Unit count must be a nonnegative integer');return n?{order:Math.floor(Math.log10(n)),index:Number(Math.log10(n).toFixed(3))}:{order:null,index:null};}
function measureWorld(w){
 const rooms=w.buildings.flatMap(b=>b.rooms||[]),objects=[...rooms.flatMap(r=>r.contents||[]),...(w.outdoorContents||[])];
 const groups={buildings:w.buildings,rooms,objects,inventory:objects.flatMap(o=>o.inventory||[]),vegetation:w.vegetation||[],parcels:w.parcels||[],routes:w.paths||[],windows:rooms.flatMap(r=>r.windows||[]),doors:rooms.flatMap(r=>r.doors||[]),water:w.water?.brook?[w.water.brook]:[],crossings:w.bridge?[w.bridge]:[]};
 const counts=Object.fromEntries(Object.entries(groups).map(([k,a])=>[k,new Set(a.map((e,i)=>e.id||`${k}:${i}`)).size]));
 const units=Object.values(counts).reduce((a,b)=>a+b,0);
 const fields=['name','description','position','size','state','affordances'];
 const filled=objects.reduce((sum,o)=>sum+fields.filter(k=>o[k]!=null&&o[k]!==''&&(!Array.isArray(o[k])||o[k].length)).length,0);
 return {version:'0.1',units,...magnitude(units),counts,objectSpecificationCoverage:Math.round(100*filled/(objects.length*fields.length)),coverageScope:`Presence of six fields across ${objects.length} placed objects; not correctness or simulation readiness`,coherence:'Not graded: geometry checks exist, but a cross-domain coherence rubric has not been calibrated.',countingRule:'Count one independently identified scene record per category. Nested inventory counts separately and has no implied physical placement. Drawing marks, vertices, pixels, texture repeats and animation particles count zero. Vegetation includes patches, not inferred individual blades. Categories remain visible so repetition cannot masquerade as design variety.'};
}
if(typeof module!=='undefined')module.exports={magnitude,measureWorld};
