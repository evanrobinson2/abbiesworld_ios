// "Help me find what to do" (Evan, 2026-10-24: "when abbie picks something out of her bag she should be able to see it close up!
// it should look like something, and it should play the message again and it should also then move the camera to where she needs
// to go... abbie is 6.. she needs help"). When she takes a favour's object out of her backpack (window event
// 'aw-inventory-use', fired by inventory.mjs), three things happen in order:
//   1. a close-up of the thing, from the backpack's shared view (backpack.mjs closeUp, no second viewer);
//   2. the favour is said again: a recorded voice when /simulations/quest-voice/<questId>.mp3 exists (ElevenLabs, designed voice),
//      else the device's voice, always with the words as a caption;
//   3. the camera flies to frame the place she goes next, where the spotlight already shines (quest-guide.mjs).
// Each step is its own try: if the close-up is missing the voice and the camera still happen. A reward or anything that is not a
// favour's object does nothing here. Presentation layer: drawn and spoken for the player, invisible to every perception.
//   mountHelper(town)   town = window.AbbieTown, once townsfolk has mounted town.questGuide
import {forItem} from '../quests.mjs?v=2';

export const voiceUrl = questId => `/simulations/quest-voice/${questId}.mp3`;
// What is said: the ask, then the next thing to do.
export const lineFor = f => [f.quest.ask, f.next?.say && `${f.next.say}.`].filter(Boolean).join(' ');

const seen = new Map();
const recorded = id => { if (!seen.has(id)) seen.set(id, fetch(voiceUrl(id), {method: 'HEAD'}).then(r => r.ok && /audio/.test(r.headers.get('content-type') || '') ? voiceUrl(id) : null).catch(() => null)); return seen.get(id); };
let playing = null, cap = null, capTimer = 0;
function caption(text, ms) {
 if (typeof document === 'undefined') return;
 if (!cap) { cap = document.createElement('div'); cap.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:60;max-width:min(560px,90vw);padding:12px 18px;border-radius:18px;background:rgba(255,255,255,.92);color:#2a2622;font:600 17px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 10px 30px rgba(40,30,20,.25);pointer-events:none'; document.body.append(cap); }
 cap.textContent = text; cap.hidden = false; clearTimeout(capTimer); capTimer = setTimeout(() => { cap.hidden = true; }, ms);
}
// Says the line: true if a voice spoke it. Always shows the words.
export async function say(questId, text) {
 caption(text, Math.max(3500, text.length * 85));
 try { playing?.pause?.(); speechSynthesis?.cancel?.(); } catch {}
 const url = await recorded(questId);
 if (url) return new Promise(res => { const a = playing = new Audio(url); a.onended = () => res(true); a.onerror = () => res(false); a.play().catch(() => res(false)); });
 try {
  const u = new SpeechSynthesisUtterance(text); u.rate = .92; u.pitch = 1.25;
  return await new Promise(res => { u.onend = () => res(true); u.onerror = () => res(false); speechSynthesis.speak(u); setTimeout(() => res(false), 12000); });
 } catch { return false; }
}

export async function help(itemId, {town = globalThis.AbbieTown, closeUp, warn = (...a) => console.warn(...a)} = {}) {
 const f = forItem(itemId); if (!f) return null;
 const item = {...f.quest.item, ...(f.quest.item?.id === itemId ? {} : f.quest.reward), from: f.quest.giverName};
 const did = {closeUp: false, said: false, flew: null};
 try { const c = closeUp || (await import('../backpack.mjs')).closeUp; if (c) { await c(item, {actions: [{label: 'Show me where', fn: () => town?.questGuide?.flyToNext()}]}); did.closeUp = true; } else warn('quest help: the backpack has no closeUp yet'); } catch (e) { warn('quest help: close-up', e); }
 try { did.said = await say(f.quest.id, lineFor(f)); } catch (e) { warn('quest help: voice', e); }
 try { did.flew = f.next ? town?.questGuide?.flyToNext() ?? null : null; if (f.next && !did.flew) warn('quest help: no light to fly to for', f.next.at); } catch (e) { warn('quest help: camera', e); }
 return {...f, did};
}

export function mountHelper(town = globalThis.AbbieTown) {
 const h = e => { const id = e.detail?.item?.id; if (id) help(id, {town}); };
 addEventListener('aw-inventory-use', h); return () => removeEventListener('aw-inventory-use', h);
}
