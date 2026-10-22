const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../dist/simulation-asset-resolver.js'), 'utf8');
const modulePromise = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('construction stages preserve roof vs complete and shared home identity', async () => {
  const {resolveBuildingAsset: resolve} = await modulePromise;
  assert.equal(resolve({id:'abbie-home',stage:'roof'}),'family-home-roof');
  assert.equal(resolve({id:'ani-home',stage:'complete'}),'family-home-complete');
  assert.equal(resolve({id:'garden',stage:'roof'}),'kitchen-garden-roof');
  assert.equal(resolve({id:'feed',stage:'planned'}),'feed-store-planned');
  assert.equal(resolve({id:'water',stage:'foundation'}),'water-point-foundation');
  assert.equal(resolve({id:'shelter',stage:'damaged'}),null);
});

test('habitat jobs require actual species context, never assume horse', async () => {
  const {resolveBuildingAsset: resolve,speciesByHabitatFromFrame} = await modulePromise;
  const building={id:'build-habitat-3',stage:'frame'};
  assert.equal(resolve(building),null);
  const speciesByHabitat=speciesByHabitatFromFrame({animals:[{species:'cow',habitat:'habitat-3'}]});
  assert.equal(resolve(building,{speciesByHabitat}),'cattle-shelter-frame');
  assert.equal(resolve(building,{speciesByHabitat:{'habitat-3':'alpaca'}}),null);
  assert.equal(resolve({id:'unknown',stage:'complete'}),null);
  assert.equal(speciesByHabitatFromFrame({animals:[{species:'cow',habitat:'h'},{species:'goat',habitat:'h'}]}).h,undefined);
});

test('actual care activities map to explicit head-down/rest/idle poses', async () => {
  const {resolveAnimalAsset: resolve} = await modulePromise;
  assert.equal(resolve({species:'horse',activity:'supplemental-feeding'}),'horse-feeding');
  assert.equal(resolve({species:'goat',activity:'browse'}),'goat-feeding');
  assert.equal(resolve({species:'chicken',activity:'scratch'}),'chicken-feeding');
  assert.equal(resolve({species:'cow',activity:'rest'}),'cow-rest');
  assert.equal(resolve({species:'horse',activity:'drink'}),'horse-feeding');
  assert.equal(resolve({species:'horse',activity:'explore'}),'horse-idle');
  assert.equal(resolve({species:'dragon',activity:'rest'}),null);
  assert.equal(resolve({species:'horse',activity:'flying'}),null);
});

test('stock thresholds must be supplied; zero and carried props are explicit', async () => {
  const {resolveSupplyAsset: resolve} = await modulePromise;
  assert.equal(resolve('water',0),'water-trough-empty');
  assert.equal(resolve('wood',5),null);
  assert.equal(resolve('wood',5,{fullAt:10}),'wood-partial');
  assert.equal(resolve('wood',10,{fullAt:10}),'wood-full');
  assert.equal(resolve('water',2,{carried:true}),'water-bucket-carried');
  assert.equal(resolve('food',2,{fullAt:5}),'ration-partial');
  assert.equal(resolve('manure',3,{carried:true}),'compost-carried');
  assert.equal(resolve('water',-1,{fullAt:5}),null);
  assert.equal(resolve('water',NaN,{fullAt:5}),null);
  assert.equal(resolve('wood',1,{fullAt:0}),null);
  assert.equal(resolve('magic',2,{fullAt:5}),null);
});

test('worker cargo wins over work pose, known activities only', async () => {
  const {resolveWorkerAsset: resolve} = await modulePromise;
  assert.equal(resolve({name:'Abbie',activity:'building',carrying:{amount:0}}),'abbie-work');
  assert.equal(resolve({name:'Ani',activity:'unloading',carrying:{amount:3}}),'ani-carry');
  assert.equal(resolve({id:'pearl',activity:'walking-home',cargo:0}),'pearl-idle');
  assert.equal(resolve({name:'Daddy',activity:'replenishing-water',carrying:{amount:0}}),'daddy-work');
  assert.equal(resolve({name:'Unknown',activity:'building'}),null);
  assert.equal(resolve({name:'Jeff',activity:'invented'}),null);
  assert.equal(resolve({name:'Marley',activity:'resting'}),'marley-rest');
  assert.equal(resolve({name:'Marley',activity:'carrying-materials',carrying:{amount:1}}),'marley-carried');
  assert.equal(resolve({name:'Marley',activity:'carrying-water',carrying:{amount:1}}),null);
});
