# Real-world uploads become living scenes: architecture brief

Issue #608 (Evan's approved brief, 2026-10-24). **Status: proposed architecture. Nothing here is built.** Evan set aside
the earlier detailed UI, URL, storage, notification and frame-rate proposals, so none of them are requirements; where
this page names a mechanism it is a recommendation that reuses what exists. The experimental area's name is undecided
(this page calls it **the Workshop Yard** as a placeholder only).

## The brief in one sentence
A player sends photos, video or audio of their real life. The pipeline understands it, designs a charming scene around
it, builds it, and places it, alive, in their personal experimental space. They explore and refine it there. Nothing
joins the shared world until they give final approval.

## Design principles (from the canon)
1. **Scenes, not assets.** A scanned fridge becomes a welcoming kitchen with someone in it; a scanned playground becomes
   children at play. The unit of output is a *scene with life* (places, people, animals, light, sound), the fridge is
   just its anchor. This follows `VISION.md` (the Living Holodeck) and `docs/MODELER_VISION.md` (preserve creative
   intent so the experience can be rebuilt later).
2. **Intent is kept in the repo-shaped bundle, not in chat.** Every scene keeps its uploads, analysis, design brief,
   recipes, revisions and approvals (see "Scene bundle").
3. **Experimental first.** This is exactly the existing experimental rule (`?exp=<id>`, `simulations/game-registry.json`
   in `CLAUDE.md` invariants): unfinished work is reachable only by its owner; "live" requires a real scene and a passing
   headless-Chrome run. The personal space is the player-scale version of that gate.
4. **Show it the way the world would.** Progress is diegetic: a workshop with lights on, a crate arriving, a builder
   hammering, not a progress bar. Approval is a card or an object (a signed postcard, a ribbon to cut), per
   `docs/design/INTERACTION_GRAMMAR.md` (tiles create, cards act as a god, FPS plays) and the information grammar.
   Nothing fails; "not ready yet" is always an in-world answer.
5. **Kids and privacy first.** Real-life uploads can contain faces, homes and children. The rules already in
   `prototypes/ranch-atelier/dist/api/model-orders.js` apply and extend: PG check before anything is stored or forwarded,
   fail closed, never redraw, model or make a likeness of a real face, photos only fetchable by their owner, and a
   grown-up signs in (`ACCOUNTS.md`). Uploads never enter git or the feedback inbox (it is copied into the repo).

## Proposed flow

```
 Player (signed in) ── upload photo / video / audio
        │  1 INTAKE      guard, dedupe, store originals privately, make a "scene request"
        ▼
 2 ANALYSE      what is it, where does it belong, what mood, who lives here
        ▼
 3 DESIGN       scene brief: place, props, characters, animals, sound, light, a small story hook
        ▼
 4 BUILD        parts via the modeler pipeline, composed into a tile/scene
        ▼
 5 PLACE        appears in the player's experimental space, alive
        ▼
 6 REFINE       player explores, asks for changes (change orders), new versions
        ▼
 7 PROMOTE      final approval (player, then owner/curation) -> shared world
```

### 1. Intake
- Player-facing entry is the existing "Request more" pattern (`/models`, `POST /api/model-orders`: words plus an optional
  photo, stored at stage `concept`, owner-only fetch). Extend it to accept several photos, a short video and audio rather
  than inventing a second upload system.
- Storage: originals go to **Cloudflare R2** (the asset store, `docs/architecture/`), content-addressed under
  `models/blobs/<sha256>/` and kept in a per-account private prefix; small request records stay in the Ranch Blob store
  beside `model-orders/v1/`. Do not add a new store. (R2 write keys are not yet on the Ranch project; the model-store
  Action is still blocked on its secrets, see ARCHITECTURE.md section 5. This is a prerequisite and needs Evan.)
- Guard at the door: the existing PG vision check, extended to video (sampled frames) and audio (speech and music
  screening). Metadata (GPS, device, timestamps) is stripped; the exact location is never kept or used.
- Spending: the guard and any real-money model calls go through `lib/wallet.cjs` caps. Claude work runs on Evan's plan and
  is not counted (`ACCOUNTS.md`), so the build stage should prefer Claude for design and Blender work.

### 2. Analyse
- A multimodal pass produces `analysis.json`: subjects and materials, scale cues, setting (kitchen, playground, garage),
  mood and time of day, sounds heard (a kettle, laughter), and what is people versus objects. Video gives
  turnaround-style views and motion cues; audio gives ambience and rhythm to drive the scene's sound.
- Faces and identifying text are detected and set aside: used only to decide "a person is here", never reproduced.
- Output is tool-neutral and stored with the bundle so a better analyser can re-run it later.

### 3. Design
- Claude acts as art and scene director, using the existing studies and canon rather than free invention: `consult` in
  the Game Oracle (idea to rules, beats, style), the HUD and information grammar, `GAME_FEEL.md`, the place dialects
  (the Ranch speaks in wood, bells and painted signs; the Moonbase in lights and radio).
- Output is `scene-brief.json` plus concept art: the context (a fridge implies a kitchen, a family table, morning
  light), the cast (who is living here, drawn from the existing character kits), the small things that make it alive
  (a cat on the counter, a kettle about to whistle), and the sound palette.
- Concept art follows the modeler vision: Midjourney when Evan's Mac session is up, otherwise another image source or the
  player's own upload as the reference, with the source recorded. This is the missing "concept fallback" in
  `docs/MODELER_STATUS.md`, so the scene pipeline would force that gap closed.
- Sounds only from the catalogue (`sounds/manifest.json`) and voices only ElevenLabs designed voices, per the invariants.
  A player's own audio is *analysed* to choose catalogue sounds; it is not played back as-is unless the player keeps it as
  a private memory object.

### 4. Build
- Reuse the modeler: engineered geometry from a Blender Python recipe (`build.py`), named parts and role-named
  materials, scored by `harness.py` against the reference, exported through `to_game.py`. Granular character detail is
  modelled part by part (Evan's rule in MODELER_STATUS.md).
- The scene, not the asset, is the deliverable. Compose with the existing tile and scene system (tiles create the world),
  using the AI composition contract (`simulations/ai-composition-contract.mjs`, `api/ai-compose.js`) so layout, life and
  lighting come from one signal rather than hand placement.
- Every part and the composed scene write their outputs into one folder (the asset manifest v1 proposed in
  MODELER_STATUS.md next-step 1 is the natural home for it).
- Validation before placement: triangle budgets, scale and origin, an in-engine load test, and a headless run.

### 5. Place
- The result appears in the player's personal experimental space, a per-account world on top of the account save that
  already exists (`saves/v1/<id>.json` via `/api/me`). Arrival is diegetic (a delivery, a builder walking out), not a toast.
- Things in the space are real scenes with living characters. Per the two-layer rule, anything placed is fiction and the
  bots will react to it; all upload tooling, review labels and status live in the presentation layer only.
- Reachability follows the experimental rule: visible to the owner, never from abbies.world's public entry.

### 6. Refine
- The player explores and changes it by touching things (the one verb) or by asking in plain words. Each request is a
  **change order**: a new version with the request recorded and the old version kept (MODELER_VISION change-order stage;
  MODELER_STATUS next-step 5). History is never silently replaced.
- Unfinished is a first-class state. A scene may be half-built and still enjoyable: unbuilt parts render as honest
  placeholders in the world's own materials (a chalk outline, a covered crate), never as engine boxes.

### 7. Promote to the shared world
- Two keys, in order: **the player's final approval** ("show everyone"), then **curation** (the owner or a delegated
  review) because the shared world is everyone's and kids play there. Promotion re-runs the guard and the live gate:
  a real scene, a passing headless-Chrome end-to-end run, a `game-registry.json` entry and, for anything Evan can see,
  a `whats-new.json` entry with a tour decision.
- What is promoted is a copy with provenance. The private originals never travel; only the derived scene does, with
  faces and location already removed. The player can withdraw it.

## Scene bundle (what is kept per scene)
```
scenes/<account>/<scene-id>/vN/
  request.json      who, when, words, which uploads (hashes only)
  analysis.json     stage 2 output, with tool and version
  scene-brief.json  stage 3 output, cast, mood, sound palette, what was drawn on (context card)
  concept/          reference and concept images, source recorded
  parts/<part>/     build.py, notes.json, provenance.json, score, GLB
  scene.json        composition, in game tile format
  status.json       stage, validation results, approvals (player, curator)
```
Originals stay private in R2; the bundle refers to them by hash. This is the "bundled intent" of the modeler vision, per scene.

## Integration points (existing, to extend)
| Need | Existing piece | Extension |
|---|---|---|
| Sign-in, per-account state | `ACCOUNTS.md`, `api/auth`, `api/me`, `lib/account.cjs` | a scenes index per account |
| Upload, PG guard, owner-only photos | `api/model-orders.js` | video, audio, multi-photo; private R2 prefix |
| Asset storage | R2 `models/blobs/<sha256>/`, `tools/model-store` | per-account prefix; needs R2 keys on Ranch |
| Hand work to Claude | dispatch bridge, issue intake, `docs/dispatch/` | a "scene request" dispatch type; builds on branches, outputs to R2, not git |
| Modeling | `tools/model-challenge`, `ranch-rebuild`, `to_game.py` | scene-level recipe, asset manifest v1 |
| Composition | `ai-composition-contract.mjs`, `api/ai-compose.js` | upload-driven briefs |
| Experimental gate | `?exp=<id>`, `game-registry.json`, headless Chrome run | a personal space as an owner-scoped experiment |
| Spend control | `lib/wallet.cjs` | a price per analysis and guard call |
| Telling the player | "new version ready" card, push, `whats-new.json` | diegetic arrival first; the notification mechanism is deliberately left open |

## Open questions for Evan
1. **Name** of the personal space (undecided, placeholder above).
2. Is **curation** (owner reviews before the shared world) required for every promotion, or only for scenes with people in them?
3. Should the player be able to keep their **own audio or voice** as a private memory inside their space?
4. May R2 write keys be added to the Ranch Vercel project (and the GitHub secrets set), which unblocks every upload path?

## Suggested first slice (not started)
One photo of one object, signed in, through intake, analysis, a scene brief and a single composed room in a private space,
approved by the player only. It would prove the bundle and the gate; video, audio and promotion follow.
