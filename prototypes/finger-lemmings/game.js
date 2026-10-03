/**
 * Finger Lemmings — pixel-art render + finger light control.
 * Limited palette, nearest-neighbor upscale, chunky sprites.
 */
import {
  createGame,
  stepGame,
  placeLight,
  toggleLight,
  restartLevel,
  nextLevel,
  TILE,
  LEVELS,
} from "./sim.js";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const savedEl = document.getElementById("saved");
const needEl = document.getElementById("need");
const lostEl = document.getElementById("lost");
const levelEl = document.getElementById("levelName");
const statusEl = document.getElementById("status");
const banner = document.getElementById("banner");
const bannerTitle = document.getElementById("bannerTitle");
const bannerBody = document.getElementById("bannerBody");

const PX = 4; // logical pixel size inside a TILE (TILE=40 → 10×10 cells)
const PAL = {
  void: "#0c0a10",
  floorA: "#1a1520",
  floorB: "#17131c",
  wall: "#3a4658",
  wallHi: "#5a6a80",
  wallLo: "#262e3a",
  hazard: "#4a1010",
  hazardCore: "#e45a5a",
  hazardHot: "#ff9a6a",
  home: "#1a3a28",
  homeHi: "#6fd08a",
  homeMark: "#b8f0c8",
  light: "#fff3c4",
  lightMid: "#ffb24a",
  lightDim: "#8a5a20",
  lampBody: "#4a4a54",
  lampBodyOff: "#2e2e36",
  lampHandle: "#3a2414",
  lampBezel: "#6a6a74",
  lampLensOff: "#101014",
  spawn: "#5a3a18",
  ink: "#1a120c",
};

let game = createGame(0);
let last = performance.now();
let pointerDown = false;
let dragOrigin = null;
let didDrag = false;
let buffer = null;
let bctx = null;
const DRAG_PX = 10;

function ensureBuffer() {
  const w = game.level.pixelW;
  const h = game.level.pixelH;
  if (!buffer || buffer.width !== w || buffer.height !== h) {
    buffer = document.createElement("canvas");
    buffer.width = w;
    buffer.height = h;
    bctx = buffer.getContext("2d");
  }
  return bctx;
}

function resize() {
  const frame = canvas.parentElement;
  const scale = Math.max(
    1,
    Math.floor(
      Math.min(
        frame.clientWidth / game.level.pixelW,
        frame.clientHeight / game.level.pixelH
      )
    )
  );
  const cssW = game.level.pixelW * scale;
  const cssH = game.level.pixelH * scale;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = cssW;
  canvas.height = cssH;
  ctx.imageSmoothingEnabled = false;
  ensureBuffer();
}

function worldPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * game.level.pixelW,
    y: ((clientY - rect.top) / rect.height) * game.level.pixelH,
  };
}

function px(n) {
  return Math.floor(n / PX) * PX;
}

function fillPx(c, x, y, w = PX, h = PX) {
  c.fillRect(x, y, w, h);
}

function drawBrick(c, px0, py0) {
  c.fillStyle = PAL.wall;
  fillPx(c, px0, py0, TILE, TILE);
  c.fillStyle = PAL.wallHi;
  fillPx(c, px0, py0, TILE, PX);
  fillPx(c, px0, py0, PX, TILE);
  c.fillStyle = PAL.wallLo;
  fillPx(c, px0, py0 + TILE - PX, TILE, PX);
  fillPx(c, px0 + TILE - PX, py0, PX, TILE);
  // mortar seam
  c.fillStyle = PAL.wallLo;
  fillPx(c, px0 + TILE / 2 - PX / 2, py0 + PX * 2, PX, TILE - PX * 4);
  fillPx(c, px0 + PX * 2, py0 + TILE / 2 - PX / 2, TILE / 2 - PX * 2, PX);
}

function drawHazard(c, px0, py0) {
  c.fillStyle = PAL.hazard;
  fillPx(c, px0, py0, TILE, TILE);
  const cx = px0 + TILE / 2 - PX * 2;
  const cy = py0 + TILE / 2 - PX;
  c.fillStyle = PAL.hazardCore;
  fillPx(c, cx, cy, PX * 4, PX * 2);
  fillPx(c, cx + PX, cy - PX, PX * 2, PX * 4);
  c.fillStyle = PAL.hazardHot;
  fillPx(c, cx + PX, cy, PX * 2, PX);
  // blink sparkle
  if (Math.floor(game.time * 6) % 2 === 0) {
    c.fillStyle = PAL.light;
    fillPx(c, cx + PX, cy, PX, PX);
  }
}

function drawHome(c) {
  const gx = px(game.goal.x - TILE / 2);
  const gy = px(game.goal.y - TILE / 2);
  const pulse = Math.floor(game.time * 4) % 2 === 0;
  c.fillStyle = PAL.home;
  fillPx(c, gx, gy, TILE, TILE);
  c.fillStyle = pulse ? PAL.homeHi : PAL.homeMark;
  // door arch (pixel)
  fillPx(c, gx + PX * 2, gy + PX, TILE - PX * 4, TILE - PX * 2);
  c.fillStyle = PAL.void;
  fillPx(c, gx + PX * 3, gy + PX * 2, TILE - PX * 6, TILE - PX * 3);
  c.fillStyle = PAL.homeMark;
  // tiny H marker
  fillPx(c, gx + PX * 3, gy + PX * 3, PX, PX * 3);
  fillPx(c, gx + TILE - PX * 4, gy + PX * 3, PX, PX * 3);
  fillPx(c, gx + PX * 4, gy + PX * 4, TILE - PX * 8, PX);
}

function drawSpawn(c) {
  const sx = px(game.spawn.x - PX * 2);
  const sy = px(game.spawn.y - PX * 2);
  c.fillStyle = PAL.spawn;
  fillPx(c, sx, sy, PX * 4, PX);
  fillPx(c, sx + PX, sy - PX, PX * 2, PX * 3);
}

function drawLevel(c) {
  const { level } = game;
  c.fillStyle = PAL.void;
  c.fillRect(0, 0, level.pixelW, level.pixelH);

  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const kind = level.tiles[y][x];
      const px0 = x * TILE;
      const py0 = y * TILE;
      if (kind === "wall") {
        drawBrick(c, px0, py0);
      } else if (kind === "hazard") {
        drawHazard(c, px0, py0);
      } else {
        c.fillStyle = (x + y) % 2 === 0 ? PAL.floorA : PAL.floorB;
        fillPx(c, px0, py0, TILE, TILE);
      }
    }
  }

  drawSpawn(c);
  drawHome(c);
}

function drawGlow(c, lx, ly, r) {
  const bands = [
    { d: r, color: "rgba(255,178,74,0.16)" },
    { d: r * 0.62, color: "rgba(255,178,74,0.28)" },
    { d: r * 0.36, color: "rgba(255,210,120,0.42)" },
    { d: r * 0.18, color: "rgba(255,243,196,0.62)" },
  ];
  for (const band of bands) {
    const half = Math.max(PX * 2, Math.floor(band.d / PX) * PX);
    c.fillStyle = band.color;
    for (let dy = -half; dy <= half; dy += PX) {
      const row = half - Math.abs(dy);
      c.fillRect(lx - row, ly + dy, row * 2 + PX, PX);
    }
  }
}

// Chunky side-view flashlight. Lens sits on the light origin.
// . empty  k outline  h handle  b barrel  z bezel  l lens
const FLASH_SPRITE = [
  "..kkkkkkkkk...",
  ".khhbbbbbzzkk.",
  "khhhbbbbbzzllk",
  "khhhbbbbbzzllk",
  ".khhbbbbbzzkk.",
  "..kkkkkkkkk...",
];

function spriteColor(ch, on) {
  if (ch === "k") return "#0a080c";
  if (ch === "h") return on ? "#8a5a28" : "#6a441c";
  if (ch === "b") return on ? "#d0d0da" : "#9a9aa6";
  if (ch === "z") return on ? "#f0f0f6" : "#c8c8d2";
  if (ch === "l") return on ? PAL.light : "#2a3344";
  return null;
}

function drawFlashlight(c) {
  const L = game.light;
  const lx = px(L.x);
  const ly = px(L.y);
  const on = L.active;

  if (on) drawGlow(c, lx, ly, L.radius);

  const rows = FLASH_SPRITE;
  const cols = rows[0].length;
  const ox = lx - PX * (cols - 3);
  const oy = ly - PX * Math.floor(rows.length / 2);

  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < cols; x++) {
      const color = spriteColor(rows[y][x], on);
      if (!color) continue;
      c.fillStyle = color;
      fillPx(c, ox + x * PX, oy + y * PX);
    }
  }

  // Dim glass glint even when off, so the lamp reads as a tool
  c.fillStyle = on ? PAL.lightMid : "#6a8098";
  fillPx(c, lx, ly - PX, PX, PX);
}

function hueToPixel(hue, lit) {
  // Map soft-ish hues to a tiny fixed palette
  if (hue < 36) return lit ? "#ffc86a" : "#d4883a";
  if (hue < 48) return lit ? "#ffe08a" : "#c8a048";
  return lit ? "#f0d070" : "#b89040";
}

function drawDotSprite(c, dot) {
  const x = px(dot.x - PX * 2);
  const y = px(dot.y - PX * 2);
  const lit = dot.follow > 0.2;
  const body = hueToPixel(dot.hue, lit);
  const alpha = dot.state === "saved" ? 0.3 : 1;
  c.globalAlpha = alpha;

  // body 4×4 px
  c.fillStyle = body;
  fillPx(c, x + PX, y, PX * 2, PX);
  fillPx(c, x, y + PX, PX * 4, PX * 2);
  fillPx(c, x + PX, y + PX * 3, PX * 2, PX);

  // eyes
  if (dot.state === "live") {
    c.fillStyle = PAL.ink;
    const look =
      game.light.active && Math.abs(game.light.x - dot.x) > 2
        ? game.light.x > dot.x
          ? 1
          : -1
        : 0;
    fillPx(c, x + PX + look, y + PX, PX, PX);
    fillPx(c, x + PX * 2 + look, y + PX, PX, PX);

    // follow sparkle
    if (lit && Math.floor(game.time * 8 + dot.id) % 2 === 0) {
      c.fillStyle = PAL.light;
      fillPx(c, x + PX, y - PX, PX, PX);
    }
  }

  c.globalAlpha = 1;
}

function drawDots(c) {
  for (const dot of game.dots) {
    if (dot.state === "lost") continue;
    drawDotSprite(c, dot);
  }
}

function syncHud() {
  savedEl.textContent = String(game.saved);
  needEl.textContent = String(game.level.need);
  lostEl.textContent = String(game.lost);
  levelEl.textContent = `${game.levelIndex + 1}. ${game.level.name.toUpperCase()}`;
  statusEl.textContent = String(game.message || "").toUpperCase();

  if (game.status === "won" || game.status === "lost") {
    banner.hidden = false;
    bannerTitle.textContent = game.status === "won" ? "SAFE" : "OH NO";
    bannerBody.textContent = game.message;
    document.getElementById("nextBtn").hidden =
      game.status !== "won" || game.levelIndex >= LEVELS.length - 1;
  } else {
    banner.hidden = true;
  }
}

function render() {
  const c = ensureBuffer();
  drawLevel(c);
  drawDots(c);
  drawFlashlight(c);

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height);
  syncHud();
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  stepGame(game, dt);
  render();
  requestAnimationFrame(frame);
}

function onPointerDown(e) {
  e.preventDefault();
  const p = worldPoint(e.clientX, e.clientY);
  pointerDown = true;
  didDrag = false;
  dragOrigin = p;
  canvas.setPointerCapture?.(e.pointerId);
  placeLight(game, p.x, p.y);
}

function onPointerMove(e) {
  if (!pointerDown || !dragOrigin) return;
  const p = worldPoint(e.clientX, e.clientY);
  if (Math.hypot(p.x - dragOrigin.x, p.y - dragOrigin.y) > DRAG_PX) {
    didDrag = true;
  }
  placeLight(game, p.x, p.y);
}

function onPointerUp() {
  if (!pointerDown) return;
  pointerDown = false;
  if (!didDrag) toggleLight(game);
  dragOrigin = null;
}

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);

document.getElementById("restart").addEventListener("click", () => {
  game = restartLevel(game);
  resize();
});

document.getElementById("retryBtn").addEventListener("click", () => {
  game = restartLevel(game);
  resize();
});

document.getElementById("nextBtn").addEventListener("click", () => {
  game = nextLevel(game);
  resize();
});

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);
