import * as T from '../../prototypes/ranch-atelier/dist/vendor/three.module.js';
import {buildTrack} from '../../prototypes/ranch-atelier/dist/simulations/coaster-kit.mjs';
import {course,TRACKS} from '../../prototypes/ranch-atelier/dist/studies/arcade-racer/tracks.mjs';
import {simulate} from '../../prototypes/ranch-atelier/dist/studies/arcade-racer/race-model.mjs';
for(const key of Object.keys(TRACKS)){const c=course(key),trk=buildTrack(T,c.track);const slow=simulate(trk,'center',{launch:'none',pads:c.pads}),fast=simulate(trk,'greedy',{pads:c.pads});console.log(key,slow.time,fast.time);if(!(fast.time>0&&fast.time<slow.time&&slow.time<90))throw Error('course invalid '+key)}
