import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makePerson,animatePerson} from '../simulations/town-life/people/models.mjs';
import {animateRanchPerson} from '../simulations/ranch-person-motion.mjs';
import {animateAstronaut} from '../simulations/moon/moon-astronaut.mjs';
const fingerprint=body=>[...body.userData.limbs.flatMap(l=>l.rotation.toArray().slice(0,3)),...body.userData.head.rotation.toArray().slice(0,3),body.position.y];
for(const seed of [0,1,7])for(const role of ['farmer','resident','teacher','mechanic']){
 const person={index:seed,role,appearance:{skin:'#ca9',hair:'#432',hairStyle:0,build:1,height:1.75},wardrobe:{top:'#b64',bottom:'#456',hat:'none',accessory:'none'}};
 for(const [phase,distance]of [['idle',0],['work',0],['walk',.04]]){
  const body=makePerson(person),worker={body,position:{x:4,z:8}},height=()=>3.2;
  const frames=[];
  for(let i=0;i<90;i++){animateRanchPerson(worker,{phase,text:phase},distance,1/30,height);frames.push(fingerprint(body));assert(Math.abs(body.position.y-3.2)<.08,'Character sank below or floated above terrain');assert(frames.at(-1).every(Number.isFinite),'Nonfinite character pose');}
  assert(frames.slice(-30).some(f=>f.some((v,i)=>Math.abs(v-frames.at(-30)[i])>.005)),`Static living pose: ${role}/${phase}`);
  const paused=fingerprint(body);animateRanchPerson(worker,{phase},distance,1/30,height,true);assert.deepEqual(fingerprint(body),paused,'Paused pose changed');
 }
}
const suit=new T.Group();suit.add(new T.Mesh(new T.BoxGeometry(.6,1.8,.4),new T.MeshStandardMaterial()));const astronaut=animateAstronaut(suit,{name:'Test',persona:'Scientist'});let sprites=0;suit.traverse(o=>{if(o.isSprite)sprites++;});assert.equal(sprites,0,'Moon captions returned');const leg=suit.children.find(o=>o.isBone).children[0];astronaut.update(.1,true);const a=leg.rotation.x;astronaut.update(.4,true);assert.notEqual(leg.rotation.x,a,'Astronaut rig stopped animating');astronaut.dispose();
const life=readFileSync(new URL('../simulations/ranch-life.mjs',import.meta.url),'utf8');assert(!/\banimatePerson\s*\(/.test(life),'Ranch bypasses terrain-safe animation');assert((life.match(/animateRanchPerson\(w,/g)||[]).length>=4,'Ranch activity branch lost animation');
console.log('Character motion gate: idle/work/walk motion, terrain grounding, pause, Moon rig and no captions PASS.');
