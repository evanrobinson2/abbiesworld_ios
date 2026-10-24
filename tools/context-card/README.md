# Context engineering card

Evan, 2026-10-23: every study shows, on its right side, the context it was engineered from: Oracle consultation,
game dev blogs, game design blogs and game design tutorials (plus research, our canon and references). Org-wide.

- Data: `prototypes/ranch-atelier/dist/studies/context.json`. One entry per study id (the ids in `studies/index.html`).
  Each item is `{k, t, href, note}` with `k` one of the `kinds`. A study can `use` a shared digest (for example
  `blender-techniques`) or be the `same` as another study. The four kinds Evan named always show; an empty one reads
  "None recorded".
- Studies site: the right panel's **Context** tab (`look/context-card.mjs`, `look/context-card.css`).
- A study page opened on its own: `<script type="module" src="/look/context-card.mjs" data-context-study="ID"></script>`.
- Artifacts: `node tools/context-card/snippet.mjs ID` prints the same card as static HTML to paste into the artifact.
- New study: add its entry in the PR that ships it, as you work (the Oracle records you consulted, every blog, talk
  and tutorial you read, the canon docs you followed).

## Shared studio context and the overseer process

Every study inherits `context.json.studio` in the existing Context card, including new ids and aliases.
This is a curated, condensed studio brief: philosophy, art, feel, interface, technical contracts, production
lessons and evidence boundaries. It is background supplied to every study, not a claim that its author read
every source. Study-specific sources remain separate. The Oracle model also receives the same versioned brief;
`GET /api/knowledge?studio=1` exposes the public bundle. Consult's grounding records `studioRevision`.

Default: **this exists; if relevant, use it**. New directions, consequential choices and uncertain studio fit warrant
the brief and relevant evidence. Routine edits need no mandatory retrieval or extra approval. This extends the
[Mini Game Designer process](https://chatgpt.com/space/page_d1cd857933e081919b3188485df97f3e).
To consult it:

```
node tools/context-card/studio.mjs --study carwash --question "How should cleaning feel?"
node tools/context-card/studio.mjs --check
```

Three entry points share one packet format (`aw.studio-packet.v1`):

- **Repo / agents:** CLI above; `--json` for orchestration. Read cited originals for consequential decisions.
- **App:** owner-authenticated `GET /api/studio-context?study=carwash&q=cleaning&feedback=1` gives the brief
  plus up to eight relevant notes from the existing feedback service. Without `feedback=1`, no storage read occurs.
  This is an on-demand context endpoint, not a new autonomous model or chat UI.
- **Database / evidence pipelines:** pass an authorized export with `--evidence path/to/export.json`. The same pure
  `studioPacket(data,{study,question,evidence})` function accepts records from app observations, database queries,
  and repo digests. The current live adapter uses the existing private Blob feedback store, not a new SQL database.
  The CLI never persists imported evidence into public context or the Oracle bundle.

Evidence exports are an array (or `{items: [...]}`) of `{id, summary, source, observedAt, study, revision, status,
timecode}`. `source` is a durable source id/path; for video use the recording id and exact time range. Keep original
wording/transcript, interpretation, decision and verification in that source record. The packet is a bounded
excerpt, not the archive. Rank study matches first, then question overlap; at most eight excerpts of 700 characters.
This is deterministic retrieval, not semantic judgment or an Oracle opinion. The authenticated API is private/no-store;
never paste a packet containing private evidence into a public artifact.

### Deep research once, small updates thereafter

1. At the start of a new direction, read the brief and relevant canon, Oracle identities, last two applicable
   production reviews, and available feedback/video digests. Record missing coverage explicitly.
2. Digest a new recording once: source identity/revision, observed time range, exact feedback, observed behavior,
   interpretation, suggested change and verification state. Separate external reference footage from our playtests.
   A transcript alone cannot establish visual behavior. Do not fabricate footage analysis when the recording is absent.
3. Promote only reviewed, reusable lessons into the existing canon and `studio.entries`. Preserve unresolved and
   conflicting feedback in its source; current explicit user direction overrides older preferences. Oracle output
   retains `source`/`model`; a studies-only fallback is not a model consultation.
4. Review changed source hashes, edit affected summaries, then `node tools/context-card/studio.mjs --build`.
   This updates the revision and committed Oracle bundle. `--check` detects drift without any LLM/network expense.
   A changed hash detects a need for review; it does not prove the summary was updated correctly.
5. All later studies reuse this revision plus small relevant excerpts. Consult the existing Oracle when there is a
   meaningful creative question; do not add repeated full-repo scans, automatic video reprocessing, per-edit calls,
   a scheduler, vector service or blocking approval stage. Record actual outcome and reusable lesson after review.

The overseer is this shared memory and consultation process. It advises; it does not automatically rewrite canon,
resolve feedback, approve quality or deploy. Initial coverage includes one **external** carwash video digest and
the School Jump production review. Comprehensive recorded-user-session ingestion remains unverified.

### Conventions, norms and how we work

This is operational memory as well as creative context. Before a consequential change, agents consult the applicable
canonical contract and inspect actual state: which branch is authoritative, who owns a release, where durable data
lives, how work is tested/published, and what other active work depends on it. A context packet is orientation, not
permission. An incidental chat request must not silently retire `main`, replace shared infrastructure, delete data,
weaken authentication or establish a new org-wide process. Explain the specific conflict, affected scope and
downstream consequences; obtain deliberate, specific direction when that consequential change has not already
been authorized. Routine reversible work inside the conventions continues without ceremony. When a convention
is intentionally changed, update its existing source of truth and refresh the brief so other agents learn it.
