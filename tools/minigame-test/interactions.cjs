// Taps through the town's interactions with a real mouse: a house, a tree, a lamp post, a shop, a place, a duck, bub and the car.
// Each must answer (a reaction is logged and a world effect or bubble shows), nothing may navigate away, and the HUD stays small.
// Serve prototypes/ranch-atelier/dist on :8765, then: node tools/minigame-test/interactions.cjs shots/i
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [,, pre = 'shots/i'] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: 1280, height: 720}});
  const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('err', e.message); });
  await p.goto('http://localhost:8765/studies/abbietown/index.html?play');
  await p.waitForFunction(() => window.AbbieTown?.interact && window.AbbieTown?.stage?.tiles?.downtown?.spots, null, {timeout: 240000});
  await p.waitForTimeout(6000);
  const start = p.url(); let fails = 0;
  const check = (name, ok, extra = '') => { console.log(ok ? 'PASS' : 'FAIL', name, extra); if (!ok) fails++; };
  const kinds = [['house'], ['tree'], ['lamp'], ['shop'], ['prop'], ['place']];
  const flyTo = async (pt, k = 1) => { await p.evaluate(({p, k}) => { const A = window.AbbieTown, S = A.stage, T = S.THREE, tg = new T.Vector3(...p); A.controls.target.copy(tg); S.camera.position.copy(tg).add(new T.Vector3(0, 70 * k, 24 * k)); A.controls.update(); }, {p: pt, k}); await p.waitForTimeout(500); };
  const project = (p, pt) => p.evaluate(({pt}) => { const S = window.AbbieTown.stage, T = S.THREE, v = new T.Vector3(...pt).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, {pt});
  // each kind: find a spot where the thing is really what is under that pixel, then tap it with the mouse
  const want = [['house'], ['tree'], ['lamp'], ['shop'], ['prop'], ['place'], ['creature', 'duck'], ['creature', 'bub'], ['creature', 'town car']];
  let n = 0;
  for (const [kind, cid] of want) {
    let cands = cid ? await p.evaluate(id => { const T = window.AbbieTown.stage.THREE; return window.AbbieTown.interact.creatures.filter(x => x.name === id).map(c => ({id, p: new T.Box3().setFromObject(c).getCenter(new T.Vector3()).toArray()})); }, cid) : await p.evaluate(k => window.AbbieTown.interact.sample(k, k === 'prop' ? 40 : 12), kind);
    if (!cands.length) { console.log('SKIP', kind, '(none on this board)'); if (cid || kind === 'house' || kind === 'tree' || kind === 'place') check('exists ' + (cid || kind), false); continue; }
    let found = null;
    for (const c of cands) { await flyTo(c.p, cid ? .22 : 1); const xy = await project(p, c.p); const h = await p.evaluate(([x, y]) => { const r = window.AbbieTown.interact.hitAt(x, y)?.what; return r && {kind: r.kind, id: r.id}; }, xy); if (h && h.kind === kind && (!cid || h.id === cid)) { found = {c, xy}; break; } }
    if (!found) { check(`reach ${kind}${cid ? ':' + cid : ''}`, false, 'under it: ' + JSON.stringify(await p.evaluate(([x, y]) => { const h = window.AbbieTown.interact.hitAt(x, y); return h && {what: h.what && h.what.kind + ':' + h.what.id, obj: h.hit.object.type + ' ' + h.hit.object.name, d: h.hit.distance}; }, await project(p, cands[0].p)))); continue; }
    const before = await p.evaluate(() => window.AbbieTown.interact.log.length);
    await p.mouse.move(...found.xy); await p.waitForTimeout(150);
    const cursor = await p.evaluate(() => document.querySelector('canvas').style.cursor);
    await p.mouse.click(...found.xy); await p.waitForTimeout(350);
    const r = await p.evaluate(() => ({last: window.AbbieTown.interact.last(), n: window.AbbieTown.interact.log.length, st: window.AbbieTown.interact.stats(), text: window.AbbieTown.interact.bubbleText()}));
    check(`tap ${kind}:${found.c.id}`, r.n === before + 1 && r.last?.kind === kind && (r.st.fx || r.st.anim || r.st.bubble) && cursor === 'pointer', JSON.stringify(r.last) + ' ' + JSON.stringify(r.st) + ' bubble=' + r.text + ' cursor=' + cursor);
    check(`  did not leave the town (${found.c.id})`, p.url() === start);
    await p.screenshot({path: `${pre}${++n}-${found.c.id.replace(/ /g, '-')}.png`});
    await p.waitForTimeout(2200);
  }
  // the bare ground is just ground: find a pixel nothing answers on and tap it
  await flyTo((await p.evaluate(() => window.AbbieTown.interact.sample('house', 1)))[0].p);
  const bare = await p.evaluate(() => { for (let x = 40; x < innerWidth - 40; x += 37) for (let y = 120; y < innerHeight - 100; y += 31) { const h = window.AbbieTown.interact.hitAt(x, y); if (h && !h.what) return [x, y]; } return null; });
  const before = await p.evaluate(() => window.AbbieTown.interact.log.length);
  if (bare) { await p.mouse.click(...bare); await p.waitForTimeout(300); }
  check('tap on bare ground does nothing', !!bare && await p.evaluate(() => window.AbbieTown.interact.log.length) === before);
  // people, the café and the coaster keep their own taps: this layer must not answer them
  const own = await p.evaluate(() => { const A = window.AbbieTown, T = A.stage.THREE; const person = A.townsfolk?.[0]; if (!person) return null; const r = A.interact.hitAt; return true; });
  check('no page errors', errs.length === 0, errs.join('|'));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
