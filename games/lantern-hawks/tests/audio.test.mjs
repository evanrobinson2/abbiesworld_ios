// Audio contracts: every cue exists, every pattern is whole bars with all voices
// the same length, every token is a note, chord or drum the tracker can play.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS } from '../src/audio/songs.js';
import { songSeconds } from '../src/audio/tracker.js';
import { NOTE } from '../src/audio/engine.js';

const CUES = ['title', 'town', 'occupied', 'interior', 'sneak', 'battle', 'cave', 'ending', 'victory', 'defeat'];
const CHORD = /^([A-G])([#b]?)(maj7|m7|sus4|sus2|dim|pow|m|7)?$/;

test('every music cue is defined', () => {
  for (const c of CUES) assert.ok(SONGS[c], `missing cue ${c}`);
});

test('patterns are whole bars and tokens are playable', () => {
  for (const [name, song] of Object.entries(SONGS)) {
    for (const o of song.order) assert.ok(song.patterns[o], `${name}: order names unknown pattern ${o}`);
    for (const [pname, pat] of Object.entries(song.patterns)) {
      const lens = Object.values(pat).map(a => a.length);
      assert.ok(lens.every(l => l === lens[0]), `${name}.${pname}: voice lengths differ ${lens}`);
      assert.equal(lens[0] % 16, 0, `${name}.${pname}: ${lens[0]} steps is not whole bars`);
      for (const [voice, toks] of Object.entries(pat)) {
        const type = song.voices[voice]?.type;
        assert.ok(type, `${name}.${pname}: voice ${voice} has no instrument`);
        for (const t of toks) {
          if (t === '.' || t === '-') continue;
          const ok = type === 'drums' ? /^[ksohctpr]+$/.test(t)
            : type === 'arp' ? CHORD.test(t)
            : type === 'pad' ? CHORD.test(t) || NOTE(t) !== null
            : NOTE(t) !== null;
          assert.ok(ok, `${name}.${pname}.${voice}: bad token "${t}"`);
        }
      }
    }
  }
});

test('the theme opens title, battle and ending', () => {
  const opening = (song, p) => song.patterns[p].lead.filter(t => t !== '.').slice(0, 3).join(' ');
  assert.equal(opening(SONGS.title, 'A'), 'E4 B4 E5');
  assert.equal(opening(SONGS.battle, 'A'), 'E4 B4 E5');
  assert.equal(opening(SONGS.ending, 'A'), 'E4 B4 E5');
});

test('stings are short and play once', () => {
  for (const c of ['victory', 'defeat']) {
    assert.equal(SONGS[c].loop, false);
    assert.ok(songSeconds(SONGS[c]) < 7, `${c} is ${songSeconds(SONGS[c])} s`);
  }
});
