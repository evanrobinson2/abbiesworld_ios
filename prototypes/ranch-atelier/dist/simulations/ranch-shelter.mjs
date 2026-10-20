import * as T from 'three';
// Reuse the calibrated shelter's actual roof and framing as an open animal shed.
// Remove infill walls; retain high roof timbers, narrow supporting posts and floor.
export async function createAccessibleShelter(model,p){
 const shelter=await model(p.shelter.model),bounds=new T.Box3().setFromObject(shelter),height=bounds.max.y-bounds.min.y;
 const remove=[];shelter.updateMatrixWorld(true);
 shelter.traverse(o=>{if(!o.isMesh)return;const b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3());
  const roof=b.min.y>bounds.min.y+height*.55,post=size.x<.65&&size.z<.65,floor=b.max.y<bounds.min.y+.3;
  if(!roof&&!post&&!floor)remove.push(o);
 });
 for(const o of remove)o.removeFromParent();
 const obstacles=[];shelter.updateMatrixWorld(true);
 shelter.traverse(o=>{if(!o.isMesh)return;const b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3());
  if(size.y>.5&&size.x<.65&&size.z<.65)obstacles.push({x:center.x+p.shelter.x,z:center.z+p.shelter.z,w:size.x,d:size.z,angle:0});
 });
 shelter.position.set(p.shelter.x,0,p.shelter.z);
 shelter.userData.inspect={title:p.species==='chicken'?'Covered roost':'Open resting shelter',kind:p.label,description:'An open shelter inside the enclosure. Animals walk under its roof to rest; its supports are solid.'};
 return {shelter,obstacles};
}
