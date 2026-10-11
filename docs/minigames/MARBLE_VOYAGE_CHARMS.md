# Marble Voyage — Charms (Peglin relic roles)

Peglin rule: **orbs act · relics rewrite rules**
(`prototypes/PlinkCore/PEGLIN_KNOWLEDGE_MAP.md`, [peglin.wiki.gg Relics](https://peglin.wiki.gg/wiki/Category:Relics)).

Marble Voyage **charms** are kid-facing permanent stacks sold after every fight.
They map to Peglin relic *categories / roles*, not Peglin names or art.

Art: IngredientKit enamel medallions (`ench_*`) — library status **shipped**, DAG parent_gate ok.

## Catalog

| Charm | Asset | Peglin role | Peglin exemplars (inspiration) | Stack effect | Base $ |
|---|---|---|---|---|---|
| **Bloom** | `ench_grows_flowers` | healing | An Apple A Day, Gardener's Gloves | Shop heal +5% max HP | 35 |
| **Hover** | `ench_floats_an_inch` | utility_bounce | Super Boots / high-bounce feel | Ball keeps speed between pegs | 35 |
| **Prism Burst** | `ench_burps_rainbows` | peg_damage | Adventurine | +1 cage dmg on orange streak ≥5 | 40 |
| **Moon Gleam** | `ench_glows_at_night` | gold | Molten Gold | Gold peg value +10% | 40 |
| **Cycle** | `ench_changes_colour` | crit_refresh_board | Lucky Penny, Strange Brew | +1 crit/refresh peg on board | 35 |
| **Soft Purr** | `ench_purrs_when_you_sit` | defensive | Round Guard, Refreshield | −1 bite damage | 40 |
| **Lullaby** | `ench_sings_lullabies` | status_debuff | Roundrel status space | Foe ATK −1 (min 1) | 40 |
| **Sock Snatch** | `ench_hides_your_socks` | bomb_payout | Short Fuse / bomb relics | +3 coins on bomb clear | 30 |

Shop also sells **Heal** (20% max HP, base 25) and **Ball upgrade** (base 25). Each purchase in a visit ×1.25; prices reset next visit.

## Economy (from sims)

Recommended gold pegs: **15% prevalence** (~5/34 board), **value 6**. See evidence under `docs/minigames/evidence/`.

Charms at 30–40 are **save-up** prizes under sustain play (~29 coin/fight ≈ one heal or upgrade).

## Run record

Every live run and every simulation writes / carries a `MarbleVoyageRunRecord` (schema v1):

- seed, economy tunables, gang snapshot
- charm stacks, coins, ball level, HP
- path, fight rows (gold earned, pegs lit, rounds, outcome)
- shop rows (offers, purchases, wallets)
- outcome

Code: `MarbleVoyageCharm.swift`, `MarbleVoyageRunRecord.swift`.  
Sim emitter: `scripts/plink_gold_economy_sim.py --evidence`.
