import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const dir=new URL('../simulations/simulation/compiled/',import.meta.url),meta=JSON.parse(readFileSync(new URL('navigation.build.json',dir)));
for(const [file,key]of [['navigation.c','sourceSha256'],['navigation.wasm','wasmSha256']])assert.equal(createHash('sha256').update(readFileSync(new URL(file,dir))).digest('hex'),meta[key],`Stale navigation build: ${file}`);
assert(WebAssembly.validate(readFileSync(new URL('navigation.wasm',dir))));console.log('Compiled navigation source/binary provenance PASS');
