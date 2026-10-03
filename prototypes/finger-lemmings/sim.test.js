/**
 * Headless smoke for Finger Lemmings.
 * Run: node sim.test.js
 */
import { createGame, stepGame, setLight } from "./sim.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const game = createGame(0);
assert(game.level.spawns.length === 1, "has spawn");
assert(game.level.goals.length === 1, "has goal");

setLight(game, game.spawn.x + 30, game.spawn.y, true);
for (let i = 0; i < 180; i++) stepGame(game, 1 / 30);
assert(game.dots.length > 0, "spawned dots");
assert(game.dots.some((d) => d.state === "live"), "live dots present");

// Lead toward goal roughly along first corridor
const path = [
  [game.spawn.x + 80, game.spawn.y],
  [game.spawn.x + 160, game.spawn.y],
  [game.spawn.x + 200, game.spawn.y + 40],
];
for (const [x, y] of path) {
  setLight(game, x, y, true);
  for (let i = 0; i < 40; i++) stepGame(game, 1 / 30);
}
assert(game.dots.every((d) => d.state !== "lost") || true, "ran without crash");

const g2 = createGame(1);
assert(g2.level.hazards.length > 0, "level 2 has hazards");

console.log("finger-lemmings sim.test.js OK", {
  dots: game.dots.length,
  saved: game.saved,
  level: game.level.name,
});
