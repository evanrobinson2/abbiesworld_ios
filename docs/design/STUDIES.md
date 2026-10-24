# Studies in Abbie’s World

Project convention established by Evan on October 24, 2026. Applies to all operators, agents and contributors in `evanrobinson2/abbiesworld_ios`.

A **study** is a durable workspace for research or a push in a particular creative direction requested by Evan. It develops through attention, refinement, feedback and playable or inspectable evidence until the relevant parts are ready to enter the game. A process, interaction, visual direction, system or complete experience can all be subjects of studies. Studies are not disposable demos, and publishing a study does not authorize integrating its ideas into the game.

## Maturity is visible before review

Every study displays a conspicuous outlined rubber stamp in the top right or another immediately visible location. Use exactly one of these labels for the current presentation:

| Stamp | What Evan is reviewing |
| --- | --- |
| Exploration | Questions, research and possibilities. The direction is still open. |
| Proposal | A coherent recommended direction, with alternatives and tradeoffs available for discussion. |
| Draft | A developed implementation or artifact being refined against the intended experience. |
| Final / Game Ready | The stated scope has the required acceptance and verification evidence for game use. Record remaining integration work separately. |

These are descriptive states, not a mandatory sequence. Studies can start at any appropriate level, skip levels, or return to an earlier level when the direction changes. A beautiful presentation does not establish readiness. Explicitly label any subsection with a different maturity and any mocked interaction, simulated generation, placeholder asset, local-only save, or unverified behavior.

Theme the study to the intended creative experience. Use enough representative presentation to make the question understandable without implying unfinished work is final game art. Rough blips, MIDI, or low-quality stand-ins must not be presented as the intended game quality. Existing catalogued audio, asset provenance and game-feel rules still apply. Preserve creative momentum with a clear review question and concrete next action, rather than an approval ceremony at every stage.

## A study is a continuing conversation

- Keep one stable study identity, repository record and canonical online URL as the work evolves. Link the owning chat and editable artifact when present.
- State the intent, current maturity, current review question, implemented scope, important unknowns and next action.
- Keep the research context and sources in `prototypes/ranch-atelier/dist/studies/context.json`. Distinguish a model-authored Oracle consultation from a studies-only template; never invent an Oracle opinion.
- Provide the shared right-side feedback panel: one note per multiline input, timestamped, associated with the study and reviewed revision/interaction. Notes must be readable by the project operators and the application through the existing authorized shared feedback service. A device-local draft is not a submitted note.
- Preserve Evan’s wording, then record the interpretation, resulting decision or change, and its verification. Keep unresolved feedback visible; do not silently mark it accepted or resolved.
- Refine the existing study instead of spawning disconnected replacement demos. Preserve significant prior decisions and evidence so changes can be understood.

## Delivery means the online link works

Delivery is incomplete until the exact canonical online URL opens the intended current study and its claimed behavior works. Local files, artifacts in chat, commits, merges, deployment receipts and HTTP 200 responses alone do not satisfy delivery.

Before reporting delivery, verify the deployed revision, load the exact URL in a browser, inspect phone and desktop presentation, exercise the review interactions, and verify feedback submission plus authorized readback. For interactive scenes, perform the applicable fresh MCP state/image checks. Record the URL, revision/build, time, tests and any remaining limitations. Authentication must be usable through the normal sign-in flow; do not bypass it or publish credentials. Distinguish test notes from Evan’s feedback.

If any required live check fails, keep delivery pending and state the specific blocker. Never substitute a local preview or claim a broken, stale or merely scheduled link is delivered.

## Study readiness and game integration are separate

Track maturity, publication verification, experiential acceptance and game integration independently. A Proposal can be successfully delivered for review while remaining a proposal. A Final / Game Ready study still needs the applicable integration, registry, world-entry, persistence, device/runtime and end-to-end checks before its feature is called live in the game. Follow `INVARIANTS.md` and the existing release process; this convention does not relax those gates.

## Standard publication: selected, versioned bundles

Evan requested this as the repo-wide default on October 24, 2026. Every thread follows this section for new standalone studies and when migrating a study for faster iteration. Existing game-integrated pages remain on their current release path until deliberately migrated. Do not create a separate documentation hierarchy or another Vercel project for a static study.

The implementation is `tools/study-publish/publish.py`, with `.github/workflows/study-publish.yml` as the authorized publisher. It uses the existing R2 bucket and existing same-origin `/r2/*` rewrite. There is no app build, new service, purchased resource or new credential. Legacy `instant-preview.yml` serves existing legacy pages from main only and skips registered bundles. Old branches may still contain old workflows; their `/previews/` objects cannot overwrite the new `/studies/` namespace. Do not use the legacy mutable URLs for new study delivery.

### Author and register

1. Use one stable lowercase hyphenated ID (maximum 80 characters). Keep browser source in `preview/<id>/`, including a `study.json`. Keep the research record in the existing `docs/oracle/` convention when the study needs a longer record; this publishing investigation is recorded here. Register context in `prototypes/ranch-atelier/dist/studies/context.json` in the same source commit. The publisher packages that context, so ordinary study revisions do not require redeploying the app's context file.
2. Manifest fields: `schemaVersion: 1`, `id`, `title`, `maturity`, `entry` (HTML), `intent`, `reviewQuestion`, `ownerThread`, `shared` and `external`. See `preview/faster-study-publishing/study.json` for a working specimen. Source must be committed; the publisher reads tracked Git blobs at an exact 40-character SHA, not working-directory files.
3. Browser files in that directory are packaged. `shared` entries name `{source, target}` paths for real game components/assets from `prototypes/ranch-atelier/dist/`. Server code, tests, credentials, symlinks, traversal and reserved publisher paths are rejected. Shared component imports must resolve within the bundle; include their transitive dependencies. Do not silently replace the real game component with a mock. Keep large models/audio in the existing asset store and declare their exact versioned URLs under `external`.
4. The publisher detects literal HTML/module/CSS dependencies and fails missing bundle files. Declare intentional root app dependencies under `external`. Dynamic asset URLs, import maps and runtime fetches require explicit browser verification; the static scanner is not a JavaScript interpreter. Do not use base tags or register service workers. Package-specific paths are relative; intentional app services remain rooted at `/api/...`. Use correct MIME types for modules, GLBs and WASM. Limit one bundle to 500 files and 50 MiB; avoid repeatedly copying shared large assets.
5. The publisher injects the shared maturity stamp and right-side notes drawer and loads `/view-context.js` once. `window.StudyReview.changed(description)` records the current interaction. Scenes still register real state/render callbacks with `RanchView`; WebGL capture retains `preserveDrawingBuffer:true`. The bridge's app build ID is not the study revision: the `study-publication` provider supplies the bundle revision separately.
6. This is trusted first-party executable content served on the app's origin. Review its source before opening it in a signed-in/paired browser. Never publish third-party unreviewed code, personal media, tokens, `.env` files or credentials. Public bundles are publicly readable; owner sign-in protects feedback, not the HTML. Publishing does not change game registry status, add town entrances, or remove experimental gates.

### Check, publish, verify, promote

From the repository root, with Python 3.12+ and Git:

```sh
python -m unittest discover -s tools/study-publish -p 'test_*.py' -v
python tools/study-publish/publish.py check --id STUDY_ID --sha SOURCE_SHA
gh workflow run study-publish.yml --ref main -f action=publish -f study=STUDY_ID -f sha=SOURCE_SHA
```

Replace the uppercase placeholders with the study ID and committed SHA; do not pass shell expressions from a manifest. Local check output in `.study-output/` is not delivery. `study-publish-check` validates registered packages in PRs without credentials. Existing applicable game/audio/invariant checks still apply. The secret-bearing publisher runs only from main, uses pinned checkout tooling, treats the source commit as data and never runs bundle build/install scripts with R2 credentials. Only the selected study and explicitly declared shared Git blobs are fetched. No `sync --delete` or bucket-wide operation is used.

Wait for the workflow and inspect its step summary. It returns a content-derived 64-character revision and an immutable candidate URL:

`https://app.abbies.world/r2/studies/<id>/versions/<revision>/<entry>`

The publisher creates objects conditionally, permits retries only for identical bytes and checks every file hash through the public same-origin route. A partially uploaded revision cannot be promoted. The receipt proves transport integrity, not UI/authentication/readiness. Record desktop and phone tests, normal sign-in, multiline test-note submission and authorized readback, and fresh MCP state/image with this exact study revision before promotion. Exercise real imported components and assets and inspect console failures. A code-only or anonymous HTTP test does not substitute for signed-in feedback.

Read `https://app.abbies.world/r2/studies/<id>/current.json` immediately before promotion. Then:

```sh
gh workflow run study-publish.yml --ref main -f action=promote -f study=STUDY_ID -f revision=VERIFIED_REVISION -f expected=CURRENT_REVISION
```

Use `expected=none` only for the first promotion. Dispatch itself requires repository write authorization. Select a reviewed source commit; publication is not permission to merge or integrate it. The workflow serializes by study, and the pointer write also uses R2's atomic `If-Match`/`If-None-Match`. A stale expectation or racing writer fails rather than overwriting another operator's choice. Never “fix” a stale-promotion failure by blindly adopting the latest value: inspect what changed and coordinate first. GitHub concurrency may replace pending runs; a canceled or pending run is never delivery.

The permanent review link is:

`https://app.abbies.world/r2/studies/<id>/index.html`

Its fixed loader requests `current.json` without cache and opens the selected immutable revision, retaining query/fragment state. The address bar then identifies the exact version; share the stable link for continuing review and the immutable link for historical evidence. The loader protocol is intentionally create-once; changing it requires an explicit migration, not an unnoticed overwrite. Immutable files are long-cached; the pointer is `no-store`. Reopen the exact stable link, check the resulting revision and repeat the review interaction/readback before claiming canonical delivery. Browser back/forward history may restore an old version; that version must remain accurately labeled.

### Update, rollback and feedback

An update is another committed source SHA → publish → candidate acceptance → conditional promotion. Keep the same study ID. Rollback uses the same promote command with the previous revision as the target and the actual current revision as `expected`. Nothing is rebuilt or deleted. Immutable promotion-attempt records under `promotions/` contain source SHA, previous/target revision, timestamp and run ID. An attempt record alone does not prove its pointer write succeeded; the workflow result and current pointer determine that. Failed/unknown writes must be reconciled by reading current state before retrying.

Feedback uses the existing `/api/feedback` private store and inbox. Owner authorization, same-origin POST rejection, and read-only robot authorization are unchanged. A syntactically valid study ID is metadata, not an access grant; allowing new IDs avoids a server deployment per study. Notes include `studyId`, the 64-character `studyRevision`, source `sha`, `studyContext`, maturity and a server timestamp. Retried notes reuse `requestId`; changed note/revision conflicts are rejected. Filtering occurs before pagination so a busy study cannot hide another study's notes. Local drafts retain the revision they describe and are never called submitted. The shared panel reports saved only after authorized readback finds the returned note ID.

Separate Vercel projects are exceptions for genuine server/runtime isolation, coordinated through `docs/architecture/DEPLOYS.md`. Existing `/api/feedback` and `/api/view-context` reject cross-origin writes; a new host does not inherit app cookies or browser pairing. Do not weaken CORS/authentication, duplicate secret stores or copy pairing keys into bundles. New server behavior and accepted live-game integration require the normal release path. Initial feedback metadata support is a one-time app release; subsequent static study/component/asset revisions are bundle publications.

### Publishing-system study and acceptance record

- Identity: `faster-study-publishing`; tracking [AW #638](https://github.com/evanrobinson2/abbiesworld_ios/issues/638); owner chat `01a16f34-c876-7360-9312-7ee7306dcb82`; maturity **Draft** while implementation is verified.
- Original question: can studies reuse game components without waiting for a full game deployment? Recommendation: versioned same-origin R2 bundles; independent Vercel deployments only for server/runtime needs.
- Existing-route evidence: October 24 browser showed “Instant preview works” at `/r2/previews/hello/index.html`; anonymous `/api/feedback` returned 401; `/view-context.js` returned JavaScript. Eight successful workflow runs took 169–251 seconds, median 212.5 seconds. Run `40118049076` spent 47 seconds queued, 95 seconds in checkout and 67 seconds syncing all previews. This is historical evidence, not a new-path latency promise.
- Alternatives: static Vercel projects can deploy only their selected output (including `--prebuilt`); tiny HTML/Markdown-only deployments have a documented fast path. They still create deployments, consume owner-level quotas, require separate auth/capture integration and can encounter preview protection on mobile. The existing app build is approximately four minutes plus batching according to its handoff. R2 avoids those builds but still incurs Actions time, storage/operations and Vercel delivery usage through the rewrite; it is not “free bandwidth” end to end. Content versioning adds retained storage. No purchase was made.
- Sources: [R2 atomic conditional writes](https://developers.cloudflare.com/r2/api/s3/extensions/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Vercel deployment modes](https://vercel.com/docs/cli/deploy), [Vercel owner-level deployment limits](https://vercel.com/docs/limits), [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), existing repo deploy/auth/capture code. No model-authored Oracle consultation is claimed.
- Implementation acceptance: local transport tests cover immutable retry/collision, hash verification, invalid paths/imports, two revisions, promotion, rollback, stale expectation and a concurrent writer. Live publication timings, canonical browser/mobile behavior, authenticated feedback and MCP freshness remain **pending** until recorded here with actual revisions and timestamps. Do not call the standard proven based on these local tests alone.

## Mini Game Designer process study

The Mini Game Designer production process is a **Proposal** study. Its purpose is to refine a repeatable path from emotional intention through research, experiments, assets, feedback and verified delivery. Validate it with a complete pilot before describing the process as proven.

- Repository record: `docs/oracle/mini-game-designer/MINI_GAME_DESIGNER_STUDY.md`.
- Editable working artifact: https://chatgpt.com/space/page_d1cd857933e081919b3188485df97f3e
- Oracle status: the October 24 consultation returned `source: studies`, `model: null`; the requested 50,000-token opinion remains outstanding.
- Online study publication and verification must be recorded by the publishing operator; the editable artifact alone does not complete that delivery.
