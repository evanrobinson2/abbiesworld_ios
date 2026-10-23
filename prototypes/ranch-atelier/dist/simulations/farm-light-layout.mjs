export function outdoorLevel(mode){return mode==='night'?1:mode==='evening'?.85:mode==='morning'?.25:0;}
export function farmLightLayout(places,{limit=64,spacing=18,plans:allPlans=[]}={}){const out=[],add=(p)=>{if(out.length>=limit||!Number.isFinite(p.x+p.z)||out.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<5))return;out.push(p);};
 for(const p of places.filter(p=>['home','store','water-source','stable','coop','shelter','enclosure'].includes(p.role))){const q=p.entry||p.world;add({x:q.x+1,z:q.z+1,placeId:p.id,kind:'entrance',role:p.role});}
 const plans=new Map([...allPlans.map(p=>[p.id,p]),...places.filter(p=>p.plan).map(p=>[p.plan.id,p.plan])]);for(const plan of plans.values())for(const path of plan.paths||[]){let remainder=spacing*.5;for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.001)continue;const offset=(path.width||2)/2+.75;for(let d=remainder;d<length;d+=spacing){const t=d/length;add({x:plan.center.x+a.x+dx*t-dz/length*offset,z:plan.center.z+a.z+dz*t+dx/length*offset,kind:'road',facing:Math.atan2(dx,dz)});}remainder=((remainder-length)%spacing+spacing)%spacing;}}
 return out;
}
