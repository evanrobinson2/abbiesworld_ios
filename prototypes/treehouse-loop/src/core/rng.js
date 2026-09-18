// Counter-based PRNG. Pure: the same (seed, counter) always gives the same
// number, so the machine can stay a plain reducer and still make surprising
// choices. Nothing here holds state.

export function hashSeed(value) {
  if (typeof value === 'number') return value | 0;
  let h = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

export function rngAt(seed, counter) {
  let h = (seed ^ 0x9e3779b9) + Math.imul(counter | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function pickAt(seed, counter, options) {
  const roll = rngAt(seed, counter);
  const index = Math.min(options.length - 1, Math.floor(roll * options.length));
  return options[index];
}
