// Plays Abbie's science adventure (studies/cell/play.html) through its beats in headless Chromium, one screenshot per
// beat. Serve prototypes/ranch-atelier/dist on :8765, then: node tools/minigame-test/cell-flow.cjs 390 844 shots/p
// Waits on game state (window.__cell), never on wall-clock time. The player swims by holding the pointer, as a child would.
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [,, w = 390, h = 844, pre = 'shots/p'] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
  const p = await b.newPage({viewport: {width: +w, height: +h}, hasTouch: false});
  p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); }); p.on('pageerror', e => console.log('err', e.message));
  const until = async (fn, ms = 60000) => { await p.waitForFunction(fn, null, {timeout: ms, polling: 250}); await p.waitForTimeout(600); };
  const shot = n => p.screenshot({path: pre + n + '.png', timeout: 120000});
  const state = async l => console.log(l, JSON.stringify(await p.evaluate(() => ({level: __cell.level, eaten: __cell.eaten, cells: __cell.cells.length, food: __cell.food.length, parts: [...(__cell.player?.parts || [])], hp: __cell.player && +(__cell.player.hp / __cell.player.maxHp).toFixed(2)}))));
  await p.goto('http://localhost:8765/studies/cell/play.html');
  await until(() => window.__cell); await p.waitForTimeout(1500); await shot('0-lab');
  const bk = await p.evaluate(() => { const r = document.querySelector('#beaker').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await p.mouse.click(bk[0], bk[1]); await p.waitForTimeout(1000); await shot('1-lens');
  await until(() => document.querySelector('#picker.on')); await shot('2-mouth');
  await p.evaluate(() => __cell.pick('filter')); await until(() => __cell.player); await p.waitForTimeout(1500); await shot('3-start');
  // swim toward the nearest green food by holding the pointer there
  for (let i = 0; i < 40 && await p.evaluate(() => __cell.level === 0); i++) {
    const t = await p.evaluate(() => { const P = __cell.player; if (!P) return null; let best = null, bd = 1e9; for (const f of __cell.food) if (f.type === 'plant') { const d = Math.hypot(f.x - P.x, f.y - P.y); if (d < bd) { bd = d; best = f; } } if (!best) return null; const r = best.g.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    if (t) { await p.mouse.move(t[0], t[1]); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); }
    if (i === 3) await shot('4-swim');
  }
  await state('after swim');
  await until(() => __cell.level >= 1 && document.querySelector('#picker.on'), 20000).catch(async () => { await p.evaluate(() => __cell.levelUp()); await until(() => document.querySelector('#picker.on')); });
  await shot('5-picker');
  await p.evaluate(() => __cell.pick(document.querySelector('#picker button').dataset.part)); await p.waitForTimeout(800);
  for (const part of ['jaw', 'flagellum']) { await p.evaluate(() => __cell.levelUp()); await p.waitForTimeout(300); await p.evaluate(pt => __cell.pick(pt) || __cell.pick(document.querySelector('#picker button')?.dataset.part), part); await p.waitForTimeout(500); }
  await p.mouse.move(+w * .8, +h * .3); await p.mouse.down(); await p.waitForTimeout(1500); await p.mouse.up(); await state('grown'); await shot('6-grown');
  await p.evaluate(() => { __cell.levelUp(); }); await until(() => __cell.boss); await p.waitForTimeout(1200); await shot('7-boss-rising');
  await until(() => __cell.boss && !__cell.boss.ghost, 30000); await shot('8-boss');
  // a bite at the giant's last bit of strength: put it right in front of her jaw until it pops
  for (let i = 0; i < 120 && !(await p.evaluate(() => !!__cell.coin)); i++) {
    console.log('boss', JSON.stringify(await p.evaluate(() => { const B = __cell.boss, P = __cell.player; if (!B || !P || P.dead) return {B: !!B, P: !!P && !P.dead}; P.hp = P.maxHp; B.hp = Math.min(B.hp, .5); B.x = P.x + (P.r + B.r) * .95; B.y = P.y; P.heading = 0; return {hp: B.hp, cd: P.cd, dead: P.dead}; })));
    await p.waitForTimeout(250);
  }
  await until(() => __cell.coin, 20000); await shot('9-coin');
  await p.evaluate(() => { __cell.coin.x = __cell.player.x; __cell.coin.y = __cell.player.y; }); await p.waitForTimeout(1200); await shot('10-reward');
  await p.waitForTimeout(2500); await shot('11-memory');
  await b.close();
})();
