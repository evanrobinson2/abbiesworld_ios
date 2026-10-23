// Plays Abbie's science adventure (studies/cell/play.html) through its beats in headless Chromium, one screenshot per
// beat. Serve prototypes/ranch-atelier/dist on :8765, then: node tools/minigame-test/cell-flow.cjs 390 844 shots/p
// Waits on game state (window.__cell), never on wall-clock time. Player one swims by holding the pointer; a second
// player drops in on the keyboard (W A S D), the way a sibling would grab a seat.
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [,, w = 390, h = 844, pre = 'shots/p'] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
  const p = await b.newPage({viewport: {width: +w, height: +h}});
  p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); }); p.on('pageerror', e => console.log('err', e.message));
  const until = async (fn, ms = 60000) => { await p.waitForFunction(fn, null, {timeout: ms, polling: 250}); await p.waitForTimeout(500); };
  const shot = n => p.screenshot({path: pre + n + '.png', timeout: 120000});
  const state = async l => console.log(l, JSON.stringify(await p.evaluate(() => __cell.players.filter(Boolean).map(P => ({s: P.slot, bot: P.bot, L: P.level, e: P.eaten, st: P.stage, dmg: Math.round(P.dmg), hand: P.hand.length})))));
  await p.goto('http://localhost:8765/studies/cell/play.html');
  await until(() => window.__cell); await p.waitForTimeout(1200); await shot('0-lab');
  const bk = await p.evaluate(() => { const r = document.querySelector('.beaker[data-level="3"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await p.mouse.click(bk[0], bk[1]); await p.waitForTimeout(900); await shot('1-lens');
  await until(() => document.querySelector('#maker.on')); await p.waitForTimeout(600); await shot('2-maker-a');
  await p.evaluate(() => { const r = n => document.querySelector(`#maker [data-row=${n}]`); r('colour').children[4].dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); r('eyes').children[2].dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); r('mouth').children[1].dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); r('move').children[1].dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); }); await p.waitForTimeout(700); await shot('2-maker-b');
  await p.evaluate(() => document.querySelector('#maker .go').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))); await until(() => __cell.players[0]?.c); await p.waitForTimeout(1500); await shot('3-start');
  await p.evaluate(() => document.querySelector('#back').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))); await p.waitForTimeout(500); await shot('3b-paused'); console.log('paused', await p.evaluate(() => document.querySelector('#pausem').classList.contains('on')));
  await p.evaluate(() => document.querySelector('#pausem [data-act=resume]').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))); await p.waitForTimeout(300);
  for (let i = 0; i < 12; i++) {
    const t = await p.evaluate(() => { const P = __cell.players[0].c; if (!P || P.dead) return null; let best = null, bd = 1e9; for (const f of __cell.food) if (f.type === 'plant') { const d = Math.hypot(f.x - P.x, f.y - P.y); if (d < bd) { bd = d; best = f; } } if (!best) return null; const r = best.g.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    if (t) { await p.mouse.move(t[0], t[1]); await p.mouse.down(); await p.waitForTimeout(600); await p.mouse.up(); }
  }
  await state('swim'); await shot('4-swim');
  // cards: deal two and play one
  await p.evaluate(() => { __cell.draw1(__cell.players[0], 'bubble'); __cell.draw1(__cell.players[0], 'splash'); }); await p.waitForTimeout(1500); await shot('5-cards');
  await p.evaluate(() => __cell.playCard(__cell.players[0], 0)); await p.waitForTimeout(600); await shot('6-bubble');
  // a sibling drops in on the keyboard
  await p.keyboard.down('d'); await p.waitForTimeout(800); await p.keyboard.up('d'); await state('dropin');
  // grow: three steps, then evolution
  for (let i = 0; i < 3; i++) { await p.evaluate(() => __cell.levelUp(__cell.players[0])); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('#picker.on button')?.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))); await p.waitForTimeout(400); }
  await p.evaluate(() => { const P = __cell.players[1]; __cell.levelUp(P); __cell.levelUp(P); }); await p.waitForTimeout(1500);
  await state('grown'); await shot('7-grown');
  // hit player two hard: heat and knockback
  await p.evaluate(() => { const A = __cell.players[0].c, B = __cell.players[1].c; B.x = A.x + A.r + B.r - 2; B.y = A.y; __cell.players[1].dmg = 110; }); await p.waitForTimeout(1200); await shot('8-heat');
  await p.evaluate(() => __cell.levelUp(__cell.players[0])); await p.waitForTimeout(1200); await shot('9-evolving');
  await until(() => __cell.players[0].stage === 'bear', 30000); await p.waitForTimeout(1500); await shot('10-bear');
  await p.mouse.move(+w * .5, +h * .2); await p.mouse.down(); await p.waitForTimeout(2500); await p.mouse.up(); await shot('11-walk');
  await p.evaluate(() => { const c = __cell.players[0].c, E = __cell.exit; c.x = E.x * .93; c.y = E.y * .93; }); await p.waitForTimeout(1500); await shot('12-exit');
  await until(() => __cell.ended, 20000); await p.waitForTimeout(2500); await shot('13-off');
  await until(() => document.querySelector('#win.on'), 20000); await p.waitForTimeout(2500); await shot('14-win');
  await state('end');
  await b.close();
})();
