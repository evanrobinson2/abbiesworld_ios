// Winchester's opening. Programs compiled on another page don't carry over, so the town compiles its own scene here, behind
// the charm intro (intro-charms.mjs): black, the backpack charms circling under a spotlight. When the shaders are ready
// the charms fold into the backpack, the lights go out, the overlay (pins, weather, backpack) is already there, and then
// the whole town drops in (Evan, 2026-10-23). Shown once per session for people (?intro=1 replays it); automated browsers, ?nointro and ?nowarm
// skip the show and just warm quietly. Late mounted modules (events, coaster, mission) get a second compile pass, and every
// program is kept so nothing is thrown away between cards.
import {createCharmIntro} from './intro-charms.mjs';
import {keepPrograms} from './build-progress.mjs';
import {mountTownKeys} from './town-keys.mjs';
const DROP=2600,sleep=ms=>new Promise(r=>setTimeout(r,ms));
// the whole scene falls from the sky: one fast fall, then two settling bounces (the scene root moves, so every part rides along)
function dropScene(scene){return new Promise(resolve=>{const t0=performance.now(),F=1050;
 const y=t=>{if(t<F)return DROP*(1-(t/F)**2);t-=F;if(t<260)return 90*Math.sin(t/260*Math.PI);t-=260;if(t<180)return 26*Math.sin(t/180*Math.PI);return 0;};
 const step=()=>{const t=performance.now()-t0;scene.position.y=y(t);if(t<F+440)requestAnimationFrame(step);else{scene.position.y=0;resolve();}};step();});}
const MOUNT_WAIT=8000; // optional content never holds the opening longer than this
const frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
const settled=(list,ms)=>Promise.race([Promise.allSettled(list).then(()=>true),sleep(ms).then(()=>false)]);
export async function warmTown({renderer,scene,camera,controls,ready,mounts=[]}){
 const q=new URLSearchParams(location.search);
 if(controls)mountTownKeys({camera,controls}); // WASD panning (#545); lives here so the generated town page needs no extra line
 let seen=false;try{seen=sessionStorage.getItem('aw-town-intro')==='1';}catch{}
 const show=q.has('intro')||(!navigator.webdriver&&!q.has('nointro')&&!q.has('nowarm')&&!seen); // ?intro=1 replays it any time
 let intro=null;
 if(show){try{sessionStorage.setItem('aw-town-intro','1');}catch{}if(controls)controls.enabled=false;scene.position.y=DROP;intro=createCharmIntro();}
 const compile=async()=>{try{await (renderer.compileAsync?renderer.compileAsync(scene,camera):Promise.resolve(renderer.compile(scene,camera)));}catch{}keepPrograms(renderer);};
 const fail=e=>{console.warn('town warm',e);document.body.dataset.townWarmError=String(e&&e.message||e);};
 try{await ready;}catch(e){fail(e);}
 await compile();
 // wait for the events, coaster, townsfolk and Paint mounts themselves (not a fixed delay), then compile what they added
 const mounted=await settled(mounts,MOUNT_WAIT);if(!mounted)fail('late mounts not ready after '+MOUNT_WAIT+'ms; opening anyway');
 if(!mounts.length)await sleep(1500);
 await compile();
 // draw real frames of the opening view while the black overlay still covers it, so first-use GPU work (uploads, shadow maps) happens now
 if(intro){const y=scene.position.y;scene.position.y=0;try{renderer.render(scene,camera);await frames(3);}catch(e){fail(e);}scene.position.y=y;}
 document.body.dataset.townMounted=mounted?'1':'partial';
 document.body.dataset.shadersWarm='town';
 if(intro){await intro.finish();await sleep(450);await dropScene(scene);if(controls)controls.enabled=true;document.body.dataset.townDropped='1';}
}
