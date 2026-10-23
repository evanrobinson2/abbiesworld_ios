# Champions of the Drifting Isles

A browser tribute to **9 Kings** (Sad Socket, 2025), one of Evan's favourite games. It plays like 9 Kings; everything
you see and hear is our own. Style yes, expression never: the rules' shape is borrowed, while the names, setting, text,
models, card frames, UI and sounds are original.

Live: https://abbies-champions.vercel.app (Vercel project `abbies-champions`, built from `main`, root `prototypes/champions`).

## What is faithful to 9 Kings

| 9 Kings | Here |
| --- | --- |
| Pick a king, each with their own deck | Pick one of 5 champions (Wren, Mother Bramble, Captain Copperpot, the Ember Sisters, Old Moss), each with a seat and 6 cards |
| 3 x 3 kingdom of 9 plots; first card must be your base | Same: 9 open plots on a 5 x 5 lattice, your seat goes down first |
| Start with your base card and 3 from your deck | Same |
| Each year: play or discard until 2 cards remain, then the battle plays itself | Same; discards go down the well for 9 gold |
| Same card on the same plot levels it up | Same, up to level 9 (x1.25 health and damage per level, more units) |
| Card kinds: base, troops, towers, adjacency buildings, enchantments, tomes | Seat, troops, towers, buildings (buff the 4 neighbours), charms (stack on a plot), spells |
| 9 gold after every battle; rerolls 10, +10 each | Same |
| Win: a card from the beaten king's deck; lose: one from your own; then pick 1 of 3 | Same |
| 3 lives; an enemy touching your base costs one | Same: an enemy reaching your seat breaches the isle |
| Rival kings attack; the attacker is shown and can be rerolled | Same: the attacker's portrait sits top centre, tap it to reroll |
| Year calendar: councils 4/14/21/29, merchant 10/25/31, plot expansion 12/19/27, war 8, peace 23, final battle 33 | Same calendar (Sky Council, Drifting Merchant, the Spire, Envoys of War and Peace, Final Siege) |
| Merchant cards 30 gold, +15 each | Same |
| Final battle: the enemy king comes in person | The strongest rival champion walks out as a boss |
| Damage dealt per plot shown after battle | Same, floating from each plot |

Not yet in: perks and difficulty tiers, the prophecy blessing (years 6 and 16), endless mode, the remaining 4 champions
(the title promises a set of nine eventually), multiplayer.

## Files

- `js/data.js`: champions, cards, edicts, calendar. All content and numbers live here.
- `js/sim.js`: rules and the battle simulation. Pure JS, no rendering, so Node can run it.
- `js/world.js`: the three.js diorama, battle rendering and effects, and card art (each card's art is a render of its own model).
- `js/models.js`: procedural toy models for every card, champion and unit (part and material names say what they are).
- `js/main.js`: the hand, drag and drop, HUD toys, reward and event stages, saving (localStorage).
- `js/audio.js`: every sound, synthesised with WebAudio.
- `tools/balance.mjs`: plays full 33-year runs with a simple bot for every champion (`npm run balance`).
- `vendor/`: three.js r170 (MIT) so the game has no CDN dependency.

Models from the model store (R2, through the `/r2` rewrite): Sunward Castle and Iron Crown Fortress on the rival isles,
the soft-toy and faceted trees and two foothill props on your isle. Their materials are painted by shading role
(`green`, `light`, `trunk`), the model store's convention.

## Balance (2026-10-23)

`node tools/balance.mjs 4`: the bot wins about one run in four, and most losses come in years 12 to 20, when rivals
start playing two cards a year. A person who places with intent should win about half their runs.
