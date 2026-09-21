export function Peg({
  type = 'normal',
  charged = false,
  painted = false,
  muddy = false,
  selected = false,
  hitIntensity = 0,
}) {
  const fill =
    type === 'star' ? '#f4c430' : type === 'heart' ? '#ef6d8a' : '#7ad3c1';
  const glow = charged ? 0.9 : selected ? 0.45 : hitIntensity * 0.6;
  return (
    <svg viewBox="0 0 64 64" className={`peg svg-peg ${charged ? 'charged' : ''} ${muddy ? 'muddy' : ''}`}>
      {glow > 0 && (
        <circle cx="32" cy="32" r="28" fill="none" stroke="#fff4b0" strokeWidth={4 + glow * 4} opacity={0.35 + glow * 0.4} />
      )}
      <circle cx="32" cy="32" r="20" fill={fill} stroke="#3a1f3d" strokeWidth="3.5" />
      {painted && <circle cx="32" cy="32" r="20" fill="rgba(142, 70, 196, 0.45)" />}
      {muddy && <circle cx="32" cy="32" r="20" fill="rgba(92, 58, 28, 0.42)" />}
      {type === 'star' && (
        <path
          d="M32 16 L35.2 26.2 L46 27.1 L38 34.1 L40.4 44.6 L32 38.8 L23.6 44.6 L26 34.1 L18 27.1 L28.8 26.2 Z"
          fill="#fff6c8"
          stroke="#3a1f3d"
          strokeWidth="1.5"
        />
      )}
      {type === 'heart' && (
        <path
          d="M32 44 L20 32 A8 8 0 0 1 32 24 A8 8 0 0 1 44 32 Z"
          fill="#fff"
          opacity="0.85"
        />
      )}
      {charged && <circle cx="22" cy="22" r="4" fill="#fff" opacity="0.8" />}
    </svg>
  );
}
