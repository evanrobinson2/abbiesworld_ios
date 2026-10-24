// Grace's computer, for real (AW-STUDY-0024): an x86 PC emulator (v86, BSD) running FreeDOS (GPL) from a small hard
// disk image, with Grace's files and our own DOS programs (KEYSTORM, COIN). Same face as GraceDos, so the scene can use
// either: dos.canvas is the picture for the CRT, dos.key(e.key), dos.insert(disk), dos.tick(dt), dos.dirty.
// The disks are real 720 KB floppies; a program tells the basement something happened by writing "AW:<id>" to COM1.
// Built by tools/grace-dos/build.sh; licences and sources in tools/grace-dos/README.md.
export const DOS_W = 640, DOS_H = 400;

// Every floppy in the disk box is studies/basement/disks/<id>.img.gz (built by tools/grace-dos/build.sh).

async function gunzip(url) {
 const r = await fetch(url); if (!r.ok) throw Error(url + ' ' + r.status);
 if (typeof DecompressionStream === 'undefined') throw Error('no DecompressionStream');
 return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
const fetchBuf = async url => { const r = await fetch(url); if (!r.ok) throw Error(url + ' ' + r.status); return r.arrayBuffer(); };

// KeyboardEvent.key to PC scancode set 1. Shifted characters press Shift around the key. `code` names keys that have no
// character (arrows, function keys, the editing block); [0xE0, n] is an extended key.
const SC = {Escape: 1, Backspace: 14, Tab: 15, Enter: 28, ' ': 57, Control: 29, Shift: 42, Alt: 56, CapsLock: 58,
 ArrowUp: [0xE0, 0x48], ArrowDown: [0xE0, 0x50], ArrowLeft: [0xE0, 0x4B], ArrowRight: [0xE0, 0x4D],
 Home: [0xE0, 0x47], End: [0xE0, 0x4F], PageUp: [0xE0, 0x49], PageDown: [0xE0, 0x51], Insert: [0xE0, 0x52], Delete: [0xE0, 0x53]};
for (let i = 1; i <= 10; i++) SC['F' + i] = 58 + i; SC.F11 = 0x57; SC.F12 = 0x58;
const ROWS = [['1234567890-=', 2], ['qwertyuiop[]', 16], ["asdfghjkl;'`", 30], ['\\zxcvbnm,./', 43]];
const SHIFTED = {'!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', _: '-', '+': '=', '{': '[', '}': ']', ':': ';', '"': "'", '~': '`', '|': '\\', '<': ',', '>': '.', '?': '/'};
for (const [chars, first] of ROWS) [...chars].forEach((c, i) => { SC[c] = first + i; });
// -> {shift, down: [...make codes], up: [...break codes]} or null for a key the PC has no use for
function scancodes(k) {
 let shift = false, code = SC[k];
 if (code === undefined && k.length === 1) { const lower = k.toLowerCase(); if (lower !== k) { shift = true; code = SC[lower]; } else if (SHIFTED[k]) { shift = true; code = SC[SHIFTED[k]]; } }
 if (code === undefined) return null;
 const down = Array.isArray(code) ? code : [code], up = down.map((c, i) => i === down.length - 1 ? c | 0x80 : c);
 return {shift, down, up};
}

export class GracePC {
 constructor({base = '/studies/basement/disks/', vendor = '/vendor/v86/', sound = () => {}, found = () => {}} = {}) {
  this.base = base; this.vendor = vendor; this.sound = sound; this.found = found;
  this.canvas = Object.assign(document.createElement('canvas'), {width: DOS_W, height: DOS_H});
  this.ctx = this.canvas.getContext('2d'); this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, DOS_W, DOS_H);
  this.on = false; this.dirty = true; this.text = Array.from({length: 25}, () => Array(80).fill(' ')); this.cursor = [0, 0];
  this.serial = ''; this.ready = null; this.disk = null;
 }

 // Fetch the emulator and the disks once; the first power-on waits for it.
 load() {
  if (this.ready) return this.ready;
  this.ready = (async () => {
   const [{V86}, bios, vga, hd] = await Promise.all([import(this.vendor + 'libv86.mjs'), fetchBuf(this.vendor + 'seabios.bin'), fetchBuf(this.vendor + 'vgabios.bin'), gunzip(this.base + 'grace-hd.img.gz')]);
   this.V86 = V86; this.files = {bios, vga, hd};
  })();
  return this.ready;
 }

 async powerOn() {
  if (this.on) return; this.on = true; this.sound('beep');
  try { await this.load(); } catch (e) { console.warn('[grace-pc]', e); this.on = false; this.failed = true; return; }
  if (!this.on) return;
  this.box = Object.assign(document.createElement('div'), {style: 'position:fixed;left:-4000px;top:0;width:720px;height:400px;overflow:hidden;pointer-events:none'});
  this.box.append(document.createElement('div'), document.createElement('canvas')); document.body.append(this.box);
  this.v86 = new this.V86({wasm_path: this.vendor + 'v86.wasm', memory_size: 8 << 20, vga_memory_size: 2 << 20,
   bios: {buffer: this.files.bios}, vga_bios: {buffer: this.files.vga}, hda: {buffer: this.files.hd.slice(0)},
   screen: {container: this.box, use_graphical_text: true}, disable_keyboard: true, disable_mouse: true, autostart: true});
  this.v86.add_listener('screen-put-char', ([r, c, ch]) => { if (r < 25 && c < 80) this.text[r][c] = String.fromCharCode(ch); });
  this.v86.add_listener('screen-update-cursor', ([r, c]) => { this.cursor = [r, c]; });
  this.v86.add_listener('serial0-output-byte', b => {
   if (b !== 10) { this.serial = (this.serial + String.fromCharCode(b)).slice(-80); return; }
   const m = /AW:([a-z0-9-]+)\s*$/.exec(this.serial); this.serial = ''; if (m) this.found(m[1]);
  });
  this.sound('disk');
  if (this.disk) setTimeout(() => this.insert(this.disk), 50);
 }
 powerOff() {
  this.on = false; try { this.v86?.destroy(); } catch {} this.v86 = null; this.box?.remove(); this.box = null;
  this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, DOS_W, DOS_H); this.dirty = true;
 }

 // A disk goes into drive A. DOS sees it the next time something reads A: (type A: and GO).
 async insert(disk) {
  this.disk = disk; this.sound('disk');
  if (!this.v86) return true;
  try { const buf = await gunzip(this.base + disk.id + '.img.gz'); if (this.disk === disk && this.v86) await this.v86.set_fda({buffer: buf}); }
  catch (e) { console.warn('[grace-pc] disk', e); }
  return true;
 }
 eject() { this.disk = null; try { this.v86?.eject_fda(); } catch {} }

 // At the DOS prompt with nothing typed, Escape is not for the computer: the scene uses it to stand up.
 atPrompt() { const [r, c] = this.cursor, line = (this.text[r] || []).join('').slice(0, c); return /^[A-Z]:\\[^>]*>$/.test(line.trimEnd()); }
 // A tap: press and release together (typing). A game that polls the keyboard wants keyDown/keyUp, so a key can be held.
 key(k) {
  if (!this.on) return k !== 'Escape';
  if (k === 'Escape' && this.atPrompt()) return false;
  const c = scancodes(k); if (!c || !this.v86) return true;
  this.v86.keyboard_send_scancodes(c.shift ? [0x2A, ...c.down, ...c.up, 0xAA] : [...c.down, ...c.up]); this.sound('key'); return true;
 }
 // Held keys: the browser's own repeat sends keyDown again, as a PC keyboard repeats its make code.
 keyDown(k) {
  if (!this.on || !this.v86) return !this.on && k !== 'Escape';
  if (k === 'Escape' && this.atPrompt()) return false;
  const c = scancodes(k); if (!c) return true;
  this.held ??= new Map(); if (!this.held.has(k)) this.sound('key');
  this.held.set(k, c); this.v86.keyboard_send_scancodes(c.shift && !this.held.get('Shift') ? [0x2A, ...c.down] : c.down); return true;
 }
 keyUp(k) {
  const c = this.held?.get(k); if (!c || !this.v86) return;
  this.held.delete(k); this.v86.keyboard_send_scancodes(c.shift && !this.held.get('Shift') ? [...c.up, 0xAA] : c.up);
 }
 releaseAll() { for (const k of [...(this.held?.keys() || [])]) this.keyUp(k); }

 tick() {
  if (!this.v86 || !this.box) return;
  const src = this.box.querySelector('canvas'); if (!src || !src.width) return;
  this.ctx.imageSmoothingEnabled = false; this.ctx.drawImage(src, 0, 0, DOS_W, DOS_H); this.dirty = true;
 }
}
