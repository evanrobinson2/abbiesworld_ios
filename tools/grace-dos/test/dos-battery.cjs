// Command battery for Grace's computer (AW-STUDY-0024): the DOS a child would try, on the real hard disk, then every floppy.
// PLAYWRIGHT=/opt/node-tools/node_modules/playwright node tools/grace-dos/test/dos-battery.cjs  (dist served on :8765)
const {bench} = require('./dosrun.cjs');
const fails = [];
const want = (name, text, re) => { const ok = re.test(text); console.log(ok ? 'ok  ' : 'FAIL', name); if (!ok) { fails.push(name); console.log(text.split('\n').slice(-8).join('\n')); } };
(async () => {
 const b = await bench({files: {}});
 const run = async (c, re, name, wait = 700) => { await b.cmd('CLS'); await b.cmd(c); await b.page.waitForTimeout(wait); want(name || c, await b.text(), re); };
 await run('VER', /FreeCom/i); await run('DIR', /README\s+TXT/i, 'DIR shows the note'); await run('TYPE README.TXT', /\S/, 'TYPE reads a file');
 await run('HELP', /GAMES/, 'HELP lists GAMES'); await run('GAMES', /BLOCKS[\s\S]*DUSKBLD/, 'GAMES lists both');
 await run('DATE', /1986/, 'DATE'); await b.press('Enter'); await run('TIME', /\d\d:\d\d/, 'TIME'); await b.press('Enter'); await b.page.waitForTimeout(300);
 await run('ECHO hello grace', /hello grace/i); await run('SET', /PATH=/i, 'SET shows PATH'); await run('PATH', /GRACE/i);
 await run('MD PLAY', /^(?![\s\S]*(Invalid|error|denied))/i, 'MD'); await run('CD PLAY', /PLAY>/i, 'CD into it');
 await run('COPY C:\\GRACE\\README.TXT NOTE.TXT', /=>>|file/i, 'COPY'); await run('DIR', /NOTE\s+TXT/i, 'copied file is there');
 await run('TYPE NOTE.TXT', /\S/, 'TYPE the copy'); await run('DEL NOTE.TXT', /^(?![\s\S]*(denied|not found))/i, 'DEL'); await run('DIR', /^(?![\s\S]*NOTE\s+TXT)/i, 'DEL removed it');
 await run('CD \\', /C:\\>/i, 'CD back'); await run('RD PLAY', /^(?![\s\S]*(denied|invalid))/i, 'RD');
 await run('NOSUCH', /Bad command|not found/i, 'unknown command is polite');
 await run('CLS', /^\s*C:\\>\s*$/i, 'CLS clears', 500);
 for (const [id, com, re] of [['blocks', 'BLOCKS', /./], ['duskblade', 'DUSKBLD', /./], ['keystorm', 'KEYSTORM', /./]]) {
  await b.page.evaluate(id => pc.insert({id}), id); await b.page.waitForTimeout(2500);
  await b.cmd('A:'); await b.cmd('DIR'); want(`${id}: DIR on the floppy`, await b.text(), new RegExp(com.slice(0, 6), 'i'));
  await b.cmd('GO'); await b.page.waitForTimeout(2000); await b.shot(`/tmp/gcom/bat-${id}.png`); await b.press('Escape'); await b.page.waitForTimeout(800); await b.press('Escape'); await b.page.waitForTimeout(500);
  await b.cmd('C:'); want(`${id}: back to C: after quitting`, await b.text(), /C:\\/i);
 }
 await b.close();
 console.log(fails.length ? 'FAILED: ' + fails.join(', ') : 'BATTERY OK'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
