/* Raster brush model: independent bristle tips transfer finite pigment and water.
   Wet pigment diffuses on a paper grid, then binds as water evaporates.
   Deliberately a 2D contact approximation, not a calibrated fluid solver. */
(function(root){
const random=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const defaults={load:.8,water:.75,pressure:.75,tilt:.35,roughness:.5,paperWetness:0};
const order=['wash','shade','ink','detail'];
function prepare(plan,settings={}){
 const options={...defaults,...settings},r=random(plan.seed+81),strokes=[],structure=[];
 function add(item,points,width,extra={}){strokes.push({...item,points,width,marks:[],tool:'bristle brush',brush:'round',...extra});}
 for(const item of plan.items){const {points,kind}=item;
  if(kind!=='wash'){add(item,points,item.width);structure.push({tag:'path',a:{d:`M${points[0]}Q${points[1]} ${points[2]}`,fill:'none',stroke:'#a69678','stroke-width':.12,opacity:.5}});continue;}
  structure.push({tag:'path',a:{d:'M'+points.map(p=>p.join(',')).join('L')+'Z',fill:'none',stroke:'#a69678','stroke-width':.15,opacity:.5}});
  // Convert region intent into actual overlapping brush sweeps. No polygon is filled or used as a paint mask.
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),w=maxX-minX,h=maxY-minY;
  const foliage=/foliage/i.test(item.purpose);
  if(foliage){const n=Math.max(5,Math.ceil(w*h/22));for(let j=0;j<n;j++){const a=r()*Math.PI*2,rr=Math.sqrt(r())*.8,x=(minX+maxX)/2+Math.cos(a)*w*.5*rr,y=(minY+maxY)/2+Math.sin(a)*h*.5*rr,size=Math.max(1,Math.min(w,h)*(.16+r()*.12));add(item,[[x-size*.5,y+size*.2],[x,y-size*.3],[x+size*.7,y-size*.1]],size*1.5,{kind:'dab',purpose:'Press and roll foliage wash',reload:j%5===0});}continue;}
  // Sweep along the long axis; intersect scan lines only to plan where the hand travels.
  const horizontal=w>=h,span=horizontal?h:w,size=Math.max(.7,Math.min(5,span*.7)),step=size*.48;
  for(let v=(horizontal?minY:minX)+Math.min(step/2,span/2);v<(horizontal?maxY:maxX);v+=step){const hits=[];for(let j=0;j<points.length;j++){const a=points[j],b=points[(j+1)%points.length],av=a[horizontal?1:0],bv=b[horizontal?1:0];if((av<=v&&bv>v)||(bv<=v&&av>v)){const t=(v-av)/(bv-av);hits.push(a[horizontal?0:1]+t*(b[horizontal?0:1]-a[horizontal?0:1]));}}hits.sort((a,b)=>a-b);for(let j=0;j+1<hits.length;j+=2){let a=horizontal?[hits[j]+size*.12,v]:[v,hits[j]+size*.12],b=horizontal?[hits[j+1]-size*.12,v]:[v,hits[j+1]-size*.12];if(Math.hypot(b[0]-a[0],b[1]-a[1])<.1)continue;const c=lerp(a,b,.5);c[horizontal?1:0]+=(r()-.5)*size*.2;add(item,[a,c,b],size,{kind:'sweep',purpose:'Lay wash with overlapping brush passes'});}}
 }
 strokes.sort((a,b)=>order.indexOf(a.layer)-order.indexOf(b.layer));
 return {id:plan.id,seed:plan.seed,method:'simulation',tool:'brush',brushPhysics:true,options,strokes,layers:{structure,wash:[],shade:[],ink:[],detail:[]}};
}
class Paper{
 constructor(width=600,height=550,seed=41,options={}){this.width=width;this.height=height;this.scale=width/120;this.options={...defaults,...options};const n=width*height;this.water=new Float32Array(n);this.pigment=[new Float32Array(n),new Float32Array(n),new Float32Array(n)];this.bound=[new Float32Array(n),new Float32Array(n),new Float32Array(n)];this.tooth=new Float32Array(n);this.r=random(seed);this.bristles=Array.from({length:32},(_,i)=>{const a=i*2.39996,rad=Math.sqrt((i+.5)/32);return {ox:Math.cos(a)*rad,oy:Math.sin(a)*rad,x:0,y:0,vx:0,vy:0,load:0,water:0,length:.7+this.r()*.3};});for(let i=0;i<n;i++){const x=i%width,y=Math.floor(i/width);this.tooth[i]=.45+.25*Math.sin(x*.77+y*.29)*Math.sin(y*.91-x*.23)+this.r()*.3;this.water[i]=this.options.paperWetness*.5;}this.color='';this.batch=0;this.deposited=0;this.reloaded=0;this.lastStats={};this.bounds=[width,height,0,0];}
 reload(color){this.color=color;this.batch=0;this.reloaded++;for(const b of this.bristles){b.load=this.options.load*(.75+this.r()*.5);b.water=this.options.water;}const rgb=color.replace('#','').match(/../g).map(s=>parseInt(s,16)/255);this.ink=rgb.map(v=>-Math.log(Math.max(.06,v)));}
 stamp(x,y,radius,pigment,water){const {width:w,height:h}=this,x0=Math.max(0,Math.floor(x-radius)),x1=Math.min(w-1,Math.ceil(x+radius)),y0=Math.max(0,Math.floor(y-radius)),y1=Math.min(h-1,Math.ceil(y+radius));if(x1<x0||y1<y0)return;this.bounds[0]=Math.min(this.bounds[0],x0);this.bounds[1]=Math.min(this.bounds[1],y0);this.bounds[2]=Math.max(this.bounds[2],x1);this.bounds[3]=Math.max(this.bounds[3],y1);let total=0;for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const d=((xx+.5-x)**2+(yy+.5-y)**2)/(radius*radius);if(d>=1)continue;const i=yy*w+xx,contact=Math.max(0,(1-d))*(1-this.options.roughness*.6+this.tooth[i]*this.options.roughness*.6),q=contact/(radius*radius*1.6);const mass=pigment*q;for(let c=0;c<3;c++)this.pigment[c][i]+=mass*this.ink[c];this.water[i]=Math.min(3,this.water[i]+water*q);total+=mass;}this.deposited+=total;}
 stroke(s,index=0){if(this.color!==s.color||s.reload||this.batch>=6)this.reload(s.color);this.batch++;const sc=this.scale,[a,c,b]=s.points.map(p=>p.map(v=>v*sc)),length=Math.hypot(c[0]-a[0],c[1]-a[1])+Math.hypot(b[0]-c[0],b[1]-c[1]),steps=Math.max(16,Math.ceil(length/1.05)),size=Math.max(.65,s.width*sc*.5),o=this.options;let oldX=a[0],oldY=a[1],pressure=0,angle=Math.atan2(b[1]-a[1],b[0]-a[0]),before=this.bristles.reduce((n,b)=>n+b.load,0),contacts=0;
 for(const br of this.bristles){br.x=a[0];br.y=a[1];br.vx=0;br.vy=0;}
 for(let j=0;j<=steps;j++){const t=j/steps,u=1-t,x=u*u*a[0]+2*u*t*c[0]+t*t*b[0],y=u*u*a[1]+2*u*t*c[1]+t*t*b[1],dx=x-oldX,dy=y-oldY,speed=Math.hypot(dx,dy);oldX=x;oldY=y;const desired=Math.atan2(dy||Math.sin(angle)*.001,dx||Math.cos(angle)*.001);angle+=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle))*.18;const leaf=s.kind==='leaf'||s.kind==='dab',target=o.pressure*(leaf?Math.pow(Math.sin(Math.PI*t),.65):Math.min(1,t*12,(1-t)*12)*.8);pressure+=(target-pressure)*.35;
  const nx=-Math.sin(angle),ny=Math.cos(angle),tx=Math.cos(angle),ty=Math.sin(angle);
  for(const br of this.bristles){const spread=size*(.12+pressure*.95),offsetX=nx*br.ox*spread+tx*br.oy*spread*(.25+o.tilt*.65),offsetY=ny*br.ox*spread+ty*br.oy*spread*(.25+o.tilt*.65),drag=size*pressure*(.12+o.tilt*.4)*br.length;const goalX=x+offsetX-tx*drag,goalY=y+offsetY-ty*drag;
   // Elastic tip lag persists through direction changes; contact changes with bristle length and splay.
   br.vx=(br.vx+(goalX-br.x)*.38)*.58;br.vy=(br.vy+(goalY-br.y)*.38)*.58;br.x+=br.vx;br.y+=br.vy;
   const contact=pressure-(1-br.length)*.35-Math.abs(br.ox)*.08;if(contact<=.015||br.load<.0001)continue;
   const px=Math.max(0,Math.min(this.width-1,Math.floor(br.x))),py=Math.max(0,Math.min(this.height-1,Math.floor(br.y))),tooth=this.tooth[py*this.width+px];
   // With little water, separated bristles touch paper peaks and leave untouched valleys.
   if(br.water<.2&&tooth<o.roughness*(.72-contact*.2))continue;
   const rate=(.025+contact*.12)*(1+br.water*.8),transfer=Math.min(br.load,rate*(.35+speed*.45));br.load-=transfer*.06;br.water=Math.max(0,br.water-transfer*.025);const radius=Math.max(.65,size*(.06+br.water*.075)+contact*.25);this.stamp(br.x,br.y,radius,transfer*(s.layer==='ink'?1.5:1),transfer*br.water*2.8);contacts++;
  }
 }
 this.lastStats={contacts,loadBefore:before,loadAfter:this.bristles.reduce((n,b)=>n+b.load,0),reloads:this.reloaded};
 }
 settle(iterations=6,dry=.035){const w=this.width,h=this.height,[bx,by,ex,ey]=this.bounds;if(ex<bx)return;const x0=Math.max(1,bx-3),y0=Math.max(1,by-3),x1=Math.min(w-2,ex+3),y1=Math.min(h-2,ey+3);for(let pass=0;pass<iterations;pass++){
 // Pairwise conservative transport of mobile pigment; dry pigment never moves.
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*w+x;for(const j of [i+1,i+w]){const wi=this.water[i],wj=this.water[j];if(wi+wj<.002)continue;const flow=(wi-wj)*.075;this.water[i]-=flow;this.water[j]+=flow;const from=flow>0?i:j,to=flow>0?j:i,ratio=Math.min(.12,Math.abs(flow)/(this.water[from]+.05));for(let c=0;c<3;c++){const adv=this.pigment[c][from]*ratio;this.pigment[c][from]-=adv;this.pigment[c][to]+=adv;const diffusion=(this.pigment[c][i]-this.pigment[c][j])*.018*Math.min(1,wi+wj);this.pigment[c][i]-=diffusion;this.pigment[c][j]+=diffusion;}}}
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*w+x,wet=this.water[i];this.water[i]=Math.max(0,wet-dry*(.7+this.tooth[i]*.6));const fix=Math.min(.7,.025+dry*.7+(wet<.08?.3:0));for(let c=0;c<3;c++){const q=this.pigment[c][i]*fix;this.pigment[c][i]-=q;this.bound[c][i]+=q;}}
 }this.bounds=[x0,y0,x1,y1];}
 pixels(){const data=new Uint8ClampedArray(this.width*this.height*4);for(let i=0;i<this.water.length;i++){let density=0;const rgb=[];for(let c=0;c<3;c++){const d=this.pigment[c][i]+this.bound[c][i];density=Math.max(density,d);rgb.push(Math.exp(-d*1.9));}const alpha=1-Math.exp(-density*1.9);if(alpha<.001)continue;for(let c=0;c<3;c++)data[i*4+c]=255*Math.max(0,Math.min(1,(rgb[c]-(1-alpha))/alpha));data[i*4+3]=alpha*255;}return data;}
}
const cache=new WeakMap();let worker,serial=0,currentURL;
function mount(svg,model,mode,progress){const selected=model.strokes.filter(s=>(mode==='wash'?['wash']:mode==='shade'?['wash','shade']:mode==='ink'?['ink','detail']:order).includes(s.layer)),limit=Math.ceil(selected.length*progress),ns='http://www.w3.org/2000/svg';let img=svg.querySelector('image');if(!img){svg.replaceChildren();img=document.createElementNS(ns,'image');for(const [k,v]of Object.entries({x:0,y:0,width:120,height:110,'data-brush-surface':'true'}))img.setAttribute(k,v);svg.append(img);}let key=cache.get(model);if(!key){key=++serial;cache.set(model,key);}if(!worker)worker=new Worker('brush-worker.js?v=1');const request=++serial;svg.dataset.brushRequest=request;svg.setAttribute('aria-busy','true');worker.onmessage=e=>{const m=e.data;if(String(m.request)!==svg.dataset.brushRequest)return;if(m.error){svg.setAttribute('aria-busy','false');svg.dispatchEvent(new CustomEvent('brush-render',{detail:{error:m.error},bubbles:true}));return;}if(currentURL)URL.revokeObjectURL(currentURL);currentURL=URL.createObjectURL(m.blob);img.setAttribute('href',currentURL);svg.setAttribute('aria-busy',String(!m.done));svg.dataset.brushContacts=m.contacts;svg.dispatchEvent(new CustomEvent('brush-render',{detail:{done:m.done,completed:m.completed,total:limit,contacts:m.contacts},bubbles:true}));root.RanchView?.changed();};worker.onerror=()=>{svg.setAttribute('aria-busy','false');svg.dispatchEvent(new CustomEvent('brush-render',{detail:{error:'Brush renderer could not start. Reload to retry.'},bubbles:true}));};worker.postMessage({request,key:key+':'+mode,strokes:selected,limit,seed:model.seed,options:model.options});return {count:selected.length,visible:limit,last:selected[limit-1]};}
root.DrawingBrush={prepare,Paper,defaults,mount};if(typeof module!=='undefined')module.exports=root.DrawingBrush;
})(typeof self!=='undefined'?self:globalThis);
