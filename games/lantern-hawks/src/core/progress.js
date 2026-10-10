// Which story beat the player is on, read from flags. Shown in the status panel.

export const BEATS = [
  { n: 1, name: 'Cadet life', done: s => (s.flags.training_passed ?? 0) >= 1 },
  { n: 2, name: 'The dream', done: s => !!s.flags.dreamt },
  { n: 3, name: 'The duel and the invitation', done: s => !!s.flags.duel_won },
  { n: 4, name: 'The Lamplight, then the raid', done: s => !!s.flags.raid_happened },
  { n: 5, name: 'A plain coat and the port', done: s => !!s.flags.inauguration_known },
  { n: 6, name: 'The inauguration', done: s => !!s.flags.mentor_joined },
  { n: 7, name: 'The damaged disk', done: s => !!s.flags.saw_damaged_disk },
  { n: 8, name: 'Gathering the lanterns', done: s => !!(s.flags.met_doctor && s.flags.met_tech) },
  { n: 9, name: 'The tinker\'s questions', done: s => !!s.flags.has_password },
  { n: 10, name: 'The cave door', done: s => !!s.flags.cave_open },
  { n: 11, name: 'The vault', done: s => !!s.flags.relay_sent },
  { n: 12, name: 'The Regent and the unit', done: s => !!s.flags.game_won },
];

export function currentBeat(state) {
  const next = BEATS.find(b => !b.done(state));
  return next ? `Beat ${next.n}: ${next.name}` : 'The end: the unit is its own';
}

export function objective(state) {
  const f = state.flags;
  const has = (id) => state.party.some(p => p.id === id);
  if (f.game_won) return 'Done. Thank you for playing.';
  if (f.cave_open) {
    if (!f.key_red) return 'Read your father\'s note in the vault antechamber.';
    if (!f.key_blue) return 'Find the blue card in the map room.';
    if (!f.key_yellow) return 'Find the yellow card in the workshop.';
    if (!f.power_on) return 'Throw the breakers in the storeroom, past the hangar.';
    if (!f.code_solved) return 'Open the white door: the lamps on the map table, from the top, the way the sun goes.';
    return 'Call the Regent from the relay room.';
  }
  if (f.has_password) return has('mentor') ? 'Open the cave door, southeast of the tinker\'s hut.' : 'Bring the mentor to the cave door.';
  if (f.mentor_joined) {
    if (!f.saw_damaged_disk) return 'Find a viewer for the cracked disk: the old projector in the barracks, or the stockade mayor\'s.';
    const missing = [];
    if (!f.met_doctor) missing.push('the doctor (Citadel Town hospital records)');
    if (!f.met_tech) missing.push('the tech (port repair shop)');
    if (!f.jailbreak_done) missing.push('the prisoner (the stockade; never alone)');
    if (!f.met_doctor || !f.met_tech) return `Gather the lanterns: ${missing.join(', ')}.`;
    return `Visit the tinker's hut in the far northwest.${missing.length ? ` Optional: ${missing.join(', ')}.` : ''}`;
  }
  if (f.inauguration_known) return f.civilian_clothes ? 'Go back to the inaugural hall and wait for dusk. Alone.' : 'Buy plain clothes, then go back to the hall at dusk.';
  if (f.port_seen) return f.civilian_clothes ? 'Ask around the inaugural hall.' : 'Buy plain clothes at the tailor, then try the inaugural hall.';
  if (f.raid_happened) return f.civilian_clothes ? 'Take the east road over the bridge to the port town.' : 'Buy plain clothes at the outfitter, then take the east road to the port.';
  if (f.met_juno) return f.trained_today ? 'Sleep, then take Mission Three at the school.' : 'Take Mission Three at the school.';
  if (f.duel_won) return 'Meet the senior cadet at the Lamplight.';
  if (f.duel_ready) return f.trained_today ? 'Sleep at the barracks; the field reopens tomorrow.' : 'Go to the practice field gate and start the duel.';
  if ((f.training_passed ?? 0) >= 1 && !f.rested) return 'Sleep at the barracks.';
  if ((f.training_passed ?? 0) >= 1) return 'Read the mission board at the school.';
  return 'Report to the cadet school and run your first mission.';
}
