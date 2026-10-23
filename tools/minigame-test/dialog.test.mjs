import {dialog} from '../../prototypes/ranch-atelier/dist/simulations/memory-kit/dialog.mjs';
import assert from 'node:assert';
const said = []; let picks = [];
const voice = {say: (t, o) => { said.push(t); picks = o.choices || []; }, hush() { said.push('<hush>'); }};
const acted = [];
const d = dialog(voice, {actions: {open: n => acted.push(n.say || 'open')}, flags: {name: 'Abbie'}});
const script = {start: 'a', nodes: {
 a: {say: 'Hi {name}.', hold: 5, choices: [{label: 'Open it', next: 'b', set: {opened: true}, do: 'open'}, {label: 'Secret', if: 'key', next: 'z'}, {label: 'Leave'}]},
 b: {branch: [{if: ['opened', '!key'], next: 'c'}, {next: 'z'}]},
 c: {say: 'It opened.', hold: 5, next: 'e'}, e: {say: 'End.', hold: 5}, z: {say: 'wrong'}}};
d.run(script);
assert.deepEqual(said, ['Hi Abbie.']); assert.deepEqual(picks.map(c => c.label), ['Open it', 'Leave']);
picks[0].go(); assert.deepEqual(said, ['Hi Abbie.', 'It opened.']); assert.equal(acted.length, 1);
await new Promise(r => setTimeout(r, 30)); assert.ok(said.includes('End.'));
await new Promise(r => setTimeout(r, 30)); assert.equal(d.running, false);
d.run(script); picks[1].go(); assert.equal(d.running, false);
console.log('dialog ok');
