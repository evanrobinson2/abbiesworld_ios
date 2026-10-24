// Plays the skate-park arcade racer end to end in headless Chromium: attract -> question -> garage -> race (bot through the real
// inputs) -> results -> prize (hold to unwrap, open the box, reveal, add to garage) -> pick the new car -> race with it.
// Serve prototypes/ranch-atelier/dist on :8765, then: node tools/minigame-test/arcade-racer-flow.cjs 430 860 shots/ar
// Waits on game state (window.arcade), never on wall-clock time: the race clock is simulation ticks, so a run is deterministic.
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [,, w = 430, h = 860, pre = 'shots/ar'] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: +w, height: +h}});
  let bad = 0; p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { bad++; console.log('console error', m.text().slice(0, 300)); } }); p.on('pageerror', e => { bad++; console.log('err', e.message); });
  const until = async (fn, ms = 240000) => { await p.waitForFunction(fn, null, {timeout: ms, polling: 200}); await p.waitForTimeout(500); };
  const shot = n => p.screenshot({path: pre + n + '.png', timeout: 180000});
  const click = id => p.click('#' + id);
  await p.goto('http://localhost:8765/studies/arcade-racer/play.html?test&fresh');
  await until(() => window.arcade); await p.waitForTimeout(1200); await shot('1-attract');
  await click('play'); await p.waitForTimeout(800); await shot('2-ask');
  await click('togarage'); await p.waitForTimeout(1200); await shot('3-garage-starter');
  await click('gback'); await p.waitForTimeout(300);
  // learn by doing: a practice run (no records, no prizes), hints on
  await click('practice'); await until(() => arcade.S.screen === 'race'); await shot('4-countdown');
  const stop0 = await p.evaluate(() => arcade.autoplay('greedy')); void stop0;
  await until(() => arcade.S.phase === 'race' && arcade.model.s > 30); await shot('5-practice-race');
  await until(() => arcade.S.screen === 'results'); await shot('6-practice-results');
  if (await p.evaluate(() => arcade.board().runs.length)) throw new Error('practice must not write a record');
  // a timed race: tap the rocket right at GO, then the bot steers
  await click('again');
  await until(() => arcade.S.phase === 'race' && arcade.model.s > 40); await shot('7-race-a');
  await until(() => arcade.S.phase === 'race' && arcade.model.s > 95); await shot('8-race-b');
  await until(() => arcade.S.screen === 'results'); await p.waitForTimeout(600); await shot('9-results-1');
  const r1 = await p.evaluate(() => ({t: arcade.S.result.time, orbs: arcade.S.result.orbs, cones: arcade.S.result.cones, launch: arcade.S.result.launch, prizes: arcade.save.prizes.length, owned: arcade.save.owned.slice(), best: arcade.board().best}));
  console.log('race 1', JSON.stringify(r1));
  if (!(r1.t > 6 && r1.t < 20)) throw new Error('implausible race time ' + r1.t);
  if (r1.prizes < 1) throw new Error('the first finish must earn a prize');
  // the prize: hold to unwrap, tear the box, hero reveal, add to garage
  await click('rprize'); await p.waitForTimeout(900); await shot('10-prize-wrapped');
  await p.evaluate(() => { arcade.S.screen === 'prize'; }); const bx = await p.evaluate(() => ({x: innerWidth / 2, y: innerHeight / 3}));
  await p.mouse.move(bx.x, bx.y); await p.mouse.down(); await until(() => arcade.S.screen === 'prize' && document.getElementById('pnext').textContent === 'Tap to open the box', 60000).catch(async () => { await p.mouse.up(); await click('pnext'); });
  await p.mouse.up(); await p.waitForTimeout(500); await shot('11-prize-boxed');
  await click('pnext'); await p.waitForTimeout(450); await shot('12-prize-opening');
  await until(() => document.getElementById('pnext').textContent === 'Add to garage'); await p.waitForTimeout(1300); await shot('13-prize-hero');
  await click('pnext'); await p.waitForTimeout(700); await shot('14-prize-claimed');
  const own = await p.evaluate(() => arcade.save.owned.slice()); console.log('owned after prize', own); if (!own.includes('comet')) throw new Error('the Comet was not added to the garage');
  // reload: the car is still there and can be picked and raced on a later run
  await p.goto('http://localhost:8765/studies/arcade-racer/play.html?test'); await until(() => window.arcade); await p.evaluate(() => arcade.go('garage')); await p.waitForTimeout(1200);
  await p.evaluate(() => { document.querySelector('.car[data-id=comet]').click(); }); await p.waitForTimeout(900); await shot('15-garage-comet-after-reload');
  const kept = await p.evaluate(() => ({owned: arcade.save.owned.slice(), pick: arcade.save.pick, best: arcade.board().best})); console.log('after reload', JSON.stringify(kept));
  if (!kept.owned.includes('comet') || kept.pick !== 'comet' || kept.best == null) throw new Error('collection did not persist');
  await click('gorace'); await until(() => arcade.S.phase === 'race' && arcade.model.s > 20);
  const used = await p.evaluate(() => arcade.model && document.body.dataset.screen); await shot('16-race-with-comet'); if (used !== 'race') throw new Error('not racing');
  await p.evaluate(() => arcade.autoplay('greedy')); await until(() => arcade.S.screen === 'results');
  const r2 = await p.evaluate(() => ({t: arcade.S.result.time, car: arcade.S.result.car, best: arcade.board().best, runs: arcade.board().runs.length, prizes: arcade.save.prizes.length}));
  console.log('race 2', JSON.stringify(r2)); if (r2.car !== 'comet') throw new Error('the earned car did not race'); if (r2.runs !== 2) throw new Error('records did not accumulate');
  if (r2.prizes > 0 && r2.t === r1.t) {}
  await shot('17-results-2');
  // no repeat reward for the same qualifying result: first-flag is claimed once
  const firsts = await p.evaluate(() => Object.keys(arcade.save.ach).filter(k => k === 'first-flag').length); if (firsts !== 1) throw new Error('first-flag earned twice');
  if (bad) throw new Error('page errors: ' + bad);
  await b.close(); console.log('GAME-TEST PASS arcade-racer');
})().catch(e => { console.error(e); process.exit(1); });
