// Every proper name in the game comes from names.json through this module.
// Scene text uses {placeholders}; an unknown placeholder renders as {?key}
// so a gap is visible instead of silently blank.

export function nameDict(names) {
  const d = {
    title: names.title,
    subtitle: names.subtitle,
    planet: names.planet,
    unit: names.unit,
    defenders: names.houses?.defenders?.name,
    occupiers: names.houses?.occupiers?.name,
  };
  // A leading title ("Marshal", "Regent", "Dr.") is not a first name:
  // "Dr. Ama Reyes" -> doctor_first is Ama.
  const TITLES = new Set(['marshal', 'regent', 'dr.', 'doctor', 'captain', 'sir', 'lady', 'lord']);
  for (const [role, full] of Object.entries(names.cast || {})) {
    d[role] = full;
    const parts = full.split(' ');
    const first = parts.length > 1 && TITLES.has(parts[0].toLowerCase()) ? parts[1] : parts[0];
    d[`${role}_first`] = first;
    d[`${role}_last`] = parts[parts.length - 1];
  }
  for (const m of names.mechs || []) d[`slot${m.replaces_slot}`] = m.name;
  return d;
}

export function mechName(dict, mechDef) {
  return dict[`slot${mechDef.nameSlot}`] ?? `{?slot${mechDef.nameSlot}}`;
}

export function fill(text, dict) {
  if (typeof text !== 'string') return text;
  return text.replace(/\{([a-z0-9_]+)\}/gi, (_, k) => (dict[k] !== undefined ? dict[k] : `{?${k}}`));
}
