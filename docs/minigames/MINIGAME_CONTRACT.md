# Mini-game contract: charms (AW-112, #644)

Part of the shared mini-game contract. Every mini game that awards a backpack charm also owns the way back to it.

1. **A charm is a way back.** Set `replay: '<town gate>'` on the game's entry in `CHARMS`
   (`prototypes/ranch-atelier/dist/simulations/backpack.mjs`). The gate must be a key of `ENTRANCES`
   (`simulations/abbietown/entrances.mjs`) with a page `url`. `charmReplay(id)` resolves it and adds `?from=` so the game
   returns her to where she was. A charm with no `replay` only tells its story.
2. **How she uses it.** Tap a charm on the backpack to focus it (it says what it was for and, if it can, "tap again to play it
   again"); tap the focused charm again to travel. Earning, boxing and hanging charms is unchanged, so inventory state is kept.
3. **First-charm teaching.** The first time any charm arrives, the inner-voice line also teaches the tap-twice gesture.
   It is stored as `taught['charm-replay']` in her `aw-backpack` record (`taught()`/`markTaught()`), which
   `account-keep.js` merges into her account: once per player, not per charm, session or device (Deep Personalization).
4. **New games.** When a game is added to `game-registry.json` with a charm, add its `replay` gate in the same PR.

Status: drafted. Linked today: basement and café (café door), school roof (school door), toy car (skate park).
Not linked: rocket (the Launch gate is an in-town stage with no page URL yet), moon, bub, moon buggy and the rest
(no live gate). Not verified in a headless-Chrome run of the backpack UI; covered by `simulations/tests/charm-replay.test.mjs`.
