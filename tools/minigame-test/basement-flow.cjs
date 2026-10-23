// Plays Grace's basement end to end in headless Chromium (desktop or phone size) and saves a screenshot per beat.
// Serve prototypes/ranch-atelier/dist on :8765, then: node tools/minigame-test/basement-flow.cjs 390 844 shots/p
// Waits on game state (window.basement), never on wall-clock time: software WebGL runs the game slower than real time.
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [,, w = 1280, h = 720, pre = 'r2/e'] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
  const p = await b.newPage({viewport: {width: +w, height: +h}});
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.text()); }); p.on('pageerror', e => console.log('err', e.message));
  const until = async (fn, ms = 240000) => { await p.waitForFunction(fn, null, {timeout: ms, polling: 250}); await p.waitForTimeout(1200); };
  const shot = n => p.screenshot({path: pre + n + '.png'});
  await p.goto('http://localhost:8765/studies/basement/play.html?noboot');
  await p.waitForTimeout(3500); await shot('0');
  await p.click('.choice >> nth=0'); await until(() => basement.cam.mode === 'close'); await shot('1');
  await p.evaluate(() => basement.flipToggle(1)); await p.waitForTimeout(1500); await shot('2');
  await p.evaluate(() => { basement.flipToggle(1); basement.flipToggle(0); basement.flipToggle(2); }); await until(() => basement.cam.mode === 'side'); await shot('3');
  await p.evaluate(() => basement.plugIn()); await until(() => basement.chores.plug); await shot('4');
  await p.evaluate(() => basement.walkTo(4.4, () => basement.closeUp('clipboard'))); await until(() => basement.cam.mode === 'close'); await shot('5');
  await p.evaluate(() => basement.leaveClose()); await p.waitForTimeout(1000);
  await p.evaluate(() => basement.startWash()); await until(() => basement.cam.mode === 'close'); await shot('6');
  await p.evaluate(() => { for (let k = 0; k < 2; k++) for (let y = .05; y < 1; y += .06) for (let x = .05; x < 1; x += .06) basement.scrub({x, y}); }); await p.waitForTimeout(800); await shot('7');
  await p.evaluate(() => { for (let k = 0; k < 2; k++) for (let y = .05; y < 1; y += .06) for (let x = .05; x < 1; x += .06) basement.scrub({x, y}); });
  await until(() => basement.cam.mode === 'side');
  await p.evaluate(() => basement.powerSwitch()); await until(() => basement.chores.power);
  await p.evaluate(() => basement.sitDown()); await until(() => basement.cam.mode === 'screen' || basement.cam.mode === 'desk'); await shot('8');
  await p.waitForTimeout(15000); await shot('9');
  await p.evaluate(() => basement.glide('desk', 'desk')); await until(() => basement.cam.mode === 'desk');
  await p.evaluate(() => basement.insertDisk(basement.U.disks.find(d => d.userData.disk.id === 'coin'))); await until(() => basement.cam.mode === 'screen');
  for (const k of ['A', ':', 'Enter']) await p.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', {key: k})), k);
  await p.waitForTimeout(3000);
  for (const k of ['G', 'O', 'Enter']) await p.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', {key: k})), k);
  await p.waitForTimeout(9000); await shot('10');
  console.log(JSON.stringify(await p.evaluate(() => ({chores: basement.chores, text: basement.pc.text.map(r => r.join('').trimEnd()).filter(Boolean).slice(-6), coins: localStorage.getItem('aw-basement-coins')}))));
  await b.close();
})();
