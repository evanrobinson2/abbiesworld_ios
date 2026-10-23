import test from 'node:test';
import assert from 'node:assert/strict';
import { foundHeadland } from '../hexcity/headland.mjs';
import { simulate, NEEDS } from '../hexcity/hexcity.mjs';
import { facts, stewardLine } from '../hexcity/advisor.mjs';

test('the headland has a spring above a sheltered bay and the founders settle safe of floods and storms', () => {
 const { land, founding } = foundHeadland(3), i = founding.site;
 assert.ok(land.spring.lps > 4 && land.spring.h > 25);
 assert.ok(land.h[i] >= 2.5 && land.above[i] >= land.flood(i) && land.slope[i] <= .12);
 assert.ok(founding.log.some(l => /They settle/.test(l)));
});
test('the hex city grows through all four kinds of household, deterministically', () => {
 const { land, founding } = foundHeadland(3);
 const a = simulate(land, founding, { years: 80 }), b = simulate(land, founding, { years: 80 });
 assert.equal(a.tile.hexes.length, 217);
 assert.deepEqual(a.years.at(-1).byKind, b.years.at(-1).byKind);
 const last = a.years.at(-1); assert.ok(last.pop > 800); assert.ok(last.byKind[4] > 0);
 assert.ok(a.aqueduct && a.aqueduct.level > 0);
 // gravity: no fountain stands above the level the channel arrives at
 for (let i = 0; i < a.tile.hexes.length; i++) if (last.work[i] >= 0 && ['fountain', 'bath'].includes(['well', 'fountain', 'castellum', 'market', 'harbour', 'mill', 'bakery', 'press', 'carpenter', 'weaver', 'kiln', 'bath', 'school', 'watch', 'temple', 'theatre', 'garden'][last.work[i]])) assert.ok(a.tile.hexes[i].h < a.aqueduct.level);
 assert.ok(NEEDS[4].includes('theatre'));
});
test('the steward speaks only from the fact sheet', () => {
 const { land, founding } = foundHeadland(3), st = simulate(land, founding, { years: 40 }), f = facts(st, 40);
 assert.ok(JSON.stringify(f).length < 4000);
 assert.match(stewardLine(f, 'how are we doing?'), new RegExp(f.people.toLocaleString('en-US')));
});
