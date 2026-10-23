// Fixed-camera before shots of a sandbox scene. Usage: node shots.mjs <page> <shots.json> <outdir>
import {chromium} from 'playwright';import fs from 'node:fs';import {serve} from './serve.mjs';
const [page,list,outdir]=process.argv.slice(2);const shots=JSON.parse(fs.readFileSync(list));fs.mkdirSync(outdir,{recursive:true});
const {server,port}=serve(new URL('../../prototypes/ranch-atelier/dist', import.meta.url).pathname);
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const seen=JSON.parse(fs.readFileSync(new URL('../../prototypes/ranch-atelier/dist/whats-new.json', import.meta.url).pathname)).entries.map(e=>e.id);
const tab=await browser.newPage({viewport:{width:1280,height:800}});
await tab.addInitScript(ids=>{try{localStorage.setItem('afb-seen',JSON.stringify(ids));}catch{}},seen);
await tab.goto(`http://127.0.0.1:${port}${page}?creator=studyroomstudyroom12345`,{waitUntil:'load',timeout:90000}).catch(e=>console.log(e.message));
await tab.waitForTimeout(10000);
await tab.waitForFunction(()=>!/Preparing|Loading|Building/i.test(document.body.innerText||''),null,{timeout:240000}).catch(()=>console.log('still preparing'));
await tab.waitForFunction(()=>window.holodeck,null,{timeout:60000});
await tab.waitForTimeout(4000);
// Hide every overlay: keep only the world canvas and its ancestors.
await tab.evaluate(()=>{const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
 for(const el of document.body.querySelectorAll('*')){if(el===c||el.contains(c)||c.contains(el))continue;el.style.setProperty('visibility','hidden','important');}});
for(const s of shots){
 if(s.weather)await tab.evaluate(w=>window.holodeck.apply([{op:'weather',args:{mode:w}}]),s.weather);
 const ops=[];if(s.hour!==undefined){await tab.evaluate(h=>window.holodeck.apply([{op:'time',args:{hour:h,paused:false}}]),s.hour);await tab.waitForTimeout(1500);ops.push({op:'time',args:{hour:s.hour,paused:true}});}
 ops.push({op:'camera',args:s.fit?{fit:true}:{position:s.position,target:s.target,duration:0,...(s.fov?{fov:s.fov}:{})}});
 const r=await tab.evaluate(ops=>window.holodeck.apply(ops),ops);if(!r.ok)console.log(s.id,r.error);
 await tab.waitForTimeout(s.wait||2500);
 await tab.screenshot({path:`${outdir}/${s.id}.png`});
 const cam=await tab.evaluate(()=>window.holodeck.snapshot(false).camera);console.log(s.id,JSON.stringify(cam));
}
await browser.close();server.close();
