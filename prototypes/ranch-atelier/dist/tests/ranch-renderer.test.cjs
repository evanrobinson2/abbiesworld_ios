const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
async function modules(){const three=pathToFileURL(path.join(root,'vendor/three.module.js')).href;const npc=data(fs.readFileSync(path.join(root,'npc-animation.js'),'utf8').replace("from 'three'",`from '${three}'`));const ink=data(fs.readFileSync(path.join(root,'ranch-contours.js'),'utf8').replace("from 'three'",`from '${three}'`));const policy=pathToFileURL(path.join(root,'material-policy.js')).href;const materials=data(fs.readFileSync(path.join(root,'tile-materials.js'),'utf8').replace("from './material-policy.js'",`from '${policy}'`).replace("from 'three'",`from '${three}'`));return {T:await import(three),R:await import(data(fs.readFileSync(path.join(root,'ranch-renderer.js'),'utf8').replace("from '/npc-animation.js'",`from '${npc}'`).replace("from './material-policy.js'",`from '${policy}'`).replace("from 'three'",`from '${three}'`).replace("from './tile-materials.js'",`from '${materials}'`).replace("from './ranch-contours.js'",`from '${ink}'`)))};}
test('shared shader preserves textured transparent material properties and reuses conversions',async()=>{const {T,R}=await modules();const source=new T.MeshStandardMaterial({color:'#448855',map:new T.Texture(),transparent:true,opacity:.6,side:T.DoubleSide,vertexColors:true});const m=R.sharedMaterial(source,'foliage');assert(m.isMeshStandardMaterial);assert.equal(m.map,source.map);assert.equal(m.opacity,.6);assert.equal(m.side,T.DoubleSide);assert(m.vertexColors);assert.equal(m.color.getHex(),source.color.getHex());assert.equal(R.sharedMaterial(source,'foliage'),m);assert.match(m.customProgramCacheKey(),/foliage/);source.dispose();assert.notEqual(R.sharedMaterial(source,'foliage'),m);});
test('scene preparation handles arrays, late arrivals and instancing without changing transforms',async()=>{const {T,R}=await modules();const scene=new T.Scene(),mesh=new T.Mesh(new T.BoxGeometry(),[new T.MeshStandardMaterial(),new T.MeshBasicMaterial()]);mesh.position.set(2,3,4);scene.add(mesh);R.prepareRanchScene(scene);const first=mesh.material[0];assert(mesh.geometry.getAttribute('paintPosition'));assert(mesh.material[1].isMeshBasicMaterial);R.prepareRanchScene(scene);assert.equal(mesh.material[0],first);assert.deepEqual(mesh.position.toArray(),[2,3,4]);const late=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshStandardMaterial(),2);scene.add(late);R.prepareRanchScene(scene);assert.equal(late.material.userData.dorfRole,'plain');assert.equal(late.count,2);});
// Effect Browser intentionally retains an unmodified source-material baseline beside the shared renderer.
test('all original-art WebGL entry points use the shared renderer or canonical tile materials',()=>{for(const file of fs.readdirSync(root).filter(x=>x.endsWith('.js'))){const s=fs.readFileSync(path.join(root,file),'utf8');if(!s.includes('new T.WebGLRenderer('))continue;assert(['tile-editor.js','dorf-reference.js','effect-browser.js'].includes(file),file+' bypasses shared shading');}});

test('material roles use surface names before mesh names and do not classify a water bucket as water',async()=>{
 const {materialRole}=await import('../material-policy.js');
 assert.equal(materialRole('HomePlaster','TimberHouse'),'plaster');
 assert.equal(materialRole('HomeWood','roof'),'timber');
 assert.equal(materialRole('Timber','water-bucket'),'timber');
 assert.equal(materialRole('OnionSkin'),'food');
 assert.equal(materialRole('CEBronze'),'metal');
 assert.equal(materialRole('UnassignedPurple'),'plain');
});
test('unknown PBR response and saved model geometry survive profile application and restoration',async()=>{
 const {T,R}=await modules();
 const material=new T.MeshStandardMaterial({color:'#aa4466',roughness:.31,metalness:.12});
 const mesh=new T.Mesh(new T.BoxGeometry(2,3,4),material);mesh.position.set(4,5,6);mesh.scale.setScalar(2);
 const scene=new T.Scene();scene.add(mesh);const original=Array.from(mesh.geometry.attributes.position.array);
 R.prepareRanchScene(scene);assert.equal(mesh.material.roughness,.31);assert.equal(mesh.material.metalness,.12);
 assert.deepEqual(Array.from(mesh.geometry.attributes.position.array),original);
 scene.updateMatrixWorld(true);const saved=scene.toJSON(),before=JSON.stringify(saved),restored=new T.ObjectLoader().parse(saved);
 R.prepareRanchScene(restored);const child=restored.children[0];
 const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <opaque_fragment>',uniforms:{}};
 child.material.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/ranchEmphasisPass/);
 assert.deepEqual(child.position.toArray(),[4,5,6]);assert.deepEqual(child.scale.toArray(),[2,2,2]);
 assert.equal(JSON.stringify(saved),before);assert.deepEqual(Array.from(child.geometry.attributes.position.array),original);
});

test('cloned terrain/path shader composes once and retains its cache identity',async()=>{
 const {T,R}=await modules(),scene=new T.Scene(),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());
 scene.add(mesh);R.prepareRanchScene(scene);const base=mesh.material,copy=base.clone();
 copy.onBeforeCompile=function(shader,renderer){base.onBeforeCompile.call(this,shader,renderer);shader.fragmentShader+='\n// path-count-7';};
 copy.customProgramCacheKey=()=>base.customProgramCacheKey()+'-paths-7';mesh.material=copy;R.prepareRanchScene(scene);
 const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <opaque_fragment>',uniforms:{}};mesh.material.onBeforeCompile(shader);
 assert.equal((shader.vertexShader.match(/attribute vec3 paintPosition/g)||[]).length,1);
 assert.match(shader.fragmentShader,/path-count-7/);assert.match(mesh.material.customProgramCacheKey(),/paths-7/);
});
