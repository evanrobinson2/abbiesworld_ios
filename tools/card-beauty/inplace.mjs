// AW-STUDY-0014 in-place shots: today's hand and each Cards v3 direction over the same live scene, same camera and hour,
// then each direction held (paper shader) and turned over to its facets.
// Usage: node tools/card-beauty/inplace.mjs <outdir> [width height] [hour]
import {chromium} from 'playwright';import fs from 'node:fs';import {serve} from '../remaster-shots/serve.mjs';
const [outdir,w='1280',h='800',hour='9']=process.argv.slice(2);fs.mkdirSync(outdir,{recursive:true});
const {server,port}=serve(new URL('../../prototypes/ranch-atelier/dist', import.meta.url).pathname);
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const seen=JSON.parse(fs.readFileSync(new URL('../../prototypes/ranch-atelier/dist/whats-new.json', import.meta.url).pathname)).entries.map(e=>e.id);
const tab=await browser.newPage({viewport:{width:+w,height:+h}});
tab.on('pageerror',e=>console.log('pageerror',e.message));
await tab.addInitScript(ids=>{try{localStorage.setItem('afb-seen',JSON.stringify(ids));}catch{}},seen);
await tab.goto(`http://127.0.0.1:${port}/sandbox?creator=studyroomstudyroom12345&cards=v2`,{waitUntil:'load',timeout:90000}).catch(e=>console.log(e.message));
await tab.waitForTimeout(10000);
await tab.waitForFunction(()=>!/Preparing|Loading|Building/i.test(document.body.innerText||''),null,{timeout:300000}).catch(()=>console.log('still preparing'));
await tab.waitForFunction(()=>window.holodeck,null,{timeout:60000}).catch(()=>console.log('no holodeck'));
await tab.evaluate(h=>window.holodeck.apply([{op:'time',args:{hour:h,paused:false}}]),+hour);await tab.waitForTimeout(2000);
await tab.evaluate(h=>window.holodeck.apply([{op:'time',args:{hour:h,paused:true}}]),+hour);
await tab.waitForTimeout(5000);
const hover=async()=>{await tab.mouse.move(+w/2,+h-60);await tab.waitForTimeout(1200);};
const shot=async name=>{await tab.screenshot({path:`${outdir}/${name}.png`,timeout:180000});console.log('shot',name);};
await hover();await shot('hand-today');
for(const style of ['slice','print','diecut']){
 await tab.evaluate(async style=>{const m=await import('/cards/v3/hand.mjs');for(const h of document.querySelectorAll('#v2-hand .generator-hero'))await m.cardFace(h,style);},style);
 await tab.waitForTimeout(2500);await hover();await shot('hand-'+style);
 await tab.evaluate(async()=>{const m=await import('/cards/v3/hand.mjs');await m.openHeld(document.querySelector('#v2-hand .generator-hero[data-generator=ranch]'));});
 await tab.mouse.move(+w*0.62,+h*0.4);await tab.waitForTimeout(4000);await shot('held-'+style);
 await tab.evaluate(()=>document.querySelector('.cv3-turn').click());await tab.waitForTimeout(2500);await shot('facets-'+style);
 await tab.evaluate(async()=>{const m=await import('/cards/v3/paper.mjs');m.closeCard(true);});await tab.waitForTimeout(800);
}
await browser.close();server.close();
