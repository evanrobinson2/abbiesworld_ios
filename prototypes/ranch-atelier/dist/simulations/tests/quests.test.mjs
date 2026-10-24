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

// ---- physical favours (issue #531): the object is a real backpack item she picks up, carries and hands over ----
const bag = () => { let l = []; return {add: i => (l.some(x => x.id === i.id) ? false : (l.push(i), i)), has: id => l.some(x => x.id === id), remove: id => { const n = l.filter(x => x.id !== id); const r = n.length !== l.length; l = n; return r; }, list: () => l}; };
test('every object favour names its item and a step that picks it up (or the giver hands it over)', () => {
 for (const t of Q.TEMPLATES.filter(t => t.item)) {
  assert.ok(t.item.id && t.item.name && t.item.icon, t.id);
  const bring = t.steps.find(s => s.do === 'bring'), collect = t.steps.find(s => s.do === 'collect');
  assert.equal(bring?.item, t.item.id, t.id);
  assert.ok(t.item.given ? !collect : collect?.item === t.item.id, t.id);
 }
});
test('collect puts the object in the backpack, bring takes it out and finishes with the reward', async () => {
 Q.useStore(mem()); const b = bag(); Q.useInventory(b);
 Q.accept('bake-sugar');
 assert.equal(b.has('quest-sugar'), false);
 assert.deepEqual(Q.targets().map(x => [x.at, x.do]), [['common', 'collect']]);
 Q.report({did: 'visit', at: 'cafe'}); assert.equal(Q.open()[0].steps[0].done, false); // not there yet
 Q.report({did: 'visit', at: 'common'});
 assert.ok(b.has('quest-sugar')); assert.equal(Q.open()[0].item.carrying, true);
 assert.deepEqual(Q.targets().map(x => [x.at, x.do]), [['cafe', 'bring']]);
 assert.equal(Q.report({did: 'visit', at: 'cafe'}).length, 1);
 assert.equal(b.has('quest-sugar'), false); // handed over
 await new Promise(r => setTimeout(r, 0));
 assert.ok(b.has('quest-bun')); assert.equal(Q.targets().length, 0);
});
test('the giver hands over the object as she says yes, and it must be delivered', () => {
 Q.useStore(mem()); const b = bag(); Q.useInventory(b);
 Q.accept('post-letter'); assert.ok(b.has('quest-letter'));
 assert.deepEqual(Q.targets().map(x => x.at), ['cafe']);
 b.remove('quest-letter'); // dropped or lost
 assert.deepEqual(Q.report({did: 'visit', at: 'cafe'}), []); // nothing to hand over, so nothing ticks
 assert.equal(Q.open().length, 1);
});
test('losing the object on the way: the pick-up place hands it over again', () => {
 Q.useStore(mem()); const b = bag(); Q.useInventory(b);
 Q.accept('teach-chalk'); Q.report({did: 'visit', at: 'noticeboard'}); b.remove('quest-chalk');
 assert.deepEqual(Q.report({did: 'visit', at: 'school'}), []); assert.equal(b.has('quest-chalk'), false);
 Q.report({did: 'visit', at: 'noticeboard'}); assert.ok(b.has('quest-chalk'));
 assert.equal(Q.report({did: 'visit', at: 'school'}).length, 1);
});

test('the town lights the place each open favour needs next: gold to collect, green to deliver', async () => {
 const {lights} = await import('../abbietown/quest-guide.mjs');
 Q.useStore(mem()); const b = bag(); Q.useInventory(b);
 assert.deepEqual(lights(), []);
 Q.accept('bake-sugar'); Q.accept('teach-chalk');
 assert.deepEqual(lights().map(l => [l.at, l.do]).sort(), [['common', 'collect'], ['noticeboard', 'collect']]);
 Q.report({did: 'visit', at: 'common'});
 assert.deepEqual(lights().map(l => [l.at, l.do]).sort(), [['cafe', 'bring'], ['noticeboard', 'collect']]);
 Q.report({did: 'visit', at: 'cafe'}); Q.report({did: 'visit', at: 'noticeboard'});
 assert.deepEqual(lights().map(l => [l.at, l.do]).sort(), [['school', 'bring']]);
});
