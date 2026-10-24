// Smoke run for entries that are old apps rather than minigames: the page loads in headless Chromium, shows its world (a selector)
// and throws no page errors. Serve prototypes/ranch-atelier/dist on :8765, then: node tools/game-registry/smoke.cjs / '#map'
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [,, page = '/', selector = 'canvas'] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: 1280, height: 720}});
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765' + page, {waitUntil: 'load', timeout: 120000});
  await p.waitForSelector(selector, {state: 'visible', timeout: 120000}); await p.waitForTimeout(4000);
  await b.close();
  if (errs.length) { console.log('err', errs.join(' | ')); process.exit(1); }
  console.log('GAME-TEST PASS smoke');
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
