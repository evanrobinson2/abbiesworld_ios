'use strict';
// Original SVG illustration layer. Geometry and inspection remain scene-driven.
function artDefs(){
 const d=el('defs');
 const paper=el('pattern',{id:'paper',width:7,height:7,patternUnits:'userSpaceOnUse'},d);
 for(let i=0;i<12;i++)el('circle',{cx:(i*2.71)%7,cy:(i*1.83)%7,r:.035,fill:'#8d8068',opacity:.16},paper);
 const wood=el('pattern',{id:'wood',width:2.8,height:.65,patternUnits:'userSpaceOnUse'},d);
 el('rect',{width:2.8,height:.65,fill:'#ead6ad'},wood);
 el('path',{d:'M0 .02 H2.8 M1.7 0 V.65 M.2 .23 Q.8 .18 1.4 .25 M1.9 .49 Q2.2 .43 2.65 .49',fill:'none',stroke:'#ac8d5e','stroke-width':.018,opacity:.55},wood);
 const tile=el('pattern',{id:'tile',width:.7,height:.7,patternUnits:'userSpaceOnUse'},d);
 el('rect',{width:.7,height:.7,fill:'#d7ddd0'},tile);el('rect',{x:.035,y:.035,width:.63,height:.63,rx:.025,fill:'#e7e8dc',stroke:'#a0aa9a','stroke-width':.018},tile);
 const slab=el('pattern',{id:'slab',width:1.5,height:1.5,patternUnits:'userSpaceOnUse'},d);
 el('rect',{width:1.5,height:1.5,fill:'#d6cbb2'},slab);el('path',{d:'M0 0H1.5V1.5',fill:'none',stroke:'#a39981','stroke-width':.02},slab);
 const shadow=el('filter',{id:'building-shadow',x:'-20%',y:'-20%',width:'150%',height:'150%'},d);
 el('feDropShadow',{dx:.12,dy:.22,stdDeviation:.12,'flood-color':'#434a37','flood-opacity':.22},shadow);
}
const oldProp=prop;
prop=function(o,r){
 oldProp(o,r);let g=svg.lastElementChild;if(!g||!o.position)return;
 const [w,h]=o.size||[.7,.7],kind=(o.kind+' '+o.name).toLowerCase();
 // Vector-only shadows avoid SVG filter artifacts at high zoom.
 if(/sofa|chair/.test(kind)){el('rect',{x:-w*.37,y:-h*.32,width:w*.74,height:h*.62,rx:Math.min(w,h)*.12,fill:'#d6bc8a',stroke:'#78684c','stroke-width':.035},g);line([[-w*.3,-h*.18],[w*.3,-h*.18]],'#f5e2bb',.035,g)}
 if(/bed/.test(kind)&&!/bedding/.test(kind)){el('rect',{x:-w*.39,y:-h*.03,width:w*.78,height:h*.43,rx:.045,fill:o.id==='ani-bed'?'#c88b5e':'#8ca899',stroke:'#626e59','stroke-width':.025},g);for(let i=0;i<4;i++)line([[-w*.34,-h*.01+i*h*.1],[w*.34,-h*.01+i*h*.1]],'#fff5db88',.018,g)}
 if(/cabinet|bookcase/.test(kind)){line([[-w*.02,-h*.4],[-w*.02,h*.4]],'#695e48',.025,g);el('circle',{cx:w*.07,cy:0,r:.025,fill:'#4d5145'},g)}
};
tree=function(v){
 let [x,y]=v.position,r=v.radius||2,g=el('g'),s=(v.kind+' '+v.species).toLowerCase();
 if(/grass|wildflower|fern|groundcover/.test(s)){
  for(let i=0;i<5;i++){let dx=Math.sin(i*4+x)*r*.6,dy=Math.cos(i*3+y)*r*.6;el('path',{d:`M${x+dx-.25} ${-y-dy} q.25 -.8 .3 -.2 q.1 -.6 .35 -.3`,fill:'none',stroke:'#7f965b','stroke-width':.12,'stroke-linecap':'round'},g);if(/flower/.test(s))el('circle',{cx:x+dx+.3,cy:-y-dy-.6,r:.22,fill:i%2?'#f3e4ae':'#d9bc85'},g)}return;
 }
 el('ellipse',{cx:x+r*.3,cy:-y+r*.4,rx:r,ry:r*.75,fill:'#345742',opacity:.13},g);
 if(/pine|conifer|hemlock|fir|spruce/.test(s)){
  line([[x,y-r],[x,y+r]],'#6b684a',.3,g);
  for(let i=0;i<3;i++){let rr=r*(.8-i*.19),yy=y-r*.3+i*r*.5;el('path',{d:`M${x} ${-yy-rr*1.35} Q${x-rr*.35} ${-yy} ${x-rr} ${-yy+rr*.45} Q${x} ${-yy+rr*.75} ${x+rr} ${-yy+rr*.45} Q${x+rr*.4} ${-yy} ${x} ${-yy-rr*1.35}Z`,fill:['#587864','#66866a','#7e986e'][i],stroke:'#405e4b','stroke-width':.18,'stroke-linejoin':'round'},g);}
 }else{
  let shrub=/shrub|berry|bush/.test(s),a=[];for(let i=0;i<12;i++){let t=i*Math.PI/6,rr=r*(.88+.1*Math.sin(i*2.1+x));a.push([x+Math.cos(t)*rr,-y+Math.sin(t)*rr]);}
  let path=`M${(a[11][0]+a[0][0])/2} ${(a[11][1]+a[0][1])/2}`;for(let i=0;i<12;i++){let n=a[(i+1)%12];path+=` Q${a[i][0]} ${a[i][1]} ${(a[i][0]+n[0])/2} ${(a[i][1]+n[1])/2}`;}path+='Z';
  el('path',{d:path,fill:shrub?'#a5b77d':(Math.floor(x+y)%3===0?'#92a975':'#7f9d77'),stroke:'#49664b','stroke-width':.2},g);
  el('path',{d:`M${x-r*.64} ${-y+r*.15} Q${x-r*.8} ${-y-r*.75} ${x+r*.35} ${-y-r*.65}`,fill:'none',stroke:'#d4deaa','stroke-width':.32,'stroke-linecap':'round',opacity:.7},g);
  el('path',{d:`M${x-r*.4} ${-y+r*.52} q${r*.45} ${r*.25} ${r*.85} ${-r*.08}`,fill:'none',stroke:'#527453','stroke-width':.16,opacity:.65},g);
 }
 if(detail>=5)interactive(g,v.species||v.kind,()=>{const p=open(v.species||v.kind,'NATURAL LAYER');html('p',v.description||'Retained woodland and meadow planting.',p)});
};
renderBuilding=function(){
 el('rect',{x:-1000,y:-1000,width:2000,height:2000,fill:'#f0eadb'});
 poly(building.polygon.map(p=>[p[0]+.16,p[1]-.2]),'#9a978060','none');
 poly(building.polygon,'#e9dbbd','#4f564b',.3);
 for(const r of building.rooms){let b=bounds(r.polygon),g=el('g'),mat=r.finishes?.floor||'',pattern=/tile/.test(mat)?'tile':/slab|concrete/.test(mat)?'slab':'wood';
  poly(r.polygon,`url(#${pattern})`,'#51584b',.17,g);interactive(g,'Inspect '+r.name,()=>roomPanel(r));
  // A second warm interior edge gives walls an ink-and-wash finish.
  el('rect',{x:b.x+.12,y:-b.y-b.h+.12,width:b.w-.24,height:b.h-.24,fill:'none',stroke:'#f9f1de','stroke-width':.055},g);
  for(const win of r.windows||[]){let [x,y]=win.position,h=win.width/2;let a=win.orientation==='horizontal'?[[x-h,y],[x+h,y]]:[[x,y-h],[x,y+h]];line(a,'#4c6c68',.25);line(a,'#d3eee3',.14);line(a,'#77a9a2',.035);}
  if(detail>=2)for(const o of r.contents||[])prop(o,r);
  for(const d of r.doors||[]){let [x,y]=d.position,h=d.width/2,vertical=Math.abs(x-b.x)<.05||Math.abs(x-b.x-b.w)<.05;
   line(vertical?[[x,y-h],[x,y+h]]:[[x-h,y],[x+h,y]],'#efdfbc',.25);
   if(detail>=3){let start=vertical?[x,y-h]:[x-h,y],end=vertical?[x+h*1.8,y-h]:[x-h,y+h*1.8];line([start,end],'#8e7958',.045);el('path',{d:vertical?`M${x} ${-y-h} A${d.width} ${d.width} 0 0 1 ${x+d.width} ${-y+h}`:`M${x+h} ${-y} A${d.width} ${d.width} 0 0 0 ${x-h} ${-y-d.width}`,fill:'none',stroke:'#9c8966','stroke-width':.022,'stroke-dasharray':'.07 .06'},svg);}
  }
  let c=center(r.polygon);txt(c[0],b.y+b.h-.38,r.name,Math.min(.39,b.w/Math.max(r.name.length,1)*1.2),svg,{class:'label room-label'});
 }
 poly(building.polygon,'url(#paper)','none').setAttribute('pointer-events','none');
};
render=function(){svg.classList.toggle('interior',!!building);svg.replaceChildren();artDefs();building?renderBuilding():renderSite();};
const fullRoomPanel=roomPanel;
// Rounded quadratic centerlines retain endpoints and keep bends inside each
// three-point convex hull. Bridge geometry stays straight and exact.
function flowingPath(points,closed=false){
 const a=points.map(p=>[p[0],-p[1]]);if(a.length<2)return '';
 const mid=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2];
 if(closed){let first=mid(a[a.length-1],a[0]),d=`M${first}`;for(let i=0;i<a.length;i++)d+=` Q${a[i]} ${mid(a[i],a[(i+1)%a.length])}`;return d+' Z';}
 let d=`M${a[0]}`;for(let i=1;i<a.length-1;i++)d+=` Q${a[i]} ${mid(a[i],a[i+1])}`;return d+` L${a[a.length-1]}`;
}
function wash(points,fill){return el('path',{d:flowingPath(points,true),fill,stroke:'none','pointer-events':'none'});}
function gardenBed(o){
 const [x,y]=o.position,[w,h]=o.size,g=el('g');
 el('rect',{x:x+.16,y:-y-h+.16,width:w,height:h,rx:.4,fill:'#718457',opacity:.25},g);
 el('rect',{x,y:-y-h,width:w,height:h,rx:.35,fill:'#84664d',stroke:'#bda77a','stroke-width':.28},g);
 line([[x+.5,y+h*.5],[x+w-.5,y+h*.5]],'#a37a53',.17,g);
 let index=Number(o.id.slice(-1));for(let i=0;i<Math.floor(w/1.05);i++){let px=x+.55+i*1.05,py=y+h/2;
  if(index===1){line([[px,py-.3],[px,py+.5]],'#c6b68d',.12,g);}
  for(let j=0;j<3;j++){let angle=j*2.1+index,dx=Math.cos(angle)*.22,dy=Math.sin(angle)*.24;el('ellipse',{cx:px+dx,cy:-py+dy,rx:index===3?.35:.23,ry:.14,transform:`rotate(${j*60} ${px+dx} ${-py+dy})`,fill:['#739355','#5d8252','#87a15e','#68915c','#8a9d66'][index],stroke:'#496747','stroke-width':.035},g);}
 }
 interactive(g,o.name,()=>objectPanel(o,{name:'Kitchen garden',contents:world.outdoorContents.filter(x=>x.id.startsWith('veg-bed'))}));
}
renderSite=function(){
 el('rect',{x:-1000,y:-1000,width:2000,height:2000,fill:'#e0e6cb'});
 const w=world.bounds.width,h=world.bounds.depth;
 poly([[0,0],[w,0],[w,h],[0,h]],'#b7ca8b','none');
 // Broad overlapping land washes replace cadastral polygon outlines.
 for(const p of world.parcels){if(p.kind==='woodland')wash(p.polygon,'#9ab37d');else if(p.kind==='yard'||p.kind==='workyard')wash(p.polygon,'#c9d39e');else if(p.kind==='meadow')wash(p.polygon,'#c4d298');else if(p.kind==='riparian')wash(p.polygon,'#a6c293');}
 // Fine deterministic meadow marks: sparse tufts rather than a repeating fill.
 for(let i=0;i<150;i++){let x=8+(i*37.23)%164,y=5+(i*23.77)%168;if(world.buildings.some(b=>{let r=bounds(b.polygon);return x>r.x-2&&x<r.x+r.w+2&&y>r.y-2&&y<r.y+r.h+2}))continue;el('path',{d:`M${x-.35} ${-y}q.2 -.5 .35 -.05q.1 -.6 .35 -.3`,stroke:'#8da66b','stroke-width':.13,fill:'none',opacity:.55,'pointer-events':'none'});}
 const brook=world.water.brook;
 const bd=flowingPath(brook.centerline);
 el('path',{d:bd,fill:'none',stroke:'#7f9f75','stroke-width':7.2,'stroke-linecap':'round'});
 el('path',{d:bd,fill:'none',stroke:'#6ca8a4','stroke-width':5.3,'stroke-linecap':'round'});
 el('path',{d:bd,fill:'none',stroke:'#9cc8ba','stroke-width':3.4,'stroke-linecap':'round',opacity:.6});
 // Short water ripples follow the current, without a road-like dashed centerline.
 for(let i=2;i<brook.centerline.length-2;i+=3){let [x,y]=brook.centerline[i];el('path',{d:`M${x-1} ${-y+.7}q.8 -.3 1.8 -.1 M${x+.1} ${-y-.8}q.5 -.2 1.1 0`,fill:'none',stroke:'#deead1','stroke-width':.14,opacity:.6});}
 const garden=world.parcels.find(p=>p.id==='vegetables');const gardenShape=wash(garden.polygon,'transparent');gardenShape.removeAttribute('pointer-events');interactive(gardenShape,'Explore kitchen garden',()=>{const panel=open('Kitchen garden','FIVE INDIVIDUAL PLANTED BEDS');card(panel,'Look closer','Inspect planting and the curved approach',()=>{close();const b=bounds(garden.polygon),w=b.w+10,h=w*svg.clientHeight/svg.clientWidth;setView({x:b.x-5,y:-(b.y+b.h/2)-h/2,w,h});});for(const o of world.outdoorContents.filter(o=>o.id.startsWith('veg-bed')))card(panel,o.name,'Soil bed and individually drawn plants',()=>objectPanel(o,{name:'Kitchen garden',contents:world.outdoorContents}));});
 for(const p of world.paths){const loop=p.id==='rear-loop',a=loop?p.points.slice(0,-1):p.points,d=flowingPath(a,loop);for(const [color,width] of [['#96a777',(p.width||1.5)+1],['#c3ab79',(p.width||1.5)+.24],['#e8d3a2',p.width||1.5]])el('path',{d,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round'});}
 const gardenWalk=flowingPath([[48,75],[43,76],[42.5,82],[42.5,90],[43,95]]);el('path',{d:gardenWalk,fill:'none',stroke:'#dac794','stroke-width':1,'stroke-linecap':'round'});
 // Fences are deliberately post-and-rail, distinct from soft landscape edges.
 for(const p of world.parcels.filter(p=>p.fenced)){let a=[...p.polygon,p.polygon[0]];line(a,'#82795b',.4);for(let i=0;i<a.length-1;i++){let u=a[i],v=a[i+1],n=Math.ceil(Math.hypot(v[0]-u[0],v[1]-u[1])/3);for(let j=0;j<n;j++){let x=u[0]+(v[0]-u[0])*j/n,y=u[1]+(v[1]-u[1])*j/n;el('circle',{cx:x,cy:-y,r:.28,fill:'#e9dbad',stroke:'#7d7657','stroke-width':.1});}}}
 poly(world.bridge.polygon,'#c4ae80','#756b50',.25);let br=bounds(world.bridge.polygon);for(let y=br.y+.4;y<br.y+br.h;y+=.65)line([[br.x,y],[br.x+br.w,y]],'#8b7a58',.12);line([[br.x,br.y],[br.x,br.y+br.h]],'#ead9af',.3);line([[br.x+br.w,br.y],[br.x+br.w,br.y+br.h]],'#ead9af',.3);
 for(const o of world.outdoorContents||[])if(o.id.startsWith('veg-bed'))gardenBed(o);else if(detail>=3)prop(o,{name:'Out on the land',contents:world.outdoorContents});
 for(const v of [...world.vegetation].sort((a,b)=>b.position[1]-a.position[1]))tree(v);
 for(const b of world.buildings)roof(b);
 txt(57,101,'KITCHEN GARDEN',2,svg,{class:'label'});
};
roomPanel=function(r){fullRoomPanel(r);const p=$('drawer-content'),btn=html('button','Look closer · '+r.name,p,'action');p.prepend(btn);btn.onclick=()=>{close();let b=bounds(r.polygon),w=b.w+1.2,h=b.h+1.2,aspect=svg.clientWidth/svg.clientHeight;if(w/h>aspect)h=w/aspect;else w=h*aspect;setView({x:b.x+b.w/2-w/2,y:-b.y-b.h/2-h/2,w,h});};};
