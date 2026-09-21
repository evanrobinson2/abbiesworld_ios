import { getEnemyState, getSlot } from './assets.js';
import { DEFAULT_PHYSICS, clonePegs, launchWorld, simulateShot, stepBall } from './physics.js';
import { mulberry32, pickN, shuffle } from './rng.js';

export const SHOT_STEP_DT = 1 / 120;
export const SHOT_PLAYBACK_RATE = 0.28;

function freeze(value) {
  return JSON.parse(JSON.stringify(value));
}

export function assembleCatalog(parts) {
  return {
    pack: parts.pack,
    enemies: parts.enemies.enemies ?? parts.enemies,
    cards: parts.cards.cards ?? parts.cards,
    boards: parts.boards.boards ?? parts.boards,
    levels: parts.levels.levels ?? parts.levels,
    fx: parts.fx,
    manifest: parts.manifest ?? { families: {} },
  };
}

export function getLevel(catalog, levelId, overrides = {}) {
  const level = catalog.levels.find((entry) => entry.id === levelId) ?? catalog.levels[0];
  if (!level) throw new Error('peg-battle pack has no levels');
  const enemyId = overrides.enemyId ?? level.enemy;
  const boardId = overrides.boardId ?? level.board;
  const deckIds = overrides.deck ?? level.deck;
  const enemy = catalog.enemies.find((entry) => entry.id === enemyId);
  const board = catalog.boards.find((entry) => entry.id === boardId);
  const cards = deckIds.map((id) => catalog.cards.find((card) => card.id === id)).filter(Boolean);
  return {
    level: { ...level, enemy: enemy?.id ?? level.enemy, board: board?.id ?? level.board, deck: deckIds },
    enemy,
    board,
    cards,
  };
}

export function createBattle(catalog, { levelId, seed = 1234, enemyId, boardId, deck } = {}) {
  const overrides = { enemyId, boardId, deck };
  const definition = getLevel(catalog, levelId ?? catalog.pack.defaultLevel, overrides);
  if (!definition.enemy || !definition.board || definition.cards.length < 3) {
    throw new Error('peg-battle level is missing enemy, board, or cards');
  }
  const random = mulberry32(seed);
  const shuffled = shuffle(definition.cards.map((card) => card.id), random);
  const hand = shuffled.slice(0, definition.level.handSize);
  const deckQueue = shuffled.slice(definition.level.handSize);
  const pegs = clonePegs(definition.board.pegs);

  return {
    alive: true,
    seed: Number(seed) || hashNumber(seed),
    catalog,
    overrides,
    definition: freeze(definition),
    physics: { ...DEFAULT_PHYSICS },
    phase: 'intro',
    turn: 1,
    playerHearts: definition.level.playerHearts,
    playerMaxHearts: definition.level.playerHearts,
    enemyHearts: definition.enemy.maxHealth,
    enemyMaxHearts: definition.enemy.maxHealth,
    enemyState: 'confident',
    intentIndex: 0,
    shield: 0,
    power: 0,
    lastDamage: 0,
    lastPower: 0,
    lastImpactTier: 0,
    hand,
    deck: deckQueue,
    selectedCardId: null,
    pegs,
    ball: null,
    world: null,
    fxQueue: [],
    log: [],
    missingAssets: [],
    status: definition.level.introLine,
    outcome: null,
    shot: null,
    randomState: random,
  };
}

function hashNumber(value) {
  const text = String(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function destroyBattle(session) {
  if (!session) return null;
  session.alive = false;
  session.world = null;
  session.ball = null;
  session.fxQueue = [];
  session.shot = null;
  session.phase = 'destroyed';
  return null;
}

export function resetBattle(session) {
  const catalog = session.catalog;
  const levelId = session.definition.level.id;
  const seed = session.seed;
  const overrides = session.overrides ?? {};
  destroyBattle(session);
  return createBattle(catalog, { levelId, seed, ...overrides });
}

export function newRandomBattle(catalog, { levelId, enemyId, boardId, deck } = {}) {
  return createBattle(catalog, {
    levelId,
    enemyId,
    boardId,
    deck,
    seed: (Math.random() * 0xffffffff) >>> 0,
  });
}

export function clearFx(session) {
  if (!session) return session;
  session.fxQueue = [];
  return session;
}

export function currentIntent(session) {
  const enemy = session.definition.enemy;
  const moveId = enemy.attackPattern[session.intentIndex % enemy.attackPattern.length];
  return enemy.moves[moveId];
}

export function enemyArt(session) {
  const id = session.definition.enemy.id;
  const state = session.phase === 'victory' ? 'defeated' : session.enemyState;
  const entry = getEnemyState(session.catalog.manifest, id, state);
  if (entry.missing) session.missingAssets.push(entry.id);
  return entry;
}

export function cardArt(session, cardId) {
  const card = session.definition.cards.find((entry) => entry.id === cardId);
  const slot = card?.behavior ?? cardId;
  const entry = getSlot(session.catalog.manifest, 'balls', slot);
  if (entry.missing) session.missingAssets.push(entry.id);
  return entry;
}

export function beginPlayerTurn(session) {
  if (!session.alive) return session;
  session.phase = 'playerAim';
  session.selectedCardId = null;
  session.power = 0;
  session.shot = null;
  const intent = currentIntent(session);
  session.status = intent.telegraph;
  return session;
}

export function chooseCard(session, cardId) {
  if (session.phase !== 'playerAim') return session;
  if (!session.hand.includes(cardId)) return session;
  session.selectedCardId = cardId;
  return session;
}

export function cycleHand(session, playedId) {
  session.hand = session.hand.filter((id) => id !== playedId);
  const drawn = session.deck.shift();
  if (drawn) session.hand.push(drawn);
  session.deck.push(playedId);
}

function applyStarPower(session, ballSpec) {
  const already = Boolean(ballSpec.starPower);
  ballSpec.starPower = true;
  if (ballSpec.behavior === 'rocket') {
    ballSpec.launchSpeed = session.physics.maxSpeed * 0.85;
  }
  if (ballSpec.behavior === 'boomerang' && !ballSpec.starReturnGranted) {
    ballSpec.returnsLeft += 1;
    ballSpec.starReturnGranted = true;
  }
  const ball = session.world?.ball;
  if (!ball) return;
  ball.starPower = true;
  if (ballSpec.behavior === 'rocket') {
    const speed = Math.hypot(ball.vx, ball.vy) || 1;
    const target = session.physics.maxSpeed;
    ball.vx = (ball.vx / speed) * target;
    ball.vy = (ball.vy / speed) * target;
  }
  if (ballSpec.behavior === 'boomerang' && !already) {
    ball.returnsLeft = ballSpec.returnsLeft;
  }
}

export function resolvePegHit(session, peg, card, acc) {
  if (peg.gone || peg.present === false) return;

  if (peg.sticky || peg.muddy) {
    peg.sticky = false;
    peg.muddy = false;
    acc.consecutive = 0;
    acc.cleaned += 1;
    return;
  }

  if (peg.kind === 'heart') {
    acc.hearts += 1;
    session.playerHearts = Math.min(session.playerMaxHearts, session.playerHearts + 1);
  }
  if (peg.kind === 'star') {
    acc.starPower = true;
    applyStarPower(session, acc.ballSpec);
  }

  let value = peg.valuable || peg.charged ? 2 : 1;
  if (acc.starPower && card.behavior === 'star') value *= 2;

  if (peg.painted && card.behavior !== 'paint') {
    value += acc.starPower ? 6 : 3;
    peg.painted = false;
    acc.pops += 1;
  }
  if (card.behavior === 'paint') {
    peg.painted = true;
  }
  if (card.behavior === 'bubble') {
    const amount = acc.starPower ? 2 : 1;
    acc.shield += amount;
  }

  acc.consecutive += 1;
  if (card.behavior === 'star' && acc.consecutive >= 10 && !acc.burst) {
    acc.power += acc.starPower ? 20 : 10;
    acc.burst = true;
  }
  acc.power += value;
  acc.hits += 1;

  // Paint marks a block for later. Everything else spends strength and pops.
  if (card.behavior !== 'paint') {
    peg.strength = Math.max(0, (peg.strength ?? 1) - 1);
    if (peg.strength <= 0) {
      peg.present = false;
      peg.gone = true;
      acc.pops += 1;
    }
  }
}

export function settleCharges(pegs) {
  for (const peg of pegs) {
    peg.hitThisShot = false;
    peg.pendingCharge = false;
  }
}

export function impactTier({ damage, finishing }) {
  if (finishing) return 4;
  if (damage >= 3) return 3;
  if (damage === 2) return 2;
  if (damage === 1) return 1;
  return 0;
}

function ballSpecFor(session, card) {
  return {
    behavior: card.behavior,
    launchSpeed: card.behavior === 'rocket' ? session.physics.launchSpeed * 0.55 : session.physics.launchSpeed,
    returnsLeft: card.behavior === 'boomerang' ? 1 : 0,
    starPower: false,
  };
}

export function beginLiveShot(session, angle) {
  if (!session.alive || session.phase !== 'playerAim' || !session.selectedCardId) {
    return session;
  }
  const card = session.definition.cards.find((entry) => entry.id === session.selectedCardId);
  const ballSpec = ballSpecFor(session, card);
  session.world = launchWorld(session.physics, session.pegs, angle, ballSpec);
  session.shotAcc = {
    power: 0,
    hits: 0,
    pops: 0,
    shield: 0,
    hearts: 0,
    consecutive: 0,
    burst: false,
    starPower: false,
    cleaned: 0,
    ballSpec,
  };
  session.phase = 'resolving';
  session.shot = { cardId: card.id, angle, events: [], steps: 0 };
  return session;
}

export function advanceLiveShot(session, dt = SHOT_STEP_DT) {
  if (!session.alive || session.phase !== 'resolving' || !session.world) return session;
  const card = session.definition.cards.find((entry) => entry.id === session.shot.cardId);
  const events = stepBall(session.world, dt);
  session.shot.steps += 1;
  session.shot.events.push(...events);
  for (const event of events) {
    if (event.type !== 'peg') continue;
    const peg = session.world.pegs.find((entry) => entry.id === event.id);
    if (peg) resolvePegHit(session, peg, card, session.shotAcc);
    if (session.shotAcc.starPower) applyStarPower(session, session.shotAcc.ballSpec);
  }
  if (!session.world.ball.alive || session.shot.steps > 2400) {
    if (session.world.ball.alive) session.world.ball.alive = false;
    finishLiveShot(session);
  }
  return session;
}

function finishLiveShot(session) {
  const acc = session.shotAcc;
  const card = session.definition.cards.find((entry) => entry.id === session.shot.cardId);
  settleCharges(session.world.pegs);
  session.pegs = session.world.pegs;
  session.world = null;
  session.shield += acc.shield;
  session.lastPower = acc.power;
  session.power = acc.power;
  const damage = Math.floor(acc.power / session.definition.level.powerPerDamage);
  session.lastDamage = damage;
  session.enemyHearts = Math.max(0, session.enemyHearts - damage);
  const finishing = session.enemyHearts <= 0 && damage > 0;
  session.lastImpactTier = impactTier({ damage, finishing });
  if (session.enemyHearts / session.enemyMaxHearts < session.definition.enemy.hurtBelowRatio) {
    session.enemyState = 'hurt';
  }
  cycleHand(session, card.id);
  session.selectedCardId = null;
  session.shot.power = acc.power;
  session.shot.damage = damage;
  session.shot.hits = acc.hits;
  session.shot.starPower = acc.starPower;
  session.fxQueue = (session.catalog.fx.sequences[`hit-tier-${session.lastImpactTier}`] ?? ['recoil']).slice();
  session.shotAcc = null;
  if (session.enemyHearts <= 0) {
    session.phase = 'victory';
    session.enemyState = 'defeated';
    session.outcome = 'win';
    session.status = session.definition.enemy.victoryLine;
  } else {
    session.phase = 'hitResolve';
    session.status = `${acc.power} POWER!`;
  }
}

export function resolveFlight(session, angle) {
  if (!session.alive || session.phase !== 'playerAim' || !session.selectedCardId) {
    return session;
  }
  const card = session.definition.cards.find((entry) => entry.id === session.selectedCardId);
  const ballSpec = ballSpecFor(session, card);
  const flight = simulateShot(session.physics, session.pegs, angle, ballSpec);
  const acc = {
    power: 0,
    hits: 0,
    pops: 0,
    shield: 0,
    hearts: 0,
    consecutive: 0,
    burst: false,
    starPower: false,
    cleaned: 0,
    ballSpec,
  };
  const pegsById = new Map(flight.pegs.map((peg) => [peg.id, peg]));
  for (const event of flight.events) {
    if (event.type !== 'peg') continue;
    const peg = pegsById.get(event.id);
    if (peg) resolvePegHit(session, peg, card, acc);
  }
  settleCharges(flight.pegs);
  session.pegs = flight.pegs;
  session.shield += acc.shield;
  session.lastPower = acc.power;
  session.power = acc.power;
  const damage = Math.floor(acc.power / session.definition.level.powerPerDamage);
  session.lastDamage = damage;
  session.enemyHearts = Math.max(0, session.enemyHearts - damage);
  const finishing = session.enemyHearts <= 0 && damage > 0;
  session.lastImpactTier = impactTier({ damage, finishing });
  if (session.enemyHearts / session.enemyMaxHearts < session.definition.enemy.hurtBelowRatio) {
    session.enemyState = 'hurt';
  }
  cycleHand(session, card.id);
  session.selectedCardId = null;
  session.shot = {
    cardId: card.id,
    angle,
    steps: flight.steps,
    events: flight.events,
    power: acc.power,
    damage,
    hits: acc.hits,
    starPower: acc.starPower,
  };
  const fx = session.catalog.fx.sequences[`hit-tier-${session.lastImpactTier}`] ?? ['recoil'];
  session.fxQueue = fx.slice();
  if (session.enemyHearts <= 0) {
    session.phase = 'victory';
    session.enemyState = 'defeated';
    session.outcome = 'win';
    session.status = session.definition.enemy.victoryLine;
  } else {
    session.phase = 'hitResolve';
    session.status = `${acc.power} POWER!`;
  }
  return session;
}

export function applyMuddyPaws(session, count) {
  const chosen = pickN(
    session.pegs,
    count,
    session.randomState,
    (peg) => peg.present !== false && !peg.gone && !peg.muddy
  );
  for (const peg of chosen) {
    peg.muddy = true;
    peg.sticky = true;
  }
  return chosen.map((peg) => peg.id);
}

export function resolveEnemyTurn(session) {
  if (!session.alive || session.phase === 'victory' || session.phase === 'defeat') return session;
  const move = currentIntent(session);
  const incoming = move.damage;
  const absorbed = Math.min(session.shield, incoming);
  const heartsLost = incoming - absorbed;
  session.shield = 0;
  session.playerHearts = Math.max(0, session.playerHearts - heartsLost);
  session.fxQueue = (session.catalog.fx.sequences[move.sequence] ?? ['impactFlash']).slice();
  const when = session.definition.enemy.signatureBoardAction?.when;
  if (when === `onAttack:${move.id}`) {
    applyMuddyPaws(session, session.definition.enemy.signatureBoardAction?.pegCount ?? 3);
  }
  session.intentIndex += 1;
  session.turn += 1;
  if (session.playerHearts <= 0) {
    session.phase = 'defeat';
    session.outcome = 'lose';
    session.status = session.definition.enemy.defeatLine;
  } else {
    beginPlayerTurn(session);
  }
  return session;
}

export function debugSnapshot(session) {
  const intent = currentIntent(session);
  return {
    turn: session.turn,
    phase: session.phase,
    seed: session.seed,
    playerHP: `${session.playerHearts}/${session.playerMaxHearts}`,
    enemyHP: `${session.enemyHearts}/${session.enemyMaxHearts}`,
    enemyState: session.enemyState,
    shield: session.shield,
    hand: session.hand.slice(),
    deck: session.deck.slice(),
    enemyIntent: intent?.name ?? null,
    intentDamage: intent?.damage ?? 0,
    board: {
      present: session.pegs.filter((peg) => peg.present !== false && !peg.gone).length,
      gone: session.pegs.filter((peg) => peg.gone || peg.present === false).length,
      sticky: session.pegs.filter((peg) => peg.sticky || peg.muddy).length,
      valuable: session.pegs.filter((peg) => peg.valuable || peg.kind === 'star').length,
      painted: session.pegs.filter((peg) => peg.painted).length,
      charged: session.pegs.filter((peg) => peg.charged).length,
      muddy: session.pegs.filter((peg) => peg.muddy).length,
      star: session.pegs.filter((peg) => peg.kind === 'star').length,
      heart: session.pegs.filter((peg) => peg.kind === 'heart').length,
    },
    lastPower: session.lastPower,
    lastDamage: session.lastDamage,
    lastImpactTier: session.lastImpactTier,
    missingAssets: [...new Set(session.missingAssets)],
  };
}

export function inspectPack(catalog) {
  return {
    packId: catalog.pack.id,
    title: catalog.pack.title,
    enemies: catalog.enemies.map((enemy) => enemy.id),
    cards: catalog.cards.map((card) => card.id),
    boards: catalog.boards.map((board) => board.id),
    levels: catalog.levels.map((level) => level.id),
  };
}
