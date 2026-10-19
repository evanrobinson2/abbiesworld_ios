/* Seeded pen-and-wash drawing layer. Geometry and connectivity remain in RanchEngine. */
(function(root){
const NS='http://www.w3.org/2000/svg';
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function render(svg,layout,routes,onSelect){
 const s=layout.state,W=s.width,D=s.depth,rng=random(s.seed+7021),ink='#344735';
 const n=(tag,attrs={},parent=svg)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.appendChild(e);return e;};
 const path=(d,attrs={},parent=svg)=>n('path',{d,fill:'none','stroke-linecap':'round','stroke-linejoin':'round',...attrs},parent);
 const label=(value,x,y,size=3,parent=svg)=>{const e=n('text',{x,y,'font-size':size,'text-anchor':'middle',class:'map-label'},parent);e.textContent=value;return e;};
 const sketch=(pts,parent=svg,width=.35,color=ink)=>{const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+','+p[1].toFixed(2)).join(' ');path(d,{stroke:color,'stroke-width':width,opacity:.85},parent);path(pts.map((p,i)=>(i?'L':'M')+(p[0]+(rng()-.5)*.55).toFixed(2)+','+(p[1]+(rng()-.5)*.55).toFixed(2)).join(' '),{stroke:color,'stroke-width':width*.5,opacity:.45},parent);};
 function blob(x,y,rx,ry,seed){const rr=random(seed),pts=[];for(let i=0;i<16;i++){const a=i*Math.PI/8,v=.89+rr()*.18;pts.push([x+Math.cos(a)*rx*v,y+Math.sin(a)*ry*v]);}let d=`M ${(pts[0][0]+pts[15][0])/2},${(pts[0][1]+pts[15][1])/2}`;for(let i=0;i<16;i++){const p=pts[i],q=pts[(i+1)%16];d+=` Q ${p[0]},${p[1]} ${(p[0]+q[0])/2},${(p[1]+q[1])/2}`;}return d+' Z';}
 const defs=n('defs');
 const wash=n('filter',{id:'wash',x:'-15%',y:'-15%',width:'130%',height:'130%'},defs);
 n('feTurbulence',{type:'fractalNoise',baseFrequency:'.12',numOctaves:3,seed:s.seed%100,result:'noise'},wash);
 n('feDisplacementMap',{in:'SourceGraphic',in2:'noise',scale:2.2,xChannelSelector:'R',yChannelSelector:'G'},wash);
 const grain=n('filter',{id:'paper-grain',x:'0%',y:'0%',width:'100%',height:'100%'},defs);
 n('feTurbulence',{type:'fractalNoise',baseFrequency:'.85',numOctaves:3,stitchTiles:'stitch',result:'noise'},grain);
 n('feColorMatrix',{type:'matrix',values:'0 0 0 0 .30  0 0 0 0 .28  0 0 0 0 .20  0 0 0 .14 0'},grain);
 const clip=n('clipPath',{id:'land-clip'},defs);n('rect',{x:-5,y:-5,width:W+10,height:D+10,rx:9},clip);
 const ground=n('g',{'clip-path':'url(#land-clip)','aria-hidden':'true'});
 // Overlapping translucent washes leave a deckled paper edge and quiet open pasture.
 const land=`M -3 5 Q ${W*.2} -5 ${W*.5} -2 T ${W+3} 5 L ${W+2} ${D*.45} Q ${W+6} ${D*.8} ${W-2} ${D+2} L ${W*.4} ${D+3} Q -5 ${D+6} -3 ${D-3} Z`;
 path(land,{fill:'#dce0b8',opacity:.8,filter:'url(#wash)'},ground);
 for(let i=0;i<17;i++){const x=rng()*W,y=rng()*D;path(blob(x,y,12+rng()*24,9+rng()*24,s.seed+i),{fill:i%3?'#b3bf86':'#efe1ad',opacity:.12,filter:'url(#wash)'},ground);}
 // Ink grass tufts and dry-brush flecks, kept sparse in open areas.
 let grass='';for(let i=0;i<Math.round(W*D/150);i++){const x=3+rng()*(W-6),y=3+rng()*(D-6);if(layout.items.some(a=>x>a.x-2&&x<a.x+a.w+2&&y>a.y-2&&y<a.y+a.d+2))continue;grass+=`M${x},${y}l-.3,-.8m.6,.9l.2,-1.1m.3,1.1l.5,-.6 `;}
 path(grass,{stroke:'#687b4c','stroke-width':.16,opacity:.38},ground);
 if(layout.water){const a=layout.water,x=a.x+a.w/2,y=a.y+a.d/2;
  path(blob(x,y,a.w/2+1.5,a.d/2+1.5,s.seed+63),{fill:'#9eac80',opacity:.5,filter:'url(#wash)'});
  const d=blob(x,y,a.w/2,a.d/2,s.seed+63);path(d,{fill:'#bdcfbf',stroke:'#627c70','stroke-width':.42});path(d,{fill:'#a8c3bb',opacity:.3,filter:'url(#wash)'});
  for(let i=0;i<8;i++){const yy=y-a.d*.30+i*a.d*.08,ww=Math.sqrt(Math.max(0,1-((yy-y)/(a.d*.5))**2))*a.w*.36;sketch([[x-ww,yy],[x+ww*.4,yy+.3]],svg,.15,'#668980');}
  label('pond',x,y+1,2.6);
 }
 if(s.terrain==='creek'){const pts=[];for(let y=0;y<=D;y+=2)pts.push([W*.77+Math.sin(y/D*6)*W*.035,y]);const d=pts.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ');path(d,{stroke:'#a7b38a','stroke-width':13,opacity:.5,filter:'url(#wash)'});path(d,{stroke:'#6b8172','stroke-width':9.4});path(d,{stroke:'#c6d4c5','stroke-width':8.6});for(const dx of [-2,0,2])path(pts.map((p,i)=>(i?'L':'M')+(p[0]+dx)+','+p[1]).join(' '),{stroke:'#748f83','stroke-width':.2,opacity:.65});}
 // Keep the exact collision-tested routes; round their corners visually without cutting across obstacles.
 if(routes)for(const route of layout.paths){const pts=route.points.map(q=>[q.x,q.y]),d=pts.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ');path(d,{stroke:'#c4ac86','stroke-width':4.4,opacity:.35,filter:'url(#wash)'});path(d,{stroke:'#8b8266','stroke-width':3.2});path(d,{stroke:'#eee1bc','stroke-width':2.7});path(d,{stroke:'#bd9e76','stroke-width':.22,'stroke-dasharray':'3 .9',opacity:.8});}
 const palette=s.motif==='summer'?['#98ad79','#b0be8b','#80986c']:s.motif==='halloween'?['#aaa86a','#bb995e','#809072']:['#b0ba86','#a4b08b','#c1bd86'];
 function tree(x,y,r,seed,parent=svg){const rr=random(seed),pine=rr()<.22;
  path(blob(x+r*.38,y+r*.55,r*1.1,r*.55,seed),{fill:'#536347',opacity:.16},parent);
  if(pine){const pts=[[x,y-r*1.55],[x-r*.34,y-r*.8],[x-r*.15,y-r*.81],[x-r*.66,y-r*.12],[x-r*.40,y-r*.14],[x-r*.88,y+r*.60],[x+r*.83,y+r*.60],[x+r*.42,y-r*.12],[x+r*.60,y-r*.09],[x+r*.16,y-r*.83],[x+r*.32,y-r*.80],[x,y-r*1.55]];path(pts.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ')+'Z',{fill:'#405e3c',stroke:'#30482e','stroke-width':.27},parent);let needles='';for(let j=0;j<9;j++){const yy=y-r*1.15+j*r*.19,span=(j+2)/12*r*.8;needles+=`M${x-span},${yy+.4}l${span},-.55l${span*.6},.5 `;}path(needles,{stroke:'#9cae76','stroke-width':.21,opacity:.8},parent);path(`M${x},${y+r*.5}v${r*.65}`,{stroke:ink,'stroke-width':.32},parent);return;}
  const d=blob(x,y-r*.12,r,r*1.04,seed),fill=palette[Math.floor(rr()*palette.length)];path(d,{fill,opacity:.85,stroke:'#46583b','stroke-width':.35},parent);
  path(blob(x-r*.23,y-r*.33,r*.7,r*.72,seed+2),{fill:'#e4e6b5',opacity:.38},parent);
  path(d,{stroke:'#334b36','stroke-width':.16,transform:`translate(${(rr()-.5)*.5} ${(rr()-.5)*.6})`,opacity:.7},parent);
  let hatching='';for(let j=0;j<8;j++){const xx=x-r*.65+j*r*.17,yy=y+r*(.5+rr()*.18);hatching+=`M${xx},${yy}l${r*.16},${-r*(.25+rr()*.30)} `;}path(hatching,{stroke:'#4c6041','stroke-width':.18,opacity:.7},parent);
  path(`M${x},${y+r*.65}l.1,${r*.62}m-.1,-${r*.45}l-${r*.24},-${r*.35}`,{stroke:ink,'stroke-width':.25},parent);
 }
 for(const t of [...layout.trees].sort((a,b)=>a.y-b.y))tree(t.x,t.y,t.r,Math.round(t.x*173+t.y*233)+s.seed);
 const labels=[];
 for(const a of layout.items){const g=n('g',{class:'land-object',tabindex:0,role:'button','aria-label':a.name,'data-id':a.id});g.onclick=()=>onSelect(a.id);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(a.id);}};
  const x=a.x,y=a.y,w=a.w,h=a.d;
  if(a.kind==='building'){
   path(blob(x+w/2,y+h/2,w*.85,h*.83,s.seed+x),{fill:'#fff6da',opacity:.65,filter:'url(#wash)'},g);
   path(`M${x+1},${y+1}h${w}v${h}l-1.8,1.3h-${w}Z`,{fill:'#697352',opacity:.22},g);
   const roof=a.id==='barn'?'#c4a184':a.id==='guest'?'#b7b2a0':'#dbc19a';
   path(`M${x},${y}h${w}v${h}h-${w}Z`,{fill:roof,stroke:'#545441','stroke-width':.45,class:'outline'},g);
   path(`M${x+w*.5},${y}h${w*.5}v${h}h-${w*.5}Z`,{fill:'#7b7859',opacity:.24},g);
   sketch([[x+w/2,y-.5],[x+w/2+.2,y+h+.3]],g,.4,'#5d6049');
   let roofLines='';for(let yy=y+1.2;yy<y+h;yy+=1.05){roofLines+=`M${x+.4},${yy}l${w*.43},${(rng()-.5)*.3} M${x+w*.55},${yy+.2}l${w*.40},-.15 `;}
   path(roofLines,{stroke:'#796b51','stroke-width':.17,opacity:.75},g);
   // A shallow front wall, porch posts, a chimney, and a worn arrival apron.
   path(`M${x},${y+h-1.8}h${w}v1.8h-${w}Z`,{fill:'#ece1c2',stroke:'#61614d','stroke-width':.25},g);
   path(`M${a.gate.x-1},${y+h}v-1.6h2v1.6`,{fill:'#5a624d',stroke:ink,'stroke-width':.2},g);
   if(a.id==='house'){sketch([[x+1,y+h],[x+1,y+h+1.3],[x+w-1,y+h+1.3],[x+w-1,y+h]],g,.25);for(const xx of [x+1,x+w-1])path(`M${xx},${y+h+.3}v1.8`,{stroke:ink,'stroke-width':.25},g);}
   n('rect',{x:x+w*.22,y:y+1,width:1.3,height:2,fill:'#8e846d',stroke:ink,'stroke-width':.23},g);
  }else{
   // Chamfered corners soften the silhouette while staying within the validated footprint.
   const pts=[[x+2,y],[x+w-2,y+.3],[x+w,y+2],[x+w-.3,y+h-2],[x+w-2,y+h],[x+2,y+h-.2],[x,y+h-2],[x+.2,y+2],[x+2,y]];
   const d=pts.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ')+'Z';
   path(d,{fill:a.kind==='garden'?'#d0c2a0':'#cbd3a7',opacity:.42,class:'outline',stroke:'#687154','stroke-width':.25},g);
   if(a.kind!=='orchard'){
    sketch(pts,g,.32,'#52604a');sketch(pts.map(p=>[p[0],p[1]-.8]),g,.20,'#687157');
    let posts='';for(let i=0;i<pts.length-1;i++){const p=pts[i],q=pts[i+1],len=Math.hypot(q[0]-p[0],q[1]-p[1]);for(let t=0;t<len;t+=3){const xx=p[0]+(q[0]-p[0])*t/len,yy=p[1]+(q[1]-p[1])*t/len;posts+=`M${xx},${yy+.3}l-.25,-1.8 `;}}path(posts,{stroke:'#45533c','stroke-width':.35},g);
   }
   if(a.kind==='garden'){for(let yy=y+2;yy<y+h-1;yy+=2.6){path(`M${x+2},${yy}h${w-4}`,{stroke:'#a19166','stroke-width':1.5},g);path(`M${x+2.2},${yy-.2}h${w-4.4}`,{stroke:'#6f7f48','stroke-width':.65,'stroke-dasharray':'.3 .7'},g);}}
   if(a.kind==='orchard')for(let xx=x+4;xx<x+w-2;xx+=6)for(let yy=y+4;yy<y+h-2;yy+=6){tree(xx,yy,2.4,Math.round(xx*21+yy*53),g);for(let j=0;j<3;j++)n('circle',{cx:xx+(j-1)*.8,cy:yy+(j%2)*.7,r:.27,fill:'#a86c43'},g);}
   if(a.kind==='coop'){path(`M${x+2},${y+2}h5v4h-5Z`,{fill:'#c8ab81',stroke:ink,'stroke-width':.3},g);for(let i=0;i<5;i++)n('ellipse',{cx:x+3+i*1.5,cy:y+8+(i%2),rx:.65,ry:.45,fill:'#faf4db',stroke:'#6d7456','stroke-width':.18},g);}
   if(a.kind==='field')n('rect',{x:x+2,y:y+2,width:3.5,height:1.4,rx:.5,fill:'#afc4b5',stroke:'#5b7263','stroke-width':.23},g);
   path(`M${a.gate.x-1.3},${a.gate.y}h2.6`,{stroke:'#f6ebcd','stroke-width':1.5},g);
  }
  labels.push({a,g});
  if(s.motif==='halloween'&&a.kind==='building')for(let i=0;i<3;i++)n('circle',{cx:a.gate.x+3+i*1.4,cy:a.gate.y+1,r:.65,fill:'#c78a49',stroke:'#735c35','stroke-width':.2},g);
  if(a.id==='house'&&s.extras.includes('party')){sketch([[x-1,y-3],[x+w+1,y-3]],g,.2);for(let i=0;i<6;i++)path(`M${x+i*w/6},${y-3}l1.5,0l-.6,1.8Z`,{fill:i%2?'#b28b62':'#859b7e'},g);}
 }
 for(const a of layout.animals){const g=n('g',{transform:`translate(${a.x} ${a.y}) rotate(${a.angle})`,'aria-hidden':'true'});path('M-1.5,-.5 Q0,-1.1 1.1,-.5 L1.8,-1.1 L2,-.7 L1.6,.1 L.8,.4 L-1.4,.5Z',{fill:a.kind==='cattle'?'#e9e3ce':'#8d8060',stroke:'#4d5840','stroke-width':.2},g);path('M-1,-.5v-.7M.7,-.5v-.6M-1,.4v.7M.6,.4v.7M-1.5,0l-.8,-.5',{stroke:'#4d5840','stroke-width':.22},g);if(a.kind==='cattle')n('ellipse',{cx:-.4,rx:.6,ry:.5,fill:'#687059'},g);}
 const house=layout.items.find(a=>a.id==='house');if(house&&s.extras.includes('whimsy'))for(let i=0;i<8;i++){const a=i*Math.PI/4;n('circle',{cx:house.x+house.w/2+Math.cos(a)*2.8,cy:house.y+house.d+3+Math.sin(a)*1.3,r:.35,fill:i%2?'#d7b670':'#ab8a9b'});}
 // Fine paper tooth is a separate noninteractive layer; text stays crisp above it.
 n('rect',{x:-5,y:-5,width:W+10,height:D+10,filter:'url(#paper-grain)','pointer-events':'none',opacity:.65},ground);
 for(const {a,g}of labels){label(a.name,a.x+a.w/2,a.y-2.6,3.2,g);}
 label('ARRIVAL',layout.gate.x,D+6,2.5);label('N ↑',W+6,0,3);label(`${W} m`,W/2,-8,2.7);label(`${D} m`,W+8,D/2,2.7);
 sketch([[5,D+10],[25,D+10]],svg,.35);label('20 m',15,D+15,2.5);
}
root.RanchArt={render};
})(window);
