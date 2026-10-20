import * as T from 'three';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
// Turn the actual generated ranch as one pop-up page. Never rebuild its contents.
export function createStorybookArrival(group,options){
 const children=[...group.children],inverse=group.matrixWorld.clone().invert(),box=new T.Box3();
 group.updateWorldMatrix(true,true);inverse.copy(group.matrixWorld).invert();
 group.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));});
 const size=box.getSize(new T.Vector3()),width=size.x*1.08,depth=size.z*1.08,spine=box.min.x-size.x*.04,base=box.min.y-.005,z=box.getCenter(new T.Vector3()).z;
 const hinge=new T.Group(),content=new T.Group();hinge.name='Storybook turning page';content.position.set(-spine,-base,-z);for(const child of children)content.add(child);hinge.add(content);group.add(hinge);
 const geometry=new T.PlaneGeometry(width,depth,48,16);geometry.rotateX(-Math.PI/2);geometry.translate(width/2,0,0);const rest=geometry.attributes.position.array.slice();
 const paper=new T.MeshStandardMaterial({color:'#f5e4bd',roughness:.95,side:T.DoubleSide,transparent:true});
 paper.onBeforeCompile=shader=>{shader.vertexShader='varying vec2 pageUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npageUV=uv;');shader.fragmentShader='varying vec2 pageUV;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
 float margin=min(min(pageUV.x,1.-pageUV.x),min(pageUV.y,1.-pageUV.y));
 float border=(1.-smoothstep(.001,.003,abs(margin-.035)))*.45;
 float grain=sin(pageUV.x*1250.)*sin(pageUV.y*1050.)*.012;
 gl_FragColor.rgb*=1.-border+grain;
 `);};
 paper.customProgramCacheKey=()=> 'storybook-paper-v1';const sheet=new T.Mesh(geometry,paper);sheet.name='Ivory storybook leaf';sheet.receiveShadow=true;sheet.castShadow=true;hinge.add(sheet);
 let elapsed=0,done=false,restored=false;
 function restore(){if(restored)return;restored=true;for(const child of children)group.add(child);group.remove(hinge);geometry.dispose();paper.dispose();}
 function finish(){restore();done=true;}
 function update(dt){if(done)return;elapsed+=Math.max(0,dt);const t=clamp(elapsed/options.duration);if(t>=.97){restore();if(elapsed>=options.duration-1e-9)done=true;return;}
  const turn=ease(t/.8),angle=Math.PI*(1-turn),lift=Math.sin(Math.PI*turn)*width*.06;
  // The spine travels one page-width as the leaf opens, keeping it within the existing framing.
  hinge.position.set(spine+width*(1-turn),base+lift,z);hinge.rotation.z=angle;
  const rise=ease((t-.38)/(.48-options.pop*.12));content.visible=turn>.5;content.scale.y=.015+.985*rise;
  // Scale around the paper surface rather than the model origin.
  content.position.y=-base*content.scale.y;
  const positions=geometry.attributes.position;for(let i=0;i<positions.count;i++){const x=rest[i*3],v=x/width;positions.setY(i,Math.sin(v*Math.PI)*Math.sin(turn*Math.PI)*width*.12*options.curl);}
  positions.needsUpdate=true;geometry.computeVertexNormals();paper.opacity=1-ease((t-.83)/.13);
 }
 update(0);return {update,finish,get done(){return done;},get progress(){return clamp(elapsed/options.duration);},mode:'storybook'};
}
