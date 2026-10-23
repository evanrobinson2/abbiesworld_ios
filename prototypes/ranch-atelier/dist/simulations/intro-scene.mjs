// Opening scene while the sandbox compiles every tile's shaders: the camera sits in Grace's basement staring at her DOS
// computer, and the game on the screen is playable (the basement study in embed mode). No words until the ranch is ready;
// the amber lights under the screen fill as the work completes. Same step()/finish() interface as warm-up-card.mjs.
const GAME='/studies/basement/play.html?embed=1';
const STYLE=`#intro-scene{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;background:radial-gradient(120% 90% at 50% 8%,#3a2a1c 0%,#1a120c 45%,#07060a 100%);transition:opacity .6s ease}
#intro-scene.leaving{opacity:0;pointer-events:none}
#intro-scene:before{content:"";position:absolute;inset:auto 0 0 0;height:30%;background:linear-gradient(#2b1c12,#140c07);box-shadow:0 -2px 0 #4a3322}
#intro-scene .crt{position:relative;width:min(94vw,calc(86vh*4/3.35),960px);aspect-ratio:4/3.35;background:linear-gradient(145deg,#d8d0b8,#bfb599 60%,#a89e84);border-radius:5% / 5.5%;padding:5.5% 5.5% 13%;box-shadow:inset 0 0 0 2px #ffffff55,inset 0 -10px 24px #0004,0 30px 60px #000a,0 0 120px #ffb35a22}
#intro-scene .glass{position:relative;width:100%;height:100%;border-radius:6% / 7%;overflow:hidden;background:#000;box-shadow:inset 0 0 0 3px #1a1a1a,inset 0 0 40px #000,0 0 0 4px #8c8470}
#intro-scene iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}
#intro-scene .glass:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(#0000 0 2px,#0000002e 2px 3px),radial-gradient(120% 100% at 50% 40%,#0000 55%,#000a 100%);mix-blend-mode:multiply;box-shadow:inset 0 0 60px #6cff9d14}
#intro-scene .panel{position:absolute;left:5.5%;right:5.5%;bottom:3.2%;height:6.5%;display:flex;align-items:center;gap:3%}
#intro-scene .power{width:1.6vmin;height:1.6vmin;min-width:8px;min-height:8px;border-radius:50%;background:#4cff7a;box-shadow:0 0 10px #4cff7a}
#intro-scene .lights{display:flex;gap:1.2%;flex:1;max-width:60%}
#intro-scene .lights i{flex:1;height:1.2vmin;min-height:5px;border-radius:2px;background:#5a4a30;box-shadow:inset 0 1px 2px #0008;transition:background .3s,box-shadow .3s}
#intro-scene .lights i.on{background:#ffb23d;box-shadow:0 0 8px #ffb23d}
#intro-scene .slot{margin-left:auto;width:22%;height:36%;background:#2b2a26;border-radius:2px;box-shadow:inset 0 2px 3px #000}
#intro-scene .ready{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:10px;align-items:center;background:var(--app-ink,#2b2118);color:var(--app-paper,#fbf4e4);border-radius:10px;padding:8px 14px;font:13px var(--app-font,system-ui,sans-serif);box-shadow:0 6px 24px #0007}
#intro-scene .ready[hidden]{display:none}#intro-scene .ready button{font:inherit;color:inherit;background:#ffffff1f;border:1px solid #ffffff55;border-radius:8px;padding:5px 10px;cursor:pointer}
@media (prefers-reduced-motion:no-preference){#intro-scene .power{animation:intro-pulse 2.4s ease-in-out infinite}@keyframes intro-pulse{50%{opacity:.55}}}`;
export function createIntroScene(){
 const style=document.createElement('style');style.textContent=STYLE;document.head.append(style);
 const scene=document.createElement('div');scene.id='intro-scene';scene.setAttribute('role','dialog');scene.setAttribute('aria-label',"Grace's computer. Your ranch is getting ready.");
 const LIGHTS=10;
 scene.innerHTML='<div class="crt"><div class="glass"><iframe title="Grace\'s Basement" allow="autoplay;fullscreen"></iframe></div><div class="panel"><span class="power"></span><span class="lights">'+'<i></i>'.repeat(LIGHTS)+'</span><span class="slot"></span></div></div><div class="ready" role="status" hidden><span>Ready</span><button type="button" aria-label="Back to the ranch">Back to the ranch</button></div>';
 document.body.append(scene);
 const frame=scene.querySelector('iframe'),lights=[...scene.querySelectorAll('.lights i')],ready=scene.querySelector('.ready'),back=ready.querySelector('button');
 frame.src=GAME;
 let touched=false,closed=false,done=false;
 // Clicking the game moves focus into the frame: from then on the player is playing, so never pull them away.
 addEventListener('blur',()=>{if(document.activeElement===frame)touched=true;});
 scene.addEventListener('pointerdown',()=>{touched=true;},true);
 function close(){if(closed)return;closed=true;frame.contentWindow?.postMessage({type:'pause'},'*');scene.classList.add('leaving');setTimeout(()=>{scene.remove();style.remove();},700);}
 back.onclick=close;
 addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.data?.event==='quit')close();});
 return {
  step(n,total){const lit=Math.round(LIGHTS*Math.min(1,n/Math.max(1,total)));lights.forEach((l,i)=>l.classList.toggle('on',i<lit));},
  finish(){
   if(done)return;done=true;lights.forEach(l=>l.classList.add('on'));
   if(!touched){setTimeout(close,1400);return;}
   ready.hidden=false;
  },
 };
}
