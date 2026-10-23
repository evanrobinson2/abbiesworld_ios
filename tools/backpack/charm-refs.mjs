import {chromium} from 'playwright';
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport:{width:512,height:512}});
p.on('pageerror', e => console.log('PAGEERR', e.message));
const ids = {'first-memory':'gold-coin','school-roof':'star','brass-key':'brass-key','moon-key':'moon','basement':'floppy-disk','all-memories':'heart','bub':'bub','barista':'coffee-cup','rocket':'rocket'};
for (const [id, name] of Object.entries(ids)) { await p.goto('http://localhost:8765/charm-ref.html?id=' + id); await p.waitForFunction(() => window.done, {timeout: 60000});
 const data = await p.evaluate(() => document.getElementById('c').toDataURL('image/png')); const fs = await import('fs'); fs.mkdirSync('/mnt/project-files/backpack-charms/' + name, {recursive: true}); fs.writeFileSync('/mnt/project-files/backpack-charms/' + name + '/pick.png', Buffer.from(data.split(',')[1], 'base64')); console.log(name); }
await b.close();
