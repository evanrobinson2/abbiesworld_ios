/* Seeded world construction. No network, model calls or prompt interpretation. */
(function(root){
const size=180, rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function landscape(seed){
 seed=(Number(seed)>>>0)||1;const r=random(seed),phase=r()*6.28,bend=5+r()*8,level=103+r()*2,channel=99+r()*2,baseline=99+r()*18,tilt=(r()-.5)*.004;
 const streamY=x=>baseline+bend*Math.sin(x/size*5+phase)+3*Math.sin(x/size*10+phase*.7);
 const elevation=(x,y)=>channel-x*.007+(level-channel)*(1-Math.exp(-Math.abs(y-streamY(x))/36))+tilt*(y-90)+.28*Math.sin(x/34+phase)*Math.sin(y/43);
 const heights=Array.from({length:37},(_,j)=>Array.from({length:37},(_,i)=>+elevation(i*5,j*5).toFixed(3)));
 const centerline=Array.from({length:37},(_,i)=>[i*5,streamY(i*5),channel-i*5*.007]);
 const vegetation=[];for(let i=0;i<3600;i++){const x=3+r()*174,y=3+r()*174,rad=3.2+r()*2.2,edge=23+7*Math.sin(y/28+phase);
 if(!(x<edge||x>180-edge||y>155+4*Math.sin(x/23+phase))||Math.abs(y-streamY(x))<8||vegetation.some(t=>dist(t.position,[x,y])<(t.radius+rad)*.60))continue;
 vegetation.push({id:'tree-'+i,kind:r()<.27?'conifer':'deciduous',species:'Woodland canopy',position:[x,y,elevation(x,y)],radius:rad,height:10+r()*7});}
 const world={id:'procedural-'+seed,name:'A ranch grown from the stream',seed,bounds:{width:size,depth:size},coordinateSystem:{units:'metres'},terrain:{grid:{cols:37,rows:37,spacing:5,origin:[0,0],heights}},water:{brook:{centerline,width:5.3}},vegetation,buildings:[],parcels:[{id:'meadow',kind:'meadow',polygon:rect(20,8,140,153)}],paths:[],outdoorContents:[],actors:[],landDetails:[],grown:false};
 return world;
}
function grow(land){
 const w=JSON.parse(JSON.stringify(land));if(w.grown)return w;const r=random(w.seed^0x51c9),grid=w.terrain.grid;
 const waterY=x=>{const q=Math.max(0,Math.min(35.999,x/5)),i=Math.floor(q),f=q-i;return w.water.brook.centerline[i][1]*(1-f)+w.water.brook.centerline[i+1][1]*f};
 const height=(x,y)=>{const a=Math.max(0,Math.min(35.999,x/5)),b=Math.max(0,Math.min(35.999,y/5)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=grid.heights;return (h[j][i]*(1-u)+h[j][i+1]*u)*(1-v)+(h[j+1][i]*(1-u)+h[j+1][i+1]*u)*v};
 const boxes=[];const overlaps=(a,b,pad=4)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
 function place(id,name,kind,bw,bh,score){let best;
 for(let y=18;y<112-bh;y+=3)for(let x=28;x<151-bw;x+=3){const b={x,y,w:bw,h:bh};if(boxes.some(a=>overlaps(a,b)))continue;const pts=rect(x-3,y-3,bw+6,bh+6);if(pts.some(p=>p[1]>waterY(p[0])-10))continue;let zs=pts.map(p=>height(...p)),slope=(Math.max(...zs)-Math.min(...zs))/Math.min(bw,bh);if(slope>.12)continue;let value=score([x+bw/2,y+bh/2])-slope*90+r()*1.5;if(!best||value>best.value)best={...b,id,name,kind,value};}
 if(!best)throw Error('No suitable '+name.toLowerCase()+' site on this seed. Try a new landscape.');boxes.push(best);return best;}
 const gate=[65+r()*45,3];
 const house=place('farmhouse','Farmhouse','house',16,14,p=>-dist(p,gate));
 const hc=[house.x+8,house.y+7];const barn=place('barn','Red rescue barn','barn',20,15,p=>-Math.abs(dist(p,hc)-47)-Math.abs(p[1]-53)*.25);
 const bc=[barn.x+10,barn.y+7.5];const garden=place('vegetables','Kitchen garden','vegetables',19,15,p=>-dist(p,hc));
 const field=place('paddock','Meadow paddock','paddock',29,24,p=>-dist(p,bc));
 const room=(id,name,x,y,a,b)=>({id,name,kind:'room',polygon:rect(x,y,a,b),contents:[],doors:[],windows:[]});
 for(const b of [house,barn])w.buildings.push({id:b.id,name:b.name,kind:b.kind,polygon:rect(b.x,b.y,b.w,b.h),height:b.kind==='barn'?5:3,baseZ:height(b.x,b.y),description:'Placed by dry-ground, slope, separation and access rules.',rooms:b.kind==='barn'?[room('work','Open barn',b.x,b.y,b.w,b.h)]:[room('living','Living & kitchen',b.x,b.y,10,14),room('quiet','Quiet rooms',b.x+10,b.y,6,14)]});
 for(const b of [garden,field])w.parcels.push({id:b.id,name:b.name,kind:b.kind,polygon:rect(b.x,b.y,b.w,b.h),fenced:b===field});
 // Route a shared footpath network through dry unoccupied grid cells.
 const step=2,n=90,key=(x,y)=>y*n+x,cell=p=>[Math.floor(p[0]/step),Math.floor(p[1]/step)],point=k=>[(k%n+.5)*step,(Math.floor(k/n)+.5)*step];
 const blocked=(x,y)=>{const px=x*2+1,py=y*2+1;return py>waterY(px)-7||px<24||px>156||boxes.some(b=>px>b.x-1&&px<b.x+b.w+1&&py>b.y-1&&py<b.y+b.h+1)};
 const network=new Set([key(...cell(gate))]);
 for(const b of boxes){const door=[b.x+b.w/2,b.y],start=cell([door[0],door[1]-3]),queue=[start],seen=new Set([key(...start)]),prev=new Map();let hit;
 for(let z=0;z<queue.length;z++){const [x,y]=queue[z],k=key(x,y);if(network.has(k)){hit=k;break}for(const [dx,dy]of [[0,-1],[1,0],[-1,0],[0,1]]){const a=x+dx,c=y+dy,q=key(a,c);if(a<0||a>=n||c<0||c>=n||seen.has(q)||blocked(a,c))continue;seen.add(q);prev.set(q,k);queue.push([a,c]);}}
 if(hit===undefined)throw Error('A path could not reach '+b.name+'. Try a new landscape.');const points=[];for(let k=hit;k!==undefined;k=prev.get(k)){network.add(k);points.push(point(k))}points.reverse();w.paths.push({id:b.id+'-path',points:[door,...points],width:b===house?2.5:1.5});b.gate=door;}
 for(let i=0;i<6;i++)w.outdoorContents.push({id:'bed-'+i,name:'Garden bed '+(i+1),kind:'garden-bed',position:[garden.x+2+(i%2)*8,garden.y+2+Math.floor(i/2)*4],size:[6,2.5]});
 w.vegetation=w.vegetation.filter(t=>!boxes.some(b=>t.position[0]>b.x-t.radius-2&&t.position[0]<b.x+b.w+t.radius+2&&t.position[1]>b.y-t.radius-2&&t.position[1]<b.y+b.h+t.radius+2));
 w.grown=true;w.placement=boxes;w.checks={dry:boxes.every(b=>rect(b.x,b.y,b.w,b.h).every(p=>p[1]<waterY(p[0])-7)),nonoverlap:boxes.every((a,i)=>boxes.slice(i+1).every(b=>!overlaps(a,b,0))),connected:w.paths.length===boxes.length};return w;
}
root.ProceduralRanch={landscape,grow};if(typeof module!=='undefined')module.exports=root.ProceduralRanch;
})(typeof window!=='undefined'?window:globalThis);
