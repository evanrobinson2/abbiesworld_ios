// Writes the GLBs for /models from the same recipe the game runs (simulations/grace-computer.mjs).
// Run from the repo root: node --import ./tools/grace-computer/three-hook.mjs tools/grace-computer/export_glb.mjs
import {writeFileSync} from 'node:fs';
import * as T from 'three';
import {createGraceComputer, createGraceFloppy} from '../../prototypes/ranch-atelier/dist/simulations/grace-computer.mjs';

const OUT = new URL('../../prototypes/ranch-atelier/dist/review/3d/', import.meta.url);

function glb(root) {
 root.updateMatrixWorld(true);
 const bin = [], views = [], accessors = [], meshes = [], nodes = [], materials = [], matIndex = new Map();
 let off = 0;
 const push = (arr, target) => { const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); const pad = (4 - b.length % 4) % 4; views.push({buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? {target} : {})}); bin.push(b, Buffer.alloc(pad)); off += b.length + pad; return views.length - 1; };
 const acc = (arr, type, comp, target, minmax) => { accessors.push({bufferView: push(arr, target), componentType: comp, count: arr.length / ({VEC3: 3, VEC2: 2, SCALAR: 1})[type], type, ...minmax}); return accessors.length - 1; };
 root.traverse(o => {
  if (!o.isMesh) return;
  const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position.array, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i++) { mn[i % 3] = Math.min(mn[i % 3], p[i]); mx[i % 3] = Math.max(mx[i % 3], p[i]); }
  const attributes = {POSITION: acc(new Float32Array(p), 'VEC3', 5126, 34962, {min: mn, max: mx}), NORMAL: acc(new Float32Array(g.attributes.normal.array), 'VEC3', 5126, 34962)};
  if (g.attributes.uv) attributes.TEXCOORD_0 = acc(new Float32Array(g.attributes.uv.array), 'VEC2', 5126, 34962);
  const m = o.material;
  if (!matIndex.has(m)) { matIndex.set(m, materials.length); materials.push({name: m.name, doubleSided: m.side === T.DoubleSide, pbrMetallicRoughness: {baseColorFactor: [...m.color.toArray(), 1], metallicFactor: m.metalness ?? 0, roughnessFactor: m.roughness ?? 1}}); }
  const prim = {attributes, material: matIndex.get(m)};
  if (g.index) prim.indices = acc(new Uint32Array(g.index.array), 'SCALAR', 5125, 34963);
  meshes.push({name: o.name, primitives: [prim]}); nodes.push({name: o.name, mesh: meshes.length - 1});
 });
 const body = Buffer.concat(bin);
 const json = Buffer.from(JSON.stringify({asset: {version: '2.0', generator: 'Abbie\'s World grace-computer recipe'}, scene: 0, scenes: [{name: root.name, nodes: nodes.map((_, i) => i)}], nodes, meshes, materials, accessors, bufferViews: views, buffers: [{byteLength: body.length}]}));
 const jpad = Buffer.alloc((4 - json.length % 4) % 4, 0x20), J = Buffer.concat([json, jpad]);
 const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + J.length + 8 + body.length, 8);
 const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
 return {buf: Buffer.concat([head, ch(J.length, 0x4E4F534A), J, ch(body.length, 0x004E4942), body]), tris: accessors.filter(a => a.type === 'SCALAR').reduce((n, a) => n + a.count / 3, 0) + meshes.filter(m => m.primitives[0].indices === undefined).reduce((n, m) => n + accessors[m.primitives[0].attributes.POSITION].count / 3, 0), parts: meshes.length};
}

for (const [name, make] of [['grace-computer', createGraceComputer], ['grace-floppy', createGraceFloppy]]) {
 const {buf, tris, parts} = glb(make());
 writeFileSync(new URL(name + '.glb', OUT), buf);
 console.log(name, (buf.length / 1024).toFixed(1) + ' KB', parts, 'parts', tris, 'triangles');
}
