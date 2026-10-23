// Winchester's own shader warm-up. Programs compiled on another page don't carry over, so the town compiles its own
// scene quietly while the title tile is played (no loading game of its own). Late mounted modules (events, coaster, mission) are compiled in
// a second pass, and every program is kept so nothing is thrown away between cards.
import {keepPrograms} from './build-progress.mjs';
export async function warmTown({renderer,scene,camera,ready}){
 const compile=async()=>{try{await (renderer.compileAsync?renderer.compileAsync(scene,camera):Promise.resolve(renderer.compile(scene,camera)));}catch{}keepPrograms(renderer);};
 await ready;await compile();
 await new Promise(r=>setTimeout(r,1500)); // events, coaster and mission mount after the first frame
 await compile();
 document.body.dataset.shadersWarm='town';
}
