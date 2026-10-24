// The inner voice, shared by every memory place: the girl's thought as a caption at the bottom of the screen in the
// era's font, plain high-contrast white, no outline and no panel, with any choices beneath it like a terminal
// ("> Try the switches"). It is the one text allowed in play (docs/design/INTERACTION_GRAMMAR.md rules 7-8, Evan
// 2026-10-23 09:17Z). Her spoken voice is reserved for a recorded child's voice; {speak: true} tries the device's own.
//
//   const voice = innerVoice({font: 'VT323', onTouch: () => audio()});
//   voice.say("It's dark in here...", {choices: [{label: 'Try the switches', go}], hold: ms});
//   voice.once(id, text, opts); voice.hush(); voice.thought  (null, or {text, until, choices});
//   each frame: voice.tick(performance.now())   (a thought without choices fades once read)
export function innerVoice({font = 'VT323', size = 28, speak = false, onTouch = () => {}} = {}) {
 const style = document.createElement('style');
 style.textContent = `
.aw-caption{position:fixed;left:50%;bottom:calc(max(18px,env(safe-area-inset-bottom)) + var(--aw-chh,0px));transform:translateX(-50%);
 width:min(92vw,720px);font:${size}px/1.1 ${font},ui-monospace,monospace;color:#fff;text-align:left;pointer-events:none;
 opacity:0;transition:opacity .25s;white-space:pre-wrap;letter-spacing:.02em;z-index:5}
.aw-caption.on{opacity:1}
.aw-choices{position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(92vw,720px);
 display:flex;flex-direction:column;align-items:flex-start;pointer-events:none;opacity:0;transition:opacity .25s;z-index:5}
.aw-choices.on{opacity:1}
.aw-choices.on .aw-choice{pointer-events:auto}
.aw-choice{border:0;background:none;padding:4px 0;margin:0;cursor:pointer;color:#fff;font:${size}px/1.1 ${font},ui-monospace,monospace;text-align:left;
 min-height:40px;pointer-events:none;letter-spacing:.02em}
.aw-choice::before{content:"> "}
.aw-choice:hover,.aw-choice:focus-visible,.aw-choice:active{background:#fff;color:#000;outline:none}`;
 document.head.append(style);
 const line = Object.assign(document.createElement('div'), {className: 'aw-caption'}), list = Object.assign(document.createElement('div'), {className: 'aw-choices'});
 line.setAttribute('aria-live', 'polite'); document.body.append(line, list);
 let device = null, ready = false, pending = null;
 const pick = () => { const vs = window.speechSynthesis?.getVoices?.() || [], en = vs.filter(v => /en[-_]US/i.test(v.lang));
  device = en.find(v => /Samantha|Ava|Allison|Susan|Aria|Jenny|Google US English/i.test(v.name)) || en[0] || null; };
 try { pick(); speechSynthesis.onvoiceschanged = pick; } catch {}
 const talk = text => { if (!ready) { pending = text; return; } /* text only: no synthetic speech */ };
 const unlock = () => { if (ready) return; ready = true; if (pending && voice.thought) talk(pending); pending = null; };
 addEventListener('pointerdown', unlock, {capture: true}); addEventListener('keydown', unlock, {capture: true});
 const seen = new Set();
 const voice = {
  thought: null,
  say(text, {choices = null, hold = 0} = {}) {
   voice.thought = {text, until: performance.now() + (hold || Math.max(3200, text.length * 85)), choices};
   line.textContent = text; line.classList.add('on');
   list.replaceChildren(...(choices || []).map(c => { const b = Object.assign(document.createElement('button'), {className: 'aw-choice', textContent: c.label});
    b.addEventListener('pointerdown', e => { e.stopPropagation(); onTouch(); voice.hush(); c.go(); }); return b; }));
   list.classList.toggle('on', !!choices);
   document.documentElement.style.setProperty('--aw-chh', choices ? list.offsetHeight + 8 + 'px' : '0px');
   if (speak) talk(text);
  },
  once(id, text, o) { if (seen.has(id)) return; seen.add(id); voice.say(text, o); },
  heard: id => seen.has(id), mark: id => seen.add(id),
  hush() { voice.thought = null; line.classList.remove('on'); list.classList.remove('on'); },
  tick(now) { if (voice.thought && now > voice.thought.until && !voice.thought.choices) voice.hush(); },
 };
 return voice;
}
