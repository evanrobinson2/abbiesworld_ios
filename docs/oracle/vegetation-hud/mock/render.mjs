// Renders hud-mock.html's frames to ../img/hud-<id>.jpg. Usage: node docs/oracle/vegetation-hud/mock/render.mjs
import {chromium} from 'playwright';import {fileURLToPath} from 'node:url';
const here=new URL('.',import.meta.url),b=await chromium.launch(),t=await b.newPage({viewport:{width:1300,height:900},deviceScaleFactor:1});
await t.goto(new URL('hud-mock.html',here).href);await t.waitForTimeout(800);
for(const id of await t.$$eval('.frame',f=>f.map(e=>e.id))){await (await t.$('#'+id)).screenshot({path:fileURLToPath(new URL(`../img/hud-${id}.jpg`,here)),type:'jpeg',quality:86});console.log(id);}
await b.close();
