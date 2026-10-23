// Opening scene while the sandbox compiles every tile's shaders. The site starts black, a desk lamp clicks on, and you
// are standing beside Grace's DOS computer in her basement. The screen glows and pulses to beckon you; tapping it moves
// you in so you can play the basement game on it. The amber lights under the screen fill as tile types finish compiling.
// When everything is ready a popup offers to leave for the ranch; nobody is ever pulled out of the game.
// Same step()/finish() interface as warm-up-card.mjs. No words until the popup.
const GAME='/studies/basement/play.html?embed=1';
const STYLE=`#intro-scene{position:fixed;inset:0;z-index:2147483000;overflow:hidden;background:#000;transition:opacity .7s ease;perspective:1400px}
#intro-scene.leaving{opacity:0;pointer-events:none}
#intro-scene .room{position:absolute;inset:0;background:radial-gradient(90% 70% at 22% 30%,#4a3622 0%,#22170f 42%,#09070a 100%);opacity:0}
#intro-scene .room:before{content:"";position:absolute;inset:auto 0 0 0;height:34%;background:linear-gradient(#2e1e13,#120a06);box-shadow:0 -3px 0 #523824}
#intro-scene .lamp{position:absolute;left:7%;bottom:30%;width:min(14vw,110px);aspect-ratio:1/1.9;transform-origin:50% 100%}
#intro-scene .lamp .stem{position:absolute;left:46%;bottom:0;width:8%;height:62%;background:#2a2622;border-radius:3px}
#intro-scene .lamp .base{position:absolute;left:22%;bottom:-2%;width:56%;height:7%;background:#2a2622;border-radius:50% 50% 4px 4px}
#intro-scene .lamp .hood{position:absolute;left:5%;top:6%;width:70%;height:26%;background:#3b3a33;border-radius:60% 60% 8% 8%/90% 90% 10% 10%;transform:rotate(-14deg);box-shadow:inset 0 -6px 10px #0006}
#intro-scene .lamp .bulb{position:absolute;left:22%;top:25%;width:26%;aspect-ratio:1;border-radius:50%;background:#fff4c9;box-shadow:0 0 20px 10px #ffd987aa,0 0 80px 40px #ffb54766;opacity:0}
#intro-scene .cone{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(75% 85% at 14% 55%,#ffd98a40 0%,#ffb34722 38%,#0000 70%);mix-blend-mode:screen}
#intro-scene .black{position:absolute;inset:0;background:#000;pointer-events:none}
#intro-scene .stage{position:absolute;left:54%;top:50%;width:min(66vw,calc(78vh*4/3.35),880px);aspect-ratio:4/3.35;transform:translate(-50%,-46%) rotateY(-17deg) rotateX(2deg);transform-origin:50% 60%;transition:transform 1.15s cubic-bezier(.5,.05,.2,1);cursor:pointer;outline:none}
#intro-scene .crt{position:absolute;inset:0;background:linear-gradient(145deg,#d8d0b8,#bfb599 60%,#a89e84);border-radius:5% / 5.5%;padding:5.5% 5.5% 13%;box-shadow:inset 0 0 0 2px #ffffff55,inset 0 -10px 24px #0004,0 40px 70px #000b}
#intro-scene .glass{position:relative;width:100%;height:100%;border-radius:6% / 7%;overflow:hidden;background:#000;box-shadow:inset 0 0 0 3px #1a1a1a,inset 0 0 40px #000,0 0 0 4px #8c8470}
#intro-scene iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;pointer-events:none}
#intro-scene .glass:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(#0000 0 2px,#0000002e 2px 3px),radial-gradient(120% 100% at 50% 40%,#0000 55%,#000a 100%);mix-blend-mode:multiply;box-shadow:inset 0 0 60px #6cff9d14}
#intro-scene .halo{position:absolute;inset:-3%;border-radius:8%;pointer-events:none;box-shadow:0 0 60px 8px #6cff9d55,0 0 140px 30px #6cff9d22;opacity:0}
#intro-scene .touch{position:absolute;left:50%;top:44%;width:9%;aspect-ratio:1;margin:-4.5% 0 0 -4.5%;border-radius:50%;border:3px solid #fff;opacity:0;pointer-events:none}
#intro-scene .panel{position:absolute;left:5.5%;right:5.5%;bottom:3.2%;height:6.5%;display:flex;align-items:center;gap:3%}
#intro-scene .power{width:1.6vmin;height:1.6vmin;min-width:8px;min-height:8px;border-radius:50%;background:#4cff7a;box-shadow:0 0 10px #4cff7a}
#intro-scene .lights{display:flex;gap:1.2%;flex:1;max-width:60%}
#intro-scene .lights i{flex:1;height:1.2vmin;min-height:5px;border-radius:2px;background:#5a4a30;box-shadow:inset 0 1px 2px #0008;transition:background .3s,box-shadow .3s}
#intro-scene .lights i.on{background:#ffb23d;box-shadow:0 0 8px #ffb23d}
#intro-scene .slot{margin-left:auto;width:22%;height:36%;background:#2b2a26;border-radius:2px;box-shadow:inset 0 2px 3px #000}
#intro-scene.close .stage{transform:translate(-50%,-50%) rotateY(0) rotateX(0) scale(1.38);cursor:default}
#intro-scene.close iframe{pointer-events:auto}
#intro-scene.close .halo,#intro-scene.close .touch{display:none}
#intro-scene .exit{position:absolute;top:max(12px,env(safe-area-inset-top));right:12px;width:36px;height:36px;border-radius:50%;border:1px solid #ffffff55;background:#00000066;color:#fff;font:20px/1 system-ui;display:none;place-items:center;cursor:pointer}
#intro-scene.close .exit{display:grid}
#intro-scene .ready{position:absolute;left:50%;bottom:max(22px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;background:var(--app-ink,#2b2118);color:var(--app-paper,#fbf4e4);border-radius:14px;padding:14px 20px;font:15px var(--app-font,system-ui,sans-serif);box-shadow:0 10px 36px #000a;max-width:calc(100vw - 24px)}
#intro-scene .ready[hidden]{display:none}#intro-scene .ready button{font:inherit;font-weight:600;color:#2b2118;background:#ffb23d;border:0;border-radius:10px;padding:9px 18px;cursor:pointer}
#intro-scene.on .room{animation:intro-room 1.6s ease forwards 2.15s}
#intro-scene.on .black{animation:intro-black 2.6s linear forwards}
#intro-scene.on .bulb{animation:intro-bulb 2.6s ease forwards}
#intro-scene.on .cone{animation:intro-cone 2.6s ease forwards}
#intro-scene.lit .halo{animation:intro-halo 2.2s ease-in-out infinite}
#intro-scene.lit .touch{animation:intro-touch 2.2s ease-out infinite .4s}
@keyframes intro-black{0%{opacity:1}30%{opacity:1}31%{opacity:.35}36%{opacity:1}52%{opacity:1}53%{opacity:.1}58%{opacity:.8}63%{opacity:.05}100%{opacity:0}}
@keyframes intro-bulb{0%,30%{opacity:0}31%{opacity:1}36%{opacity:0}52%{opacity:0}53%{opacity:1}58%{opacity:.3}63%,100%{opacity:1}}
@keyframes intro-cone{0%,30%{opacity:0}31%{opacity:.7}36%{opacity:0}52%{opacity:0}53%{opacity:.8}58%{opacity:.2}63%,100%{opacity:1}}
@keyframes intro-room{to{opacity:1}}
@keyframes intro-halo{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes intro-touch{0%{opacity:.9;transform:scale(.5)}100%{opacity:0;transform:scale(1.7)}}
@media (prefers-reduced-motion:reduce){#intro-scene.on .room{animation:intro-room .4s ease forwards}#intro-scene.on .black{animation:intro-black-r .4s forwards}#intro-scene.on .bulb,#intro-scene.on .cone{animation:none;opacity:1}#intro-scene.lit .halo{animation:none;opacity:.8}#intro-scene.lit .touch{animation:none}@keyframes intro-black-r{to{opacity:0}}}
@media (max-width:700px){#intro-scene .stage{left:50%;width:94vw;transform:translate(-50%,-46%) rotateY(-9deg)}#intro-scene .lamp{left:2%;bottom:26%;width:22vw}#intro-scene.close .stage{transform:translate(-50%,-50%) rotateY(0) rotateX(0) scale(1.03)}}`;
export function createIntroScene(){
 const style=document.createElement('style');style.textContent=STYLE;document.head.append(style);
 const scene=document.createElement('div');scene.id='intro-scene';scene.setAttribute('role','dialog');scene.setAttribute('aria-label',"Grace's computer. Your ranch is getting ready.");
 const LIGHTS=10;
 scene.innerHTML='<div class="room"><div class="lamp"><div class="stem"></div><div class="base"></div><div class="hood"></div><div class="bulb"></div></div></div><div class="cone"></div>'
  +'<div class="stage" role="button" tabindex="0" aria-label="Use the computer"><div class="halo"></div><div class="crt"><div class="glass"><iframe title="Grace\'s Basement" allow="autoplay;fullscreen"></iframe></div><div class="panel"><span class="power"></span><span class="lights">'+'<i></i>'.repeat(LIGHTS)+'</span><span class="slot"></span></div></div><div class="touch"></div></div>'
  +'<div class="black"></div><button class="exit" type="button" aria-label="Back to the ranch">×</button>'
  +'<div class="ready" role="status" hidden><span>Your ranch is ready</span><button type="button">Enter the ranch</button></div>';
 document.body.append(scene);
 const stage=scene.querySelector('.stage'),frame=scene.querySelector('iframe'),lights=[...scene.querySelectorAll('.lights i')],ready=scene.querySelector('.ready'),enter=ready.querySelector('button'),exit=scene.querySelector('.exit');
 let closed=false;
 // Black first; the lamp clicks on (a stutter, then steady) about two seconds in; then the screen starts calling to you.
 requestAnimationFrame(()=>{scene.classList.add('on');setTimeout(()=>scene.classList.add('lit'),2900);});
 frame.src=GAME;
 function useIt(){if(closed||scene.classList.contains('close'))return;scene.classList.add('close');frame.contentWindow?.postMessage({type:'resume'},'*');setTimeout(()=>frame.focus(),1200);}
 stage.addEventListener('click',useIt);stage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();useIt();}});
 function close(){if(closed)return;closed=true;frame.contentWindow?.postMessage({type:'pause'},'*');scene.classList.add('leaving');setTimeout(()=>{scene.remove();style.remove();},800);}
 enter.onclick=close;exit.onclick=close;
 addEventListener('keydown',e=>{if(e.key==='Escape'&&!closed&&!ready.hidden)close();});
 addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.data?.event==='quit')close();});
 return {
  step(n,total){const lit=Math.round(LIGHTS*Math.min(1,n/Math.max(1,total)));lights.forEach((l,i)=>l.classList.toggle('on',i<lit));},
  finish(){lights.forEach(l=>l.classList.add('on'));ready.hidden=false;},
 };
}
