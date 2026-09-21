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
  const brickFill = type === 'star' ? '#f0c430' : type === 'heart' ? '#ef6d8a' : '#5ec4b4';
  return (
    <svg
      viewBox="0 0 80 66"
      className={`peg svg-peg ${isGone ? 'gone' : ''} ${isSticky ? 'sticky' : ''} ${isValuable ? 'valuable' : ''} ${hitIntensity ? 'hit' : ''}`}
    >
      <rect
        x="8"
        y="8"
        width="64"
        height="50"
        rx="9"
        fill="none"
        stroke="#241428"
        strokeWidth="2.2"
        strokeDasharray={isGone ? '5 4' : '0'}
        opacity={isGone ? 0.4 : 0.12}
      />
      {(!isGone || hitIntensity > 0) && (
        <g className="brick-body">
          <rect x="10" y="12" width="64" height="50" rx="9" fill="#1c3330" opacity="0.45" />
          {isValuable && (
            <rect x="4" y="4" width="72" height="58" rx="12" fill="none" stroke="#ffe36a" strokeWidth="4" />
          )}
          <rect x="8" y="8" width="64" height="50" rx="9" fill={brickFill} stroke="#241428" strokeWidth="3" />
          <rect x="14" y="12" width="46" height="11" rx="6" fill="rgba(255,255,255,0.32)" />
          {painted && <rect x="8" y="8" width="64" height="50" rx="9" fill="rgba(142, 70, 196, 0.48)" />}
          {isSticky && (
            <>
              <rect x="8" y="8" width="64" height="50" rx="9" fill="rgba(92, 58, 28, 0.42)" />
              <ellipse cx="26" cy="56" rx="7" ry="9" fill="rgba(92, 58, 28, 0.7)" />
              <ellipse cx="54" cy="58" rx="6" ry="8" fill="rgba(92, 58, 28, 0.62)" />
            </>
          )}
          {type === 'star' && (
            <path
              d="M40 16 L44 28 L56 29 L46 37 L50 50 L40 42 L30 50 L34 37 L24 29 L36 28 Z"
              fill="#fff6c8"
              stroke="#241428"
              strokeWidth="1.6"
            />
          )}
          {type === 'heart' && (
            <path
              d="M40 48 L24 34 A10 10 0 0 1 40 24 A10 10 0 0 1 56 34 Z"
              fill="#fff"
              opacity="0.95"
            />
          )}
          {strength > 1 && (
            <g>
              <circle cx="64" cy="18" r="11" fill="#fff8e8" stroke="#241428" strokeWidth="2" />
              <text x="64" y="23" textAnchor="middle" fontSize="14" fontWeight="800" fill="#241428">
                {strength}
              </text>
            </g>
          )}
          {hitIntensity > 0 && (
            <rect x="8" y="8" width="64" height="50" rx="9" fill="#fff" opacity="0.35" />
          )}
        </g>
      )}
    </svg>
  );
}
