/**
 * Headless smoke + scripted escort to HOME.
 * Run: node sim.test.js
 */
import { createGame, stepGame, setLight, placeLight, toggleLight, TILE } from "./sim.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function center(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

const game = createGame(0);
assert(game.level.spawns.length === 1, "has spawn");
assert(game.level.goals.length === 1, "has goal");

const path = [
  center(1, 1),
  center(6, 1),
  center(12, 1),
  center(12, 3),
  center(12, 5),
  center(11, 5),
];

for (const p of path) {
  setLight(game, p.x, p.y, true);
  for (let i = 0; i < 90; i++) stepGame(game, 1 / 30);
}
setLight(game, game.goal.x, game.goal.y, true);
for (let i = 0; i < 180; i++) stepGame(game, 1 / 30);

assert(game.dots.length > 0, "spawned dots");
assert(game.saved >= 1, `at least one saved (got ${game.saved})`);

const placed = createGame(0);
assert(placed.light.active === false, "starts unlit");
const parkedX = placed.light.x;
const parkedY = placed.light.y;
placeLight(placed, 140, 90);
assert(placed.light.x === 140 && placed.light.y === 90, "place moves lamp");
assert(placed.light.active === false, "place does not turn lamp on");
toggleLight(placed);
assert(placed.light.active === true, "click toggles on");
toggleLight(placed);
assert(placed.light.active === false, "click toggles off");
assert(placed.light.x === 140, "toggle keeps placement");
assert(parkedX !== 140 || parkedY !== 90, "moved from spawn park");

const g2 = createGame(1);
assert(g2.level.hazards.length > 0, "level 2 has hazards");

console.log("finger-lemmings sim.test.js OK", {
  dots: game.dots.length,
  saved: game.saved,
  lost: game.lost,
  status: game.status,
});
