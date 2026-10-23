# What a game's identity is, and how we measure it

Oracle note, 2026-10-22. Requested by Evan ("determine what identity means in the context of video games... art,
design, interaction, models, etc.") alongside the Steam game study indexer and the Game Oracle.

Files in this folder:

- `GAME_IDENTITY.md` (this file): the definition, the layers, how each is measured, and the legal line.
- `game-identity.schema.json`: the JSON Schema an indexer or the Oracle fills in, one record per game.
- `examples/*.json`: first-pass records for Evan's taste list (Tiny Glade, Besiege, 9 Kings, Bricktales,
  Dorfromantik). Every number in them is an **estimate from public material** with its confidence marked; the
  indexer's job is to replace estimates with measurements.

## The short version

1. **A game's identity is the small set of choices that, if you changed any one of them, players would say "this
   isn't that game any more."** It is not the genre and it is not the feature list. Dorfromantik with a fail-state
   timer is still a tile-placer; it is no longer Dorfromantik.
2. **Identity lives in layers that lean on each other.** We use nine: player fantasy and aesthetics, mechanics,
   dynamics, interaction and feel, art direction, models and assets, interface, audio, narrative and tone, pacing
   and structure. The first three come straight from MDA (Hunicke, LeBlanc and Zubek, 2004); feel comes from Steve
   Swink's *Game Feel* (2008); the rest are how studios actually split art-direction and production work.
3. **Every layer has three kinds of field**: *descriptors* (categorical choices, e.g. camera = orbit-around-diorama),
   *measures* (numbers with units and a method, e.g. median input-to-response latency 60 ms), and *signatures*
   (the two to five "tells" a fan would name). Signatures are what make a game recognisable; measures make two
   games comparable; descriptors let the Oracle reuse them.
4. **Every value carries its source and confidence.** Store data, footage analysis, our own instrumented play, the
   install's files, and an LLM judge are all allowed, but they are not equally trustworthy, and the record says
   which one produced each value.
5. **We assimilate style, never expression.** Game mechanics, rules, genre conventions, a palette, a camera model,
   a "feel" are ideas and are free to learn from. The specific art, models, textures, music, text, characters,
   level layouts and the overall look of a particular game are protected expression (and, for the look as a whole,
   possibly trade dress). The schema has a ledger that sorts every signature into one of the two before anything
   reaches the Abbie's World pipeline.

## Why "identity" needs a definition at all

Evan's ask is an installer and indexer that can pull a game from Steam and "assimilate that game's identity." For
that to mean anything the Oracle can act on, identity has to be:

- **Decomposable**, so we can take Tiny Glade's building feel without taking its medieval castles.
- **Measurable**, so two games (or our game and its inspiration) can be compared, and an imitation can be scored.
- **Actionable**, so each field maps onto something our pipeline already has: material roles and shading
  (`tools/ranch-rebuild/MODELER.md`), camera presets, the juice kit in `GAME_FEEL.md`, the sound library, the
  Oracle's story and rules output.
- **Legally clean**, so the result is inspired by, not copied from.

## Sources this is built on

- **MDA**: Hunicke, LeBlanc, Zubek, "MDA: A Formal Approach to Game Design and Game Research" (AAAI workshop,
  2004). Mechanics produce dynamics produce aesthetics; designers work from M, players experience from A. We keep
  LeBlanc's eight kinds of fun as the aesthetic vocabulary: sensation, fantasy, narrative, challenge, fellowship,
  discovery, expression, submission.
- **Game feel**: Steve Swink, *Game Feel* (2008): input, response, context, polish, metaphor, rules. Plus the juice
  talks: Jonasson and Purho, "Juice it or lose it" (2012), and Jan Willem Nijman (Vlambeer), "The art of
  screenshake" (2013).
- **Design lenses and motivation**: Jesse Schell, *The Art of Game Design* (lenses: essential experience, the
  toy, elemental tetrad of mechanics, story, aesthetics and technology); Raph Koster, *A Theory of Fun*; Tynan
  Sylvester, *Designing Games* (elegance, decision density); Quantic Foundry's gamer motivation model (Nick Yee) for
  the player-motivation axes.
- **Randomness**: Geoff Engelstein, *GameTek* / Keith Burgun's input vs output randomness. Whether luck happens
  before you decide (a card draw, a tile) or after (a hit roll) changes identity more than how much luck there is.
- **Interface**: Fagerholt and Lorentzon, "Beyond the HUD" (2009): diegetic, non-diegetic, spatial and meta UI.
- **Narrative**: Henry Jenkins, "Game Design as Narrative Architecture" (2004): evoked, enacted, embedded and
  emergent narrative.
- **Art direction**: the shape-language and value-key practice taught in concept-art and art-direction talks
  (round = friendly, square = stable, triangle = danger), and the "readability at gameplay distance" test; the
  GDC and developer talks on stylised real-time rendering (Pounce Light's Tiny Glade write-ups on procedural
  building, Arc System Works' "Guilty Gear Xrd" toon talk, Moebius-style and painterly pipelines).
- **The law**: US idea/expression dichotomy (17 U.S.C. §102(b)); *Data East v. Epyx* (1988) and *Atari v. Philips*
  (1982) on what in a game's look is protectable; *Tetris Holding v. Xio Interactive* (2012) and *Spry Fox v. 6waves*
  (2012), where clones lost because they copied the specific look and expression, not the rules; the doctrines of
  merger and scènes à faire. This is a working rule for us, not legal advice.

## The nine layers

Each layer below lists what it captures, the fields in the schema, and how the indexer measures them. "Method"
values are the schema's `source` enum.

### 0. Core (the identity in one breath)

Not a layer, the summary the layers must justify.

- `fantasy`: one sentence, the player's role and verb ("You are a gentle architect whose every stroke becomes a
  cottage that looks hand-made").
- `pillars`: three, ranked. A pillar is something the team would cut a feature to protect.
- `signature_moment`: the ten seconds a trailer would show.
- `anti_goals`: what the game deliberately refuses (no fail state, no timer, no combat, no text).
- `recognisability`: can a blind judge name the game from a 5-second silent clip? (0 to 1, measured by an LLM/VLM
  panel over clips, with decoys.)

### 1. Fantasy and aesthetics (MDA "A")

- `fun_mix`: the eight kinds of fun as weights summing to 1. Estimated by an LLM judge reading reviews and the
  store page, then checked against Steam review keyword frequency ("relaxing", "satisfying", "hard", "funny").
- `motivations`: Quantic Foundry axes (action, social, mastery, achievement, immersion, creativity) on 0 to 1.
- `emotional_targets`: two to four feelings, each with an intensity (calm 0.9, pride 0.7, mild tension 0.3).
- `audience`: age band, skill floor, session context (couch, commute, desk).

### 2. Mechanics (MDA "M")

- `verbs`: what the player does, each with input and frequency (place-tile, rotate, draw-wall, attach-block,
  play-card). Verb count is a strong identity measure: Tiny Glade has roughly five, Besiege dozens of parts but one
  verb.
- `core_loop`: steps and period in seconds (Dorfromantik: draw, rotate, place, score, about 8 to 15 s).
- `meta_loop`: what persists between loops or runs (unlocks, quests, kingdom).
- `rules`: scoring, win and loss conditions, the failure model (none, soft, run-ending), resources.
- `randomness`: amount 0 to 1 and kind (input, output, none). `information`: perfect, hidden, partial.
- `systems`: the simulations that matter (rigid-body physics, procedural architecture, adjacency scoring, combat
  auto-resolve).
- `complexity`: counts of verbs, entity types, rules a new player must learn in the first 10 minutes.

### 3. Dynamics (MDA "D", what the rules produce in play)

- `emergent_behaviours`: what players do that the rules allow but don't script (Besiege's catapult-throws-itself
  comedy, Dorfromantik's long river planning).
- `decision_density`: meaningful decisions per minute (from instrumented play or footage; a decision is a choice
  with at least two viable options).
- `skill_strategy_chance`: three weights summing to 1.
- `expression_space`: how different two players' results look after an hour (0 to 1; measured by VLM distance
  between end-state screenshots from different players).

### 4. Interaction and feel (Swink)

The layer closest to "why it feels good to touch." Most of it is measurable from footage at 60 fps plus input logs.

- `input`: device(s), controls count, mapping style (direct, cursor, gesture/stroke).
- `response`: input-to-visible-response latency (ms), animation time for a placement or action (ms), easing family.
- `camera`: model (orbit-diorama, top-down, side, first-person, free-fly), default pitch and field of view,
  zoom range, whether it is constrained, how it moves (damped spring, snap).
- `forgiveness`: snapping (grid, hex, freeform with auto-fit), undo depth, preview/ghost before commit, auto-repair.
- `juice`: an inventory with intensity 0 to 1 for each of: squash-and-stretch, particles, screen shake, hit-stop,
  scale pop on place, sound tied to the action, camera kick, procedural settling (things wobble or grow in).
- `time_to_first_delight`: seconds from launch to the first satisfying action. A strong identity measure for cozy
  builders.
- `friction_points`: where the hand stops (menus, confirmations, reading).

### 5. Art direction

Measured with colour statistics and a VLM over a fixed set of screenshots: 20 frames sampled across the first hour,
plus 5 "hero" frames from the store page.

- `rendering`: style family (stylised PBR, toon, painterly, flat-shaded low-poly, pixel art, voxel), lighting model,
  outlines, post-processing (bloom, depth of field, tilt-shift, film grain, colour grading).
- `palette`: 5 to 8 dominant colours (k-means in OKLab), mean saturation and lightness, value key (high, mid, low),
  contrast (RMS of L), warmth (share of hues in the warm half), how the palette shifts by time of day or season.
- `lighting`: time-of-day model, sky, global illumination or baked AO, fog or atmospheric perspective, shadow
  softness.
- `shape_language`: round, square, triangle shares (0 to 1, VLM-judged), silhouette readability at gameplay distance
  (0 to 1, measured by a VLM naming objects from silhouettes).
- `proportion_and_scale`: how stylised the proportions are (realistic 0 to caricature 1), "toy-ness" (does the world
  read as a miniature: tilt-shift, chunky bevels, saturated colour).
- `detail_density`: busy versus calm frames (edge density per megapixel, from Canny), and where detail is spent
  (focal objects vs ground).
- `motion`: animation style (procedural, keyframed, physics), how alive the idle world is (wind, water, villagers).
- `references`: the art traditions it draws on (Ghibli pastoral, Bruegel, tabletop miniatures, LEGO catalogue
  photography).

### 6. Models and assets

The production side of the look. From footage and, for engine detection and counts only, the install's file tree.
We do not extract or keep a game's meshes, textures or audio (see the legal ledger below).

- `kit`: modular kit, procedural generator, unique hero assets, or a mix; number of distinct asset types seen.
- `geometry`: poly-budget class per asset type (low, mid, high), bevel and edge treatment (sharp, chamfered,
  rounded, soft), surface noise (clean, hand-wobble, scanned).
- `materials`: texture strategy (vertex colour, flat colour, hand-painted, trim sheets, PBR scanned), number of
  material roles a frame uses (Dorfromantik about 8: grass, field, forest, water, roof, wall, rail, sand),
  roughness character (matte toy, glossy plastic).
- `procedural`: what is generated rather than authored (walls and roofs from a stroke, terrain, vegetation scatter).
- `asset_vocabulary`: the 10 to 20 object categories that populate the world. The vocabulary is part of the
  fantasy: sheep, windmills and lanterns say pastoral.
- `pipeline_mapping`: for each, the closest Abbie's World equivalent (our material role names, modeler recipes).

### 7. Interface

- `ui_mode_mix`: shares of diegetic, non-diegetic, spatial and meta UI (Fagerholt and Lorentzon).
- `hud_coverage`: share of the screen covered by persistent UI in normal play (measured from frames).
- `text_density`: words on screen per minute in the first 10 minutes; reading level.
- `menu_depth`: clicks from play to the deepest common setting; whether the game ever leaves the world for a menu.
- `typography` and `iconography`: families and character (hand-drawn, geometric sans, serif).
- `onboarding`: tutorial style (none, contextual hints, scripted levels).
- `feedback_language`: how the game tells you that you did well (number pops, quest ticks, audio chimes).

Evan's taste cuts hard here: he hates website-like UI and 1990s menus, so `hud_coverage`, `menu_depth` and
`ui_mode_mix` are the fields most likely to decide whether we take something.

### 7b. Information grammar (schema 1.1)

Added 2026-10-23 after the HUD study (`../hud/HUD_STUDY.md`, PRs #108 and #113) and the card studies
(`../cards/`, PRs #101 and #103). The interface layer says how much UI there is; the information grammar says **how
the game tells you things**, one kind of information at a time. It uses the HUD study's 2x2 plus "none": diegetic
(characters know, in the world), meta (characters know, on the lens), spatial (only you know, in the world), overlay
(only you know, on the screen), and none (the world simply behaves differently). Overlays carry information; meta
carries feeling; diegetic carries feeling through the world.

- `info_kinds`: one entry per kind of information, each with a `mix` over the five modes (weights summing to 1),
  a `timing` (always on, on change, on threshold, summoned, absent) and a note. Recommended kinds: `body` (needs,
  health), `time`, `threat`, `thing_state` (objects and creatures), `goals`, `tools`, `navigation`, `social`,
  `resources`. Don't Starve's body is 0.7 overlay and 0.3 meta (badges, plus sanity bending the screen); This War of
  Mine's threat is 0.6 spatial (noise rings where the sound is).
- `overall_mix`: the same five weights for the game as a whole.
- `screen_budget`: HUD coverage of the screen, the always-on count (three is the most players watch), words on
  screen, the fade rule, and whether the HUD is drawn as a material from the world (ink, pencil, suit lights) or as
  generic panels (`web_ui` is the red flag for Evan's taste).
- `adaptive_state`: **the whole game adapts.** Each game-state signal (threat, time of day, sanity, season) with
  the channels it drives together: light, music, NPCs, animals, sound, weather, lens, UI, camera, haptics.
  `adapts_score` is the most world channels (not lens or UI) one signal drives, divided by 5 and capped at 1. Three
  or more passes the HUD rubric's `one_signal_many_channels` check.
- `social_channel`: how entities signal each other and the player, as weights over body language, speech bubbles,
  audio barks, spatial icons, portrait text, dialogue UI, meta effects and none.
- `dialects`: places or modes that shift the grammar, each with its own mix. A coffee shop that leans on meta
  (warm vignette, music), a build mode that adds overlay, This War of Mine's day shelter (overlay text) versus its
  night scavenging (spatial rings and darkness).
- `card_art`: for games with cards, the art presentation modes from `../cards/CARD_ART.md` as weights: portal,
  overlay, pop-out, shadowbox, panorama, specimen, emblem, portrait, scene, living.
- `signatures_ref`: the game's entry in `hud-signatures.json` or `card-signatures.json`.

How to measure: `footage_cv` over 20 sampled frames for coverage and always-on count; an `llm_judge` pass that labels
each visible readout with its kind and mode (pairwise, both orders); `playtrace` for timing (when readouts appear and
fade, and which channels change within 2 seconds of a state change). Until then, values are `estimate`.

First re-scores (estimates from the HUD study, all in `examples/`):

| Game | Overall mix (diegetic / spatial / meta / overlay / none) | Always on | Adapts score | Social cues | Dialects |
|---|---|---|---|---|---|
| This War of Mine | 0.20 / 0.35 / 0 / 0.45 / 0 | 3 | 0.6 (day/night: light, music, sound) | words on portraits | shelter by day vs scavenging at night |
| Don't Starve | 0.20 / 0.15 / 0.20 / 0.40 / 0.05 | 4 | 0.8 (sanity and nightfall each drive 4 world channels) | quips above heads, creature behaviour | caves |
| 9 Kings | 0.10 / 0.30 / 0 / 0.60 / 0 | 3 | 0.4 (battle: music, sound) | rival kings' portraits | battle |
| Tiny Glade | 0.50 / 0.10 / 0 / 0.15 / 0.25 | 1 | 0.8 (time of day: light, sound, animals, weather) | ambient life | none |
| Dorfromantik | 0.20 / 0.40 / 0 / 0.30 / 0.10 | 3 | 0.4 (season: light, sound) | ambient life | none |

The house identity this points to: Tiny Glade's grammar (mostly diegetic and none, one always-on element) with Don't
Starve's adaptivity at kid-safe strength, and This War of Mine's habit of putting state on the thing it belongs to.

### 8. Audio

Measured from a 30-minute audio capture and the action log.

- `music`: genre and instrumentation, tempo range (BPM), whether it is adaptive (layers, stingers), density
  (share of time music is playing), key and mode character (major pentatonic calm, minor tension).
- `sfx_character`: realistic foley, toy-like, synthetic, musical (placements play notes). Pitch variation on
  repeats.
- `action_coupling`: share of player actions that make a sound; latency from action to sound (ms).
- `ambience`: beds (wind, birds, water), whether the world is audible when you are idle.
- `voice`: none, gibberish, barks, full VO.
- `loudness`: integrated LUFS and dynamic range; cozy games run quieter and more compressed.

### 9. Narrative and tone

- `narrative_mode`: Jenkins's evoked, enacted, embedded, emergent, as weights.
- `tone`: positions on axes from -1 to 1: cozy to tense, whimsical to grounded, earnest to ironic, quiet to loud,
  hand-made to industrial.
- `themes`: two to five (stewardship, ingenuity, rule by decree).
- `writing`: amount (words per hour), voice (dry, warm, comedic), point of view.
- `characters`: named characters, the player's avatar (none, a hand, a king, a builder).
- `humour`: kind (slapstick physics, wry text, none).

### 10. Pacing and structure

- `structure`: endless sandbox, levels/campaign, run-based roguelite, quests over an endless board.
- `session_length`: typical minutes; natural stopping points.
- `tension_curve`: how intensity moves within a session (flat calm, sawtooth wave/rest, rising to a run end).
- `progression`: unlock cadence (minutes between new things in the first two hours), what unlocks (pieces, biomes,
  cards, levels).
- `failure_cost`: none, retry the level, lose the run.
- `first_ten_minutes`: a timestamped list of what the player sees and does. Comparable across games and the single
  best predictor of whether a kid stays.

### 11. Market context (from Steam, for the indexer)

Not identity, but it keeps the record honest: Steam app id, developer, publisher, release dates, engine, price,
user tags (top 20 with votes), review score and count, median playtime, languages, platform, Steam Deck status.

## Measuring: sources and confidence

Every leaf value can be a plain value or a `measured` object: `{value, unit, source, confidence, method, evidence}`.
`source` is one of:

| source | what it is | typical confidence |
|---|---|---|
| `steam_api` | Steam store and app-details API, SteamSpy-style tag votes | 0.95 |
| `store_page` | trailer, screenshots, description | 0.7 |
| `footage_cv` | computer vision over our capture or public footage (colour stats, HUD coverage, latency by frame) | 0.8 |
| `playtrace` | our own instrumented play: input log plus capture | 0.9 |
| `install_files` | the install's file tree: engine detection, counts, sizes. Never asset contents. | 0.85 |
| `reviews_nlp` | keyword and topic stats over Steam reviews | 0.6 |
| `llm_judge` | Claude or another VLM judging frames or text, with the prompt saved | 0.5 to 0.7 |
| `human` | Evan or a designer | 0.9 |
| `estimate` | prior knowledge with no measurement yet | 0.3 to 0.5 |

The indexer should promote `estimate` and `llm_judge` values to `footage_cv` or `playtrace` over time and keep the
old value in `history`, the same way assets keep revision rounds.

## Comparing games: the identity vector

For "how close is our ranch to Dorfromantik" or "which of Evan's favourites does this build feel like":

1. Normalise every numeric measure to 0 to 1 against the indexed corpus.
2. Each layer becomes a sub-vector; one-hot the descriptors.
3. Distance = weighted sum of per-layer cosine distances. Default weights favour what players notice first:
   interaction and feel 0.2, art direction 0.2, fantasy 0.15, mechanics 0.15, pacing 0.1, audio 0.08, interface
   0.07, narrative 0.05.
4. Signatures are compared by an LLM judge ("does build X show signature S?"), using the pairwise, both-orders
   protocol from `llm-3d-modeling.md`, because VLM judges flip about a quarter of single-order verdicts.

The same vector scores an imitation: a feature we built "in the spirit of Tiny Glade" should move the interaction
and art layers toward Tiny Glade while its expression ledger stays empty.

## The legal line: style versus expression

Sorted per signature into the record's `ledger`:

**Free to learn from and reuse (ideas, methods, style):**

- Mechanics, rules and systems: tile placement with adjacency scoring, stroke-to-wall procedural building, block
  physics, card-driven kingdom building.
- Genre conventions and scènes à faire: hex grids, an orbiting diorama camera, a day-night cycle.
- Feel parameters: latencies, easing, snapping, undo, the juice inventory.
- Style at the level of a description: "pastel, high-key, warm, soft shadows, chunky bevels, tilt-shift." A palette
  as a set of hues is style; a specific frame's colours are not something we lift pixel for pixel.
- Structural pacing: no fail state, endless board with quests, short runs.

**Protected expression, never copied:**

- The game's actual models, textures, sprites, animations, music, sound effects, voice and text.
- Characters, names, logos, and the specific designed content (particular levels, card art and card text, quests).
- The overall look-and-feel as a whole, where a copy would be confused for it (trade dress, as in *Tetris v. Xio*):
  taking many of one game's specific visual choices together, rather than one style idea.

**Rules for the indexer and the Oracle:**

1. The install is used to play, capture and count. Asset files are never extracted into the repo, R2 or a model
   prompt. Captures and frames used for measurement stay in the study store, not in Abbie's World content.
2. A signature passes to the pipeline as a *rewritten description* in our own words plus measures, never as an
   image of the source game handed to Midjourney or the modeler as a style reference.
3. Mix sources. An Abbie's World feature should draw its identity from at least two games plus our own goals; the
   comparison vector should show it closer to our own house style than to any one source.
4. Every assimilated element records which game and signature inspired it in the asset's `provenance.json`, which
   is what MODELER_VISION asks for anyway.

## Assimilation: what the Oracle does with a record

A record becomes an **identity recipe** (the `assimilation` block): for each layer, the parameters we would set in
our own systems to move toward the source, plus what to leave behind. Examples of targets:

- Interaction: camera preset values, snap mode, placement easing curve and duration, juice settings
  (`GAME_FEEL.md`).
- Art: palette and lighting preset, bevel radius, material-role list for the modeler, post-processing stack.
- Audio: sound-library tags for SFX character, music brief for the (parked) composer.
- Mechanics and pacing: rules and loop that the Oracle can propose as a mini-game or mode.

## Worked examples

Full records are in `examples/`. The table is the one-line identity and the fields that most set each apart.
Values are first estimates.

| Game | Fantasy | Feel tell | Art tell | Pacing tell | What we'd take |
|---|---|---|---|---|---|
| Tiny Glade (Pounce Light, 2024) | A gentle architect whose strokes become hand-made villages | Stroke-to-wall: drag a line, walls, windows and roofs grow and settle; nothing can be placed wrong | Warm, high-key, soft GI and AO, painterly storybook miniatures with procedural detail | No goals, no fail, no clock | Procedural growth on placement, zero-wrong-moves building, settle animation |
| Besiege (Spiderling, 2015/2020) | A medieval engineer whose ridiculous machine just might work | Build in a frozen world, then hit play and watch physics; failure is the comedy | Clean low-poly blocks, bright readable parts on muted ground | Level objectives, unlimited retries, build/test loop of 1 to 3 minutes | Build-then-simulate loop, failure as play, readable parts |
| 9 Kings (Sad Socket, 2025 EA) | A king who builds a kingdom from cards and survives the other kings' attacks | One card per year, place on a small grid, then watch the battle auto-resolve | Pixel-art units and buildings in a compact top-down kingdom (to confirm on capture) | Run-based roguelite, yearly attack rhythm | Year rhythm: one decision, then a spectacle; synergy by adjacency |
| Bricktales (ClockStone, 2022) | A builder solving diorama puzzles brick by brick | Snap bricks on a stud grid in a build zone, then the build is physics-tested | Licensed brick look, clean plastic materials, diorama islands with tilt-shift | Puzzle levels inside a light story, sandbox mode after solving | Build zones with a test, diorama islands, toy plastic materials |
| Dorfromantik (Toukana, 2021/2022) | A peaceful landscaper patching a countryside together | Draw a hex tile, rotate, place, a soft chime and score pop | Pastel low-poly, saturated but soft, tilt-shift, seasons and gentle ambient life | Endless board, quests extend the stack, one more tile | Hex tile rhythm, matching edges, quests as soft goals, sound per placement |

What the five share is the strongest signal of Evan's taste, and the default identity for Abbie's World unless a
brief says otherwise:

1. **Building is the verb.** Every one is about making something, and four of five make a diorama you look down on.
2. **The world reads as a toy or a miniature.** Tilt-shift, chunky bevels, warm saturated colour, matte or plastic
   materials.
3. **Small number of verbs, deep consequences.** Five or fewer core verbs in four of five.
4. **The interface hides.** Low HUD coverage, little text, no leaving the world for a menu in normal play.
5. **Placement is rewarded by the world.** Something grows, settles, chimes or simulates as a direct answer to the
   player's action, in under half a second.
6. **Low failure cost.** No fail (Tiny Glade, mostly Dorfromantik) or instant retries (Besiege, Bricktales); 9 Kings
   is the outlier with run loss, softened by short runs.

## Validating a record

```
python3 -c "import json,sys,jsonschema; s=json.load(open('docs/oracle/identity/game-identity.schema.json')); [jsonschema.validate(json.load(open(f)), s) for f in sys.argv[1:]]; print('ok')" docs/oracle/identity/examples/*.json
```

All five examples validate against schema 1.0. Bump `schema_version` and keep old records readable when fields change;
extend, don't rename.
