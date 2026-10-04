/**
 * Traversible starship — player walk + room transitions.
 */
import { ROOMS, findRoom, roomWidth, floorY, SHIP, TILE_H, TILE_W } from "./rooms.js";
import { createRenderer } from "./renderer.js";

const canvas = document.getElementById("stage");
const roomNameEl = document.getElementById("roomName");
const deckEl = document.getElementById("deck");
const purposeEl = document.getElementById("purpose");
const shipEl = document.getElementById("ship");

const renderer = createRenderer(canvas);

const keys = new Set();
let room = findRoom("CMD-02");
let actor = {
  x: roomWidth(room) * 0.5,
  facing: 1,
  walkPhase: 0,
  speed: 0,
};
let camX = 0;
let time = 0;
let last = performance.now();
let transitioning = false;

shipEl.textContent = SHIP.name;

function syncHud() {
  roomNameEl.textContent = room.name;
  deckEl.textContent = `DECK ${room.deck} · ${room.id}`;
  purposeEl.textContent = room.purpose;
}

function viewSize() {
  const frame = canvas.parentElement;
  return {
    w: frame.clientWidth,
    h: Math.max(320, frame.clientHeight),
  };
}

function resize() {
  const { w, h } = viewSize();
  renderer.resize(w, h);
}

function tryEnter(side) {
  if (transitioning) return;
  const nextId = room.doors[side];
  if (!nextId) return;
  transitioning = true;
  const next = findRoom(nextId);
  room = next;
  const w = roomWidth(room);
  actor.x = side === "right" ? 110 : w - 110;
  actor.facing = side === "right" ? 1 : -1;
  camX = 0;
  syncHud();
  // brief unlock
  setTimeout(() => {
    transitioning = false;
  }, 180);
}

function update(dt) {
  let input = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) input -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) input += 1;

  const target = input * 220;
  actor.speed += (target - actor.speed) * Math.min(1, dt * 10);
  actor.x += actor.speed * dt;
  if (Math.abs(actor.speed) > 8) {
    actor.walkPhase += dt * 10;
    actor.facing = actor.speed > 0 ? 1 : -1;
  } else {
    actor.walkPhase *= 0.9;
  }

  const w = roomWidth(room);
  const margin = 55;
  if (actor.x < margin) {
    actor.x = margin;
    if (input < 0) tryEnter("left");
  }
  if (actor.x > w - margin) {
    actor.x = w - margin;
    if (input > 0) tryEnter("right");
  }

  // Camera follow for wide rooms
  const view = viewSize();
  const scale = Math.min(view.w / Math.min(w, TILE_W * 1.15), view.h / TILE_H);
  const visibleWorld = view.w / scale;
  if (w > visibleWorld) {
    const targetCam = actor.x - visibleWorld * 0.45;
    camX += (targetCam - camX) * Math.min(1, dt * 6);
    camX = Math.max(0, Math.min(w - visibleWorld, camX));
  } else {
    camX = 0;
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  update(dt);
  const { w, h } = viewSize();
  renderer.render({
    room,
    actor,
    time,
    camX,
    viewW: w,
    viewH: h,
  });
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", (e) => keys.delete(e.key));

// Touch / click: walk toward point; near door edges transition
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const { w, h } = viewSize();
  const scale = Math.min(
    w / Math.min(roomWidth(room), TILE_W * 1.15),
    h / TILE_H
  );
  const worldX = (e.clientX - rect.left) / scale + camX;
  const dest = worldX;
  const dir = dest >= actor.x ? 1 : -1;
  // synthetic hold
  keys.delete("ArrowLeft");
  keys.delete("ArrowRight");
  keys.add(dir > 0 ? "ArrowRight" : "ArrowLeft");
  clearTimeout(canvas._walkTimer);
  canvas._walkTimer = setTimeout(() => {
    keys.delete("ArrowLeft");
    keys.delete("ArrowRight");
  }, Math.min(1800, (Math.abs(dest - actor.x) / 220) * 1000 + 120));
});

document.querySelectorAll("[data-jump]").forEach((btn) => {
  btn.addEventListener("click", () => {
    room = findRoom(btn.dataset.jump);
    actor.x = roomWidth(room) * 0.5;
    camX = 0;
    syncHud();
  });
});

window.addEventListener("resize", resize);
syncHud();
resize();
requestAnimationFrame(frame);

// Expose for smoke tests
export function getState() {
  return { roomId: room.id, x: actor.x, floor: floorY() };
}

export { ROOMS };
