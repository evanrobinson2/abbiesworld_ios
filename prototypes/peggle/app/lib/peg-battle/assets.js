const logged = new Set();

export function getFamily(manifest, familyId) {
  return manifest?.families?.[familyId] ?? null;
}

export function getEnemyState(manifest, character, state) {
  return getSlot(manifest, character, state);
}

export function getSlot(manifest, familyId, slot) {
  const family = getFamily(manifest, familyId);
  const entry = family?.slots?.[slot] ?? null;
  if (!entry || entry.missing) {
    logMissing(`${familyId}/${slot}`);
    return {
      id: `${familyId}/${slot}`,
      family: familyId,
      state: slot,
      src: null,
      missing: true,
      placeholder: placeholderFor(familyId, slot),
    };
  }
  return { ...entry, missing: false, placeholder: null };
}

export function publicSrc(entry, { publicPrefix = '/assets/peg-battle' } = {}) {
  if (!entry || entry.missing || !entry.src) return null;
  const file = String(entry.src).split('/').pop();
  return `${publicPrefix}/${file}`;
}

function logMissing(key) {
  if (logged.has(key)) return;
  logged.add(key);
  console.warn(`[peg-battle] missing asset ${key} — using named placeholder`);
}

export function resetMissingLog() {
  logged.clear();
}

function placeholderFor(familyId, slot) {
  return {
    label: `${familyId} ${slot}`,
    fill: familyId === 'bad-doggo' ? '#c9854a' : familyId === 'balls' ? '#f4c430' : '#8ec9c0',
  };
}
