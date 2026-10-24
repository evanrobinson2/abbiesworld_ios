// The spotlight must never fail silently (Evan, 2026-10-24): takes a favour in the real town and checks the light comes on, an arrow points
// to it when it is off screen, and taking the object out of the backpack says the favour again and flies the camera there.
// Serve prototypes/ranch-atelier/dist on :8765, then: node tools/minigame-test/quest-guide-flow.cjs shots/q
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const [,, pre = 'shots/q'] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: 1000, height: 650}});
  // the recorded voices live in R2 (/r2/ is proxied by the site, not by this test server): answer with a short silent wav and record what plays
  const wav = Buffer.from('UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=', 'base64');
  await p.route('**/r2/voices/**', r => r.fulfill({status: 200, contentType: 'audio/wav', body: wav}));
  await p.addInitScript(() => { window.__played = []; const pl = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__played.push(this.src); return pl.call(this); }; window.speechSynthesis && (window.speechSynthesis.speak = () => { window.__browserVoice = true; }); });
  p.on('pageerror', e => console.log('err', e.message));
  await p.goto('http://localhost:8765/studies/abbietown/index.html?play');
  await p.waitForFunction(() => window.AbbieTown?.questGuide, null, {timeout: 120000}).catch(() => {});
  ok(await p.evaluate(() => !!window.AbbieTown.questGuide), 'the quest guide is mounted');
  await p.evaluate(async () => { const Q = await import('/simulations/quests.mjs?v=2'); Q.accept('bake-sugar'); });
  await p.waitForTimeout(2500);
  const s = await p.evaluate(() => window.AbbieTown.questGuide.status());
  ok(s.wanted.includes('common') && s.lit.includes('common') && !s.missing.length, 'the next place is lit: ' + JSON.stringify(s));
  // look somewhere else so the light is off screen: an arrow must show
  await p.evaluate(() => { const A = window.AbbieTown, c = A.controls; c.target.set(c.target.x + 4000, c.target.y, c.target.z); A.camera.position.x += 4000; c.update?.(); });
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !!document.querySelector('.aw-qg-arrow:not([hidden])')), 'an arrow points to the light when it is off screen');
  await p.screenshot({path: pre + '1-arrow.png', timeout: 120000});
  // take the sugar out of the backpack: say it again, fly there
  const before = await p.evaluate(() => window.AbbieTown.camera.position.toArray());
  await p.evaluate(async () => { const inv = (await import('/simulations/inventory.mjs')).inventory(); inv.add({id: 'quest-sugar', name: 'Bag of sugar', icon: '🍬'}); dispatchEvent(new CustomEvent('aw-inventory-use', {detail: {item: {id: 'quest-sugar'}}})); });
  await p.waitForTimeout(4000);
  ok(await p.evaluate(() => [...document.querySelectorAll('div')].some(d => /sugar/i.test(d.textContent) && d.style.position === 'fixed' && d.style.bottom === '22px')), 'the favour is said again as a caption');
  const played = await p.evaluate(() => window.__played.map(u => new URL(u).pathname));
  ok(played.some(u => /\/r2\/voices\/lines\/quests\/bake-sugar-/.test(u)) && played.some(u => /\/bake-sugar-0-/.test(u)), 'the giver\'s recorded voice plays the ask and the next step: ' + played.join(' '));
  ok(!(await p.evaluate(() => window.__browserVoice)), 'the browser voice is never used');
  const after = await p.evaluate(() => window.AbbieTown.camera.position.toArray());
  ok(Math.hypot(...after.map((v, i) => v - before[i])) > 500, 'the camera moved toward the place');
  await p.screenshot({path: pre + '2-flown.png', timeout: 120000});
  await b.close();
})();
