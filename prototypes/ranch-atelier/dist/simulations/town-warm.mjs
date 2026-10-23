// Winchester's own shader warm-up. Programs compiled on another page don't carry over, so the town compiles its own
// scene behind the intro scene (Grace's computer), then the popup "Enter Winchester" closes it. Shown once per session
// for people; automated browsers and ?nointro skip it. Late mounted modules (events, coaster, mission) are compiled in
// a second pass, and every program is kept so nothing is thrown away between cards.
import {createIntroScene} from './intro-scene.mjs?v=2';
import {keepPrograms} from './build-progress.mjs';
export async function warmTown({renderer,scene,camera,ready}){
 const q=new URLSearchParams(location.search);
 let seen=false;try{seen=sessionStorage.getItem('aw-town-warm')==='1';}catch{}
 const show=!navigator.webdriver&&!q.has('nointro')&&!q.has('nowarm')&&!seen;
 const card=show?createIntroScene({destination:null}):null;
 const compile=async()=>{try{await (renderer.compileAsync?renderer.compileAsync(scene,camera):Promise.resolve(renderer.compile(scene,camera)));}catch{}keepPrograms(renderer);};
 card?.step(1,4);await ready;card?.step(2,4);await compile();card?.step(3,4);
 await new Promise(r=>setTimeout(r,1500)); // events, coaster and mission mount after the first frame
 await compile();card?.step(4,4);
 document.body.dataset.shadersWarm='town';
 if(card){try{sessionStorage.setItem('aw-town-warm','1');}catch{}card.finish(true);}
}
