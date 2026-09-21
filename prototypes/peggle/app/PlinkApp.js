'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { clampAim } from './lib/physics.js';
import {
  SHOT_PLAYBACK_RATE,
  SHOT_STEP_DT,
  activateTiltPrompt,
  advanceShot,
  beginShot,
  createProgress,
  createRound,
  inspectCampaign,
  remainingGlow,
  settleShot,
} from './lib/engine.js';

const PLAYER_ID = 'player.local';

const ANIMAL_GLYPH = {
  bunny: '🐰',
  fox: '🦊',
  turtle: '🐢',
  parrot: '🦜',
  panda: '🐼',
  lion: '🦁',
  owl: '🦉',
  elephant: '🐘',
};

const PEG_FILL = {
  glow: '#f4c430',
  seed: '#ef7ea8',
  tilt: '#5ec8d8',
  bomb: '#3d8b4f',
  redBomb: '#d4453a',
};

function usePlaceholder(src) {
  const [image, setImage] = useState(null);
  useEffect(() => {
    const next = new Image();
    next.src = src;
    next.onload = () => setImage(next);
  }, [src]);
  return image;
}

function drawImageCover(ctx, image, width, height) {
  if (!image) return;
  const scale = Math.max(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

function drawCircleSprite(ctx, image, x, y, radius, fallback) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (image) {
    ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = fallback;
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#4a2250';
  ctx.lineWidth = Math.max(2, radius * 0.18);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function pegArt(peg, art) {
  if (peg.kind === 'glow') return art.glow;
  if (peg.kind === 'seed') return art.seed;
  return null;
}

function drawBoard(ctx, round, width, height, aim, hovering, ball, trail, art) {
  const physics = round.campaign.physics;
  ctx.clearRect(0, 0, width, height);
  if (art.interior) {
    drawImageCover(ctx, art.interior, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, 0, width, height);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#fde7f3');
    sky.addColorStop(0.45, '#f7d9b8');
    sky.addColorStop(1, '#b7e3d4');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
  }

  for (const bowl of round.campaign.bowls) {
    const x = bowl.x * width;
    const w = bowl.width * width;
    const y = physics.floorY * height;
    ctx.fillStyle = bowl.id === 'extra' ? '#f3c96b' : bowl.id === 'gems' ? '#d16ba5' : bowl.id === 'glow' ? '#7ad3c1' : '#e8d5c4';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w, height - y - 8, 18);
    ctx.fill();
    ctx.fillStyle = '#4a2c2a';
    ctx.font = '600 13px ui-rounded, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(bowl.label, x, y + 28);
  }

  const minDim = Math.min(width, height);
  for (const peg of round.pegs) {
    if (!peg.alive) continue;
    const x = peg.x * width;
    const y = peg.y * height;
    const r = Math.max(10, physics.pegRadius * minDim);
    ctx.globalAlpha = peg.hit ? 0.35 : 1;
    drawCircleSprite(ctx, pegArt(peg, art), x, y, r, PEG_FILL[peg.kind] ?? PEG_FILL.seed);
    ctx.globalAlpha = 1;
    if (peg.kind === 'glow' && !peg.hit && !art.glow) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    if (peg.kind === 'tilt' && !peg.hit) {
      ctx.strokeStyle = '#fff8e7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.45);
      ctx.lineTo(x, y + r * 0.45);
      ctx.moveTo(x - r * 0.45, y);
      ctx.lineTo(x + r * 0.45, y);
      ctx.stroke();
    }
  }

  const fx = physics.fountain.x * width;
  const fy = physics.fountain.y * height;
  ctx.fillStyle = '#7bc47d';
  ctx.beginPath();
  ctx.ellipse(fx, fy + 10, 28, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f1ea';
  ctx.beginPath();
  ctx.arc(fx, fy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a2250';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (round.phase === 'aim') {
    const aimX = fx + Math.sin(aim) * 90;
    const aimY = fy + Math.cos(aim) * 90;
    ctx.strokeStyle = hovering ? '#4a2250' : 'rgba(74,34,80,0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(aimX, aimY);
    ctx.stroke();
  }

  const marble = ball ?? { x: physics.fountain.x, y: physics.fountain.y, alive: true };
  const ballR = Math.max(16, physics.ballRadius * minDim * 2.4);
  if (trail?.length) {
    trail.forEach((point, index) => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(94, 200, 216, ${0.12 + (index / trail.length) * 0.28})`;
      ctx.arc(point.x * width, point.y * height, ballR * 0.45, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  if (marble.alive !== false) {
    drawCircleSprite(ctx, art.ball, marble.x * width, marble.y * height, ballR, '#5ec8d8');
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.arc(marble.x * width - ballR * 0.28, marble.y * height - ballR * 0.28, ballR * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}

function SafariMap({ inspect, progress, onPick }) {
  const safari = inspect.safari ?? {
    title: 'Plink Safari',
    summary: 'Pick any animal garden.',
  };
  return (
    <section className="safari">
      <header>
        <p className="kicker">Abbie&rsquo;s World</p>
        <h1>{safari.title}</h1>
        <p>{safari.summary}</p>
      </header>
      <div className="safari-map">
        <img alt="" className="land-plate" src="/placeholders/land.png" />
        <img alt="" className="pavilion-chip" src="/placeholders/pavilion.png" />
        {inspect.beds.map((bed) => {
          const cleared = progress.clearedBedIds.includes(bed.id);
          const x = bed.map?.x ?? 0.5;
          const y = bed.map?.y ?? 0.5;
          return (
            <button
              key={bed.id}
              className={`garden-pin${cleared ? ' cleared' : ''}`}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              onClick={() => onPick(bed.id)}
              type="button"
            >
              <span aria-hidden="true">{ANIMAL_GLYPH[bed.animal] ?? '🌱'}</span>
              <strong>{bed.name}</strong>
            </button>
          );
        })}
      </div>
      <p className="status">
        Gems: {progress.gems}. Gardens helped: {progress.clearedBedIds.length}/{inspect.bedCount}.
        {progress.awardedDecoration ? ' Marble Fountain earned.' : ''}
      </p>
      <p className="hint">Tap any animal garden. Nothing is locked.</p>
    </section>
  );
}

function Loadout({ campaign, bed, loadout, onToggle, onPlay, onBack }) {
  const max = campaign.clash?.maxLoadout ?? 2;
  return (
    <section className="loadout">
      <button className="texty" onClick={onBack} type="button">
        Back to Safari
      </button>
      <h1>Pack for {bed.name}</h1>
      <p>{bed.summary}</p>
      <p className="status">Pick up to {max} power-ups, then play. You can also go with none.</p>
      <ul className="power-ups">
        {(campaign.powerUps ?? []).map((power) => {
          const selected = loadout.includes(power.id);
          const full = !selected && loadout.length >= max;
          return (
            <li key={power.id}>
              <button
                className={selected ? 'picked' : ''}
                disabled={full}
                onClick={() => onToggle(power.id)}
                type="button"
              >
                <strong>{power.name}</strong>
                <span>{power.summary}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button className="primary" onClick={onPlay} type="button">
        Play {bed.name}
      </button>
    </section>
  );
}

function ClashOverlay({ clash }) {
  if (!clash) return null;
  return (
    <aside className="clash-overlay" data-testid="clash-overlay">
      <p className="hearts">Your hearts: {clash.playerHearts}</p>
      <ul className="critter-row">
        {clash.critters.map((critter) => (
          <li key={critter.id} data-resting={critter.hearts === 0}>
            <strong>{critter.name}</strong>
            <span>{critter.hearts} hearts</span>
          </li>
        ))}
      </ul>
      <p className="report">{clash.lastReport}</p>
      {clash.tiltCharges > 0 ? <p>Tilt Balls: {clash.tiltCharges}</p> : null}
      {clash.tiltArmed ? <p>Next drop will tilt-steer.</p> : null}
    </aside>
  );
}

function Board({ campaign, bedId, loadout, progress, onExit, onProgress }) {
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const roundRef = useRef(null);
  const bed = campaign.beds.find((item) => item.id === bedId) ?? campaign.beds[0];
  const [round, setRound] = useState(() => createRound(campaign, bed, progress, { loadout }));
  const [aim, setAim] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [ball, setBall] = useState(null);
  const [trail, setTrail] = useState([]);
  const [tiltFlight, setTiltFlight] = useState(false);
  const interior = usePlaceholder('/placeholders/interior.png');
  const seed = usePlaceholder('/placeholders/seed.png');
  const glow = usePlaceholder('/placeholders/glow.png');
  const ballArt = usePlaceholder('/placeholders/ball.png');
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  roundRef.current = round;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      drawBoard(ctx, round, rect.width, rect.height, aim, hovering, ball, trail, {
        interior,
        seed,
        glow,
        ball: ballArt,
      });
    };
    paint();
    window.addEventListener('resize', paint);
    return () => window.removeEventListener('resize', paint);
  }, [round, aim, hovering, ball, trail, interior, seed, glow, ballArt]);

  useEffect(() => {
    if (round.phase !== 'falling' || !worldRef.current) return undefined;
    let frame = 0;
    let last = performance.now();
    let leftover = 0;
    const tick = (now) => {
      const world = worldRef.current;
      if (!world) return;
      leftover += Math.min(0.05, (now - last) / 1000) * SHOT_PLAYBACK_RATE;
      last = now;
      while (leftover >= SHOT_STEP_DT && world.ball.alive) {
        leftover -= SHOT_STEP_DT;
        advanceShot(world, SHOT_STEP_DT);
      }
      setBall({ ...world.ball });
      setTrail((points) => [...points.slice(-10), { x: world.ball.x, y: world.ball.y }]);
      setRound((current) => ({ ...current, pegs: world.pegs.map((peg) => ({ ...peg })) }));
      if (!world.ball.alive) {
        const settled = settleShot(roundRef.current, world);
        worldRef.current = null;
        setBall(null);
        setTrail([]);
        setTiltFlight(false);
        setRound(settled);
        onProgressRef.current(settled.progress);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [round.phase]);

  useEffect(() => {
    const onKey = (event) => {
      if (!worldRef.current?.tiltEnabled) return;
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        worldRef.current.tiltSteer = -1;
      } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        worldRef.current.tiltSteer = 1;
      }
    };
    const onUp = (event) => {
      if (!worldRef.current?.tiltEnabled) return;
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) {
        worldRef.current.tiltSteer = 0;
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
    };
  }, [round.phase]);

  const setSteer = (value) => {
    if (worldRef.current?.tiltEnabled) {
      worldRef.current.tiltSteer = value;
    }
  };

  const onPointer = (event) => {
    if (round.phase !== 'aim') return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const fountain = round.campaign.physics.fountain;
    setAim(clampAim(Math.atan2(x - fountain.x, y - fountain.y)));
    setHovering(true);
  };

  const fire = () => {
    if (round.phase !== 'aim') return;
    const armed = Boolean(round.clash?.tiltArmed);
    const { round: falling, world } = beginShot(
      { ...round, pegs: round.pegs.map((peg) => ({ ...peg })) },
      aim
    );
    worldRef.current = world;
    setTiltFlight(armed);
    setTrail([{ x: world.ball.x, y: world.ball.y }]);
    setBall({ ...world.ball });
    setRound(falling);
  };

  const retry = () => {
    worldRef.current = null;
    setBall(null);
    setTrail([]);
    setTiltFlight(false);
    setRound(createRound(campaign, round.bed, progress, { loadout }));
    setAim(0);
  };

  const armTilt = () => {
    setRound((current) => {
      if (!current.clash) return current;
      const clash = { ...current.clash };
      if (!activateTiltPrompt(clash)) return current;
      return { ...current, clash, status: 'Tilt is packed for the next drop.' };
    });
  };

  return (
    <section className="board">
      <header className="hud">
        <button className="texty" onClick={onExit} type="button">
          Safari
        </button>
        <div>
          <strong>
            {ANIMAL_GLYPH[round.bed.animal] ?? ''} {round.bed.name}
          </strong>
          <span>
            {remainingGlow(round.pegs)} glow · {round.clash?.playerHearts ?? round.dropsLeft} hearts ·{' '}
            {round.gemsThisRound} gems
          </span>
        </div>
        <button className="texty" onClick={retry} type="button">
          Again
        </button>
      </header>
      <ClashOverlay clash={round.clash} />
      <div className="play-wrap">
        <canvas
          ref={canvasRef}
          className="playfield"
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerUp={fire}
          aria-label="Plink playfield. Drag to aim, release to drop."
        />
        {tiltFlight ? (
          <div className="tilt-overlay">
            <p>Tilt is steering this drop. Finger aim stays the same. iPad tilt lives in the Swift app.</p>
            <div className="tilt-paddles">
              <button
                type="button"
                onPointerDown={() => setSteer(-1)}
                onPointerUp={() => setSteer(0)}
                onPointerLeave={() => setSteer(0)}
              >
                Tilt left
              </button>
              <button
                type="button"
                onPointerDown={() => setSteer(1)}
                onPointerUp={() => setSteer(0)}
                onPointerLeave={() => setSteer(0)}
              >
                Tilt right
              </button>
            </div>
          </div>
        ) : null}
        {round.clash?.tiltPrompt ? (
          <button className="tilt-thumb" onClick={armTilt} type="button">
            Tilt Ball
          </button>
        ) : null}
      </div>
      <p className="status" data-testid="plink-status">
        {round.status}
      </p>
      {round.phase === 'cleared' ? (
        <div className="end-card">
          <p>{round.status}</p>
          <button className="primary" onClick={onExit} type="button">
            Back to Safari
          </button>
        </div>
      ) : null}
      {round.phase === 'rest' || round.phase === 'retry' ? (
        <div className="end-card">
          <p>The garden needs a rest. Try again whenever you like.</p>
          <button className="primary" onClick={retry} type="button">
            Try this garden again
          </button>
          <button className="texty" onClick={onExit} type="button">
            Back to Safari
          </button>
        </div>
      ) : null}
    </section>
  );
}

function PlinkMusic({ cue }) {
  const audioRef = useRef(null);
  const safari = '/music/abbies-world.mp3';
  const play = '/music/cheerful-dance.mp3';
  const blocks = '/music/blocks-in-the-game.mp3';
  const src = cue === 'play' ? play : safari;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.src = src;
    audio.loop = cue !== 'play';
    const start = () => audio.play().catch(() => {});
    start();
    const onEnded = () => {
      if (cue !== 'play') return;
      audio.src = audio.getAttribute('data-piece') === 'blocks' ? play : blocks;
      audio.setAttribute('data-piece', audio.getAttribute('data-piece') === 'blocks' ? 'play' : 'blocks');
      audio.play().catch(() => {});
    };
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, [cue, src, play, blocks]);

  return <audio ref={audioRef} data-plink-music={cue} hidden />;
}

export default function PlinkApp() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState('safari');
  const [bedId, setBedId] = useState(null);
  const [loadout, setLoadout] = useState([]);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await fetch('/api/catalog').then((response) => response.json());
        const saved = await fetch(`/api/progress?playerId=${PLAYER_ID}`).then((response) => response.json());
        if (cancelled) return;
        const nextProgress = createProgress(catalog.campaign, saved.progress ?? {});
        setPayload(catalog);
        setProgress(nextProgress);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load Plink.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const inspect = useMemo(
    () => (payload ? inspectCampaign(payload.campaign) : null),
    [payload]
  );

  const saveProgress = async (next) => {
    setProgress(next);
    await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: PLAYER_ID, progress: next }),
    });
  };

  const togglePower = (id) => {
    setLoadout((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      const max = payload?.campaign?.clash?.maxLoadout ?? 2;
      if (current.length >= max) return current;
      return [...current, id];
    });
  };

  if (error) {
    return <main className="fail">{error}</main>;
  }
  if (!payload || !inspect || !progress) {
    return <main className="fail">Loading Plink Safari…</main>;
  }

  const selectedBed = payload.campaign.beds.find((bed) => bed.id === bedId) ?? payload.campaign.beds[0];

  return (
    <main data-source={payload.source}>
      <PlinkMusic cue={screen === 'play' ? 'play' : 'safari'} />
      {screen === 'safari' ? (
        <SafariMap
          inspect={inspect}
          progress={progress}
          onPick={(id) => {
            setBedId(id);
            setLoadout([]);
            setScreen('loadout');
          }}
        />
      ) : null}
      {screen === 'loadout' ? (
        <Loadout
          campaign={payload.campaign}
          bed={selectedBed}
          loadout={loadout}
          onToggle={togglePower}
          onBack={() => setScreen('safari')}
          onPlay={() => setScreen('play')}
        />
      ) : null}
      {screen === 'play' ? (
        <Board
          campaign={payload.campaign}
          bedId={bedId}
          loadout={loadout}
          progress={progress}
          onProgress={saveProgress}
          onExit={() => setScreen('safari')}
        />
      ) : null}
      <footer>
        data source: {payload.source} · {inspect.bedCount} gardens · game key {inspect.gameKey}
      </footer>
    </main>
  );
}
