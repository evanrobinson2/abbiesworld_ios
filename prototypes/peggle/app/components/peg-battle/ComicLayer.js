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
  return (
    <div className={`comic-layer ${shake ? 'shake' : ''}`} aria-hidden="true">
      {flash && <div className="fx-flash" />}
      {lines && <div className="fx-lines" />}
      {shock && <div className="fx-shock" />}
      {slash && <div className="fx-slash" />}
      {paw && <div className="fx-paw" />}
      {word && <div className={`fx-word tier-${tier}`}>{word}</div>}
    </div>
  );
}
