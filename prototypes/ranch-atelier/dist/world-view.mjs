import {captureDragActors} from './drag-actors.mjs';
import * as T from './vendor/three.module.js';
import {makePerson,animatePerson} from './town-life/people/models.mjs';
import {population} from './town-life/people/core.mjs';
import {affinityColor,hash} from './world-model.mjs';
export function createWorldView(scene,scale){
 const root=new T.Group(),actors=new Map(),overlay=new T.Group();root.scale.setScalar(scale);scene.add(root);root.add(overlay);let lastWorld=null,lastKind=null,lastSelected=null;
 function clear(){for(const o of [...overlay.children]){o.geometry?.dispose();o.material?.dispose();overlay.remove(o);}}
 function ring(position,color,radius,heightAt){const mesh=new T.Mesh(new T.RingGeometry(radius*.78,radius,32),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(position.x,heightAt(position.x,position.z)+.15,position.z);overlay.add(mesh);}
 function draw(world,heightAt,{visible=true,kind='tribal',selectedId=null}={}){
  root.visible=visible;if(!world)return;
  for(const [id,a]of actors)if(!world.entities[id]?.active){root.remove(a.model);actors.delete(id);}
  for(const agent of Object.values(world.agents)){
   if(!world.entities[agent.id]?.active||!agent.position)continue;let view=actors.get(agent.id);const color=affinityColor(world,agent.id,kind);
   if(!view){const p=population(hash(agent.id),'alder')[0];p.id=agent.id;p.wardrobe.top=color;const model=makePerson(p);model.userData.worldEntityId=agent.id;root.add(model);view={model,previous:{...agent.position},metres:agent.metres};actors.set(agent.id,view);}
   view.model.visible=!view.model.userData.dragHidden;const delta=agent.metres-view.metres;animatePerson(view.model,{text:agent.cargo?'Carrying fuel':'Walking'},Math.max(0,delta),delta>0?Math.min(1,delta/1.2):0,!delta);const dx=agent.position.x-view.previous.x,dz=agent.position.z-view.previous.z;if(Math.hypot(dx,dz)>.001)view.model.rotation.y=Math.atan2(dx,dz);view.model.position.set(agent.position.x,heightAt(agent.position.x,agent.position.z)+.04,agent.position.z);view.previous={...agent.position};view.metres=agent.metres;
  }
  if(world===lastWorld&&kind===lastKind&&selectedId===lastSelected)return;lastWorld=world;lastKind=kind;lastSelected=selectedId;clear();
  for(const e of Object.values(world.entities).filter(e=>e.active&&e.kind==='place'&&e.position))ring(e.position,affinityColor(world,e.id,kind),3,heightAt);
  const selected=world.entities[selectedId],position=world.agents[selectedId]?.position||selected?.position;if(position)ring(position,'#f4d17d',selected?.kind==='place'?4:1.3,heightAt);
  for(const agent of Object.values(world.agents))if(world.entities[agent.id]?.active&&agent.position){ring(agent.position,agent.cargo?'#edbc56':'#427784',.85,heightAt);if(agent.trip){const points=[agent.position,...agent.trip.points.slice(agent.trip.next)].map(p=>new T.Vector3(p.x,heightAt(p.x,p.z)+.18,p.z));if(points.length>1)overlay.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:agent.cargo?'#e8ad39':'#4e8fa0',depthTest:false,transparent:true,opacity:.9})));}}
 }
 return {draw,captureDrag:options=>captureDragActors([...actors.values()].map(v=>v.model),{...options,scale})};
}
