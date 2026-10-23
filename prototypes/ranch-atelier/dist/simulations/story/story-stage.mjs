import * as T from 'three';
// In-world dressing for a story: kit props that drop onto the board with a spring, and a gold
// star that floats over each hero. Everything here is presentation; the director owns the rules.
const parts=new Map();
async function propTemplate(record){
 if(!parts.has(record.id))parts.set(record.id,(async()=>{
  const response=await fetch(record.json);if(!response.ok)throw Error('Cannot load '+record.id);
  const group=new T.Group(),materials=new Map();
  for(const p of await response.json()){
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p.positions,3));
   if(p.normals?.length===p.positions.length)geo.setAttribute('normal',new T.Float32BufferAttribute(p.normals,3));else geo.computeVertexNormals();
   const key=p.color.join(',');if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color:new T.Color().setRGB(...p.color,T.SRGBColorSpace),roughness:.82,metalness:0}));
   const mesh=new T.Mesh(geo,materials.get(key));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
  const box=new T.Box3().setFromObject(group);group.userData.size=box.getSize(new T.Vector3());return group;
 })());
 return (await parts.get(record.id)).clone(true);
}

export function createStoryStage({root,heightAt,reducedMotion=false}){
 const items=[],stars=[];let time=0;
 const starGeometry=(()=>{const s=new T.Shape();for(let i=0;i<10;i++){const r=i%2?.16:.38,a=i/10*Math.PI*2;s[i?'lineTo':'moveTo'](Math.sin(a)*r,Math.cos(a)*r);}return new T.ExtrudeGeometry(s,{depth:.08,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:1});})();
 const starMaterial=new T.MeshStandardMaterial({color:'#ffc93a',emissive:'#ff9d00',emissiveIntensity:.45,roughness:.4});
 return {
  async addProp(record,staged,delay=0){
   const model=await propTemplate(record),holder=new T.Group(),scale=1.25; // toy scale: props read a little larger than life
   model.scale.setScalar(scale);holder.add(model);
   holder.position.set(staged.point.x,heightAt(staged.point.x,staged.point.z),staged.point.z);holder.rotation.y=staged.angle;
   holder.userData.inspect={title:record.label,kind:'Story prop',description:'Placed by a story.'};holder.userData.storyProp=true;
   root.add(holder);items.push({holder,model,age:-delay,ground:holder.position.y});
   staged.size=Math.max(model.userData.size?.x||1,model.userData.size?.z||1)*scale;
   return holder;
  },
  setHeroes(bodies){
   for(const s of stars)s.mesh.removeFromParent();stars.length=0;
   for(const body of bodies){if(!body?.isObject3D)continue;const mesh=new T.Mesh(starGeometry,starMaterial);mesh.raycast=()=>{};mesh.userData.noInk=true;body.add(mesh);stars.push({mesh,body,phase:Math.random()*6});}
  },
  update(dt){
   time+=dt;
   for(const it of items){if(it.age>=1.2)continue;it.age+=dt;const t=Math.max(0,it.age);
    // Drop with gravity, squash on landing, spring back: GAME_FEEL section 4 "drop".
    if(reducedMotion||t>=1.2){it.model.position.y=0;it.model.scale.setScalar(1.25);it.holder.visible=true;continue;}
    it.holder.visible=it.age>0;const fall=Math.min(1,t/.35),y=(1-fall*fall)*4,squash=t>.35?Math.exp(-(t-.35)*7)*Math.sin((t-.35)*24)*.18:0;
    it.model.position.y=y;it.model.scale.set(1.25*(1+squash*.6),1.25*(1-squash),1.25*(1+squash*.6));
   }
   for(const s of stars){const h=s.body.userData.storyStarHeight||2.6;s.mesh.position.set(0,h+Math.sin(time*2.4+s.phase)*.12,0);s.mesh.rotation.y=time*1.6+s.phase;const k=1/Math.max(.001,s.body.scale.y);s.mesh.scale.setScalar(k);}
  },
  dispose(){for(const it of items)it.holder.removeFromParent();items.length=0;for(const s of stars)s.mesh.removeFromParent();stars.length=0;}
 };
}
