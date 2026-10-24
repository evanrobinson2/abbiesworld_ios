// The whole route a player takes into Grace's basement and back, in headless Chromium (AW-STUDY-0024 / 0013):
// café diorama (arrive from the town), the register's brass key, the old door, the basement (chores, the gold disk), the
// ending ("Coming, Daddy!"), back up into the café, and out the front door to the town.
// Serve prototypes/ranch-atelier/dist on :8765, then: node tools/minigame-test/route-cafe-basement.cjs shots/route
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [,, pre = 'route'] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
  const ctx = await b.newContext({viewport: {width: 1280, height: 720}}), p = await ctx.newPage();
  p.on('pageerror', e => console.log('err', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)); });
  const until = async (fn, ms = 300000) => { await p.waitForFunction(fn, null, {timeout: ms, polling: 250}); await p.waitForTimeout(800); };
  const shot = n => p.screenshot({path: `${pre}-${n}.png`});
  const where = () => p.evaluate(() => location.pathname + location.search);
  const step = async (name, fn) => { try { await fn(); console.log('ok  ', name, await where()); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); await shot('fail-' + name).catch(() => {}); await b.close(); process.exit(1); } };

  await step('café, arriving from the town', async () => {
    await p.goto('http://localhost:8765/studies/cafe/diorama.html?from=town'); await until(() => window.__cafe && !window.__cafe.busy); await shot('1-cafe');
  });
  await step('the register gives the brass key', async () => {
    await p.evaluate(() => window.__cafe.registerBeat()); await until(() => JSON.parse(localStorage.getItem('aw-inventory') || '[]').some(i => i.id === 'cafe-basement-key')); await shot('2-key');
  });
  await step('the old door opens onto the stairs down', async () => {
    await until(() => !window.__cafe.busy);
    await p.evaluate(() => window.__cafe.doorBeat());
    await p.getByText('Go down').waitFor({timeout: 120000}); await shot('3-door');
    await p.getByText('Go down').click();
  });
  await step('the basement (from the café)', async () => {
    await p.waitForURL(/studies\/basement\/play\.html\?from=cafe/, {timeout: 120000}); await until(() => window.basement && window.basement.time > 4);
    await p.evaluate(() => { localStorage.setItem('aw-basement-skip', '1'); }); await shot('4-basement');
  });
  await step('lights, chores, power, gold disk', async () => {
    await p.click('.aw-choice >> nth=0'); await until(() => basement.cam.mode === 'close');
    await p.evaluate(() => basement.flipToggle(1)); await p.waitForTimeout(1500);
    await p.evaluate(() => { basement.flipToggle(1); basement.flipToggle(0); basement.flipToggle(2); }); await until(() => basement.cam.mode === 'side');
    await p.evaluate(() => basement.plugIn()); await until(() => basement.chores.plug);
    await p.evaluate(() => basement.startWash()); await until(() => basement.cam.mode === 'close');
    for (let k = 0; k < 4; k++) await p.evaluate(() => { for (let y = .05; y < 1; y += .06) for (let x = .05; x < 1; x += .06) basement.scrub({x, y}); });
    await until(() => basement.cam.mode === 'side'); await p.evaluate(() => basement.powerSwitch()); await until(() => basement.chores.power);
    await p.evaluate(() => basement.sitDown()); await until(() => ['screen', 'desk'].includes(basement.cam.mode));
    await p.waitForTimeout(15000); await p.evaluate(() => basement.glide('desk', 'desk')); await until(() => basement.cam.mode === 'desk');
    await p.evaluate(() => basement.insertDisk(basement.U.disks.find(d => d.userData.disk.id === 'keystorm'))); await until(() => basement.cam.mode === 'screen');
    for (const k of ['A', ':', 'Enter']) await p.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', {key: k})), k);
    await p.waitForTimeout(3000);
    for (const k of ['G', 'O', 'Enter']) await p.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', {key: k})), k);
  // The word game: put 110 of the 120 seconds in already, then play a little (any keys; the title wants one first).
  await p.waitForTimeout(3000); await p.evaluate(() => basement.playGame(110));
  for (let i = 0; i < 200 && !(await p.evaluate(() => basement.ending.pending || basement.ending.called)); i++) { await p.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', {key: k})), 'ASDFJKL'[i % 7]); await p.waitForTimeout(400); }
  });
  await step('the ending: Daddy calls', async () => {
    await until(() => basement.ending.called && document.querySelector('.aw-choice')); await shot('5-ending'); await p.getByText('Coming, Daddy!').click();
  });
  await step('back up into the café', async () => {
    await p.waitForURL(/studies\/cafe\/diorama\.html\?from=basement/, {timeout: 300000}); await until(() => window.__cafe && !window.__cafe.busy); await shot('6-back-in-cafe');
  });
  await step('out the front door to the town', async () => {
    await p.evaluate(() => window.__cafe.exitBeat()); await p.waitForURL(/\/town/, {timeout: 120000}); await shot('7-town');
  });
  console.log('ROUTE OK'); await b.close();
})();
