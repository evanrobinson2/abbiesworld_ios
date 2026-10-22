const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
async function load(name){const source=fs.readFileSync(path.join(root,name),'utf8').replace("from 'three'",`from '${pathToFileURL(path.join(root,'vendor/three.module.js')).href}'`).replace("from './material-policy.js'",`from '${pathToFileURL(path.join(root,'material-policy.js')).href}'`).replace("from './tile-motion.js'",`from '${pathToFileURL(path.join(root,'tile-motion.js')).href}'`);return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
test('drag copies preserve ground, crops, fences and model surfaces while fading the whole tile',async()=>{
 const {ranchMaterial}=await load('tile-materials.js'),{dragMaterial}=await load('tile-drag.js');
 for(const role of ['ground','foliage','timber','roof','plain']){
  const original=ranchMaterial('#98aa77',role);
  for(const opacity of [.85,.22]){
   const copy=dragMaterial(original,opacity),shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <opaque_fragment>'};
   copy.onBeforeCompile(shader);
   assert.match(shader.fragmentShader,/gl_FragColor\.a = opacity;/,role);
   assert.doesNotMatch(shader.fragmentShader,/gl_FragColor\.a=[01]\.;/,role);
   assert.equal(copy.opacity,opacity);assert.equal(copy.transparent,true);
   assert.notEqual(copy.customProgramCacheKey(),original.customProgramCacheKey());
   copy.dispose();
  }
  assert.equal(original.opacity,1);assert.equal(original.transparent,false);
  const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <opaque_fragment>'};original.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,/if\(ranchEmphasisPass>0.5\)/);assert.equal(shader.uniforms.ranchEmphasisPass.value,0);
 }
});
