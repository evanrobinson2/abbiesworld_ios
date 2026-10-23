const {chromium}=require('/opt/node-tools/node_modules/playwright');const fs=require('fs');
(async()=>{const ids=(process.argv[2]||'ranch').split(',');
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/live-tray-preview\.mjs/,async r=>{const res=await r.fetch();let s=await res.text();
 s=s.replace('renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(320,180,false)',"renderer.setPixelRatio(1);renderer.setSize(1024,1024,false)").replace('new T.PerspectiveCamera(35,320/180','new T.PerspectiveCamera(35,1').replace('setHeld(held){','setHeld(held){return;').replace("const sun=new T.DirectionalLight","window.__tray={renderer,camera,controls,stage};const sun=new T.DirectionalLight");
 await r.fulfill({response:res,body:s,headers:{...res.headers(),'content-type':'application/javascript'}});});
await p.goto('http://localhost:8787/sandbox/v2');await p.waitForTimeout(18000);
for(const id of ids){
 await p.evaluate(id=>{document.querySelector('.generator-hero[data-generator='+id+']').click();},id);await p.waitForTimeout(1500);
 await p.evaluate(()=>{if(!document.documentElement.classList.contains('v2-sheet'))document.querySelector('#v2-hand-more').click();});
 let ok=false;for(let t=0;t<40&&!ok;t++){await p.waitForTimeout(1000);ok=await p.evaluate(()=>!!document.querySelector('.live-tray-canvas')&&!!window.__tray&&!/Generating|Printing/.test(document.querySelector('#tile-chooser')?.innerText||''));}
 const st=await p.evaluate(()=>({canvas:!!document.querySelector('.live-tray-canvas'),status:document.querySelector('#tile-chooser')?.innerText?.slice(0,200),types:[...document.querySelectorAll('#tile-chooser [data-type]')].map(b=>b.dataset.type)}));console.log(id,JSON.stringify(st));
 if(ok){await p.evaluate(k=>{const {camera,controls}=window.__tray;camera.position.sub(controls.target).multiplyScalar(k).add(controls.target);controls.update();},+(process.env.K||0.8));await p.waitForTimeout(4000);const url=await p.evaluate(()=>document.querySelector('.live-tray-canvas').toDataURL('image/png'));fs.writeFileSync('tray-'+id+'.png',Buffer.from(url.split(',')[1],'base64'));}
 await p.screenshot({path:'tray-page-'+id+'.png'});
}
console.log(errs.slice(0,5));await b.close()})();
