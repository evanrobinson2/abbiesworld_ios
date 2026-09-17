# Prototypes

Minigames and game logic get built here first, on localhost, in Phaser, before
any Swift is written.

## Why

Cloud agents have no Mac and no Xcode, so SwiftUI cannot be compiled or run
during authoring. Anything built straight into the app arrives unverified. A
Phaser prototype runs anywhere node runs, which means the rules of a game can
be proven before they are translated.

## The two rules that make a prototype provable

**1. No gestures.** Input is taps and keys only — no drag, pinch, swipe, or
long-press. A game that needs a gesture cannot be driven by a script, which
means it cannot be proven without a human. It also happens to be the right
constraint for a six year old on an iPad.

**2. Phaser renders, it never decides.** All game state lives in a pure
reducer under `src/core/` that imports nothing from Phaser. The scene calls
`tick(state, delta)` and `tap(state)` each frame and draws the result. Because
the core is pure, the same game can be played by a browser, by a unit test, or
by a text harness, and all three agree.

The payoff is that every prototype ships with a headless proof:

```bash
npm test          # unit tests over the pure core
npm run prove     # scripted playthroughs + invariant checks, as text
npm run play      # play it in the terminal
npm run dev       # play it in a browser
```

`npm run prove` is the one that matters for review. It prints the actual game
screens as text and then checks the invariants that make the game kind, so a
reviewer reads a transcript instead of taking a claim on faith.

Every prototype also exposes a debug API on `window` so a browser driver can
play it without touching the UI:

```js
__CAROUSEL__.text()       // the current screen, as text
__CAROUSEL__.advance(900) // step time deterministically
__CAROUSEL__.tap()        // the only verb
__CAROUSEL__.recipe()     // what the game hands the app
```

## Ports

Dev servers pin their port with `strictPort: true`, so a busy port is a loud
error rather than a silent move to the next number. If a port here collides
with something you are running, say so and we will pick one together.

## What is here

| Prototype | Proves |
| --- | --- |
| `critter-carousel/` | The Creature Lab POI minigame: a tap-only carousel that picks creature + outfit + buddy, and the prompt DAG that turns the three into one image prompt |

## Handing a prototype to the app

A prototype is done when its core emits exactly the shape the Swift side
already accepts. `critter-carousel` emits
`{ creatureId, outfitId, buddyId }` — the same fields as `CreatureRecipe` in
`CreatureCardModels.swift`, with ids that match `CreatureBuilderContent`. The
Swift work is then a port of a known-good reducer plus a view, not a design
exercise.
