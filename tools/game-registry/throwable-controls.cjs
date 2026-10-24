const {chromium}=require('../game-feel-check/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 for(const touch of [false,true]){
 const context=await browser.newContext({viewport:touch?{width:820,height:1180}:{width:1280,height:720},hasTouch:touch});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_BASE_URL || 'http://localhost:8765');
 await page.setContent('<style>body{margin:0}canvas{position:fixed;inset:0;width:100%;height:100%;touch-action:none}#bar{position:fixed;top:10px;left:10px;display:flex;z-index:5}</style><script type="importmap">{"imports":{"three":"/simulations/vendor/three.module.js"}}</script><canvas></canvas><div id="bar"></div>');
 await page.evaluate(async()=>{
  const T=await import('/simulations/vendor/three.module.js'),{createPaintHud}=await import('/simulations/paint-world/paint-hud.mjs'),{createCelebrationModes}=await import('/simulations/celebration-modes.mjs');
  const canvas=document.querySelector('canvas'),host=document.querySelector('#bar');window.throws=[];window.cameraEvents=0;
  canvas.addEventListener('pointerdown',()=>window.cameraEvents++);
  window.roll=.1;
  window.hud=createPaintHud({host,surface:canvas,rand:()=>window.roll,onThrow:(b,x,y,vx,vy)=>{window.throws.push({b,x,y,vx,vy});return true;}});
  window.scene=new T.Scene();const camera=new T.PerspectiveCamera();camera.position.set(0,20,30);
  window.modes=createCelebrationModes({T,scene:window.scene,camera,orbit:{target:new T.Vector3()},canvas,heightAt:()=>0});modes.mount(host);
 });
 const icon=page.locator('.ph-icon');
 if(!touch){
  await icon.click();await page.mouse.move(400,300);
  assert.equal(await page.locator('.ph-held').count(),1);
  assert.equal(await page.locator('.ph-held').evaluate(e=>e.style.left),'400px');
  await page.screenshot({path:'throwable-desktop.png'});
  await page.mouse.click(400,300);
 }else{
  const box=await icon.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:300,y:400}]});
  assert.equal(await page.locator('.ph-held').count(),1);
  await page.screenshot({path:'throwable-touch.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 assert.equal(await page.evaluate(()=>throws.length),1);assert.equal(await page.evaluate(()=>cameraEvents),0);
 assert.equal(await page.locator('.ph-held').count(),0);
 for(let i=0;i<12;i++){await page.evaluate(i=>window.roll=[.1,.4,.6,.9][i%4],i);await icon.click();await page.mouse.click(420,320);}
 assert.equal(await page.evaluate(()=>throws.length),13);assert.equal(await page.evaluate(()=>hud.cooldownLeft()),0);
 assert.deepEqual(await page.evaluate(()=>[...new Set(throws.map(t=>t.b.kind))].sort()),['cats-dogs','fireball','paint','waterball']);
 assert.equal(await page.locator('#paint-balls,.ph-slot').count(),0);
 await icon.click();await page.keyboard.press('Escape');assert.equal(await page.locator('.ph-held').count(),0);
 await icon.click();await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1})));assert.equal(await page.locator('.ph-held').count(),0);
 await icon.click();await page.mouse.move(400,300);await page.mouse.down();await page.mouse.move(500,350);await page.waitForTimeout(180);await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>[throws.at(-1).vx,throws.at(-1).vy]),[0,0]);
 await page.locator('[data-mode=party]').click();await page.locator('[data-mode=disco]').click();
 assert.deepEqual(await page.evaluate(()=>[modes.isOn('party'),modes.isOn('disco'),!!scene.getObjectByName('disco-celebration')]),[true,true,true]);
 await page.locator('[data-mode=party]').click();
 assert.deepEqual(await page.evaluate(()=>[document.querySelector('canvas').classList.contains('aw-party'),modes.isOn('disco')]),[false,true]);
 await page.locator('[data-mode=disco]').click();assert.equal(await page.evaluate(()=>!!scene.getObjectByName('disco-celebration')),false);
 assert.deepEqual(errors,[]);await context.close();console.log('PASS',touch?'touch':'mouse');
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

