'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Peg } from './Peg';
import { ComicLayer } from './ComicLayer';
import { publicSrc } from '../../lib/peg-battle/assets.js';
import {
  SHOT_STEP_DT,
  advanceLiveShot,
  beginLiveShot,
  beginPlayerTurn,
  cardArt,
  chooseCard,
  createBattle,
  currentIntent,
  debugSnapshot,
  destroyBattle,
  enemyArt,
  newRandomBattle,
  resetBattle,
  resolveEnemyTurn,
} from '../../lib/peg-battle/session.js';
import { clampAim } from '../../lib/peg-battle/physics.js';

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
  debug = false,
  harness = false,
  onExit,
  onSession,
}) {
  const sessionRef = useRef(null);
  const boardRef = useRef(null);
  const [tick, setTick] = useState(0);
  const [aim, setAim] = useState(0);
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
    replaceSession(createBattle(catalog, { seed }));
    const intro = setTimeout(() => {
      if (sessionRef.current?.phase === 'intro') {
        beginPlayerTurn(sessionRef.current);
        refresh();
      }
    }, 900);
    return () => {
      clearTimeout(intro);
      destroyBattle(sessionRef.current);
      sessionRef.current = null;
    };
    // catalog is stable for the prototype; seed is the recreation key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const session = sessionRef.current;
  const snapshot = session ? debugSnapshot(session) : null;

  useEffect(() => {
    if (!sessionRef.current || sessionRef.current.phase !== 'resolving') return undefined;
    let frame = 0;
    let enemyTimer = 0;
    let last = performance.now();
    const loop = (now) => {
      const current = sessionRef.current;
      if (!current || current.phase !== 'resolving') return;
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
      } else if (sessionRef.current?.phase === 'hitResolve') {
        enemyTimer = window.setTimeout(() => {
          if (sessionRef.current?.phase === 'hitResolve') {
            resolveEnemyTurn(sessionRef.current);
            refresh();
          }
        }, 900);
      }
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      if (enemyTimer) window.clearTimeout(enemyTimer);
    };
  }, [session?.phase]);

  const enemy = session ? enemyArt(session) : null;
  const enemySrc = enemy ? publicSrc(enemy) : null;
  const intent = session ? currentIntent(session) : null;
  const zoom = session?.fxQueue?.includes('spriteZoomAttack');
  const knock = session?.fxQueue?.includes('spriteKnockback');
  const breathe = session?.phase === 'playerAim' || session?.phase === 'intro';

  const pegs = session?.world?.pegs ?? session?.pegs ?? [];
  const ball = session?.world?.ball;
  const fountain = session?.physics.fountain;

  function pointerAim(event) {
    const node = boardRef.current;
    if (!node || !session || session.phase !== 'playerAim' || !session.selectedCardId) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const dx = x - fountain.x;
    const dy = Math.max(0.02, y - fountain.y);
    setAim(clampAim(Math.atan2(dx, dy)));
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

  return (
    <div className={`peg-battle ${harness ? 'harness' : ''}`}>
      <header className="battle-top">
        <button type="button" onClick={() => (onExit ? onExit() : (window.location.href = '/dev/peg-battle'))}>
          {onExit ? 'Peggle Land' : 'Harness'}
        </button>
        <div>
          <p className="kicker">Peg Battle</p>
          <h1>{session?.definition.enemy.name ?? 'Peg Battle'}</h1>
        </div>
        <div className="dev-row">
          <button type="button" onClick={() => replaceSession(resetBattle(sessionRef.current))}>
            Reset Battle
          </button>
          {harness && (
            <button
              type="button"
              onClick={() => replaceSession(newRandomBattle(catalog, { levelId: session?.definition.level.id }))}
            >
              New Random Battle
            </button>
          )}
        </div>
      </header>

      {session?.phase === 'intro' && (
        <div className="banner">{session.definition.level.introLine}</div>
      )}

      <div className="battle-grid">
        <aside className="enemy-panel">
          <Hearts current={session?.enemyHearts ?? 0} max={session?.enemyMaxHearts ?? 6} />
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
          <p className="intent">{intent?.telegraph}</p>
        </aside>

        <section
          className="playfield"
          ref={boardRef}
          onPointerMove={pointerAim}
          onPointerDown={pointerAim}
          onPointerUp={fire}
        >
          {session && (
            <div
              className="arena"
              style={{
                backgroundImage: publicSrc(session.catalog.manifest?.families?.arena?.slots?.idle)
                  ? `url(${publicSrc(session.catalog.manifest.families.arena.slots.idle)})`
                  : undefined,
              }}
            >
              <svg className="aim-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                {session.phase === 'playerAim' && session.selectedCardId && (
                  <g>
                    {Array.from({ length: 8 }, (_, index) => {
                      const t = 0.08 + index * 0.07;
                      const x = (fountain.x + Math.sin(aim) * t) * 100;
                      const y = (fountain.y + Math.cos(aim) * t) * 100;
                      return <circle key={index} cx={x} cy={y} r={1.1} fill="#fff" opacity={0.85} />;
                    })}
                  </g>
                )}
                {ball?.alive && (
                  <circle
                    cx={ball.x * 100}
                    cy={ball.y * 100}
                    r={session.physics.ballRadius * 100}
                    fill={selected?.behavior === 'bubble' ? '#9be7ff' : '#f7f1ea'}
                    stroke="#3a1f3d"
                    strokeWidth="0.6"
                  />
                )}
              </svg>
              {pegs.map((peg) => (
                <div
                  key={peg.id}
                  className="peg-slot"
                  style={{
                    left: `${peg.x * 100}%`,
                    top: `${peg.y * 100}%`,
                    width: `${session.physics.pegRadius * 2 * 100}%`,
                  }}
                >
                  <Peg
                    type={peg.kind}
                    charged={peg.charged}
                    painted={peg.painted}
                    muddy={peg.muddy}
                    hitIntensity={peg.hitThisShot ? 1 : 0}
                  />
                </div>
              ))}
              <ComicLayer queue={session.fxQueue} tier={session.lastImpactTier} />
              {session.lastPower > 0 && session.phase !== 'playerAim' && (
                <div className="power-call">{session.lastPower} POWER!</div>
              )}
            </div>
          )}
        </section>

        <aside className="player-panel">
          <Hearts current={session?.playerHearts ?? 0} max={session?.playerMaxHearts ?? 6} />
          {session?.shield > 0 && <Hearts current={session.shield} max={session.shield} kind="shield" />}
          <p className="status">{session?.status}</p>
          {debug && snapshot && (
            <pre className="debug">
              {`Turn: ${snapshot.turn}
Player HP: ${snapshot.playerHP}
Enemy HP: ${snapshot.enemyHP}
Current hand: ${snapshot.hand.join(', ')}
Deck queue: ${snapshot.deck.join(', ')}
Enemy intent: ${snapshot.enemyIntent}
Board: ${snapshot.board.charged} charged / ${snapshot.board.painted} painted / ${snapshot.board.muddy} muddy
Seed: ${snapshot.seed}
Phase: ${snapshot.phase}`}
            </pre>
          )}
        </aside>
      </div>

      <div className="hand">
        <p className="kicker">Your balls</p>
        <div className="cards">
          {(session?.hand ?? []).map((id) => {
            const card = session.definition.cards.find((entry) => entry.id === id);
            const art = cardArt(session, id);
            const src = publicSrc(art);
            const active = session.selectedCardId === id;
            return (
              <button
                key={id}
                type="button"
                className={`ball-card ${active ? 'active' : ''}`}
                disabled={session.phase !== 'playerAim'}
                onClick={() => pickCard(id)}
              >
                {src ? <img src={src} alt="" /> : <span className="glyph">{card?.glyph}</span>}
                <strong>{card?.shortName}</strong>
                <small>{card?.summary}</small>
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
