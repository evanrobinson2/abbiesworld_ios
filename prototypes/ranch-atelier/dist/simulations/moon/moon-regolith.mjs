import * as T from 'three';
import {mergeVertices} from '../vendor/utils/BufferGeometryUtils.js';
// MB1 crater field (AW-STUDY-0007). One crater list drives height, colour and boulders, so they always agree.
// Palette from the Moon Mission pack: regolith light #c4c9d4, mid #8d93a3, shadow #4a5468. No cyan here: cyan is
// reserved for the meteorite and the Star Child.
// Vertex colours are linear, so the sRGB swatches are converted once here.
const lin=c=>(c/255)**2.2,LIGHT=[196,201,212].map(lin),MID=[141,147,163].map(lin),SHADOW=[74,84,104].map(lin);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const hash=(a,b)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s);};

// How fresh each crater looks: young ones keep bright rims and rays, old ones are softened into the plain.
function craterShade(craters,x,z){
 let floor=0,rim=0,ray=0;
 for(const c of craters){const dx=(x-c.x)/c.r,dz=(z-c.z)/c.r,q=Math.hypot(dx*Math.sqrt(c.stretch),dz/Math.sqrt(c.stretch));if(q>5)continue;
  const fresh=1-c.age,angle=Math.atan2(dz,dx)-c.angle;
  floor=Math.max(floor,(1-smooth((q-.55)/.4))*(.55+.45*fresh));
  rim=Math.max(rim,Math.exp(-(((q-1.02)/.16)**2))*(.35+.65*fresh));
  if(c.age<.45&&q>1.05){const spokes=Math.pow(Math.max(0,Math.cos(angle*(5+Math.round(c.r)%4)+hash(c.x,c.z)*6)),14),fade=Math.exp(-(q-1.05)*.9);ray=Math.max(ray,spokes*fade*(1-c.age/.45));}
 }
 return {floor,rim,ray};
}

// Vertex colour for one ground vertex. Value bands are softly posterised, like the pack's painted plates.
export function regolithColor(heightAt,x,y,z,slope){
 const craters=heightAt.craters||[],{floor,rim,ray}=craterShade(craters,x,z);
 const grain=.5+.5*Math.sin(x*1.9+Math.sin(z*1.3)*2)*Math.cos(z*1.7-x*.6),mottle=hash(Math.floor(x*.9),Math.floor(z*.9));
 let value=.5+(y-1.7)*.03-slope*.22+(grain-.5)*.08+(mottle-.5)*.06;
 value+=rim*.38+ray*.42-floor*.36;
 value=Math.max(0,Math.min(1,value));
 const banded=Math.round(value*6)/6;value=value*.65+banded*.35;
 return value<.5?mix(SHADOW,MID,value/.5):mix(MID,LIGHT,(value-.5)/.5);
}

// Smooth boulders, not faceted confetti: three lumpy rock shapes with smooth normals.
function boulderGeometry(seed){
 const base=new T.IcosahedronGeometry(1,3);base.deleteAttribute('normal');base.deleteAttribute('uv');const g=mergeVertices(base),p=g.attributes.position,v=new T.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=.82+.18*Math.sin(v.x*2.3+seed)*Math.cos(v.y*1.9-seed*.7)+.09*Math.sin(v.z*4.1+seed*2);v.multiplyScalar(n);v.y=v.y<-.15?-.15+(v.y+.15)*.3:v.y;p.setXYZ(i,v.x,v.y,v.z);}
 g.computeVertexNormals();return g;
}

// Rocks are thrown out by impacts: dense just outside each rim, thinning with distance, larger near the rim and
// sparser around old craters. A few loose stones lie on the open plain.
export function scatterBoulders({heightAt,radius,random,blocked,limit=320}){
 const craters=(heightAt.craters||[]).filter(c=>Math.hypot(c.x,c.z)<radius),picks=[];
 const weight=craters.map(c=>c.r*c.r*(1.15-c.age)),total=weight.reduce((a,b)=>a+b,0)||1;
 for(let i=0;i<limit*4&&picks.length<limit;i++){
  let x,z,scale;
  if(random()<.85&&craters.length){let w=random()*total,k=0;while(k<craters.length-1&&(w-=weight[k])>0)k++;const c=craters[k],d=1.05+Math.min(3,-Math.log(1-random()*.97)/2.2),a=random()*Math.PI*2;
   x=c.x+Math.cos(a)*c.r*d;z=c.z+Math.sin(a)*c.r*d;scale=(.08+Math.pow(random(),2.6)*.5)*Math.min(1.3,.45+c.r/7)*(1.25-(d-1)*.18);}
  else{const a=random()*Math.PI*2,rr=Math.sqrt(random())*radius*.9;x=Math.cos(a)*rr;z=Math.sin(a)*rr;scale=.06+Math.pow(random(),3)*.25;}
  if(Math.hypot(x,z)>radius*.86||blocked(x,z))continue;
  picks.push({x,z,scale,shape:Math.floor(random()*3),tilt:[random()*.5,random()*Math.PI*2,random()*.5],shade:.85+random()*.3});
 }
 const material=new T.MeshStandardMaterial({color:'#7a8193',roughness:.97}),meshes=[0,1,2].map(s=>{const m=new T.InstancedMesh(boulderGeometry(s*2.7+1),material,Math.max(1,picks.filter(p=>p.shape===s).length));m.count=0;m.castShadow=m.receiveShadow=true;return m;});
 const matrix=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),color=new T.Color();
 for(const p of picks){const m=meshes[p.shape],y=heightAt(p.x,p.z);matrix.compose(new T.Vector3(p.x,y+p.scale*.12,p.z),q.setFromEuler(e.set(...p.tilt)),new T.Vector3(p.scale*1.1,p.scale*.7,p.scale));m.setMatrixAt(m.count,matrix);m.setColorAt(m.count,color.setScalar(p.shade));m.count++;}
 return {meshes,material,count:picks.length};
}

// Tracks and footprints that persist: the dust remembers where the buggy drove and where people walked.
// A canvas over the tile is multiplied into the ground; marks fade only very slowly, like real lunar prints.
export function createDustMemory(ground,radius,size=1024){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.channel=1;texture.anisotropy=4;
 const p=ground.geometry.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=(p.getX(i)+radius)/(2*radius);uv[i*2+1]=1-(p.getZ(i)+radius)/(2*radius);}
 ground.geometry.setAttribute('uv1',new T.BufferAttribute(uv,2));ground.material.map=texture;ground.material.needsUpdate=true;
 const px=x=>(x+radius)/(2*radius)*size,last=new Map();let dirty=false,stamps=0;
 function stamp(id,x,z,heading,kind){
  const prev=last.get(id),step=kind==='buggy'?.55:.42;if(prev&&Math.hypot(x-prev.x,z-prev.z)<step)return;
  const side=prev?prev.side*-1:1;last.set(id,{x,z,side});const s=size/(2*radius),cx=px(x),cy=px(z);
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-heading);
  if(kind==='buggy'){ctx.fillStyle='rgba(70,78,98,.30)';for(const o of [-.55,.55]){ctx.fillRect(o*s-.16*s,-.32*s,.32*s,.64*s);for(let k=-2;k<=2;k++){ctx.fillStyle='rgba(60,66,86,.22)';ctx.fillRect(o*s-.16*s,(k*.13-.03)*s,.32*s,.05*s);}ctx.fillStyle='rgba(70,78,98,.30)';}}
  else{ctx.fillStyle='rgba(70,78,98,.34)';ctx.beginPath();ctx.ellipse(side*.11*s,0,.07*s,.13*s,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();dirty=true;stamps++;
 }
 // MB11: utility runs are buried cables, a faint straight seam in the dust instead of floating marker bricks.
 const cables=[];
 function drawCables(){ctx.save();ctx.strokeStyle='rgba(62,70,92,.11)';ctx.lineWidth=Math.max(1.5,.14*size/(2*radius));ctx.lineCap='round';for(const [a,b] of cables){ctx.beginPath();ctx.moveTo(px(a.x),px(a.z));ctx.lineTo(px(b.x),px(b.z));ctx.stroke();}ctx.restore();dirty=true;}
 function cable(a,b){cables.push([a,b]);drawCables();}
 let fadeClock=0;
 return {stamp,cable,update(dt){fadeClock+=dt;if(fadeClock>40){fadeClock=0;ctx.fillStyle='rgba(255,255,255,.04)';ctx.fillRect(0,0,size,size);drawCables();}if(dirty){texture.needsUpdate=true;dirty=false;}},get stamps(){return stamps;},dispose(){texture.dispose();}};
}
