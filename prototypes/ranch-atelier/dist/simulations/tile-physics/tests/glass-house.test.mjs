import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../../vendor/three.module.js';
import * as inertia from '../../glass-house/inertia-layers.mjs';
import {createGlassHouse} from '../glass-house.mjs';
test('original Glass House moves only copies and reassembles without disposing shared geometry',()=>{
 const root=new T.Group(),tile=new T.Group();tile.position.x=2;root.add(tile);const geometry=new T.BoxGeometry(1,1,1),prop=new T.Mesh(geometry);prop.userData.motionKey='house';tile.add(prop);let disposed=false;geometry.addEventListener('dispose',()=>disposed=true);const life=new T.Group();life.scale.setScalar(.1);root.add(life);const body=new T.Group();body.position.x=20;life.add(body);const saved=body.position.clone(),effect=createGlassHouse({root,tileObjects:[{id:'a',object:tile}],entities:()=>[{body,tileId:'a'}],inertia});
 assert.equal(effect.begin('a'),2);assert.equal(tile.visible,false);assert.equal(body.visible,false);effect.move({position:[25,3,0]});effect.update(1/60);assert.deepEqual(body.position,saved);assert.equal(tile.position.x,2);effect.end();assert.equal(tile.visible,true);assert.equal(body.visible,true);assert.equal(root.children.length,2);assert.equal(disposed,false);assert.equal(effect.active,false);effect.dispose();
});
test('fixture clones exclude actor subtrees and cancel restores original visibility',()=>{
 const root=new T.Group(),tile=new T.Group(),fixture=new T.Group(),body=new T.Group();root.add(tile,fixture);fixture.add(body);body.visible=false;const effect=createGlassHouse({root,tileObjects:[{id:'a',object:tile}],entities:()=>[{body,tileId:'a'}],fixtures:()=>[{object:fixture,tileId:'a'}],inertia});effect.begin('a');assert.equal(effect.count,0);effect.cancel();assert.equal(fixture.visible,true);assert.equal(body.visible,false);assert.equal(root.children.length,2);
});
