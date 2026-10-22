import {planetOf} from '../planet-gravity.mjs';
import {PhysicsWorld,PROFILES,meshTriangles} from './world.mjs';
/** Consume the real generator assembly. Mesh selection is explicit: scenery is not all loose. */
export function assemblyPhysics({assembly,radiusMetres,tileMeshes=new Map(),profiles={},tiles=[],volumeBelow=100,volumeAbove=200,renderUnitsPerMetre=.1,World=PhysicsWorld}){
 const world=new World(),polygon=Array.from({length:6},(_,i)=>[Math.sin(i*Math.PI/3)*radiusMetres,Math.cos(i*Math.PI/3)*radiusMetres]);
 for(const plan of assembly.plans){const input=tileMeshes.get(plan.id);world.addTile({id:plan.id,volume:{polygon,minY:-volumeBelow,maxY:volumeAbove},profile:profiles[plan.id]??PROFILES[planetOf({...plan,...tiles.find(t=>t.id===plan.id)})],frame:{position:[plan.center.x,0,plan.center.z]},triangles:input?input.meshes.flatMap(mesh=>meshTriangles(mesh,input.root,renderUnitsPerMetre)):[]});}
 return world;
}
