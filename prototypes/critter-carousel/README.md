# Critter Carousel

The Creature Lab POI as a minigame instead of a menu. Three ingredients ride
past on a loop — creature, then outfit, then buddy — and she taps to grab the
one she wants. Out comes a `CreatureRecipe` and a composed image prompt.

```bash
npm install
npm run prove     # headless proof, reads as text
npm test          # 23 unit tests
npm run dev       # browser, http://localhost:5173
npm run play      # terminal, --seed=3 --taps=500,1400,2300
```

## Why a carousel

The selection UI it replaces is three grids of eight tiles. That is a menu, not
a game, and it asks a six year old to read. A carousel keeps the same 512
combinations but turns choosing into an act of timing, which is playable.

## Kid rules, enforced by tests

- **One verb.** Tap anywhere, or press space. No drag, pinch, or swipe.
- **No losing, no timer.** The lane loops forever. Waiting is a valid strategy.
- **A tap always pays out.** Tapping between two items yields a seeded blend of
  the pair rather than a miss, so a sloppy tap becomes a surprise. 61% of the
  lane is a clean pick; the rest is a blend, never nothing.
- **A double tap is swallowed** so an excited second tap cannot spend the next
  stage.
- **Deterministic.** Same seed and same taps produce the same card, at any
  frame rate.

## Layout

```
src/core/       pure reducer — no Phaser import anywhere
  catalog.js    the 3x8 ingredients, ids mirroring CreatureBuilderContent.swift
  machine.js    createGame / tick / tap / spotlight / recipe / renderText
  prompt.js     the prompt DAG: 3 ingredients -> 1 image prompt, with a trace
  rng.js        counter-based PRNG, pure so the reducer stays pure
src/phaser/     renderer only, plus window.__CAROUSEL__
src/harness/    prove.js (scripted proof) and play.js (terminal play)
```

## The prompt DAG

`composePrompt` is the part meant to outlive the prototype. Three ingredients
enter, and a named node graph produces the image prompt, card name, powers, and
personality — returning the trace alongside the result so a prompt is
reviewable as text rather than a string assembled inline:

```
subject      a cheerful young girl with bright curious eyes
wardrobe     wearing stealthy ninja outfit with mask
companion    with an adorable puppy companion
powers       stealth, agility, and shadow powers
mood         happy and loyal
style        storybook trading-card illustration, soft rounded shapes, ...
cardName     Ninja Abbie
cardTitle    Ninja Abbie & the Puppy
```

All 512 combinations compose successfully, which is checked by both the tests
and `npm run prove`.

## Porting to Swift

`machine.js` maps to a struct with the same functions and no view dependencies,
which makes it testable on Linux the same way `World2JustRightModels` is. The
recipe it emits already matches `CreatureRecipe`, so the existing generation
pipeline needs no change.
