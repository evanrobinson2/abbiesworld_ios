// Original music for Lantern Hawks, written for this game. One theme (E minor,
// an opening leap E-B-E and a stepwise fall) runs through title, battle and
// ending, so the player hears it as the game's own tune.
//
// Helpers: m("E4:2 B4:2 -:4") expands "token:steps" into a step list (16 steps
// = one bar of 4/4). r(list, n) repeats a list. cat(...) joins bars.

const m = (s) => s.trim().split(/\s+/).flatMap((t) => {
  const i = t.lastIndexOf(':');
  const v = i > 0 ? t.slice(0, i) : t, n = i > 0 ? Number(t.slice(i + 1)) : 1;
  return [v, ...Array(n - 1).fill('.')];
});
const r = (list, n) => Array.from({ length: n }, () => list).flat();
const cat = (...xs) => xs.flat();
const d = (s) => s.trim().split(/\s+/);               // drums: one token per step
const pump = (root, o = 2) => r([`${root}${o}`, '.', `${root}${o + 1}`, '.'], 4); // octave bass, 1 bar
const pump8 = (a, b, o = 2) => cat(r([`${a}${o}`, '.', `${a}${o + 1}`, '.'], 2), r([`${b}${o}`, '.', `${b}${o + 1}`, '.'], 2));
const hold = (tok, steps = 16) => m(`${tok}:${steps}`);

// ---- the theme ----
const THEME_A = [
  'E4:2 B4:2 E5:4 D5:2 B4:2 G4:2 A4:2',
  'B4:6 A4:2 G4:2 F#4:2 E4:2 F#4:2',
  'G4:2 A4:2 B4:4 C5:2 B4:2 A4:2 G4:2',
];
const A_END_HOME = 'F#4:4 D4:2 F#4:2 E4:8';
const A_END_LIFT = 'F#4:4 G4:2 A4:2 B4:8';
const THEME_B = [
  'C5:4 B4:2 C5:2 D5:4 E5:4',
  'D5:2 C5:2 B4:4 G4:4 B4:4',
];
const B_END_OPEN = ['A4:2 B4:2 C5:4 B4:2 A4:2 G4:2 A4:2', 'B4:12 -:4'];
const B_END_HOME = ['A4:2 B4:2 C5:4 B4:2 A4:2 F#4:2 D#4:2', 'E4:12 -:4'];
const lead = (bars) => bars.flatMap(m);

const CH_A = cat(hold('Em'), hold('Em'), hold('C'), m('D:8 Em:8'));
const CH_A_LIFT = cat(hold('Em'), hold('Em'), hold('C'), m('D:8 B:8'));
const CH_B = cat(hold('C'), hold('G'), hold('Am'), hold('B'));
const CH_B_HOME = cat(hold('C'), hold('G'), m('Am:8 B:8'), hold('Em'));
const BASS_A = cat(pump('E'), pump('E'), pump('C'), pump8('D', 'E'));
const BASS_A_LIFT = cat(pump('E'), pump('E'), pump('C'), pump8('D', 'B', 1));
const BASS_B = cat(pump('C'), pump('G', 1), pump('A', 1), pump('B', 1));
const BASS_B_HOME = cat(pump('C'), pump('G', 1), pump8('A', 'B', 1), pump('E'));

// ---- title: heroic, minor, driving ----
const DR_T = d('k . h . s . h k . k h . s . h .');
const DR_T_FILL = d('k . h . s . h k . k s . s s t t');
const drT = (n) => cat(r(DR_T, n - 1), DR_T_FILL);

export const title = {
  bpm: 138,
  voices: {
    lead: { type: 'lead', wave: 'pulse0.25', gain: 0.15 },
    bass: { type: 'bass', gain: 0.2 },
    arp: { type: 'arp', octave: 4, gain: 0.05 },
    drums: { type: 'drums', gain: 0.85 },
  },
  patterns: {
    intro: {
      bass: cat(pump('E'), pump('E')),
      arp: cat(hold('Em'), hold('Em')),
      drums: cat(d('k . . . k . . . k . . . k . . .'), d('k . . . k . . . k . k . s s s s')),
      lead: m('-:16 -:8 B3:2 D4:2 E4:2 F#4:2'),
    },
    A: { lead: lead([...THEME_A, A_END_HOME]), bass: BASS_A, arp: CH_A, drums: drT(4) },
    A2: { lead: lead([...THEME_A, A_END_LIFT]), bass: BASS_A_LIFT, arp: CH_A_LIFT, drums: drT(4) },
    B: { lead: lead([...THEME_B, ...B_END_OPEN]), bass: BASS_B, arp: CH_B, drums: drT(4) },
    B2: { lead: lead([...THEME_B, ...B_END_HOME]), bass: BASS_B_HOME, arp: CH_B_HOME, drums: drT(4) },
    bridge: {
      lead: lead(['E5:8 D5:4 C5:4', 'E5:8 G5:4 E5:4', 'F#5:8 E5:4 D5:4', 'D#5:8 F#5:4 B4:4']),
      bass: cat(pump('A', 1), pump('C'), pump('D'), pump('B', 1)),
      arp: cat(hold('Am'), hold('C'), hold('D'), hold('B7')),
      drums: cat(r(d('k . h . s . h . k . h . s . h .'), 3), d('k . s . k s . s k s s s c . . .')),
    },
  },
  order: ['intro', 'A', 'A2', 'B', 'B2', 'bridge'],
  loopTo: 1,
};

// ---- battle: the theme, faster and harder, around a pedal riff ----
const RIFF = m('E2 E2 E3 E2 G2 E2 A2 E2 Bb2 E2 A2 E2 G2 E2 D3 E2');
const DR_B = d('kh h sh h kh kh sh h kh h sh h kh kh sh o');
const DR_B_FILL = d('kh h sh h kh kh sh h s s s s t t c .');
const drB = (n) => cat(r(DR_B, n - 1), DR_B_FILL);

export const battle = {
  bpm: 164,
  voices: {
    lead: { type: 'lead', wave: 'pulse0.25', gain: 0.15, vibrato: 0.005 },
    stab: { type: 'lead', wave: 'pulse0.5', gain: 0.1, gate: 0.6, vibrato: 0 },
    bass: { type: 'bass', gain: 0.22, gate: 0.7, cutHi: 2200 },
    arp: { type: 'arp', octave: 4, gain: 0.05, rate: 0.038 },
    drums: { type: 'drums', gain: 0.9 },
  },
  patterns: {
    riff: { bass: r(RIFF, 2), arp: cat(hold('Em'), hold('Epow')), drums: drB(2) },
    stabs: {
      bass: r(RIFF, 2),
      stab: cat(m('E5:1 -:1 E5:1 -:1 D5:2 E5:2 -:4 G5:2 F#5:2'), m('E5:1 -:1 E5:1 -:1 D5:2 B4:2 -:4 C5:2 D5:2')),
      arp: cat(hold('Em'), hold('Em')), drums: drB(2),
    },
    A: { lead: lead([...THEME_A, A_END_HOME]), bass: BASS_A, arp: CH_A, drums: drB(4) },
    A2: { lead: lead([...THEME_A, A_END_LIFT]), bass: BASS_A_LIFT, arp: CH_A_LIFT, drums: drB(4) },
    B: { lead: lead([...THEME_B, ...B_END_OPEN]), bass: BASS_B, arp: CH_B, drums: drB(4) },
    B2: { lead: lead([...THEME_B, ...B_END_HOME]), bass: BASS_B_HOME, arp: CH_B_HOME, drums: drB(4) },
  },
  order: ['riff', 'stabs', 'A', 'A2', 'riff', 'B', 'B2', 'stabs'],
  loopTo: 0,
};

// ---- ending: the theme in E major, broad and triumphant ----
const MAJ = { G: 'G#', C: 'C#', D: 'D#' };
const toMajor = (list) => list.map(t => (/^[GCD]\d$/.test(t) ? MAJ[t[0]] + t[1] : t));
const DR_E = d('kc . . . s . . . k . k . s . . .');
const DR_E2 = d('k . . . s . . . k . k . s . h h');

export const ending = {
  bpm: 112,
  voices: {
    lead: { type: 'lead', wave: 'pulse0.5', gain: 0.13, vibrato: 0.008 },
    pad: { type: 'pad', octave: 3, gain: 0.045, cutoff: 1500 },
    bass: { type: 'bass', gain: 0.2, gate: 0.95, cutHi: 900, cutLo: 300 },
    arp: { type: 'arp', octave: 5, gain: 0.035, rate: 0.06 },
    drums: { type: 'drums', gain: 0.7 },
  },
  patterns: {
    swell: { pad: cat(hold('E'), hold('Bsus4')), bass: m('E2:16 B1:16'), drums: m('c:16 -:16'), arp: cat(hold('E'), hold('B')) },
    A: {
      lead: toMajor(lead([...THEME_A, A_END_HOME])),
      pad: cat(hold('E'), hold('E'), hold('A'), m('B:8 E:8')),
      arp: cat(hold('E'), hold('E'), hold('A'), m('B:8 E:8')),
      bass: m('E2:8 B1:8 E2:8 G#2:8 A1:8 C#2:8 B1:8 E2:8'),
      drums: cat(DR_E, DR_E2, DR_E2, DR_E2),
    },
    B: {
      lead: toMajor(lead([...THEME_B, ...B_END_HOME])),
      pad: cat(hold('A'), hold('E'), m('F#m:8 B:8'), hold('E')),
      arp: cat(hold('A'), hold('E'), m('F#m:8 B:8'), hold('E')),
      bass: m('A1:8 C#2:8 E2:8 B1:8 F#1:8 B1:8 E2:16'),
      drums: cat(DR_E, DR_E2, DR_E2, d('k . s . k . s . s s s s c . . .')),
    },
  },
  order: ['swell', 'A', 'B', 'A'],
  loopTo: 1,
};

// ---- town: calm and warm, G major ----
export const town = {
  bpm: 96,
  voices: {
    lead: { type: 'lead', wave: 'triangle', gain: 0.2, vibrato: 0.006, attack: 0.02 },
    pad: { type: 'pad', octave: 3, gain: 0.04, cutoff: 900 },
    bass: { type: 'bass', wave: 'triangle', gain: 0.24, cutHi: 700, cutLo: 300, q: 1 },
    arp: { type: 'arp', octave: 4, gain: 0.03, rate: 0.09, wave: 'pulse0.5' },
    drums: { type: 'drums', gain: 0.35 },
  },
  patterns: {
    a: {
      lead: lead(['D5:4 B4:2 G4:2 A4:4 B4:4', 'C5:4 B4:2 A4:2 G4:8', 'E4:4 G4:2 B4:2 A4:6 G4:2', 'F#4:4 A4:4 D4:8']),
      pad: cat(hold('G'), hold('C'), m('Em:8 D:8'), hold('D')),
      arp: cat(hold('G'), hold('C'), m('Em:8 D:8'), hold('D')),
      bass: m('G2:6 D2:2 G2:8 C2:6 G2:2 C3:8 E2:8 D2:8 D2:6 A2:2 D2:8'),
      drums: r(d('k . . . h . . . r . . . h . . .'), 4),
    },
    b: {
      lead: lead(['B4:4 C5:2 D5:2 E5:4 D5:4', 'C5:4 B4:2 A4:2 B4:8', 'A4:4 B4:2 C5:2 D5:4 F#4:4', 'G4:12 -:4']),
      pad: cat(m('G:8 C:8'), m('Am:8 G:8'), m('Am:8 D:8'), hold('G')),
      arp: cat(m('G:8 C:8'), m('Am:8 G:8'), m('Am:8 D:8'), hold('G')),
      bass: m('G2:8 C2:8 A1:8 G1:8 A1:8 D2:8 G1:16'),
      drums: cat(r(d('k . . . h . . . r . . . h . . .'), 3), d('k . . . h . . . r . r . h . h .')),
    },
  },
  order: ['a', 'b'],
};

// ---- occupied: tense and sparse, a slowed hint of the theme's leap ----
const HEART = d('k . . k . . . . . . . . . . . .');
export const occupied = {
  bpm: 84,
  voices: {
    lead: { type: 'lead', wave: 'pulse0.125', gain: 0.1, vibrato: 0.012, attack: 0.04 },
    pad: { type: 'pad', octave: 2, gain: 0.05, cutoff: 600, attack: 0.8, tail: 0.8 },
    bass: { type: 'bass', gain: 0.2, gate: 1, cutHi: 500, cutLo: 160, q: 2 },
    drums: { type: 'drums', gain: 0.55 },
  },
  patterns: {
    a: {
      lead: lead(['-:16', '-:8 E4:2 B4:6', '-:4 B4:2 C5:10', '-:16']),
      pad: cat(hold('Em'), hold('Em'), hold('F'), hold('Em')),
      bass: m('E1:16 E1:16 F1:16 E1:16'),
      drums: cat(HEART, HEART, HEART, d('k . . k . . . . . . . . r . r .')),
    },
    b: {
      lead: lead(['-:8 E5:4 D#5:4', 'D5:16', '-:4 G4:4 F#4:4 F4:4', 'E4:12 -:4']),
      pad: cat(hold('Em'), hold('Bbpow'), hold('Cm'), hold('Em')),
      bass: m('E1:16 Bb1:16 C2:16 E1:16'),
      drums: cat(HEART, HEART, HEART, d('k . . k . . . . r . r . r r r r')),
    },
  },
  order: ['a', 'b'],
};

// ---- interior: soft, slow chords ----
export const interior = {
  bpm: 76,
  voices: {
    lead: { type: 'lead', wave: 'triangle', gain: 0.16, vibrato: 0.005, attack: 0.05 },
    pad: { type: 'pad', octave: 3, gain: 0.04, cutoff: 800, attack: 0.6, tail: 0.6, wave: 'triangle' },
    arp: { type: 'arp', octave: 4, gain: 0.03, rate: 0.16, wave: 'triangle' },
    bass: { type: 'bass', wave: 'triangle', gain: 0.2, gate: 1, cutHi: 500, cutLo: 300, q: 0.7 },
  },
  patterns: {
    a: {
      pad: cat(hold('Fmaj7'), hold('Em7'), hold('Dm7'), hold('Gsus4')),
      arp: cat(hold('Fmaj7'), hold('Em7'), hold('Dm7'), hold('Gsus4')),
      bass: m('F2:16 E2:16 D2:16 G1:16'),
      lead: lead(['A4:8 G4:4 E4:4', 'G4:16', 'F4:8 E4:4 D4:4', 'D4:12 -:4']),
    },
    b: {
      pad: cat(hold('Fmaj7'), hold('Em7'), hold('Am'), hold('G')),
      arp: cat(hold('Fmaj7'), hold('Em7'), hold('Am'), hold('G')),
      bass: m('F2:16 E2:16 A1:16 G1:16'),
      lead: lead(['C5:8 B4:4 A4:4', 'G4:8 E4:8', 'A4:6 B4:2 C5:8', 'B4:12 -:4']),
    },
  },
  order: ['a', 'b'],
};

// ---- sneak: an ostinato that builds over three passes ----
const OST = m('E2 - E2 - E2 - F2 - E2 - E2 - G2 - F2 -');
const TICK = d('h . h h h . h h h . h h h . r .');
export const sneak = {
  bpm: 112,
  voices: {
    lead: { type: 'lead', wave: 'pulse0.25', gain: 0.11, vibrato: 0.006 },
    bass: { type: 'bass', gain: 0.22, gate: 0.5, cutHi: 1200, cutLo: 250 },
    arp: { type: 'arp', octave: 3, gain: 0.04, rate: 0.07, wave: 'pulse0.25' },
    drums: { type: 'drums', gain: 0.5 },
  },
  patterns: {
    one: { bass: r(OST, 4), drums: r(TICK, 4) },
    two: { bass: r(OST, 4), drums: cat(r(TICK, 3), d('h . h h h . h h s . s . s s s s')), arp: cat(hold('Em'), hold('Em'), hold('Fsus2'), hold('Em')) },
    three: {
      bass: r(OST, 4),
      arp: cat(hold('Em'), hold('Em'), hold('Fsus2'), hold('Em')),
      drums: r(d('k . h h s . h h k . h h s . r r'), 4),
      lead: lead(['E4:2 B4:6 -:8', 'E4:2 B4:2 C5:4 -:8', 'F4:4 F#4:4 G4:4 G#4:4', 'A4:4 A#4:4 B4:8']),
    },
  },
  order: ['one', 'two', 'three'],
};

// ---- cave: echoing and mysterious, sparse plucks over a drone ----
export const cave = {
  bpm: 66,
  echo: { time: 0.42, feedback: 0.5, mix: 0.55 },
  voices: {
    lead: { type: 'lead', wave: 'pulse0.125', gain: 0.1, gate: 0.4, vibrato: 0, release: 0.2 },
    pad: { type: 'pad', octave: 2, gain: 0.05, cutoff: 500, attack: 1.2, tail: 1 },
    drums: { type: 'drums', gain: 0.6 },
  },
  patterns: {
    a: {
      pad: cat(hold('Epow'), hold('Epow'), hold('Dpow'), hold('Epow')),
      lead: lead(['E5:4 -:4 B4:4 -:4', '-:4 D5:4 A4:8', 'F#5:4 -:4 E5:2 D5:2 -:4', 'B4:16']),
      drums: cat(d('. . . . . . p . . . . . . . . .'), d('. . . . . . . . . . . p . . . .'), d('. . p . . . . . . . . . . . . .'), d('. . . . . . . . p . . . . . p .')),
    },
    b: {
      pad: cat(hold('Cpow'), hold('Dpow'), hold('Epow'), hold('Epow')),
      lead: lead(['G5:4 -:4 E5:4 -:4', 'F#5:4 -:4 A4:8', '-:8 E4:2 B4:6', '-:16']),
      drums: cat(d('. . . . . . . . . p . . . . . .'), d('. . . . p . . . . . . . . . . .'), d('. . . . . . . . . . . . . p . .'), d('. . . . . . . . . . . . . . . .')),
    },
  },
  order: ['a', 'b'],
};

// ---- stings (play once) ----
export const victory = {
  bpm: 150,
  loop: false,
  voices: {
    lead: { type: 'lead', wave: 'pulse0.25', gain: 0.16, vibrato: 0.008 },
    pad: { type: 'pad', octave: 3, gain: 0.05, cutoff: 1800, attack: 0.05, tail: 0.6 },
    bass: { type: 'bass', gain: 0.2, gate: 1 },
    drums: { type: 'drums', gain: 0.8 },
  },
  patterns: {
    a: {
      lead: m('E4:2 B4:2 E5:4 D#5:2 E5:2 F#5:2 G#5:2 B5:14 -:2'),
      pad: m('E:8 B:8 E:14 -:2'),
      bass: m('E2:8 B1:8 E2:14 -:2'),
      drums: d('kc . . . s . . . k . k . s s s s kc . . . . . . . . . . . . . . .'),
    },
  },
  order: ['a'],
};

export const defeat = {
  bpm: 92,
  loop: false,
  voices: {
    lead: { type: 'lead', wave: 'pulse0.125', gain: 0.13, vibrato: 0.014 },
    pad: { type: 'pad', octave: 2, gain: 0.05, cutoff: 700, attack: 0.1, tail: 0.8 },
    bass: { type: 'bass', gain: 0.2, gate: 1, cutHi: 600, cutLo: 150 },
    drums: { type: 'drums', gain: 0.6 },
  },
  patterns: {
    a: {
      lead: m('E5:4 D5:4 B4:4 A#4:4 A4:4 F#4:4 E4:6 -:2'),
      pad: m('Em:8 Dm:8 Cm:8 Em:8'),
      bass: m('E2:8 D2:8 C2:8 E1:8'),
      drums: d('k . . . . . . . t . . . . . . . k . . . . . . . . . . . . . . .'),
    },
  },
  order: ['a'],
};

export const SONGS = { title, town, occupied, interior, sneak, battle, cave, ending, victory, defeat };
