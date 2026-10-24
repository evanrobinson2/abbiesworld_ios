# Assimilate and the title/Create New studies (issue #612)

> **Update 2026-10-24 (#622):** Assimilate is now **Capture** and Sandbox is **Design**; the first-class vision, sharing rules (shared by default, private is paid) and tiers are in `LIVING_TOY_WORLD.md`. The browser-local yard below is a draft and is superseded by those rules.

Follows #608 (`REAL_WORLD_SCENES.md`) and #610/#611 (intro readiness). Status key: **Built** (in this PR, drafted), **Study** (words only, nothing drawn), **Not built**.

## Built: Assimilate prototype (experimental, `?exp=assimilate`)
- Page `studies/assimilate/index.html`, planner contract and layout `simulations/assimilate.mjs`, endpoint `api/assimilate.js`, test `tests/assimilate.test.cjs` (`node prototypes/ranch-atelier/tests/assimilate.test.cjs`). Registry id `assimilate`, `tour: false`.
- Flow: upload notice (tick to accept) → photo (camera or library, re-encoded in the browser, which drops location/device metadata) and/or words → sign-in and spend cap → **screen** → **plan** (AI Gateway, `openai/gpt-6-luna`, same gateway as `model-orders.js`) → one hex tile of catalogue props around a **stand-in marker** for the shown object → "Keep in my yard" (this device only).
- Reuses: `lib/account.cjs`, `lib/wallet.cjs`, the PG-guard pattern of `model-orders.js`. No new store. Nothing is written to Blob, R2, logs or git; the photo exists only inside the request.
- Tested: the API with a mocked gateway (accept, sexual/nude/unsafe reject, child held, uncertain held, unreadable screen fails closed, video/audio refused, consent, sign-in, cap, planner failure; rejected input never reaches the planner), and the page in headless Chromium with a mocked API (closed without `?exp`, consent required, tile drawn, keep works, no page errors). **Not tested against the live gateway** (no credentials here): the real screening quality is unverified.

## Not built, said plainly
- **Video and audio**: no cloud service exists. The earlier chat produced local frame sampling and rough transcripts only. The API answers 501 and the page shows both buttons as "not ready yet". Evan's wish (a cloud process that builds the object and a scene around it) is **an incomplete requirement**. Next: sampled frames through the same screen, speech to text on the words path, then the modeler (`tools/model-challenge`) for the object.
- **Rebuilding the object**: the centre of the tile is a labelled stand-in, `anchor.built: false`. Props are flat shapes, not tile meshes.
- **Personal yard** is browser-local. Server-side yard, player approval and curation before the shared world (#608 steps 5–7) are not built; "Show everyone" is a disabled button.
- Retention: the gateway's data-retention setting must be checked in the Vercel dashboard; this PR claims no zero-retention. Moderation sees the bytes, so "screened before any processing" is not claimed.

## Content rules as implemented
Sexual, nude or not-PG: rejected, nothing kept. Possible child in a photo: **held, not generated**, as a conservative stand-in. The screen is a blunt age guess and is not a child-photo ban. **Question for Evan:** is the rule "reject all photos of children" (which conflicts with the child-gameplay feedback trial) or "no likeness of any real person, children welcome as scenery of a place"? Held until decided; broad public ingestion stays off (the page is experimental). The upload notice is plain text for review; it assigns responsibility to the uploader and does not claim to remove liability. It needs legal review. Video frames and audio are not accepted, so their screening is unimplemented rather than assumed.

## Studies (words; nothing drawn yet)
**Intro** (preserve the mystery): flickering spotlight, hovering backpack, tunable zip-zaps, one trinket in a focused burst, then chaotic bursts for the full set, no text. The player plays while loading; a subtle cue (the spotlight steadies) shows readiness. #611 already makes readiness mean real scene readiness; the cue should hang off that same signal. Not built.
**Title**: left navigation, right floating city card plus picker; default is the loaded city, shows how many cities exist, last option Create New. Test the picker's affordance with 3–5 people before settling the look. Not built.
**Create New**: two choices, Sandbox and Assimilate. Compare icon-first (camera for Assimilate, a tile stack for Sandbox), icon plus label, and label only; pick by whether a first-time player can say what each does unprompted. Not built.
**Sandbox**: OmniTile placement, a rerollable parameterised topology. A coherent small footprint: a hex of radius 2 is 19 tiles; five wide across the middle row is the radius-2 hex, so **19 tiles**. Evan's "about fifteen" is approximate, so 19 is the proposal. Not built.

## Handoff
Winchester entry link: nothing in this PR is deployed. Merged work ships in the next deploy batch (`docs/architecture/DEPLOYS.md`), and the page is reachable at `/studies/assimilate/index.html?exp=assimilate` once deployed. Readiness for the park trial: **drafted, not production-ready**; needs a live-gateway run and the decisions above.
