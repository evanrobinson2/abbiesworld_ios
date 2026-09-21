const WORD = {
  recoil: null,
  impactFlash: 'POW!',
  comicBurst: 'KAPOW!',
  screenShake: null,
  speedLines: null,
  shockwave: 'WOOF!',
  slashOverlay: 'SCRATCH!',
  pawSwipe: 'WHAM!',
  starScatter: null,
  heartScatter: null,
  spriteZoomAttack: null,
  spriteKnockback: null,
  spriteLunge: null,
  freezeFrame: null,
  stateCrossfade: null,
  playerDamage: null,
};

export function ComicLayer({ queue = [], tier = 0 }) {
  const word = queue.map((id) => WORD[id]).find(Boolean);
  const shake = queue.includes('screenShake');
  const flash = queue.includes('impactFlash');
  const lines = queue.includes('speedLines');
  const shock = queue.includes('shockwave');
  const slash = queue.includes('slashOverlay');
  const paw = queue.includes('pawSwipe');
  const freeze = queue.includes('freezeFrame');
  const stars = queue.includes('starScatter');
  const hearts = queue.includes('heartScatter');
  return (
    <div className={`comic-layer ${shake ? 'shake' : ''}`} aria-hidden="true">
      {freeze && <div className="fx-freeze" />}
      {flash && <div className="fx-flash" />}
      {lines && <div className="fx-lines" />}
      {shock && (
        <svg className="fx-shock" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="18" fill="none" stroke="#3a1f3d" strokeWidth="6" />
        </svg>
      )}
      {slash && <div className="fx-slash" />}
      {paw && (
        <svg className="fx-paw" viewBox="0 0 120 120">
          <ellipse cx="60" cy="78" rx="28" ry="22" fill="rgba(58,31,61,0.55)" />
          <circle cx="28" cy="48" r="10" fill="rgba(58,31,61,0.55)" />
          <circle cx="48" cy="32" r="10" fill="rgba(58,31,61,0.55)" />
          <circle cx="72" cy="32" r="10" fill="rgba(58,31,61,0.55)" />
          <circle cx="92" cy="48" r="10" fill="rgba(58,31,61,0.55)" />
        </svg>
      )}
      {stars && <div className="fx-scatter">✨⭐✨</div>}
      {hearts && <div className="fx-scatter hearts">❤️💕❤️</div>}
      {word && <div className={`fx-word tier-${tier}`}>{word}</div>}
    </div>
  );
}
