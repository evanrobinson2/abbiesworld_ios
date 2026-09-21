export function Peg({
  type = 'normal',
  charged = false,
  painted = false,
  muddy = false,
  sticky = false,
  present = true,
  gone = false,
  strength = 1,
  valuable = false,
  hitIntensity = 0,
}) {
  const isGone = gone || present === false;
  const isSticky = sticky || muddy;
  const isValuable = valuable || charged || type === 'star';
  const fill =
    type === 'star' ? '#f4c430' : type === 'heart' ? '#ef6d8a' : '#7ad3c1';
  return (
    <svg
      viewBox="0 0 72 60"
      className={`peg svg-peg ${isGone ? 'gone' : ''} ${isSticky ? 'sticky' : ''} ${isValuable ? 'valuable' : ''}`}
    >
      {isGone ? (
        <rect
          x="6"
          y="6"
          width="60"
          height="48"
          rx="10"
          fill="none"
          stroke="#3a1f3d"
          strokeWidth="2"
          strokeDasharray="5 4"
          opacity="0.28"
        />
      ) : (
        <>
          {isValuable && (
            <rect
              x="2"
              y="2"
              width="68"
              height="56"
              rx="12"
              fill="none"
              stroke="#fff4b0"
              strokeWidth={3 + hitIntensity * 2}
              opacity="0.85"
            />
          )}
          <rect x="6" y="6" width="60" height="48" rx="10" fill={fill} stroke="#3a1f3d" strokeWidth="3" />
          {painted && <rect x="6" y="6" width="60" height="48" rx="10" fill="rgba(142, 70, 196, 0.45)" />}
          {isSticky && (
            <>
              <rect x="6" y="6" width="60" height="48" rx="10" fill="rgba(92, 58, 28, 0.38)" />
              <ellipse cx="24" cy="50" rx="6" ry="8" fill="rgba(92, 58, 28, 0.55)" />
              <ellipse cx="48" cy="52" rx="5" ry="7" fill="rgba(92, 58, 28, 0.5)" />
            </>
          )}
          {type === 'star' && (
            <path
              d="M36 14 L39 24 L50 25 L41 32 L44 43 L36 37 L28 43 L31 32 L22 25 L33 24 Z"
              fill="#fff6c8"
              stroke="#3a1f3d"
              strokeWidth="1.4"
            />
          )}
          {type === 'heart' && (
            <path
              d="M36 42 L24 30 A8 8 0 0 1 36 22 A8 8 0 0 1 48 30 Z"
              fill="#fff"
              opacity="0.9"
            />
          )}
          {strength > 1 && (
            <text x="36" y="38" textAnchor="middle" fontSize="16" fontWeight="700" fill="#3a1f3d">
              {strength}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
