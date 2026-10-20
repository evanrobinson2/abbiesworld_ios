'use strict';
// Pen and watercolor presentation over the authored scene. No edits to scene geometry or camera.
function inkRandom(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function inkBlob(x,y,rx,ry,seed){const r=inkRandom(seed),a=[];for(let i=0;i<16;i++){const t=i*Math.PI/8,v=.86+r()*.25;a.push([x+Math.cos(t)*rx*v,y+Math.sin(t)*ry*v]);}let d=`M${(a[0][0]+a[15][0])/2},${(a[0][1]+a[15][1])/2}`;for(let i=0;i<16;i++){const p=a[i],q=a[(i+1)%16];d+=`Q${p} ${(p[0]+q[0])/2},${(p[1]+q[1])/2}`;}return d+'Z';}
function inkPath(d,attrs={},parent=svg){return el('path',{d,fill:'none','stroke-linecap':'round','stroke-linejoin':'round',...attrs},parent);}
const beforeInkDefs=artDefs;
artDefs=function(){beforeInkDefs();const d=svg.querySelector('defs');let f=el('filter',{id:'watercolor-edge',x:'-6%',y:'-6%',width:'112%',height:'112%'},d);el('feTurbulence',{type:'fractalNoise',baseFrequency:'.15',numOctaves:3,seed:21,result:'noise'},f);el('feDisplacementMap',{in:'SourceGraphic',in2:'noise',scale:2.4,xChannelSelector:'R',yChannelSelector:'G'},f);
 f=el('filter',{id:'ink-paper',x:'0%',y:'0%',width:'100%',height:'100%'},d);el('feTurbulence',{type:'fractalNoise',baseFrequency:'.8',numOctaves:3,stitchTiles:'stitch'},f);el('feColorMatrix',{type:'matrix',values:'0 0 0 0 .35 0 0 0 0 .32 0 0 0 0 .23 0 0 0 .16 0'},f);
};
const beforeInkTree=tree;
tree=function(v){const species=(v.kind+' '+v.species).toLowerCase();if(/grass|wildflower|fern|groundcover/.test(species)){beforeInkTree(v);return;}
 const [x,wy]=v.position,y=-wy,r=v.radius||v.canopyRadius||2,seed=Math.round(x*173+wy*311),rand=inkRandom(seed),g=el('g',{'data-ink-tree':v.id||species}),pine=/pine|conifer|hemlock|spruce|fir/.test(species);
 el('ellipse',{cx:x+r*.25,cy:y+r*.45,rx:r*1.05,ry:r*.62,fill:'#4e5a3a',opacity:.13},g);
 if(pine){let d=`M${x},${y-r*1.5}`;for(let i=0;i<5;i++){const yy=y-r*1.05+i*r*.39,ww=r*(.25+i*.17);d+=`L${x-ww},${yy+r*.3}L${x-ww*.48},${yy+r*.2}`;}d+=`L${x+r*.92},${y+r*.82}`;for(let i=4;i>=0;i--){const yy=y-r*1.05+i*r*.39,ww=r*(.25+i*.17);d+=`L${x+ww*.48},${yy+r*.2}L${x+ww},${yy+r*.3}`;}d+='Z';inkPath(d,{fill:'#3e5634',stroke:'#2e442b','stroke-width':.25},g);let lines='';for(let i=0;i<11;i++){const yy=y-r*1.15+i*r*.17,ww=r*(.12+i*.065);lines+=`M${x-ww},${yy+.4}L${x},${yy-.15}L${x+ww*.65},${yy+.3}`;}inkPath(lines,{stroke:'#a1af75','stroke-width':.17,opacity:.7},g);inkPath(`M${x},${y+r*.65}v${r*.55}`,{stroke:'#47503a','stroke-width':.28},g);
 }else{
  const d=inkBlob(x,y,r,r*.92,seed),palette=['#a6b28a','#b3bc94','#bdc09a','#98a984','#c1c499'],color=palette[Math.floor(rand()*palette.length)];
  inkPath(d,{fill:color,stroke:'#43583b','stroke-width':.30},g);
  inkPath(inkBlob(x-r*.22,y-r*.2,r*.71,r*.67,seed+9),{fill:'#e5e7bb',opacity:.32},g);
  inkPath(d,{stroke:'#3b5036','stroke-width':.14,transform:`translate(${rand()*.4-.2} ${rand()*.45-.2})`,opacity:.75},g);
  let hatch='';for(let i=0;i<10;i++){const xx=x-r*.7+i*r*.14,yy=y+r*(.45+rand()*.24);hatch+=`M${xx},${yy}l${r*.12},${-r*(.2+rand()*.35)}`;}
  inkPath(hatch,{stroke:'#4b5c3e','stroke-width':.16,opacity:.8},g);
  inkPath(`M${x-r*.77},${y+r*.18}q${-r*.24},${-r*.7} ${r*.27},${-r*.85} M${x+r*.65},${y-r*.45}q${r*.35},${r*.3} ${r*.12},${r*.88}`,{stroke:'#43543a','stroke-width':.19},g);
  inkPath(`M${x},${y+r*.64}l.15,${r*.64}m-.1,-${r*.5}l-${r*.2},-${r*.27}`,{stroke:'#46503a','stroke-width':.23},g);
 }
 if(detail>=5)interactive(g,v.species||v.kind,()=>{const p=open(v.species||v.kind,'NATURAL LAYER');html('p',v.description||'Retained woodland and meadow planting.',p)});
};
roof=function(b){const g=el('g',{'data-ink-building':b.id}),a=bounds(b.polygon),x=a.x,y=-a.y-a.h,w=a.w,h=a.h,red=/barn|annex/.test(b.kind+' '+b.name.toLowerCase());
 poly(b.polygon.map(p=>[p[0]+.7,p[1]-.8]),'#58634730','none',0,g);
 poly(b.polygon,red?'#be8e76':'#d7c3a0','#515641',.42,g);
 inkPath(`M${x+w*.5},${y}h${w*.5}v${h}h-${w*.5}Z`,{fill:red?'#865b4a':'#82765a',opacity:.24},g);
 let lines='';for(let yy=y+.65;yy<y+h;yy+=.72){lines+=`M${x+.3},${yy}l${w*.44},.12 M${x+w*.55},${yy+.08}l${w*.41},-.15`;}
 inkPath(lines,{stroke:red?'#805d48':'#817153','stroke-width':.13,opacity:.8},g);
 inkPath(`M${x+w*.5},${y-.25}v${h+.5}`,{stroke:'#565942','stroke-width':.37},g);
 inkPath(`M${x+.2},${y+.2}h${w-.4}v${h-.4}h-${w-.4}Z`,{stroke:'#585d44','stroke-width':.17,opacity:.7},g);
 inkPath(`M${x},${y+h-1.2}h${w}v1.2h-${w}Z`,{fill:red?'#a16e56':'#e4d8b7',stroke:'#555b44','stroke-width':.22},g);
 inkPath(`M${x+w*.45},${y+h}v-1.2h${w*.1}v1.2`,{fill:'#526047'},g);
 if(!red){inkPath(`M${x+1},${y+h}v1.2h${w-2}v-1.2`,{stroke:'#5d6449','stroke-width':.25},g);el('rect',{x:x+w*.22,y:y+1,width:1.1,height:1.7,fill:'#9b9177',stroke:'#5c6049','stroke-width':.2},g);}
 interactive(g,'Explore '+b.name,()=>enter(b));if(detail>=2&&!/annex/.test(b.kind+' '+b.name.toLowerCase()))txt(x+w/2,a.y-3,red?'RED RESCUE BARN':'FARMHOUSE',3.1,svg,{class:'label'});
};
const beforeInkSite=renderSite;
renderSite=function(){beforeInkSite();svg.classList.add('pen-wash');
 const palette={'#e0e6cb':'#f8f5e9','#b7ca8b':'#e0e2bf','#9ab37d':'#b7c29a','#c9d39e':'#e0dfb8','#c4d298':'#dedfba','#a6c293':'#c4cfad','#6ca8a4':'#b4c9bb','#9cc8ba':'#cbd9c7','#7f9f75':'#849776','#96a777':'#b2b68f','#c3ab79':'#9f9273','#e8d3a2':'#ecdfbe'};
 for(const e of svg.querySelectorAll(':scope > path,:scope > polygon,:scope > rect'))for(const attr of ['fill','stroke']){const old=e.getAttribute(attr);if(palette[old])e.setAttribute(attr,palette[old]);}
 const base=svg.querySelector(':scope > polygon');if(base)base.setAttribute('filter','url(#watercolor-edge)');
 for(const e of svg.querySelectorAll(':scope > path[stroke="none"]'))if(e.getAttribute('fill')!=='transparent'){e.setAttribute('filter','url(#watercolor-edge)');e.setAttribute('opacity','.65');}
 const topo=svg.querySelector('#terrain-topography');if(topo){topo.setAttribute('opacity','.75');}
 // Preserve authored contour lines; paper texture is clipped to the actual estate.
 const tooth=el('rect',{x:0,y:-world.bounds.depth,width:world.bounds.width,height:world.bounds.depth,filter:'url(#ink-paper)',opacity:.60,'pointer-events':'none','aria-hidden':'true'});if(base)base.after(tooth);
 // Ink twin tracks and short fence posts convey drawn structure without altering routes.
 for(const p of world.paths){const loop=p.id==='rear-loop',d=flowingPath(loop?p.points.slice(0,-1):p.points,loop);const g=el('g',{'pointer-events':'none'});const track=inkPath(d,{stroke:'#87795d','stroke-width':.15,opacity:.7},g);track.setAttribute('transform','translate(.35 .2)');inkPath(d,{stroke:'#b1a080','stroke-width':.13,opacity:.8,transform:'translate(-.35 -.15)'},g);const anchor=svg.querySelector('[data-ink-tree]');if(anchor)anchor.before(g);}
 // Remove the earlier repeated fence dots and evenly sampled bank marks.
 for(const e of svg.querySelectorAll(':scope > circle[fill="#e9dbad"],:scope > polyline[stroke="#82795b"],:scope > path[stroke="#65875d"]'))e.remove();
 const fence=el('g',{'pointer-events':'none','data-art':'fences'}),fr=inkRandom(493);
 for(const parcel of world.parcels.filter(p=>p.fenced)){const a=parcel.polygon;for(let i=0;i<a.length;i++){const u=a[i],v=a[(i+1)%a.length],len=Math.hypot(v[0]-u[0],v[1]-u[1]);let last=null;for(let t=0;t<=len+.01;){const f=Math.min(1,t/len),x=u[0]+(v[0]-u[0])*f,y=-(u[1]+(v[1]-u[1])*f),height=.9+fr()*.75,lean=(fr()-.5)*.65;
  inkPath(`M${x},${y+.25}L${x+lean},${y-height}`,{stroke:'#48533c','stroke-width':.21+fr()*.12},fence);
  if(last)for(const level of [.25,.72]){const sag=fr()*.22;inkPath(`M${last.x},${last.y-level}Q${(last.x+x)/2},${(last.y+y)/2-level+sag} ${x},${y-level}`,{stroke:fr()<.2?'#93866a':'#637052','stroke-width':.17+fr()*.1},fence);}
  last={x,y};if(f===1)break;t=Math.min(len,t+2.6+fr()*1.6);
 }}}
 const firstTree=svg.querySelector('[data-ink-tree]');if(firstTree)firstTree.before(fence);
 // Reeds occur in distinct loose clumps with long bare stretches between them.
 const reeds=el('g',{'pointer-events':'none','data-art':'reeds'}),r=inkRandom(711),bank=world.water.brook.centerline;
 for(let j=1;j<bank.length-1;j++){if(r()>.29)continue;const [x,y]=bank[j],side=r()<.5?-1:1;for(let i=0;i<3+Math.floor(r()*6);i++){const xx=x+(r()-.5)*3.1,yy=-y+side*(3.25+r()*.8),h=.5+r()*1.7,bend=(r()-.5)*1.2;inkPath(`M${xx},${yy}q${bend*.2},${-h*.6} ${bend},${-h}`,{stroke:r()<.2?'#95845a':'#657451','stroke-width':.12+r()*.1,opacity:.5+r()*.4},reeds);if(r()<.22)inkPath(`M${xx+bend},${yy-h}l.05,-.38`,{stroke:'#7c6748','stroke-width':.24},reeds);}}
};
// Individual crop habits and broken soil patches replace striped bed symbols.
gardenBed=function(o){const [x,wy]=o.position,[w,h]=o.size,y=-wy-h,index=Number(o.id.slice(-1)),r=inkRandom(130+index),g=el('g',{'data-garden-bed':o.id});
 const count=index===4?3:1,gap=1.1,pw=(w-gap*(count-1))/count;
 for(let k=0;k<count;k++){const px=x+k*(pw+gap),yy=y+(r()-.5)*.16;
  inkPath(`M${px},${yy+.12}q${pw*.4},-.24 ${pw},.08l-.1,${h-.1}q-${pw*.5},.2 -${pw-.1},-.05Z`,{fill:['#897658','#8f7b5d','#a18a64','#8b7957','#a08b66'][index],stroke:'#b7a47d','stroke-width':.18},g);
  for(let j=0;j<7;j++){const xx=px+.2+r()*(pw-.4),sy=yy+.2+r()*(h-.4);inkPath(`M${xx},${sy}l.17,-.05`,{stroke:'#dfc89a','stroke-width':.09,opacity:.5},g);}
  if(index===1){inkPath(`M${px+.25},${yy+h/2}h${pw-.5}`,{stroke:'#bba178','stroke-width':.14},g);for(let t=.4;t<pw;t+=1.5)inkPath(`M${px+t},${yy+h}l.3,-${h+1}l.3,${h+1}`,{stroke:'#8b805e','stroke-width':.13},g);}
  const n=index===3?10:Math.floor(pw/(index===0?.65:.55))*2;
  for(let j=0;j<n;j++){const cols=Math.ceil(n/2),xx=px+.45+(j%cols+.15+r()*.3)*(pw-.9)/cols,cy=yy+h*(j<cols?.30:.70)+(r()-.5)*.25;
   if(index===2){for(let f=0;f<4;f++){const bend=(r()-.5)*.8;inkPath(`M${xx},${cy}q${bend},-.2 ${bend*1.6},-${.3+r()*.35}`,{stroke:f%2?'#83935b':'#536e46','stroke-width':.10},g);}}
   else {const leaves=index===3?5:index===0?5:3;for(let l=0;l<leaves;l++){const ang=r()*Math.PI*2,len=index===3?.5+r()*.48:index===0?.30+r()*.22:.23+r()*.22,dx=Math.cos(ang)*len,dy=Math.sin(ang)*len;inkPath(`M${xx},${cy}Q${xx+dx-dy*.5},${cy+dy+dx*.5} ${xx+dx*1.6},${cy+dy*1.6}Q${xx+dx+dy*.5},${cy+dy-dx*.5} ${xx},${cy}Z`,{fill:['#718855','#618251','#839459','#879b5b','#94a17b'][index],stroke:'#536846','stroke-width':.06},g);}if(index===4&&j%3===0)el('circle',{cx:xx+.12,cy:cy-.2,r:.10,fill:'#b599b2'},g);}
  }
 }
 // Timber ends and occasional markers give the garden a tended, imperfect rhythm.
 inkPath(`M${x-.2},${y-.1}l.2,${h+.25}`,{stroke:'#85785a','stroke-width':.25},g);
 el('rect',{x:x+.1,y:y-.35,width:.65,height:.35,rx:.04,fill:'#e8ddbf',stroke:'#8f8665','stroke-width':.07},g);
 interactive(g,o.name,()=>objectPanel(o,{name:'Kitchen garden',contents:world.outdoorContents.filter(x=>x.id.startsWith('veg-bed'))}));
};
const simpleInkRoof=roof;
roof=function(b){if(!/barn|annex/.test(b.kind+' '+b.name.toLowerCase())){simpleInkRoof(b);return;}
 const a=bounds(b.polygon),x=a.x,y=-a.y-a.h,w=a.w,h=a.h,annex=/annex/.test(b.id),g=el('g',{'data-ink-building':b.id}),r=inkRandom(annex?61:37),ridge=x+w*.46;
 poly(b.polygon.map(p=>[p[0]+.65,p[1]-.7]),'#58634730','none',0,g);
 // Broad roof planes, a deep eave, and a front gable make this read as a building.
 inkPath(`M${x},${y+.6}L${ridge},${y-.25}L${x+w},${y+.5}V${y+h-1.6}L${ridge},${y+h-2.3}L${x},${y+h-1.4}Z`,{fill:'#a69b7d',stroke:'#51553e','stroke-width':.34},g);
 inkPath(`M${ridge},${y-.25}L${x+w},${y+.5}V${y+h-1.6}L${ridge},${y+h-2.3}Z`,{fill:'#6f7660',opacity:.38},g);
 for(let i=0;i<13;i++){const yy=y+.8+r()*(h-3.5),start=x+.4+r()*w*.16,len=w*(.13+r()*.22);inkPath(`M${start},${yy}l${len},${-.15+r()*.3}`,{stroke:'#6a7158','stroke-width':.11,opacity:.5},g);}
 inkPath(`M${x},${y+h-1.4}L${ridge},${y+h-2.3}L${x+w},${y+h-1.6}V${y+h}H${x}Z`,{fill:annex?'#a5846b':'#a96750',stroke:'#5b5741','stroke-width':.27},g);
 inkPath(`M${ridge},${y}L${ridge},${y+h-2.3}`,{stroke:'#d3c8a2','stroke-width':.28},g);
 if(!annex){const doorX=x+w*.36,doorY=y+h-1.9;inkPath(`M${doorX},${y+h}V${doorY}h${w*.23}V${y+h}`,{fill:'#655f49',stroke:'#e2cfaa','stroke-width':.18},g);inkPath(`M${doorX},${doorY}l${w*.23},1.9m0,-1.9l-${w*.23},1.9`,{stroke:'#c8b58e','stroke-width':.11},g);
  // Cupola and weather vane: one recognizable landmark, not another repeated stripe.
  const cx=ridge,cy=y+h*.36;inkPath(`M${cx-1},${cy}v1.7h2V${cy}Z`,{fill:'#d3c5a0',stroke:'#545a43','stroke-width':.2},g);inkPath(`M${cx-1.4},${cy}l1.4,-1.2l1.4,1.2Z`,{fill:'#6e7961',stroke:'#505a40','stroke-width':.2},g);inkPath(`M${cx},${cy-1.2}v-1.3m-.7,.5h1.6`,{stroke:'#4d5840','stroke-width':.13},g);
 }
 interactive(g,'Explore '+b.name,()=>enter(b));if(detail>=2&&!annex)txt(x+w/2,a.y-3,'RED RESCUE BARN',3.1,svg,{class:'label'});
};
const beforeOverland=renderSite;
renderSite=function(){beforeOverland();if(detail<2)return;
 const g=el('g',{'data-art':'overland'}),r=inkRandom(8193),ink='#63734e';
 const inPoly=(x,y,a)=>{let c=false;for(let i=0,j=a.length-1;i<a.length;j=i++){const u=a[i],v=a[j];if((u[1]>y)!==(v[1]>y)&&x<(v[0]-u[0])*(y-u[1])/(v[1]-u[1])+u[0])c=!c;}return c;};
 const distance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);};
 const nearPath=(x,y,pad=2)=>world.paths.some(p=>p.points.slice(1).some((b,i)=>distance(x,y,p.points[i],b)<(p.width||1.5)/2+pad));
 const safe=(x,y,pad=1)=>!world.buildings.some(b=>{const a=bounds(b.polygon);return x>a.x-pad&&x<a.x+a.w+pad&&y>a.y-pad&&y<a.y+a.h+pad;})&&!world.parcels.some(p=>(p.id==='vegetables'||p.fenced)&&inPoly(x,y,p.polygon))&&!nearPath(x,y,pad)&&!world.water.brook.centerline.slice(1).some((b,i)=>distance(x,y,world.water.brook.centerline[i],b)<4);
 function stone(x,y,size=1,parent=g){inkPath(inkBlob(x,-y,size,size*.58,Math.round(x*87+y*73)),{fill:'#b7b6a0',stroke:'#7c8269','stroke-width':.16},parent);inkPath(`M${x-size*.55},${-y-.1}l${size*.65},-${size*.25}`,{stroke:'#e1dfc5','stroke-width':.17},parent);}
 function tuft(x,y,size=1,parent=g){const paths=[];for(let j=0;j<4;j++){const dx=(r()-.5)*size,dy=.35+r()*size;paths.push(`M${x},${-y}q${dx*.4},-${dy*.6} ${dx},-${dy}`);}inkPath(paths.join(' '),{stroke:r()<.3?'#a19765':ink,'stroke-width':.12+r()*.07,opacity:.6+r()*.3},parent);}
 // Patchy meadow margins: different density, scale and flowering in each patch.
 const patches=[[79,89,9],[83,109,8],[65,113,5],[91,35,10],[78,57,5],[126,35,11],[151,111,4],[47,112,5],[110,145,7],[58,137,6]];
 for(const [cx,cy,rad]of patches){inkPath(inkBlob(cx,-cy,rad,rad*.65,Math.round(cx*3)),{fill:'#b7c08d',opacity:.2,'pointer-events':'none'},g);for(let i=0;i<24;i++){const a=r()*6.28,rr=Math.sqrt(r())*rad,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.65;if(!safe(x,y,1.5))continue;tuft(x,y,.5+r()*.8);if(i%4===0){const col=i%3?'#e3d5a1':'#c5b0b1';for(let k=0;k<3;k++)el('circle',{cx:x+(r()-.5)*.9,cy:-y-r()*.8,r:.15+r()*.09,fill:col,stroke:'#8a8c64','stroke-width':.05},g);}}}
 // Understory stays tied to existing woodland, not scattered across the lawn.
 for(let i=0;i<world.vegetation.length;i+=7){const v=world.vegetation[i],[x,y]=v.position,dx=2+r()*2,xx=x+dx,yy=y-1.6;if(!safe(xx,yy,1)||xx>177||xx<3||yy<3||yy>177)continue;inkPath(inkBlob(xx,-yy,1.8+r()*1.5,.9+r(),i+300),{fill:'#899970',opacity:.32},g);for(let j=0;j<5;j++)tuft(xx+(r()-.5)*3,yy+(r()-.5)*1.5,.5+r());if(i%21===0)stone(xx+1,yy-.5,.45+r()*.5);}
 // Fallen wood with bark, a cut end and branches: sparse, deliberately placed.
 for(const [x,y,angle]of [[25,57,-18],[156,47,24],[37,151,9]]){if(!safe(x,y,2))continue;const log=el('g',{transform:`translate(${x} ${-y}) rotate(${angle})`},g);inkPath('M-2,-.35Q0,-.6 2,.05L2,.75Q0,.3 -2,.45Z',{fill:'#948569',stroke:'#666b4e','stroke-width':.18},log);inkPath('M-1.6,-.1L1.6,.3M-.6,.15l.4,-.8l.7,-.2',{stroke:'#5a634a','stroke-width':.14},log);el('ellipse',{cx:2,cy:.4,rx:.22,ry:.37,fill:'#c4af85',stroke:'#757254','stroke-width':.12},log);}
 // Bank gravel and low vegetation respect the measured brook centerline.
 const brook=world.water.brook.centerline;for(let i=1;i<brook.length-1;i+=2){const [x,y]=brook[i];if(nearPath(x,y,4))continue;const side=i%3?1:-1;for(let j=0;j<2+Math.floor(r()*4);j++){const xx=x+(r()-.5)*3,yy=y+side*(3.1+r()*1.5);stone(xx,yy,.25+r()*.55);}if(i%4===1)tuft(x+1,y+side*4.5,1.3);}
 // A worn apron belongs outside the barn doors; straw and stacked wood stay at its edge.
 inkPath(inkBlob(112,-56,9,3.5,211),{fill:'#d5c8a6',opacity:.45,filter:'url(#watercolor-edge)'},g);
 for(let i=0;i<20;i++){const x=106+r()*12,y=54+r()*4;if(nearPath(x,y,.6))continue;inkPath(`M${x},${-y}l${.3+r()*.6},${(r()-.5)*.4}`,{stroke:'#b19a65','stroke-width':.13,opacity:.65},g);}
 for(let j=0;j<4;j++)inkPath(`M${123+j*.16},${-61+j*.35}l3.1,-.18`,{stroke:j%2?'#a18b65':'#80795a','stroke-width':.35},g);
 // Small stepping stones and paths connect the garden patches into a working garden.
 inkPath(flowingPath([[43,78],[44,83.5],[56.3,83.5],[56.5,90.8],[66,91]]),{stroke:'#e2d5b2','stroke-width':1.1,opacity:.8},g);
 for(const [x,y]of [[44.5,79],[44.3,81],[44.5,85],[44.4,87],[44.6,91]])stone(x,y,.5);
 const anchor=svg.querySelector('[data-garden-bed], [data-ink-tree]');if(anchor)anchor.before(g);
 // Inspectable outdoor areas describe authored visual details honestly.
 for(const d of world.landDetails||[]){const [x,y]=d.position,hot=el('g',{'data-land-detail':d.id});el('circle',{cx:x,cy:-y,r:3,fill:'#f5efdb',opacity:.6,stroke:'#8c9672','stroke-width':.2},hot);inkPath(`M${x-.7},${-y+.6}q.3,-1.8 1.3,-1.5m-1.3,1.5q1,-.1 1.5,-.8`,{stroke:'#637951','stroke-width':.23},hot);interactive(hot,'Explore '+d.name,()=>{const p=open(d.name,'OUT ON THE LAND');html('p',d.description,p);card(p,'Look closer','Explore this outdoor area',()=>{close();const w=35,h=w*svg.clientHeight/svg.clientWidth;setView({x:x-w/2,y:-y-h/2,w,h});});});}
};
const beforeOutdoorNotes=notes;
notes=function(){beforeOutdoorNotes();const p=$('drawer-content'),section=html('div',null,p);p.prepend(section);html('h3','Explore the outdoor landscape',section);for(const d of world.landDetails||[])card(section,d.name,d.description,()=>{site();const [x,y]=d.position,w=38,h=w*svg.clientHeight/svg.clientWidth;setView({x:x-w/2,y:-y-h/2,w,h});});};
// Close inspection keeps landscape labels readable without letting them obscure the artwork.
const beforeArtView=setView;
setView=function(v){beforeArtView(v);if(building)return;for(const t of svg.querySelectorAll('text.label')){if(!t.dataset.baseSize)t.dataset.baseSize=t.getAttribute('font-size');t.setAttribute('font-size',Math.min(+t.dataset.baseSize,13*v.w/svg.clientWidth));}};
