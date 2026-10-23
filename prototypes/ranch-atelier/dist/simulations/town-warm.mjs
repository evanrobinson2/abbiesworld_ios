// Winchester's opening. Programs compiled on another page don't carry over, so the town compiles its own scene here, behind
// the charm intro (intro-charms.mjs): black, the backpack charms circling under a spotlight. When the shaders are ready
// the charms fold into the backpack, the lights go out, the overlay (pins, weather, backpack) is already there, and then
// the whole town drops in (Evan, 2026-10-23). Shown once per session for people; automated browsers, ?nointro and ?nowarm
// skip the show and just warm quietly. Late mounted modules (events, coaster, mission) get a second compile pass, and every
// program is kept so nothing is thrown away between cards.
import {createCharmIntro} from './intro-charms.mjs';
import {keepPrograms} from './build-progress.mjs';
const DROP=2600,sleep=ms=>new Promise(r=>setTimeout(r,ms));
// the whole scene falls from the sky: one fast fall, then two settling bounces (the scene root moves, so every part rides along)
function dropScene(scene){return new Promise(resolve=>{const t0=performance.now(),F=1050;
 const y=t=>{if(t<F)return DROP*(1-(t/F)**2);t-=F;if(t<260)return 90*Math.sin(t/260*Math.PI);t-=260;if(t<180)return 26*Math.sin(t/180*Math.PI);return 0;};
 const step=()=>{const t=performance.now()-t0;scene.position.y=y(t);if(t<F+440)requestAnimationFrame(step);else{scene.position.y=0;resolve();}};step();});}
export async function warmTown({renderer,scene,camera,controls,ready}){
 const q=new URLSearchParams(location.search);
 let seen=false;try{seen=sessionStorage.getItem('aw-town-intro')==='1';}catch{}
 const show=!navigator.webdriver&&!q.has('nointro')&&!q.has('nowarm')&&!seen;
 let intro=null;
 if(show){try{sessionStorage.setItem('aw-town-intro','1');}catch{}if(controls)controls.enabled=false;scene.position.y=DROP;intro=createCharmIntro();}
 const compile=async()=>{try{await (renderer.compileAsync?renderer.compileAsync(scene,camera):Promise.resolve(renderer.compile(scene,camera)));}catch{}keepPrograms(renderer);};
 await ready;await compile();
 await sleep(1500); // events, coaster and mission mount after the first frame
 await compile();
 document.body.dataset.shadersWarm='town';
 if(intro){await intro.finish();await sleep(450);await dropScene(scene);if(controls)controls.enabled=true;document.body.dataset.townDropped='1';}
}
