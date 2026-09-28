# Voyage intro + skill-ladder sim (2026-09-27)

## Intro (ChatGPT / Codex comic → live gate)

Codex delivered `prototypes/VoyagePrologue/` + packager `scripts/package_voyage_opening.py` → `Resources/VoyageOpening.bundle`.

Live path (already on this branch’s working tree):

1. World book puzzle completes → `unlockMarbleVoyage` + `enterUnlockedMarbleVoyage`
2. `VoyageOpeningView` full-screen comic (first view: no skip; later: Skip intro)
3. Finish → `arriveInUnlockedMarbleVoyage` (Marble Voyage shell)

Launch args for simulator / UITest:

| Arg | Effect |
| --- | --- |
| `-world2AutoCompleteVoyageOpening` | Gate appears, then auto-completes (~0.6s) — awards watched milestone |
| `-world2SkipVoyageOpening` | Bypass comic entirely (smoke / capture) |

UITests: `testWorldBookUnlockAutoEntersMarbleVoyage`, `testWorldBookUnlockCanSkipOpeningForSmoke`.

## Skill ladder (campaign Monte Carlo)

Player bands in `MarbleVoyageCampaignSim.PlayerType`:

| Band | Meaning |
| --- | --- |
| `uninterested` | Wild aim, whim shop, no Temper, no power salvage → lose |
| `hitPegs` | Aims for pegs, heal/upgrade, ignores Temper → clears **Normal** |
| `metaAware` | Pegs + Temper/map/shop → clears **Hard** |

`CampaignDifficulty.normal` / `.hard` scales Temper Soft/Strong, bite, drain, and outbound damage.

Run:

```bash
./scripts/run_voyage_player_protocol.sh
# or:
# -only-testing:…/MarbleVoyageCampaignSimTests/testSkillLadderClearBands
```

Latest matrix (48 trials, production map, seed 41):

| | Uninterested | Hit pegs | Meta-aware |
| --- | --- | --- | --- |
| **Normal** | 0% | ~58% | ~60% |
| **Hard** | 0% | ~4% | ~56% |

**Note:** Difficulty scaling is in the **headless campaign sim** today. Live Voyage does not yet expose a Normal/Hard picker — next wedge if Evan wants kids to choose Hard in-app.
