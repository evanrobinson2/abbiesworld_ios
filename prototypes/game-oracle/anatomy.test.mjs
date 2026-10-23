import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {anatomy,searchAnatomy} from './lib/anatomy.js';import handler from './api/anatomy.js';import mcp from './api/mcp.js';
test('crop guidance is complete as text and explicitly not verified runtime rules',()=>{
 const p=JSON.parse(readFileSync(new URL('./data/anatomy/simfarm.json',import.meta.url),'utf8')),d=p.cropDecoding;
 assert.equal(d.crops.length,24);assert.equal(new Set(d.crops.map(c=>c.file)).size,24);
 assert(d.crops.every(c=>c.bytes===5890&&c.detailFieldsDecoded===7&&/^[a-f0-9]{64}$/.test(c.sha256)));
 assert.deepEqual(d.crops.filter(c=>!c.guidance.replantAfterHarvest).map(c=>c.name),['Almonds','Apples','Grapes','Oranges']);
 assert.equal(d.coverage.runtimeRules,'unexamined');assert.equal(anatomy.games.find(g=>g.id==='simfarm').cropGuidanceCount,24);
});
const response=()=>({setHeader(){},status(n){this.code=n;return this},json(body){this.body=body;return this},end(){return this}});
test('Black & White gesture study is searchable through MCP and retains evidence limits',()=>{
 const g=anatomy.games.find(g=>g.id==='black-white');assert(g);assert.equal(g.runtimeObserved,false);
 assert(searchAnatomy({q:'gesture'}).results.some(g=>g.id==='black-white'));
 const res=response();mcp({method:'POST',body:{jsonrpc:'2.0',id:7,method:'tools/call',params:{name:'get_game_anatomy',arguments:{id:'black-white'}}}},res);
 assert.deepEqual(JSON.parse(res.body.result.content[0].text),g);
 const p=JSON.parse(readFileSync(new URL('./data/anatomy/black-white.json',import.meta.url),'utf8'));
 assert.equal(p.coverage.gestureAlgorithm,'partially traced and isolated-routine tested; complete retail pipeline unverified');assert.equal(p.coverage.abbiesWorldImplementation,'proposed only');
 assert.equal(p.files.length,1134);assert(p.files.every(f=>/^[a-f0-9]{64}$/.test(f.sha256)&&!f.path.startsWith('crack/')));
 assert(p.sources.some(s=>s.id==='disc-readme'&&s.sha256));assert(g.claims.some(c=>c.basis.includes('original architecture proposal')));
});
test('Black & White extraction, templates and bounded binary tests agree',()=>{
 const p=JSON.parse(readFileSync(new URL('./data/anatomy/black-white.json',import.meta.url),'utf8')),d=p.gestureDecoding,b=d.binaryProbe;
 assert.equal(p.extraction.files,1012);assert.equal(d.bytes,4+d.records*d.recordBytes);assert.equal(d.records,81);
 assert.equal(new Set(d.templates.map(t=>t.id)).size,23);assert(d.templates.every(t=>t.sampleCount>=6&&t.sampleCount<=26));
 assert.equal(d.flags.checkDirection,72);assert.equal(d.flags.allowReverse,3);assert.equal(d.flags.checkAspectRatio,74);
 assert.equal(b.tests.length,81);assert.equal(b.selfAccepted,81);assert.equal(b.oppositeDirectionAccepted,9);assert.equal(b.perturbedAccepted,0);
 for(const t of b.tests){assert(t.self.accepted);assert.equal(t.oppositeStartDirection.accepted,!d.templates[t.template].checkDirection);assert(!t.turnPerturbation90Degrees.accepted);}
 assert.deepEqual(b.aspectRatioCases.map(t=>t.accepted),[true,true,false,true]);
 assert.match(b.provenance,/Modified alternate/);assert.match(b.limits,/do not test live input/);
 assert.equal(anatomy.games.find(g=>g.id==='black-white').binaryRoutineObserved,true);
});
test('Widelands lifecycle evidence does not imply installer extraction or gameplay',()=>{
 const p=JSON.parse(readFileSync(new URL('./data/anatomy/widelands.json',import.meta.url),'utf8'));
 assert.equal(p.installerFormat.sha256,p.packages[0].sha256);assert(p.installerFormat.markers.some(m=>m.value==='Inno Setup Setup Data (6.7.0)'));
 assert.equal(p.productionLifecycle.blobSha,p.inspectedSourceFiles.find(s=>s.path.endsWith('productionsite.cc')).blobSha);
 assert.equal(p.productionLifecycle.transitions.length,5);assert.equal(p.productionLifecycle.coverage.runtimeRecovery,'unexamined');
 const g=anatomy.games.find(g=>g.id==='widelands');assert.equal(g.fileCount,0);assert.equal(g.runtimeObserved,false);assert(searchAnatomy({q:'retry state'}).results.some(g=>g.id==='widelands'));
});
test('anatomy findings preserve provenance and incomplete coverage',()=>{
 assert(anatomy.games.length>=13);assert.equal(new Set(anatomy.games.map(g=>g.id)).size,anatomy.games.length);
 assert.equal(anatomy.counts.findings,anatomy.games.reduce((n,g)=>n+g.claims.length,0));
 for(const g of anatomy.games){assert.equal(g.runtimeObserved,false);assert.equal(g.coverage.ux,'not yet studied');assert(g.nextPass.length>30);assert(g.lesson.status.includes('inference'));for(const c of g.claims){assert(c.evidence.url.startsWith('https://github.com/')||c.evidence.url===g.inventoryUrl||(g.kind==='design-lesson'&&['https://publications.lib.chalmers.se/records/fulltext/111921.pdf','https://jnd.org/signifiers-not-affordances/','https://www.lamarzocco.com/ie/en/wp-content/uploads/2023/06/MAN.12.0.1_LINEAMINI.pdf'].includes(c.evidence.url)));assert(c.basis);}}
 const wid=anatomy.games.find(g=>g.id==='widelands');assert.equal(wid.fileCount,0);assert.match(wid.nextPass,/unextracted/);
});
test('file inventories agree with the catalog and packed-resource bounds',()=>{
 for(const g of anatomy.games){const p=JSON.parse(readFileSync(new URL('.'+g.inventoryUrl,import.meta.url),'utf8'));assert.equal(p.files.length,g.fileCount);assert.equal(p.analysis.imageFileCount,g.imageFileCount);assert(!/Users[\\/]|E:[\\/]|Bearer |api[_-]?key|localhost/.test(JSON.stringify(p)));}
 const p=JSON.parse(readFileSync(new URL('./data/anatomy/prince-of-persia.json',import.meta.url),'utf8'));assert.equal(p.packedResourceTables.length,25);assert.equal(p.packedResourceTables.reduce((n,t)=>n+t.resourceCount,0),2029);assert(p.packedResourceTables.every(t=>t.validatedBounds&&!t.error));
 const m=JSON.parse(readFileSync(new URL('./data/anatomy/mindustry.json',import.meta.url),'utf8'));assert.equal(m.decompilation.files.length,5);
});
test('anatomy search, paging, endpoint validation and MCP are aligned',()=>{
 assert(searchAnatomy({q:'capacity'}).results.some(g=>g.id==='mindustry'));assert.equal(searchAnatomy({genre:'Platformer'}).results[0].id,'prince-of-persia');assert.equal(searchAnatomy({domain:'ux'}).total,0);assert.equal(searchAnatomy({offset:1,limit:1}).results[0].id,anatomy.games[1].id);
 for(const [url,code] of [['/api/anatomy?limit=-1',400],['/api/anatomy?offset=no',400],['/api/anatomy?id=missing',404],['/api/anatomy?surprise=1',400]]){const res=response();handler({method:'GET',url},res);assert.equal(res.code,code)}
 const r=response();handler({method:'GET',url:'/api/anatomy?id=mindustry'},r);assert.equal(r.body.id,'mindustry');
 const mr=response();mcp({method:'POST',body:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_game_anatomy',arguments:{id:'mindustry'}}}},mr);assert.deepEqual(JSON.parse(mr.body.result.content[0].text),r.body);
 const bad=response();mcp({method:'POST',body:{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'search_game_anatomy',arguments:{limit:0}}}},bad);assert.equal(bad.body.error.code,-32602);
});
test('SimFarm packed resources preserve boundaries and decoded-image evidence',()=>{
 const p=JSON.parse(readFileSync(new URL('./data/anatomy/simfarm.json',import.meta.url),'utf8')),d=p.resourceDecoding;
 assert.equal(d.indexRecords,152);assert.equal(d.nonEmptyResources,151);assert.equal(d.resources.length,151);assert.equal(new Set(d.resources.map(r=>r.name)).size,151);
 assert.equal(d.resources[0].offset,0);for(let i=0;i<d.resources.length;i++){const r=d.resources[i];assert(r.bytes>0);assert.equal(r.offset+r.bytes,i+1<d.resources.length?d.resources[i+1].offset:d.endMarker.offset)}
 assert.equal(d.partitionBytes,2213377);assert.equal(d.endMarker.offset,d.partitionBytes);assert.equal(d.decodedBitmaps.length,22);assert(d.decodedBitmaps.every(b=>b.roundTripExact&&b.planes===4));
 assert.equal(d.weatherTables.length,12);assert(d.weatherTables.every(t=>t.rows===60&&t.columns===4));assert.equal(d.audioSignatures.length,25);assert(d.audioSignatures.every(a=>a.creativeVoiceSignature));
 const g=anatomy.games.find(g=>g.id==='simfarm');assert.equal(g.packedResourceCount,151);assert.equal(g.decodedBitmapCount,22);assert.equal(g.imageFileCount,0);assert.equal(g.runtimeObserved,false);
});

test('object/HUD lesson is discoverable through shared API and MCP data',()=>{
 const g=anatomy.games.find(g=>g.id==='object-and-hud');assert.equal(g.kind,'design-lesson');assert(searchAnatomy({q:'HUD'}).results.some(g=>g.id==='object-and-hud'));const r=response();mcp({method:'POST',body:{jsonrpc:'2.0',id:9,method:'tools/call',params:{name:'get_game_anatomy',arguments:{id:g.id}}}},r);assert.deepEqual(JSON.parse(r.body.result.content[0].text),g);assert.match(g.lesson.status,/not implemented or verified/);
});
