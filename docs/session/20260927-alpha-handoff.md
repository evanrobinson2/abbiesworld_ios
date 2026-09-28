# Marble Voyage — first alpha handoff (2026-09-27)

**Branch:** `review/marble-voyage-plink` @ `1e41482` + large uncommitted working tree  
**Verdict:** **Ship-with-fixes** for household alpha playtest. Tuning ladder holds; intro + Trail scrap playthrough work on simulator; asset stills + copy review landed.

---

## Tuning sanity (external / multi-seed)

`testSkillLadderStableAcrossSeeds` — 5 seeds × 24 trials, production map.

| | Uninterested | Hit pegs | Meta-aware |
| --- | --- | --- | --- |
| **Normal (mean)** | **0%** | **65%** | ~60% |
| **Hard (mean)** | **0%** | **1%** | **58%** |

Ladder shape is stable (not a single lucky seed).  
**Caveat:** Normal/Hard difficulty is still **sim-only** — live Voyage does not yet expose a Hard picker.

Re-run: `./scripts/run_voyage_player_protocol.sh`

---

## Computer playthrough (simulator)

UITest `MarbleVoyageAlphaPlaythroughUITests/testTrailScrapFightFiresAMarble` on **iPad mini (A17 Pro)**:

1. Launched `-launchMarbleVoyage -world2SkipAuth -marbleVoyageDebugFight`
2. Versus → live board → aim trackpad drag → marble flight
3. Porcupine HP moved **12 → 11** after first shot (damage confirmed)

Stills: `artifacts/alpha-playthrough-2026-09-27/`

| Shot | What |
| --- | --- |
| `01-battle-open.png` | Versus card (Porcupine × 22) |
| `03-aim-ready.png` | Aim pad + board |
| `04-after-shot.png` | Post-shot (HP tick) |
| `05-second-shot.png` | Second aim |

**Playtest watch:** first fight chrome says **Foe 1 of 22** — confirm that’s intentional wave size for alpha (feels huge for Trail scrap).

Also fixed VoiceOver/XCTest flattening: `MarbleVoyageRootView` now `.accessibilityElement(children: .contain)`.

---

## Asset review worker

Folder: `artifacts/alpha-asset-review-2026-09-27/`  
Index: `artifacts/alpha-asset-review-2026-09-27/INDEX.md`

- Stage stills: title, chart, fight, shop, event  
- **Home/unlock stills (follow-up):** `home-unlock-stills/` — treehouse, book picker, opening comic, voyage title, home map  
- Catalog plates + opening-bundle copies  
- Raw capture stamps: `artifacts/voyage-capture/20260927T201101Z/`, `…T201220Z/`

---

## Copy review worker

Doc: `docs/session/20260927-alpha-copy-review.md`  
Verdict: **ship with fixes** · **4 P0** (now applied in working tree):

1. Sparkle / Zipbolt (and sibling) marble blurbs — kid language  
2. World switcher `rev N` removed from kid cards  
3. Prologue missing-art → `Picture loading…` (source + rebundled)  
4. (covered with #1)

P1 still open (story goal Bramble vs Bizarro, “Trail scrap” naming, Temper onboarding, etc.) — see copy doc.

---

## Alpha checklist

- [x] Intro gate + skip path (prior session)
- [x] Skill ladder multi-seed sanity
- [x] Live fight playthrough + screenshots
- [x] Asset still pack for Evan review
- [x] Copy review + P0 fixes
- [ ] Evan visual pass on `artifacts/alpha-asset-review-2026-09-27/`
- [ ] Evan decide: commit WIP? Hard difficulty in live UI?
- [ ] Confirm “Foe 1 of 22” on first scrap

Stage stills reminder: `./scripts/build_marble_voyage.sh --capture` if you want a fresh matrix after rebuild.
