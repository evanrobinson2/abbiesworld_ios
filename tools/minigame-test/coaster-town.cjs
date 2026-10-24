// Opens the town at the skate park, checks the toy-car coaster model stands on its pad, screenshots it, and taps it.
// Serve prototypes/ranch-atelier/dist on :8765, then: node tools/minigame-test/coaster-town.cjs shots/t
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [,, pre = 'shots/t', w = 1280, h = 720] = process.argv;
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport: {width: +w, height: +h}});
  p.on('pageerror', e => console.log('err', e.message));
  await p.goto('http://localhost:8765/studies/abbietown/index.html?play&at=town:skate-park');
  await p.waitForFunction(() => window.AbbieTown?.stage?.tiles?.downtown?.group?.getObjectByName('toy-car coaster (town model)'), null, {timeout: 240000});
  await p.waitForTimeout(9000); await p.screenshot({path: pre + '1-skatepark.png', timeout: 180000});
  const info = await p.evaluate(() => { const AT = window.AbbieTown, T = AT.stage.THREE, r = AT.stage.tiles.downtown.group.getObjectByName('toy-car coaster (town model)');
    const bb = new T.Box3().setFromObject(r), sp = AT.stage.tiles.downtown.spots.skatepark, c = bb.getCenter(new T.Vector3()), s = bb.getSize(new T.Vector3());
    // project the model's centre to the screen so the test can tap it
    const v = c.clone().project(AT.stage.camera); return {size: s.toArray().map(x => +x.toFixed(1)), centre: c.toArray().map(x => +x.toFixed(1)), spot: sp, screen: [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]}; });
  console.log(JSON.stringify(info));
  await p.evaluate(() => window.AbbieTown.enterScene('skate-park', {dist: 40, pitch: 30, azimuth: 20})); await p.waitForTimeout(9000); await p.screenshot({path: pre + '2-close.png', timeout: 180000});
  // tap the model: the town flies down, flashes, and opens the ride
  const xy = await p.evaluate(() => { const AT = window.AbbieTown, T = AT.stage.THREE, r = AT.stage.tiles.downtown.group.getObjectByName('toy-car coaster (town model)'); const v = new T.Box3().setFromObject(r).getCenter(new T.Vector3()).project(AT.stage.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  await p.mouse.click(xy[0], xy[1]); await p.waitForURL(/studies\/coaster\/play\.html/, {timeout: 60000}).then(() => console.log('tap opened', p.url())).catch(() => console.log('tap did not open the ride'));
  await b.close();
})();
