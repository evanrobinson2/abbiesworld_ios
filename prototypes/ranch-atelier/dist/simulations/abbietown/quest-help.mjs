// "Help me find what to do" (Evan, 2026-10-24: "when abbie picks something out of her bag she should be able to see it close up!
// it should look like something, and it should play the message again and it should also then move the camera to where she needs
// to go... abbie is 6.. she needs help"). When she takes a favour's object out of her backpack (window event
// 'aw-inventory-use', fired by inventory.mjs), three things happen in order:
//   1. a close-up of the thing, from the backpack's shared view (backpack.mjs closeUp, no second viewer);
//   2. the favour is said again in the giver's designed ElevenLabs voice (the ask, then the next step), with the words as a caption;
//      a line with no recording yet stays silent (never the browser's voice);
//   3. the camera flies to frame the place she goes next, where the spotlight already shines (quest-guide.mjs).
// Each step is its own try: if the close-up is missing the voice and the camera still happen. A reward or anything that is not a
// favour's object does nothing here. Presentation layer: drawn and spoken for the player, invisible to every perception.
//   mountHelper(town)   town = window.AbbieTown, once townsfolk has mounted town.questGuide
import {forItem} from '../quests.mjs?v=2';

// What is said: the ask, then the next thing to do.
export const lineFor = f => [f.quest.ask, f.next?.say && `${f.next.say}.`].filter(Boolean).join(' ');

let playing = null, cap = null, capTimer = 0;
function caption(text, ms) {
 if (typeof document === 'undefined') return;
 if (!cap) { cap = document.createElement('div'); cap.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:60;max-width:min(560px,90vw);padding:12px 18px;border-radius:18px;background:rgba(255,255,255,.92);color:#2a2622;font:600 17px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 10px 30px rgba(40,30,20,.25);pointer-events:none'; document.body.append(cap); }
 cap.textContent = text; cap.hidden = false; clearTimeout(capTimer); capTimer = setTimeout(() => { cap.hidden = true; }, ms);
}
// Says the line: true if a recorded voice spoke it. The words are always on screen. Voices come only from the designed ElevenLabs
// cast (tools/voice-cast, lines/quests.json), never the browser's own speech: until a line is rendered it is silent.
export const MANIFEST = '/studies/family-cast/lines-quests.json';
let manifest = null;
const lines = () => manifest ||= fetch(MANIFEST).then(r => r.ok ? r.json() : {lines: {}}).catch(() => ({lines: {}}));
const play = url => new Promise(res => { try { const a = playing = new Audio(url); a.onended = () => res(true); a.onerror = () => res(false); a.play().catch(() => res(false)); } catch { res(false); } });
export async function say(ids, text) {
 caption(text, Math.max(3500, text.length * 85));
 try { playing?.pause?.(); } catch {}
 const m = (await lines()).lines || {}; let spoke = false;
 for (const id of [].concat(ids)) { const url = m[id]?.url; if (url) spoke = (await play(url)) || spoke; }
 return spoke;
}

export async function help(itemId, {town = globalThis.AbbieTown, closeUp, warn = (...a) => console.warn(...a)} = {}) {
 const f = forItem(itemId); if (!f) return null;
 const item = {...f.quest.item, ...(f.quest.item?.id === itemId ? {} : f.quest.reward), from: f.quest.giverName};
 const did = {closeUp: false, said: false, flew: null};
 try { const c = closeUp || (await import('../backpack.mjs')).closeUp; if (c) { await c(item, {actions: [{label: 'Show me where', fn: () => town?.questGuide?.flyToNext()}]}); did.closeUp = true; } else warn('quest help: the backpack has no closeUp yet'); } catch (e) { warn('quest help: close-up', e); }
 try { did.said = await say(f.next ? [f.quest.id, `${f.quest.id}-${f.quest.steps.findIndex(x => !x.done)}`] : [f.quest.id], lineFor(f)); } catch (e) { warn('quest help: voice', e); }
 try { did.flew = f.next ? town?.questGuide?.flyToNext() ?? null : null; if (f.next && !did.flew) warn('quest help: no light to fly to for', f.next.at); } catch (e) { warn('quest help: camera', e); }
 return {...f, did};
}

export function mountHelper(town = globalThis.AbbieTown) {
 const h = e => { const id = e.detail?.item?.id; if (id) help(id, {town}); };
 addEventListener('aw-inventory-use', h); return () => removeEventListener('aw-inventory-use', h);
}
