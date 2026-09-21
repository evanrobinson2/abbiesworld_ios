// Peg Battle physics. Peglin-style blocks that pop when hit.
// Playfield is normalized 0..1. Y grows downward.
//
// Scale is checked against open-source PegglePy (Mr0o/PegglePy):
//   ballRad = 12, pegRad = 25 on a 1200×900 board → ball/peg ≈ 0.48.
// Our previous ball (0.018) was almost as wide as the peg (0.022). The orb
// is now about half the block, and pegs are rounded rectangles, not circles.

export const PEG_KINDS = new Set(['normal', 'star', 'heart']);

export const DEFAULT_PHYSICS = {
  ballRadius: 0.0105,
  pegRadius: 0.029,
  blockWidth: 0.07,
  blockHeight: 0.058,
  gravity: 1.55,
  restitution: 0.72,
  airDrag: 0.08,
  maxSpeed: 1.85,
  launchSpeed: 0.92,
  fountain: { x: 0.5, y: 0.08 },
  floorY: 0.92,
};

export function clonePegs(pegs) {
  return pegs.map((peg, index) => {
    const strength = Math.max(1, Number(peg.strength) || 1);
    const gone = Boolean(peg.gone);
    return {
      id: peg.id ?? `peg-${index}`,
      x: peg.x,
      y: peg.y,
      kind: PEG_KINDS.has(peg.kind) ? peg.kind : 'normal',
      shape: peg.shape ?? 'block',
      strength,
      present: peg.present !== false && !gone,
      gone,
      charged: Boolean(peg.charged) || peg.kind === 'star',
      painted: Boolean(peg.painted),
      muddy: Boolean(peg.muddy),
      sticky: Boolean(peg.sticky) || Boolean(peg.muddy),
      valuable: Boolean(peg.valuable) || peg.kind === 'star' || Boolean(peg.charged),
      hitThisShot: false,
      pendingCharge: false,
    };
  });
}

export function aimVector(angle, speed) {
  return {
    vx: Math.sin(angle) * speed,
    vy: Math.cos(angle) * speed,
  };
}

export function clampAim(angle, limit = 1.15) {
  return Math.max(-limit, Math.min(limit, angle));
}

function length(x, y) {
  return Math.hypot(x, y) || 0;
}

function reflect(vx, vy, nx, ny, restitution) {
  const dot = vx * nx + vy * ny;
  return {
    vx: (vx - 2 * dot * nx) * restitution,
    vy: (vy - 2 * dot * ny) * restitution,
  };
}

function scaleTo(ball, speed) {
  const current = length(ball.vx, ball.vy) || 1;
  const factor = speed / current;
  ball.vx *= factor;
  ball.vy *= factor;
}

function collideCircleBlock(ball, peg, ballR, hw, hh) {
  const closestX = Math.max(peg.x - hw, Math.min(ball.x, peg.x + hw));
  const closestY = Math.max(peg.y - hh, Math.min(ball.y, peg.y + hh));
  let dx = ball.x - closestX;
  let dy = ball.y - closestY;
  let dist = length(dx, dy);
  if (dist === 0) {
    const overlapX = hw - Math.abs(ball.x - peg.x);
    const overlapY = hh - Math.abs(ball.y - peg.y);
    if (overlapX < overlapY) {
      const nx = ball.x >= peg.x ? 1 : -1;
      return { nx, ny: 0, penetrate: overlapX + ballR };
    }
    const ny = ball.y >= peg.y ? 1 : -1;
    return { nx: 0, ny, penetrate: overlapY + ballR };
  }
  if (dist >= ballR) return null;
  return { nx: dx / dist, ny: dy / dist, penetrate: ballR - dist };
}

export function launchWorld(physics, pegs, angle, ballSpec = {}) {
  const speed = ballSpec.launchSpeed ?? physics.launchSpeed;
  const velocity = aimVector(clampAim(angle), speed);
  return {
    physics,
    pegs: clonePegs(pegs),
    ball: {
      x: physics.fountain.x,
      y: physics.fountain.y,
      vx: velocity.vx,
      vy: velocity.vy,
      alive: true,
      behavior: ballSpec.behavior ?? 'star',
      returnsLeft: ballSpec.returnsLeft ?? 0,
      starPower: Boolean(ballSpec.starPower),
    },
    angle,
  };
}

export function stepBall(world, dt) {
  const { physics } = world;
  const ball = world.ball;
  if (!ball?.alive) return [];

  const events = [];
  const drag = Math.max(0, 1 - physics.airDrag * dt);
  ball.vy += physics.gravity * dt;
  ball.vx *= drag;
  ball.vy *= drag;

  const cap = physics.maxSpeed;
  const speed = length(ball.vx, ball.vy);
  if (speed > cap) scaleTo(ball, cap);

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  const radius = physics.ballRadius;
  if (ball.x < radius) {
    ball.x = radius;
    ball.vx = Math.abs(ball.vx) * physics.restitution;
    events.push({ type: 'wall', side: 'left' });
  } else if (ball.x > 1 - radius) {
    ball.x = 1 - radius;
    ball.vx = -Math.abs(ball.vx) * physics.restitution;
    events.push({ type: 'wall', side: 'right' });
  }
  if (ball.y < radius) {
    ball.y = radius;
    ball.vy = Math.abs(ball.vy) * physics.restitution;
    events.push({ type: 'wall', side: 'top' });
  }

  const hw = (physics.blockWidth ?? physics.pegRadius * 2) / 2;
  const hh = (physics.blockHeight ?? physics.pegRadius * 2) / 2;
  for (const peg of world.pegs) {
    if (peg.gone || peg.present === false) continue;
    const hit = collideCircleBlock(ball, peg, radius, hw, hh);
    if (!hit) continue;
    ball.x += hit.nx * (hit.penetrate + 0.0004);
    ball.y += hit.ny * (hit.penetrate + 0.0004);
    const bounced = reflect(ball.vx, ball.vy, hit.nx, hit.ny, physics.restitution);
    ball.vx = bounced.vx;
    ball.vy = bounced.vy;
    if (ball.behavior === 'rocket') {
      const next = Math.min(physics.maxSpeed, length(ball.vx, ball.vy) * 1.16);
      scaleTo(ball, ball.starPower ? physics.maxSpeed : next);
    }
    if (Math.abs(ball.vx) < 0.08) {
      ball.vx += ball.x >= peg.x ? 0.12 : -0.12;
    }
    if (!peg.hitThisShot) {
      peg.hitThisShot = true;
      events.push({ type: 'peg', id: peg.id, kind: peg.kind });
    }
  }

  if (ball.y + radius >= physics.floorY && ball.vy > 0) {
    if (ball.returnsLeft > 0) {
      ball.returnsLeft -= 1;
      ball.y = physics.floorY - radius - 0.002;
      ball.vy = -Math.abs(ball.vy) * 0.92 - 0.18;
      events.push({ type: 'boomerang' });
    } else {
      ball.alive = false;
      events.push({ type: 'ended', x: ball.x });
    }
  } else if (ball.y > 1.08) {
    ball.alive = false;
    events.push({ type: 'ended', x: ball.x });
  }

  return events;
}

export function simulateShot(physics, pegs, angle, ballSpec = {}, { dt = 1 / 120, maxSteps = 2400 } = {}) {
  const world = launchWorld(physics, pegs, angle, ballSpec);
  const events = [];
  let steps = 0;
  while (world.ball.alive && steps < maxSteps) {
    events.push(...stepBall(world, dt));
    steps += 1;
  }
  if (world.ball.alive) {
    world.ball.alive = false;
    events.push({ type: 'ended', x: world.ball.x, reason: 'timeout' });
  }
  return {
    steps,
    events,
    pegs: world.pegs,
    ended: true,
    ball: { x: world.ball.x, y: world.ball.y },
  };
}
