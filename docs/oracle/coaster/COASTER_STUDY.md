# AW-STUDY-0054 - Toy-Car Coaster

A 30 second first-person ride on an orange toy-car coaster built in the skate park by the high school in Winchester.
Game: `prototypes/ranch-atelier/dist/studies/coaster/play.html`. Study page: `studies/coaster/`. Kit:
`simulations/coaster-kit.mjs`. World: `studies/coaster/coaster-world.mjs`. Test: `tools/minigame-test/coaster-flow.cjs`.

## The brief, in Evan's words (2026-10-23, 21:04Z / 5:04 PM)

> new mini game .. at the skate park by the school there's a really cool hot wheels roller coaster. make a VR hot wheels
> ride (FPS view) super fun and decorated. 30 seconds in length. study first, but go all the way to low poly proof. flow
> down from tile view onto skate park, and then zoom into track ... tilt shift view, then you can interact with the
> roller coaster and get in a car .. let me see if we can borrow concept assets

Then (21:05Z) his concept source: https://www.printables.com/tag/hotwheels

## Decisions

- **Inspired by, not Hot Wheels.** Mattel's trademark: no name, logo or car design. Orange-style track with white and teal
  edges, an original yellow buggy with a teal stripe.
- **A track is a recipe.** `buildTrack` is a turtle (straight, turn, pitch, roll, with banking, drift and gaps). The speed
  rolls downhill, kicks at boosters, brakes at the finish and is stretched so the ride is exactly 30.0 s. Turns swing about
  the world's up so a slope stays a slope; a loop drifts sideways so it clears itself.
- **Flow.** Tile view (seven hexes; the park's glows) -> orb -> 3.2 s flow down -> 2.4 s zoom with a tilt-shift pass (one
  render target, a blurred band above and below a sharp one; off in the car) -> tap the glowing car (or a paint bucket to
  repaint it) -> dive into the seat, gate lamps 3-2-1 -> ride -> finish confetti -> charm and replay.
- **Steering is leaning.** Hold and slide across the screen, or arrow keys / A and D. Sixteen stars in three lanes; ten
  win the new `toy-car` charm (`earnCharm('toy-car')`). Her earned charms hang from the car's mirror and swing.
- **How it shows information** (HUD study): diegetic gate lamps, glowing boosters, wind and rumble; meta field of view,
  shake and speed lines; overlay a star count and one thin progress line, no words. Presentation objects (park edge glow,
  tap ring, speed lines) are flagged `userData.presentation`.
- **Where it lives.** Registered as `town:skate-park` in `simulations/abbietown/entrances.mjs` (scene `skate-park`, region
  downtown, the hex city thread's pad). `?from=` returns the player; `?skip=tile` starts zoomed in. The tile board in the page
  is a stand-in for the real neighbours.
- **Tour: yes.** A playful stop at the skate park (`whats-new.json` entry carries `"tour": true`).

## Licences and concept assets

The Printables hotwheels tag page shows no licences, so its models are reference only; none was downloaded. Use CC0 or
CC-BY (with credit) only; non-commercial and no-derivatives stay reference. Everything shipped is primitives, so there is
nothing to credit yet. Borrowed concept art goes in `studies/coaster/img/concepts/`. No Midjourney proofs this round.

## What to do next

1. Redraw the loop as a clothoid (a circle makes the force jump; Technology Review's piece on smooth coasters).
2. Mount the ride in the town scene instead of the stand-in board; add the Toy car to the charms map and jewellery box art.
3. Concept art pass (Midjourney or Evan's borrowed pictures), then hi-fi low-poly track pieces and a better car.

## How it was made, and how to be faster next time

Timeline (local, UTC-4): 5:04 PM first words; 5:10 PM canon read, hex thread asked for a pad (answered by 5:10 PM);
5:30 PM track recipe tuned in numbers; 5:45 PM first full playable; 5:55 PM study page. Live: after the next deploy batch.

- **Where the time went:** the track recipe, about 25 minutes (a loop that returned to its start point, a track that dived
  underground, a spiral that climbed). The look took one screenshot round (fog washed out the tile view; the hood and
  windshield filled the first-person view).
- **Speedups:** (1) run the ten-line Node check of height and closest approach per segment before rendering anything;
  (2) the cockpit checklist belongs in the kit (glass and frame hidden from the seat, eye position, mirror distance), tested once;
  (3) ask the Oracle for a rail-ride study ahead of time (cloud threads cannot reach it, so none fed this round); (4) start
  concept art in parallel with the recipe so the model matches a picture; (5) a new ride is now a new recipe, not new code.
