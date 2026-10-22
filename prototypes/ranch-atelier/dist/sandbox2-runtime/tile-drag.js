import {spring} from './tile-motion.js';
import * as T from 'three';

export function dragMaterial(material,opacity){
 const copy=material.clone();
 copy.onBeforeCompile=function(shader,renderer){
  material.onBeforeCompile.call(this,shader,renderer);
  // Ranch alpha normally stores a contour mask (ground=0), not opacity.
  // Transparent drag copies must use opacity for every surface instead.
  if(material.userData.dorfRole)shader.fragmentShader=shader.fragmentShader.replace(/gl_FragColor\.a\s*=\s*[0-9.]+\s*;/g,'gl_FragColor.a = opacity;');
 };
 copy.customProgramCacheKey=()=>material.customProgramCacheKey()+'-tile-drag-opacity-v1';
 copy.transparent=true;copy.opacity=opacity;copy.depthWrite=false;return copy;
}

// Keep the board untouched until release. Preview materials are never shared.
export function installTileDrag({renderer,camera,scene,orbit,cells,groups,getBoard,select,place,render,changed,status,radius,isBusy}){
 const canvas=renderer.domElement,ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);
 let drag=null,down=null,frame=0;
 const ring=new T.Mesh(new T.RingGeometry(radius*.92,radius*.99,6),new T.MeshBasicMaterial({color:0x68bc82,side:T.DoubleSide,transparent:true,opacity:.9,depthTest:false}));
 ring.rotation.x=-Math.PI/2;ring.rotation.z=Math.PI/2;ring.renderOrder=100;ring.visible=false;scene.add(ring);
 function point(e){const b=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2),camera);return e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom;}
 function hit(e){return point(e)?ray.intersectObjects(cells)[0]?.object.userData.cell:undefined;}
 function cloneMaterial(m,opacity){return dragMaterial(m,opacity);}
 function start(){const source=groups.get(down.id);if(!source)return;const preview=source.clone(true),originals=[];
  preview.traverse(o=>{if(o.material){o.material=Array.isArray(o.material)?o.material.map(m=>cloneMaterial(m,.85)):cloneMaterial(o.material,.85);o.castShadow=false;}});
  source.traverse(o=>{if(o.material){originals.push([o,o.material,o.castShadow]);o.material=Array.isArray(o.material)?o.material.map(m=>cloneMaterial(m,.22)):cloneMaterial(o.material,.22);o.castShadow=false;}});
  scene.add(preview);drag={id:down.id,preview,originals,origin:getBoard().tiles.find(t=>t.id===down.id).cell,target:null,started:performance.now(),anchor:source.position.clone(),aim:source.position.clone()};canvas.style.cursor='none';renderer.shadowMap.needsUpdate=true;select(down.id);frame=requestAnimationFrame(animate);
 }
 function animate(now){if(!drag)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,t=(now-drag.started)/1000,release=reduced?1:spring(Math.max(0,Math.min(1,(t-.10)/.34)));drag.preview.position.lerpVectors(drag.anchor,drag.aim,release);drag.preview.position.y=reduced?.55:.55*release;const stretch=reduced?0:Math.sin(Math.min(1,t/.22)*Math.PI)*.08;drag.preview.scale.set(1-stretch*.5,1+stretch,1-stretch*.5);drag.preview.rotation.z=reduced?0:Math.sin(t*19)*Math.exp(-t*7)*.035;render();frame=requestAnimationFrame(animate);
 }
 function update(e){if(!drag)return;const target=hit(e),p=new T.Vector3();ray.ray.intersectPlane(plane,p);drag.aim.set(p.x,0,p.z);drag.target=target??null;
  const occupant=getBoard().tiles.find(t=>t.cell===target&&t.id!==drag.id);ring.visible=target!==undefined;
  if(ring.visible){const c=cells[target].parent.position;ring.position.set(c.x,.3,c.z);ring.material.color.set(occupant?'#e8b65c':'#65bd84');}
  status(target===undefined?'Release outside the board to cancel.':target===drag.origin?'Return to original cell.':occupant?'Release to swap tiles.':'Release to move tile.');render();changed();
 }
 function disposeMaterials(m){(Array.isArray(m)?m:[m]).forEach(m=>m.dispose());}
 function finish(commit=false){cancelAnimationFrame(frame);const active=drag;if(active){if(commit&&active.target!==null&&active.target!==active.origin)groups.get(active.id)?.position.copy(active.preview.position);scene.remove(active.preview);active.preview.traverse(o=>{if(o.material)disposeMaterials(o.material)});for(const[o,m,shadow]of active.originals){disposeMaterials(o.material);o.material=m;o.castShadow=shadow;}drag=null;ring.visible=false;renderer.shadowMap.needsUpdate=true;}
  const pointer=down?.pointer;down=null;orbit.enabled=true;canvas.style.cursor='';if(pointer!==undefined&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);
  if(active){if(commit&&active.target!==null)place(active.id,active.target);else status('Move cancelled. Tile stays in its original cell.');render();changed();}
 }
 canvas.addEventListener('pointerdown',e=>{if(isBusy())return;if(down){finish(false);return;}if(e.button!==0)return;const cell=hit(e),tile=getBoard().tiles.find(t=>t.cell===cell);down={x:e.clientX,y:e.clientY,pointer:e.pointerId,id:tile?.id,cell};if(tile&&groups.has(tile.id)){orbit.enabled=false;canvas.setPointerCapture(e.pointerId);e.stopImmediatePropagation();}},true);
 canvas.addEventListener('pointermove',e=>{if(!down||e.pointerId!==down.pointer||!down.id)return;if(!drag&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)start();update(e);});
 canvas.addEventListener('pointerup',e=>{if(!down||e.pointerId!==down.pointer)return;if(drag){finish(true);return;}const tap=Math.hypot(e.clientX-down.x,e.clientY-down.y)<=6,cell=hit(e),id=down.id;finish(false);if(tap&&cell!==undefined){if(id)select(id);else place(null,cell);}});
 canvas.addEventListener('pointercancel',()=>finish(false));canvas.addEventListener('lostpointercapture',()=>{if(down)finish(false)});
 window.addEventListener('blur',()=>finish(false));window.addEventListener('keydown',e=>{if(e.key==='Escape')finish(false)});
 return {cancel:()=>finish(false),state:()=>drag?{id:drag.id,origin:drag.origin,target:drag.target}:null};
}
