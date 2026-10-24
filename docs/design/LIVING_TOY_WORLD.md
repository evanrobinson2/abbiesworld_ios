# The living toy world (consolidated vision, issue #622)

Evan, 2026-10-24: "Dispatch all of this as vision to abbies repo." This is the canonical product vision for arrival,
Capture, collections, the personal home, arcade games and sharing. It sits under `VISION.md` and above the individual
studies. Status of what is built stays in the study docs, not here.

Every item is marked **Direction** (Evan said it), **Proposal** (a suggestion that may change) or **Not built**.
Implementation scopes and Evan's study feedback gates remain in force. Do not standardise unreviewed mock choices.

## 1. The toy that comes alive
**Direction.** New things arrive in toy boxes or fitting toy packaging. The player unpacks them, then they come alive in
the world. This is one arrival experience for cars, characters, accessories, captured creations, buildings and playsets,
not a racing-reward animation.

Arrival → unpack → reveal → come alive → play.

- **Direction:** illustrated backing cards, clear display windows, fitted compartments, themed sets and collectible
  presentation, informed by Evan's reference photos (see §11). Tactile, charming, part of the world.
- **Direction:** start with the earned-car reward flow, then make the pattern reusable.
- **Direction:** packaging does not imply paid random prizes.
- **Proposal** (illustrating the principle, keep room to iterate): a car revs and rolls out, a character stretches and
  waves, a house lights up and becomes inhabited.
- Grammar: the box is diegetic (the characters know it); a tactile tear/pop is meta. See `INTERACTION_GRAMMAR.md`.

## 2. Real-world inspiration becomes living scenes
**Direction.** People give photos, images, video, audio, speech/descriptions or text. Cloud processing interprets it,
tries to build the referenced object, and creates a charming scene around it (a fridge in a welcoming kitchen; a
playground with children playing). Creations get context, activity and personality. Inputs are inspiration, not
necessarily literal reconstruction targets. Video and audio are requested capabilities and are not dropped.

| Capability | Today |
|---|---|
| Photo or words → one hex tile of catalogue props around a stand-in marker | **Built, drafted**, experimental `?exp=assimilate` (`ASSIMILATE.md`) |
| Screening before the planner | Built, tested with a mocked gateway only |
| Video and audio cloud processing | **Not built.** The API answers 501. Earlier local frame/audio extraction and rough transcripts were never a deployed service |
| Rebuilding the referenced object | **Not built.** The centre is a labelled stand-in; props are flat shapes |
| Composed real 3D scene, server-side persistence | **Not built** (`REAL_WORLD_SCENES.md` steps 2-7) |

## 3. Create New: Design and Capture
Names are **Direction**: **Design** (formerly Sandbox) and **Capture** (formerly Assimilate). Code, files and routes
may keep the old names until renamed deliberately.

- **Design:** OmniTile placement, parameterised and rerollable topology, a small footprint of roughly five tiles wide.
  Evan did not settle the count; the 19-tile radius-2 hex is a **Proposal**.
- **Capture:** real-world input becomes a modeled object and a contextual scene. First scope is one tile, extensible later.
  Phases: Intake → Prepare → Build → Review.
- **Quality tiers (Direction):** Study, Indie, Pro. Default is a quick, inexpensive Study. Users review, reorder/refine
  and upgrade while keeping the source inspiration and prior work. A time/cost preview is a **Proposal**, not built.
- **Normalise before play (Direction):** scale, placement, collision and a description of how the object interacts with
  simulations, before it enters playable systems. A low-detail Study still obeys the game contracts.
- **Biome:** start with basic biome classification; later several selectable facets.

## 4. Acceptance, sharing and ownership
**Direction (latest, supersedes earlier assumptions).**
- Unfinished creations are explored and refined in the creator's experimental area. Its name is undecided.
- Once accepted, a creation joins the creator's world **and the shared world by default**. Keeping it private is a paid option.
- The sharing consequence must be clear **before** acceptance.
- Derived accepted creations are distinct from raw source photos, video and audio. Raw sources stay private.
- Existing private content and raw uploads are never retroactively published.
- No extra approval roles are settled. Curation in `REAL_WORLD_SCENES.md` §7 is a Proposal and an open question, not a decision.

**Superseded:** the "private by default; two keys, final approval then curation" assumption in `REAL_WORLD_SCENES.md`
and the "Show everyone" disabled button / browser-local yard in `ASSIMILATE.md`. Those docs now point here.
**Not built:** accept flow, paid private option, shared-world publication. Price of private is undecided.

## 5. World Browser
**Direction.** From the default world a player enters a World Browser to discover creations, preview them and bring them
into their own world. It shows basic biome and meaningful behaviour/simulation descriptions. Private creations are
owner-only. Later: faceted multiselect discovery. Owner: #617 (low-fidelity study at `/study/world-browser`).

## 6. Player and signature home
**Direction.** A charming, recognisable personal home where the backpack, trophies/earned charms and accessories are real
interactive objects. Reference: open-front miniature playset rooms, distinct personal themes, useful furniture, a few
signature possessions; rooms may later connect into a larger world. The player and possessions must read together on a
phone. **Proposal:** backpack hook/stand, trophy shelf, accessory nook. Owner: #619 (`/study/player-home`).

## 7. First-class arcade games
**Direction.** The skate-park toy-car coaster becomes a complete arcade rail racer, after the feeling of stepping into
an arcade at Launch in Woburn (Evan's experiential analogy, not a claim about a specific machine).

Enter → invitation/challenge → choose car → learn/countdown → race → scoreboard/results → achievement → wrapped prize →
unwrap → unbox → garage → replay/return.

- **Direction:** earn collectible cars through racing achievements including times; differences are mostly cosmetic;
  an earned car is usable in later races. Collection and unboxing are tangible. Reward systems integrate with
  trophies, backpack and home, not a disconnected system. Stage 1 shows the whole experience, not only the ride.
- **Technical finding (verified on main):** `studies/coaster/index.html` stretches every ride to exactly 30.0 s
  ("exactly 30 seconds"). A meaningful time trial needs real, player-influenced completion times. Keep the race clock
  separate from cinematic slow motion, and label playable skill versus mocked outcome screens.
- **Proposal, to be tested:** small skill inputs such as lane and boost timing.
- **Process:** after Evan reviews this first arcade study, fold the validated approach into minigame production:
  invitation, learning, play, feedback, results, rewards, persistence, replay, return. Until then nothing from it is
  canon. Owner: #621. At the time of writing its work is not on `main`.

## 8. Intro, title and Create New
**Direction.** Keep the opening's charm, wonder and mystery.
- Intro study: flickering spotlight, hovering backpack, subtle tunable zip-zaps, one close trinket materialising in a
  focused burst, then the full set; no descriptions. The player may interact while preparing; readiness is signalled
  subtly; then they advance.
- Title study: left navigation, floating city card on the right, city picker defaulting to the loaded city, city count,
  Create New as the last choice. Compare icon-first against labelled Design/Capture.
- The actual world must be ready before its reveal, not only shader-compiled. #610 fixed part of this. **Unverified**
  on a phone and on the live deployment; closing the issue is not proof of smoothness.
- Proof requested for the revision: a working Winchester entry link. Routing and casing are to be verified, not assumed.

## 9. Learning from play footage
**Direction.** Evan's two videos of Abbie playing a favourite game are the first trial of media → evidence → improvement
briefs. Keep timestamped observations, separate observed behaviour from inferred motivation, and tie hypotheses to real
code before changing anything. The review found fluent tray/canvas switching and contextual activities. Expert
fluency is not proof a first-time player can discover it.

Evan's principle for teaching: a friend has a need, the player learns by helping, the friend's happiness rewards the
action, and a next invitation teaches another mechanic. **Not built:** an ongoing feedback-analysis process; do not
claim one exists.

## 10. Study and delivery rules
Stage 1 low-fidelity interactive study → Evan's feedback → high-fidelity refinement → game-ready refinement.
A study is done when it is viewable and verified at **https://abbies.world/study/**. Documents, merged PRs and
undeployed source are not completion. Report working links, screenshots, real verification, and what is mock versus
production. Phone-first and charming throughout.

## 11. Content handling
Evan prohibits sexual content. Screen before durable storage, modeling or generation. Moderation necessarily processes
the input, so never promise "never touched" or zero liability, never invent retention guarantees, and never present a
notice as verified legal protection.

**Unresolved (kept open, not decided here):** how far the child-photo restriction reaches, given the separately
authorised child-gameplay analysis. Today photos with a possible child are *held*, a conservative stand-in
(`ASSIMILATE.md`). Rule A: reject all photos of children. Rule B: no real-person likeness, children welcome as scenery.

## 12. Workstreams and references
| Topic | Owner / doc |
|---|---|
| Real-world scene architecture | #608, `REAL_WORLD_SCENES.md` |
| Intro readiness | #610 |
| Capture, intro, title, Create New | #612, #614, `ASSIMILATE.md`, `/study/` |
| World Browser | #617 |
| Signature home | #619 |
| Arcade racer and unboxing | #621, `docs/oracle/coaster/COASTER_STUDY.md` |

Reference material lives on Evan's PC, not in this repo, and has not been inspected for this document. Roots (under
`C:\Users\Evan Robinson\.codex\codex-remote-attachments\01a16e2c-850c-7671-b68c-6d33a5fd1d64\`):
home/playset photos `DC8A6A73-...`; racer/collectible photos `67CF854D-...` (1-8); toy-box photos `548F463A-...` (1-10:
windowed rescue sets, open-front fire/tow packaging, compartmented gold sets, paired monster trucks, kart multipacks,
illustrated blister cards, vertical multi-car trays). Video analysis: `Documents\Codex\2026-10-24\new-realtime-voice-chat\drops\`.
Local Oracle: `OneDrive\Documents\ChatGPT\Abbie's Overland Map Generator\oracle` (prior racing retrieval was weak; see #621).
Reaching these needs a PC agent; a Windows path alone is not cloud access. The source media is not republished here.

## Open decisions for Evan
1. Child-photo rule (§11).
2. Name of the experimental area (§4).
3. Price and terms of keeping a creation private (§4).
4. Whether curation applies to any shared promotion (§4).
5. Design footprint: 19 tiles or another count (§3).
6. Which tier thresholds and costs define Study, Indie, Pro (§3).
