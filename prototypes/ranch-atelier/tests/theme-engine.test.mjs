import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const contract=JSON.parse(await readFile(new URL('../dist/theme-contract.json',import.meta.url)));
globalThis.window=new EventTarget();globalThis.CustomEvent=class extends Event{constructor(type,options){super(type);this.detail=options.detail}};
let stored=null;globalThis.localStorage={getItem:()=>stored,setItem:(k,v)=>{stored=v}};globalThis.fetch=async()=>({ok:true,json:async()=>contract});
const source=await readFile(new URL('../dist/theme-engine.js',import.meta.url),'utf8');
const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));await api.initTheme();
const original=[.2,.3,.4],part={color:original,role:'skin'};
api.usePreset('autumn');assert.deepEqual(api.resolveColor(part),original);
api.setTheme({...api.getTheme(),recolorIdentity:true,palette:{skin:'#ddaa99'}});assert.notDeepEqual(api.resolveColor(part),original);
assert.deepEqual(api.resolveColor({color:original,role:'unmapped'}),original);
api.setTheme({palette:{foliage:'not-a-color',madeUp:'#ffffff'}});assert.deepEqual(api.getTheme().palette,{});
api.usePreset('spring');assert.equal(JSON.parse(stored).preset,'spring');assert.equal(api.getTheme().season,'spring');assert.equal(api.getTheme().bloom,.8);
api.resetTheme();assert.equal(api.getTheme().recolorIdentity,false);assert.deepEqual(api.resolveColor({color:original,role:'foliage'}),original);
const result=api.resolveColor(part);result[0]=1;assert.deepEqual(original,[.2,.3,.4]);
localStorage.setItem=()=>{throw Error('blocked')};assert.equal(api.usePreset('autumn').saved,false);
console.log('PASS identity opt-in, unknown fallback, input validation, persistence, reset, immutability, storage failure');

const threeSource=await readFile(new URL('../dist/vendor/three.module.js',import.meta.url),'utf8');
const T=await import('data:text/javascript;base64,'+Buffer.from(threeSource).toString('base64'));
const tree=JSON.parse(await readFile(new URL('../dist/simulation-assets/organics/tree-standing.json',import.meta.url)));
const group=new T.Group();
for(const part of tree){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(part.positions,3));const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({roughness:.8}));mesh.userData.themeSurface=part;group.add(mesh)}
api.usePreset('spring');api.applyToThree(group,T);
let flowerInstances=0;group.traverse(m=>{if(m.userData.ranchBlossoms)flowerInstances+=m.count});assert(flowerInstances>0,'Spring adds actual petal instances');
const before=flowerInstances;api.applyToThree(group,T);flowerInstances=0;group.traverse(m=>{if(m.userData.ranchBlossoms)flowerInstances+=m.count});assert.equal(flowerInstances,before,'Repeated apply is idempotent');
assert.equal(api.isBloomEligible({role:'foliage',surfaceName:'Unidentified green thing'}),false);
api.usePreset('autumn');api.applyToThree(group,T);assert(group.children.some(m=>m.material.roughness>.8));let remaining=0;group.traverse(m=>{if(m.userData.ranchBlossoms)remaining++});assert.equal(remaining,0);
api.resetTheme();api.applyToThree(group,T);assert(group.children.every(m=>m.material.roughness===.8));
api.setTheme({weathering:10,bloom:-1,season:'invented'});assert.equal(api.getTheme().weathering,1);assert.equal(api.getTheme().bloom,0);assert.equal(api.getTheme().season,'original');
for(const season of ['spring','summer','autumn','winter']){api.setTheme({season});assert.equal(Object.keys(api.composePalette()).length,9);assert.deepEqual(api.resolveColor(part),original)}
console.log('PASS curated palettes, range validation, actual blossoms, eligibility, idempotence, removal and material reset');
