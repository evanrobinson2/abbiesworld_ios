/**
 * Finger Lemmings simulation — dots follow a finger light through a maze.
 */
import { TILE, LEVELS, parseLevel } from "./levels.js";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function tileAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (ty < 0 || tx < 0 || ty >= level.h || tx >= level.w) return "wall";
  return level.tiles[ty][tx];
}

function centerOf(tile) {
  return { x: tile.x * TILE + TILE / 2, y: tile.y * TILE + TILE / 2 };
}

export function createGame(levelIndex = 0) {
  const blueprint = LEVELS[clamp(levelIndex, 0, LEVELS.length - 1)];
  const level = parseLevel(blueprint);
  const spawn = centerOf(level.spawns[0] || { x: 1, y: 1 });
  const goal = centerOf(level.goals[0] || { x: level.w - 2, y: level.h - 2 });

  return {
    levelIndex,
    level,
    light: { x: spawn.x + 50, y: spawn.y, radius: 88, active: false },
    dots: [],
    spawn,
    goal,
    spawnTimer: 0.2,
    spawned: 0,
    saved: 0,
    lost: 0,
    time: 0,
    status: "playing", // playing | won | lost
    message: "Touch to shine. Lead them home.",
  };
}

function makeDot(x, y, id) {
  const ang = Math.random() * Math.PI * 2;
  return {
    id,
    x,
    y,
    vx: Math.cos(ang) * 12,
    vy: Math.sin(ang) * 12,
    r: 7 + Math.random() * 2,
    hue: 28 + Math.random() * 28,
    state: "live", // live | saved | lost
    wobble: Math.random() * Math.PI * 2,
    follow: 0,
  };
}

function resolveWalls(level, dot, dt) {
  // Substep along velocity for nicer sliding.
  const steps = 3;
  for (let s = 0; s < steps; s++) {
    const nx = dot.x + (dot.vx * dt) / steps;
    if (tileAt(level, nx, dot.y) !== "wall") dot.x = nx;
    else dot.vx *= -0.25;

    const ny = dot.y + (dot.vy * dt) / steps;
    if (tileAt(level, dot.x, ny) !== "wall") dot.y = ny;
    else dot.vy *= -0.25;
  }

  // Soft push out if somehow inside a wall.
  if (tileAt(level, dot.x, dot.y) === "wall") {
    for (const [ox, oy] of [
      [TILE, 0],
      [-TILE, 0],
      [0, TILE],
      [0, -TILE],
      [TILE, TILE],
      [-TILE, TILE],
    ]) {
      if (tileAt(level, dot.x + ox * 0.4, dot.y + oy * 0.4) !== "wall") {
        dot.x += ox * 0.2;
        dot.y += oy * 0.2;
        break;
      }
    }
  }
}

function separate(dots, self) {
  let sx = 0;
  let sy = 0;
  for (const other of dots) {
    if (other === self || other.state !== "live") continue;
    const d = dist(self.x, self.y, other.x, other.y);
    const min = self.r + other.r + 2;
    if (d > 0 && d < min) {
      const push = (min - d) / min;
      sx += ((self.x - other.x) / d) * push * 40;
      sy += ((self.y - other.y) / d) * push * 40;
    }
  }
  return { x: sx, y: sy };
}

export function setLight(game, x, y, active = true) {
  game.light.x = clamp(x, 8, game.level.pixelW - 8);
  game.light.y = clamp(y, 8, game.level.pixelH - 8);
  game.light.active = active;
}

export function clearLight(game) {
  game.light.active = false;
}

export function stepGame(game, dtRaw) {
  const dt = clamp(dtRaw, 0, 0.05);
  if (game.status !== "playing") return game;
  game.time += dt;
  const { level, light } = game;

  // Spawn cadence
  if (game.spawned < level.maxDots) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      const jitter = (Math.random() - 0.5) * 10;
      game.dots.push(
        makeDot(game.spawn.x + jitter, game.spawn.y + jitter, game.spawned)
      );
      game.spawned += 1;
      game.spawnTimer = level.spawnEvery;
    }
  }

  for (const dot of game.dots) {
    if (dot.state !== "live") continue;
    dot.wobble += dt * 6;

    const dLight = dist(dot.x, dot.y, light.x, light.y);
    const inBeam = light.active && dLight < light.radius;
    dot.follow = inBeam ? clamp(1 - dLight / light.radius, 0, 1) : Math.max(0, dot.follow - dt * 1.6);

    let ax = 0;
    let ay = 0;

    if (inBeam) {
      const pull = 220 * dot.follow;
      ax += ((light.x - dot.x) / Math.max(12, dLight)) * pull;
      ay += ((light.y - dot.y) / Math.max(12, dLight)) * pull;
      // Slight orbit so they don't stack perfectly on the finger.
      ax += Math.cos(dot.wobble) * 18;
      ay += Math.sin(dot.wobble) * 18;
    } else {
      // Idle wander — lemming shuffle.
      ax += Math.cos(dot.wobble * 0.35) * 28;
      ay += Math.sin(dot.wobble * 0.5) * 18;
      // Mild gravity toward open corridors (downward bias like classic lemmings).
      ay += 12;
    }

    const sep = separate(game.dots, dot);
    ax += sep.x;
    ay += sep.y;

    dot.vx = clamp(dot.vx + ax * dt, -140, 140);
    dot.vy = clamp(dot.vy + ay * dt, -140, 140);
    // Friction
    const damp = inBeam ? 0.90 : 0.86;
    dot.vx *= Math.pow(damp, dt * 60);
    dot.vy *= Math.pow(damp, dt * 60);

    resolveWalls(level, dot, dt);

    // Hazard
    if (tileAt(level, dot.x, dot.y) === "hazard") {
      dot.state = "lost";
      game.lost += 1;
      continue;
    }

    // Goal
    if (dist(dot.x, dot.y, game.goal.x, game.goal.y) < TILE * 0.55) {
      dot.state = "saved";
      game.saved += 1;
    }
  }

  // Win / lose
  const remaining = game.dots.filter((d) => d.state === "live").length;
  const canStillSpawn = game.spawned < level.maxDots;
  if (game.saved >= level.need) {
    game.status = "won";
    game.message = "Home. All who mattered made it.";
  } else if (!canStillSpawn && remaining === 0) {
    game.status = "lost";
    game.message =
      game.saved > 0
        ? `Only ${game.saved} made it. Need ${level.need}.`
        : "Lost in the dark.";
  } else if (light.active) {
    game.message = "Leading…";
  } else if (remaining > 0) {
    game.message = "They’re waiting for light.";
  }

  return game;
}

export function restartLevel(game) {
  return createGame(game.levelIndex);
}

export function nextLevel(game) {
  const i = Math.min(game.levelIndex + 1, LEVELS.length - 1);
  return createGame(i);
}

export { LEVELS, TILE };
