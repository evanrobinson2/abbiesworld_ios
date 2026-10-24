// GRACE-DOS: the software on Aunt Grace's 1986 computer (AW-STUDY-0024). Our own DOS-style shell and programs, drawn
// to a 640x400 canvas the scene puts on the CRT. Nothing here is copied from real DOS or real games: the look is the
// period's (40-column text, 320x200 games, a blinking cursor), the words and play are ours. Programs live in one table,
// so new ones (the helicopter, the adventure) slot in beside KEYSTORM without touching the shell.
//   const dos = new GraceDos({sound}); scene texture = dos.canvas; dos.key(e.key); dos.tick(dt); dos.dirty
export const DOS_W = 640, DOS_H = 400, COLS = 40, ROWS = 25;
const CW = DOS_W / COLS, CH = DOS_H / ROWS;
export const PALETTE = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'];
const FONT = '"VT323", "Courier New", monospace';

const README = [
 'This is my computer. You may use it.',
 '',
 'Be gentle with the disk drive.',
 'Type KEYSTORM to practise your letters.',
 'My favourite word is my own name.',
 '',
 '                                    - G.',
];
const RECIPE = [
 'CINNAMON SUGAR TOAST',
 '',
 '1 slice of bread, toasted',
 '1 pat of butter',
 '1 spoon of sugar',
 '1 pinch of cinnamon',
 '',
 'Butter it while it is hot.',
 'Mix the sugar and cinnamon.',
 'Shake it on. Eat it on the stairs.',
];

// The disks in the box beside the computer. Putting one in the drive runs what is on it.
export const DISKS = [
 {id: 'keystorm', label: 'KEYSTORM', color: '#c0392b'},
 {id: 'recipes', label: 'RECIPES', color: '#2d6cb0'},
 {id: 'blank', label: '', color: '#f2efe6'},
 {id: 'blocks', label: 'BLOCKS', color: '#3a9d5d'},
 {id: 'duskblade', label: 'DUSK', color: '#6a3fa0'},
];

export class GraceDos {
 constructor({sound = () => {}, date = 'Thu 10-23-1986', found = () => {}} = {}) {
  this.canvas = Object.assign(document.createElement('canvas'), {width: DOS_W, height: DOS_H});
  this.ctx = this.canvas.getContext('2d');
  this.sound = sound; this.date = date; this.found = found; // found(id): a hidden coin was earned on the computer
  this.cells = Array.from({length: ROWS}, () => Array(COLS).fill(' '));
  this.colors = Array.from({length: ROWS}, () => Array(COLS).fill(7));
  this.cx = 0; this.cy = 0; this.fg = 7; this.line = ''; this.t = 0; this.dirty = true;
  this.on = false; this.queue = []; this.program = null;
  this.programs = {KEYSTORM: {file: 'KEYSTORM.EXE', size: 24576, make: () => new Keystorm(this)}};
  this.commands = {
   HELP: () => { this.print('Commands:'); this.print('  DIR    list the files'); this.print('  TYPE   show a text file'); this.print('  CLS    clear the screen'); this.print('  DATE   today\'s date'); this.print('  VER    which DOS this is'); this.print('  name   run a program, like KEYSTORM'); },
   DIR: () => { this.print(' Volume in drive C is GRACE'); this.print(' Directory of C:\\GRACE'); this.print('');
    const rows = [...Object.values(this.programs).map(p => [p.file, p.size]), ['README.TXT', README.join('\r\n').length]];
    for (const [f, s] of rows) { const [n, e] = f.split('.'); this.print(` ${n.padEnd(9)}${e.padEnd(4)}${String(s).padStart(8)}  10-23-86`); }
    this.print(`  ${rows.length} file(s)   ${(640 - 47) * 1024} bytes free`); },
   TYPE: a => { if ((a || '').toUpperCase() === 'README.TXT') README.forEach(l => this.print(l)); else this.print(a ? 'File not found.' : 'Type which file? Try TYPE README.TXT'); },
   CLS: () => this.clear(),
   DATE: () => this.print(`Current date is ${this.date}`),
   VER: () => this.print('GRACE-DOS Version 1.0'),
   ECHO: a => this.print(a || ''),
   CD: () => this.print('C:\\GRACE'),
  };
 }

 // Power on: the memory count and the boot lines arrive at the pace of a real machine.
 powerOn() {
  if (this.on) return; this.on = true; this.clear(); this.queue = [];
  const say = (ms, fn) => this.queue.push({ms, fn});
  say(500, () => this.sound('beep'));
  say(200, () => this.print('GRACE PERSONAL COMPUTER'));
  for (let k = 64; k <= 640; k += 64) say(120, () => { this.cy = 2; this.cx = 0; this.write(`Memory test  ${String(k).padStart(3)}K`); });
  say(200, () => { this.write(' OK'); this.newline(); this.newline(); });
  say(300, () => { this.sound('disk'); this.print('Starting GRACE-DOS...'); });
  say(1100, () => { this.print(''); this.print(`Current date is ${this.date}`); this.print(''); this.prompt(); });
 }
 powerOff() { this.on = false; this.program = null; this.queue = []; this.clear(); this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, DOS_W, DOS_H); this.dirty = true; }

 clear() { for (let r = 0; r < ROWS; r++) { this.cells[r].fill(' '); this.colors[r].fill(7); } this.cx = this.cy = 0; this.dirty = true; }
 scroll() { this.cells.shift(); this.colors.shift(); this.cells.push(Array(COLS).fill(' ')); this.colors.push(Array(COLS).fill(7)); this.cy = ROWS - 1; }
 newline() { this.cx = 0; if (++this.cy >= ROWS) this.scroll(); this.dirty = true; }
 write(s) { for (const ch of s) { if (this.cx >= COLS) this.newline(); this.cells[this.cy][this.cx] = ch; this.colors[this.cy][this.cx++] = this.fg; } this.dirty = true; }
 print(s) { this.write(s); this.newline(); }
 prompt() { this.write('C:\\GRACE>'); this.line = ''; }

 run(cmd) {
  const [name = '', ...rest] = cmd.trim().split(/\s+/), up = name.toUpperCase().replace(/\.(EXE|COM)$/, ''), arg = rest.join(' ');
  if (!name) return this.prompt();
  if (this.programs[up]) { this.program = this.programs[up].make(); this.sound('disk'); return; }
  if (up === 'GRACE') { this.print('Hello, dear.'); this.found('dos-grace'); }
  else if (this.commands[up]) this.commands[up](arg); else this.print('Unknown command. Type HELP.');
  this.print(''); this.prompt();
 }
 exitProgram() { this.program = null; this.clear(); this.prompt(); }

 // A disk goes into drive A. The machine reads it and runs what is on it.
 insert(disk) {
  if (!this.on || this.queue.length) return false;
  this.program = null; this.clear(); this.sound('disk');
  if (disk.id === 'keystorm') { this.print('A:\\>KEYSTORM'); this.program = this.programs.KEYSTORM.make(); return true; }
  if (disk.id === 'recipes') { this.print('A:\\>TYPE TOAST.TXT'); this.print(''); RECIPE.forEach(l => this.print(l)); }
  else if (disk.id === 'blank') { this.print('A:\\>DIR'); this.print(''); this.print('This disk is empty.'); }
  else if (disk.coin) { this.program = new CoinShow(this, () => this.found('coin-disk')); return true; }
  this.print(''); this.write('A:\\>'); this.line = ''; return true;
 }

 // Keys use KeyboardEvent.key names. Returns true when the key was used, false when the computer ignores it
 // (Escape at the prompt), so the scene can treat that as "stand up".
 key(k) {
  if (!this.on || this.queue.length) return k !== 'Escape';
  if (this.program) { this.program.key(k); return true; }
  this.sound('key');
  if (k === 'Escape') return false;
  if (k === 'Enter') { this.newline(); this.run(this.line); return true; }
  if (k === 'Backspace') { if (this.line) { this.line = this.line.slice(0, -1); this.cx--; this.cells[this.cy][this.cx] = ' '; this.dirty = true; } return true; }
  if (k.length === 1 && this.line.length < 30) { this.line += k.toUpperCase(); this.write(k.toUpperCase()); }
  return true;
 }

 tick(dt) {
  this.t += dt;
  // Boot lines run on the wall clock, so a slow frame never stalls the boot.
  const now = performance.now();
  while (this.queue.length) { const q = this.queue[0]; q.at ??= (this.lastAt ?? now) + q.ms; if (now < q.at) break; this.lastAt = q.at; this.queue.shift(); q.fn(); }
  if (!this.queue.length) this.lastAt = null;
  if (this.program) { this.program.tick(dt); this.program.draw(this.ctx); this.dirty = true; return; }
  const blink = Math.floor(this.t * 2.2) % 2;
  if (blink !== this.blink) { this.blink = blink; this.dirty = true; }
  if (this.dirty && this.on) this.drawText();
 }

 drawText() {
  const c = this.ctx; c.fillStyle = '#000'; c.fillRect(0, 0, DOS_W, DOS_H);
  c.font = `${CH + 6}px ${FONT}`; c.textBaseline = 'top';
  const sx = CW / (c.measureText('M').width || CW);
  for (let r = 0; r < ROWS; r++) for (let x = 0; x < COLS; x++) {
   const ch = this.cells[r][x]; if (ch === ' ') continue;
   c.fillStyle = PALETTE[this.colors[r][x]];
   c.save(); c.translate(x * CW, r * CH - 2); c.scale(sx, 1); c.fillText(ch, 0, 0); c.restore();
  }
  if (this.blink && !this.queue.length) { c.fillStyle = PALETTE[7]; c.fillRect(this.cx * CW + 1, this.cy * CH + CH - 4, CW - 2, 3); }
 }
}

// KEYSTORM: letters drift down over a little town at night. Type a letter and the lamp on the hill zaps the lowest one
// that matches. A letter that reaches the roofs puts a house's light out; four dark houses ends the night. Waves teach
// the keyboard row by row (home row first) and the march speeds up as you get them right. Our homage to the
// 1980s letter-shooting tutors: the genre's idea, our own town, pictures and rules.
const WAVES = ['FJ', 'FJDK', 'ASDFJKL', 'ASDFGHJKL', 'EIRUWO', 'QWERTYUIOP', 'ASDFGHJKLEIRU', 'ZXCVBNM', 'QWERTYUIOPASDFGHJKLZXCVBNM'];
const VW = 320, VH = 200;

class Keystorm {
 constructor(dos) {
  this.dos = dos; this.state = 'title'; this.t = 0; this.wave = 0; this.score = 0; this.hits = 0; this.typed = 0;
  this.buf = Object.assign(document.createElement('canvas'), {width: VW, height: VH}); this.c = this.buf.getContext('2d');
  this.houses = [true, true, true, true]; this.beams = []; this.pops = []; this.letters = [];
  this.stars = Array.from({length: 40}, (_, i) => [(i * 73) % VW, (i * 41) % 120, i % 3]);
 }
 startWave() {
  const set = WAVES[Math.min(this.wave, WAVES.length - 1)], n = Math.min(6 + this.wave * 2, 18), cols = Math.min(n, 9);
  this.letters = Array.from({length: n}, (_, i) => ({ch: set[Math.floor(Math.random() * set.length)], x: 40 + (i % cols) * 28, y: 26 + Math.floor(i / cols) * 22, alive: true}));
  this.dir = 1; this.speed = 10 + this.wave * 3; this.state = 'play'; this.banner = 1.6;
 }
 key(k) {
  if (k === 'Escape') { this.dos.sound('key'); return this.dos.exitProgram(); }
  if (this.state === 'title' || this.state === 'over') { this.dos.sound('key'); if (this.state === 'over') Object.assign(this, {wave: 0, score: 0, hits: 0, typed: 0, houses: [true, true, true, true]}); return this.startWave(); }
  if (this.state !== 'play' || k.length !== 1) return;
  const ch = k.toUpperCase(); this.typed++;
  const target = this.letters.filter(l => l.alive && l.ch === ch).sort((a, b) => b.y - a.y)[0];
  if (!target) { this.dos.sound('miss'); this.fizz = .25; return; }
  target.alive = false; this.hits++; this.score += 10 + this.wave * 5;
  this.beams.push({x: target.x, y: target.y, t: .18}); this.pops.push({x: target.x, y: target.y, t: .5});
  this.dos.sound('zap');
 }
 tick(dt) {
  this.t += dt; this.banner = Math.max(0, (this.banner || 0) - dt); this.fizz = Math.max(0, (this.fizz || 0) - dt);
  for (const b of this.beams) b.t -= dt; this.beams = this.beams.filter(b => b.t > 0);
  for (const p of this.pops) p.t -= dt; this.pops = this.pops.filter(p => p.t > 0);
  if (this.state !== 'play' || this.banner > 0) return;
  const live = this.letters.filter(l => l.alive);
  if (!live.length) { this.wave++; this.dos.sound('wave'); if (this.wave === 4) this.dos.found('keystorm-night-5'); return this.startWave(); }
  const acc = this.typed ? this.hits / this.typed : 1, v = this.speed * (.8 + acc * .4);
  const xs = live.map(l => l.x), edge = this.dir > 0 ? Math.max(...xs) > VW - 14 : Math.min(...xs) < 14;
  for (const l of live) { l.x += this.dir * v * dt; l.y += v * .12 * dt; }
  if (edge) { this.dir *= -1; for (const l of live) l.y += 6; this.dos.sound('step'); }
  for (const l of live) if (l.y > 150) {
   l.alive = false; const h = this.houses.findIndex((on, i) => on && Math.abs(40 + i * 80 - l.x) < 60);
   const i = h >= 0 ? h : this.houses.indexOf(true); if (i >= 0) this.houses[i] = false; this.dos.sound('dark');
   if (!this.houses.includes(true)) { this.state = 'over'; this.dos.sound('over'); }
  }
 }
 draw(out) {
  const c = this.c; c.imageSmoothingEnabled = false;
  c.fillStyle = '#000018'; c.fillRect(0, 0, VW, VH);
  for (const [x, y, s] of this.stars) { c.fillStyle = PALETTE[(Math.floor(this.t * 2 + s) % 3) ? 8 : 7]; c.fillRect(x, y, 1, 1); }
  c.fillStyle = PALETTE[14]; c.fillRect(270, 18, 10, 10); c.fillStyle = '#000018'; c.fillRect(274, 16, 9, 9); // the moon
  c.fillStyle = PALETTE[2]; c.fillRect(0, 178, VW, 22); c.fillStyle = '#005500'; for (let x = 0; x < VW; x += 6) c.fillRect(x, 178, 3, 1);
  this.houses.forEach((on, i) => { const x = 22 + i * 80; c.fillStyle = PALETTE[6]; c.fillRect(x, 160, 36, 18); c.fillStyle = PALETTE[4];
   for (let r = 0; r < 10; r++) c.fillRect(x - 3 + r, 160 - r, 42 - 2 * r, 1);
   c.fillStyle = on ? PALETTE[14] : PALETTE[0]; c.fillRect(x + 6, 165, 7, 6); c.fillRect(x + 23, 165, 7, 6); c.fillStyle = PALETTE[0]; c.fillRect(x + 15, 168, 6, 10); });
  c.fillStyle = PALETTE[7]; c.fillRect(158, 184, 4, 12); c.fillStyle = this.fizz ? PALETTE[12] : PALETTE[11]; c.fillRect(156, 180, 8, 5); // the lamp on the hill
  for (const b of this.beams) { c.fillStyle = PALETTE[11]; const n = 30; for (let i = 0; i < n; i++) c.fillRect(160 + (b.x - 160) * i / n, 180 + (b.y + 6 - 180) * i / n, 2, 2); }
  for (const p of this.pops) { c.fillStyle = PALETTE[p.t > .25 ? 15 : 14]; const r = (1 - p.t / .5) * 12; for (let a = 0; a < 8; a++) c.fillRect(p.x + Math.cos(a * .785) * r, p.y + 6 + Math.sin(a * .785) * r, 2, 2); }
  c.font = `16px ${FONT}`; c.textBaseline = 'top'; c.textAlign = 'center';
  for (const l of this.letters) if (l.alive) {
   c.fillStyle = PALETTE[l.y > 120 ? 12 : 13]; c.fillRect(l.x - 7, l.y, 14, 14); c.fillStyle = PALETTE[15]; c.fillText(l.ch, l.x, l.y - 1);
   c.fillStyle = PALETTE[5]; c.fillRect(l.x - 1, l.y - 4, 2, 3);
  }
  c.textAlign = 'left'; c.fillStyle = PALETTE[15]; c.fillText(`SCORE ${String(this.score).padStart(5, '0')}`, 6, 2);
  c.textAlign = 'right'; c.fillText(`NIGHT ${this.wave + 1}`, VW - 6, 2); c.textAlign = 'center';
  if (this.state === 'title') this.titleCard(c, 'KEYSTORM', ['Type the letters before they', 'reach the town!', '', 'Press any key to start', 'Esc goes back to GRACE-DOS']);
  else if (this.state === 'over') this.titleCard(c, 'THE TOWN SLEEPS', [`Score ${this.score}`, `${this.typed ? Math.round(this.hits / this.typed * 100) : 0}% of your keys hit`, '', 'Press any key to play again']);
  else if (this.banner > 0) { c.fillStyle = PALETTE[14]; c.fillText(`NIGHT ${this.wave + 1}: ${WAVES[Math.min(this.wave, WAVES.length - 1)].split('').join(' ')}`, VW / 2, 92); }
  out.imageSmoothingEnabled = false; out.drawImage(this.buf, 0, 0, DOS_W, DOS_H);
 }
 titleCard(c, title, lines) {
  c.fillStyle = PALETTE[1]; c.fillRect(40, 40, 240, 112); c.fillStyle = PALETTE[9]; c.fillRect(40, 40, 240, 2); c.fillRect(40, 150, 240, 2);
  c.font = `32px ${FONT}`; c.fillStyle = PALETTE[14]; c.fillText(title, VW / 2, 48);
  c.font = `16px ${FONT}`; c.fillStyle = PALETTE[15]; lines.forEach((l, i) => c.fillText(l, VW / 2, 82 + i * 12));
 }
}

// The golden coin disk: an 8-bit Abbie's World coin turns on the screen and drops into your jar.
export function drawCoin(c, x, y, size, turn = 1) {
 const P = ['....oooooo....', '..ooyyyyyyoo..', '.oyywwyyyyyyo.', '.oywyyyyyyyyo.', 'oyyyyyAAyyyyyo', 'oyyyyAyyAyyyyo', 'oyyyyAAAAyyyyo', 'oyyyyAyyAyyyyo', 'oyyyyAyyAyyyyo', 'oyyyyyyyyyyyyo', '.oyyyyyyyyyydo.', '.oyyyyyyyyydo..', '..ooyyyyyddo...', '....oooooo....'];
 const col = {o: '#7a4a00', y: '#ffcc33', w: '#fff6c0', A: '#b06a00', d: '#d49a1a'}, px = size / 14, w = Math.max(1, Math.abs(turn));
 P.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '.') return; c.fillStyle = turn < 0 && ch === 'A' ? col.y : col[ch]; c.fillRect(x + (i - 7) * px * w, y + j * px, Math.ceil(px * w), Math.ceil(px)); }));
}
class CoinShow {
 constructor(dos, done) { this.dos = dos; this.done = done; this.t = 0; this.given = false; this.buf = Object.assign(document.createElement('canvas'), {width: VW, height: VH}); }
 key(k) { if (this.t > 2.5) { this.dos.sound('key'); this.dos.exitProgram(); } }
 tick(dt) { this.t += dt; if (!this.given && this.t > 1.2) { this.given = true; this.dos.sound('wave'); this.done(); } }
 draw(out) {
  const c = this.buf.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 30; i++) { c.fillStyle = PALETTE[(i + Math.floor(this.t * 8)) % 2 ? 14 : 6]; const a = i / 30 * 6.283 + this.t; c.fillRect(160 + Math.cos(a) * 70, 90 + Math.sin(a) * 60, 2, 2); }
  drawCoin(c, 160, 48, 84, Math.cos(this.t * 3));
  c.font = `16px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = PALETTE[14];
  c.fillText('YOU FOUND A COIN!', VW / 2, 150); if (this.t > 2.5) { c.fillStyle = PALETTE[7]; c.fillText('press any key', VW / 2, 172); }
  out.imageSmoothingEnabled = false; out.drawImage(this.buf, 0, 0, DOS_W, DOS_H);
 }
}
