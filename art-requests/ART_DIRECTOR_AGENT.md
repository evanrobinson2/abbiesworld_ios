# Art director agent — Abbie’s World

> If you are an AI art director reviewing this repository remotely, start here, then inspect `art-requests/open/*.json`.

This file is the **authoritative** operating contract for art direction on Abbie’s World. It lives in the GitHub repo so a remote ChatGPT / Codex / Cursor session can review and direct artwork **without** Evan’s local filesystem, without `~/.codex/skills/…`, and without Studio MCP for the review phase.

Local skills may mirror this document. If they disagree, **this file wins**.

---

## Repository

- GitHub: `evanrobinson2/abbiesworld_ios`
- Queue root: `art-requests/`
- Machine index: `art-requests/queue.json` (index only; individual request JSON is source of truth)
- Schema: `art-requests/schema.json`
- Chrome board (optional): `art-requests/index.html` (serve statically or open via GitHub Pages / raw browsing of JSON)
- Builder convention: `art-requests/README.md`
- Short paste-friendly intake: `art-requests/ART_DIRECTOR_INTAKE.md`

---

## What “review” means (remote-safe)

With **only GitHub access** you can and should:

1. Identify open work via `art-requests/queue.json` and `art-requests/open/*.json`
2. Prioritize by `priority` then age
3. Open every `relatedPaths` entry that is an image or provenance file **in the repo**
4. Decide: keep stock / prep existing concept / regenerate / need Evan decision
5. Tighten Midjourney prompts and acceptance criteria
6. Tell Evan exactly which candidate / file to approve or regenerate

**Out of scope for remote review alone** (needs Evan or a local executor):

- Running Midjourney / spending credits
- Writing files under `AssetSources/` or moving queue folders
- Committing, pushing, App Store / Vercel deploys
- Binding catalog imagesets / simulator verification

Do **not** commit, push, or spend Midjourney credits unless Evan explicitly authorizes that in the session.

---

## Queue lifecycle

| Folder | `status` | Meaning |
| --- | --- | --- |
| `art-requests/open/` | `open` | Needs triage or production |
| `art-requests/in_review/` | `in_review` | Art director claimed it |
| `art-requests/fulfilled/` | `fulfilled` | Asset landed + `fulfillment` filled; builder may bind |
| `art-requests/wont_fix/` | `wont_fix` | Keep stock / abandon — documented |

**One request = one JSON file.** Filename stem = `id`.

When a request changes state:

1. Update `"status"` inside the JSON
2. Move the file to the matching folder
3. Regenerate `art-requests/queue.json` (see `scripts/rebuild_art_request_queue.py`)

---

## Priority order

Process in this order:

1. `blocker`
2. `high`
3. `normal`
4. `low`
5. `optional`

Within a priority band, prefer requests that:

- Already have selected concept art in `relatedPaths` (**prep first**, don’t regenerate)
- Unblock player-facing empty surfaces (shop plate, climb destinations)
- Have clear `acceptanceCriteria`

If `keepStockIcon` is `true` and the placeholder is chrome (chevron, heart accent), prefer `wont_fix` over Midjourney unless Evan wants polish.

---

## `semanticId` rules

`semanticId` is the **canonical join key** for generated artwork across:

- this queue
- `data/dev-asset-library/library.json`
- Game Asset API / Studio binds
- Xcode imagesets / runtime loaders

**Do not invent a parallel registry.** Prefer existing conventions:

| Pattern | Use |
| --- | --- |
| `token.plink.gang.<camelId>.<pose>` | Fight / climb foe sprites |
| `token.marbleVoyage.climb.<place>` | Climb chart destination tiles |
| `plate.marbleVoyage.<screen>.…` | 4:3 land / shop / event plates |
| `character.peglin.abbie.<mood>` | Abbie portraits |
| `ui.marbleVoyage.…` | Optional chrome icons |
| `map.*` / `poi.*.exterior\|interior` | World 2 plates (Studio) |

---

## Midjourney pacing

Evan’s standing limit:

- **One image / 30 seconds** absolute floor
- Four-candidate grids: **≥ 120 seconds** between submissions
- Serial only — no parallel jobs, no auto-reroll loops

Capture job id, candidate index, and a durable hash in provenance. Temporary `cdn.midjourney.com` URLs are **not** source of truth by themselves.

---

## Provenance rules

For every pack under `AssetSources/…`, keep a nearby `provenance.json` (or pack-level provenance listing each file).

When known, record:

- `semanticId`
- `filename`
- `sourceProvider` (e.g. Midjourney)
- job id and/or source URL
- `candidateIndex`
- `generatedAt` / approval note
- `sha256`
- `derivativeOf` / parent SHA-256
- notes (prep steps, facing, pivot)

Preserve originals when making transparent derivatives.

---

## Existing-concept-first

If `relatedPaths` already points at a selected concept JPEG/PNG:

1. **Prep** (background removal, edge QA, scale/anchors) before asking for a new Midjourney run
2. Reroll only when anatomy / silhouette fails acceptance criteria
3. Match the established cast language (Porcupine Boxer is the style lock for unnamed henchmen)

Never tell a remote reviewer to “match the porcupine” without also linking:

`AssetSources/MarbleVoyage/henchmen-concepts-2026-09-26/porcupine-boxer.jpeg`  
and/or  
`AssetSources/MarbleVoyage/porcupine-boxer/porcupine-boxer.png`

---

## Status vocabulary (be honest)

| Term | Means |
| --- | --- |
| **Concept** | Selected Midjourney / sketch; may still have white bg |
| **Production sprite** | Transparent, edge-clean, sized for UI; not necessarily bound |
| **Runtime-bound** | Catalog / imageset / library entry wired in code |
| **Verified** | Seen on device / simulator in the real surface |

Do not mark a request `fulfilled` for “concept only” if the brief asked for a production cutout — say what landed in `fulfillment.notes`.

---

## Expected output from an art review

For each prioritized open request, return:

1. **Verdict** — prep existing / regenerate / keep stock / need Evan call
2. **What you inspected** — list repo paths actually opened
3. **Prompt** — ready-to-paste Midjourney prompt (or “no new prompt; prep file X”)
4. **Acceptance criteria** — pass/fail checks (facing, limbs, bg, readable at N pt, no text)
5. **Fulfillment path** — where the file should land under `AssetSources/…`
6. **Builder handoff** — semanticId + what remains (imageset, enum, bind)

---

## Related paths must be GitHub-visible

- Use **repo-relative** paths only (`AssetSources/…`, `prototypes/…`, `art-requests/…`)
- Never `/Users/…` or `~/`
- If a request needs a visual reference, that image must be **committed** under `AssetSources/` (or another tracked path) and listed in `relatedPaths`

---

## Startup ritual (every remote session)

1. Read this file
2. Skim root `AGENT_COORDINATION.md` (Art requests section)
3. Open `art-requests/queue.json`
4. Read each `open` request JSON
5. Open image / provenance paths in `relatedPaths`
6. Deliver the review output above
7. Stop before spend / commit unless Evan authorizes execution

---

## Coordination

After meaningful art decisions, append a short note to `AGENT_COORDINATION.md` when you have write access. Preserve other agents’ entries. Do not invent parallel inboxes.
