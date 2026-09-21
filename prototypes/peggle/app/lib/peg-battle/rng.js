/** Mulberry32 — small seeded PRNG. Physics is not claimed deterministic. */

export function hashSeed(value) {
  const text = String(value ?? 'peg-battle');
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let t = hashSeed(seed);
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, random) {
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function pickN(list, n, random, predicate = () => true) {
  const pool = list.filter(predicate);
  const chosen = [];
  const copy = pool.slice();
  while (chosen.length < n && copy.length) {
    const index = Math.floor(random() * copy.length);
    chosen.push(copy.splice(index, 1)[0]);
  }
  return chosen;
}
