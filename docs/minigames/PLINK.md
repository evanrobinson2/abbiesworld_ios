# Plink — Abbie's World Peggle

Kid-facing name: **Plink**. Land: **Peggle Land**. POI: **The Plink Pavilion**. Internal game key: `peggle`.

A marble-drop / peg-board for a smart six-year-old. It is a cousin of Peggle, not a reskin of PopCap's game.

## Why this is Abbie's World

Peggle is a cannon, orange pegs, fever, and buckets. Plink is a **flower fountain**, **gem seeds**, **Garden Glow**, and **collection bowls** — the same family of toy as Letter Works' vowel tanks and Whizbang's gadget barn.

| Peggle habit | Plink |
| --- | --- |
| Cannon | Flower fountain on the pavilion roof |
| Ball | Dewdrop marble |
| Blue pegs | Sleeping gem seeds |
| Orange pegs | Glow seeds that must wake |
| Fever | Garden Glow after a big bounce song |
| Buckets | Four collection bowls: Bounce, +1 Drop, Gems, Glow |
| Game over | The garden gifts one last drop; Again is always allowed |
| Masters / owls | No licensed characters. Later, a creature-card face can ride the marble |

The loop still matches World 2: **explore the land → inspect the POI → play → earn gems → keep a decoration**.

## Open-source clones we studied

We used these as mechanics references. None of their code, art, or audio is in this repo.

| Project | License | Notes |
| --- | --- | --- |
| [Chaosah Magical Arcade](https://codeberg.org/mailbun/chaosah-magical-arcade) | MIT code, mixed asset licenses | Godot Peggle-like from a kids' comic jam. Closest kid-safe licensed reference. |
| [Feggle](https://github.com/FergusGriggs/Feggle) | MIT | Tiny pygame clone. |
| [PeggleTutorial](https://github.com/FergusGriggs/PeggleTutorial) | MIT code; **PopCap audio** | Tutorial only. Do not ship its sounds. |
| [PegglePy](https://github.com/Mr0o/PegglePy) | GPL-3.0 | Study the bounce puzzle, do not copy. |
| [Pego](https://github.com/Timo654/Pego) | Unclear | Unity clone on itch. Leave it alone until the license is explicit. |

Plink's physics (`prototypes/peggle/app/lib/physics.js` and the Swift port) are original circle-circle integration.

## World insertion

- **Land** `world.peggle` / Peggle Land. Carnival meadow west of Work Land.
- **Pad** `hardpoint.peggle.pavilionPad` plus two open pads so the scene still proves the hardpoint system.
- **POI** `poi.pegglePavilion` / The Plink Pavilion. Contract opens `.plink` into **Peg Battle**. Grants gems and the Marble Fountain decoration, milestone `minigame.plink.completed`.
- **Classic Games** lists Peg Battle, same as Whizbang.
- **Pack** `AssetSources/World2/minigames/peg-battle/` is the content. The next minigame should copy that pack pattern, not the battle engine.

## Progression

Eight beds in `AssetSources/World2/minigames/plink/campaign.json`:

1. Dewdrop Nursery
2. Berry Lattice
3. Rainbow Arch
4. Marble Mill
5. Sparkle Orchard
6. Crystal Cascade
7. Night Garden
8. Pavilion Finale — awards `decoration.story.plinkFountain`

Clearing glow seeds unlocks the next bed. Gems come from the bed reward plus the gem bowl. The finale fountain is a story decoration for the treehouse.

## Localhost first, server for data, pipeline for art

1. Play the Next.js prototype on port **5174** (`prototypes/peggle`).
2. `/api/catalog` reads the campaign file, then asks `ABBIES_SERVER_URL` for Game Asset API v1 `minigames/plink/campaign` when that record exists.
3. `/api/progress` stores local progress and forwards it when the player route exists.
4. Production 2D art is authored as World 2 prompts:

   - `map.peggleLand`
   - `poi.pegglePavilion.exterior`
   - `poi.pegglePavilion.interior`
   - `peggle.spriteBoard`

   Generate with `python3 scripts/world2_assets/generate.py --asset map.peggleLand` (repeat for the others) after `OPENAI_API_KEY` is in the environment. Until parent qualification, iOS uses drawn stand-in art and the localhost board draws beads in code.

## Kid-safe contract

- No fail-shame screen. Replay is always allowed.
- Aim is clamped so the marble cannot fire backwards.
- Touches stay off close / pause chrome.
- No PopCap trademarks, owls, or "Fever!" copy in kid-facing UI.
- No cannons, guns, or casino chrome in the prompts.

## Verify

```sh
cd prototypes/peggle && npm run check
curl -s http://127.0.0.1:5174/api/catalog | jq .inspect
```

iOS launch flags: `-launchWorld2PeggleLand`, `-launchPlink`.

Soundtrack (temporary): Abbie's World on safari/lobby; Cheerful Dance and Blocks in the Game rotate on the board. Per-level original music is later.

Build order and the locked product (1v1 critter, tilt as a power-up, Phase A first): [PLINK-PLAN.md](./PLINK-PLAN.md). Prototype safari/clash helpers may still describe mixed waves — that is parked, not spec.
