// Dialog scripts for every memory place: plain JSON that the inner voice speaks, so a place's story can be written
// (and later translated, voiced or edited) without touching its game code. Built on inner-voice.mjs.
//
//   import {innerVoice} from './inner-voice.mjs'; import {dialog} from './dialog.mjs';
//   const talk = dialog(innerVoice({font: 'VT323'}), {actions: {openDoor: () => ...}, key: 'aw-moon-dialog'});
//   talk.run(script);            // starts at script.start
//   talk.run(script, 'node-id'); // or anywhere
//
// A script is {start, nodes: {id: node}}. A node is:
//   say      the line (shown as her caption), hold  ms to keep it up (default: by length)
//   choices  [{label, next, if, set, do}]  tappable "> label" lines; a choice with no next ends the talk
//   next     where to go once the line has been read (no choices), omit to end
//   branch   [{if, next}]  first branch whose condition holds wins (put {next} last as the default); no line is shown
//   set      {flag: value}  runs when the node is shown;  do  names an action from `actions`, called with the node
//   once     true: the node is skipped (its `next` is taken) after it has been heard once, across visits
// Conditions (`if`): "flag" (truthy), "!flag", "flag=value", or an array of these that must all hold.
// Flags live in memory and, with `key`, in localStorage, so a talk can remember what was said last visit.
// The line may use {flag} to say a flag's value. Nothing here draws anything: it only calls voice.say().
export function dialog(voice, {actions = {}, key = '', flags = {}} = {}) {
 const state = {flags: {...flags}, heard: {}};
 if (key) try { Object.assign(state, JSON.parse(localStorage.getItem(key) || '{}')); } catch {}
 const save = () => { if (key) try { localStorage.setItem(key, JSON.stringify(state)); } catch {} };
 const holds = c => { const [name, want] = String(c).split('='); const neg = name.startsWith('!'), v = state.flags[neg ? name.slice(1) : name];
  return want === undefined ? (neg ? !v : !!v) : String(v) === want; };
 const ok = c => c === undefined || [].concat(c).every(holds);
 const fill = t => String(t).replace(/\{(\w+)\}/g, (m, k) => state.flags[k] ?? '');
 let timer = 0, current = null;
 const api = {
  flags: state.flags,
  set(k, v) { state.flags[k] = v; save(); },
  get running() { return !!current; },
  stop() { clearTimeout(timer); current = null; voice.hush(); },
  run(script, id = script.start) {
   clearTimeout(timer); current = script;
   const node = script.nodes[id];
   if (!node) { current = null; return; }
   if (node.once && state.heard[`${key}:${id}`]) return node.next ? api.run(script, node.next) : (current = null, undefined);
   if (node.set) Object.assign(state.flags, node.set);
   if (node.do) actions[node.do]?.(node, api);
   if (node.branch) { const b = node.branch.find(x => ok(x.if)); save(); return b?.next ? api.run(script, b.next) : (current = null, undefined); }
   state.heard[`${key}:${id}`] = true; save();
   const choices = (node.choices || []).filter(c => ok(c.if)).map(c => ({label: fill(c.label), go: () => {
    if (c.set) { Object.assign(state.flags, c.set); save(); }
    if (c.do) actions[c.do]?.(c, api);
    c.next ? api.run(script, c.next) : api.stop();
   }}));
   const hold = node.hold || Math.max(3200, String(node.say || '').length * 85);
   if (node.say) voice.say(fill(node.say), {choices: choices.length ? choices : null, hold});
   if (!choices.length) timer = setTimeout(() => node.next ? api.run(script, node.next) : api.stop(), node.say ? hold : 0);
  },
 };
 return api;
}
