/**
 * Finger Lemmings — canvas render + finger light control.
 */
import {
  createGame,
  stepGame,
  setLight,
  clearLight,
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

let game = createGame(0);
let last = performance.now();
let pointerDown = false;

function resize() {
  const frame = canvas.parentElement;
  const scale = Math.min(
    frame.clientWidth / game.level.pixelW,
    frame.clientHeight / game.level.pixelH
  );
  const cssW = game.level.pixelW * scale;
  const cssH = game.level.pixelH * scale;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(
    (cssW * dpr) / game.level.pixelW,
    0,
    0,
    (cssH * dpr) / game.level.pixelH,
    0,
    0
  );
}

function worldPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * game.level.pixelW,
    y: ((clientY - rect.top) / rect.height) * game.level.pixelH,
  };
}

function drawLevel() {
  const { level } = game;
  // Chamber backdrop
  const g = ctx.createLinearGradient(0, 0, 0, level.pixelH);
  g.addColorStop(0, "#14181f");
  g.addColorStop(1, "#1c1712");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, level.pixelW, level.pixelH);

  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const kind = level.tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (kind === "wall") {
        ctx.fillStyle = "#2a3340";
        ctx.fillRect(px, py, TILE + 0.5, TILE + 0.5);
        ctx.fillStyle = "rgba(255,220,170,0.05)";
        ctx.fillRect(px + 3, py + 3, TILE - 6, 4);
      } else if (kind === "hazard") {
        ctx.fillStyle = "#1a0e0c";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "rgba(220, 70, 50, 0.55)";
        ctx.beginPath();
        ctx.ellipse(px + TILE / 2, py + TILE / 2, 11, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 140, 90, 0.35)";
        ctx.beginPath();
        ctx.ellipse(px + TILE / 2, py + TILE / 2 - 1, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.04)";
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }

  // Goal
  const pulse = 0.55 + Math.sin(game.time * 3) * 0.2;
  const gx = game.goal.x;
  const gy = game.goal.y;
  const goalGlow = ctx.createRadialGradient(gx, gy, 4, gx, gy, TILE);
  goalGlow.addColorStop(0, `rgba(120, 220, 160, ${0.45 * pulse})`);
  goalGlow.addColorStop(1, "rgba(120, 220, 160, 0)");
  ctx.fillStyle = goalGlow;
  ctx.beginPath();
  ctx.arc(gx, gy, TILE, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(160, 240, 190, ${0.7 * pulse})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(gx, gy, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#b8f0c8";
  ctx.font = "700 11px Manrope, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("HOME", gx, gy + 4);

  // Spawn marker
  ctx.fillStyle = "rgba(255, 190, 110, 0.25)";
  ctx.beginPath();
  ctx.arc(game.spawn.x, game.spawn.y, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawLight() {
  const L = game.light;
  if (!L.active) return;
  const glow = ctx.createRadialGradient(L.x, L.y, 4, L.x, L.y, L.radius);
  glow.addColorStop(0, "rgba(255, 220, 140, 0.55)");
  glow.addColorStop(0.35, "rgba(255, 180, 80, 0.18)");
  glow.addColorStop(1, "rgba(255, 160, 60, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(L.x, L.y, L.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(L.x, L.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#fff3c4";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 236, 180, 0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawDots() {
  for (const dot of game.dots) {
    if (dot.state === "lost") continue;
    const alpha = dot.state === "saved" ? 0.25 : 1;
    ctx.globalAlpha = alpha;

    if (dot.follow > 0.05 && dot.state === "live") {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r + 6 * dot.follow, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${dot.hue}, 90%, 60%, ${0.2 * dot.follow})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${dot.hue}, 85%, ${55 + dot.follow * 15}%)`;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 245, 220, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tiny eyes
    if (dot.state === "live") {
      ctx.fillStyle = "#1a120c";
      ctx.beginPath();
      ctx.arc(dot.x - 2.2, dot.y - 1, 1.2, 0, Math.PI * 2);
      ctx.arc(dot.x + 2.2, dot.y - 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function syncHud() {
  savedEl.textContent = String(game.saved);
  needEl.textContent = String(game.level.need);
  lostEl.textContent = String(game.lost);
  levelEl.textContent = `${game.levelIndex + 1}. ${game.level.name}`;
  statusEl.textContent = game.message;

  if (game.status === "won" || game.status === "lost") {
    banner.hidden = false;
    bannerTitle.textContent = game.status === "won" ? "Safe" : "Oh no";
    bannerBody.textContent = game.message;
    document.getElementById("nextBtn").hidden = game.status !== "won" || game.levelIndex >= LEVELS.length - 1;
  } else {
    banner.hidden = true;
  }
}

function render() {
  drawLevel();
  drawLight();
  drawDots();
  syncHud();
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  stepGame(game, dt);
  render();
  requestAnimationFrame(frame);
}

function onPointer(e, down) {
  const p = worldPoint(e.clientX, e.clientY);
  if (down) {
    pointerDown = true;
    canvas.setPointerCapture?.(e.pointerId);
    setLight(game, p.x, p.y, true);
  } else if (pointerDown) {
    setLight(game, p.x, p.y, true);
  }
}

canvas.addEventListener("pointerdown", (e) => onPointer(e, true));
canvas.addEventListener("pointermove", (e) => onPointer(e, false));
canvas.addEventListener("pointerup", () => {
  pointerDown = false;
  clearLight(game);
});
canvas.addEventListener("pointercancel", () => {
  pointerDown = false;
  clearLight(game);
});
canvas.addEventListener("pointerleave", () => {
  if (!pointerDown) clearLight(game);
});

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
