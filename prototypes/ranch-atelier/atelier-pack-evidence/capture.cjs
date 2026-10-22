// Same-camera capture: one saved board and clock, seeded Math.random, simulation paused as soon as it exists.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
(async()=>{
 const [url,out,state,w='1600',h='1000']=process.argv.slice(2);
 const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:+w,height:+h},deviceScaleFactor:1});
 const p=await ctx.newPage();
 await p.addInitScript(st=>{let s=20261022;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  let n=0;crypto.randomUUID=()=>'00000000-0000-4000-8000-'+String(++n).padStart(12,'0');
  localStorage.clear();localStorage.setItem('abbies-simulations-v1',st);
  // pause on the first frame the canvas exists
  const tick=()=>{const c=document.querySelector('canvas[data-seed]'),b=document.getElementById('pause');if(c&&b&&!window.__paused){b.click();window.__paused=performance.now();}else if(!window.__paused)requestAnimationFrame(tick);};requestAnimationFrame(tick);
 },fs.readFileSync(state,'utf8'));
 const logs=[];p.on('pageerror',e=>logs.push('ERR '+e.message));
 await p.goto(url);
 await p.waitForFunction(()=>window.__paused,null,{timeout:120000});
 await p.waitForTimeout(20000);
 if(process.env.ZOOM){const [x,y,n]=process.env.ZOOM.split(',').map(Number);await p.mouse.move(x,y);for(let i=0;i<n;i++){await p.mouse.wheel(0,-120);await p.waitForTimeout(300);}await p.waitForTimeout(8000);}
 const info=await p.evaluate(()=>({label:document.querySelector('#playback-label')?.textContent,time:document.body.innerText.match(/\d+:\d\d [AP]M/)?.[0],paused:window.__paused}));
 await p.screenshot({path:out,timeout:150000});
 console.log(out,JSON.stringify(info),logs.slice(0,5).join('\n'));await b.close();})();
