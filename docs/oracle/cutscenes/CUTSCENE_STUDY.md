# AW-STUDY-0009 - Cutscenes

Oracle study, 2026-10-23. Requested by Evan: "do one on cutscenes .. why do they exist? how do they work? can they be
categorized? art styles? and strategic cut scenes (short scenes, scenes to allow for loads) etc." It follows the card
study (`../cards/`, AW-STUDY-0002), the HUD study (`../hud/`, 0003) and the aesthetic study (`../aesthetic/`, 0004),
and uses the same shape: a study in prose, a rubric as data, a reference checker, two manifests (proposed and today)
so the checker has a pass and a fail, and a visual page.

Files in this folder:

- `CUTSCENE_STUDY.md` (this file): why cutscenes exist, how they work, a taxonomy, art styles, strategic cutscenes
  (short, load-hiding, bridging), what the games do, the rules that hold across all of them, and the Abbie's World
  plan: the Fritigern styles, tile preparation as cover, the Moon Mission chapters, Suzy, the information principles
  and the Music Bible stings.
- `cutscene-rubric.json`: the rubric as data. Seven gates must pass; the rest scores out of 100 and ships at 80.
  Every check has an id, a method and a `source` from the identity schema's enum.
- `cutscene-signatures.json`: per-game cutscene profiles in the identity schema's new `layers.cinematics` shape
  (schema 1.2), plus signatures, each marked `style` (we may learn from it) or `expression` (we never copy it).
- `cutscene-ranch-proposed.json` and `cutscene-ranch-today.json`: cutscene manifests for the proposed Abbie's World
  set and for what is live today.
- `tools/cutscene-rubric/check_cutscene.py`: the reference checker. Given a manifest it runs the gates and prints a
  provisional score. `--overlays` reads a Fritigern-style `overlays.js` and measures, per style, the words on screen
  and whether a grown-up can read them aloud in the time the card is up.

Visual page: https://claude.ai/artifact/ATBvQmSr62iKEcnRH1A6MJ (source: `cutscene-study.html` in this folder).

**Confidence.** Facts about games come from knowledge of the games, developer talks and interviews (listed in
Sources), not from our own captures: this environment cannot reach Steam or video hosts. Timings marked `estimate`
should be replaced by measurements from the PC's "Game library assimilation" thread. Facts about Abbie's World come
from the code on `main` (paths given). Nothing here copies any game's footage, script, characters, music or shot
list; the ledger in `cutscene-signatures.json` says what is style and what is expression.

## The short version

1. **A cutscene is the game taking the camera away from the player.** That costs something every time: agency. It
   has to buy something worth more: a story beat, a reward, a breath, a lesson, or time for the computer to get
   ready. A cutscene that cannot name its job should not exist.
2. **There are six jobs**: story (tell what happened), reward (celebrate what you did), pacing (a breath between
   efforts), tutorial (show a new thing working once), cover (hide a load, a stream or a generation), and bridge (move
   you from one place, time or mode to another). Good cutscenes do two at once; the best do three.
3. **Shorter is almost always better.** The cutscenes players remember are long; the ones that make a game feel
   good are short. Among Us's ejection is about 5 seconds, a Zelda chest about 4, a Pokémon battle swirl about 1.5.
   For children, the beat should fit in one breath of narration.
4. **Most modern cutscenes are in-engine**: the game's own world, puppeted by a timeline. That keeps the look, lets
   the player's choices show (your hat, your sheep), and allows a seamless hand-back. Pre-rendered film is for
   things the engine cannot do, and it breaks continuity.
5. **The hand-back matters more than the scene.** The last frame of a cutscene should be the first frame of play:
   same camera, same light, same music bar. God of War (2018) is one unbroken shot for this reason.
6. **Never trap a child.** Every cutscene can be sped up or skipped after it has been seen once; a tap always does
   something; the world keeps breathing underneath. "Hold to skip" is the floor.
7. **Load covers must be honest.** They end when the work is ready, never later, and they never pretend to be work.
   The best ones are play (Fall Guys' round preview, Apex's drop ship, Mass Effect's elevator) or the world building
   itself in front of you (Townscaper, Tiny Glade, our own `stagedBuild`).
8. **The style is a frame, not a new world.** One scene can be told as cinema, storybook, comic panels, Telltale
   dialogue, a diorama camera or an in-engine puppet show. The scene underneath stays the same; only the framing
   changes. That is exactly how `fritigern/overlays.js` is built, and it is the right model.
9. **Information principles still hold during a cutscene.** The camera, letterbox, subtitles and choice cards are
   the presentation layer; what happens in the scene is the world, and the simulation remembers it. No masks over
   the world: transitions move through the world (a door, a cloud, a page turn) instead of fading to white.
10. **The whole game adapts in a cutscene too.** One signal drives light, music, animals and sound together; a
    cutscene is just the moment that signal is directed. The Music Bible's stings are the cutscene's punctuation.

## 1. Why cutscenes exist

A cutscene is any stretch where the game takes authorship of the camera, the timing or the characters away from the
player. Games pay for that loss of agency with one of six things.

| Job | What it buys | Classic case | What goes wrong |
|---|---|---|---|
| **Story** | Tells something the player could not enact: a face, a memory, a decision someone else makes. | The Last of Us prologue; The Wolf Among Us episode openers. | Too long; repeats what play already showed; ignores what the player did. |
| **Reward** | Celebrates an achievement and makes the prize feel big. | Zelda's chest open; Hearthstone's pack opening; a Pokémon evolution. | Unskippable on the 200th time; slows the loop it was rewarding. |
| **Pacing** | A breath between efforts, a change of rhythm, a place to put the controller down. | Halo's level openers; Kingdom Two Crowns' crossing between islands. | Lands while the player is hot; turns rest into waiting. |
| **Tutorial** | Shows a new thing working once before the player tries it. | Half-Life 2 showing a gravity gun; Portal's first portal; Plants vs Zombies' Crazy Dave. | Lectures; shows three things at once; uses words a child cannot read. |
| **Cover** | Hides loading, streaming, shader compilation or (for us) world generation. | Mass Effect elevators; God of War's squeeze-through gaps; Valheim's Valkyrie; Fall Guys' round preview. | Lies about time; runs longer than the load; plays over and over. |
| **Bridge** | Moves the player across place, time or mode without a menu. | Ratchet & Clank: Rift Apart's rifts; Animal Crossing's airport; Super Mario's pipe. | A black screen; a hard cut to a new camera; a fade to white. |

Two more reasons sit underneath. **Spectacle**: some moments are just better seen than played (a boss reveal). And
**authorship**: a designer wants to direct emotion, framing and music to a precise beat, which free play cannot
guarantee. Both are legitimate only when they also do one of the six jobs.

**The cost side.** Every cutscene spends agency, attention and (for a kid) patience. Children are generous with
spectacle and ungenerous with talk: they will watch a sheep fall over ten times and leave the room during exposition.
The research on children and media (Sources) points the same way: short, visual, with a voice they trust, and
something to do.

## 2. How cutscenes work technically

### 2.1 Render path

| Path | How | Strength | Weakness | Examples |
|---|---|---|---|---|
| **Pre-rendered (FMV)** | A video file made offline, played back. | Any fidelity; fixed cost; hides loading perfectly. | Breaks continuity (your gear, your choices vanish); big files; a jarring cut in and out. | Final Fantasy VII (1997); Fallout's "War never changes" intros; Company of Heroes mission briefings. |
| **In-engine, real-time** | The game's renderer plays a scripted timeline with the real world and actors. | Continuity, your choices show, small, can hand back seamlessly, styles can switch. | Limited by the engine; needs the scene loaded (so it cannot itself cover the load of that same scene). | Half-Life 2 (no cuts at all); God of War (2018); LEGO Bricktales; Dave the Diver; Telltale games. |
| **Hybrid** | Real-time scene with baked parts: a pre-rendered sky, a video on a screen, baked animation. | Cheap fidelity where it matters. | Seams show if lighting differs. | Many AAA games; Subnautica's PDA videos. |
| **Static panels** | Still images, comic panels, illustrated pages, sometimes with parallax. | Cheapest; perfect for small teams and for read-aloud. | Little motion; needs strong art. | Overcooked 2's story panels; This War of Mine's diary; Gorogoa; Plants vs Zombies' notes. |
| **Text and narrator** | Words, voice and the world; no camera takeover. | Zero loss of agency. | Needs reading or voice. | Bastion's narrator; FTL's events; Kentucky Route Zero's text. |

**For Abbie's World**: in-engine is the default, because the world is generated and the child's own things must be
in the shot. Static panels (storybook pages, comic panels) are the second tool, because they can be made from the
in-engine scene (render to a still, then frame it) and read aloud. Pre-rendered video is only for things made
outside the game, like the original Moon Mission chapters.

### 2.2 Timelines and the director

An in-engine cutscene is a **timeline**: tracks of keyed events over time. Unity Timeline, Unreal Sequencer and
Godot's AnimationPlayer all share the same idea.

- **Camera track**: shots, each a camera pose (or a rig: dolly, crane, orbit, follow) with a lens and an easing.
  Cuts are instant changes between shots; moves are interpolations inside one shot.
- **Actor tracks**: who walks where, gestures, faces, looks at. In a simulation game the best actor track is an
  **agenda, not an animation**: tell the character where to be and what to do, and let the simulation walk them.
  Our `simulations/story/story-director.mjs` already does this ("the director only sets agendas and protections;
  walking, routing, gestures and needs stay the simulation's own").
- **Overlay tracks**: subtitles, cards, prompts, choices. Presentation layer only.
- **Audio tracks**: music cues, stings, voice, ambience. Cues are best snapped to the music's bar lines.
- **Signal track**: the one game-state signal (time, threat, mood) the scene drives, so light, music, animals and
  sound move together.
- **Events**: callbacks into the game (spawn the reward, unlock the gate, save the choice).

Fritigern's `scene.js` is a hand-rolled version: a `CUT` array of `[shot, start, end]` and an `overlays.js` table of
`[start, end, kind, text]` per style. That is the right shape; a cutscene spec in Abbie's World should be exactly
that, as data.

### 2.3 Cameras and shot grammar

Film grammar carries over: establishing wide, medium, close-up, over-the-shoulder, reaction shot, insert (the object
that matters), push-in for emphasis, pull-back for reveal, the 180-degree rule, cutting on action. Games add three of
their own:

- **The player camera as a shot.** The best hand-back ends on the gameplay camera itself (God of War, Half-Life 2).
- **The diorama or tilt-shift camera.** A high three-quarter view that pulls back to show the whole set (Kentucky
  Route Zero, Tiny Glade, Dorfromantik, Townscaper). For a toy world, this is the native cinematic shot.
- **The toy camera.** Low, at the height of the toys, slightly wide-angle, so a sheep looks like a hero. LEGO
  Bricktales and Untitled Goose Game use it. It is the shot a child imagines when they play with toys on the floor.

### 2.4 Interactivity inside a cutscene

| Kind | What the player does | Examples | Kid fit |
|---|---|---|---|
| **None** | Watches. | Most FMV. | Fine if short. |
| **Camera free** | Looks around while the scene plays. | Half-Life 2; Firewatch. | Good; nothing to fail. |
| **Poke** | Taps things that react but cannot change the outcome. | Florence; Gorogoa; Edith Finch. | Excellent: agency without failure. |
| **Choice** | Picks a line or action, sometimes timed. | The Wolf Among Us, Dispatch, Kentucky Route Zero. | Good without the timer; silence must be a real, kind choice. |
| **QTE** | Presses a prompted button in time or fails. | Resident Evil 4, God of War. | Poor: failing a prompt in a story is punishing and reading prompts is hard. Use only as a forgiving "help push" with no fail state. |
| **Rhythm** | Acts on the beat of the music. | Sayonara Wild Hearts; Mixtape's vignettes. | Good if forgiving; fits the Music Bible's 3+3+2. |

### 2.5 Skippability

The industry has converged on: **pause any cutscene**, **skip any cutscene you have seen**, **hold to skip** (so a
stray tap does not skip), and often **fast-forward**. Unskippable scenes are now considered a bug except for covers
that are still loading (and then the game should say so honestly in the world). Two refinements matter for children:

- **First time long, then short.** The first chest opening plays fully; later ones play a 1-second version. Zelda
  and Animal Crossing both shorten repeats.
- **A tap is never ignored.** If a child taps during a scene, something must answer: the scene speeds up, a "hold
  to skip" ring grows on their finger, or the tapped thing reacts. Silence reads as broken (the same lesson Evan
  gave about threads).

### 2.6 Diegetic versus non-diegetic cutscenes

The HUD study's 2x2 applies to cutscenes as a whole.

| | Characters know | Only the player knows |
|---|---|---|
| **In the world** | **Diegetic**: it really happens in the world and characters react (a parade, a sheep walking home, the barn rising). The simulation records it. | **Spatial**: the camera visits a thing to show the player something characters do not see (a fly-by of the next tile). |
| **On the screen** | **Meta**: a feeling on the lens (slow-motion at the big catch, a warm vignette at bedtime, a heartbeat before the reveal). | **Overlay**: a title card, a chapter number, a "story so far" page, letterbox bars, subtitles. |

Plus **none**: no cutscene at all; the world just behaves and you happen to see it (Dorfromantik and Tiny Glade
mostly live here).

## 3. A taxonomy of cutscenes

Eight categories, each defined by its job and position in play. The length bands are our targets for Abbie's World,
based on the games below (estimates until measured).

| Category | Job | When | Length (kids) | Interaction | Example |
|---|---|---|---|---|---|
| **Intro** | Story, tutorial | First launch of a world or chapter | 20 to 45 s first time; 5 s after | Poke, skip after first | Valheim's Valkyrie; the Moon Mission chapter 1 opener |
| **Beat** | Story | A turning point inside a chapter | 8 to 30 s | Poke or one choice | The Wolf Among Us; Fritigern at the gate |
| **Reward** | Reward | A goal is met, a creature arrives, a thing is built | 1 to 6 s (first time up to 8 s) | Tap to collect | Zelda chest; Hearthstone pack; Pokémon evolution |
| **Transition** | Bridge | Moving between places, tiles or modes | 1 to 4 s | None or camera | Animal Crossing airport; Mario pipe; Ratchet & Clank rifts |
| **Loading cover** | Cover | Something is being loaded, streamed or generated | As long as the work, never longer, with a 0.5 to 1 s settle | Play, poke or watch it build | Fall Guys round preview; Mass Effect elevator; Apex drop ship |
| **Micro (contextual)** | Reward, pacing, tutorial | Constantly, in the middle of play | 0.3 to 3 s | None; play never stops | Among Us ejection; Overcooked's dish served; a sheep's happy hop at the bell |
| **Montage** | Pacing, story | Time passes: a season, a night, a building rising | 6 to 20 s | Watch | Stardew's season change; Mixtape's song-cut vignettes |
| **Recap ("story so far")** | Story | Returning after a break; episode start | 5 to 15 s, always skippable | Swipe pages | Telltale's "previously on"; The Walking Dead's recap |

Two cross-cutting tags apply to every category:

- **Position**: *bookend* (start or end of a session or chapter), *interstitial* (between efforts) or *in-flow*
  (during play, without taking control).
- **Control taken**: *full* (camera and input), *camera only* (play continues, the camera is directed: a "look
  here" shot), or *none* (a diegetic event in the player's own view).

**The ladder of intrusion.** From least to most: the world just behaves (none) → a micro moment with no control
taken → a camera-only nudge → a full cutscene → a full pre-rendered film. Pick the lowest rung that does the job.

## 4. Art styles

Each style is a framing over the same scene. The visual page shows one beat (a lamb runs home as the evening bell
rings) in all six.

| Style | What it is | Signature devices | When it fits | Kid fit | Games |
|---|---|---|---|---|---|
| **Cinematic** | Film language: lenses, depth of field, letterbox, scored music. | 2.39:1 bars, push-ins, slow motion, title and end cards. | Big story beats, reveals, endings. | Good for spectacle; bars cost a quarter of a 16:9 screen and far more on a phone. | God of War, The Last of Us, Fallout intros. |
| **Storybook** | A narrator reads to a child; pages, gentle words. | Page frame or turning page, large read-aloud text, a warm voice, few cuts. | Intros, recaps, bedtime, pre-readers. | Excellent. It is already how parents tell stories. | Edith Finch's floating text, Bastion's narrator, LEGO Bricktales' storybook, Bluey's episode framing. |
| **Comic panels** | The scene splits into panels, often with speech balloons and SFX lettering. | Gutters, panel reveals, motion lines, onomatopoeia. | Comedy, action, short reward beats, recaps. | Very good: picture-first, reads at the child's pace. | Overcooked 2, The Wolf Among Us' comic look, Gorogoa (panels as play), Dave the Diver's manga cut-ins. |
| **Telltale** | Dialogue-driven drama with choices. | Speaker subtitles, four timed choices, "X will remember that", episode cards, end-of-episode stats. | Relationship beats, moral choices, grown-up and older-kid stories. | Mixed: reading and timers are hard; good with read-aloud and no timer. | The Wolf Among Us, The Walking Dead, Dispatch (AdHoc, ex-Telltale; in Evan's library). |
| **Diorama camera** | The camera pulls back to show the whole set as a toy, often tilt-shift. | High three-quarter view, slow orbit, miniature depth of field, theatrical light changes. | Bridges, covers, montages, establishing a tile. | Excellent: it shows the child their own world as a toy. | Kentucky Route Zero, Tiny Glade, Townscaper, Dorfromantik's zoom-out. |
| **In-engine puppet** | The game's own actors perform with the game's own camera and look; the HUD tucks away. | No bars; play camera eases to a shot and back; characters mime. | Micro moments, rewards, tutorials, most beats. | Excellent and cheapest. | LEGO Star Wars (mime cutscenes, no words), Untitled Goose Game, Animal Crossing, Among Us. |

Two observations:

- **Words are optional.** LEGO Star Wars (2005) told whole films in mime; Florence and Gorogoa have almost no words;
  Among Us's ejection says one line. For pre-readers, mime plus a narrator's voice beats subtitles every time.
- **The HUD leaving is the letterbox.** In a game with a tiny HUD, the HUD tucking away already tells the player
  "watch now". Our play HUD is under 8% of the screen with zero words, so for most scenes we do not need bars at all.

## 5. Strategic cutscenes

This is where cutscenes stop being story and become engineering with feelings.

### 5.1 Short scenes

Short scenes are the most valuable and the most neglected. The rules from the games:

- **One idea per scene.** The Among Us ejection says exactly one thing: who is gone and whether they were the
  impostor.
- **Start late, end early.** Cut in after the setup, cut out on the beat. Most game cutscenes could lose their first
  and last second.
- **Land on the music.** A 3+3+2 bar at 124 bpm is about 1.94 s; a two-bar sting is about 3.9 s. A reward that lasts
  exactly one or two bars feels designed (section 7.5).
- **Shorten on repeat.** First time 4 s, after that 1 s; after ten times, play it in-flow without taking control.
- **Keep the world moving.** During a 2 s reward, the clouds still move and the sheep still graze; only the camera
  and the hero are directed.

### 5.2 Scenes that hide loads

The craft of the load cover:

1. **Disguise it as play.** Mass Effect's elevators let squadmates talk; God of War's crawl spaces and "lift the
   rock" moments are input; Fall Guys' round-preview flyover teaches the course while the round loads; Apex's drop
   ship lets you choose where to land. Best case: the player does not know a load happened.
2. **Disguise it as travel.** The Valheim Valkyrie carries you to the start; Fortnite's battle bus; Metroid Prime's
   slow doors; Spider-Man's subway (2018). The bridge and the cover are the same scene.
3. **Show the world building.** For a generated world this is the best option and the most honest one: the thing
   being made is the show. Townscaper and Tiny Glade build in front of you; Dorfromantik drops tiles with a bounce.
   Our `build-progress.mjs` already has `stagedBuild()`, which pops a tile's parts in over 1.6 s.
4. **Fill with a loop that can end at any bar.** The cover is a loop of beats (a hold pattern) that can end
   gracefully on the next bar after the work is ready. Never pad: once ready, finish the current beat and go.
5. **Be honest about long waits.** If the work takes longer than a scene can carry, say so in the world (the
   builders are still hammering, the moon buggy is still charging), never with a fake percentage. `build-progress.mjs`
   already says it: "no invented percentages".
6. **Pre-warm during the cover.** Compile shaders and upload textures while the cover plays (`warmScene()` does this),
   so the first frame of play does not hitch. A cover that ends into a stutter has failed.

Measured rule of thumb from the games (estimates): covers under 3 s can be a transition; 3 to 15 s need a scene or
play; over 15 s need play, a building-in-front-of-you show, or an honest in-world explanation.

### 5.3 Scenes that bridge scenes

A bridge carries the player from A to B without a menu or a black screen.

- **Continuity of something.** Keep one thing constant across the cut: the music bar, a character in frame, a
  sound, or the camera's motion. Ratchet & Clank's rifts keep Ratchet; Animal Crossing's airport keeps the music and
  Dodo pilots.
- **Through the world, not over it.** Pass through a door, a cloud, a page turn, the teleport sparkle, a pipe. No
  fade to white, no blur, no haze: the project rule "nothing masks the world" applies to transitions too. A fade to
  black is acceptable only as the world's own night or a closing eye (meta), never as an editor dissolve.
- **Match cuts.** Cut from a round thing to a round thing (the moon in the sky to the moonbase dome), from a motion
  to the same motion. Cheap and magical.
- **A bridge can teach where you are going.** The flyover of the next tile, the Moon Mission's buggy ride.

## 6. What the games do

Grounded in games Evan loves, his library (`../games/`) and the Telltale-style backlog (`../BACKLOG.md`). Each entry
names the job, the category and the one thing to take. Full profiles in `cutscene-signatures.json`.

**Games Evan loves**

- **Tiny Glade** (no cutscenes): the world builds in front of you with sound and bounce. The building is the
  reward and the cover. *Take*: generation as show.
- **Dorfromantik** (almost none): a tile lands, the camera pulls back between stacks. *Take*: the diorama pull-back
  as the only cinematic.
- **LEGO Bricktales**: in-engine diorama scenes with a storybook frame and comic timing. *Take*: dioramas plus
  storybook, at toy height.
- **9 Kings**: card-play with short in-engine battle and reward moments, no long cuts. *Take*: micro scenes inside
  the loop.
- **Besiege**: no cutscenes; the replay of your own machine failing is the show. *Take*: the player's own creation as
  the subject.

**Evan's library**

- **Dispatch** (AdHoc Studio, 2025, founded by Telltale veterans): an animated-series look with Telltale-style
  choices, played as episodes. *Take*: the episode frame and choice beats; a modern reference for the `telltale` style.
- **Among Us**: the ejection and the role reveal are the best micro cutscenes in the library: about 5 s, one idea,
  funny, identical every time and never tiresome. *Take*: micro scenes as ritual.
- **Fall Guys**: the round-preview flyover is a load cover, a tutorial and a bridge at once. *Take*: covers that teach.
- **Valheim**: the Valkyrie carries you to the world at start while it loads. *Take*: travel as cover.
- **Apex Legends**: the drop ship and the champion line-up cover matchmaking and loading. *Take*: the player chooses
  during the cover.
- **Bastion**: the narrator talks over play, reacting to what you do; almost no cutscenes. *Take*: narration
  without taking control. Strong reference for Suzy.
- **Dave the Diver**: comic, manga-style cut-ins for rewards and character beats, pixel art in-engine. *Take*: comic
  cut-ins for reward and humour.
- **Cult of the Lamb**: short in-engine story beats with a storybook flavour, and ritual micro scenes. *Take*: ritual
  rewards with a cute-spooky tone (relevant to the Halloween game).
- **Overcooked 2**: comic-panel story, a short in-engine level intro that shows the kitchen before play. *Take*: the
  level preview pan.
- **Plants vs Zombies**: Crazy Dave's talking intros and the zombie notes; a "huge wave" warning sting. *Take*: a
  funny host as tutorial; a sting as warning.
- **Don't Starve**: Maxwell's intro, then nothing; a distinct paper-puppet look. *Take*: one memorable intro is
  enough.
- **This War of Mine**: the diary and character story pages at the end of each day. *Take*: the recap as a diary.
- **Kingdom Two Crowns**: the boat crossing between islands as a bridge and a cover. *Take*: travel bridges.
- **Subnautica 2** (and the first game's crash-landing intro): the PDA's voice explains the world in-flow. *Take*:
  a voice in the world instead of a cutscene.
- **Fallout** and **Company of Heroes**: pre-rendered intros and mission briefings that cover loads. *Take*: briefing
  as cover (grown-up context only).
- **Shadow Tactics**: in-engine cutscenes on the gameplay camera. *Take*: never leave the play camera.
- **Mouthwashing**, **Doki Doki Literature Club**: horror cutscenes that break the game's own frame. *Take*: nothing
  for children; noted only as a style we exclude.
- **Bluey: The Videogame**, **PAW Patrol World**: show-style intros and character banter. *Take*: the episode frame
  children already know from TV, kept very short.

**The Telltale and Annapurna backlog** (`../BACKLOG.md`)

- **The Wolf Among Us**: episode cards, "previously on", timed four-way choices with silence as a choice, "will
  remember that", end-of-episode stats, comic-book neon. Our `telltale` style follows it (style only).
- **The Walking Dead, Season One**: a grown-up protecting a child, choices that build trust. Close to Fritigern and
  Alaric.
- **Mixtape**: vignettes cut to songs; the edit follows the music. *Take*: montage cut to our own score.
- **What Remains of Edith Finch**: narration written into the world; each story its own interaction. *Take*:
  storybook text as part of the world (spatial), read aloud.
- **Florence**: interaction stands in for feeling, almost no words. *Take*: poke-to-feel for pre-readers.
- **Kentucky Route Zero**: theatrical staging; the camera pulls back to reveal the whole set. *Take*: the diorama
  camera.
- **Sayonara Wild Hearts**: a pop album played as a game, a narrator between tracks. *Take*: rhythm interaction.
- **Gorogoa**: story told by rearranging panels. *Take*: comic panels as play.
- **Outer Wilds**: a ship's log that remembers. *Take*: the recap as an object in the world.
- **Stray**: a companion drone that translates. *Take*: a companion (Suzy) who explains in the world.

**Classics outside the library** (for the record): Half-Life 2 (no cutscenes), God of War 2018 (one shot, crawl
spaces as covers), Mass Effect (elevators), Zelda (chest and item fanfare), Pokémon (battle transitions, evolution),
Animal Crossing (Isabelle's announcements, the airport), Metroid Prime (doors), Ratchet & Clank: Rift Apart (rifts),
Journey (wordless), Portal (in-world narrator).

## 7. Abbie's World

### 7.1 The rules for us

The general rules above, turned into ours (the rubric checks them):

1. **Every cutscene declares its job** (story, reward, pacing, tutorial, cover, bridge) and its category.
2. **In-engine first.** Our world is generated, so the child's own tile, animals and creations are in the shot.
3. **Zero required reading.** Every word is read aloud by the narrator or Suzy; subtitles are optional.
4. **No trap.** Hold to skip, seen-once skip, tap always answers, and pause works.
5. **No mask.** No fade to white, blur or haze. Transitions go through the world: the teleport sparkle, a page
   turn, a cloud, a door. Letterbox bars only in the `cinema` style, and never for micro, reward or transition scenes.
6. **No engine artifacts in the shot**, ever: no gizmos, grids, debug boxes or developer labels.
7. **The world layer is real.** What happens in a cutscene happens in the world: the simulation records it and
   characters remember it. The camera, bars, subtitles and choice cards are the presentation layer and invisible to
   every perception (`presentation-layer.mjs`).
8. **One signal.** A cutscene directs one game-state signal (time, mood, weather, threat) across light, music,
   animals, people and sound together.
9. **Covers are honest.** End when ready, show the world being built, never a fake percentage.
10. **Hand back on the play camera.** The last frame is the first frame of play.

### 7.2 Fritigern: one scene, five framings

`prototypes/ranch-atelier/dist/fritigern/` plays one 42-second in-engine scene (the gate at Marcianople) with a `CUT`
shot list in `scene.js` and five framings in `overlays.js`: `clean`, `cinema` (2.39:1 letterbox, title and end
cards), `storybook` (seven narrated lines), `hud` (objective toasts, prompts, nameplates) and `telltale` (episode
card, speaker lines, a timed choice, "will remember that"). The pass-2 cuts are in the project files
(`fritigern/scene-01/pass2/cut_*.mp4`).

What the checker finds (`--overlays`, see the visual page):

- **Storybook** is the best fit for children: 73 words over seven cards, a mean of 1.8 words per second, peaking at
  2.6 (right at the read-aloud ceiling) on the opening line. There is no narrator voice yet, so today a child must read it.
- **Telltale** needs reading (38 words, one line at 2.9 words per second, faster than a grown-up can read aloud): speaker names in capitals, a timed choice and "will remember that" are all text. For
  children it should read aloud each line and drop the timer.
- **HUD** is the opposite of our HUD rules (objective toasts with words, an HP bar); it is a useful contrast, not a
  target.
- **Cinema** costs a quarter of a 16:9 screen in bars, and more in portrait.
- **Shots** (`--cut` on `scene.js`): eight shots, 3 to 6 s each (mean 5.25 s, about 2.7 bars). Snapping each cut to
  the nearest bar (three bars is 5.8 s) would lock the edit to the score.

Proposal: keep all five as framings (they are tools for grown-ups and for the Oracle's style studies), add `comic`
(panels from the same shots) and `diorama` (one orbiting high shot, no cuts), and make `storybook` the default for
child audiences.

### 7.3 Tile "Preparing…" as cover

Today, generating a scene in `simulations/lab.mjs` shows a small status line and progress bar from
`build-progress.mjs` ("Preparing scene", "Loading models", "Finding paths and building sites", "Preparing tiles 3 of
7", "Preparing residents and animals", "Preparing lighting"), then `warmScene()` compiles shaders and `stagedBuild()`
pops the tile in over 1.6 s. There is also `storybook-arrival.mjs`, which turns the generated ranch up as a pop-up
page, behind `?story` (off by default since Evan asked on 2026-10-22). And `ranch-arrivals.mjs` already has six
arrival styles for a finished tile (hologram, laser printed, fly in from space, quantum parts, storybook page, organic
time-lapse), one second by default, presentation only, with every transform restored before life resumes. That is the
right layering: they are our first micro cutscenes, and they are place dialects in waiting (hologram and laser for the
Moonbase, storybook and organic for the Ranch).

That is a good skeleton with the wrong show. The words are developer vocabulary on screen, and the child watches a
bar. Proposal, the **build-in cover**:

- The stages become a diorama scene the child can watch: the camera holds a high three-quarter view of the empty
  board; paths draw themselves ("Finding paths"), building sites are pegged out, tiles land with Dorfromantik's
  bounce one by one (the real `tileObjects`, as they finish), animals trot in from the edge ("residents and
  animals"), and the sun comes up ("lighting", while `warmScene()` runs).
- The music plays the Ranch theme's A section as a loop that can end on any 3+3+2 bar, and the arrival sting lands
  when `finishGeneration()` fires.
- No words on screen. The status stays for screen readers (`aria-live`), and developer mode can still show the
  stage text.
- If the work runs long (more than about 15 s), the world says so: builders keep hammering, the sheep queue at the
  gate. Never a fake percentage.
- The camera eases down from the diorama to the play camera, and play begins on that frame.

The same pattern covers the other generators in the repo that say "Preparing" (the Moonbase adapter, the board and
scene generators).

### 7.4 The Moon Mission chapters

`/mnt/project-files/trek.zip` holds "Abbie and Daddy's Moon Mission": nine chapters and an epilogue (The Mission,
The Problem, The Discovery, The Swarm, The Connection, The Revelation, The Rescue, The Family, The Journey Home, The
Memories), narrated, with music and minigames (the electrical puzzle, the gem bug swat). It is a storybook made of
pre-rendered narration and stills, the opposite end of the render path from Fritigern.

Mapped to the taxonomy, it gives the Moonbase place a ready cutscene set:

- **Intro**: chapter 1 (the solar storm, the mission) as a storybook intro, 30 s first time.
- **Beats**: chapters 3 (the meteorite pulses like a heartbeat: a meta heartbeat, then a diegetic glow) and 6.
- **Reward**: each minigame win gets a 2 to 4 s micro scene (the power comes back on: every light on the base turns
  on, the radio crackles, one signal).
- **Bridge and cover**: the buggy ride to the crash site is a travel bridge that can hide the Moonbase tile's
  generation.
- **Recap**: the epilogue, "The Memories", is a ready-made "story so far" format: a page of pictures and one line
  each.
- **Dialect**: the Moonbase speaks lights, radio and holograms, so its storybook pages are drawn as holographic log
  entries (Outer Wilds' log as style, not expression), and its transitions are radio static and airlock doors.

This gives the Moon Mission the "real purpose" Evan wanted later: it becomes the first authored chapter set on the
new cutscene format. That is a proposal, not a build.

### 7.5 Music Bible stings

The Music Bible (`docs/music/MUSIC_BIBLE.md`) is canon: D major, about 124 bpm, a 3+3+2 rhythm, and an adaptive
architecture of loop, layers, transitions and stingers (an architectural recommendation, not yet an engine). For
cutscenes:

- **Bars as the clock.** At 124 bpm in 8/8 grouped 3+3+2, one bar is about 1.94 s. Micro scenes last one bar,
  rewards two, transitions one or two, beats a phrase (4 or 8 bars).
- **Stings as punctuation.** Arrival (a tile is ready), reward (a creature arrives), discovery (the familiar melodic
  fragment, per the Bible's "discover something important"), warning (a storm is coming), and bedtime (night falls).
  A cutscene ends on its sting's downbeat.
- **Covers loop A and end at the next bar.** The arrival sting is the hand-back.
- **Sound follows the 2x2.** The bell is diegetic, a heartbeat before a reveal is meta, the "hold to skip" tick is
  overlay.
- **Kid-safe.** No horror stingers (the Bible rules them out), no buzzers, nothing louder than the bell.

### 7.6 Suzy

Suzy is Abbie's World's game controller, not a companion or narrator for everything. In cutscenes, Suzy can:

- **Be the read-aloud voice** for overlay text in a scene (subtitles, a choice), in the storybook or Telltale style.
- **Direct a scene on request**: "show me the sheep going home" is a camera-only cutscene (Suzy points the camera,
  the world plays). Building things is allowed; game sense still applies (the player decides, the world reacts).
- **Skip or replay**: "skip", "again", "tell me the story so far". These are presentation commands and never change
  the world.

Suzy must not narrate as a character in the fiction unless a scene casts her, and her `look` never sees cutscene
cameras, bars or subtitles (presentation layer). The game must not call the Game Oracle at run time; these style
presets are authored ahead.

### 7.7 Information principles in cutscenes

- **How would a character know?** A reward is the sheep's happy hop and the bell, not a number. A threat is the sky
  going slate and the animals heading in, not a red banner.
- **The two layers.** Scene events are world-layer and the simulation records them (Alaric now holds the helmet).
  Camera paths, letterbox, subtitles, choice cards and the skip ring are presentation-layer. A cutscene camera
  placed in the world must never become fiction.
- **Each scene's manifest volunteers its cutscenes.** The scene information manifest (`docs/design/INFO_MANIFEST.md`)
  should list each cutscene's category, job, length, audience (child or grown-up) and styles. The `cutscene-*.json`
  manifests here use that shape.
- **Place dialects.** The Ranch uses bells, painted signs and wood (storybook and diorama); the Moonbase uses
  radio, lights and holograms (log entries and airlocks); the coffee shop can lean meta (playful-tense, never scary).

### 7.8 The proposed Abbie's World set

The proposed manifest (`cutscene-ranch-proposed.json`) has ten cutscenes; the checker passes every gate and scores it
86.9, so it ships. The today manifest (`cutscene-ranch-today.json`) describes what is live and scores 24.9 with five
gates failing: no seen-once or hold-to-skip in Fritigern (G2); words nobody reads aloud in the build progress and the
Fritigern framings (G3); the teleport map's blurred panel over the world (G4); Fritigern's events not recorded in any
world (G6, it is a viewer); and the Telltale timer on a child's choice (G7).

| Id | Category | Job | Length | Style | Notes |
|---|---|---|---|---|---|
| `tile-build-in` | Loading cover | Cover, reward | as long as generation | Diorama | Section 7.3. |
| `first-arrival` | Intro | Story, tutorial | 20 s, then 4 s | Storybook | Turns the generated tile up as a pop-up page, then hands back. |
| `creature-arrives` | Reward | Reward | 4 s, then 2 s | In-engine puppet | The animal trots in, the bell, two bars. |
| `built-it` | Micro | Reward | 1.9 s | In-engine puppet | Camera-only nudge; no control taken. |
| `evening-bell` | Montage | Pacing | 8 s | Diorama | Sun down, windows light, animals walk home. |
| `storm-coming` | Beat | Story, tutorial | 6 s | In-engine puppet | One signal: sky, music, animals, sound. |
| `teleport` | Transition | Bridge | 2 s | In-engine puppet | Through the sparkle, never a fade. |
| `story-so-far` | Recap | Story | 10 s | Storybook | Pages of the child's own moments. |
| `fritigern-gate` | Beat | Story | 42 s | Storybook default | Five framings, seen-once skip. |
| `moon-buggy-ride` | Transition and cover | Bridge, cover | as long as the Moonbase build | Diorama | Section 7.4. |

### 7.9 Identity schema 1.2

`docs/oracle/identity/game-identity.schema.json` gains `layers.cinematics` (schema 1.2), so the Oracle can profile
any game's cutscenes and compare them:

- `share_of_playtime`, `control_taken` (how often play is taken away), `render_mix` (pre-rendered, in-engine, hybrid,
  static panels, text), `style_mix` (cinematic, storybook, comic, telltale, diorama, puppet), `category_mix` (the
  eight categories), `interaction_mix`, `skip` (pause, skip seen, hold, fast-forward, shorten repeats),
  `load_cover` (strategy and typical seconds), `hand_back` (seamless, cut, fade), `words_required`, and `scenes`
  (a few representative cutscenes with timings, the way BACKLOG.md asks for a short timeline).

The signature `layer` enum gains `cinematics`. Existing records stay valid.

## 8. The rubric in prose

Seven gates, all must pass:

- **G1 Job declared**: every cutscene names at least one of the six jobs and a category.
- **G2 No trap**: pause works, seen-once skip, hold to skip (not tap), and a tap always gets an answer.
- **G3 Zero required reading**: every word on screen is read aloud, or the scene has no words.
- **G4 No mask**: no fade to white, blur or haze; letterbox only in the cinema style and never on micro, reward or
  transition scenes.
- **G5 Length band**: each scene sits within its category's band (first view and repeat); covers end within one bar
  of ready.
- **G6 Layers apart**: scene events are world-layer and recorded; camera, bars and text are presentation-layer and
  invisible to perception; no engine artifacts in shot.
- **G7 Kid-safe**: no fail state inside a cutscene, no horror stinger, no flashing above 3 Hz, no timer on a choice
  for child audiences.

Then 100 points: purpose fit (two or more jobs, 12), brevity (12), hand-back on the play camera (12), interaction
(poke or choice, 10), one signal across channels (12), music sync (bar-length and sting, 10), cover honesty (10),
repeat shortening (8), place dialect (7), and recap available (7). Ships at 80.

## Sources

- Jesse Schell, *The Art of Game Design* (lenses on story and interest curves).
- Valve, Half-Life 2 developer commentary (no cutscenes, scripted sequences).
- Cory Barlog and Santa Monica Studio talks on God of War's one-shot camera (GDC 2019).
- BioWare on Mass Effect elevators as load covers (interviews, 2008 to 2021 Legendary Edition).
- Mediatonic on Fall Guys' round preview (interviews, 2020).
- Insomniac on Ratchet & Clank: Rift Apart's SSD rifts (2021 interviews).
- Telltale and AdHoc Studio interviews on choice design (The Wolf Among Us, Dispatch).
- Annapurna titles per `../BACKLOG.md`.
- Unity Timeline, Unreal Sequencer and Godot AnimationPlayer documentation (timeline structure).
- Common Sense Media and Joan Ganz Cooney Center summaries on children's attention and read-aloud (kid fit).
- Code on `main`: `prototypes/ranch-atelier/dist/fritigern/`, `simulations/build-progress.mjs`, `simulations/lab.mjs`,
  `simulations/storybook-arrival.mjs`, `simulations/story/story-director.mjs`, `simulations/presentation-layer.mjs`.
- `docs/music/MUSIC_BIBLE.md`, `docs/design/INFO_MANIFEST.md`, `../hud/HUD_STUDY.md`, `../aesthetic/AESTHETIC_STUDY.md`.
