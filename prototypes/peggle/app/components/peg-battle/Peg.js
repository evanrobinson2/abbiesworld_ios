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
  const fill = type === 'star' ? '#e8b030' : type === 'heart' ? '#d05070' : '#48a090';
  const shade = type === 'star' ? '#a07818' : type === 'heart' ? '#882040' : '#2c6860';
  return (
    <svg viewBox="0 0 16 14" className={`peg svg-peg ${isGone ? 'gone' : ''} ${hitIntensity ? 'hit' : ''}`} shapeRendering="crispEdges">
      <rect x="1" y="1" width="14" height="12" fill="none" stroke="#201018" strokeWidth="1" strokeDasharray={isGone ? '2 2' : '0'} opacity={isGone ? 0.45 : 0.2} />
      {(!isGone || hitIntensity > 0) && (
        <g className="brick-body">
          {isValuable && <rect x="0" y="0" width="16" height="14" fill="#f0d030" />}
          <rect x="1" y="1" width="14" height="12" fill={shade} />
          <rect x="1" y="1" width="13" height="11" fill={fill} />
          <rect x="2" y="2" width="8" height="2" fill="rgba(248,248,232,0.35)" />
          {painted && <rect x="1" y="1" width="14" height="12" fill="#7038a8" opacity="0.55" />}
          {isSticky && <rect x="1" y="1" width="14" height="12" fill="#704828" opacity="0.55" />}
          {type === 'star' && <rect x="7" y="5" width="2" height="4" fill="#201018" />}
          {type === 'heart' && <rect x="6" y="5" width="4" height="3" fill="#f8f0e8" />}
          {strength > 1 && (
            <text x="13" y="5" textAnchor="middle" fontSize="4" fontFamily="monospace" fill="#201018">
              {strength}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
