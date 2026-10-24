# AW-STUDY-0060 The Carwash: a four-minute minigame

Evan, 2026-10-24 01:10Z: "you need to do a full study for carwash. there was so much more it could have been a 4 minute mini game",
"we need to play the carwash song going through it", "there wasn't enough space, and we didn't feel like we could see from inside
the carwash", "there is a new invariant no midi sounds". (The coordinator suggested 0056; that number already belongs to the Trick
Day proposal, so this is 0060.)

Status: **drafted**. The study, anthem brief and storyboard are written. Nothing below the "Built today" line is built yet. The
current drive-through (AW-STUDY-0060 round 0, `simulations/carwash/`) stays live until the minigame passes its headless run.

## Design card
- Feel: I am the one cleaning the buggy, and I am wearing the splash. Satisfying, never stressful; the town is cheering.
- Four ways of acting: this is **FPS as Abbie** riding the buggy through a place. Tiles made the carwash; nothing here is a card.
- Diegetic: nozzles, brushes, foam curtains, dryers, the conveyor, a shop bell, a clean-meter painted on the wall sign. Spatial: the
  toy animals react (shiver, squeak, shine). Overlay: none during play except one star row at the end. Zero words.
- Place dialect: downtown Winchester, painted signs and bunting, 1970s chrome and neon on the carwash itself.
- World layer vs presentation: the dirt, foam and shine are on the buggy and are in-fiction; the aim reticle is presentation only.

## The loop (about 4:00, 124 bars at 124 bpm)
One song, one section per station, so the music changes when the stage does. Dirt is a real map on the buggy (`setDirt` zones:
nose, hood, wheels, seat, rack, toy animals). Every station removes or adds something you can see.

| Time | Bars | Station | What you do | Skill moment | Soaked? |
|---|---|---|---|---|---|
| 0:00 | 8 | Pull in | Steer onto the rail, bell rings, counted in by the claps | Line up with the rail | no |
| 0:15 | 16 | Pre-soak | Drag to aim a spray wand over the mud; it loosens and runs off (PowerWash reveal) | Cover the muddy patches before the station ends | a little |
| 0:46 | 16 | Foam | Foam curtains fall; lean left and right to catch bubble clusters on the beat, toy animals get bubble hats | On-beat catches build a combo | yes |
| 1:17 | 24 | Brushes | The big brushes roll in; hold centre to scrub, dodge the swinging mitt so it does not knock the toys off | Mitt dodge, three of them | very |
| 2:03 | 16 | Rinse | Sweep the wand over the foam; leftover suds show where you missed | Find and clear every suds patch | very |
| 2:34 | 16 | Wax and dry | Drag across the paint for a shine stripe, then the dryers: tap with the claps to blast the water off | Tap on the claps | drying |
| 3:05 | 16 | Detailing | Polish each toy animal and the theme's sparkle (confetti glints per theme) | One flick per toy | no |
| 3:36 | 12 | Finale | The bay door lifts, sun hits the clean buggy, the photo flash, stars | none | no |

Score is Sparkle, 0 to 3 stars: how much of the dirt map is gone (60%), beats caught (20%), toys never knocked (20%). No fail, no timer
on screen: a station ends when its song section ends, like Toca Boca's no-fail play and PowerWash's "work at your pace" core, with the
beat as the pressure instead of a clock. Reward is backpack charms only: first wash earns the Moon Buggy as today; three stars earns
a "golden sponge" charm. Never coins.

Replay value: the buggy keeps its real dirt from driving around town (the Effect Hunt driver already marks mud), so each visit is a
different job; a daily "special mud" pattern (a Winchester-flavoured splat), toy-animal slots you filled in the garage are the
customers' favourite thing to polish, and Sparkle is saved per theme so you chase three stars in each colourway.

## Space and sight (the two complaints)
- Plot: the old tunnel was 34 m long and 12 m wide, with the player driving 7.5 m/s through it in about five seconds. The new plot is
  a **110 m by 30 m** carwash street: a wait lane and a "hand wash bay" at the start, a 72 m glass-sided tunnel with the six stations
  spaced so each is its own room, and an exit apron. The conveyor now holds the buggy to a crawl (1.4 m/s) and the player steers the
  lateral lean; nothing forces the speed except the stage.
- Sight: the tunnel walls are glass and the roof is open slats; stations are 9 m rooms with a lit sign. The cameras:
  1. **Seat cam** from just behind and above Abbie's helmet (default in the tunnel), brushes and foam fill the view, water runs
     down a lens canvas (existing lens code in `carwash.mjs`) and wipes clean at the dryers.
  2. **Over-the-shoulder** for aiming the wand at the pre-soak and rinse.
  3. **Cinematic cuts**, a side shot as the mitt swings and a low wheel cam at the brushes, each under 2 s, cut on the beat.
  4. **Pull-out** to the overhead on the finale, then back to the town.
- Hex city thread owns Winchester's board: the plot needs a 110 m by 30 m flat strip beside Main St; placement is agreed with them and
  `findSite` already scores for approach and exit zones.

## Music: the carwash song
Original disco-funk, **real produced audio, not MIDI** (Evan's new invariant). Made with the ElevenLabs Music API through the
`music-takes` workflow (licence checked in `tools/composer/README.md`: commercial use in an indie game on a paid plan). The brief
`tools/composer/api/briefs-carwash.json` is one cue, 124 bars, eight sections matching the table above, in D major at 124 bpm with the
3+3+2 feel from the Music Bible, instrumental (handclaps, wah guitar, funky bass, clavinet, brass stabs). It is inspired by the feel of
1970s carwash anthems and is **not** Rose Royce's "Car Wash"; playing the real record in the game needs a sync and master licence from
the rights holders and is a decision for Evan. The game plays the take from the first tap of "pull in", and each station's mechanics
read the beat from the take's known bpm and offset, so the claps and the catches line up.
Sound effects are real recordings from the sound store (splash-big, splash-small, bubbles, faucet, fan, vacuum, washing, squeak-toy,
clap, win-sting, magic-chime, car-horn); the old WebAudio noise bed in `sound.mjs` is retired for these.

## Start point (proposal from the Charms thread, Evan's call)
Missions start at their backpack charm. Proposed: a "Sponge" charm (id `carwash`), chunky yellow faceted sponge with blue bubbles on a gold
ring, floating at the carwash with an aqua halo beam; tap to start, winning drops it in the chest (`docs/oracle/charms/CHARMS_STUDY.md`).
The minigame exposes `window.__carwash.start()` so the Demo thread's shared charm start point can launch it. Until the charm exists,
the loaner at the carwash is the start.

## After the win: a bigger buggy that can be seen (Evan, 01:57Z)
Evan's screenshot shows the earned buggy hidden behind foliage, only its halo ring visible. Proposal, to agree with the Kart mode thread (which
owns car mode, travel-through-scenery and the can't-leave-drive-mode fix): the earned buggy drives at vehicle scale 4.0 instead of 2.6, with a
brighter theme-coloured pennant on a tall mast so it reads over trees, the chase camera lifts and pulls back with the scale, and trees and bushes
within about 8 m of the buggy dither away (world layer stays untouched; this is a render fade) so it is never swallowed. Scenery the buggy
touches bursts or bends instead of stopping it ("travel through everything").

## Built today
- The drive-through: loaner, conveyor, soak, earn, garage with five toy slots and themes (merged).
- The anthem brief and a queued generation run (two takes) for review.

## To build, in order
1. New plot and stations in `carwash.mjs` (split into `stations/*.mjs`), the dirt map zones in `buggy.mjs`.
2. Seat cam and cuts; the lens canvas wipe.
3. Beat clock from the take; score; charm; saved Sparkle per theme.
4. `tools/minigame-test/carwash-flow.cjs`: headless run drives every station, asserts the dirt map falls under 15%, three stars is reachable,
   no console errors, music element plays, and screenshots of each station for the thread. The gate: this passes before it goes live.

## Context engineering
Recorded in `prototypes/ranch-atelier/dist/studies/context.json` (key `carwash`), shown as the Context card.

## How it was made, and how to be faster next time
(To be filled in with times once the minigame is playable; the study and brief took about an hour from Evan's message.)
Early lesson: the first carwash was built as a sealed drive-through before anyone asked what the player does inside it. Next time the
design card's table of stations, skill moments and music sections comes before the first mesh; and the brief for the music is written
in the same sitting as the stations, because the sections of the song are the stations.
