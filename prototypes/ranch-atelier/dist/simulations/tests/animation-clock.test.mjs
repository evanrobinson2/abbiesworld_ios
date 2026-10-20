import {test} from 'node:test';
import assert from 'node:assert/strict';
import {idleAnimationRate,idleAnimationDelta} from '../simulation/animation-clock.mjs';
test('idle clock stays gentle across playback speeds',()=>{assert.equal(idleAnimationRate(1),.65);for(const speed of [.25,.5,1,2,4,8,1000]){assert.ok(idleAnimationRate(speed)>=.4);assert.ok(idleAnimationRate(speed)<=.9);}assert.equal(idleAnimationDelta(.02,0),0);});
test('clock integrates continuously without phase jumps or catch-up bursts',()=>{let phase=0;for(const speed of [1,8,.25,1]){const before=phase;phase+=idleAnimationDelta(1/60,speed);assert.ok(phase-before<=.9/60);}assert.ok(idleAnimationDelta(10,8)<=.045);assert.equal(idleAnimationDelta(-1,1),0);assert.equal(idleAnimationDelta(NaN,1),0);});
