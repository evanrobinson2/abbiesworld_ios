# AW-STUDY-0010: Abbie's World Score

Requested by Evan, 2026-10-23 03:39Z: "put this into studies". It started as the composer thread on 2026-10-22 and
became a study when Evan posted the Music Bible.

Page (listening room): https://claude.ai/artifact/5Es88srv8cG13XiYU6FFCW

## Canon

`MUSIC_BIBLE.md` (copied here from `docs/music/MUSIC_BIBLE.md` on the live branch `claude/live-snapshot-2026-10-22`,
where the generator lives) is the source of truth: one Abbie's World identity in D major, 122–126 bpm, 4/4 with a
3+3+2 rhythm, arranged per world (ranch, treehouses, HQ/moon, Halloween, lo-fi), plus the Mysterious, Intense and Epic
gameplay modes and the sonic-identity stings.

## Open decision

Which melody is canonical: A, the later four-phrase hook (D E F♯ A · B A F♯ E · D F♯ A B · A E F♯ D, recommended), or
B, the 13 September motif (D F♯ A B G♯ A · F♯ E D). Both are rendered note for note as MIDI and audio in
`tools/composer/motifs/` on the live branch.

## What exists (live branch)

- `tools/composer/api/briefs-bible.json`: 16 cues built from the Bible. `elevenlabs.py` and the `music-takes`
  workflow generate them, and every take's JSON sidecar carries a `trace` block (Bible section 9: identity, source
  motif, world, place, situation, mode, key, bpm, instrumentation, mood, intensity, variants, duration).
- `tools/composer/takes/`: 32 Bible takes (2 per cue), plus two earlier batches made before the Bible.
- Findings: ElevenLabs (licensed for indie games on a paid plan) matches style, key and tempo, and every take came
  within about 1 bpm of its brief. It cannot reproduce a melody from text, so the real theme has to come from
  Evan's own Suno song, either in Suno's Cover mode or through a model that takes audio conditioning. Google
  Lyria is ruled out, because its terms ban apps likely to be used by under-18s.

## Next

1. Pull Evan's sung Abbie's World song and its versions from his Suno library. It is not in the repo or the project
   files.
2. Use Suno Cover on his own song to make each world's arrangement, so every version carries the real tune.
3. Put Evan's picks into the game through the music director (`tools/composer/runtime/`), and later the in-world
   jukebox.
