// Renders every Cards v3 face (cards/v3/face.mjs) for each tile and style. Usage: node tools/card-beauty/faces.mjs <outdir> [dpi]
import {chromium} from 'playwright';import fs from 'node:fs';import {serve} from '../remaster-shots/serve.mjs';
const [outdir,dpi='300']=process.argv.slice(2);fs.mkdirSync(outdir,{recursive:true});
const {server,port}=serve(new URL('../../prototypes/ranch-atelier/dist', import.meta.url).pathname);
const browser=await chromium.launch();const tab=await browser.newPage();
tab.on('console',m=>console.log('page:',m.text()));
await tab.goto(`http://127.0.0.1:${port}/cards/index.html`).catch(()=>{});
const out=await tab.evaluate(async dpi=>{const {renderFace,STYLES,PLACES}=await import('/cards/v3/face.mjs');const r=[];
 for(const id of Object.keys(PLACES))for(const style of STYLES){const {canvas}=await renderFace({id,art:`/simulations/assets/tile-cards/${id}.webp`},{style,dpi});r.push({name:`${id}-${style}.png`,url:canvas.toDataURL('image/png')});}
 return r;},+dpi);
for(const f of out)fs.writeFileSync(`${outdir}/${f.name}`,Buffer.from(f.url.split(',')[1],'base64'));
console.log('wrote',out.length);await browser.close();server.close();
