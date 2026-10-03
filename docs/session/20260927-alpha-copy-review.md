# Marble Voyage + Home unlock — alpha copy review

**Date:** 2026-09-27  
**Branch reviewed:** `review/marble-voyage-plink` (working tree, uncommitted)  
**Audience:** First alpha, ages ~6–10  
**Reviewer:** Autonomous copy pass (Swift UI + PeglinEdition models + Voyage opening bundle + `prototypes/VoyagePrologue/web/rescue-cut.js`)

---

## 1. Executive verdict

**Ship with fixes** — tone and story framing are largely warm and on-brand; unlock flow and most fight/shop copy read well for kids. A small set of **developer-leak strings** would embarrass a first alpha if left unchanged (marble shop blurbs, world-switcher revision line, prologue missing-art fallback). Fix P0 items below before handing devices to playtesters; P1 polish strongly recommended for narrative consistency (Bramble vs summit goal) and Temper/readability.

---

## 2. P0 blockers (must fix before alpha)

| # | Location | Current | Suggested rewrite | Why |
|---|----------|---------|-------------------|-----|
| 1 | `Views/World2/Plink/Core/PhysicsTuning.swift` ~L30 (`OrbKind.sparkle.blurb`) | `Peglin default SO — e1 · g1.2 · no drag` | e.g. `Balanced starter marble — good on any trail.` | Kids see this in Bell Market, bag drawer, and any orb blurb UI; pure physics/dev jargon. |
| 2 | `Views/World2/World2WorldSwitcherView.swift` ~L124–127 | `rev \(revision)` | Remove from kid UI, or replace with nothing / soft “Updated” only in parent settings. | Reads as internal build metadata on every server world card. |
| 3 | `Resources/VoyageOpening.bundle/game.js` (image `onerror` handler, same in `prototypes/VoyagePrologue/web/rescue-cut.js`) | `ART STILL IN PRODUCTION` | e.g. `Picture loading…` or hide caption until art loads. | Visible if any bundled layer fails; screams unfinished to parents. |
| 4 | `Views/World2/Plink/Core/PhysicsTuning.swift` ~L67 (`OrbKind.zipbolt.blurb`) | `Huge force · low g · laserish` | e.g. `Fast zip — floats longer, shoots straight.` | “low g” / “laserish” are designer slang; same surfaces as #1. |

**P0 count: 4**

---

## 3. P1 polish (nice before alpha)

| Theme | Location | Current | Suggested rewrite |
|-------|----------|---------|-------------------|
| Story goal mismatch | `Models/World2/PeglinEdition/MarbleVoyageModels.swift` ~L20 (`MarbleVoyageMode.campaign` subtitle) | `Climb · rescue spirits · free Bizarro` | Align with opening comic: e.g. `Climb · rescue friends · reach the summit` (keep Bizarro as boss name on summit node, not campaign tagline). |
| Friend naming | `Models/World2/PeglinEdition/PeglinCharacterArt.swift` ~L65 (`brambleSpirit.shortName`) | `Hare` | `Bramble` (or `Bramble Hare`) to match prologue and `versusBlurb` “clover-hare”. |
| Prologue vs campaign | Opening `game.js` / `rescue-cut.js` outro | `Let's rescue\nBramble!` vs campaign summit `Bizarro Abbie` | Add one kid line on title or first climb beat: e.g. “Raze took Bramble up the mountain — Abbie climbs to get him back.” (Design/narrative, not just wording.) |
| Difficulty label | `Views/World2/WorldBookUnlockHostView.swift` ~L167 | Button `Stance` | `Pieces` or `Difficulty` (matches sheet content). |
| Difficulty name | `Models/World2/WorldBookPuzzleModels.swift` ~L89 | `Trail Scrap` | `Normal trail` or `Regular path` — “scrap” collides with climb node names (`Trail scrap`, shop “scrap a marble”). |
| Climb node names | `MarbleVoyageModels.swift` ~L924–928 | `Trail scrap`, `Bridge scrap`, … | `Trail fight`, `Bridge battle`, or place names without “scrap”. |
| Hidden tutorial line | `MarbleVoyageModels.swift` ~L1053 (`makeCampaign` initial `lastEventLine`) | `Fight for gold & XP — or take the gift and skip the XP.` | Kid line: e.g. `Fight for coins and strength — or take the gift path.` (Avoid “XP” unless UI explains it elsewhere.) |
| Defeat helper | `MarbleVoyageHostView.swift` ~L483 default defeat body | `No free heals — only spells and finds restore HP.` | Match shop/blessing vocabulary: e.g. `Hearts only come back at Bell Market and blessing stops.` |
| Title tagline | `MarbleVoyageHostView.swift` ~L1335 | `Chart your voyage · plink the spirits · heal only from blessings` | Consider capitalizing **Plink** as the game name: `… · Plink the spirits · …` |
| Stats jargon | `MarbleVoyageHostView.swift` ~L915 | `Level N · ×1.05 dmg` | `Level N · hits a little harder` or drop multiplier decimals. |
| Climb reveal | `MarbleVoyageHostView.swift` ~L1030–1031 | `ATK`, `THREAT` | `HIT`, `TOUGH` or `POWER`, `TRICKY` |
| Bullies (tone check) | Prologue captions | `“Game’s over.”` | OK for story beat; optional soften to `“Playtime’s over.”` if testers flag meanness. |
| World summary | `Models/World2/WorldModels.swift` ~L54 | `Climb, fight, and voyage — unlocks from Abbie's World` | `Climb, Plink fights, and rescue — unlock from the book at home.` (Clearer for locked switcher card.) |
| Unlock toast | `ViewModels/World2ViewModel.swift` ~L1117 | `Puzzle solved — Marble Voyage unlocked!` | Fine; optional shorter toast: `Marble Voyage unlocked!` |

---

## 4. P2 later

- **Temper onboarding:** `PlinkTemper.swift` labels (`Strong` / `Soft` / `Brawl`) are correct but assume one tutorial beat; tips in `PlinkAttackerKind.battleTip` help but are long for struggling readers.
- **Charm names:** `Sock Snatch`, `Prism Burst` — playful; fine for alpha; revisit if parents want less silliness.
- **Status sheet footnote:** `MarbleVoyageChrome.swift` ~L167 — accurate but adult (“signed in”, “this iPad”); OK for alpha, simplify later.
- **Heart icon picker:** `PlinkBattleHostView.swift` ~L3385 `Name this heart` — cutesy; clarify as “Pick your heart icon” if surfaced in voyage.
- **Plink Pavilion** (`PlinkMinigameView.swift`) — separate pink/blue duel copy; out of main voyage path but fine if still reachable from Peglin hub.
- **Trophy / title center:** `MarbleVoyageTitleAtmosphere.swift` — “Auto-slide unlocked” is clear for collectors; low traffic for first alpha.
- **Gang copy intensity:** Vix “sharper teeth”, Raze “laughs louder” — within cartoon villain range; tune if Evan wants softer bullies throughout.

---

## 5. Copy table (actionable rows)

Paths are repo-relative from `abbies.world.ios/abbies.world.ios/`.

| File:line (near) | Current string | Suggested rewrite | Priority |
|------------------|----------------|-------------------|----------|
| `Views/World2/Plink/Core/PhysicsTuning.swift:30` | `Peglin default SO — e1 · g1.2 · no drag` | Kid blurb for Sparkle (see P0) | P0 |
| `Views/World2/Plink/Core/PhysicsTuning.swift:67` | `Huge force · low g · laserish` | Kid blurb for Zipbolt (see P0) | P0 |
| `Views/World2/World2WorldSwitcherView.swift:125` | `rev \(revision)` | Omit or non-dev label | P0 |
| `Resources/VoyageOpening.bundle/game.js` (onerror) | `ART STILL IN PRODUCTION` | Soft loading / retry copy | P0 |
| `prototypes/VoyagePrologue/web/rescue-cut.js` (onerror) | same | Keep in sync with bundle | P0 |
| `Models/World2/PeglinEdition/MarbleVoyageModels.swift:20` | `Climb · rescue spirits · free Bizarro` | Bramble/rescue-aligned campaign subtitle | P1 |
| `Models/World2/PeglinEdition/PeglinCharacterArt.swift:65` | shortName `Hare` | `Bramble` | P1 |
| `Models/World2/WorldBookPuzzleModels.swift:89` | `Trail Scrap` | Avoid “scrap” collision | P1 |
| `Views/World2/WorldBookUnlockHostView.swift:167` | `Stance` | `Difficulty` | P1 |
| `Models/World2/PeglinEdition/MarbleVoyageModels.swift:925-927` | `Trail scrap`, etc. | Rename fights (no “scrap”) | P1 |
| `Models/World2/PeglinEdition/MarbleVoyageModels.swift:1053` | `Fight for gold & XP — or take the gift and skip the XP.` | Remove “XP” for kids | P1 |
| `Views/World2/Plink/MarbleVoyageHostView.swift:483` | `No free heals — only spells and finds restore HP.` | Bell Market / blessings wording | P1 |
| `Views/World2/Plink/MarbleVoyageHostView.swift:915` | `… dmg` | Plain language damage hint | P1 |
| `Views/World2/Plink/MarbleVoyageHostView.swift:1030-1031` | `ATK`, `THREAT` | Kid stat labels | P1 |
| `ViewModels/World2ViewModel.swift:94` | `Locked — find the messy book in Abbie's Cozy Nook and finish the puzzle.` | OK; optional shorten | — |
| `Views/World2/PlayerHomeView.swift:1278` | `Messy book!` / `Voyage book` | OK | — |
| `ViewModels/World2ViewModel.swift:1117` | `Puzzle solved — Marble Voyage unlocked!` | OK | — |
| `Views/World2/VoyageOpeningView.swift:40` | `The story couldn’t load.` | OK | — |
| `Views/World2/VoyageOpeningView.swift:30` | `Skip intro` | OK | — |
| `Views/World2/WorldBookUnlockHostView.swift:191` | `Fit matching edges — they spark and join.` | OK | — |
| `Views/World2/WorldBookUnlockHostView.swift:336-339` | `Marble Voyage unlocked` / `The picture opens the climb.` | OK | — |
| `Views/World2/Plink/MarbleVoyageShopView.swift:108-111` | `Bell Market` / `Spend before the next climb` | OK | — |
| `Views/World2/Plink/MarbleVoyageShopView.swift:574` | `Not enough coins yet.` | OK | — |
| `Models/World2/PeglinEdition/PlinkTemper.swift:48-50` | `Strong` / `Okay` / `Soft` | OK for alpha | — |
| `Models/World2/PeglinEdition/PlinkAttackerKind.swift:151-185` | Temper battle tips | OK; long — trim in P2 | — |
| `Models/World2/PeglinEdition/PeglinCharacterArt.swift:113-119` | versus blurbs | OK | — |
| `Resources/VoyageOpening.bundle/game.js` (shots) | `“Game’s over.”`, `“Abbie!”`, `Fox is free!`, `“Now for Bramble!”` | OK; names consistent | — |
| `Views/World2/Plink/PlinkBattleHostView.swift:599` | `Cage … · Free the \(friend) · You … HP` | OK | — |
| `Views/World2/Plink/PlinkBattleHostView.swift:527` | `Rescue the friend!` | OK | — |
| `Views/World2/Plink/MarbleVoyageHostView.swift:472-481` | `Campaign Clear!` / `Voyage Lost` / etc. | OK | — |

---

## 6. What reads well (no change needed)

- **Home → book:** `Messy book!`, accessibility hint, Cozy Nook unlock hint on locked Marble Voyage card.
- **World book flow:** destination titles/blurbs (`Glowing Clearing`, `Sky Bridge`, …), victory copy, replay overlay.
- **Opening comic:** chapter titles (`Together`, `Meet Abbie`, `The rescue begins`), captions, warm/resolve moods; bully beat is brief.
- **Bell Market:** `Bell Balm`, shelf empty lines, bag/scrap hints (once marble blurbs fixed).
- **Rescue mood:** `PeglinRescueMood` (`Almost free`, `Breaking free!`).
- **Cast cards:** Raze/Vix/Morrow names and blurbs match conflict art; henchman tips reference real marble names (`Puff`, `Pebble`, …).
- **Charms:** short blurbs in `MarbleVoyageCharm.swift` are kid-clear.

---

## 7. Inventory count

| Metric | Count |
|--------|------:|
| Source files in scope (Swift + opening JS + prologue JS) | **53** |
| String literals scanned (heuristic: `Text(`, `return "`, `title:`/`blurb:`/`message:`, toasts, comic `words:`) | **~721** occurrences |
| **Distinct user-facing text values** (deduped) | **~678** |

Heuristic excludes most accessibility IDs, semantic asset keys, and SF Symbol names. Manual review focused on strings that render in UI, toasts, climb chart labels, events, shop, opening captions, and unlock flow.

---

## 8. Suggested fix order for Evan

1. Rewrite **Sparkle** + **Zipbolt** blurbs in `PhysicsTuning.swift` (5 minutes, high visibility).
2. Remove **`rev`** line from `World2WorldSwitcherView.swift`.
3. Softening **prologue missing-art** string in bundled `game.js` (+ sync `rescue-cut.js`).
4. One narrative pass: campaign subtitle + Bramble short name (optional before alpha if time).
5. Batch P1 jargon (`XP`, `scrap` nodes, `ATK`/`THREAT`, defeat “spells”) in a single copy commit.

---

*End of review.*
