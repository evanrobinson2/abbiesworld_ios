(function(root){
const defaults={version:2,width:140,depth:210,seed:41,kind:'homestead',terrain:'pond',motif:'autumn',needs:['garden','orchard'],extras:[],trees:55};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const overlap=(a,b,g=0)=>a.x<b.x+b.w+g&&a.x+a.w+g>b.x&&a.y<b.y+b.d+g&&a.y+a.d+g>b.y;
const center=a=>({x:a.x+a.w/2,y:a.y+a.d/2});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function normalize(s){s={...defaults,...s};s.width=clamp(+s.width||160,90,260);s.depth=clamp(+s.depth||140,90,260);s.seed=+s.seed||1;s.trees=clamp(+s.trees||0,0,100);s.needs=(s.needs||[]).filter(x=>['garden','orchard','guest','chickens'].includes(x));s.extras=(s.extras||[]).filter(x=>['whimsy','party'].includes(x));return s;}
function generate(input){
 const s=normalize(input),rng=random(s.seed),W=s.width,D=s.depth,items=[],omitted=[],paths=[],trees=[],animals=[];
 const gate={x:W*(.25+rng()*.5),y:D-3};
 const water=s.terrain==='pond'?{x:W*(.62+rng()*.12),y:D*(.14+rng()*.18),w:W*.16,d:D*.17}:null;
 const wet=p=>s.terrain==='creek'?Math.abs(p.x-(W*.77+Math.sin(p.y/D*6)*W*.035))<6:water&&((p.x-(water.x+water.w/2))/(water.w/2+4))**2+((p.y-(water.y+water.d/2))/(water.d/2+4))**2<1;
 const landBox=b=>{for(let y=b.y-2;y<=b.y+b.d+2;y+=2)for(let x=b.x-2;x<=b.x+b.w+2;x+=2)if(wet({x,y}))return false;return true;};
 const valid=b=>b.x>7&&b.y>7&&b.x+b.w<W-7&&b.y+b.d<D-11&&landBox(b)&&items.every(a=>!overlap(a,b,5));
 function place(id,name,w,d,reason,score,kind='building'){
  let best=null;for(let i=0;i<700;i++){let rotated=rng()<.35;let b={id,name,w:rotated?d:w,d:rotated?w:d,x:7+rng()*(W-w-14),y:7+rng()*(D-d-18),reason,kind};if(!valid(b))continue;const value=score(center(b))+rng()*8;if(!best||value>best.value)best={...b,value};}
  if(best){best.gate={x:best.x+best.w/2,y:best.y+best.d};items.push(best);}else omitted.push(name);return best;
 }
 const house=place('house','Farmhouse',14,11,'Near the arrival gate, with room for a porch and a working yard.',p=>-distance(p,gate)*.8);
 const barn=place('barn',s.kind==='horses'?'Stable barn':'Working barn',s.kind==='horses'?22:18,14,'Connected to the entrance and kept apart from the house. Paddocks cluster around this working hub.',p=>house?-Math.abs(distance(p,center(house))-35)-distance(p,gate)*.12:0);
 const fields=s.kind==='cattle'?3:s.kind==='horses'?2:2;
 const fw=clamp(Math.sqrt(W*D/(fields+7))*.7,20,48),fd=fw*.85;
 for(let i=0;i<fields;i++)place('field'+i,s.kind==='horses'?'Horse paddock '+(i+1):s.kind==='cattle'?'Grazing pasture '+(i+1):'Meadow paddock '+(i+1),fw,fd,'Fenced grazing space favors proximity to the barn. A gate joins the shared path network; a trough supplies water.',p=>barn?-distance(p,center(barn))*.6:0,'field');
 if(s.needs.includes('garden'))place('garden','Kitchen garden',17,13,'Daily harvesting stays close to the farmhouse. Beds have their own entrance off the path.',p=>house?-distance(p,center(house)):0,'garden');
 if(s.needs.includes('chickens'))place('coop','Chicken yard',13,12,'Close enough for daily care, separated from the house by a clear yard.',p=>house?-Math.abs(distance(p,center(house))-25):0,'coop');
 if(s.needs.includes('guest'))place('guest','Guest cottage',11,9,'A little distance from daily barn work, with its own route back to the entrance.',p=>(barn?distance(p,center(barn))*.25:0)-(house?Math.abs(distance(p,center(house))-32):0));
 if(s.needs.includes('orchard'))place('orchard','Orchard',23,20,'An accessible grove fills remaining open land without blocking buildings or water.',p=>house?-distance(p,center(house))*.3:0,'orchard');
 // Shared path network: flood search around all footprints and water, connecting each gate to the existing network.
 const step=2,nx=Math.ceil(W/step),ny=Math.ceil(D/step),key=(x,y)=>y*nx+x,toCell=p=>[clamp(Math.floor(p.x/step),0,nx-1),clamp(Math.floor(p.y/step),0,ny-1)],point=(x,y)=>({x:(x+.5)*step,y:(y+.5)*step});
 const blocked=(x,y)=>{const p=point(x,y);return p.x<3||p.y<3||p.x>W-3||p.y>D-2||wet(p)||items.some(a=>p.x>a.x-1&&p.x<a.x+a.w+1&&p.y>a.y-1&&p.y<a.y+a.d+1);};
 const gc=toCell(gate),network=new Set([key(...gc)]);let unreachable=[];
 for(const item of items){const start=toCell({x:item.gate.x,y:item.gate.y+3}),queue=[start],seen=new Set([key(...start)]),prev=new Map();let hit=null;
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i],k=key(x,y);if(network.has(k)){hit=k;break;}for(const [dx,dy]of [[0,1],[1,0],[-1,0],[0,-1]]){const a=x+dx,b=y+dy,n=key(a,b);if(a<0||b<0||a>=nx||b>=ny||seen.has(n)||blocked(a,b))continue;seen.add(n);prev.set(n,k);queue.push([a,b]);}}
  if(hit===null){unreachable.push(item.name);continue;}let rev=[],k=hit;while(k!==undefined){rev.push(point(k%nx,Math.floor(k/nx)));network.add(k);k=prev.get(k);}rev.reverse();paths.push({id:item.id,points:[item.gate,...rev]});
 }
 const pathPoints=paths.flatMap(p=>p.points);
 // Woodland grows in overlapping groups along the boundary; open ground stays quiet.
 const groves=[{x:W*.09,y:D*.15},{x:W*.88,y:D*.15},{x:W*.1,y:D*.61},{x:W*.9,y:D*.69},{x:W*.45,y:D*.06}];
 for(let i=0;i<s.trees*13;i++){
  const g=groves[Math.floor(rng()*groves.length)],angle=rng()*Math.PI*2,spread=Math.sqrt(rng()),p={x:g.x+Math.cos(angle)*W*.17*spread,y:g.y+Math.sin(angle)*D*.24*spread,r:2.4+rng()*2.3};
  if(p.x<p.r||p.x>W-p.r||p.y<p.r||p.y>D-p.r-3||wet(p))continue;
  if(items.some(a=>overlap({x:p.x-p.r-2,y:p.y-p.r-2,w:p.r*2+4,d:p.r*2+4},a))||pathPoints.some(q=>distance(p,q)<p.r+3)||trees.some(q=>distance(p,q)<(p.r+q.r)*.67))continue;
  trees.push(p);
 }
 for(const f of items.filter(a=>a.kind==='field'))for(let i=0;i<(s.kind==='cattle'?6:3);i++)animals.push({x:f.x+4+rng()*(f.w-8),y:f.y+4+rng()*(f.d-8),angle:rng()*360,kind:s.kind});
 return{state:s,items,gate,water,paths,trees,animals,omitted,unreachable,acres:W*D/4046.856,checks:{nonoverlap:items.every((a,i)=>items.slice(i+1).every(b=>!overlap(a,b,4.9))),connected:unreachable.length===0,dry:items.every(landBox)}};
}
root.RanchEngine={defaults,normalize,generate,overlap};if(typeof module!=='undefined')module.exports=root.RanchEngine;
})(typeof window!=='undefined'?window:globalThis);
