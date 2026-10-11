/**
 * Sprout Lab — canvas render + observer interactions.
 */
import {
  createWorld,
  restartWorld,
  stepWorld,
  moveLight,
  moveStructure,
  addPole,
  hitTest,
  WORLD_W,
  WORLD_H,
} from "./sim.js";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const energyFill = document.getElementById("energyFill");
const statusEl = document.getElementById("status");
const speedEl = document.getElementById("speed");
const speedLabel = document.getElementById("speedLabel");

let world = createWorld();
let dragging = null;
let last = performance.now();
let dpr = 1;

function resize() {
  const frame = canvas.parentElement;
  const maxW = frame.clientWidth;
  const maxH = frame.clientHeight;
  const scale = Math.min(maxW / WORLD_W, maxH / WORLD_H);
  const cssW = WORLD_W * scale;
  const cssH = WORLD_H * scale;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform((cssW * dpr) / WORLD_W, 0, 0, (cssH * dpr) / WORLD_H, 0, 0);
}

function worldPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * WORLD_W,
    y: ((clientY - rect.top) / rect.height) * WORLD_H,
  };
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  g.addColorStop(0, "#1a2430");
  g.addColorStop(0.45, "#243628");
  g.addColorStop(0.78, "#2f3f2c");
  g.addColorStop(1, "#3a3224");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Soft dust motes
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#f3e7c8";
  for (let i = 0; i < 28; i++) {
    const x = (Math.sin(world.time * 0.11 + i * 1.7) * 0.5 + 0.5) * WORLD_W;
    const y = ((i * 97) % WORLD_H) * 0.9 + 40;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Soil bed
  const soil = ctx.createLinearGradient(0, world.soilY - 40, 0, WORLD_H);
  soil.addColorStop(0, "rgba(42, 28, 16, 0)");
  soil.addColorStop(0.35, "rgba(58, 38, 22, 0.85)");
  soil.addColorStop(1, "#2a1b10");
  ctx.fillStyle = soil;
  ctx.fillRect(0, world.soilY - 40, WORLD_W, WORLD_H - world.soilY + 40);

  ctx.fillStyle = "rgba(18, 12, 8, 0.55)";
  ctx.beginPath();
  ctx.ellipse(WORLD_W * 0.5, world.soilY + 8, 58, 16, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLight() {
  const L = world.light;
  const pulse = 0.92 + Math.sin(world.time * 2.1) * 0.08;
  const glow = ctx.createRadialGradient(L.x, L.y, 8, L.x, L.y, L.radius * 1.6);
  glow.addColorStop(0, `rgba(255, 224, 140, ${0.55 * pulse})`);
  glow.addColorStop(0.35, `rgba(255, 196, 90, ${0.22 * pulse})`);
  glow.addColorStop(1, "rgba(255, 180, 60, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(L.x - L.radius * 1.6, L.y - L.radius * 1.6, L.radius * 3.2, L.radius * 3.2);

  ctx.beginPath();
  ctx.arc(L.x, L.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = "#fff1b8";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 236, 170, 0.7)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Lamp fixture
  ctx.strokeStyle = "rgba(230, 210, 160, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L.x, 0);
  ctx.lineTo(L.x, L.y - 18);
  ctx.stroke();
}

function drawStructures() {
  for (const s of world.structures) {
    ctx.lineCap = "round";
    ctx.strokeStyle = s.kind === "pole" ? "#8b5e34" : "#a8733f";
    ctx.lineWidth = s.radius * 2;
    ctx.beginPath();
    ctx.moveTo(s.ax, s.ay);
    ctx.lineTo(s.bx, s.by);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 220, 170, 0.18)";
    ctx.lineWidth = Math.max(2, s.radius * 0.7);
    ctx.beginPath();
    ctx.moveTo(s.ax, s.ay);
    ctx.lineTo(s.bx, s.by);
    ctx.stroke();
  }
}

function drawSprout() {
  const s = world.sprout;
  const nodes = s.nodes;
  if (nodes.length < 2) return;

  // Soft shadow under stem
  ctx.save();
  ctx.strokeStyle = "rgba(10, 20, 12, 0.22)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(nodes[0].x + 3, nodes[0].y + 4);
  for (let i = 1; i < nodes.length; i++) {
    ctx.lineTo(nodes[i].x + 3, nodes[i].y + 4);
  }
  ctx.stroke();
  ctx.restore();

  // Main stem as overlapping strokes for organic width
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const n = nodes[i];
      const mx = (prev.x + n.x) / 2;
      const my = (prev.y + n.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    const tip = nodes[nodes.length - 1];
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = pass === 0 ? "#2f6b3a" : "#5faf5a";
    ctx.lineWidth = pass === 0 ? 4.2 : 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  // Tiny leaves along older stem
  for (let i = 12; i < nodes.length - 8; i += 14) {
    const n = nodes[i];
    const p = nodes[i - 1];
    const ang = Math.atan2(n.y - p.y, n.x - p.x);
    const side = i % 28 === 12 ? 1 : -1;
    const leafAng = ang + side * (0.9 + Math.sin(s.age + i) * 0.08);
    ctx.fillStyle = "rgba(120, 190, 90, 0.75)";
    ctx.beginPath();
    ctx.ellipse(
      n.x + Math.cos(leafAng) * 7,
      n.y + Math.sin(leafAng) * 7,
      6.5,
      2.4,
      leafAng,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Tendrils
  for (const tr of s.tendrils) {
    const from = nodes[Math.min(tr.fromIndex, nodes.length - 1)];
    const curl = tr.curl;
    ctx.strokeStyle = `rgba(90, 170, 100, ${0.25 + curl * 0.55})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    const midX = (from.x + tr.x) / 2 + tr.side * 10 * curl;
    const midY = (from.y + tr.y) / 2;
    ctx.quadraticCurveTo(midX, midY, tr.x, tr.y);
    if (curl > 0.2) {
      const spiral = curl * Math.PI * 1.6;
      for (let k = 0; k < 8; k++) {
        const a = spiral * (k / 8);
        const r = 3 + k * 0.7;
        ctx.lineTo(tr.x + Math.cos(a) * r * tr.side, tr.y + Math.sin(a) * r);
      }
    }
    ctx.stroke();
  }

  // Growing tip
  const tipN = nodes[nodes.length - 1];
  const pulse = 0.7 + Math.sin(s.tipPulse) * 0.3;
  ctx.beginPath();
  ctx.arc(tipN.x, tipN.y, 3.5 + pulse, 0, Math.PI * 2);
  ctx.fillStyle = "#c8f28a";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tipN.x, tipN.y, 8 + pulse * 2, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(200, 242, 138, ${0.25 + pulse * 0.2})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Seed husk
  const seed = nodes[0];
  ctx.fillStyle = "#6b4423";
  ctx.beginPath();
  ctx.ellipse(seed.x, seed.y + 4, 7, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawVignette() {
  const v = ctx.createRadialGradient(
    WORLD_W * 0.5,
    WORLD_H * 0.45,
    WORLD_W * 0.2,
    WORLD_W * 0.5,
    WORLD_H * 0.5,
    WORLD_W * 0.78
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(8, 12, 10, 0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
}

function render() {
  drawBackground();
  drawLight();
  drawStructures();
  drawSprout();
  drawVignette();

  energyFill.style.transform = `scaleX(${Math.max(0.02, Math.min(1, world.sprout.energy))})`;
  const tip = world.sprout.nodes[world.sprout.nodes.length - 1];
  let line = "Watching…";
  if (world.sprout.reachedLight) line = "It found the light.";
  else if (world.sprout.attachedTo) line = "Climbing the trellis.";
  else if (world.sprout.tendrils.some((t) => t.curl > 0.4)) line = "Tendrils seeking purchase.";
  else if (world.sprout.nodes.length < 8) line = "Germinating.";
  else if (tip.y < WORLD_H * 0.55) line = "Reaching upward.";
  else line = "Exploring.";
  statusEl.textContent = line;
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  stepWorld(world, dt);
  render();
  requestAnimationFrame(frame);
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = worldPoint(e.clientX, e.clientY);
  const hit = hitTest(world, p.x, p.y);
  if (hit?.type === "light") dragging = { type: "light" };
  else if (hit?.type === "structure") dragging = { type: "structure", id: hit.id, x: p.x, y: p.y };
  else dragging = null;
});

canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = worldPoint(e.clientX, e.clientY);
  if (dragging.type === "light") moveLight(world, p.x, p.y);
  else if (dragging.type === "structure") {
    moveStructure(world, dragging.id, p.x - dragging.x, p.y - dragging.y);
    dragging.x = p.x;
    dragging.y = p.y;
  }
});

canvas.addEventListener("pointerup", () => {
  dragging = null;
});

speedEl.addEventListener("input", () => {
  const v = Number(speedEl.value);
  world.speed = v;
  speedLabel.textContent = `${v.toFixed(1)}×`;
});

document.getElementById("restart").addEventListener("click", () => {
  world = restartWorld(world);
});

document.getElementById("addPole").addEventListener("click", () => {
  addPole(world, WORLD_W * (0.3 + Math.random() * 0.4));
});

document.getElementById("resetScene").addEventListener("click", () => {
  const speed = world.speed;
  world = createWorld();
  world.speed = speed;
  speedEl.value = String(speed);
  speedLabel.textContent = `${speed.toFixed(1)}×`;
});

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);
