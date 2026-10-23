// Same-camera shots of the Basin on its own (simulations/basin/preview.html). Usage:
//   node tools/basin-shots/shots.mjs <outdir> [query]     e.g. query "trees=v2" for the overhaul
// Every camera comes from shots.json, so before and after are the exact same framing.
import {chromium} from 'playwright';import fs from 'node:fs';import {serve} from '../remaster-shots/serve.mjs';
const [outdir,query='']=process.argv.slice(2);fs.mkdirSync(outdir,{recursive:true});
const shots=JSON.parse(fs.readFileSync(new URL('./shots.json',import.meta.url)));
const {server,port}=serve(new URL('../../prototypes/ranch-atelier/dist',import.meta.url).pathname);
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const tab=await browser.newPage({viewport:{width:1280,height:800}});tab.on('pageerror',e=>console.log('page error',e.message));
for(const s of shots){
 const q=new URLSearchParams(query);if(s.cam)q.set('cam',s.cam.join(','));if(s.t!==undefined)q.set('t',s.t);
 await tab.goto(`http://127.0.0.1:${port}/simulations/basin/preview.html?${q}`,{waitUntil:'load',timeout:90000});
 await tab.waitForFunction(()=>document.body.dataset.ready==='1',null,{timeout:180000});await tab.waitForTimeout(s.wait||3000);
 await tab.screenshot({path:`${outdir}/${s.id}.png`});console.log(s.id);
}
await browser.close();server.close();
