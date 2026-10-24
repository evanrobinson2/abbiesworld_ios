// The iPhone chat (Evan, 2026-10-23 20:19Z): a phone on the right of the screen in the tour, a portrait phone in the
// scientist's group chat. Bloop noises, typing bubbles, reactions. It is the presentation layer: drawn for the player,
// never part of the world, so no character or AI perceives it. In the tour the lines are also spoken
// (pre-rendered ElevenLabs mp3 in /simulations/demo/voice/<id>.mp3 when present, else the browser voice).
import {CAST} from './script.mjs';

let ac = null;
export const audio = () => ac || (ac = new (window.AudioContext || window.webkitAudioContext)());
export function tone(freqs, {len = .09, type = 'sine', gain = .06, gap = .07} = {}) {
 try {
  const a = audio(), t0 = a.currentTime;
  freqs.forEach((f, i) => {
   const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0 + i * gap);
   o.frequency.exponentialRampToValueAtTime(f * 1.35, t0 + i * gap + len);
   g.gain.setValueAtTime(0, t0 + i * gap); g.gain.linearRampToValueAtTime(gain, t0 + i * gap + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + i * gap + len + .08);
   o.connect(g).connect(a.destination); o.start(t0 + i * gap); o.stop(t0 + i * gap + len + .12);
  });
 } catch {}
}
export const bloop = who => tone(who === 'sci' ? [330, 262] : who === 'abbie' ? [660, 880] : [587, 740], {type: 'sine'});
export const pop = () => tone([1100], {len: .05, gain: .04});

const voiceCache = new Map();
async function voiceFor(id) {
 if (!id) return null;
 if (!voiceCache.has(id)) voiceCache.set(id, fetch(`/simulations/demo/voice/${id}.mp3`, {method: 'HEAD'}).then(r => r.ok && /audio/.test(r.headers.get('content-type') || '') ? `/simulations/demo/voice/${id}.mp3` : null).catch(() => null));
 return voiceCache.get(id);
}
function speakAloud(who, text, id, quiet) {
 if (quiet) return Promise.resolve(false);
 return voiceFor(id).then(url => new Promise(res => {
  if (url) { const a = new Audio(url); a.onended = () => res(true); a.onerror = () => res(false); a.play().catch(() => res(false)); return; }
  return res(false); // no synthetic speech
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text); u.pitch = who === 'abbie' ? 1.5 : 1.25; u.rate = 1.05;
  u.onend = () => res(true); u.onerror = () => res(false); synth.speak(u); setTimeout(() => res(false), 9000);
 }));
}

const sleep = s => new Promise(r => setTimeout(r, s * 1000));

export function createChat(host) {
 const el = document.createElement('div'); el.className = 'phone'; el.hidden = true;
 el.innerHTML = '<div class="notch"></div><div class="who"><i></i><b></b></div><div class="log" aria-live="polite"></div>';
 host.appendChild(el);
 const log = el.querySelector('.log'), title = el.querySelector('.who b'), dot = el.querySelector('.who i');
 let last = null, quiet = false;
 const scroll = () => { log.scrollTo({top: log.scrollHeight, behavior: 'smooth'}); };
 return {
  el, setQuiet: q => { quiet = q; },
  show(mode, name) { el.className = 'phone ' + mode; el.hidden = false; title.textContent = name; dot.style.background = mode === 'portrait' ? '#6fe3a5' : '#ff7eb6'; log.innerHTML = ''; requestAnimationFrame(() => el.classList.add('in')); },
  hide() { el.classList.remove('in'); setTimeout(() => { el.hidden = true; }, 500); },
  async say(beat) {
   const c = CAST[beat.who];
   const typing = document.createElement('div'); typing.className = 'row ' + c.side + ' typing'; typing.innerHTML = `<span class="av" style="background:${c.color}">${c.mark}</span><span class="b"><u></u><u></u><u></u></span>`;
   log.appendChild(typing); scroll(); pop();
   await sleep(beat.typing ?? .8);
   typing.remove();
   const row = document.createElement('div'); row.className = 'row ' + c.side; row.innerHTML = `<span class="av" style="background:${c.color}">${c.mark}</span><span class="col"><small>${c.name}</small><span class="b"></span></span>`;
   row.querySelector('.b').textContent = beat.say; log.appendChild(row); scroll(); bloop(beat.who); last = row;
   if (beat.react) { await sleep(.45); const r = document.createElement('span'); r.className = 'react'; r.textContent = beat.react; row.querySelector('.col').appendChild(r); pop(); }
   const spoken = beat.id ? await speakAloud(beat.who, beat.say, beat.id, quiet) : false;
   await sleep(spoken ? .35 : Math.max(1.1, beat.say.length * .04));
  },
  reactToLast(emoji) { if (!last) return; const r = document.createElement('span'); r.className = 'react'; r.textContent = emoji; last.querySelector('.col').appendChild(r); pop(); }
 };
}

export const CSS = `
.phone{position:fixed;z-index:20;display:flex;flex-direction:column;background:#101018;border-radius:38px;padding:10px;box-shadow:0 0 0 2px #2c2c3a,0 20px 60px #0008;opacity:0;transition:opacity .5s,transform .6s cubic-bezier(.2,.9,.3,1.1)}
.phone.in.landscape,.phone.in.portrait{opacity:1;transform:none}
.phone.landscape{right:max(12px,env(safe-area-inset-right));top:50%;width:min(340px,38vw);height:min(560px,82vh);margin-top:calc(min(560px,82vh) / -2);transform:translateX(60px)}
.phone.portrait{right:max(12px,3vw);top:50%;width:min(360px,92vw);height:min(720px,88vh);margin-top:calc(min(720px,88vh) / -2);transform:translateY(40px) scale(.96)}
@media(max-width:900px){.phone.portrait{right:50%;margin-right:calc(min(360px,92vw) / -2)}}
.phone .notch{width:84px;height:20px;background:#000;border-radius:12px;margin:0 auto -4px;position:relative;z-index:2}
.phone .who{display:flex;gap:8px;align-items:center;padding:10px 14px 8px;color:#e8e8f0;font:600 13px system-ui;background:#1b1b26;border-radius:28px 28px 0 0}
.phone .who i{width:10px;height:10px;border-radius:50%}
.phone .log{flex:1;overflow:auto;background:linear-gradient(#f6f1ff,#efe9ff);border-radius:0 0 28px 28px;padding:12px 10px 18px;display:flex;flex-direction:column;gap:9px;scrollbar-width:none}
.phone .log::-webkit-scrollbar{display:none}
.phone .row{display:flex;gap:7px;align-items:flex-end;max-width:92%;animation:rise .28s cubic-bezier(.2,1.4,.4,1) both}
.phone .row.out{align-self:flex-end;flex-direction:row-reverse}
.phone .av{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font:700 12px system-ui}
.phone .col{display:flex;flex-direction:column;position:relative;gap:2px}
.phone small{font:600 10px system-ui;color:#7a7a8c;padding:0 8px}
.phone .b{background:#fff;color:#1d1d29;border-radius:18px 18px 18px 6px;padding:8px 12px;font:15px/1.3 system-ui;box-shadow:0 1px 2px #0002;display:inline-block}
.phone .row.out .b{background:#6fe3a5;border-radius:18px 18px 6px 18px}
.phone .row.in:not(.typing) .b{background:#fff}
.phone .typing .b{display:flex;gap:4px;padding:11px 13px}
.phone .typing u{width:7px;height:7px;border-radius:50%;background:#9a9aae;animation:dot 1s infinite}
.phone .typing u:nth-child(2){animation-delay:.15s}.phone .typing u:nth-child(3){animation-delay:.3s}
.phone .react{position:absolute;right:-6px;bottom:-12px;background:#fff;border-radius:999px;padding:1px 6px;font-size:15px;box-shadow:0 1px 4px #0003;animation:pop .35s cubic-bezier(.2,1.8,.4,1) both}
@keyframes rise{from{opacity:0;transform:translateY(10px) scale(.92)}}
@keyframes dot{0%,60%,100%{transform:none;opacity:.5}30%{transform:translateY(-4px);opacity:1}}
@keyframes pop{from{transform:scale(0)}}
@media(max-width:700px){.phone.landscape{width:min(300px,80vw);height:48vh;top:auto;bottom:10px;margin:0;right:10px;transform:translateY(60px)}}
`;
