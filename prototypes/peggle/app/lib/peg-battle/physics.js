// Peg Battle physics. Persistent pegs, original circle-circle bounce.
// Playfield is normalized 0..1. Y grows downward.

export const PEG_KINDS = new Set(['normal', 'star', 'heart']);

export const DEFAULT_PHYSICS = {
  ballRadius: 0.018,
  pegRadius: 0.022,
  gravity: 1.55,
  restitution: 0.72,
  airDrag: 0.08,
  maxSpeed: 1.85,
  launchSpeed: 0.92,
  fountain: { x: 0.5, y: 0.08 },
  floorY: 0.92,
};

export function clonePegs(pegs) {
  return pegs.map((peg, index) => ({
    id: peg.id ?? `peg-${index}`,
    x: peg.x,
    y: peg.y,
    kind: PEG_KINDS.has(peg.kind) ? peg.kind : 'normal',
    charged: Boolean(peg.charged),
    painted: Boolean(peg.painted),
    muddy: Boolean(peg.muddy),
    hitThisShot: false,
    pendingCharge: false,
  }));
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

  const cap = ball.starPower && ball.behavior === 'rocket' ? physics.maxSpeed : physics.maxSpeed;
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

  const minDist = radius + physics.pegRadius;
  for (const peg of world.pegs) {
    const dx = ball.x - peg.x;
    const dy = ball.y - peg.y;
    const dist = length(dx, dy);
    if (dist >= minDist || dist === 0) continue;
    const nx = dx / dist;
    const ny = dy / dist;
    ball.x = peg.x + nx * minDist;
    ball.y = peg.y + ny * minDist;
    const bounced = reflect(ball.vx, ball.vy, nx, ny, physics.restitution);
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
