// Plays the school jump through its beats in headless Chromium and saves one screenshot per beat, same cameras each run.
// Serve prototypes/ranch-atelier/dist on :8765, then: node tools/minigame-test/school-flow.cjs 390 844 shots/p
// Waits on game state (window.schoolJump), never on wall-clock time: software WebGL runs slower than real time.
// ?test silences the voices. The climb is played by tapping holds the way a player would, through the game's own rules.
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [,, w = 1280, h = 720, pre = 'shots/d', page = 'studies/school/play.html'] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
  const p = await b.newPage({viewport: {width: +w, height: +h}});
  p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); }); p.on('pageerror', e => console.log('err', e.message));
  const until = async (fn, ms = 120000) => { await p.waitForFunction(fn, null, {timeout: ms, polling: 250}); await p.waitForTimeout(900); };
  const shot = n => p.screenshot({path: pre + n + '.png', timeout: 180000});
  const log = async label => console.log(label, JSON.stringify(await p.evaluate(() => ({mode: schoolJump.S.mode, hands: schoolJump.S.hands.map(h => h?.id || null), stam: +schoolJump.S.stam.toFixed(2)}))));
  await p.goto('http://localhost:8765/' + page + (page.includes('?') ? '&' : '?') + 'test');
  await until(() => window.schoolJump); await p.waitForTimeout(2500); await shot('0-title');
  await p.evaluate(() => schoolJump.start()); await until(() => schoolJump.S.mode === 'toss'); await shot('1-toss');
  await p.evaluate(() => schoolJump.wallThrow(.44)); await p.waitForTimeout(2500); await shot('1b-thrown');
  await p.evaluate(() => schoolJump.startClimb(schoolJump.CLIMB1)); await until(() => schoolJump.S.mode === 'climb');
  await shot('2-climb-start');
  // climb by tapping holds the way a player would; the game picks the hand
  // a player taps what shines; here: always the hold the nudge ring sits on (the best one up)
  const climbTo = async y => { for (let i = 0; i < 30; i++) {
    const r = await p.evaluate(y => { const S = schoolJump.S; if (S.mode !== 'climb') return 'mode:' + S.mode; const hs = S.hands.filter(Boolean); if (hs.length && Math.max(...hs.map(h => h.y)) >= y) return 'there'; const h = schoolJump.bestUp(); if (!h) return 'stuck'; schoolJump.tapHold(h); return h.id; }, y);
    console.log('tap', r); if (r === 'there' || r === 'stuck' || r.startsWith('mode:')) return r; await p.waitForTimeout(350); } };
  await climbTo(5); await p.waitForTimeout(1500); await log('high'); await shot('3-climb-high');
  await climbTo(99);
  await until(() => schoolJump.S.mode === 'roof'); await shot('4-roof');
  await p.evaluate(() => { schoolJump.S.freezeSeen = true; schoolJump.S.seen = 1.9; }); await p.waitForTimeout(600); await shot('5-caught');
  // busted: a grown-up's flashlight from the sidewalk, then you slide back to your last cover
  await p.evaluate(() => { const S = schoolJump.S; S.freezeSeen = false; S.cover = {at: schoolJump.kid.position.clone().add({x: 1.5, y: 0, z: 1}), lvl: S.lvl}; schoolJump.busted(); });
  await p.waitForTimeout(700); await shot('6-busted'); await until(() => schoolJump.S.mode === 'roof'); await log('after bust');
  // the hang drop's timing ring
  await p.evaluate(() => { for (const b of schoolJump.balls) if (b.state !== 'yard') b.state = 'yard'; schoolJump.startHang(); }); await until(() => !schoolJump.S.tween); await p.waitForTimeout(1500); await shot('7-hang');
  await b.close();
})();
