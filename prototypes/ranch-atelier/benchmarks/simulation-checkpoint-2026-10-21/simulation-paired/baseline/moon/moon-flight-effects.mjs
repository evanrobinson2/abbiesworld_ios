import * as T from 'three';

// All positions are metres in the ferry's landing frame. Engine mounts can be
// supplied by a replacement asset without changing flight or dispatch state.
export function createFlightEffects(parent,heightAt,engines=[{x:0,y:.42,z:0,radius:.28}]){
 const exhaustCount=160*engines.length,dustCount=240,viewport=new T.Vector2();
 const hot=[1,.91,.73],cool=[.42,.59,.76],dustColor=[0,0,0];
 function cloud(count,additive){
  const geometry=new T.BufferGeometry();
  for(const [key,size] of [['position',3],['tint',3],['strength',1],['diameter',1]])geometry.setAttribute(key,new T.BufferAttribute(new Float32Array(count*size),size).setUsage(T.DynamicDrawUsage));
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:additive?T.AdditiveBlending:T.NormalBlending,uniforms:{pixelScale:{value:500}},vertexShader:`attribute vec3 tint; attribute float strength; attribute float diameter; varying vec3 vTint; varying float vStrength; uniform float pixelScale;
   void main(){vTint=tint;vStrength=strength;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(diameter*pixelScale*length(modelMatrix[0].xyz)/max(.01,-p.z),1.,100.);}`,
  fragmentShader:`varying vec3 vTint; varying float vStrength; void main(){float r=length(gl_PointCoord-.5)*2.;if(r>=1.)discard;float a=exp(-r*r*5.)*(1.-smoothstep(.65,1.,r))*vStrength;gl_FragColor=vec4(vTint,a);}`});
  const points=new T.Points(geometry,material);points.frustumCulled=false;parent.add(points);
  points.onBeforeRender=(renderer,scene,camera)=>{const size=renderer.getDrawingBufferSize(viewport);material.uniforms.pixelScale.value=size.y*Math.abs(camera.projectionMatrix.elements[5])*.5;};
  return {geometry,material,points};
 }
 const exhaust=cloud(exhaustCount,true),dust=cloud(dustCount,false);
 const fract=n=>n-Math.floor(n),hash=n=>fract(Math.sin(n*127.1+311.7)*43758.5453);
 function put(cloud,i,x,y,z,size,alpha,color){const a=cloud.geometry.attributes;a.position.setXYZ(i,x,y,z);a.diameter.setX(i,size);a.strength.setX(i,alpha);a.tint.setXYZ(i,...color);}
 return {update(seconds,phaseAt){
  const current=phaseAt(seconds);
  for(let i=0;i<exhaustCount;i++){
   const e=engines[Math.floor(i/160)],u=fract(seconds*2.8+hash(i)),angle=hash(i+800)*Math.PI*2;
   const length=(1.3+current.thrust*2.8),spread=e.radius*(.25+u*2.8),r=Math.sqrt(hash(i+400))*spread;
   const x=e.x+Math.cos(angle)*r,z=e.z+Math.sin(angle)*r,y=current.altitude+e.y-u*length;
   const alpha=current.thrust*(1-u)**1.7*.22*(y>heightAt(x,z)+.04?1:0);
   put(exhaust,i,x,y,z,.12+u*.48,alpha,u<.18?hot:cool);
  }
  // Reconstruct recent emissions so dust survives engine cutoff, pause and seek.
  // Low ballistic arcs and widening sheets, without rising smoke columns.
  for(let i=0;i<dustCount;i++){
   const life=2.2,age=fract(seconds/life+hash(i+1200))*life,birth=seconds-age,f=phaseAt(Math.max(0,birth));
   const e=engines[i%engines.length],coupling=f.thrust*Math.max(0,1-f.altitude/6),angle=hash(i+1700)*Math.PI*2;
   const speed=2.8+hash(i+2200)*5.8,r=.65+age*speed,x=e.x+Math.cos(angle)*r,z=e.z+Math.sin(angle)*r;
   const lift=(.3+hash(i+2700)*.8)*age-.81*age*age;
   const alpha=birth<0?0:coupling*.24*(1-age/life)**1.5;
   const shade=.49+hash(i+3200)*.13;
   dustColor[0]=shade;dustColor[1]=shade*.98;dustColor[2]=shade*.94;
   put(dust,i,x,heightAt(x,z)+.035+Math.max(0,lift),z,.16+age*.44,alpha,dustColor);
  }
  for(const c of [exhaust,dust])for(const a of Object.values(c.geometry.attributes))a.needsUpdate=true;
 },dispose(){for(const c of [exhaust,dust]){parent.remove(c.points);c.geometry.dispose();c.material.dispose();}}};
}
