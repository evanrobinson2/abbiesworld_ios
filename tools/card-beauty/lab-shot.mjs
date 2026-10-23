// Shots of the Cards v3 lab (cards/v3/index.html): the hand, the held card, its facets. Usage: node lab-shot.mjs <outdir> [style] [w h dpr]
import {chromium} from 'playwright';import fs from 'node:fs';import {serve} from '../remaster-shots/serve.mjs';
const [outdir,style='slice',w='1280',h='800',dpr='1']=process.argv.slice(2);fs.mkdirSync(outdir,{recursive:true});
const {server,port}=serve(new URL('../../prototypes/ranch-atelier/dist', import.meta.url).pathname);
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const tab=await browser.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:+dpr});
tab.on('pageerror',e=>console.log('pageerror',e.message));tab.on('console',m=>{if(m.type()==='error')console.log('console',m.text());});
await tab.goto(`http://127.0.0.1:${port}/cards/v3/index.html?style=${style}`);await tab.waitForTimeout(2500);
await tab.screenshot({path:`${outdir}/lab-hand-${style}.png`});
await tab.click('#hand button:first-child');await tab.mouse.move(+w*0.66,+h*0.35);await tab.waitForTimeout(3500);
await tab.screenshot({path:`${outdir}/lab-held-${style}.png`,timeout:120000});
await tab.click('.cv3-turn');await tab.waitForTimeout(2000);
await tab.screenshot({path:`${outdir}/lab-facets-${style}.png`,timeout:120000});
await browser.close();server.close();console.log('ok');
