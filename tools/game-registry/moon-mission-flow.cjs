// Plays the Moon Mission, Part 1, end to end in headless Chromium inside Winchester: the camera flies to the rocket charm at the
// bakery curb, a real tap on the charm starts the mission at the black truck, and a bot family then plays every beat through the
// real HUD (launch consoles, flight plan, cow swap, lander, Polaroid) to "Chapter 1 complete". Fails on any page error, a missing
// zone, a missing game, a missing item, or a canvas that went blank. Screenshots: one per zone, into <prefix>moon-<zone>.png.
// Serve prototypes/ranch-atelier/dist on :8765, then: node tools/game-registry/moon-mission-flow.cjs <screenshot-prefix>
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
const prefix = process.argv[2] || 'moon-mission-';
const FLAGS = process.env.MOON_FLAGS || ''; // both are live in the registry: no flags
(async () => {
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: 1280, height: 720}});
  const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('err', e.message); });
  const shot = name => p.screenshot({path: prefix + name + '.png', timeout: 240000}).catch(e => console.log('ok   (no screenshot for ' + name + ': ' + e.message.split('\n')[0] + ')'));
  const until = (fn, what, ms = 300000) => p.waitForFunction(fn, null, {timeout: ms, polling: 500}).then(() => console.log('ok  ', what), () => { throw new Error('never saw: ' + what); });
  await p.addInitScript(() => { try { localStorage.setItem('aw-welcome', JSON.stringify({mode: 'none', hints: []})); } catch {} });
  await p.goto('http://localhost:8765/studies/abbietown/index.html?play' + FLAGS, {timeout: 240000});
  await until(() => window.AbbieTown && window.AbbieTown.stage && window.AbbieTown.go, 'the town stage is up');
  await until(() => window.AbbieTown.medallions && window.AbbieTown.medallions.has('moon'), 'the rocket charm floats at the bakery curb');

  // the tap: fly to the charm, then click where its tap area is on screen
  await p.evaluate(() => window.AbbieTown.medallions.fly('moon'));
  await until(() => { const st = window.AbbieTown.stage; let hit = null; st.scene.traverse(o => { if (o.userData && o.userData.medallion === 'moon' && o.name === 'start tap area') hit = o; }); return hit && hit.getWorldPosition(new st.THREE.Vector3()).distanceTo(st.camera.position) < 400; }, 'the camera has flown in to the charm');
  const where = () => p.evaluate(() => {
    const st = window.AbbieTown.stage; let hit = null;
    st.scene.traverse(o => { if (o.userData && o.userData.medallion === 'moon' && o.name === 'start tap area') hit = o; });
    if (!hit) return null;
    const v = hit.getWorldPosition(new st.THREE.Vector3()).project(st.camera), r = st.renderer.domElement.getBoundingClientRect();
    return {x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, front: v.z < 1};
  });
  // the fly-in is eased and slow under software GL: wait until the charm has stopped moving on screen and sits inside the view
  let xy = null, last = null;
  for (let i = 0; i < 90; i++) {
    xy = await where(); await p.waitForTimeout(1000);
    if (xy && xy.front && xy.x > 40 && xy.x < 1240 && xy.y > 40 && xy.y < 680 && last && Math.hypot(xy.x - last.x, xy.y - last.y) < 2) break;
    last = xy;
  }
  if (!xy || !xy.front) throw new Error('the rocket charm has no tap area on screen');
  console.log('ok   the charm is on screen at', Math.round(xy.x), Math.round(xy.y));
  await p.mouse.click(xy.x, xy.y);
  await until(() => window.moonMission && window.moonMission.view().beat === 'truck', 'tapping the charm starts the mission at the black truck');
  await shot('moon-truck');

  // a bot family plays every beat through the real HUD; one screenshot for each new zone
  await p.evaluate(() => { window.__log = null; window.moonMission.autoplay({ticksPerFrame: 150}).then(l => { window.__log = l; }); });
  const seen = new Set(['main-street']); const t0 = Date.now();
  while (!(await p.evaluate(() => !!window.__log))) {
    if (Date.now() - t0 > 20 * 60 * 1000) throw new Error('the mission did not finish in 20 minutes');
    const v = await p.evaluate(() => { const x = window.moonMission.view(); return {zone: x.zone, beat: x.beat}; });
    if (v.zone && !seen.has(v.zone)) { seen.add(v.zone); await shot('moon-' + v.zone); console.log('ok   zone', v.zone, '(' + v.beat + ')'); }
    await p.waitForTimeout(1500);
  }
  const r = await p.evaluate(() => { const L = window.__log, S = window.moonMission.m.state; return {games: L.filter(e => e.fx === 'game-done').map(e => e.game), end: L.filter(e => e.fx === 'end').map(e => e.id), zones: [...new Set(L.filter(e => e.fx === 'zone').map(e => e.id))], items: S.items.map(i => i.id), polaroid: L.some(e => e.fx === 'polaroid')}; });
  console.log(JSON.stringify(r));
  const need = (ok, what) => { if (!ok) throw new Error('missing: ' + what); console.log('ok  ', what); };
  need(JSON.stringify(r.games) === JSON.stringify(['flight', 'cows', 'landing']), 'the three launch consoles are played: ' + r.games.join(', '));
  need(r.end.includes('chapter-1'), 'Chapter 1 ends');
  need(r.polaroid && r.items.includes('moon-polaroid'), 'the Moon Polaroid');
  for (const id of ['suit-abbie', 'suit-ani', 'snack-packs', 'old-radio']) need(r.items.includes(id), 'item ' + id);
  for (const z of ['galley', 'briefing-room', 'capsule', 'orbit', 'lunar-descent', 'moon-base-pad']) need(r.zones.includes(z) || seen.has(z), 'zone ' + z); // main-street is proven by the truck beat above
  // the canvas is drawing the world, not a blank frame
  const lit = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 36; const g = c.getContext('2d'); const src = window.AbbieTown.stage.renderer.domElement; window.AbbieTown.stage.renderer.render(window.AbbieTown.stage.scene, window.AbbieTown.stage.camera); g.drawImage(src, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s > 0; });
  need(lit, 'the world is drawn');
  await shot('moon-end');
  if (errs.length) throw new Error('page errors: ' + errs.join(' | '));
  await b.close();
  console.log('GAME-TEST PASS moon-mission');
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
