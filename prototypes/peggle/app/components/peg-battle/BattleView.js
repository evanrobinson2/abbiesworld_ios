'use client';

import { useEffect, useRef, useState } from 'react';
import { Peg } from './Peg';
import { ComicLayer } from './ComicLayer';
import { publicSrc } from '../../lib/peg-battle/assets.js';
import {
  SHOT_STEP_DT,
  advanceLiveShot,
  beginLiveShot,
  beginPlayerTurn,
  chooseCard,
  clearFx,
  createBattle,
  currentIntent,
  debugSnapshot,
  destroyBattle,
  enemyArt,
  newRandomBattle,
  resetBattle,
  resolveEnemyTurn,
} from '../../lib/peg-battle/session.js';
import { clampAim, previewTrajectory } from '../../lib/peg-battle/physics.js';

function AnalogStick({ label, hint, knob, onAim, onClick, disabled, pressed }) {
  const wellRef = useRef(null);

  function pointer(event) {
    if (disabled || !onAim) return;
    const well = wellRef.current;
    if (!well) return;
    const rect = well.getBoundingClientRect();
    const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    onAim(nx, ny);
  }

  return (
    <div className={`analog-stick ${disabled ? 'off' : ''} ${pressed ? 'pressed' : ''}`}>
      <button
        type="button"
        ref={wellRef}
        className="stick-well"
        aria-label={label}
        disabled={disabled}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          if (onClick) onClick();
          else pointer(event);
        }}
        onPointerMove={(event) => {
          if (!onAim || event.buttons === 0) return;
          pointer(event);
        }}
      >
        <span
          className="stick-knob"
          style={{
            left: `${50 + (knob?.x ?? 0) * 32}%`,
            top: `${50 + (knob?.y ?? 0) * 32}%`,
          }}
        />
      </button>
      <span className="stick-label">{label}</span>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function Hearts({ current, max, kind = 'heart' }) {
  const glyph = kind === 'shield' ? '🫧' : '❤️';
  return (
    <div className="hearts" aria-label={`${kind} ${current} of ${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <span key={index} className={index < current ? 'on' : 'off'}>
          {glyph}
        </span>
      ))}
    </div>
  );
}

function Placeholder({ label, fill }) {
  return (
    <svg viewBox="0 0 120 140" className="placeholder-silhouette">
      <ellipse cx="60" cy="128" rx="28" ry="6" fill="rgba(0,0,0,0.12)" />
      <circle cx="60" cy="42" r="22" fill={fill} stroke="#3a1f3d" strokeWidth="3" />
      <rect x="38" y="62" width="44" height="52" rx="16" fill={fill} stroke="#3a1f3d" strokeWidth="3" />
      <text x="60" y="18" textAnchor="middle" fontSize="8" fill="#3a1f3d">
        {label}
      </text>
    </svg>
  );
}

export default function BattleView({
  catalog,
  seed = 1234,
  enemyId,
  boardId,
  debug = false,
  harness = false,
  onExit,
  onSession,
}) {
  const sessionRef = useRef(null);
  const boardRef = useRef(null);
  const [tick, setTick] = useState(0);
  const [aim, setAim] = useState(0);
  const [launchPressed, setLaunchPressed] = useState(false);
  const refresh = () => setTick((value) => value + 1);

  function replaceSession(next) {
    destroyBattle(sessionRef.current);
    sessionRef.current = next;
    beginPlayerTurn(sessionRef.current);
    sessionRef.current.phase = 'intro';
    refresh();
    onSession?.(debugSnapshot(sessionRef.current));
  }

  useEffect(() => {
    replaceSession(createBattle(catalog, { seed, enemyId, boardId }));
    return () => {
      destroyBattle(sessionRef.current);
      sessionRef.current = null;
    };
    // catalog is stable for the prototype; seed / enemy / board recreate the session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, enemyId, boardId]);

  const session = sessionRef.current;
  const snapshot = session ? debugSnapshot(session) : null;

  useEffect(() => {
    if (session?.phase === 'intro') {
      const timer = window.setTimeout(() => {
        if (sessionRef.current?.phase === 'intro') {
          beginPlayerTurn(sessionRef.current);
          refresh();
        }
      }, 900);
      return () => window.clearTimeout(timer);
    }
    if (session?.phase === 'hitResolve') {
      const timer = window.setTimeout(() => {
        if (sessionRef.current?.phase === 'hitResolve') {
          resolveEnemyTurn(sessionRef.current);
          refresh();
        }
      }, 1100);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [session?.phase]);

  useEffect(() => {
    if (!session?.fxQueue?.length) return undefined;
    const timer = window.setTimeout(() => {
      if (sessionRef.current?.fxQueue?.length) {
        clearFx(sessionRef.current);
        refresh();
      }
    }, 720);
    return () => window.clearTimeout(timer);
  }, [session?.phase, session?.fxQueue?.join(',')]);

  useEffect(() => {
    if (!sessionRef.current || sessionRef.current.phase !== 'resolving') return undefined;
    let frame = 0;
    let last = performance.now();
    const loop = (now) => {
      if (sessionRef.current?.phase !== 'resolving') return;
      const elapsed = Math.min(0.05, (now - last) / 1000);
      last = now;
      const substeps = Math.max(1, Math.round((elapsed / SHOT_STEP_DT) * 10));
      for (let i = 0; i < substeps; i += 1) {
        if (sessionRef.current?.phase !== 'resolving') break;
        advanceLiveShot(sessionRef.current);
      }
      refresh();
      if (sessionRef.current?.phase === 'resolving') {
        frame = requestAnimationFrame(loop);
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [session?.phase]);

  const cacheKey = session?.catalog?.manifest?.updatedAt;
  const enemy = session ? enemyArt(session) : null;
  const enemySrc = enemy ? publicSrc(enemy, { cacheKey }) : null;
  const intent = session ? currentIntent(session) : null;
  const zoom = session?.fxQueue?.includes('spriteZoomAttack');
  const knock = session?.fxQueue?.includes('spriteKnockback');
  const breathe = session?.phase === 'playerAim' || session?.phase === 'intro';

  const pegs = session?.world?.pegs ?? session?.pegs ?? [];
  const ball = session?.world?.ball;
  const fountain = session?.physics.fountain;

  function aimFromStick(nx, ny) {
    if (!session || session.phase !== 'playerAim') return;
    const length = Math.hypot(nx, ny) || 1;
    const x = nx / length;
    const y = Math.max(0.12, ny / length);
    setAim(clampAim(Math.atan2(x, y)));
  }

  function fire() {
    if (!session || session.phase !== 'playerAim' || !session.selectedCardId) return;
    beginLiveShot(session, aim);
    refresh();
  }

  function pickCard(id) {
    if (!session) return;
    chooseCard(session, id);
    refresh();
  }

  const selected = session?.definition.cards.find((card) => card.id === session.selectedCardId);
  const canAim = session?.phase === 'playerAim';
  const canLaunch = Boolean(canAim && session?.selectedCardId);
  const path = canLaunch
    ? previewTrajectory(session.physics, pegs, aim, {
        behavior: selected?.behavior ?? 'star',
        launchSpeed: selected?.behavior === 'rocket' ? session.physics.launchSpeed * 0.55 : session.physics.launchSpeed,
        returnsLeft: selected?.behavior === 'boomerang' ? 1 : 0,
      })
    : [];
  const stickKnob = { x: Math.sin(aim), y: Math.cos(aim) };

  const orbStyle = session
    ? {
        width: `${session.physics.ballRadius * 2 * 100}%`,
        background:
          selected?.behavior === 'bubble'
            ? 'radial-gradient(circle at 32% 28%, #fff, #9be7ff 42%, #2f8aa8)'
            : 'radial-gradient(circle at 32% 28%, #fff, #ffe7a0 40%, #d48a1a)',
      }
    : null;
  const loadedOrb = canLaunch && !ball?.alive;

  return (
    <div className={`peg-battle ${harness ? 'harness' : 'kid'}`}>
      <header className="battle-hud">
        <div className="fighter enemy">
          <div className={`enemy-art ${breathe ? 'breathe' : ''} ${zoom ? 'zoom' : ''} ${knock ? 'knock' : ''}`}>
            {enemySrc ? (
              <img src={enemySrc} alt={session.definition.enemy.name} />
            ) : (
              <Placeholder
                label={enemy?.placeholder?.label ?? 'bad-doggo'}
                fill={enemy?.placeholder?.fill ?? '#c9854a'}
              />
            )}
          </div>
          <div>
            <Hearts current={session?.enemyHearts ?? 0} max={session?.enemyMaxHearts ?? 6} />
            <p className="intent">{intent?.telegraph}</p>
          </div>
        </div>
        <div className="hud-center">
          <p className="kicker">Peg Battle</p>
          <h1>{session?.definition.enemy.name ?? 'Peg Battle'}</h1>
          <p className="status">{session?.status}</p>
          <div className="dev-row">
            {onExit && (
              <button type="button" onClick={onExit}>
                Peggle Land
              </button>
            )}
            <button type="button" onClick={() => replaceSession(resetBattle(sessionRef.current))}>
              Reset Battle
            </button>
            {harness && (
              <button
                type="button"
                onClick={() =>
                  replaceSession(
                    newRandomBattle(catalog, {
                      levelId: session?.definition.level.id,
                      enemyId,
                      boardId,
                    })
                  )
                }
              >
                New Random Battle
              </button>
            )}
          </div>
        </div>
        <div className="fighter player">
          <Hearts current={session?.playerHearts ?? 0} max={session?.playerMaxHearts ?? 6} />
          {session?.shield > 0 && <Hearts current={session.shield} max={session.shield} kind="shield" />}
        </div>
      </header>

      {session?.phase === 'intro' && <div className="banner">{session.definition.level.introLine}</div>}

      <div className="stage">
        <AnalogStick label="AIM" hint="Left stick" knob={stickKnob} disabled={!canAim} onAim={aimFromStick} />
        <section className="playfield" ref={boardRef}>
          {session && (
            <div className="arena felt">
              <svg className="aim-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                {path.length > 1 && (
                  <polyline
                    points={path.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')}
                    fill="none"
                    stroke="#fff4c2"
                    strokeWidth="0.85"
                    strokeDasharray="2.2 1.6"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                )}
              </svg>
            {pegs.map((peg) => (
              <div
                key={peg.id}
                className={`peg-slot ${peg.gone || peg.present === false ? 'gone' : ''} ${peg.hitThisShot ? 'hit' : ''}`}
                style={{
                  left: `${peg.x * 100}%`,
                  top: `${peg.y * 100}%`,
                  width: `${session.physics.blockWidth * 100}%`,
                  height: `${session.physics.blockHeight * 100}%`,
                }}
              >
                <Peg
                  type={peg.kind}
                  charged={peg.charged}
                  painted={peg.painted}
                  muddy={peg.muddy}
                  sticky={peg.sticky}
                  present={peg.present}
                  gone={peg.gone}
                  strength={peg.strength}
                  valuable={peg.valuable}
                  hitIntensity={peg.hitThisShot ? 1 : 0}
                />
              </div>
            ))}
            {loadedOrb && (
              <div
                className="orb parked"
                style={{
                  ...orbStyle,
                  left: `${fountain.x * 100}%`,
                  top: `${fountain.y * 100}%`,
                }}
              />
            )}
            {ball?.alive && (
              <div
                className="orb flying"
                style={{
                  ...orbStyle,
                  left: `${ball.x * 100}%`,
                  top: `${ball.y * 100}%`,
                }}
              />
            )}
            <ComicLayer queue={session.fxQueue} tier={session.lastImpactTier} />
            {session.lastPower > 0 && session.phase !== 'playerAim' && (
              <div className="power-call">{session.lastPower} POWER!</div>
            )}
          </div>
        )}
        </section>
        <AnalogStick
          label="DROP"
          hint="Click stick"
          knob={{ x: 0, y: 0 }}
          disabled={!canLaunch}
          pressed={launchPressed}
          onClick={() => {
            setLaunchPressed(true);
            fire();
            window.setTimeout(() => setLaunchPressed(false), 160);
          }}
        />
      </div>

      <div className="hand">
        <div className="cards">
          {(session?.hand ?? []).map((id) => {
            const card = session.definition.cards.find((entry) => entry.id === id);
            const active = session.selectedCardId === id;
            return (
              <button
                key={id}
                type="button"
                className={`ball-card ${active ? 'active' : ''}`}
                disabled={session.phase !== 'playerAim'}
                onClick={() => pickCard(id)}
              >
                <span className="glyph">{card?.glyph}</span>
                <strong>{card?.shortName}</strong>
              </button>
            );
          })}
        </div>
        <div className="deck-backs">
          {(session?.deck ?? []).map((id) => (
            <span key={id} className="deck-back" />
          ))}
        </div>
      </div>

      {debug && snapshot && (
        <pre className="debug">
          {`Turn ${snapshot.turn}  ${snapshot.phase}  seed ${snapshot.seed}
Present ${snapshot.board.present}  gone ${snapshot.board.gone}  sticky ${snapshot.board.sticky}  valuable ${snapshot.board.valuable}  painted ${snapshot.board.painted}`}
        </pre>
      )}

      {(session?.phase === 'victory' || session?.phase === 'defeat') && (
        <div className="outcome">
          <h2>{session.phase === 'victory' ? 'YOU WIN!' : 'WHOOPS!'}</h2>
          <p>{session.status}</p>
          <button type="button" onClick={() => replaceSession(resetBattle(sessionRef.current))}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
