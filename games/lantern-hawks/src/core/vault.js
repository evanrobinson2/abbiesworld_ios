// The vault under the cave: a small node map of rooms joined by doors.
// Pure: which rooms are open, and how the squad gets from one to another.

export function nodeOpen(node, state) {
  return !node.lock || !!state.flags[node.lock.flag];
}

// Route from room `from` to room `to` through open rooms.
// { ok: true, path }            path excludes `from`, ends at `to`
// { ok: false, locked, at }     `to` is shut; `at` is the open room next to it
// { ok: false, reason }         no way there at all
export function vaultRoute(vault, state, from, to) {
  const nodes = vault.nodes;
  if (!nodes[to]) return { ok: false, reason: 'No such room.' };
  if (from === to) return { ok: true, path: [] };
  const target = nodes[to];
  const prev = new Map([[from, null]]);
  const queue = [from];
  let near = null;
  while (queue.length) {
    const cur = queue.shift();
    if (nodes[cur].links.includes(to)) {
      if (nodeOpen(target, state)) { prev.set(to, cur); break; }
      if (!near) near = cur;
    }
    for (const n of nodes[cur].links) {
      if (prev.has(n) || !nodeOpen(nodes[n], state)) continue;
      prev.set(n, cur);
      queue.push(n);
    }
  }
  if (!prev.has(to) || !nodeOpen(target, state)) {
    if (near) return { ok: false, locked: target.lock, at: near };
    return { ok: false, reason: 'No way through from here.' };
  }
  const path = [];
  for (let k = to; k !== from; k = prev.get(k)) path.unshift(k);
  return { ok: true, path };
}

// What to say at a locked door.
export function lockedMessage(lock) {
  return `${lock.label} is shut. It wants the ${lock.color} card.`;
}
