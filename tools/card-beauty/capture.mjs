// Same-camera captures of the live sandbox hand for AW-STUDY-0014: the scene with today's hand cards, and the bare world
// (every overlay hidden) so proposed cards can be judged over the exact same frame.
// Usage: node tools/card-beauty/capture.mjs <outdir> [width height dpr]
import {chromium} from 'playwright';import fs from 'node:fs';import {serve} from '../remaster-shots/serve.mjs';
const [outdir,w='1280',h='800',dpr='1']=process.argv.slice(2);fs.mkdirSync(outdir,{recursive:true});
const {server,port}=serve(new URL('../../prototypes/ranch-atelier/dist', import.meta.url).pathname);
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const seen=JSON.parse(fs.readFileSync(new URL('../../prototypes/ranch-atelier/dist/whats-new.json', import.meta.url).pathname)).entries.map(e=>e.id);
const tab=await browser.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:+dpr});
await tab.addInitScript(ids=>{try{localStorage.setItem('afb-seen',JSON.stringify(ids));}catch{}},seen);
await tab.goto(`http://127.0.0.1:${port}/sandbox?creator=studyroomstudyroom12345`,{waitUntil:'load',timeout:90000}).catch(e=>console.log(e.message));
await tab.waitForTimeout(10000);
await tab.waitForFunction(()=>!/Preparing|Loading|Building/i.test(document.body.innerText||''),null,{timeout:300000}).catch(()=>console.log('still preparing'));
await tab.waitForFunction(()=>window.holodeck,null,{timeout:60000}).catch(()=>console.log('no holodeck'));
await tab.waitForTimeout(6000);
await tab.screenshot({path:`${outdir}/scene-hand.png`,timeout:180000});
const rects=await tab.evaluate(()=>[...document.querySelectorAll('.v2-face')].map(c=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,t:getComputedStyle(c.parentElement).transform};}));
fs.writeFileSync(`${outdir}/hand-rects.json`,JSON.stringify(rects,null,1));
// Save each face canvas at native resolution.
const faces=await tab.evaluate(()=>[...document.querySelectorAll('.v2-face')].map(c=>({id:c.parentElement.dataset.generator,url:c.toDataURL('image/png')})));
for(const f of faces)fs.writeFileSync(`${outdir}/face-${f.id}.png`,Buffer.from(f.url.split(',')[1],'base64'));
await tab.evaluate(()=>{const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
 for(const el of document.body.querySelectorAll('*')){if(el===c||el.contains(c)||c.contains(el))continue;el.style.setProperty('visibility','hidden','important');}});
await tab.waitForTimeout(1500);
await tab.screenshot({path:`${outdir}/scene-bare.png`,timeout:180000});
console.log('done',faces.length,'faces');
await browser.close();server.close();
