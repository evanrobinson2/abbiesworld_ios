'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { clampAim } from './lib/physics.js';
import { createProgress, createRound, inspectCampaign, remainingGlow, resolveShot } from './lib/engine.js';

const PLAYER_ID = 'player.local';

function drawBoard(ctx, round, width, height, aim, hovering) {
  const physics = round.campaign.physics;
  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#fde7f3');
  sky.addColorStop(0.45, '#f7d9b8');
  sky.addColorStop(1, '#b7e3d4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, 0, width, height * physics.fountain.y + 18);

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

  for (const peg of round.pegs) {
    if (!peg.alive) continue;
    const x = peg.x * width;
    const y = peg.y * height;
    const r = physics.pegRadius * Math.min(width, height);
    ctx.beginPath();
    ctx.fillStyle = peg.kind === 'glow' ? '#f4c430' : '#ef7ea8';
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a2250';
    ctx.lineWidth = 3;
    ctx.stroke();
    if (peg.kind === 'glow') {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
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

  const aimX = fx + Math.sin(aim) * 90;
  const aimY = fy + Math.cos(aim) * 90;
  ctx.strokeStyle = hovering ? '#4a2250' : 'rgba(74,34,80,0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(aimX, aimY);
  ctx.stroke();
  ctx.fillStyle = '#5ec8d8';
  ctx.beginPath();
  ctx.arc(fx, fy, physics.ballRadius * Math.min(width, height), 0, Math.PI * 2);
  ctx.fill();
}

function LandView({ inspect, onEnter }) {
  return (
    <section className="land">
      <header>
        <p className="kicker">Abbie&rsquo;s World</p>
        <h1>{inspect.land.name}</h1>
        <p>{inspect.land.summary}</p>
      </header>
      <button className="pavilion" onClick={onEnter} type="button">
        <span className="dome" aria-hidden="true" />
        <strong>{inspect.poi.name}</strong>
        <em>{inspect.poi.callToAction}</em>
      </button>
      <p className="hint">Tap the pavilion to go inside. This is the Peggle Land POI.</p>
    </section>
  );
}

function Lobby({ inspect, progress, onPlay, onBack }) {
  return (
    <section className="lobby">
      <button className="texty" onClick={onBack} type="button">
        Back to {inspect.land.name}
      </button>
      <h1>{inspect.poi.name}</h1>
      <p>{inspect.poi.summary}</p>
      <p className="status">
        Gems earned here: {progress.gems}. Beds cleared: {progress.clearedBedIds.length}/{inspect.bedCount}.
        {progress.awardedDecoration ? ' Marble Fountain earned.' : ''}
      </p>
      <ol className="beds">
        {inspect.beds.map((bed) => {
          const unlocked = progress.unlockedBedIds.includes(bed.id);
          const cleared = progress.clearedBedIds.includes(bed.id);
          return (
            <li key={bed.id}>
              <button disabled={!unlocked} onClick={() => onPlay(bed.id)} type="button">
                <strong>{bed.name}</strong>
                <span>
                  {bed.glow} glow seeds · {bed.pegs} beads · {bed.drops} drops
                  {cleared ? ' · cleared' : unlocked ? '' : ' · locked'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Board({ campaign, bedId, progress, onExit, onProgress }) {
  const canvasRef = useRef(null);
  const [round, setRound] = useState(() => createRound(campaign, campaign.beds.find((bed) => bed.id === bedId), progress));
  const [aim, setAim] = useState(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      drawBoard(ctx, round, rect.width, rect.height, aim, hovering);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [round, aim, hovering]);

  const onPointer = (event) => {
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
    const next = resolveShot({ ...round, pegs: round.pegs.map((peg) => ({ ...peg })) }, aim);
    setRound(next);
    onProgress(next.progress);
  };

  const retry = () => {
    setRound(createRound(campaign, round.bed, progress));
    setAim(0);
  };

  return (
    <section className="board">
      <header className="hud">
        <button className="texty" onClick={onExit} type="button">
          Pavilion
        </button>
        <div>
          <strong>{round.bed.name}</strong>
          <span>
            {remainingGlow(round.pegs)} glow · {round.dropsLeft} drops · {round.gemsThisRound} gems
          </span>
        </div>
        <button className="texty" onClick={retry} type="button">
          Again
        </button>
      </header>
      <canvas
        ref={canvasRef}
        className="playfield"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerUp={fire}
        aria-label="Plink playfield. Drag to aim, release to drop."
      />
      <p className="status" data-testid="plink-status">
        {round.status}
      </p>
      {round.phase === 'cleared' ? (
        <button className="primary" onClick={onExit} type="button">
          Back to the pavilion
        </button>
      ) : null}
      {round.phase === 'retry' ? (
        <button className="primary" onClick={retry} type="button">
          Try this bed again
        </button>
      ) : null}
    </section>
  );
}

export default function PlinkApp() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState('land');
  const [bedId, setBedId] = useState(null);
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

  if (error) {
    return <main className="fail">{error}</main>;
  }
  if (!payload || !inspect || !progress) {
    return <main className="fail">Loading Peggle Land…</main>;
  }

  return (
    <main data-source={payload.source}>
      {screen === 'land' ? (
        <LandView inspect={inspect} onEnter={() => setScreen('lobby')} />
      ) : null}
      {screen === 'lobby' ? (
        <Lobby
          inspect={inspect}
          progress={progress}
          onBack={() => setScreen('land')}
          onPlay={(id) => {
            setBedId(id);
            setScreen('play');
          }}
        />
      ) : null}
      {screen === 'play' ? (
        <Board
          campaign={payload.campaign}
          bedId={bedId}
          progress={progress}
          onProgress={saveProgress}
          onExit={() => setScreen('lobby')}
        />
      ) : null}
      <footer>
        data source: {payload.source} · {inspect.bedCount} beds · game key {inspect.gameKey}
      </footer>
    </main>
  );
}
