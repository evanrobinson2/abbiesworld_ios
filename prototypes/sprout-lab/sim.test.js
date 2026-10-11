/**
 * Headless smoke: sprout grows and scene controls work.
 * Run: node sim.test.js
 */
import { createWorld, stepWorld, moveLight, restartWorld } from "./sim.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const world = createWorld();
assert(world.sprout.nodes.length === 1, "starts as seed");
assert(world.structures.length >= 4, "default trellis present");

for (let i = 0; i < 900; i++) stepWorld(world, 1 / 30);
assert(world.sprout.nodes.length > 30, `grew segments (${world.sprout.nodes.length})`);
assert(world.sprout.length > 60, "accumulated length");
assert(world.sprout.nodes.at(-1).y < world.sprout.nodes[0].y, "grew upward overall");

moveLight(world, 120, 160);
assert(world.light.x === 120 && world.light.y === 160, "light relocates");

const again = restartWorld(world);
assert(again.sprout.nodes.length === 1, "restart reseeds");
assert(again.light.x === 120, "restart keeps light");
assert(again.structures.length === world.structures.length, "restart keeps structures");

console.log("sprout-lab sim.test.js OK", {
  nodes: world.sprout.nodes.length,
  attached: world.sprout.attachedTo,
  energy: Number(world.sprout.energy.toFixed(2)),
  tendrils: world.sprout.tendrils.length,
});
