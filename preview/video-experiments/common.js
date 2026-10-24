// Shared bits for the video-experiment prototypes (issue #608 follow-up). Plain canvas, no libraries, no sound, no media
// from the videos: everything here is drawn, so nothing of Abbie's footage leaves the PC.
export const $ = (s, r = document) => r.querySelector(s);
export const store = {
 get(k) { try { return localStorage.getItem('vx-' + k); } catch { return null; } },
 set(k, v) { try { localStorage.setItem('vx-' + k, v); } catch {} }
};
export const DEV = new URLSearchParams(location.search).has('dev');
export function fit(canvas) {
 const dpr = Math.min(2, devicePixelRatio || 1), r = canvas.getBoundingClientRect();
 canvas.width = r.width * dpr; canvas.height = r.height * dpr;
 const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
 return {c, w: r.width, h: r.height};
}
// Developer-only readout (never in the player's view): the observable success checks for each experiment.
export function devPanel(lines) {
 if (!DEV) return () => {};
 const d = document.createElement('pre');
 d.style.cssText = 'position:fixed;left:6px;top:6px;margin:0;padding:6px 8px;background:#000a;color:#9f9;font:11px/1.35 monospace;z-index:9;border-radius:6px;pointer-events:none';
 document.body.append(d);
 return () => { d.textContent = lines().join('\n'); };
}
export const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(16); };

// The friend who needs a swimsuit for the party (Evan's example, 2026-10-24). A round bunny; the suit is one path so the
// painted layer can be clipped to it on the easel and again on the friend.
export const SUIT = new Path2D('M-34 -52 L-18 -52 L-14 -34 L14 -34 L18 -52 L34 -52 L30 -10 Q32 12 24 30 L10 30 L0 18 L-10 30 L-24 30 Q-32 12 -30 -10 Z');
export function drawFriend(c, x, y, s, {suit = null, plain = '#fff', bounce = 0, wave = 0} = {}) {
 c.save(); c.translate(x, y - Math.abs(Math.sin(bounce)) * 14 * s); c.scale(s, s);
 const ink = '#3b2d4a';
 c.lineWidth = 3; c.strokeStyle = ink; c.lineJoin = 'round';
 // ears
 for (const sx of [-1, 1]) { c.fillStyle = '#f3d9ee'; c.beginPath(); c.ellipse(sx * 17, -138 - Math.sin(bounce) * 4 * sx, 9, 28, sx * .12, 0, 7); c.fill(); c.stroke(); }
 // legs + arms
 c.fillStyle = '#f3d9ee';
 for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 14, 46, 11, 14, 0, 0, 7); c.fill(); c.stroke(); }
 c.beginPath(); c.ellipse(-38, -30, 9, 22, .5, 0, 7); c.fill(); c.stroke();
 c.save(); c.translate(38, -44); c.rotate(-.5 - Math.sin(wave) * .5); c.beginPath(); c.ellipse(0, 18, 9, 22, 0, 0, 7); c.fill(); c.stroke(); c.restore();
 // body + head
 c.beginPath(); c.ellipse(0, -10, 36, 50, 0, 0, 7); c.fill(); c.stroke();
 c.beginPath(); c.arc(0, -96, 36, 0, 7); c.fill(); c.stroke();
 c.fillStyle = ink; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * 13, -98, 4.5, 0, 7); c.fill(); }
 c.fillStyle = '#ff8fb0'; c.beginPath(); c.arc(0, -88, 5, 0, 7); c.fill();
 c.strokeStyle = ink; c.beginPath(); c.arc(0, -86, 10, .2, Math.PI - .2); c.stroke();
 // suit
 c.save(); c.fillStyle = plain; c.fill(SUIT);
 if (suit) { c.clip(SUIT); c.drawImage(suit, -40, -58, 80, 90); }
 c.restore(); c.stroke(SUIT);
 c.restore();
}
