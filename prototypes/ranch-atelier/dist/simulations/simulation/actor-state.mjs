// Serializable numeric poses. The simulation never owns a Three.js object.
export class Vec3 {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(p){return this.set(p.x,p.y,p.z);}
 clone(){return new Vec3(this.x,this.y,this.z);}
 multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
 toArray(){return [this.x,this.y,this.z];}
 fromArray(a){return this.set(...a);}
}
export class Vec2 {
 constructor(x=0,y=0){this.x=x;this.y=y;}
 set(x,y){this.x=x;this.y=y;return this;}
 toArray(){return [this.x,this.y];}
 fromArray(a){return this.set(...a);}
}
export function createAnimalActor({a,p,position,rotation,scale,target,rest,timer=0,phase=0,slot=0}){
 return {a,p,body:{position:new Vec3(...position),rotation:{x:rotation[0],y:rotation[1],z:rotation[2]},scale:new Vec3(...scale),visible:true},target:new Vec2(...target),rest:{...rest},timer,phase,slot,detail:'full',pendingSeconds:0,animation:{distance:0,dt:0,activity:a.activity}};
}
export function worldToPen(p,q,heightAt){const dx=q.x-p.world.x,dz=q.z-p.world.z,c=Math.cos(p.angle),s=Math.sin(p.angle);return new Vec3(dx*c-dz*s,heightAt(q.x,q.z)-heightAt(p.world.x,p.world.z),dx*s+dz*c);}
export function poseSnapshot(actor){return {position:actor.body.position.toArray(),rotation:[actor.body.rotation.x,actor.body.rotation.y,actor.body.rotation.z],scale:actor.body.scale.toArray(),pendingSeconds:actor.pendingSeconds};}
export function createPersonActor(worker){
 const actor={};for(const [key,value]of Object.entries(worker))if(!['body','waterCarry','feedCarry','core'].includes(key))actor[key]=value;
 actor.body={position:new Vec3(...worker.body.position.toArray()),rotation:{x:worker.body.rotation.x,y:worker.body.rotation.y,z:worker.body.rotation.z},scale:new Vec3(...worker.body.scale.toArray()),visible:worker.body.visible,userData:{person:worker.person,activity:worker.body.userData.activity,walkedMetres:worker.body.userData.walkedMetres,routeVisits:worker.body.userData.routeVisits}};
 actor.waterCarry={visible:worker.waterCarry.visible};actor.feedCarry={visible:worker.feedCarry.visible};actor.animation=null;return actor;
}
