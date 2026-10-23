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

'use strict';
// Piecewise-linear elevation contours from the authored grid, not decorative lines.
function clipHeight(poly,z,above){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=above?a[2]>=z:a[2]<=z,ib=above?b[2]>=z:b[2]<=z;if(ia)out.push(a);if(ia!==ib){const t=(z-a[2])/(b[2]-a[2]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),z]);}}return out;}
function terrainArtwork(){const grid=world.terrain.grid,heights=grid.heights,step=grid.spacing,origin=grid.origin||[0,0],g=el('g',{'pointer-events':'none','aria-hidden':'true',id:'terrain-topography'}),bands=el('g',{opacity:.38},g),ink=el('g',{},g),values=heights.flat(),lo=Math.floor(Math.min(...values)),hi=Math.ceil(Math.max(...values)),segments=new Map();
 const colors=['#74977d','#88a17d','#9bad83','#afba8b','#c1c594','#d2cea4','#dfd6b4'];
 const defs=svg.querySelector('defs'),mask=el('mask',{id:'terrain-clearings',maskUnits:'userSpaceOnUse',x:0,y:-world.bounds.depth,width:world.bounds.width,height:world.bounds.depth},defs);el('rect',{x:0,y:-world.bounds.depth,width:world.bounds.width,height:world.bounds.depth,fill:'white'},mask);for(const b of world.buildings)poly(b.polygon,'black','black',.8,mask);g.setAttribute('mask','url(#terrain-clearings)');
 for(let j=0;j<grid.rows-1;j++)for(let i=0;i<grid.cols-1;i++){const p=(dx,dy)=>[origin[0]+(i+dx)*step,origin[1]+(j+dy)*step,heights[j+dy][i+dx]],a=p(0,0),b=p(1,0),c=p(1,1),d=p(0,1);for(const tri of [[a,b,c],[a,c,d]]){
  const min=Math.min(...tri.map(p=>p[2])),max=Math.max(...tri.map(p=>p[2]));
  for(let z=Math.floor(min);z<=Math.floor(max);z++){let region=clipHeight(clipHeight(tri,z,true),z+1,false);if(region.length>=3)poly(region,colors[Math.min(colors.length-1,Math.max(0,z-lo))],'none',0,bands);}
  for(let z=Math.ceil(min*2)/2;z<max;z+=.5){let hits=[];for(let k=0;k<3;k++){let u=tri[k],v=tri[(k+1)%3];if((u[2]<=z&&v[2]>z)||(v[2]<=z&&u[2]>z)){let t=(z-u[2])/(v[2]-u[2]);hits.push([u[0]+t*(v[0]-u[0]),u[1]+t*(v[1]-u[1])]);}}if(hits.length===2){let s=segments.get(z)||[];s.push(hits);segments.set(z,s);}}
 }}
 for(const [z,segs]of segments){let major=Number.isInteger(z);el('path',{d:segs.map(s=>`M${s[0][0]},${-s[0][1]}L${s[1][0]},${-s[1][1]}`).join(' '),fill:'none',stroke:major?'#526d53':'#6f805c','stroke-width':major?.27:.13,opacity:major?.65:.4,'stroke-linecap':'round'},ink);if(major){const candidate=segs.find(s=>s[0][0]>30&&s[0][0]<40);if(candidate){const [x,y]=candidate[0];txt(x,y,`${z} m`,2.0,ink,{'paint-order':'stroke',stroke:'#dbe0bb','stroke-width':.65,fill:'#52664f'});}}}
 const water=[...svg.querySelectorAll(':scope > path')].find(p=>p.getAttribute('stroke')==='#7f9f75');if(water)water.before(g);
}
