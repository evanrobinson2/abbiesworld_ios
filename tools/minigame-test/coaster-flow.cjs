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
  await shot('3-toybox-closed'); await p.evaluate(() => coaster.openBox()); await until(() => !coaster.S.box || coaster.toyBox.userData.open >= 1); await p.waitForTimeout(2500); await shot('3a-toybox-open');
  await p.evaluate(() => coaster.choose(coaster.cars.find(c => c.userData.def.id === 'cart'))); await p.waitForTimeout(2500);
  await shot('3b-cart');
  await p.evaluate(() => coaster.repaint('#ff5d8f')); await p.waitForTimeout(500);
  // the Toy car charm unlocks the fire-wheels card on the garage floor; turn it on for the ride
  await p.evaluate(() => { coaster.BP.earnCharm('toy-car'); coaster.FW.setFireWheels(true); }); await p.waitForTimeout(600); await shot('3c-fire-card');
  await p.evaluate(() => coaster.getIn()); await p.waitForTimeout(1000); await shot('4-dive');
  await until(() => coaster.S.started); await shot('5-start');
  // ride: jump to each feature (the ride clock is the game's own), steer to the next star
  for (const [n, t] of [['6-drop', 1.8], ['7-loop', 6.4], ['8a-tennis-ball', 8.95], ['8-hills', 11.5], ['8b-strip', 'strip'], ['9-corkscrew', 16], ['10-jump', null], ['11-spiral', 24], ['12-finish', 28.4]]) {
    if (t === 'strip') { await p.evaluate(() => coaster.skipTo(12)); await p.mouse.click(640, 400); await p.waitForTimeout(1200); await shot(n); continue; }
    if (t === null) { await p.evaluate(() => coaster.skipTo(coaster.JUMP.t0 - .1)); await until(() => coaster.S.time > coaster.JUMP.mid); await shot(n); continue; }
    if (n === '8a-tennis-ball') { await p.evaluate(t => coaster.skipTo(t), t); await until(() => coaster.S.time > 9.12 && coaster.S.ts < .4, 120000); await shot(n); continue; }
    await p.evaluate(t => { coaster.skipTo(t); }, t); await p.waitForTimeout(900); await shot(n);
  }
  await until(() => coaster.S.mode === 'end'); await p.waitForTimeout(2500); await shot('13-end');
  // the strip's controls drive the ride's world: night, then rain
  await p.click('#v2-chrono .ch-dial').catch(() => {}); await p.waitForTimeout(800); await shot('14-strip-open');
  await p.evaluate(() => { const b = id => document.getElementById(id)?.click(); b('scene-clock-control'); b('scene-clock-control'); b('scene-weather-control'); b('scene-weather-control'); }); await p.waitForTimeout(4000); await shot('15-night-rain');
  // ride again: the run is on the scoreboard and the garage comes back
  await p.click('#again'); await until(() => coaster.S.mode === 'zoom'); await p.waitForTimeout(2500); await shot('16-again');
  console.log(JSON.stringify(await p.evaluate(() => ({board: coaster.SB.rows().length, score: coaster.SC.total}))));
  const fin = await p.evaluate(() => ({mode: coaster.S.mode})); if (fin.mode !== 'end') throw new Error('the ride did not reach its finish: ' + fin.mode);
  console.log(JSON.stringify(await p.evaluate(() => ({score: coaster.SC.total, medal: coaster.SC.medal(), stars: coaster.S.stars, mode: coaster.S.mode, won: coaster.S.won, car: coaster.car.userData.def.id, photo: !!coaster.S.photo}))));
  await b.close(); console.log('GAME-TEST PASS coaster');
})();
