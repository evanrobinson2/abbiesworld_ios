import test from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../quests.mjs';

const mem = () => { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v)}; };

test('every template points at a real giver and has steps and a backpack reward', () => {
 for (const t of Q.TEMPLATES) {
  assert.ok(Q.GIVERS[t.giver], t.id); assert.ok(t.steps.length && t.reward.id && t.reward.name, t.id);
  assert.ok(t.steps.every(s => s.do && Q.GIVERS[t.giver] && (!s.at || s.at)), t.id);
 }
 assert.equal(new Set(Q.TEMPLATES.map(t => t.id)).size, Q.TEMPLATES.length);
 assert.ok(!Q.TEMPLATES.some(t => /coin/i.test(t.reward.id + t.reward.name)), 'no coin rewards');
});
test('an ask is sticky until answered, then she is offered something else', () => {
 Q.useStore(mem());
 const a = Q.offer('baker', () => 0), again = Q.offer('baker', () => .99);
 assert.equal(a.id, again.id);
 Q.accept(a.id);
 assert.notEqual(Q.offer('baker').id, a.id);
});
test('a giver with nothing left offers nothing', () => {
 Q.useStore(mem());
 Q.accept('post-letter'); assert.equal(Q.offer('postie'), null);
});
test('steps tick off in order and finishing marks the quest done', () => {
 Q.useStore(mem());
 Q.accept('bake-sugar');
 assert.deepEqual(Q.report({did: 'visit', at: 'cafe'}), []); // the wrong step first does nothing
 assert.equal(Q.open()[0].steps.filter(s => s.done).length, 0);
 Q.report({did: 'visit', at: 'common'});
 assert.equal(Q.open()[0].steps.filter(s => s.done).length, 1);
 const fin = Q.report({did: 'visit', at: 'cafe'});
 assert.equal(fin.length, 1); assert.equal(Q.done()[0].id, 'bake-sugar'); assert.equal(Q.open().length, 0);
});
test('list puts open quests before finished ones', () => {
 Q.useStore(mem());
 Q.accept('post-letter'); Q.report({did: 'visit', at: 'cafe'}); Q.accept('bake-sugar');
 assert.deepEqual(Q.list().map(q => q.status), ['open', 'done']);
});
test('decline lets the giver ask something different', () => {
 Q.useStore(mem());
 const a = Q.offer('baker', () => 0); assert.ok(Q.decline('baker'));
 assert.notEqual(Q.offer('baker', () => .99).id, a.id);
});
