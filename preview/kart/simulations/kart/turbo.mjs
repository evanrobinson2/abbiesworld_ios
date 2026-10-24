// Kart turbo pads (issue #540): two big glass pads along the bottom of the screen, one under each thumb, plus a charge ring
// between them. Press either pad to fire the driver's boost; the ring fills while it recharges. No words, icons only.
// The driver owns the rules (a 1.1 s burst, then a recharge), so this layer only presses the button and shows the charge.
//   const turbo = mountTurbo({hunt}); turbo.dispose()
const BOLT = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M13.5 2 5 13.5h5.6L9.5 22 19 9.5h-5.7z"/></svg>';
const PAD = 'width:min(30vw,168px);height:56px;border-radius:28px;border:1px solid rgba(255,255,255,.55);color:#fff;display:grid;place-items:center;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;background:linear-gradient(180deg,rgba(255,196,64,.7),rgba(255,106,40,.45));box-shadow:0 8px 20px rgba(60,20,20,.35),inset 0 1px 0 rgba(255,255,255,.7),inset 0 -8px 14px rgba(160,40,0,.3);transition:transform .08s,filter .2s,opacity .2s';

export function mountTurbo({hunt, doc = document, host = doc.body}) {
  const s = hunt.driver.s, bar = doc.createElement('div'); bar.setAttribute('data-ui', ''); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Turbo');
  bar.style.cssText = 'position:fixed;left:50%;translate:-50% 0;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 70px);display:none;align-items:center;gap:14px;z-index:25;pointer-events:none';
  const pad = side => { const b = doc.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Turbo ' + side); b.innerHTML = BOLT; b.style.cssText = PAD + ';pointer-events:auto'; return b; };
  const L = pad('left'), R = pad('right');
  const ring = doc.createElement('div'); ring.style.cssText = 'width:46px;height:46px;border-radius:50%;box-shadow:0 4px 12px rgba(20,10,40,.3);transition:filter .2s';
  bar.append(L, ring, R); host.append(bar);
  let held = 0; const down = new Set();
  const press = (b, id) => { down.add(id); held = down.size; hunt.driver.input.boost = true; b.style.transform = 'scale(.94)'; };
  const lift = (b, id) => { down.delete(id); held = down.size; if (!held) hunt.driver.input.boost = false; b.style.transform = ''; };
  for (const b of [L, R]) {
    b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch {} press(b, e.pointerId); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, e => lift(b, e.pointerId));
    b.addEventListener('contextmenu', e => e.preventDefault());
  }
  let raf = 0;
  const tick = () => { // the ring is a conic fill of the driver's charge; pads dim while it recharges, glow while it burns
    const c = s.boostT > 0 ? 1 : s.boostCharge, on = s.boostT > 0, ready = c >= 1;
    ring.style.background = `conic-gradient(${on ? '#fff3b0' : '#ffb347'} ${c * 360}deg, rgba(255,255,255,.28) 0)`;
    ring.style.filter = on ? 'brightness(1.4) drop-shadow(0 0 8px #ffd34d)' : '';
    for (const b of [L, R]) { b.style.filter = on ? 'brightness(1.25) saturate(1.2)' : ready ? '' : 'saturate(.6)'; b.style.opacity = ready || on ? 1 : .78; }
    bar.style.display = hunt.mode !== 'god' ? 'flex' : 'none'; raf = requestAnimationFrame(tick);
  };
  tick();
  return {bar, dispose() { cancelAnimationFrame(raf); hunt.driver.input.boost = false; bar.remove(); }};
}
