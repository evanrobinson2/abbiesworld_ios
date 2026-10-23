// Plays the toy-car coaster through its beats in headless Chromium and saves a screenshot per beat.
// Serve prototypes/ranch-atelier/dist on :8765, then: node tools/minigame-test/coaster-flow.cjs 1280 720 shots/c
// Waits on game state (window.coaster), never on wall-clock time: software WebGL runs slower than real time.
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [,, w = 1280, h = 720, pre = 'shots/c', page = 'studies/coaster/play.html'] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: +w, height: +h}});
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text().slice(0, 300)); }); p.on('pageerror', e => console.log('err', e.message));
  const until = async (fn, ms = 240000) => { await p.waitForFunction(fn, null, {timeout: ms, polling: 250}); await p.waitForTimeout(600); };
  const shot = n => p.screenshot({path: pre + n + '.png', timeout: 180000});
  await p.goto('http://localhost:8765/' + page + '?test');
  await until(() => window.coaster); await p.waitForTimeout(1500); await shot('0-tile');
  await p.evaluate(() => coaster.start()); await p.waitForTimeout(1800); await shot('1-flow-a');
  await until(() => coaster.S.mode === 'zoom'); await p.waitForTimeout(1500); await shot('2-flow-b');
  await until(() => coaster.S.ready); await shot('3-zoom-tiltshift');
  await p.evaluate(() => { const c = coaster.cam; Object.assign(c, {tx: 10, ty: 1, tz: 6, dist: 16, az: 10, pitch: 16}); }); await p.waitForTimeout(900); await shot('3a-garage');
  await p.evaluate(() => coaster.choose(coaster.cars.find(c => c.userData.def.id === 'cart'))); await p.waitForTimeout(2500);
  await p.evaluate(() => { Object.assign(coaster.cam, {tx: 0, ty: 17, tz: -2, dist: 9, az: 40, pitch: 18}); }); await p.waitForTimeout(900); await shot('3b-cart');
  await p.evaluate(() => coaster.repaint('#ff5d8f')); await p.waitForTimeout(500);
  await p.evaluate(() => coaster.getIn()); await p.waitForTimeout(1000); await shot('4-dive');
  await until(() => coaster.S.started); await shot('5-start');
  // ride: jump to each feature (the ride clock is the game's own), steer to the next star
  for (const [n, t] of [['6-drop', 1.8], ['7-loop', 6.4], ['8a-tennis-ball', 8.95], ['8-hills', 11.5], ['9-corkscrew', 16], ['10-jump', null], ['11-spiral', 24], ['12-finish', 28.4]]) {
    if (t === null) { await p.evaluate(() => coaster.skipTo(coaster.JUMP.t0 - .1)); await until(() => coaster.S.time > coaster.JUMP.mid); await shot(n); continue; }
    if (n === '8a-tennis-ball') { await p.evaluate(t => coaster.skipTo(t), t); await until(() => coaster.S.time > 9.12 && coaster.S.ts < .4, 120000); await shot(n); continue; }
    await p.evaluate(t => { coaster.skipTo(t); }, t); await p.waitForTimeout(900); await shot(n);
  }
  await until(() => coaster.S.mode === 'end'); await p.waitForTimeout(2500); await shot('13-end');
  console.log(JSON.stringify(await p.evaluate(() => ({stars: coaster.S.stars, mode: coaster.S.mode, won: coaster.S.won, car: coaster.car.userData.def.id, photo: !!coaster.S.photo}))));
  await b.close();
})();
