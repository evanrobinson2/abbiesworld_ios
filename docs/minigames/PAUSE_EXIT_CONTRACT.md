# Mini-game pause and exit contract (AW-113)

Status: drafted. The shared module and its unit tests exist; no game is wired to it yet and nothing is verified live.

Rule (Evan, 2026-10-24): every mini game lets the player pause or exit by default. A game may override either control for a
specific situation (a crucial cutscene, say), but only as a conscious design decision. There is no blanket cutscene restriction.

## Runtime: `prototypes/ranch-atelier/dist/simulations/minigame-contract.mjs`
`createMiniGameContract({id, onPause, onResume, onExit})` gives `pause()`, `resume()`, `togglePause()`, `exit()`, `available()`.
- Default: `available()` is `{pause: true, exit: true}`.
- An override is `beginOverride({situation, rationale, controls})` and `endOverride(situation)`. The situation must be named, the
  rationale at least a sentence, and controls are from `pause`, `exit`. Anything else throws, so a missing handler or forgotten
  flag cannot become a lockout.
- Begin and end are explicit; ending restores normal availability. Every begin and end is recorded in `contract.log`.
- A refused control returns `{ok: false, reason}` naming the situation and rationale, so the game can say why.

## Mini Game Designer process
The design card for each game gets an "Overrides" line: `none`, or for each override the situation, why it must hold, which
controls it removes, what event starts it and what event ends it. Reviewers reject an override with no rationale or no end.

## Existing behavior (inspected)
`simulations/gameboy.mjs` (Grace's pocket game) pauses with its Start button (`state` toggles `play`/`pause`) and has no exit
control of its own; the host scene closes it. Other games were not found on `main` using a shared pause or exit. Wiring each
game to the contract, and a headless-Chrome check of the default controls plus any declared exception, are the next steps.
