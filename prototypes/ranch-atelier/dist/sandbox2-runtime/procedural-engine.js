/* Seeded world construction. No network, model calls or prompt interpretation. */
(function(root){
const size=180, rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const settings={
 relief:[4,0.5,14],hillHeight:[0.8,0,8],hillScale:[65,25,120],ridgeAngle:[30,0,180],
 valleyWidth:[36,12,65],flatGround:[45,0,90],roughness:[0.15,0,1],
 streamWidth:[5.3,2,12],streamDepth:[0.8,0.2,2.5],streamBends:[1,0,2],streamPosition:[108,65,135],
 woodland:[55,0,100],clustering:[55,0,100],clearing:[65,35,85],setback:[5,1,18],spacing:[2.5,1.25,5]
};
const biomes=['meadow-woodland-brook','woodland','wetland','upland-pasture','rocky-foothills','coast-estuary'];
const defaults=Object.fromEntries(Object.entries(settings).map(([k,v])=>[k,v[0]]));
defaults.biome='meadow-woodland-brook';
function normalize(input={}){const out=Object.fromEntries(Object.entries(settings).map(([k,[d,lo,hi]])=>{const v=Number(input[k]??d);return[k,Math.max(lo,Math.min(hi,Number.isFinite(v)?v:d))]}));out.biome=biomes.includes(input.biome)?input.biome:defaults.biome;return out;}
function sample(w,x,y){const g=w.terrain.grid,a=Math.max(0,Math.min(g.cols-1.000001,x/g.spacing)),b=Math.max(0,Math.min(g.rows-1.000001,y/g.spacing)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=g.heights;return(h[j][i]*(1-u)+h[j][i+1]*u)*(1-v)+(h[j+1][i]*(1-u)+h[j+1][i+1]*u)*v;}
function brookY(w,x){const c=w.water.brook.centerline,q=Math.max(0,Math.min(c.length-1.000001,x/size*(c.length-1))),i=Math.floor(q),f=q-i;return c[i][1]*(1-f)+c[i+1][1]*f;}
function landscape(seed,input={}){
 seed=(Number(seed)>>>0)||1;const config=normalize(input),r=random(seed),phase=r()*6.28,bend=5+r()*8,level=103+r()*2,channel=99+r()*2;
 const c=config,angle=c.ridgeAngle*Math.PI/180;
 const streamY=x=>c.streamPosition+c.streamBends*(bend*Math.sin(x/size*5+phase)+3*Math.sin(x/size*10+phase*.7));
 const waterLevel=channel-.63,shoreX=y=>118+8*Math.sin(y/31+phase)+4*Math.sin(y/13+phase);
 const elevation=(x,y)=>{
  if(c.biome==='coast-estuary'){const shore=shoreX(y)-x,u=x*Math.cos(angle)+y*Math.sin(angle),land=waterLevel+shore*(.035+c.relief*.0133)+Math.max(0,Math.min(1,shore/c.valleyWidth))*(c.hillHeight*(1-c.flatGround/100)*Math.sin(u/c.hillScale*6.28+phase)+c.roughness*Math.sin(x/6.7)*Math.cos(y/8.3)),river=Math.abs(y-streamY(x));return river<c.streamWidth/2?Math.min(land,waterLevel-c.streamDepth*(1-(river/(c.streamWidth/2))**2)):land;}
  const distance=Math.abs(y-streamY(x)),bank=Math.max(0,distance-c.streamWidth/2),water=channel-x*.007;
  if(distance<c.streamWidth/2)return water-c.streamDepth*(1-(distance/(c.streamWidth/2))**2);
  const foothill=1-Math.exp(-bank/c.valleyWidth),meadow=1-c.flatGround/100*Math.exp(-(((x-90)/55)**4)-((y-40)/45)**4);
  const u=x*Math.cos(angle)+y*Math.sin(angle),v=-x*Math.sin(angle)+y*Math.cos(angle);
  const hill=(.5+.5*Math.sin(u/c.hillScale*6.28+phase))*(.65+.35*Math.cos(v/(c.hillScale*1.6)*6.28+phase));
  const texture=c.roughness*(Math.sin(x/6.7+phase)*Math.sin(y/8.3)+.35*Math.sin(x/2.9+y/3.7+phase));
  if(c.biome==='wetland')return waterLevel+.08+c.relief*.045+(.2+c.relief*.06)*Math.sin(u/(c.hillScale*.2)+phase)*Math.cos(v/(c.hillScale*.27)-phase)+Math.min(bank/c.valleyWidth,1)*(.2+c.hillHeight*.1)*meadow+texture*.3;
  return water+.18+foothill*(c.relief+meadow*(c.hillHeight*hill+texture));
 };
 const spacing=[1.25,2.5,5].reduce((a,b)=>Math.abs(b-c.spacing)<Math.abs(a-c.spacing)?b:a,5);c.spacing=spacing;
 const count=Math.round(size/spacing)+1,heights=Array.from({length:count},(_,j)=>Array.from({length:count},(_,i)=>+elevation(i*spacing,j*spacing).toFixed(3)));
 const centerline=Array.from({length:145},(_,i)=>[i*1.25,streamY(i*1.25),channel-i*1.25*.007]);
 const surfaceAt=(x,y)=>{const h=elevation(x,y),river=Math.abs(y-streamY(x))<c.streamWidth/2;
  if(c.biome==='coast-estuary')return h<=waterLevel?(river?'brackish-water':'saltwater'):h<waterLevel+.6?'sand':river?'freshwater':'meadow';
  if(c.biome==='wetland')return river||h<=waterLevel?'freshwater':h<waterLevel+.55?'wet-ground':'meadow';
  if(river)return 'freshwater';
  if(c.biome==='rocky-foothills'){const dx=(elevation(Math.min(180,x+1),y)-elevation(Math.max(0,x-1),y))/2,dy=(elevation(x,Math.min(180,y+1))-elevation(x,Math.max(0,y-1)))/2;if((Math.hypot(dx,dy)>.18||h>channel+c.relief*.8)&&Math.sin(x/14+phase)*Math.cos(y/19-phase)>-.2)return 'rock';}
  return 'meadow';};
 const surfaces=Array.from({length:count},(_,j)=>Array.from({length:count},(_,i)=>surfaceAt(i*spacing,j*spacing)));
 const vegetation=[];for(let i=0;i<3600;i++){const x=3+r()*174,y=3+r()*174,rad=3.2+r()*2.2,choice=r(),kind=r()<.27?'conifer':'deciduous',height=10+r()*7;
  const edge=(100-c.clearing)*.65+7*Math.sin(y/28+phase),cluster=.5+.5*Math.sin(x/17+phase)*Math.cos(y/21-phase);
  const probability=c.woodland/100*(1-c.clustering/100+c.clustering/100*cluster*1.8);
  if(surfaceAt(x,y)!=='meadow'||!(x<edge||x>180-edge||y>180-edge+4*Math.sin(x/23+phase))||choice>probability||Math.abs(y-streamY(x))<c.streamWidth/2+c.setback+rad||vegetation.some(t=>dist(t.position,[x,y])<(t.radius+rad)*.60))continue;
  vegetation.push({id:'tree-'+i,kind,species:'Woodland canopy',position:[x,y,elevation(x,y)],radius:rad,height});}
 for(const t of vegetation){const i=Math.round(t.position[0]/spacing),j=Math.round(t.position[1]/spacing);if(surfaces[j][i]==='meadow')surfaces[j][i]='woodland';}
 const values=heights.flat(),minimum=Math.min(...values),maximum=Math.max(...values);
 return {id:'procedural-'+seed,name:'Meadow, woodland & brook',seed,config,biome:c.biome,bounds:{width:size,depth:size},coordinateSystem:{units:'metres'},terrain:{surfaceGrid:{values:surfaces,spacing,origin:[0,0],classification:'procedural appearance and geometric wetness; not soil or flood simulation'},grid:{cols:count,rows:count,spacing,origin:[0,0],heights},stats:{minimum,maximum,range:maximum-minimum}},water:{level:waterLevel,zone:c.biome,shoreline:c.biome==='coast-estuary'?Array.from({length:145},(_,i)=>[shoreX(i*1.25),i*1.25]):null,brook:{centerline:centerline.map(p=>c.biome==='coast-estuary'?[p[0],p[1],waterLevel]:p),width:c.streamWidth,depth:c.streamDepth}},vegetation,buildings:[],parcels:[{id:'meadow',kind:'meadow',polygon:rect(20,8,140,153)}],paths:[],outdoorContents:[],actors:[],landDetails:[],grown:false};
}
function grow(land){
 const w=JSON.parse(JSON.stringify(land));if(w.grown)return w;const r=random(w.seed^0x51c9),grid=w.terrain.grid;
 const waterY=x=>brookY(w,x),height=(x,y)=>sample(w,x,y),clearance=w.water.brook.width/2+5;
 const footprint=(x,y,bw,bh)=>{const pts=[];for(let yy=y;yy<=y+bh;yy+=1)for(let xx=x;xx<=x+bw;xx+=1)pts.push([xx,yy]);return pts;};
 const surfaceAt=(x,y)=>w.terrain.surfaceGrid?.values[Math.max(0,Math.min(grid.rows-1,Math.round(y/grid.spacing)))][Math.max(0,Math.min(grid.cols-1,Math.round(x/grid.spacing)))]||'meadow';
 const boxes=[];const overlaps=(a,b,pad=4)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
 function place(id,name,kind,bw,bh,score){let best;
 for(let y=18;y<112-bh;y+=3)for(let x=28;x<151-bw;x+=3){const b={x,y,w:bw,h:bh};if(boxes.some(a=>overlaps(a,b)))continue;const pts=footprint(x-3,y-3,bw+6,bh+6);if(pts.some(p=>p[1]>waterY(p[0])-clearance||!['meadow','woodland'].includes(surfaceAt(...p))))continue;let zs=pts.map(p=>height(...p)),slope=(Math.max(...zs)-Math.min(...zs))/Math.min(bw,bh);if(slope>.12)continue;let value=score([x+bw/2,y+bh/2])-slope*90+r()*1.5;if(!best||value>best.value)best={...b,id,name,kind,value};}
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
 const blocked=(x,y)=>{const px=x*2+1,py=y*2+1;return !['meadow','woodland'].includes(surfaceAt(px,py))||py>waterY(px)-clearance||px<24||px>156||boxes.some(b=>px>b.x-1&&px<b.x+b.w+1&&py>b.y-1&&py<b.y+b.h+1)};
 const network=new Set([key(...cell(gate))]);
 for(const b of boxes){const door=[b.x+b.w/2,b.y],start=cell([door[0],door[1]-3]),queue=[start],seen=new Set([key(...start)]),prev=new Map();let hit;
 for(let z=0;z<queue.length;z++){const [x,y]=queue[z],k=key(x,y);if(network.has(k)){hit=k;break}for(const [dx,dy]of [[0,-1],[1,0],[-1,0],[0,1]]){const a=x+dx,c=y+dy,q=key(a,c);if(a<0||a>=n||c<0||c>=n||seen.has(q)||blocked(a,c))continue;seen.add(q);prev.set(q,k);queue.push([a,c]);}}
 if(hit===undefined)throw Error('A path could not reach '+b.name+'. Try a new landscape.');const points=[];for(let k=hit;k!==undefined;k=prev.get(k)){network.add(k);points.push(point(k))}points.reverse();w.paths.push({id:b.id+'-path',points:[door,...points],width:b===house?2.5:1.5});b.gate=door;}
 for(let i=0;i<6;i++)w.outdoorContents.push({id:'bed-'+i,name:'Garden bed '+(i+1),kind:'garden-bed',position:[garden.x+2+(i%2)*8,garden.y+2+Math.floor(i/2)*4],size:[6,2.5]});
 w.vegetation=w.vegetation.filter(t=>!boxes.some(b=>t.position[0]>b.x-t.radius-2&&t.position[0]<b.x+b.w+t.radius+2&&t.position[1]>b.y-t.radius-2&&t.position[1]<b.y+b.h+t.radius+2));
 w.grown=true;w.placement=boxes;w.checks={dry:boxes.every(b=>rect(b.x,b.y,b.w,b.h).every(p=>p[1]<waterY(p[0])-clearance)),nonoverlap:boxes.every((a,i)=>boxes.slice(i+1).every(b=>!overlaps(a,b,0))),connected:w.paths.length===boxes.length};return w;
}
root.ProceduralRanch={landscape,grow,defaults,settings,normalize,sample,brookY,biomes};if(typeof module!=='undefined')module.exports=root.ProceduralRanch;
})(typeof window!=='undefined'?window:globalThis);
