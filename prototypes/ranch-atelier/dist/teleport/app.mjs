// Family Teleport: the family becomes toy characters, beams into the holodeck and visits
// five worlds (plus one secret one), each built live around them from the kids' madlibs.
import * as T from 'three';
import {OrbitControls} from '../simulations/vendor/OrbitControls.js';
import {KIT,build,match,triangles,mat,list as kitList} from './kit.mjs';
import {makeCharacter,animateCharacter,loadFamily,saveFamily,PLACEHOLDER_FAMILY,HAIR_STYLES,sampleColor} from './family.mjs';
import {WORLDS,MAP,MADLIBS,SAMPLE_ANSWERS,REMIXES,modelOrder} from './worlds.mjs';
import {parse} from './commands.mjs';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const params=new URLSearchParams(location.search);
const store={get(k,d){try{const v=localStorage.getItem('teleport.'+k);return v?JSON.parse(v):d;}catch{return d;}},set(k,v){try{localStorage.setItem('teleport.'+k,JSON.stringify(v));}catch{}}};

// ---- state ------------------------------------------------------------------------------
const S={
 family:loadFamily(),answers:store.get('answers',{}),orders:store.get('orders',[]),
 worldIndex:-1,visited:new Set(store.get('visited',[])),secretUnlocked:store.get('secret',false),
 hour:12,hourTarget:12,weather:'none',remix:null,lowGravity:false,sound:store.get('sound',true),
 selected:null,mode:'setup',busy:false,showClock:0,lastReaction:null,
};

// ---- renderer and scene -------------------------------------------------------------------
const host=$('#stage');
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
host.append(renderer.domElement);
const scene=new T.Scene();
const camera=new T.PerspectiveCamera(45,innerWidth/innerHeight,.1,400);camera.position.set(0,6,14);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,1,0);orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.49;orbit.minDistance=2.5;orbit.maxDistance=45;
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});

const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new T.Color('#7cc8ff')},bottom:{value:new T.Color('#ffe9f5')}},
 vertexShader:'varying vec3 vp;void main(){vp=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 vp;void main(){float h=clamp(vp.y*1.4+.25,0.,1.);gl_FragColor=vec4(mix(bottom,top,h),1.);}'});
const sky=new T.Mesh(new T.SphereGeometry(200,32,16),skyMat);scene.add(sky);
scene.fog=new T.Fog('#dff1ff',30,90);
const hemi=new T.HemisphereLight('#ffffff','#8a7a6a',1.1);scene.add(hemi);
const sun=new T.DirectionalLight('#fff4e0',2.4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:80});sun.shadow.bias=-.0005;scene.add(sun,sun.target);
const world=new T.Group();world.name='world';scene.add(world);
const familyGroup=new T.Group();familyGroup.name='family';scene.add(familyGroup);
let ground=null;

// ---- particles --------------------------------------------------------------------------
const PCOUNT=900,pGeo=new T.BufferGeometry(),pPos=new Float32Array(PCOUNT*3),pCol=new Float32Array(PCOUNT*3),pVel=new Float32Array(PCOUNT*3);
pGeo.setAttribute('position',new T.BufferAttribute(pPos,3));pGeo.setAttribute('color',new T.BufferAttribute(pCol,3));
const dot=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.4,'rgba(255,255,255,.8)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c);})();
const pMat=new T.PointsMaterial({size:.25,map:dot,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
const points=new T.Points(pGeo,pMat);points.frustumCulled=false;scene.add(points);
const PART={pollen:{c:['#fff6b0','#ffffff'],size:.12,vy:[.05,.2],drift:.3,add:true},fireflies:{c:['#d8ff6a','#fff26a'],size:.22,vy:[-.1,.1],drift:.5,add:true},sparkles:{c:['#ffd8ff','#ffffff','#bfe8ff'],size:.2,vy:[.1,.4],drift:.3,add:true},bubbles:{c:['#d8f6ff'],size:.3,vy:[.6,1.4],drift:.2,add:true},snow:{c:['#ffffff'],size:.22,vy:[-1.2,-.6],drift:.4,add:false},rain:{c:['#bcd8ff'],size:.12,vy:[-14,-10],drift:0,add:false},confetti:{c:['#ff4a6a','#ffd23a','#3ac2ff','#7aff8a','#c87aff'],size:.25,vy:[-1.5,-.7],drift:.8,add:false},leaves:{c:['#e8822a','#d8402c','#ffd23a'],size:.28,vy:[-1,-.5],drift:1,add:false},none:null};
let pMode='none';
const starGeo=new T.BufferGeometry(),sp=new Float32Array(1500*3);for(let i=0;i<1500;i++){const a=Math.random()*Math.PI*2,e=Math.random()*1.3+.03,r=150;sp.set([Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r],i*3);}
starGeo.setAttribute('position',new T.BufferAttribute(sp,3));const starMat=new T.PointsMaterial({size:1.1,map:dot,color:'#ffffff',transparent:true,depthWrite:false,fog:false,blending:T.AdditiveBlending});const starField=new T.Points(starGeo,starMat);scene.add(starField);
function setParticles(mode){
 pMode=mode;const P=PART[mode];points.visible=!!P;if(!P)return;
 pMat.size=P.size;pMat.blending=P.add?T.AdditiveBlending:T.NormalBlending;pMat.needsUpdate=true;
 for(let i=0;i<PCOUNT;i++){const c=new T.Color(P.c[i%P.c.length]);pCol.set([c.r,c.g,c.b],i*3);
  if(P.sky){const a=Math.random()*Math.PI*2,e=Math.random()*1.2+.05,r=150;pPos.set([Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r],i*3);}
  else pPos.set([(Math.random()-.5)*40,Math.random()*16,(Math.random()-.5)*40],i*3);
  pVel.set([(Math.random()-.5)*P.drift,P.vy[0]+Math.random()*(P.vy[1]-P.vy[0]),(Math.random()-.5)*P.drift],i*3);}
 pGeo.attributes.color.needsUpdate=true;pGeo.attributes.position.needsUpdate=true;
}
function stepParticles(dt,t){
 const P=PART[pMode];if(!P||P.sky)return;
 for(let i=0;i<PCOUNT;i++){const j=i*3;pPos[j]+=(pVel[j]+Math.sin(t+i)*P.drift*.3)*dt;pPos[j+1]+=pVel[j+1]*dt;pPos[j+2]+=pVel[j+2]*dt;
  if(pPos[j+1]<0)pPos[j+1]=16;if(pPos[j+1]>16)pPos[j+1]=0;}
 pGeo.attributes.position.needsUpdate=true;
}
// Fireworks: short-lived bursts on their own points object.
const bursts=[];
function firework(at){
 const n=120,g=new T.BufferGeometry(),pos=new Float32Array(n*3),vel=[],col=new T.Color().setHSL(Math.random(),1,.6);
 for(let i=0;i<n;i++){pos.set([at.x,at.y,at.z],i*3);const v=new T.Vector3().randomDirection().multiplyScalar(3+Math.random()*2);vel.push(v);}
 g.setAttribute('position',new T.BufferAttribute(pos,3));
 const p=new T.Points(g,new T.PointsMaterial({size:.35,map:dot,color:col,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));scene.add(p);bursts.push({p,vel,t:0});
 kindSound('pop');
}
function stepBursts(dt){for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.t+=dt;const a=b.p.geometry.attributes.position;for(let k=0;k<b.vel.length;k++){b.vel[k].y-=2*dt;a.array[k*3]+=b.vel[k].x*dt;a.array[k*3+1]+=b.vel[k].y*dt;a.array[k*3+2]+=b.vel[k].z*dt;}a.needsUpdate=true;b.p.material.opacity=Math.max(0,1-b.t/1.8);if(b.t>1.8){scene.remove(b.p);b.p.geometry.dispose();b.p.material.dispose();bursts.splice(i,1);}}}

// ---- sound (from the sound catalogue) ---------------------------------------------------
import {sfx as catalogSfx} from '/simulations/catalog-sfx.mjs';
const KIND_SOUND={beam:['warp',.7],pop:['pop-1',.5],ding:['magic-chime',.5],whoosh:['whoosh-1',.4],build:['place-1',.4],magic:['sparkle-1',.6]};
function kindSound(kind){
 if(!S.sound||!S.gesture)return;const k=KIND_SOUND[kind];if(!k)return;catalogSfx(k[0],{gain:k[1]});
}
function say(text,{speak=true,seconds}={}){
 const cap=$('#caption');cap.textContent=text;cap.classList.add('show');clearTimeout(say.t);say.t=setTimeout(()=>cap.classList.remove('show'),(seconds??Math.min(9,2.5+text.length/16))*1000);
 
}

// ---- entities ---------------------------------------------------------------------------
let entities=[];let seed=1;
const rand=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
const between=(a,b)=>a+(b-a)*rand();
function addEntity(kitId,{pos,scale=1,color=null,live=null,label=null,delay=0,detail=0,word=null,hero=false}){
 const object=new T.Group();object.position.copy(pos);object.rotation.y=Math.atan2(-pos.x,-pos.z)+between(-.6,.6);
 const e={kitId,object,scale,color,live,label,word,hero,detail:-1,base:pos.clone(),appear:{t:-delay,d:.55},phase:rand()*10,home:pos.clone(),target:null,speed:between(.6,1.2)};
 setDetail(e,detail);object.scale.setScalar(.0001);world.add(object);
 if(label)object.add(labelSprite(label,KIT[kitId]?.h??1));
 object.userData.entity=e;entities.push(e);return e;
}
function setDetail(e,d){
 if(e.detail===d)return;const old=e.object.children.find(c=>c.userData.kit);if(old)e.object.remove(old);
 const m=build(e.kitId,{detail:d,color:e.color});e.object.add(m);e.detail=d;e.model=m;if(S.remix)tintEntity(e,REMIXES[S.remix]);
}
function labelSprite(text,h){
 const c=document.createElement('canvas'),x=c.getContext('2d');c.width=320;c.height=72;x.font='800 38px Nunito, system-ui, sans-serif';const w=Math.min(316,x.measureText(text).width+44);
 x.fillStyle='rgba(176,122,255,.95)';x.beginPath();x.roundRect((320-w)/2,6,w,60,30);x.fill();x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(text,160,38);
 const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,transparent:true}));s.renderOrder=999;s.scale.set(1.4,.32,1);s.position.y=h+.45;s.name='label';return s;
}
function tintEntity(e,remix){
 e.model?.traverse(o=>{if(!o.isMesh)return;o.userData.baseMat??=o.material;
  if(!remix||!remix.tint){o.material=o.userData.baseMat;return;}
  const hex=o.userData.baseMat.color.getHex(),c=remix.tint[hex%remix.tint.length];
  o.material=mat(c,{glow:remix.glow?.45:o.userData.baseMat.emissiveIntensity>0?.6:0,detail:e.detail,metal:remix.metal?.6:0,opacity:o.userData.baseMat.opacity});});
}
function clearWorld(){
 for(const e of entities)world.remove(e.object);entities=[];
 if(ground){scene.remove(ground);ground=null;}
}

// ---- building a world -------------------------------------------------------------------
function ring(r0,r1){const a=rand()*Math.PI*2,r=Math.sqrt(between(r0*r0,r1*r1));return new T.Vector3(Math.cos(a)*r,0,Math.sin(a)*r);}
// Single landmarks (a castle, the volcano) go behind the family, where the camera looks.
function backdrop(r){const a=-Math.PI/2+between(-.9,.9);return new T.Vector3(Math.cos(a)*r,0,Math.sin(a)*r);}
function makeGround(w){
 const g=new T.Group();g.name='ground';
 const R=w.island?17:60;
 const top=new T.Mesh(new T.CylinderGeometry(R,R*(w.island?.96:1),.6,72),new T.MeshStandardMaterial({color:w.ground,roughness:.95}));top.position.y=-.3;top.receiveShadow=true;top.name='ground-top';g.add(top);
 if(w.island){const under=new T.Mesh(new T.ConeGeometry(R*.96,10,24),new T.MeshStandardMaterial({color:w.groundEdge,roughness:1,flatShading:true}));under.rotation.x=Math.PI;under.position.y=-5.6;g.add(under);}
 if(w.space){const earth=new T.Mesh(new T.SphereGeometry(5,32,24),new T.MeshStandardMaterial({color:'#3a7ad8',emissive:'#1a3a8a',emissiveIntensity:.4}));earth.position.set(-30,26,-60);earth.name='earth';g.add(earth);const land=new T.Mesh(new T.SphereGeometry(5.05,16,12,0,1.6,.6,1),new T.MeshStandardMaterial({color:'#4fca5a',emissive:'#1a5a2a',emissiveIntensity:.3}));land.position.copy(earth.position);g.add(land);}
 // Teleport pad under the family.
 const pad=build('portal',{detail:2});pad.scale.setScalar(1.4);pad.name='pad';g.add(pad);
 return g;
}
function buildWorld(w){
 clearWorld();seed=[...w.id].reduce((a,c)=>a*31+c.charCodeAt(0),7)%2147483647||1;
 ground=makeGround(w);scene.add(ground);
 S.remix=null;S.lowGravity=!!w.lowGravity;
 skyMat.uniforms.top.value.set(w.sky[0]);skyMat.uniforms.bottom.value.set(w.sky[1]);scene.fog.color.set(w.fog);scene.fog.near=w.underwater?8:30;scene.fog.far=w.underwater?45:95;
 S.hour=S.hourTarget=w.hour;S.base={sky:[...w.sky],fog:w.fog,ground:w.ground};
 setParticles(w.particles==='stars'?'none':w.particles||'none');
 const items=[];
 for(const p of w.place)for(let i=0;i<p.n;i++){const pos=p.n===1&&p.ring[0]>=8?backdrop(p.ring[0]):ring(...p.ring);if(p.y)pos.y=between(...p.y);items.push({k:p.k,pos,scale:p.s?between(...p.s):between(.85,1.2),live:p.live});}
 for(const s of w.slots){const ans=S.answers[s.answer];if(!ans)continue;const m=match(ans);if(!m)continue;
  for(let i=0;i<s.n;i++){const pos=ring(...s.ring);items.push({k:m.id||'mystery',pos,scale:(s.s??1)*Math.min(m.size||1,1.8),color:m.color||(w.useColor&&S.answers.color?match(S.answers.color)?.color:null),live:s.live,label:m.id?null:m.word,word:m.word,hero:s.hero});}}
 // Build outward from the family: nearest things appear first.
 items.sort((a,b)=>a.pos.length()-b.pos.length());
 items.forEach((it,i)=>addEntity(it.k,{pos:it.pos,scale:it.scale,color:it.color,live:it.live,label:it.label,word:it.word,hero:it.hero,delay:.25+it.pos.length()*.12,detail:0}));
 updateBuilder('blockout');
}
// Progressive resolution: everything arrives as a blockout, then upgrades in a sweep.
let upgrade=null;
function startUpgrade(){upgrade={t:0,i:0,order:[...entities].sort((a,b)=>a.object.position.length()-b.object.position.length())};}
function stepUpgrade(dt){
 if(!upgrade)return;upgrade.t+=dt;const want=Math.floor(upgrade.t*45);
 while(upgrade.i<Math.min(want,upgrade.order.length)){const e=upgrade.order[upgrade.i++];setDetail(e,2);e.flash=.4;if(upgrade.i%6===0)kindSound('build');}
 if(upgrade.i>=upgrade.order.length){upgrade=null;updateBuilder('full');}else if(upgrade.i%10===0)updateBuilder('upgrading');
}
function updateBuilder(phase){
 const ids=new Set(entities.map(e=>e.kitId)),tris=entities.reduce((a,e)=>a+triangles(e.model),0);
 $('#builder').innerHTML=`<b>Builder</b><span>${entities.length} things · ${ids.size} models</span><span>${phase==='blockout'?'Blockout':phase==='upgrading'?'Upgrading detail…':'Full detail'} · ${(tris/1000).toFixed(0)}k triangles</span><span>Downloaded: 0 KB (all from recipes)</span>${S.orders.length?`<span>New models ordered: ${S.orders.length}</span>`:''}`;
}

// ---- family -----------------------------------------------------------------------------
let people=[];
function placeFamily(){
 familyGroup.clear();people=[];
 const n=S.family.length;
 S.family.forEach((s,i)=>{const o=makeCharacter(s);const x=(i-(n-1)/2)*.75;o.position.set(x,.14,i%2?.25:0);o.rotation.y=0;familyGroup.add(o);people.push({sheet:s,object:o,target:null,emote:null,emoteUntil:0,moving:0,beam:0});});
}
// Beams live in their own list so a beam-out finishes even after the family is rebuilt.
const beams=[];
function beam(on){
 for(const p of people){
  const m=new T.Mesh(new T.CylinderGeometry(.32,.32,6,24,1,true),new T.MeshBasicMaterial({color:'#7ae8ff',transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
  m.position.copy(p.object.position).setY(3);scene.add(m);beams.push({p,m,k:on?0:1,dir:on?1:-1});p.object.visible=true;
 }
 kindSound('beam');
}
function stepBeams(dt){
 for(let i=beams.length-1;i>=0;i--){const b=beams[i],o=b.p.object;b.k+=dt*b.dir*(b.dir>0?.8:1.4);const k=Math.min(1,Math.max(0,b.k));
  o.scale.set(1-(1-k)*.7,k||.0001,1-(1-k)*.7);o.traverse(m=>{if(m.isMesh)m.visible=k>.02&&(k>.98||Math.random()<.6+k*.4);});
  b.m.material.opacity=Math.sin(Math.min(1,Math.max(0,b.k))*Math.PI)*.28;b.m.position.x=o.position.x;b.m.position.z=o.position.z;b.m.rotation.y+=dt*4;
  if((b.dir>0&&b.k>=1.1)||(b.dir<0&&b.k<=-.05)){scene.remove(b.m);b.m.geometry.dispose();b.m.material.dispose();beams.splice(i,1);o.traverse(m=>{if(m.isMesh)m.visible=true;});o.scale.setScalar(1);if(b.dir<0)o.visible=false;}}
}

// ---- time of day ------------------------------------------------------------------------
const NIGHT=['#0b1030','#26244a'];
function applyHour(){
 const h=S.hour,day=Math.max(0,Math.sin((h-6)/12*Math.PI)),w=WORLDS[S.worldIndex];
 const base=S.remix&&REMIXES[S.remix].sky?REMIXES[S.remix].sky:S.base?.sky||['#7cc8ff','#ffe9f5'];
 const k=w?.space?1:Math.min(1,day*1.6);
 skyMat.uniforms.top.value.set(NIGHT[0]).lerp(new T.Color(base[0]),k);skyMat.uniforms.bottom.value.set(NIGHT[1]).lerp(new T.Color(base[1]),k);
 const fog=S.remix&&REMIXES[S.remix].fog||S.base?.fog||'#dff1ff';scene.fog.color.set(NIGHT[1]).lerp(new T.Color(fog),k);
 sun.intensity=w?.space?2.2:.25+2.3*day;hemi.intensity=w?.space?.5:.35+.8*day;
 const a=(h-6)/12*Math.PI;sun.position.set(Math.cos(a)*25,Math.max(3,Math.sin(a)*30),10);sun.color.set(day<.3?'#ffb07a':'#fff4e0');
 renderer.toneMappingExposure=.85+.25*k;
 starMat.opacity=w?.underwater?0:w?.space?1:Math.max(0,1-k*1.6);starField.visible=starMat.opacity>.01;
}

// ---- actions (from commands, the presenter and the ship's computer) ---------------------
const present=()=>entities.map(e=>e.kitId);
function run(text,{fromVoice=false}={}){
 const t0=performance.now();
 const {actions}=parse(text,{magicWord:S.answers.word,names:S.family.map(f=>f.name),present:present()});
 $('#heard').textContent='“'+text+'”';$('#heard').classList.add('show');clearTimeout(run.t);run.t=setTimeout(()=>$('#heard').classList.remove('show'),3500);
 if(!actions.length){say("I didn't catch that one. Try “make it snow” or “add a unicorn”.",{speak:false,seconds:4});return false;}
 for(const a of actions)act(a);
 // Measure from the words arriving to the first frame that shows the change.
 requestAnimationFrame(()=>requestAnimationFrame(()=>{S.lastReaction=performance.now()-t0;$('#reaction').textContent='⚡ '+Math.round(S.lastReaction)+' ms';$('#reaction').classList.remove('pop');void $('#reaction').offsetWidth;$('#reaction').classList.add('pop');}));
 return true;
}
function centre(){const c=new T.Vector3();people.forEach(p=>c.add(p.object.position));return people.length?c.divideScalar(people.length):c;}
function targets(id){return id==='everything'?entities:entities.filter(e=>e.kitId===id);}
function act(a){
 switch(a.do){
  case 'time':S.hourTarget=a.hour;break;
  case 'weather':if(a.mode==='clear'){setParticles(WORLDS[S.worldIndex]?.particles==='stars'?'none':WORLDS[S.worldIndex]?.particles||'none');}else if(a.mode==='fireworks'){for(let i=0;i<6;i++)setTimeout(()=>firework(new T.Vector3(between(-8,8),between(6,10),between(-8,4))),i*350);}else{setParticles(a.mode);}break;
  case 'remix':{const keys=Object.keys(REMIXES).filter(k=>k!=='night'&&k!==S.remix);const k=a.style==='random'?keys[Math.floor(Math.random()*keys.length)]:a.style;const r=REMIXES[k];S.remix=r.tint||r.sky?k:S.remix;if(r.hour)S.hourTarget=r.hour;if(r.ground)ground?.getObjectByName('ground-top')?.material.color.set(r.ground);if(r.particles)setParticles(r.particles);entities.forEach(e=>tintEntity(e,REMIXES[S.remix]));say(r.label+' world!',{speak:false,seconds:2.5});kindSound('magic');break;}
  case 'sky':skyMat.uniforms.top.value.set(a.color);S.base.sky=[a.color,S.base.sky[1]];break;
  case 'ground':ground?.getObjectByName('ground-top')?.material.color.set(a.color);break;
  case 'scale':for(const e of targets(a.target)){e.scaleTarget=a.factor===0?e.scale:e.scale*a.factor;}kindSound('pop');break;
  case 'color':for(const e of targets(a.target)){e.color=a.color;const d=e.detail;e.detail=-1;setDetail(e,d);}break;
  case 'chase':{const list=targets(a.target);list.forEach(e=>{e.live='chase';});people.forEach(p=>{p.emote='scared';p.emoteUntil=performance.now()+6000;});setTimeout(()=>list.forEach(e=>{if(e.live==='chase')e.live='wander';}),9000);say('Run!',{seconds:2});break;}
  case 'remove':for(const e of targets(a.target)){e.leaving=0;}break;
  case 'spawn':spawn(a);break;
  case 'emote':{const until=performance.now()+(a.emote==='sleep'?8000:5000);for(const p of people)if(a.who==='all'||p.sheet.name===a.who){p.emote=a.emote;p.emoteUntil=until;}break;}
  case 'gravity':S.lowGravity=a.low;break;
  case 'go':next(a.world);break;
  case 'magic':magic();break;
 }
}
function spawn(a){
 const c=centre(),count=Math.max(1,a.count||1);
 for(let i=0;i<count;i++){
  const ang=Math.random()*Math.PI*2,r=2.2+Math.random()*3.5+count*.08,pos=new T.Vector3(c.x+Math.cos(ang)*r,0,c.z+Math.sin(ang)*r);
  const id=a.id||'mystery';const e=addEntity(id,{pos,scale:a.size||1,color:a.color,live:KIT[id]?.cat==='animal'?'wander':null,label:a.id?null:a.word,word:a.word,detail:2,delay:i*.08});
  e.drop=4+Math.random()*2;
 }
 if(!a.id){orderModel(a.word,a.color);say(`I've asked the builder for a ${a.word}. Here's a stand-in until it's ready.`,{seconds:5});}
 else kindSound('ding');
 updateBuilder('full');
}
function orderModel(word,color){
 if(!word||S.orders.some(o=>o.word===word))return;
 S.orders.push({word,color,askedIn:WORLDS[S.worldIndex]?.id||'madlibs',at:new Date().toISOString(),detail:'low-first'});store.set('orders',S.orders);renderOrders();
}
function magic(){
 kindSound('magic');S.hourTarget=21;setParticles('confetti');
 for(let i=0;i<10;i++)setTimeout(()=>firework(new T.Vector3(between(-10,10),between(6,11),between(-10,4))),i*300);
 const c=centre();const r=addEntity('rainbow',{pos:new T.Vector3(c.x,-1.5,c.z-9),scale:1.4,detail:2});r.object.rotation.y=0;
 for(const e of entities)if(e.hero)e.flash=2;
 people.forEach(p=>{p.emote='dance';p.emoteUntil=performance.now()+9000;});
 say('Bananarama!'.replace('Bananarama',S.answers.word?S.answers.word[0].toUpperCase()+S.answers.word.slice(1):'Magic')+' Everybody dance!');
}

// ---- per-frame life --------------------------------------------------------------------
const clock=new T.Clock();let fps=60,fpsAcc=0,fpsN=0;
function frame(){
 const dt=Math.min(.05,clock.getDelta()),t=clock.elapsedTime;
 fpsAcc+=dt;fpsN++;if(fpsAcc>.5){fps=fpsN/fpsAcc;fpsAcc=fpsN=0;$('#fps').textContent=Math.round(fps)+' fps';}
 if(Math.abs(S.hourTarget-S.hour)>.01){let d=S.hourTarget-S.hour;S.hour+=Math.sign(d)*Math.min(Math.abs(d),dt*12);}applyHour();
 stepParticles(dt,t);stepBursts(dt);stepBeams(dt);stepUpgrade(dt);
 const fc=centre();
 for(let i=entities.length-1;i>=0;i--){const e=entities[i],o=e.object;
  if(e.appear){e.appear.t+=dt;const k=Math.min(1,Math.max(0,e.appear.t/e.appear.d));const s=k<1?(1-Math.pow(1-k,3))*(1+Math.sin(k*Math.PI)*.25):1;o.scale.setScalar(Math.max(.0001,s*e.scale));if(k>=1){e.appear=null;}if(e.appear&&e.appear.t>0&&e.appear.t-dt<=0&&rand()<.15)kindSound('build');}
  else if(e.scaleTarget!==undefined){const s=o.scale.x+(e.scaleTarget-o.scale.x)*Math.min(1,dt*5);o.scale.setScalar(s);if(Math.abs(s-e.scaleTarget)<.005){e.scale=e.scaleTarget;e.scaleTarget=undefined;}}
  if(e.leaving!==undefined){e.leaving+=dt*3;o.scale.setScalar(Math.max(.0001,e.scale*(1-e.leaving)));if(e.leaving>=1){world.remove(o);entities.splice(i,1);continue;}}
  if(e.drop){e.drop=Math.max(0,e.drop-dt*9);o.position.y=e.base.y+e.drop;}
  if(e.flash>0){e.flash-=dt;const g=Math.max(0,e.flash)*2;o.traverse(m=>{if(m.isMesh&&m.material.emissive){if(!m.userData.ownFlash){m.material=m.material.clone();m.userData.ownFlash=true;}m.material.emissive.set('#ffffff');m.material.emissiveIntensity=g*.6;}});if(e.flash<=0)o.traverse(m=>{if(m.userData.ownFlash){m.material.dispose();m.material=m.userData.baseMat||mat(m.material.color.getStyle());m.userData.ownFlash=false;}});}
  live(e,dt,t,fc);
 }
 for(const p of people){
  if(p.emote&&performance.now()>p.emoteUntil)p.emote=null;
  let moving=0;
  const chaser=entities.find(e=>e.live==='chase');
  if(chaser&&S.mode==='world'){const away=p.object.position.clone().sub(chaser.object.position).setY(0);if(away.length()<4){p.target=p.object.position.clone().add(away.normalize().multiplyScalar(2.5));p.target.clampLength(0,13);}}
  if(p.target){const d=p.target.clone().sub(p.object.position).setY(0),L=d.length();if(L<.08)p.target=null;else{const sp=(chaser?2.6:1.3)*dt;p.object.position.addScaledVector(d.normalize(),Math.min(L,sp));p.object.rotation.y=Math.atan2(d.x,d.z);moving=1;}}
  p.moving+=(moving-p.moving)*Math.min(1,dt*8);
  animateCharacter(p.object,t,{moving:p.moving,emote:p.emote,lowGravity:S.lowGravity});
  p.ring&&(p.ring.visible=S.selected===p);
 }
 if(S.mode==='show')showCamera(dt);
 orbit.update();creator?.frame(dt);
 renderer.render(scene,camera);creator?.rendered();
 requestAnimationFrame(frame);
}
function live(e,dt,t,fc){
 const o=e.object,ph=e.phase,b=e.base;
 switch(e.live){
  case 'wander':case 'graze':{if(e.live==='graze'){o.children[0]?.getObjectByName('head')&&(o.children[0].getObjectByName('head').rotation.x=.3+Math.sin(t+ph)*.25);break;}
   if(!e.target||o.position.distanceTo(e.target)<.2)e.target=e.home.clone().add(new T.Vector3(between(-3,3),0,between(-3,3)));
   const d=e.target.clone().sub(o.position).setY(0);o.position.addScaledVector(d.normalize(),dt*e.speed*.7);o.rotation.y=Math.atan2(d.x,d.z);swingLegs(o,t*8+ph,1);
   if(S.lowGravity)o.position.y=b.y+Math.abs(Math.sin(t*1.5+ph))*1.2;break;}
  case 'chase':{const prey=people.reduce((best,p)=>!best||p.object.position.distanceTo(o.position)<best.object.position.distanceTo(o.position)?p:best,null);if(!prey)break;const d=prey.object.position.clone().sub(o.position).setY(0);if(d.length()>1)o.position.addScaledVector(d.normalize(),dt*2.3);o.rotation.y=Math.atan2(d.x,d.z);swingLegs(o,t*12,1.2);break;}
  case 'flutter':o.position.set(b.x+Math.sin(t*.6+ph)*1.5,b.y+.8+Math.sin(t*2+ph)*.4,b.z+Math.cos(t*.5+ph)*1.5);o.rotation.y=t*.6+ph;flap(o,t*14);break;
  case 'float':o.position.y=b.y+Math.sin(t*.8+ph)*.4;o.rotation.y+=dt*.1;break;
  case 'swim':{const r=Math.hypot(b.x,b.z),a=Math.atan2(b.z,b.x)+t*e.speed*.12;o.position.set(Math.cos(a)*r,b.y+Math.sin(t+ph)*.3,Math.sin(a)*r);o.rotation.y=-a;const tail=o.getObjectByName('tail');if(tail)tail.rotation.y=Math.sin(t*6+ph)*.5;break;}
  case 'circle':{const r=Math.hypot(b.x,b.z),a=Math.atan2(b.z,b.x)+t*.25*e.speed;o.position.set(Math.cos(a)*r,b.y+Math.sin(t+ph)*.5,Math.sin(a)*r);o.rotation.y=-a;flap(o,t*6);break;}
  case 'spin':o.rotation.y+=dt*.8;{const w=o.getObjectByName('wheel');if(w)w.rotation.z+=dt*.3;}break;
  case 'sway':o.traverse(m=>{if(m.name==='frond')m.rotation.z=Math.sin(t*1.2+ph+m.position.x*3)*.2;});break;
  default:{const s=o.getObjectByName('sails')||o.getObjectByName('rotor');if(s){s.name==='rotor'?s.rotation.y+=dt*12:s.rotation.z+=dt*.8;}}
 }
}
function swingLegs(o,ph,amt){let i=0;o.traverse(m=>{if(m.name==='leg'){m.rotation.x=Math.sin(ph+(i++%2)*Math.PI)*.5*amt;}if(m.name==='tail')m.rotation.y=Math.sin(ph*.5)*.4;});}
function flap(o,ph){o.traverse(m=>{if(m.name==='wing')m.rotation.z=Math.sin(ph)*.7*Math.sign(m.position.x||1);});}

// ---- the show camera (world 1 is watch-only) ---------------------------------------------
function showCamera(dt){
 S.showClock+=dt;const t=S.showClock,c=centre();
 const k=Math.min(1,t/22),r=22-14*k+Math.sin(t*.3)*1.2,h=12-8.5*k,a=.6+t*.16;
 camera.position.lerp(new T.Vector3(c.x+Math.sin(a)*r,h,c.z+Math.cos(a)*r),Math.min(1,dt*2));
 orbit.target.lerp(new T.Vector3(c.x,1+2*(1-k),c.z),Math.min(1,dt*2));
 const beats=WORLDS[S.worldIndex].beats,i=Math.floor((t-3)/7);
 if(i>=0&&i<beats.length&&S.showBeat!==i){S.showBeat=i;say(beats[i]);}
 if(t>3+beats.length*7+2&&!S.showDone){S.showDone=true;$('#next').classList.add('glow');}
}

// ---- flow: setup, madlibs, map, worlds -----------------------------------------------------
function screen(name){S.mode=name;document.body.dataset.mode=name;}
async function enterWorld(index){
 if(S.busy)return;S.busy=true;
 const w=WORLDS[index];$('#map').hidden=true;
 if(S.worldIndex>=0&&people.length){beam(false);kindSound('whoosh');await wait(1300);}
 $('#flash').classList.add('on');await wait(350);
 S.worldIndex=index;S.visited.add(w.id);store.set('visited',[...S.visited]);if(index>=1){S.secretUnlocked=S.secretUnlocked||index>=1;store.set('secret',S.secretUnlocked);}
 buildWorld(w);placeFamily();people.forEach(p=>p.object.visible=false);
 S.showClock=0;S.showBeat=-1;S.showDone=false;$('#next').classList.remove('glow');
 const show=w.mode==='show';orbit.autoRotate=false;screen(show?'show':'world');orbit.enabled=!show;
 camera.position.set(0,show?12:7,show?22:12);orbit.target.set(0,1,0);
 $('#world-name').textContent=w.name;$('#world-stop').textContent=w.secret?'Secret world':`Stop ${w.stop} of ${MAP.length}`;
 $('#title-card h1').textContent=w.name;$('#title-card p').textContent=w.blurb;$('#title-card').classList.add('show');setTimeout(()=>$('#title-card').classList.remove('show'),3200);
 $('#flash').classList.remove('on');
 await wait(400);beam(true);await wait(1600);
 setTimeout(startUpgrade,Math.max(1200,entities.length*15));
 if(!show){say(w.beats[0]);setTimeout(()=>w.beats[1]&&say(w.beats[1],{speak:false,seconds:6}),5200);chips(w);}
 if(w.finale)setTimeout(()=>{people.forEach(p=>{p.emote='cheer';p.emoteUntil=performance.now()+4000;});},3000);
 S.busy=false;
}
function next(which){
 if(which&&which!=='next'){const i=WORLDS.findIndex(w=>w.id===which);if(i>=0)return enterWorld(i);}
 const i=S.worldIndex+1;
 if(i>=WORLDS.length){say('That was the whole adventure. Want to go again?');return openMap();}
 if(WORLDS[i].secret)return secretReveal(i);
 enterWorld(i);
}
async function secretReveal(i){
 openMap();await wait(900);
 const card=$('#map .stops');card.classList.add('glitch');kindSound('magic');say('Wait a second. There is a stop that is not on the map.');
 await wait(2200);S.secretUnlocked=true;store.set('secret',true);renderMap();card.classList.remove('glitch');
 $('#map .secret')?.classList.add('arrive');await wait(2600);enterWorld(i);
}
function openMap(){screen('map');renderMap();$('#map').hidden=false;}
function renderMap(){
 const stops=WORLDS.filter(w=>!w.secret||S.secretUnlocked);
 $('#map .stops').innerHTML=stops.map(w=>{const i=WORLDS.indexOf(w);return `<button class="stop ${w.secret?'secret':''} ${S.visited.has(w.id)?'visited':''} ${i===S.worldIndex?'here':''}" data-i="${i}"><span class="num">${w.secret?'★':w.stop}</span><b>${w.name}</b><small>${w.blurb}</small></button>`;}).join('<i class="path"></i>');
 $$('#map .stop').forEach(b=>b.onclick=()=>enterWorld(+b.dataset.i));
}
function chips(w){
 const k=entities.find(e=>KIT[e.kitId]?.cat==='animal'&&e.live==='wander')?.kitId;const name=k?KIT[k].name:'dragon';
 const list=['Make it night','Make it snow','Everybody dance',`Make the ${name} giant`,`${name} chase us`,'Add 5 unicorns','Switch it up','Fireworks'];
 if(w.lowGravity)list.splice(2,0,'Everybody jump');
 $('#chips').innerHTML=list.map(c=>`<button>${c}</button>`).join('');$$('#chips button').forEach(b=>b.onclick=()=>run(b.textContent));
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// ---- tapping the world (play worlds) ------------------------------------------------------
const ray=new T.Raycaster();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
renderer.domElement.addEventListener('pointerup',e=>{
 if(S.mode!=='world'||!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;
 ray.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1),camera);
 const hit=ray.intersectObjects([familyGroup,world,ground].filter(Boolean),true)[0];if(!hit)return;
 let o=hit.object;while(o&&!o.userData.person&&!o.userData.entity)o=o.parent;
 if(o?.userData.person){S.selected=people.find(p=>p.object===o);say(S.selected.sheet.name+' selected. Tap where to go.',{speak:false,seconds:2});kindSound('ding');return;}
 if(o?.userData.entity){const en=o.userData.entity;en.flash=.5;en.drop=1.2;kindSound('pop');const k=KIT[en.kitId];say(en.word&&!KIT[en.kitId]?.tags.includes(en.word)?en.word:k?.name||'Something',{speak:false,seconds:2});return;}
 const point=hit.point.setY(0);const who=S.selected?[S.selected]:people;who.forEach((p,i)=>p.target=point.clone().add(new T.Vector3((i-(who.length-1)/2)*.6,0,0)));
});
addEventListener('keydown',e=>{
 if(e.target.matches('input,textarea'))return;
 if(e.key==='n'||e.key==='N')next();
 if(e.key==='m'||e.key==='M')openMap();
 if(e.key==='r'||e.key==='R')run('switch it up');
 if(e.key==='b'||e.key==='B')$('#builder').classList.toggle('show');
 if(/^[1-6]$/.test(e.key))enterWorld(+e.key-1);
 if(e.key===' '&&S.mode==='world'){e.preventDefault();toggleMic();}
});

// ---- command bar and voice ----------------------------------------------------------------
$('#say-form').addEventListener('submit',e=>{e.preventDefault();const v=$('#say').value.trim();if(!v)return;run(v);$('#say').value='';});
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null,listening=false;
function toggleMic(){
 if(!SR){say('Voice needs Chrome or Safari. You can type instead.',{speak:false});return;}
 if(listening){rec?.stop();return;}
 rec=new SR();rec.lang='en-US';rec.interimResults=true;rec.continuous=true;
 rec.onresult=ev=>{const r=ev.results[ev.results.length-1];$('#heard').textContent='🎤 '+r[0].transcript;$('#heard').classList.add('show');if(r.isFinal)run(r[0].transcript.trim(),{fromVoice:true});};
 rec.onend=()=>{listening=false;$('#mic').classList.remove('on');};rec.onerror=()=>{listening=false;$('#mic').classList.remove('on');};
 rec.start();listening=true;$('#mic').classList.add('on');
}
$('#mic').onclick=toggleMic;
$('#next').onclick=()=>next();$('#map-btn').onclick=openMap;
$('#sound').onclick=()=>{S.sound=!S.sound;store.set('sound',S.sound);$('#sound').textContent=S.sound?'🔊':'🔇';};$('#sound').textContent=S.sound?'🔊':'🔇';
$('#builder-btn').onclick=()=>$('#builder').classList.toggle('show');

// ---- setup: the crew (family) -------------------------------------------------------------
function renderCrew(){
 $('#crew-list').innerHTML=S.family.map((f,i)=>`<div class="member" data-i="${i}">
  <div class="swatches"><i style="background:${f.hair}"></i><i style="background:${f.skin}"></i><i style="background:${f.shirt}"></i><i style="background:${f.pants}"></i></div>
  <input class="name" value="${escapeHtml(f.name)}" aria-label="Name" maxlength="16">
  <select class="role"><option value="adult" ${f.role==='adult'?'selected':''}>Grown-up</option><option value="kid" ${f.role==='kid'?'selected':''}>Kid</option></select>
  <select class="hairstyle">${HAIR_STYLES.map(h=>`<option ${f.hairStyle===h?'selected':''}>${h}</option>`).join('')}</select>
  <label class="tiny"><input type="checkbox" class="glasses" ${f.glasses?'checked':''}> glasses</label>
  <div class="colors">${['hair','skin','shirt','pants'].map(k=>`<label>${k}<input type="color" data-k="${k}" value="${f[k]}"></label>`).join('')}</div>
  <button class="remove" title="Remove">✕</button></div>`).join('');
 $$('#crew-list .member').forEach(m=>{const f=S.family[+m.dataset.i];
  m.querySelector('.name').oninput=e=>{f.name=e.target.value||'Explorer';saveFamily(S.family);};
  m.querySelector('.role').onchange=e=>{f.role=e.target.value;f.height=f.role==='kid'?.68:1;saveFamily(S.family);};
  m.querySelector('.hairstyle').onchange=e=>{f.hairStyle=e.target.value;saveFamily(S.family);};
  m.querySelector('.glasses').onchange=e=>{f.glasses=e.target.checked;saveFamily(S.family);};
  m.querySelectorAll('input[type=color]').forEach(inp=>inp.oninput=e=>{f[inp.dataset.k]=e.target.value;saveFamily(S.family);renderCrewSwatches();});
  m.querySelector('.remove').onclick=()=>{if(S.family.length>1){S.family.splice(+m.dataset.i,1);saveFamily(S.family);renderCrew();}};});
}
function renderCrewSwatches(){$$('#crew-list .member').forEach(m=>{const f=S.family[+m.dataset.i];m.querySelectorAll('.swatches i').forEach((i,k)=>i.style.background=f[['hair','skin','shirt','pants'][k]]);});}
const escapeHtml=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
$('#add-member').onclick=()=>{S.family.push({id:'p'+Date.now(),name:'Explorer',role:'kid',height:.68,skin:'#f2c4a0',hair:'#6a4a2a',hairStyle:'short',shirt:'#ffb02e',pants:'#3a5ad8',shoes:'#2a2624'});saveFamily(S.family);renderCrew();};
$('#reset-crew').onclick=()=>{S.family=structuredClone(PLACEHOLDER_FAMILY);saveFamily(S.family);renderCrew();};
$('#crew-next').onclick=()=>{screen('madlibs');madlib(0);};

// Photo colour picker: local only.
$('#photo-input').onchange=e=>{
 const file=e.target.files[0];if(!file)return;const img=new Image();img.onload=()=>{
  const c=$('#photo-canvas'),scale=Math.min(1,900/img.width);c.width=img.width*scale;c.height=img.height*scale;c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);
  $('#photo-dialog').showModal();photoPick(0,0);};img.src=URL.createObjectURL(file);e.target.value='';};
const PICKS=['skin','hair','shirt','pants'];let pick={m:0,k:0};
function photoPick(m,k){pick={m,k};const f=S.family[m];$('#photo-prompt').innerHTML=f?`Tap <b>${escapeHtml(f.name)}</b>'s <b>${PICKS[k]==='skin'?'face':PICKS[k]}</b>`:'Done!';}
$('#photo-canvas').onclick=e=>{const c=e.currentTarget,r=c.getBoundingClientRect();const x=(e.clientX-r.left)*c.width/r.width,y=(e.clientY-r.top)*c.height/r.height;const f=S.family[pick.m];if(!f)return;f[PICKS[pick.k]]=sampleColor(c,x|0,y|0);saveFamily(S.family);let {m,k}=pick;k++;if(k>=PICKS.length){k=0;m++;}photoPick(m,k);renderCrew();if(m>=S.family.length)setTimeout(closePhoto,500);};
function closePhoto(){const c=$('#photo-canvas');c.getContext('2d').clearRect(0,0,c.width,c.height);c.width=c.height=1;$('#photo-dialog').close();}
$('#photo-done').onclick=closePhoto;

// ---- madlibs ---------------------------------------------------------------------------
function madlib(i){
 const q=MADLIBS[i];if(!q){finishMadlibs();return;}
 $('#ml-step').textContent=`${i+1} of ${MADLIBS.length}`;$('#ml-ask').textContent=q.ask;$('#ml-input').value=S.answers[q.key]||'';$('#ml-input').placeholder=q.example;
 $('#ml-input').focus();preview();
 $('#ml-form').onsubmit=e=>{e.preventDefault();S.answers[q.key]=$('#ml-input').value.trim()||q.example.replace(/^an? /,'');store.set('answers',S.answers);madlib(i+1);};
 $('#ml-back').onclick=()=>i?madlib(i-1):screen('setup');
 $('#ml-mic').onclick=()=>{if(!SR)return;const r=new SR();r.lang='en-US';r.onresult=ev=>{$('#ml-input').value=ev.results[0][0].transcript;preview();};r.start();};
 function preview(){const v=$('#ml-input').value.trim();if(q.key==='word'||q.key==='color'||!v){$('#ml-match').textContent='';return;}const m=match(v);$('#ml-match').innerHTML=m?.id?`✓ The builder already knows <b>${KIT[m.id].name}</b>`:m?`✨ New model: the builder will make a <b>${escapeHtml(m.word)}</b>`:'';}
 $('#ml-input').oninput=preview;
}
function finishMadlibs(){
 const order=modelOrder(S.answers,match),kit=order.filter(o=>o.id),fresh=order.filter(o=>!o.id);
 for(const f of fresh)orderModel(f.word,f.color);
 $('#order-summary').innerHTML=`<p><b>${kit.length}</b> models are ready in the kit (built from recipes: no download, no tokens).</p>`+(fresh.length?`<p><b>${fresh.length}</b> new: ${fresh.map(f=>'<b>'+escapeHtml(f.word)+'</b>').join(', ')}. Stand-ins are used until the builder delivers them, starting with the world you reach first.</p>`:'<p>Every answer matched a model the builder already knows.</p>');
 screen('ready');
}
$('#sample-answers').onclick=()=>{S.answers={...SAMPLE_ANSWERS};store.set('answers',S.answers);finishMadlibs();};
$('#teleport').onclick=()=>{try{ac??=new AudioContext();ac.resume();}catch{}enterWorld(0);};
$('#download-order').onclick=()=>{
 const order=modelOrder(S.answers,match).map(o=>({...o,kit:!!o.id,detailPlan:['blockout on the map','full detail on arrival']}));
 const blob=new Blob([JSON.stringify({kind:'family-teleport/model-order',version:1,createdAt:new Date().toISOString(),madlibs:S.answers,newModels:S.orders,all:order},null,1)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='model-order.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
function renderOrders(){$('#orders').innerHTML=S.orders.length?S.orders.map(o=>`<li>${escapeHtml(o.word)} <small>${o.askedIn}</small></li>`).join(''):'<li>None yet</li>';}

// ---- Holodeck Creator: the ship's computer (Claude) can drive this page too --------------
let creator=null;
if(params.has('creator'))import('../simulations/holodeck/stage.mjs').then(({createStage,creatorRoom})=>{const room=creatorRoom();if(!room)return;
 const kit={has:id=>!!KIT[id],build:id=>build(id,{detail:2}),list:kitList};
 creator=createStage({T,scene,camera,orbit,renderer,host,kit,world:()=>world,people:()=>people.map(p=>({name:p.sheet.name,object:p.object,doing:p.emote||(p.target?'walking':'standing')})),ground:()=>[ground].filter(Boolean),family:()=>'teleport',name:()=>WORLDS[S.worldIndex]?.name||'Family Teleport',
  fit:()=>{camera.position.set(0,7,12);orbit.target.set(0,1,0);},stopFollow:()=>{},clock:()=>({hour:S.hour,day:1,paused:false,speed:1,weather:pMode,weatherMode:pMode}),walkPace:v=>1,
  setHour:h=>S.hourTarget=h,setPaused:()=>{},setSpeed:()=>{},setWeather:m=>act({do:'weather',mode:{auto:'clear',cloudy:'clear',wind:'leaves',hail:'snow',heat:'sparkles'}[m]||m})},{room,relay:params.get('relay')});
 window.holodeck=creator;});
// A tiny scripting hook for the presenter's console and tests.
window.teleport={run,next,enterWorld,openMap,state:S,entities:()=>entities,people:()=>people};

for(const ev of ['pointerdown','keydown'])addEventListener(ev,()=>{S.gesture=true;},{once:true,capture:true});
// ---- boot -------------------------------------------------------------------------------
renderCrew();renderOrders();
if(params.has('demo')){S.answers={...SAMPLE_ANSWERS,...S.answers};const w=params.get('world');enterWorld(w?Math.max(0,WORLDS.findIndex(x=>x.id===w)):0);}
else{screen('setup');buildWorld(WORLDS[0]);S.worldIndex=0;placeFamily();S.worldIndex=-1;setTimeout(startUpgrade,1500);camera.position.set(0,9,18);orbit.autoRotate=true;orbit.autoRotateSpeed=.4;}
requestAnimationFrame(frame);
