// Chalk notes for the player (AW-STUDY-0022). Presentation layer only: an SVG drawn over the canvas, never in the world,
// so no character, director or `look` can see it. Strokes draw themselves like a hand with chalk, then rub away.
// Nothing here takes a tap: pointer-events are off, so a hint can never stand between the player and the world.
const NS='http://www.w3.org/2000/svg';
const make=(tag,attrs={},parent)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent?.append(n);return n;};
let layer=null;
function ensure(){
 if(layer)return layer;
 const font=document.createElement('link');font.rel='stylesheet';font.href='https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap';document.head.append(font);
 layer=make('svg',{class:'aw-chalk','aria-hidden':'true'});
 const defs=make('defs',{},layer),f=make('filter',{id:'aw-chalk-grain',x:'-20%',y:'-20%',width:'140%',height:'140%'},defs);
 make('feTurbulence',{type:'fractalNoise',baseFrequency:'1.1',numOctaves:'2',seed:'7',result:'grain'},f);
 make('feDisplacementMap',{in:'SourceGraphic',in2:'grain',scale:'2.4',xChannelSelector:'R',yChannelSelector:'G',result:'rough'},f);
 make('feColorMatrix',{in:'grain',type:'matrix',values:'0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.4 2.05',result:'speck'},f);
 make('feComposite',{in:'rough',in2:'speck',operator:'in',result:'chalk'},f);
 make('feDropShadow',{dx:'0',dy:'1.2',stdDeviation:'1.4','flood-color':'#18241a','flood-opacity':'.5'},f);
 document.body.append(layer);return layer;
}
const wob=(s=1)=>(Math.random()-.5)*s;
// A hand-drawn path: a little wobble, never a perfect geometric line.
function stroke(g,d,{delay=0,ms=700,width=3.4}={}){
 const p=make('path',{d,class:'aw-chalk-stroke','stroke-width':width},g);
 const len=p.getTotalLength?.()||300;p.style.strokeDasharray=len;p.style.strokeDashoffset=len;
 p.animate([{strokeDashoffset:len},{strokeDashoffset:0}],{duration:ms,delay,easing:'cubic-bezier(.3,.1,.3,1)',fill:'forwards'});return p;
}
function words(g,x,y,text,{delay=0,anchor='middle',size=30}={}){
 const t=make('text',{x,y,'text-anchor':anchor,class:'aw-chalk-words','font-size':size},g);t.textContent=text;
 t.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:500,delay,easing:'ease-out',fill:'backwards'});return t;
}
const arrowHead=(g,x,y,angle,delay)=>{const a=.5,l=14;stroke(g,`M${x+Math.cos(angle+Math.PI-a)*l} ${y+Math.sin(angle+Math.PI-a)*l} L${x} ${y} L${x+Math.cos(angle+Math.PI+a)*l} ${y+Math.sin(angle+Math.PI+a)*l}`,{delay,ms:220});};

// Draw a note. `at` is {x,y} on screen; `kind` is arrow (words beside a thing, arrow to it), circle (ring a thing) or swirl
// (the drag-to-look gesture). Returns {group, move(x,y), erase()}.
export function chalkNote({kind='arrow',text='',at,size=40}){
 const svg=ensure(),g=make('g',{class:'aw-chalk-note'},svg),inner=make('g',{},g);
 const W=innerWidth,H=innerHeight,cx=W/2,cy=H/2;
 if(kind==='circle'){
  const r=Math.max(26,size),pts=[];for(let i=0;i<=26;i++){const a=-1.9+i/24*Math.PI*2.1;pts.push(`${(Math.cos(a)*(r+wob(4))).toFixed(1)} ${(Math.sin(a)*(r*.78+wob(4))).toFixed(1)}`);}
  stroke(inner,'M'+pts.join(' L'),{ms:800});
  const below=at.y<H*.6,ty=below?r+44:-r-26;stroke(inner,`M${wob(6)} ${below?r*.8+4:-r*.8-4} q8 ${below?10:-10} 2 ${below?18:-18}`,{delay:700,ms:250,width:3});
  words(inner,0,ty,text,{delay:850});
 }else if(kind==='swirl'){
  const r=Math.min(W,H)*.2;
  stroke(inner,`M${-r} ${r*.25} Q${-r*1.15} ${-r*.5} ${-r*.35} ${-r*.75}`,{ms:600});arrowHead(inner,-r*.35,-r*.75,-.25,600);
  stroke(inner,`M${r} ${-r*.25} Q${r*1.15} ${r*.5} ${r*.35} ${r*.75}`,{delay:450,ms:600});arrowHead(inner,r*.35,r*.75,Math.PI-.25,1050);
  words(inner,0,r*.05,text,{delay:900});
 }else{
  // Words sit toward the middle of the screen from the thing, with a curved arrow back to it.
  const dx=cx-at.x,dy=cy-at.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,d=Math.min(150,len*.6);
  const tx=ux*d,ty=uy*d,sx=tx-ux*18,sy=ty-uy*18+(uy<0?-14:12),ex=ux*(size*.55),ey=uy*(size*.55);
  const mx=(sx+ex)/2+uy*30,my=(sy+ey)/2-ux*30;
  words(inner,tx,ty+(uy<0?-24:28),text,{anchor:Math.abs(ux)>.7?(ux>0?'start':'end'):'middle'});
  stroke(inner,`M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}`,{delay:350,ms:500});arrowHead(inner,ex,ey,Math.atan2(ey-my,ex-mx),850);
 }
 const move=(x,y)=>g.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);move(at.x,at.y);
 let gone=false;
 const erase=()=>{if(gone)return;gone=true;g.animate([{opacity:1,filter:'blur(0)'},{opacity:0,filter:'blur(3px)'}],{duration:650,easing:'ease-in',fill:'forwards'}).onfinish=()=>g.remove();};
 return {group:g,move,erase,get gone(){return gone;}};
}
