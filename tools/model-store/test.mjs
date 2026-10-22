import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { blobKey, sitePath, slug, kindOf, sidecarsFor, modelRow, publicCatalog, pathMap, provenanceFacts } from './catalog.mjs';

const require = createRequire(import.meta.url);
const { proxied } = require('../../prototypes/ranch-atelier/dist/api/models.js');

test('keys are content addressed and site paths are relative to the Ranch Atelier root', () => {
  assert.equal(blobKey('ab'.repeat(32), 'x/y/oak-a.glb'), `models/blobs/ab/${'ab'.repeat(32)}/oak-a.glb`);
  assert.equal(sitePath('prototypes/ranch-atelier/dist/simulation-assets/atelier/oak-a.glb'), '/simulation-assets/atelier/oak-a.glb');
  assert.equal(sitePath('tools/paper-warrior/out/a.glb'), null);
  assert.equal(slug('prototypes/ranch-atelier/dist/simulation-assets/atelier/Oak_A.glb'), 'simulation-assets-atelier-oak-a');
  assert.equal(kindOf('prototypes/ranch-atelier/dist/simulation-assets/buildings/barn.glb'), 'building');
  assert.equal(kindOf('tools/paper-helmet/out/helmet_C.glb'), 'gear');
});

test('sidecars: provenance and the reference image next to a model', () => {
  const files = new Set(['a/helmet.glb', 'a/helmet.json', 'a/helmet-target.png', 'a/render.jpg']);
  assert.deepEqual(sidecarsFor('a/helmet.glb', files), { provenance: 'a/helmet.json', reference: 'a/helmet-target.png', render: 'a/render.jpg' });
  assert.equal(provenanceFacts({ scores: { outline: 0.91 } }).matchScore, 0.91);
  assert.equal(provenanceFacts({ score: 12 }).matchScore, undefined);
});

test('curated rows keep the /models fields and the catalogue lists only showcase models by default', () => {
  const page = { id: 'cuirass', name: 'Cuirass', group: 'Paper warrior · props', outline: 0.915, scores: [{ label: 'Outline', value: 0.915 }], orbit: [-8, 65] };
  const shown = modelRow({ repoPath: 'prototypes/ranch-atelier/dist/models/cuirass/model.glb', tree: 'live', sha256: 'f'.repeat(64), bytes: 10, urls: { glb: 'https://r2/x.glb', ref: 'https://r2/r.jpg' }, provenance: null, page });
  const plain = modelRow({ repoPath: 'tools/x/oak.glb', tree: 'main', sha256: 'e'.repeat(64), bytes: 5, urls: { glb: 'https://r2/o.glb' }, provenance: { name: 'Oak' } });
  assert.equal(shown.status, 'good');
  assert.deepEqual(shown.scores, page.scores);
  assert.equal(plain.name, 'Oak');
  assert.deepEqual(publicCatalog([shown, plain]).models.map(m => m.id), ['cuirass']);
  assert.equal(publicCatalog([shown, plain], { all: true }).count, 2);
  assert.deepEqual(pathMap([{ repoPath: 'prototypes/ranch-atelier/dist/a.glb', url: 'u' }, { repoPath: 'tools/b.glb', url: 'v' }]), { '/a.glb': 'u' });
});

test('/api/models points R2 URLs at the same-origin /r2 proxy', () => {
  const base = 'https://pub-07c8c8a2d9aa40db9fa739b28c65b3e2.r2.dev';
  assert.deepEqual(proxied({ urls: { glb: `${base}/models/blobs/a.glb`, ref: '/models/x.jpg' }, n: 1 }), { urls: { glb: '/r2/models/blobs/a.glb', ref: '/models/x.jpg' }, n: 1 });
});
