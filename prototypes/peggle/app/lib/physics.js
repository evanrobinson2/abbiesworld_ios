// Original Plink physics. Inspired by public Peggle-like bounce puzzles,
// written from scratch so we never copy PopCap code or GPL clones.
//
// Playfield is normalized 0..1. Y grows downward. The fountain sits near the
// top. Collection bowls occupy a strip at floorY.

export function clonePegs(pegs) {
  return pegs.map((peg, index) => ({
    id: peg.id ?? `peg-${index}`,
    x: peg.x,
    y: peg.y,
    kind: peg.kind === 'glow' ? 'glow' : 'seed',
    alive: peg.alive !== false,
    hit: false,
  }));
}

export function aimVector(angle, speed) {
  // angle 0 = straight down. Negative aims left, positive aims right.
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

export function whichBowl(x, bowls) {
  for (const bowl of bowls) {
    const half = bowl.width / 2;
    if (x >= bowl.x - half && x <= bowl.x + half) return bowl;
  }
  return null;
}

export function stepBall(world, dt) {
  const { physics, bowls } = world.campaign;
  const ball = world.ball;
  if (!ball?.alive) return [];

  const events = [];
  const drag = Math.max(0, 1 - physics.airDrag * dt);
  ball.vy += physics.gravity * dt;
  ball.vx *= drag;
  ball.vy *= drag;

  const speed = length(ball.vx, ball.vy);
  if (speed > physics.maxSpeed) {
    const scale = physics.maxSpeed / speed;
    ball.vx *= scale;
    ball.vy *= scale;
  }

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

  const pegR = physics.pegRadius;
  const minDist = radius + pegR;
  for (const peg of world.pegs) {
    if (!peg.alive) continue;
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
    if (!peg.hit) {
      peg.hit = true;
      events.push({ type: 'peg', id: peg.id, kind: peg.kind });
    }
    if (Math.abs(ball.vx) < 0.08) {
      ball.vx += ball.x >= peg.x ? 0.12 : -0.12;
    }
  }

  if (ball.y + radius >= physics.floorY && ball.vy > 0) {
    const bowl = whichBowl(ball.x, bowls);
    ball.alive = false;
    events.push({
      type: 'caught',
      bowl: bowl?.id ?? null,
      effect: bowl?.effect ?? 'miss',
      x: ball.x,
    });
  } else if (ball.y > 1.08) {
    ball.alive = false;
    events.push({ type: 'caught', bowl: null, effect: 'miss', x: ball.x });
  }

  return events;
}

export function launchWorld(campaign, pegs, angle) {
  const fountain = campaign.physics.fountain;
  const velocity = aimVector(angle, campaign.physics.launchSpeed);
  return {
    campaign,
    pegs: clonePegs(pegs),
    ball: {
      x: fountain.x,
      y: fountain.y,
      vx: velocity.vx,
      vy: velocity.vy,
      alive: true,
    },
    angle,
  };
}

export function simulateShot(campaign, pegs, angle, { dt = 1 / 120, maxSteps = 2400 } = {}) {
  const world = launchWorld(campaign, pegs, angle);
  const events = [];
  let steps = 0;
  while (world.ball.alive && steps < maxSteps) {
    events.push(...stepBall(world, dt));
    steps += 1;
  }
  return {
    steps,
    events,
    pegs: world.pegs,
    ended: !world.ball.alive,
    ball: { x: world.ball.x, y: world.ball.y },
  };
}
