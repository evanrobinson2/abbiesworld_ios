# Abbie's World — Music Bible

> **AW-STUDY-0010: Abbie's World Score.** **Canon (Evan, 2026-10-23).** This is the source of truth for Abbie's World music. Briefs, takes and the music
> director follow it. Machine-readable form: `tools/composer/api/briefs-bible.json`. Reference renders of both
> melodies: `tools/composer/motifs/`. Open question: which melody is canonical (section 1); see the decision log
> at the end.

Consolidated creative direction · September–October 2026

The central musical idea behind Abbie's World is that it should have one recognizable musical identity that can
travel across an entire universe of experiences.

We established this early: think of how Mario's music remains recognizable across wildly different games, settings,
and generations, without requiring everything to sound like 8-bit Nintendo music.

Abbie's World should have its own signature song, expressed through dozens of arrangements, from a cozy treehouse to
a working ranch, from the moon base to a Halloween zombie adventure.

The score should communicate wonder, warmth, discovery, optimism, and a little mischief.

## 1. The canonical musical identity

| | |
| --- | --- |
| Home key | D major |
| Main tempo | 122–126 BPM |
| Time signature | 4/4 |
| Rhythmic signature | 3 + 3 + 2 |

### Main theme — later hook formulation

Pitch contour illustration; not a rhythmically notated score. The four-phrase melody:

```
D – E – F♯ – A  |  B – A – F♯ – E
D – F♯ – A – B  |  A – E – F♯ – D
```

Harmony: D6/9 → G6 → A(add9) → D6/9

There is also an earlier version of the motif from September 13:

```
D – F♯ – A – B – G♯ – A | F♯ – E – D
```

This version featured a particularly interesting chromatic gesture: G♯ resolving upward to A. It gives the melody a
touch of surprise.

The early, longer harmonic structure was:

```
D6/9 | Bm7 | Gmaj7 | A(add9) | D/F# | Gmaj7 | Em7–A | D6/9
```

The later four-phrase hook is the more frequently referenced version, but we never definitively established whether
it supersedes the earlier melody. Both are part of the compositional history.

## 2. What the original theme should sound like

The original specification called for a contemporary, playful sound with a memorable hook.

The instrument palette included glockenspiel, handbells, plucked strings, handclaps, bouncing bass, and shimmering
synthesizers.

Crucially, this is not intended to be retro video-game music.

We wanted an immediately recognizable melody whose arrangements could sound like contemporary studio recordings, folk
music, electronic music, cinematic scores, or hip-hop.

We also developed a vocal refrain:

> Abbie's World!
> Anything can happen!
> Every path's a story…

The original September concept was instrumental. Lyrics came later, so the melody needs to work independently of
words.

## 3. The arrangements we've developed

**Studio Acoustic — the warm, human arrangement.** Female vocal, fingerpicked steel-string guitar, acoustic piano,
upright bass, brushed percussion and glockenspiel. A genuine, organic studio recording; intimate rather than
theatrical.

**Coffeehouse Lo-fi — the relaxed arrangement.** Around 82–88 BPM. Rounded sub bass, gentle kick, rimshot, shuffled
hi-hats, Rhodes electric piano and soft instrumental layers. Contemporary lo-fi, not excessively jazzy.

**Abbie's Ranch — the rustic arrangement.** Acoustic, pastoral and welcoming. The theme reappears with a rustic
personality suited to planting, animals, tending crops and life around the farm.

**The Treehouses — intimate variations.** Abbie's and Ani's treehouses should each have a recognizable local musical
identity while sharing the larger world's sonic vocabulary. Cozy, imaginative and personal.

**Daddy's HQ / Moon Base — electronic arrangements.** Glass mallets, synth arpeggios and electronic drums. We also
explored an ethereal, chunky version using music-box bells, fat synthesizer plucks and deep soft bass.

**Halloween — spooky-cute arrangements.** Harpsichord, celesta, toy piano, pizzicato strings, bassoon, clarinet,
woodblocks, organ, theremin and quirky whistles. Mysterious but never genuinely frightening.

Other variations discussed include underwater exploration, blocky/toy-world music, card-factory music, general
exploration, mystery, high-energy minigames, and epic cinematic arrangements.

One particularly dramatic concept was a battle arrangement that preserves the delicate music-box melody over a huge
techno drop.

## 4. Halloween After Dark — the lo-fi hip-hop remix

This is one of the most specific compositions we developed, on October 19–20.

**Halloween After Dark** · 84 BPM · Instrumental

A dusty boom-bap arrangement of the Abbie's World identity, built around warm Rhodes chords, a rounded sub bass,
music-box melody, muted guitar, celesta, pizzicato strings and atmospheric analog pads.

Environmental textures: subtle vinyl crackle, autumn leaves, a little wind, and distant owl calls.

The harmonic language can drift into minor-key mystery before revealing familiar major-key moments.

Proposed musical progression:

1. Atmospheric introduction
2. Beat enters with soft kick and snare
3. Rhodes introduces the familiar melody
4. Stripped-back, slightly eerie middle variation
5. Return to the full groove
6. Loop-friendly outro

Approximately 2 minutes 30 seconds. No vocals, jazz solos, trap hi-hats or horror stingers.

This remix differs from the earlier Halloween theme at 126 BPM. Both can exist: one for lively gameplay, the other
for nighttime exploration or relaxed listening.

## 5. The album and soundtrack library

On September 13, we outlined an album and functional soundtrack library.

| Music asset | Intended purpose |
| --- | --- |
| Main Abbie's World Theme | Recognizable identity for the whole game |
| 10-second splash jingle | Quick logo/launch sequence with a whoosh |
| Abbie's Ranch | Rustic, pastoral reinterpretation |
| Abbie's Treehouse | Cozy personal space |
| Ani's Treehouse | Related but distinct character theme |
| Card Factory | Crafting, discovery and experimentation |
| Daddy's HQ | Technological, futuristic arrangement |
| Coffeehouse Lo-fi | Relaxed listening |
| Halloween Theme | Whimsical spooky adventure |
| Halloween After Dark | Instrumental boom-bap remix |
| Exploration / Mystery | Environmental discovery |
| Epic / Battle | High-intensity gameplay |

This is a creative inventory, not confirmation that all these audio files were produced.

We also specified that each minigame should have access to three distinctive dramatic modes:

- **Mysterious:** curiosity, uncertainty, exploration.
- **Intense:** activity, challenge, movement.
- **Epic:** breakthrough, climactic moments, big accomplishments.

The idea was never simply to generate a single background track for each room. Music should respond to what the
player is doing.

## 6. Interactive music inside Abbie's World

The game architecture opens up an opportunity beyond producing an album: interactive scoring.

We discussed adaptive musical kits with reusable loops, short stings and multiple states. One suggested structure was
A → A′ → B → A″, allowing some development without sounding like an abrupt restart.

Formalized as a system:

```
Abbie's World Music DNA
  theme · melodic motifs · rhythmic signature · harmonic identity
        │
  World (Ranch, Moon Base, Halloween)
  Place (Treehouse, Factory, Garden)
  Situation (Explore, Battle, Celebrate)
        │
Adaptive arrangement engine
  loop · layers · transitions · stingers
        │
  ambient bed · interactive score · musical event
```

That diagram represents an architectural recommendation, not an implemented music engine.

A player could be in Abbie's Ranch hearing a relaxed acoustic arrangement. As they begin an activity, the percussion
becomes more active. Discover something important, and a familiar melodic fragment celebrates the event. During a
challenge, the arrangement intensifies without entirely abandoning the identity of the ranch.

The key distinction is between world identity, location identity, and gameplay state.

## 7. The jukebox

The jukebox is part of the original Abbie's World overland design, alongside the treehouses, Card Factory and Vault.

It gives the music a role beyond ambient scoring: Abbie can encounter the soundtrack as something that belongs to her
world.

There is no confirmed detailed jukebox implementation specification in the history retrieved. However, a logical
extension would be that the jukebox exposes the soundtrack album, lets players select arrangements, and potentially
unlocks music by discovering places or completing adventures.

It could also give the soundtrack continuity as the universe expands.

## 8. A related song: Launch Jackpot

We also created or discussed a Suno adventure song called Launch Jackpot, with the refrain:

> JACKPOT!
> HERE WE GO!
> LET'S LAUNCH!

Its narrative covers preparing snacks and passengers, launching a rocket, visiting the Secret Hideout, playing games
and pursuing a jackpot.

It is associated with the larger imaginative adventure, in which an ordinary family outing becomes a space mission
involving an alien station, low gravity, energy conduits and zombies.

This is a separate established song, not necessarily a canonical variation of the main Abbie's World melody.

## 9. Production and metadata

An important original requirement was that every track remain traceable.

We discussed sound assets not merely as audio files but as assets with contextual metadata. That suggests the need to
preserve:

- Musical identity and source motif.
- World, scene, room and gameplay purpose.
- Key, tempo, style and instrumentation.
- Generated variants and their relationships.
- Original generation prompts and references.
- Loop points, transitions and audio duration.
- Intensity, mood and permitted reuse.

The original discussions explicitly called for traceability. (As of 2026-10-23 every ElevenLabs take records these
fields in its JSON sidecar under `trace`; see `tools/composer/README.md`.)

In a generated game, this matters because the same composition could accumulate dozens or hundreds of arrangements.

## 10. What's established, and what is not

| Aspect | Current status |
| --- | --- |
| One recognizable musical identity | Established creative direction |
| D major, 122–126 BPM, 3+3+2 | Documented original theme specification |
| Early and later melodic motifs | Both documented; final choice unresolved |
| Studio acoustic arrangement | Designed |
| Coffeehouse lo-fi arrangement | Designed |
| Halloween After Dark | Detailed arrangement designed |
| Ranch, treehouse, HQ variations | Planned/described |
| Main theme lyrics | Partial refrain documented |
| Soundtrack album | Planned |
| Jukebox | Part of world design |
| Adaptive soundtrack engine | Conceptual |
| Actual master audio inventory | Not verified |
| Final sheet music / stems | Not verified |

## 11. Where the music should go next

The original idea is strong, but the most important unresolved decision is which exact melody is canonical.
Everything downstream depends on that decision.

Once the definitive melody exists as a reference audio file and MIDI transcription, it becomes possible to judge new
arrangements against an actual musical invariant rather than a prose description.

Separate the soundtrack into three creative families:

- **Songs:** complete standalone compositions, including vocal themes and music meant for listening.
- **Scores:** arrangements designed to accompany locations, moods, and gameplay.
- **Sonic identity:** very short musical signatures, UI feedback, discoveries, successes and the opening jingle.

Those three families can draw from the same musical material without constantly repeating the theme.

And one final distinction matters: the most recognizable game soundtracks don't merely repeat melodies. They
establish an expressive musical language. Even a track that never directly quotes the main hook can still feel
unmistakably part of Abbie's World.

The real ambition is for Abbie to recognize her world with her eyes closed. That's the creative standard for the
music.

This is a consolidation of previous music-design conversations and retrieved project history, not an audit of the
actual audio files, Suno library or repository.

## Decision log

- 2026-10-23: Bible adopted as canon. Both melodies rendered as reference audio and MIDI in `tools/composer/motifs/`
  for Evan to pick the canonical one. Until he picks, generated takes use the later four-phrase hook (the more
  referenced version) and record `source_motif: "hook-late"`.
