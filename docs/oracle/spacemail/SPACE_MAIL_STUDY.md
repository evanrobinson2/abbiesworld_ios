# AW-STUDY-0012 - Space Mail Mini Game

Oracle study, 2026-10-23. Requested by Evan: "cards for ferry could be 'deliver happy letters' and you could play a
delivery game ... pre design a reward sequence, badge, stats, and record that for players ... this one should feel like
a fun kind of free spirited romp, collecting powerup, people send letters home, you run around picking them up ... you
get points ... at the end the people reward your space ship with a trophy ... a 'reward shot' ... photo album ...
game should support game pad", and "leverage identity".

This is a study with a playable sketch, not a build. It designs the mini game from what already exists: the Moon tile
and its models (AW-STUDY-0007 Moon remaster), Card Forge, player accounts, and the Game Identity schema.

Files:

- `SPACE_MAIL_STUDY.md` (this file).
- `space-mail.identity.json`: Space Mail's own identity record, schema 1.2, valid against
  `docs/oracle/identity/game-identity.schema.json`. Values are design targets marked `estimate`, to be measured on the sketch.
- `spacemail-signatures.json`: the evidence. Fifteen games as Oracle DNA vectors (`oracle.dna.v1`), library records where
  Evan owns or studied the game, estimates otherwise, each with the lessons we take (style) and never take (expression),
  plus the distance from each to Space Mail and to Abbie's World's identity record.
- The page and the sketch live on the Studies site: `prototypes/ranch-atelier/dist/studies/spacemail/`
  (`index.html` the study, `play.html` the sketch, `img/` its captures). https://app.abbies.world/studies/#space-mail

## The short version

1. **A romp inside the builder.** Space Mail matches Abbie's World's identity record on challenge, structure, social and
   chance, keeps its rules (no fail, few verbs, the world answers every action, the interface hides), and turns tempo up. Nearest studied games by DNA: Astro Bot, PAW Patrol
   World (owned), Crazy Taxi, A Short Hike, Pokémon Snap, Mario Galaxy.
2. **The loop is a ten-second delivery.** A mailbox flag goes up and the colonist hops with a glowing envelope over
   their head; you bound over and grab it; when the satchel is full enough you hop into the ferry hatch; the ferry hands
   back a parcel in one home's colour; you take it there. Points: 10 a letter, x1.25 for each extra letter in the bag,
   x1.5 if you post mid-hop; 15 a parcel.
3. **Low gravity is the fun.** Gravity 5.2, hop 6.4 m/s, holding hop floats you (gravity x0.45 while rising), air
   control 0.55, squash and a dust puff on landing. Some letters float away upward: catch them with a big hop.
4. **Power-ups are more freedom, never a weapon.** Moon boots (double hop), letter magnet (reach 7 m), comet (fast),
   and the real Moon buggy (MR-003), a 12-second ride.
5. **No words, no fail.** The clock is twelve lamps on the ferry pad that light one by one, then the horn. The play HUD
   is one glass satchel (six slots, the score, a draining ring for the active power-up), about 3% of a phone screen.
   "Where next" (Y or tap the satchel) draws a short gold ground arrow for the player only.
6. **The people are the reward.** At the horn the colonists gather at the ferry and give the ship a trophy. The
   **reward shot** poses the player with them and renders once at print size; the photo goes into the player's album
   with a badge on the house ladder (Seed, Sprout, Bloom, Harvest, Sun) and stats (letters, parcels, best bag, biggest
   hop, power-ups, points).
7. **Missions live on cells.** People and decorations give missions; the giver shows it in the world (flag, wave,
   blinking dish) and, on the board, the cell gets thin LED light rising straight up round its edge, in the mission's
   colour. Tap the cell, or pick it with the stick and press A, and its Card Forge card flips up. Second example in the
   sketch: Moon Rock Hunt (a scavenger hunt) at the meteorite crater, card only.
8. **Gamepad first.** Left stick run, A hop (hold to float), X or RT jet puff, Y where next, B back, right stick nudges
   the camera, D-pad runs too. Touch: a glass stick wherever the thumb lands, two glass buttons. Keys: WASD, Space,
   Shift, E.

## Identity

The Oracle's DNA axes (tempo, challenge, expression, structure, social, systems, chance, session) give a vector per game.
Abbie's World's own identity record (`docs/oracle/identity/examples/abbies-world.json`) is on the same axes. Space Mail
matches it exactly on challenge, structure, social and chance, and trades expression and systems for tempo. For
comparison, the mean of Evan's taste list in the library (Tiny Glade, Dorfromantik, 9 Kings, Bricktales) is also given.
RMS distance: 0 same, 1 opposite.

| | tempo | challenge | expression | structure | social | systems | chance | session | distance to Space Mail |
|---|---|---|---|---|---|---|---|---|---|
| Space Mail (target) | .67 | .22 | .44 | .33 | .44 | .33 | .33 | .22 | 0 |
| Abbie's World (identity record) | .33 | .22 | .89 | .33 | .44 | .67 | .33 | .44 | .25 |
| Evan's taste list (mean) | .28 | .50 | .73 | .36 | .30 | .39 | .53 | .30 | .22 |
| Astro Bot (est.) | .70 | .35 | .30 | .55 | .30 | .45 | .15 | .25 | .14 |
| PAW Patrol World (owned) | .33 | .22 | .33 | .22 | .33 | .22 | .33 | .11 | .15 |

The house rules from `GAME_IDENTITY.md` ("What the five share") that Space Mail keeps: few verbs (run, hop, puff,
ping), the world answers each action in under half a second (chime, flag, cheer, door light), the interface hides
(one glass object, zero words), low failure cost (none). The one it bends: building is not the verb here; delivering is.
Space Mail is a mini game inside the builder, the way the ferry is a place inside the Moon.

## What the Oracle found

| Lesson (style) | Games |
|---|---|
| A delivery is a ten-second goal with a cheer at the end | Crazy Taxi, Overcooked! 2 (owned), A Short Hike |
| Low gravity feels like joy when holding the jump floats you and landings puff | Mario Galaxy, Astro Bot |
| Power-ups are more air, reach, speed or a ride; a vehicle is the favourite | A Short Hike, PAW Patrol World (owned) |
| A full bag and a trip home makes greed a feeling | Dome Keeper (owned), Death Stranding |
| The people you helped are the score: they gather and cheer | Astro Bot, Death Stranding, Animal Crossing |
| End on one hero moment you keep: pose, fanfare, a photo, a medal ladder | Fall Guys, Pokémon Snap, Trackmania |

Never taken (expression): any game's characters, art, models, music, sounds, text or levels; Mario's star pose, Crazy
Taxi's arrow and voice, Fall Guys' crown, Animal Crossing's letters and stationery. Game facts are from public
knowledge, not captures; estimates are marked in `spacemail-signatures.json`.

## Information (the 2x2 plus none)

| Information | How the characters know | Mode |
|---|---|---|
| A letter is waiting | Flag up, sender hops and faces you, envelope glows | diegetic |
| Which home a parcel is for | Parcel band = flag = door light = suit trim colour | diegetic |
| Time left | Ferry pad lamps fill, horn | diegetic |
| Bag contents, score, power-up | Glass satchel, draining ring | overlay (3%) |
| Points earned | "+" stamp over the ferry or home, rising chime | spatial |
| Where next | Short gold ground arrow under Abbie | spatial, presentation layer |
| A mission is on this cell | Thin LED light rising round the cell edge | spatial, presentation layer |
| The giver has a mission | Flag up, wave, blinking dish | diegetic |

One signal, many channels: the ferry departure drives the pad lamps (light), the horn and music lift (sound, music) and
the colonists hurrying their letters (NPCs).

## Reward shot, album and records

- **Reward shot** is a shot type for every mission: gather the givers, place the trophy, pose the player, frame with a
  fixed recipe, render once at print size. The sketch re-renders at 1600x1000 with a 4096 shadow map, a warm key light
  and 8x MSAA while the polaroid develops. The build swaps in a progressive path-traced render
  (three-gpu-pathtracer) for the "ultimate" look; a few seconds on a phone is hidden by the develop animation.
- **Album**: every reward shot is kept; other missions add theirs.
- **Badge**: Seed, Sprout, Bloom, Harvest, Sun by points (sketch thresholds 60 / 150 / 260 / 400), the same ladder as
  card rarity.
- **Per-player records**: the sketch uses this browser's storage. The build keeps a small record per signed-in player
  (plays, best, badges, stats) and the album JPEGs, on the same account and Blob ledger as the AI wallet
  (`prototypes/ranch-atelier/dist/ACCOUNTS.md`). Nothing else is collected.

## Shared with Sandbox v2

Sandbox v2 owns card tiers and the hand. Shared from here: the mission light (a presentation-layer effect, gold for
Happy Letters, teal for the hunt), mission cards as Card Forge cards with their own tier gem, and the satchel HUD
pattern. Tier names for missions and badges should come from the same ladder.

## Other scenarios (ideas, not designs)

- **Moon Rock Hunt**: a scavenger hunt round the meteorite crater (card in the sketch, not playable).
- **Night shift**: Evan's idea of the same low-gravity runner as an overhead twin-stick game. Noted only.

## To build

1. A mission runtime inside the Moon tile: giver, cell, card, rules, reward recipe. Space Mail first.
2. Abbie as the skinned player (AW-STUDY-0011 option C) with the satchel.
3. The reward shot (recipe, path-traced render) and the album on the player's account.
4. One mission-light effect per place dialect (Moon in light; Ranch in wood and bells).
