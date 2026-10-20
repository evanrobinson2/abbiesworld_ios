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
const terrainSite=renderSite;
renderSite=function(){terrainSite();terrainArtwork();svg.querySelector('rect[fill="url(#summer-light)"]')?.remove();$('scale').textContent='CONTOURS 0.5 m · TONE BANDS 1 m · NORTH UP';};
const terrainInterior=renderBuilding;
renderBuilding=function(){terrainInterior();$('scale').textContent='METRES · NORTH UP';};
