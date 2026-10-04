/**
 * Smoke test for room pack + width helpers.
 */
import { ROOMS, findRoom, roomWidth, TILE_W, floorY } from "./rooms.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(ROOMS.length === 6, "six sample rooms");
assert(findRoom("SCI-04").purpose.includes("Sample"), "sci purpose");
assert(roomWidth(findRoom("ENG-01")) === TILE_W * 2, "eng is 2x");
assert(roomWidth(findRoom("CMD-02")) === TILE_W, "cmd is 1x");
assert(floorY() > 400, "floor band");

const ids = new Set(ROOMS.map((r) => r.id));
for (const r of ROOMS) {
  assert(ids.has(r.doors.left), `${r.id} left door ok`);
  assert(ids.has(r.doors.right), `${r.id} right door ok`);
}

console.log("starship-rooms rooms.test.js OK", {
  rooms: ROOMS.map((r) => r.id),
});
