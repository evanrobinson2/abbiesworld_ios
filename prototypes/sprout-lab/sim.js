/**
 * Sprout Lab simulation — pure 2D organism logic (no DOM).
 * Designed to port later into Abbie's World / iPad.
 */

export const WORLD_W = 720;
export const WORLD_H = 960;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy);
}

function segClosest(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-6;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = clamp(t, 0, 1);
  return { x: ax + dx * t, y: ay + dy * t, t };
}

function angleToward(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function defaultTrellis() {
  const cx = WORLD_W * 0.5;
  const base = WORLD_H * 0.72;
  const top = WORLD_H * 0.28;
  const left = cx - 70;
  const right = cx + 70;
  return [
    { id: "pole-l", kind: "pole", ax: left, ay: base, bx: left, by: top, radius: 7 },
    { id: "pole-r", kind: "pole", ax: right, ay: base, bx: right, by: top, radius: 7 },
    { id: "rung-1", kind: "rung", ax: left, ay: top + 80, bx: right, by: top + 80, radius: 5 },
    { id: "rung-2", kind: "rung", ax: left, ay: top + 170, bx: right, by: top + 170, radius: 5 },
    { id: "rung-3", kind: "rung", ax: left, ay: top + 260, bx: right, by: top + 260, radius: 5 },
    { id: "rung-4", kind: "rung", ax: left, ay: top + 350, bx: right, by: top + 350, radius: 5 },
  ];
}

export function createWorld() {
  const seedX = WORLD_W * 0.5;
  const seedY = WORLD_H * 0.88;
  return {
    w: WORLD_W,
    h: WORLD_H,
    time: 0,
    speed: 1,
    light: { x: WORLD_W * 0.58, y: WORLD_H * 0.16, radius: 210, power: 1.15 },
    structures: defaultTrellis(),
    sprout: createSprout(seedX, seedY),
    soilY: WORLD_H * 0.9,
    notes: [],
  };
}

function createSprout(x, y) {
  return {
    nodes: [{ x, y, age: 0, width: 3.2 }],
    tipAngle: -Math.PI / 2 + (Math.random() - 0.5) * 0.15,
    sweep: Math.random() * Math.PI * 2,
    sweepRate: 0.55 + Math.random() * 0.25,
    energy: 1.1,
    attachedTo: null,
    climbT: 0,
    tendrils: [],
    age: 0,
    tipPulse: 0,
    reachedLight: false,
    length: 0,
  };
}

export function restartWorld(world) {
  const light = { ...world.light };
  const structures = world.structures.map((s) => ({ ...s }));
  const speed = world.speed;
  const next = createWorld();
  next.light = light;
  next.structures = structures;
  next.speed = speed;
  return next;
}

function lightAt(world, x, y) {
  const L = world.light;
  const d = dist(x, y, L.x, L.y);
  const fall = Math.exp(-((d / (L.radius * 1.85)) ** 2));
  return clamp(fall * L.power, 0, 1.2);
}

function nearestStructure(world, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const s of world.structures) {
    const c = segClosest(x, y, s.ax, s.ay, s.bx, s.by);
    const d = dist(x, y, c.x, c.y) - s.radius;
    if (d < bestD) {
      bestD = d;
      best = { structure: s, point: c, distance: d };
    }
  }
  return best;
}

function pushOutOfStructure(world, x, y, pad = 1.5) {
  const hit = nearestStructure(world, x, y, 40);
  if (!hit || hit.distance > pad) return { x, y, hit: null };
  const nx = x - hit.point.x;
  const ny = y - hit.point.y;
  const nlen = Math.hypot(nx, ny) || 1;
  const need = hit.structure.radius + pad;
  return {
    x: hit.point.x + (nx / nlen) * need,
    y: hit.point.y + (ny / nlen) * need,
    hit,
  };
}

function tip(sprout) {
  return sprout.nodes[sprout.nodes.length - 1];
}

function updateTendrils(sprout, world, dt) {
  const t = tip(sprout);
  const sense = nearestStructure(world, t.x, t.y, 56);
  if (sense && sense.distance < 28 && sprout.tendrils.length < 6) {
    const already = sprout.tendrils.some(
      (tr) => tr.structureId === sense.structure.id && dist(tr.x, tr.y, sense.point.x, sense.point.y) < 18
    );
    if (!already && Math.random() < dt * 2.2) {
      sprout.tendrils.push({
        structureId: sense.structure.id,
        x: sense.point.x,
        y: sense.point.y,
        curl: 0,
        fromIndex: sprout.nodes.length - 1,
        side: Math.random() < 0.5 ? -1 : 1,
      });
    }
  }

  for (const tr of sprout.tendrils) {
    tr.curl = clamp(tr.curl + dt * 2.1, 0, 1);
  }

  // Attach when a tendril has curled enough and tip is near its structure.
  if (!sprout.attachedTo) {
    for (const tr of sprout.tendrils) {
      if (tr.curl < 0.4) continue;
      const s = world.structures.find((st) => st.id === tr.structureId);
      if (!s) continue;
      const near = nearestStructure(world, t.x, t.y, 20);
      if (near && near.structure.id === s.id && near.distance < 14) {
        sprout.attachedTo = s.id;
        sprout.climbT = near.point.t;
        break;
      }
    }
  }
}

function climbAlong(sprout, world, dt) {
  const s = world.structures.find((st) => st.id === sprout.attachedTo);
  if (!s) {
    sprout.attachedTo = null;
    return false;
  }
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len = Math.hypot(dx, dy) || 1;
  // Prefer climbing toward the light projection on the segment.
  const lightProj = segClosest(world.light.x, world.light.y, s.ax, s.ay, s.bx, s.by);
  const toward = lightProj.t >= sprout.climbT ? 1 : -1;
  const climbSpeed = (22 + sprout.energy * 18) * dt;
  sprout.climbT = clamp(sprout.climbT + (toward * climbSpeed) / len, 0, 1);

  const alongX = s.ax + dx * sprout.climbT;
  const alongY = s.ay + dy * sprout.climbT;
  // Keep a little offset so the stem wraps the pole instead of sitting inside it.
  const px = -dy / len;
  const py = dx / len;
  const side = 1;
  const targetX = alongX + px * (s.radius + 4) * side;
  const targetY = alongY + py * (s.radius + 4) * side;

  const t = tip(sprout);
  const ang = angleToward(t.x, t.y, targetX, targetY);
  sprout.tipAngle = lerpAngle(sprout.tipAngle, ang, 0.35);
  return true;
}

function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * t;
}

export function stepWorld(world, dtRaw) {
  const dt = clamp(dtRaw, 0, 0.05) * world.speed;
  if (dt <= 0) return world;
  world.time += dt;

  const sprout = world.sprout;
  sprout.age += dt;
  sprout.tipPulse += dt * 3.2;
  sprout.sweep += dt * sprout.sweepRate;

  const t = tip(sprout);
  const intensity = lightAt(world, t.x, t.y);
  // Seedling reserves fade with age; light harvest fuels later growth.
  const reserves = Math.max(0, 0.085 - sprout.age * 0.004);
  const metabolism = 0.028 * dt;
  const harvest = intensity * 0.85 * dt;
  sprout.energy = clamp(sprout.energy - metabolism + harvest + reserves * dt, 0, 1.45);

  if (intensity > 0.62 && dist(t.x, t.y, world.light.x, world.light.y) < world.light.radius * 0.62) {
    sprout.reachedLight = true;
  }

  updateTendrils(sprout, world, dt);

  let climbing = false;
  if (sprout.attachedTo) climbing = climbAlong(sprout, world, dt);

  // Exploration sweep + phototropism when free-growing.
  if (!climbing) {
    const explore = Math.sin(sprout.sweep) * 0.55 + Math.sin(sprout.sweep * 0.37) * 0.22;
    const desired = angleToward(t.x, t.y, world.light.x, world.light.y);
    const photo = wrapAngle(desired - sprout.tipAngle) * (0.35 + intensity * 0.55);
    const upright = wrapAngle(-Math.PI / 2 - sprout.tipAngle) * 0.08;
    sprout.tipAngle += (explore * 0.9 + photo + upright) * dt;
  }

  // Continuous growth — cost scales with length so early life is eager.
  const growCost = 0.01 + sprout.length * 0.00002;
  const canGrow = sprout.energy > growCost * 2.5 && sprout.nodes.length < 480;
  if (canGrow) {
    const stepLen = climbing ? 2.35 : 2.7;
    let nx = t.x + Math.cos(sprout.tipAngle) * stepLen;
    let ny = t.y + Math.sin(sprout.tipAngle) * stepLen;

    // Soft world bounds.
    nx = clamp(nx, 24, world.w - 24);
    ny = clamp(ny, 24, world.soilY - 8);

    const cleared = pushOutOfStructure(world, nx, ny, climbing ? 0.5 : 2.2);
    nx = cleared.x;
    ny = cleared.y;

    // If we bumped a structure while free, bias tip along it and maybe attach.
    if (!climbing && cleared.hit && cleared.hit.distance < 3) {
      const s = cleared.hit.structure;
      const ang = Math.atan2(s.by - s.ay, s.bx - s.ax);
      const toLight = angleToward(nx, ny, world.light.x, world.light.y);
      const optA = ang;
      const optB = ang + Math.PI;
      const pick =
        Math.abs(wrapAngle(optA - toLight)) < Math.abs(wrapAngle(optB - toLight)) ? optA : optB;
      sprout.tipAngle = lerpAngle(sprout.tipAngle, pick, 0.5);
      if (sprout.tendrils.some((tr) => tr.structureId === s.id && tr.curl > 0.4)) {
        sprout.attachedTo = s.id;
        sprout.climbT = cleared.hit.point.t;
      }
    }

    const width = lerp(3.4, 1.6, clamp(sprout.nodes.length / 280, 0, 1));
    sprout.nodes.push({ x: nx, y: ny, age: 0, width });
    sprout.length += stepLen;
    sprout.energy -= growCost;
  }

  for (const n of sprout.nodes) n.age += dt;
  return world;
}

export function moveLight(world, x, y) {
  world.light.x = clamp(x, 40, world.w - 40);
  world.light.y = clamp(y, 40, world.h * 0.55);
}

export function moveStructure(world, id, dx, dy) {
  const s = world.structures.find((st) => st.id === id);
  if (!s) return;
  s.ax = clamp(s.ax + dx, 20, world.w - 20);
  s.bx = clamp(s.bx + dx, 20, world.w - 20);
  s.ay = clamp(s.ay + dy, 20, world.soilY - 20);
  s.by = clamp(s.by + dy, 20, world.soilY - 20);
}

export function addPole(world, x) {
  const id = `pole-${Date.now().toString(36)}`;
  const px = clamp(x, 40, world.w - 40);
  world.structures.push({
    id,
    kind: "pole",
    ax: px,
    ay: world.soilY - 20,
    bx: px,
    by: world.h * 0.22,
    radius: 7,
  });
  return id;
}

export function hitTest(world, x, y) {
  if (dist(x, y, world.light.x, world.light.y) < 36) return { type: "light" };
  for (const s of world.structures) {
    const c = segClosest(x, y, s.ax, s.ay, s.bx, s.by);
    if (dist(x, y, c.x, c.y) <= s.radius + 14) return { type: "structure", id: s.id };
  }
  return null;
}
