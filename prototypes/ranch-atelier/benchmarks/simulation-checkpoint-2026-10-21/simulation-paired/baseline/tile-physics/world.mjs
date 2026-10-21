import {compileTriangles} from './collider.mjs';
import {Vector3 as V,Quaternion as Q,Triangle,Matrix4} from './three.mjs';
const vec=a=>new V(...a),quat=a=>new Q(...a).normalize(),clone=structuredClone;
const finite=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(Number.isFinite);
const check=(ok,message)=>{if(!ok)throw Error(message);};
export const PROFILES=Object.freeze({earth:Object.freeze({gravity:[0,-9.81,0],gravityFrame:'world',drag:0,restitution:.08,friction:.65}),moon:Object.freeze({gravity:[0,-1.62,0],gravityFrame:'world',drag:0,restitution:.08,friction:.65})});
export function profile(spec){const p={...PROFILES.earth,...clone(spec)};check(finite(p.gravity,3)&&['world','tile'].includes(p.gravityFrame),'Invalid gravity');check([p.drag,p.restitution,p.friction].every(x=>Number.isFinite(x)&&x>=0)&&p.restitution<=1,'Invalid material');return p;}
export function frame(spec={}){const f={position:[0,0,0],rotation:[0,0,0,1],velocity:[0,0,0],angularVelocity:[0,0,0],...clone(spec)};check(['position','velocity','angularVelocity'].every(k=>finite(f[k],3))&&finite(f.rotation,4)&&Math.hypot(...f.rotation)>0,'Invalid frame');f.rotation=quat(f.rotation).toArray();return f;}
export function worldPoint(f,p){return vec(p).applyQuaternion(quat(f.rotation)).add(vec(f.position)).toArray();}
export function localPoint(f,p){return vec(p).sub(vec(f.position)).applyQuaternion(quat(f.rotation).invert()).toArray();}
export function surfaceVelocity(f,p){return vec(f.angularVelocity).cross(vec(p).sub(vec(f.position))).add(vec(f.velocity)).toArray();}
export function worldVelocity(f,p,v){return vec(v).applyQuaternion(quat(f.rotation)).add(vec(surfaceVelocity(f,worldPoint(f,p)))).toArray();}
export function localVelocity(f,p,v){return vec(v).sub(vec(surfaceVelocity(f,p))).applyQuaternion(quat(f.rotation).invert()).toArray();}
function inside(tile,p){const q=localPoint(tile.frame,p),v=tile.volume;if(q[1]<v.minY||q[1]>=v.maxY)return false;let sign=0;for(let i=0;i<v.polygon.length;i++){const a=v.polygon[i],b=v.polygon[(i+1)%v.polygon.length],cross=(b[0]-a[0])*(q[2]-a[1])-(b[1]-a[1])*(q[0]-a[0]);if(Math.abs(cross)<1e-8)continue;const s=Math.sign(cross);if(sign&&s!==sign)return false;sign=s;}return true;}
function moveFrame(f,dt){f.position=vec(f.position).addScaledVector(vec(f.velocity),dt).toArray();const speed=Math.hypot(...f.angularVelocity);if(speed)f.rotation=new Q().setFromAxisAngle(vec(f.angularVelocity).divideScalar(speed),speed*dt).multiply(quat(f.rotation)).normalize().toArray();}
/** Metres, kilograms, physical seconds. The host must not pass the activity/calendar multiplier. */
export class PhysicsWorld{
 constructor({step=1/120,outside=PROFILES.earth}={}){check(Number.isFinite(step)&&step>0&&step<=1/60,'Invalid fixed step');this.step=step;this.outside=profile(outside);this.tiles=new Map();this.colliders=new Map();this.bodies=new Map();this.time=0;this.accumulator=0;this.sequence=0;this.events=[];}
 emit(type,detail){this.events.push({sequence:++this.sequence,time:this.time,type,...detail});}
 drainEvents(){return this.events.splice(0);}
 addTile({id,volume,profile:spec=PROFILES.earth,frame:pose={},triangles=[]}){check(typeof id==='string'&&!this.tiles.has(id),'Duplicate/invalid tile id');check(volume?.polygon?.length>=3&&volume.polygon.every(p=>finite(p,2))&&Number.isFinite(volume.minY)&&Number.isFinite(volume.maxY)&&volume.maxY>volume.minY,'Finite convex volume required');check(triangles.every(t=>finite(t,9)),'Invalid triangles');const t={id,volume:clone(volume),profile:profile(spec),frame:frame(pose),triangles:clone(triangles),connected:true};this.tiles.set(id,t);this.colliders.set(id,compileTriangles(t.triangles));return t;}
 addBody({id,storyId=id,position,velocity=[0,0,0],radius=.3,mass=1,attachment=null,metadata={},kinematic=false}){check(typeof id==='string'&&!this.bodies.has(id)&&typeof storyId==='string','Duplicate/invalid body identity');check(finite(position,3)&&finite(velocity,3)&&Number.isFinite(radius)&&radius>0&&Number.isFinite(mass)&&mass>0,'Invalid body');if(attachment)check(this.tiles.has(attachment.tileId)&&finite(attachment.localPosition,3),'Invalid attachment');const b={id,storyId,position:clone(position),velocity:clone(velocity),radius,mass,kinematic:!!kinematic,attachment:clone(attachment),metadata:clone(metadata),tileId:null,settled:false,quiet:0};this.bodies.set(id,b);this.membership(b);return b;}
 membership(b){const old=b.tileId,previous=this.tiles.get(old);b.tileId=previous&&inside(previous,b.position)?old:[...this.tiles.values()].sort((a,b)=>a.id.localeCompare(b.id)).find(t=>inside(t,b.position))?.id??null;if(old!==b.tileId)this.emit('boundary',{bodyId:b.id,from:old,to:b.tileId});return this.tiles.get(b.tileId);}
 setFrame(id,pose){const t=this.tiles.get(id);check(t,'Unknown tile');t.frame=frame({...t.frame,...pose});this.emit('manipulation',{tileId:id});}
 driveFrame(id,target,duration){const t=this.tiles.get(id);check(t,'Unknown tile');check(Number.isFinite(duration)&&duration>0&&duration<=1,'Drive duration must be 0..1 seconds');const end=frame({...t.frame,...target}),start=clone(t.frame),delta=quat(end.rotation).multiply(quat(start.rotation).invert());if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);const angle=2*Math.acos(Math.min(1,Math.max(-1,delta.w))),axis=new V(delta.x,delta.y,delta.z);t.frame.velocity=vec(end.position).sub(vec(start.position)).divideScalar(duration).toArray();t.frame.angularVelocity=axis.lengthSq()>1e-16?axis.normalize().multiplyScalar(angle/duration).toArray():[0,0,0];t.motion={start,end,duration,elapsed:0};this.emit('manipulation',{tileId:id});}
 stopFrame(id){const t=this.tiles.get(id);check(t,'Unknown tile');delete t.motion;t.frame.velocity=[0,0,0];t.frame.angularVelocity=[0,0,0];}
 setConnected(id,connected){const t=this.tiles.get(id);check(t,'Unknown tile');t.connected=!!connected;this.emit(connected?'reconnect':'detach',{tileId:id});}
 detachBody(id){const b=this.bodies.get(id);check(b,'Unknown body');if(!b.attachment)return;const t=this.tiles.get(b.attachment.tileId);b.position=worldPoint(t.frame,b.attachment.localPosition);b.velocity=surfaceVelocity(t.frame,b.position);b.attachment=null;this.emit('attachment',{bodyId:id,attached:false});}
 attachBody(id,tileId){const b=this.bodies.get(id),t=this.tiles.get(tileId);check(b&&t,'Unknown body/tile');b.attachment={tileId,localPosition:localPoint(t.frame,b.position)};this.emit('attachment',{bodyId:id,attached:true,tileId});}
 advance(seconds){check(Number.isFinite(seconds)&&seconds>=0&&seconds<=1,'Advance accepts 0..1 physical seconds; host must subdivide larger intervals');this.accumulator+=seconds;while(this.accumulator+1e-12>=this.step){this.tick(this.step);this.accumulator=Math.max(0,this.accumulator-this.step);}return this.time;}
 tick(dt){
  // Bound each microstep's travel relative to body radius, including moving colliders.
  const free=[...this.bodies.values()].filter(b=>!b.attachment&&!b.kinematic),minRadius=Math.min(...free.map(b=>b.radius),1);
  let speed=Math.max(0,...free.map(b=>Math.hypot(...b.velocity)+Math.max(Math.hypot(...this.outside.gravity),...([...this.tiles.values()].map(t=>Math.hypot(...t.profile.gravity))))*dt));
  for(const t of this.tiles.values()){const extent=this.colliders.get(t.id).extent;speed=Math.max(speed,Math.hypot(...t.frame.velocity)+Math.hypot(...t.frame.angularVelocity)*extent);}
  const steps=Math.max(1,Math.ceil(speed*dt/(minRadius*.25)));check(steps<=256,'Motion exceeds supported collision step budget');const h=dt/steps;
  for(let s=0;s<steps;s++){
   for(const t of this.tiles.values()){if(t.motion){const m=t.motion;m.elapsed=Math.min(m.duration,m.elapsed+h);const a=m.elapsed/m.duration;t.frame.position=vec(m.start.position).lerp(vec(m.end.position),a).toArray();t.frame.rotation=quat(m.start.rotation).slerp(quat(m.end.rotation),a).toArray();}else moveFrame(t.frame,h);}
   for(const b of this.bodies.values()){
    if(b.attachment){const t=this.tiles.get(b.attachment.tileId);b.position=worldPoint(t.frame,b.attachment.localPosition);b.velocity=surfaceVelocity(t.frame,b.position);continue;}
    if(b.kinematic){this.membership(b);continue;}
    const tile=this.membership(b),p=tile?.profile??this.outside,g=vec(p.gravity);if(p.gravityFrame==='tile'&&tile)g.applyQuaternion(quat(tile.frame.rotation));
    const velocity=vec(b.velocity).addScaledVector(g,h).multiplyScalar(Math.exp(-p.drag*h));b.position=vec(b.position).addScaledVector(velocity,h).toArray();b.velocity=velocity.toArray();let contact=false,maxRelative=0;
    // All real collider meshes remain active, including disconnected/held tiles.
    for(let iteration=0;iteration<3;iteration++)for(const t of this.tiles.values())for(const index of this.colliders.get(t.id).query(localPoint(t.frame,b.position),b.radius+1e-7)){
     const points=t.triangles[index];
     const tri=new Triangle(vec(worldPoint(t.frame,points.slice(0,3))),vec(worldPoint(t.frame,points.slice(3,6))),vec(worldPoint(t.frame,points.slice(6,9)))),center=vec(b.position),nearest=tri.closestPointToPoint(center,new V()),delta=center.clone().sub(nearest),distance=delta.length();if(distance>=b.radius)continue;
     const n=distance>1e-10?delta.divideScalar(distance):tri.getNormal(new V());if(n.lengthSq()<.5)continue;
     b.position=center.addScaledVector(n,b.radius-distance+1e-8).toArray();const moving=vec(surfaceVelocity(t.frame,nearest.toArray())),relative=vec(b.velocity).sub(moving),vn=relative.dot(n);if(vn<0){const bounce=Math.abs(vn)<.3?0:p.restitution,impulse=-(1+bounce)*vn;relative.addScaledVector(n,impulse);const tangent=relative.clone().addScaledVector(n,-relative.dot(n)),length=tangent.length();if(length>0)relative.addScaledVector(tangent,-Math.min(length,p.friction*impulse)/length);b.velocity=relative.add(moving).toArray();}
     maxRelative=Math.max(maxRelative,vec(b.velocity).sub(moving).length());contact=true;
    }
    const was=b.settled;b.quiet=contact&&maxRelative<.05?b.quiet+h:0;b.settled=b.quiet>=.25;if(contact&&!b.contact)this.emit('contact',{bodyId:b.id,tileId:b.tileId});b.contact=contact;if(b.settled&&!was)this.emit('settled',{bodyId:b.id,tileId:b.tileId});this.membership(b);
   }
   const bodies=[...this.bodies.values()];
   for(let iteration=0;iteration<3;iteration++)for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const a=bodies[i],b=bodies[j],ia=a.kinematic||a.attachment?0:1/a.mass,ib=b.kinematic||b.attachment?0:1/b.mass;if(!ia&&!ib)continue;
    const n=vec(b.position).sub(vec(a.position)),distance=n.length(),reach=a.radius+b.radius;if(distance>=reach)continue;if(distance<1e-10)n.set(1,0,0);else n.divideScalar(distance);
    const correction=(reach-distance+1e-8)/(ia+ib);if(ia)a.position=vec(a.position).addScaledVector(n,-correction*ia).toArray();if(ib)b.position=vec(b.position).addScaledVector(n,correction*ib).toArray();
    const relative=vec(b.velocity).sub(vec(a.velocity)),speed=relative.dot(n);if(speed<0){const pa=this.tiles.get(a.tileId)?.profile??this.outside,pb=this.tiles.get(b.tileId)?.profile??this.outside,restitution=Math.abs(speed)<.3?0:Math.min(pa.restitution,pb.restitution),impulse=-(1+restitution)*speed/(ia+ib);if(ia)a.velocity=vec(a.velocity).addScaledVector(n,-impulse*ia).toArray();if(ib)b.velocity=vec(b.velocity).addScaledVector(n,impulse*ib).toArray();}
    if(Math.abs(speed)>.05||reach-distance>.005)for(const body of [a,b])if(!body.kinematic&&!body.attachment){body.quiet=0;body.settled=false;}
   }
   for(const t of this.tiles.values())if(t.motion?.elapsed>=t.motion?.duration)this.stopFrame(t.id);
   this.time+=h;
  }
 }
 snapshot(){return clone({version:1,step:this.step,outside:this.outside,time:this.time,accumulator:this.accumulator,sequence:this.sequence,events:this.events,tiles:[...this.tiles.values()],bodies:[...this.bodies.values()]});}
 restore(saved){check(saved?.version===1,'Unsupported physics save');const next=new PhysicsWorld({step:saved.step,outside:saved.outside});for(const t of saved.tiles){const tile=next.addTile(t);tile.connected=t.connected;if(t.motion)tile.motion=clone(t.motion);}for(const b of saved.bodies){const body=next.addBody(b);Object.assign(body,clone(b));}check(Number.isFinite(saved.time)&&Number.isFinite(saved.accumulator),'Invalid clock');Object.assign(this,{tiles:next.tiles,colliders:next.colliders,bodies:next.bodies,step:next.step,outside:next.outside,time:saved.time,accumulator:saved.accumulator,sequence:saved.sequence,events:clone(saved.events)});}
}
/** Capture actual rendered mesh triangles in a tile's metre-space; caller selects collidable assets. */
export function meshTriangles(mesh,tileObject,renderUnitsPerMetre=.1){check(renderUnitsPerMetre>0,'Invalid scale');mesh.updateWorldMatrix(true,false);tileObject.updateWorldMatrix(true,false);const inverse=new Matrix4().copy(tileObject.matrixWorld).invert(),matrix=new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),position=mesh.geometry?.attributes.position,index=mesh.geometry?.index;check(position,'Mesh requires positions');const out=[],count=index?index.count:position.count;for(let i=0;i<count;i+=3){const triangle=[];for(let j=0;j<3;j++){const p=new V().fromBufferAttribute(position,index?index.getX(i+j):i+j).applyMatrix4(matrix).divideScalar(renderUnitsPerMetre);triangle.push(...p.toArray());}out.push(triangle);}return out;}
