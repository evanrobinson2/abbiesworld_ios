// Plays the town's own features in one headless-Chromium visit to Winchester (the intro replayed with ?intro=1): the intro
// drops the town, the world-effect icons mount, the paint balls mount, townsfolk stand at their places, and the backpack
// takes an item and gives it back. Fails on any page error. Serve prototypes/ranch-atelier/dist on :8765, then:
//   node tools/game-registry/town-features.cjs
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  try {
  const p = await b.newPage({viewport: {width: 1280, height: 720}});
  p.setDefaultTimeout(120000);
  p.on('pageerror', e => console.log('err', e.message));
  const until = (fn, what, ms = 420000) => p.waitForFunction(fn, null, {timeout: ms, polling: 500}).then(() => console.log('ok  ', what), e => { throw new Error('never saw: ' + what); });
  await p.goto((process.env.TEST_BASE_URL || 'http://localhost:8765')+'/studies/abbietown/index.html?play&intro=1', {timeout: 240000});
  await until(() => window.AbbieTown && window.AbbieTown.stage, 'the town stage is up');
  await until(() => document.body.dataset.townDropped === '1', 'intro: the charms fold in and the town drops');
  await until(() => document.querySelector('#paint-hud .ph-icon') && !document.querySelector('.aw-ico[data-effect]'), 'world effects: single throwable mounted in the HUD');
  await until(() => window.AbbieTown.paint, 'paint balls: Paint the World mounted');
  await until(() => document.querySelector('[data-mode=disco]'), 'celebration modes mounted');
  await p.locator('[data-mode=party]').click({noWaitAfter:true});
  await p.locator('[data-mode=disco]').click({noWaitAfter:true});
  await until(() => document.querySelector('canvas.aw-party') && document.querySelector('[data-mode=disco]').getAttribute('aria-pressed')==='true', 'PARTY and DISCO stack');
  await p.screenshot({path:'town-celebrations.png',timeout:120000});
  await p.locator('[data-mode=party]').click({noWaitAfter:true});
  await p.locator('[data-mode=disco]').click({noWaitAfter:true});
  await until(() => !document.querySelector('canvas.aw-party') && document.querySelector('[data-mode=disco]').getAttribute('aria-pressed')==='false', 'both modes turn off immediately');
  await p.locator('#paint-hud .ph-icon').click({noWaitAfter:true});
  await p.mouse.move(640,360);
  await until(() => document.querySelector('.ph-held')?.style.left==='640px', 'fireball follows the cursor');
  await p.screenshot({path:'town-throwable.png',timeout:120000});
  await p.mouse.click(640,360);
  await until(() => !document.querySelector('.ph-held'), 'throw releases the held fireball');
  await until(() => { let n = 0; window.AbbieTown.scene.traverse(o => { if (/^townsfolk-/.test(o.name || '')) n++; }); return n > 0; }, 'quests: townsfolk stand at their places');
  await until(() => !!window.AbbieTown.stage.tiles.farm, 'farm: the farm hex is on the board');
  await until(() => { let n = 0; const f = o => { if (/^library-/.test(o.name || '')) n++; }; window.AbbieTown.scene.traverse(f); window.AbbieTown.stage.dioGroup?.traverse(f); return n > 0; }, 'town dressing: library props are placed');
  await until(() => { const h = window.AbbieTown.heroes; return h && h.length > 0 && h.some(g => g.children.length > 0); }, 'heroes: the Meshy heroes stand in town');
  await until(() => window.AbbieInventory, 'backpack: the inventory is up');
  const r = await p.evaluate(() => { const A = window.AbbieInventory, id = 'invariant-test-item'; A.remove(id); const added = !!A.add({id, name: 'Test', from: 'test', thought: 'test'}), has = A.has(id), removed = A.remove(id); return {added, has, removed, gone: !A.has(id)}; });
  if (!(r.added && r.has && r.removed && r.gone)) throw new Error('backpack round trip failed ' + JSON.stringify(r));
  console.log('ok   backpack: item in, item out');
  console.log('GAME-TEST PASS town-features');
  } finally { await b.close(); }
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
