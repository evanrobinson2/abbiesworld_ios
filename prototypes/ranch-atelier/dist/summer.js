'use strict';
let atmosphereOn=!matchMedia('(prefers-reduced-motion: reduce)').matches;
const summerSite=renderSite,summerInside=renderBuilding;
function summerDefs(){let d=svg.querySelector('defs'),g=el('linearGradient',{id:'summer-light',x1:'0',y1:'0',x2:'1',y2:'1'},d);el('stop',{offset:'0%','stop-color':'#fff0b1','stop-opacity':.18},g);el('stop',{offset:'100%','stop-color':'#456b69','stop-opacity':.07},g);}
renderSite=function(){summerSite();summerDefs();
 // Fixed northwest light: all additional shadows project southeast.
 const land=svg.querySelector('polygon');const shadows=el('g',{'pointer-events':'none'});land.after(shadows);
 for(const b of world.buildings){let dx=b.height*.65,dy=-b.height*.45;poly(b.polygon.map(p=>[p[0]+dx,p[1]+dy]),'#435c4933','none',0,shadows);}
 for(const v of world.vegetation){let [x,y]=v.position,r=v.radius||1;el('ellipse',{cx:x+r*.55,cy:-y+r*.55,rx:r*.95,ry:r*.65,fill:'#3f6544',opacity:.09},shadows);}
 // Put ground shadows above land washes, below objects and crowns.
 const paths=[...svg.querySelectorAll(':scope > path')];const firstWater=paths.find(p=>p.getAttribute('stroke')==='#7f9f75');if(firstWater)firstWater.before(shadows);
 const bg=world.water.brook.centerline;
 const motion=el('g',{'pointer-events':'none',class:'summer-motion'});
 for(let i=1;i<bg.length-1;i+=4){const [x,y]=bg[i];let p=el('path',{d:`M${x-.8} ${-y}q.6 -.25 1.4 0`,fill:'none',stroke:'#eef6d9','stroke-width':.15,opacity:.6,class:'water-glint',style:`animation-delay:-${i%7}s`},motion);}
 // Local vegetation motion only, avoiding whole-scene wobble.
 let trees=[...svg.querySelectorAll(':scope > g')].filter(g=>g.querySelector('ellipse')&&g.querySelector('path')&&!g.hasAttribute('transform')&&g!==shadows&&g!==motion);
 trees.forEach((g,i)=>{if(i%5===0){g.classList.add('summer-crown');g.style.animationDelay=`-${i%11}s`;}});
 const br=bounds(world.bridge.polygon);poly([[br.x+.5,br.y],[br.x+br.w+1.3,br.y],[br.x+br.w+1.3,br.y+br.h],[br.x+.5,br.y+br.h]],'#355b4820','none').setAttribute('pointer-events','none');
 for(let i=0;i<bg.length;i+=2){let [x,y]=bg[i];for(let s of [-1,1])el('path',{d:`M${x} ${-y+s*3.4}q.4 -.7 .7 -.2q.2 -.8 .6 -.3`,fill:'none',stroke:'#65875d','stroke-width':.15,'pointer-events':'none'});}
 el('rect',{x:0,y:-world.bounds.depth,width:world.bounds.width,height:world.bounds.depth,fill:'url(#summer-light)','pointer-events':'none'});
 svg.classList.toggle('motion-off',!atmosphereOn);
};
renderBuilding=function(){summerInside();for(const r of building.rooms){const b=bounds(r.polygon);for(const win of r.windows||[]){let [x,y]=win.position;if(win.orientation==='horizontal'&&Math.abs(y-b.y-b.h)<.1){let p=poly([[x-.5,y-.15],[x+.5,y-.15],[Math.min(x+1.5,b.x+b.w-.2),Math.max(y-2,b.y+.2)],[Math.max(x-.1,b.x+.2),Math.max(y-2,b.y+.2)]],'#fff8c04a','none');p.setAttribute('pointer-events','none');}}}};
const originalNotes=notes;
notes=function(){originalNotes();const p=$('drawer-content'),m=measureWorld(world);const section=html('div',null,p);p.prepend(section);html('h3','World scale · measured, not rated',section);card(section,`${m.units} units · order 10^${m.order}`,`Logarithmic index ${m.index}. Each +1 means ten times as many declared elements.`);card(section,'What counts',m.countingRule);card(section,'Count breakdown',describe(m.counts));card(section,`${m.objectSpecificationCoverage}% object field coverage`,m.coverageScope);card(section,'Coherence',m.coherence);let toggle=html('button',atmosphereOn?'Pause atmosphere':'Resume atmosphere',section,'action');toggle.onclick=()=>{atmosphereOn=!atmosphereOn;svg.classList.toggle('motion-off',!atmosphereOn);toggle.textContent=atmosphereOn?'Pause atmosphere':'Resume atmosphere';};};
$('journal').onclick=()=>world&&notes();$('about').onclick=()=>world&&notes();
document.addEventListener('visibilitychange',()=>svg.classList.toggle('page-hidden',document.hidden));
