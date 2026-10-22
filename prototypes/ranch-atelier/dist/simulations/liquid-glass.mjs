// Liquid glass behaviour for the floating control layer: a highlight that follows the pointer,
// and on Chromium desktop a per-panel lens that bends the world near each panel's rounded edge.
// Styling lives in liquid-glass.css; this only marks panels and keeps their lens maps sized.
const PANELS='header.grouped-toolbar,#scene-tools-drawer,#inspection,#advanced-panel,.facet-picker,#ranch-notices,#compact-controls,#scene-build-progress,#site-warning-details,#scene-generator-picker,#tile-chooser,#developer-overlay,#compact-scene-summary,#saved-scenes,#app-settings,#app-jukebox,.tile-carry-label';
const NS='http://www.w3.org/2000/svg';

// Displacement map for a rounded rectangle: neutral grey in the middle, pushed toward the
// centre within `edge` px of the border so the world behind looks magnified through a thick rim.
export function lensMap(w,h,r,edge,scale=.25){
 const cw=Math.max(8,Math.round(w*scale)),ch=Math.max(8,Math.round(h*scale)),data=new Uint8ClampedArray(cw*ch*4);
 const hx=w/2-r,hy=h/2-r;
 for(let j=0;j<ch;j++)for(let i=0;i<cw;i++){
  const px=(i+.5)/cw*w-w/2,py=(j+.5)/ch*h-h/2,qx=Math.abs(px)-hx,qy=Math.abs(py)-hy;
  let nx,ny,d;
  if(qx>0&&qy>0){const l=Math.hypot(qx,qy)||1;nx=qx/l*Math.sign(px);ny=qy/l*Math.sign(py);d=r-l;}
  else if(qx>qy){nx=Math.sign(px);ny=0;d=r-qx;}else{nx=0;ny=Math.sign(py);d=r-qy;}
  const m=d<edge?(1-Math.max(0,d)/edge)**2:0,k=(j*cw+i)*4;
  data[k]=128-nx*m*127;data[k+1]=128-ny*m*127;data[k+2]=128;data[k+3]=255;
 }
 return {width:cw,height:ch,data};
}

export function initLiquidGlass({doc=document,win=window}={}){
 if(doc.documentElement.dataset.liquidGlass)return;doc.documentElement.dataset.liquidGlass='1';
 const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./liquid-glass.css',import.meta.url).href;doc.head.append(link);
 const refract=!!win.navigator.userAgentData&&win.matchMedia('(pointer:fine)').matches&&!win.matchMedia('(prefers-reduced-transparency:reduce)').matches;
 doc.documentElement.classList.toggle('lg-refract',refract);
 let svg=null,count=0;const lenses=new WeakMap();
 const canvas=doc.createElement('canvas'),ctx=refract?canvas.getContext('2d'):null;
 function lens(el){
  if(!ctx)return;const w=el.offsetWidth,h=el.offsetHeight;if(w<24||h<24)return;
  let entry=lenses.get(el);
  if(!entry){
   if(!svg){svg=doc.createElementNS(NS,'svg');svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden';doc.body.append(svg);}
   const id='lg-lens-'+(++count),f=doc.createElementNS(NS,'filter');
   f.id=id;f.setAttribute('x','0');f.setAttribute('y','0');f.setAttribute('width','100%');f.setAttribute('height','100%');f.setAttribute('filterUnits','userSpaceOnUse');f.setAttribute('color-interpolation-filters','sRGB');
   f.innerHTML='<feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="soft"/><feImage result="map" preserveAspectRatio="none"/><feDisplacementMap in="soft" in2="map" scale="34" xChannelSelector="R" yChannelSelector="G" result="bent"/><feGaussianBlur in="bent" stdDeviation="8" result="frost"/><feColorMatrix in="frost" type="saturate" values="1.8"/>';
   svg.append(f);entry={id,f,size:''};lenses.set(el,entry);
  }
  const size=w+'x'+h;if(entry.size===size)return;entry.size=size;
  const radius=Math.min(parseFloat(win.getComputedStyle(el).borderTopLeftRadius)||12,w/2,h/2),map=lensMap(w,h,radius,Math.min(26,h/2.5));
  canvas.width=map.width;canvas.height=map.height;ctx.putImageData(new ImageData(map.data,map.width,map.height),0,0);
  entry.f.setAttribute('width',w);entry.f.setAttribute('height',h);
  const img=entry.f.querySelector('feImage');img.setAttribute('width',w);img.setAttribute('height',h);img.setAttribute('href',canvas.toDataURL());
  el.dataset.lgFilter=entry.id;el.style.setProperty('--lg-refract',`url(#${entry.id})`);
 }
 const sizes=refract&&'ResizeObserver' in win?new win.ResizeObserver(rows=>{for(const row of rows)lens(row.target)}):null;
 function mark(){
  for(const el of doc.querySelectorAll(PANELS)){
   if(el.classList.contains('lg-glass')||el.parentElement?.closest(PANELS))continue;
   el.classList.add('lg-glass');if(win.getComputedStyle(el).position==='static')el.style.position='relative';
   sizes?.observe(el);lens(el);
  }
 }
 let pending=0;mark();new win.MutationObserver(()=>{if(!pending)pending=win.requestAnimationFrame(()=>{pending=0;mark();});}).observe(doc.body,{childList:true,subtree:true});
 // At night the world behind is near black, so light styles thicken their glass to keep labels readable.
 const sky=()=>{const c=doc.querySelector('canvas[data-sun]');let alt=1;try{alt=JSON.parse(c?.dataset.sun||'{}').altitude??1;}catch{}
  const day=Math.max(0,Math.min(1,(alt+.08)/.3)),root=doc.documentElement.style;
  root.setProperty('--lg-mix',Math.round(86-44*day)+'%');root.setProperty('--lg-mix-strong',Math.round(90-28*day)+'%');};
 sky();win.setInterval(sky,2000);
 let frame=0,px=0,py=0;
 win.addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;if(frame)return;frame=win.requestAnimationFrame(()=>{frame=0;
  for(const el of doc.querySelectorAll('.lg-glass')){
   const b=el.getBoundingClientRect();if(!b.width)continue;
   const near=Math.max(0,1-Math.hypot(Math.max(b.left-px,0,px-b.right),Math.max(b.top-py,0,py-b.bottom))/160);
   el.style.setProperty('--lg-x',(px-b.left)+'px');el.style.setProperty('--lg-y',(py-b.top)+'px');el.style.setProperty('--lg-shine',near.toFixed(2));
  }});},{passive:true});
}
