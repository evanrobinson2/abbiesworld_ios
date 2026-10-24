// The mini phone and its Polaroids (Evan, 2026-10-23 23:39Z): after winning the floppy-disk charm ('basement') the player gets a mini
// phone that takes Polaroids of the game while in car mode. The phone is a round glass button (presentation layer, no words); a tap
// takes the picture from what is on screen, a white-framed card slides out and develops, then tucks away into the backpack.
// Pictures are kept in this browser ('aw-polaroids', the newest 8) and announced with an 'aw:polaroid' event for the backpack.
// Unlock: earnedCharms() has 'basement', or the developer cheat localStorage aw-dev-phone=1 (or ?phone in the page address).
const KEY = 'aw-polaroids', CHARM = 'basement';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch { return []; } };
export const polaroids = read;
const devOn = () => { try { return localStorage.getItem('aw-dev-phone') === '1' || /[?&]phone\b/.test(location.search); } catch { return false; } };
let backpack = null; const loadBackpack = () => (backpack ||= import('../backpack.mjs').catch(() => null));
export async function phoneUnlocked() { if (devOn()) return true; const b = await loadBackpack(); try { return !!b?.earnedCharms?.().includes(CHARM); } catch { return false; } }

const CSS = `
.pola-phone{position:fixed;left:var(--pola-left,max(12px,env(safe-area-inset-left)));bottom:calc(max(10px,env(safe-area-inset-bottom)) + clamp(120px,26vw,170px));width:clamp(44px,11vw,56px);aspect-ratio:1;border-radius:50%;border:0;padding:0;z-index:21;cursor:pointer;color:#fff;font-size:clamp(20px,5vw,26px);touch-action:none;
 background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.6),rgba(255,255,255,.12) 55%,rgba(20,10,40,.4));box-shadow:0 8px 18px rgba(20,10,40,.4),inset 0 1px 3px rgba(255,255,255,.75)}
.pola-phone:active{transform:scale(.9)}.pola-phone[hidden]{display:none}
.pola-card{position:fixed;left:var(--pola-left,max(12px,env(safe-area-inset-left)));bottom:calc(max(10px,env(safe-area-inset-bottom)) + clamp(120px,26vw,170px));width:clamp(110px,28vw,170px);padding:7px 7px 24px;background:#fffdf6;border-radius:4px;box-shadow:0 14px 30px rgba(20,10,40,.45);z-index:22;pointer-events:none;
 transform:translateY(0) rotate(-3deg);animation:polaslide .55s cubic-bezier(.2,.9,.3,1.2) both}
.pola-card img{display:block;width:100%;border-radius:2px;filter:sepia(1) brightness(1.7) blur(5px);transition:filter 3s ease-out}
.pola-card.dev img{filter:none}.pola-card.out{transition:transform .6s ease-in,opacity .6s;transform:translate(-90px,40px) scale(.2) rotate(-12deg);opacity:0}
@keyframes polaslide{from{transform:translateY(60px) scale(.6) rotate(8deg);opacity:0}to{transform:translateY(-130px) rotate(-3deg);opacity:1}}
@media(prefers-reduced-motion:reduce){.pola-card{animation:none;transform:translateY(-130px) rotate(-3deg)}}
`;

export function createPolaroid({renderer, scene, camera, doc = document, root = doc.body, visible = () => true, sound = null}) {
 const st = doc.createElement('style'); st.textContent = CSS; doc.head.append(st);
 const btn = doc.createElement('button'); btn.className = 'pola-phone'; btn.dataset.ui = ''; btn.setAttribute('aria-label', 'Phone camera'); btn.hidden = true; btn.textContent = '📱'; root.append(btn);
 let unlocked = false; phoneUnlocked().then(v => { unlocked = v; });
 const poll = setInterval(() => phoneUnlocked().then(v => { unlocked = v; }), 3000);
 function shoot() {
  renderer.render(scene, camera); // draw the frame again so the picture can be read back right now
  const src = renderer.domElement, w = 480, h = Math.round(w * src.height / src.width), c = doc.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(src, 0, 0, w, h);
  const url = c.toDataURL('image/jpeg', .72), card = doc.createElement('div'); card.className = 'pola-card' + (devOn() ? ' dev' : ''); card.dataset.ui = ''; const im = new Image(); im.src = url; card.append(im); root.append(card);
  requestAnimationFrame(() => requestAnimationFrame(() => { im.style.filter = 'none'; }));
  setTimeout(() => card.classList.add('out'), 4800); setTimeout(() => card.remove(), 5500);
  const list = read(); list.unshift({t: Date.now(), img: url}); try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8))); } catch { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 2))); } catch {} }
  window.dispatchEvent(new CustomEvent('aw:polaroid', {detail: {t: Date.now(), count: Math.min(8, list.length)}})); sound?.();
  return url;
 }
 btn.addEventListener('click', e => { e.stopPropagation(); if (unlocked) shoot(); });
 btn.addEventListener('pointerdown', e => e.stopPropagation());
 return {shoot, update() { const show = unlocked && visible(); if (btn.hidden === show) btn.hidden = !show; }, get unlocked() { return unlocked; }, dispose() { clearInterval(poll); btn.remove(); st.remove(); }};
}
