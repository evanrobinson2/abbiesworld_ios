# StoryBoard → Abbie’s World Play Pack Bridge

Status: proposed architecture  
StoryBoard source reviewed: `evanrobinson2/StoryBoard` `main`, September 8, 2026

## Decision

Keep StoryBoard and Abbie’s World as separate repositories.

- StoryBoard remains the canonical narrative, character, continuity, media, and approval system.
- Abbie’s World remains the iPad runtime, local profile, fictional economy, game engine, and offline cache.
- Connect them with a signed, immutable, versioned `abbies-play-pack/v1` projection served by StoryBoard.
- Use StoryBoard MCP for agent authoring. Do not use MCP as the iPad runtime API.
- Host authenticated APIs on Vercel and immutable media in Cloudflare R2.

A monorepo merge is rejected for now: the products use different languages, deployments, release cycles, security boundaries, and asset lifecycles. Git submodules would share source without solving runtime synchronization.

## Existing StoryBoard leverage

StoryBoard already has the required source material:

- `sidecar-story/v1`: acts, scenes, beats, entities, characters, styles, continuity, music cues, feedback, drafts, concepts, edges, and artifacts.
- `ProductionArtifact`: media kind, URL, role, provenance, and attachment.
- Viewer graph routes that project a story into typed atoms and edges.
- Supabase project ownership, membership, RLS, documents, revisions, and audit events.
- Auth0 and Supabase bearer support.
- Cloudflare R2 media upload with immutable cache headers.
- MCP commands for reading, applying, generating, and verifying story work.

Relevant StoryBoard files:

- `lib/sidecar-story.ts`
- `lib/production-graph.ts`
- `lib/viewer/atoms.ts`
- `app/api/viewer/[storyId]/graph/route.ts`
- `app/api/viewer/[storyId]/canon/route.ts`
- `lib/storyboard-auth.ts`
- `lib/r2-media.ts`
- `supabase/migrations/001_storyboard_auth.sql`

## Boundary model

```text
Real-life note (local)
        |
        v
Sanitized event brief
        |
        v
StoryBoard project
story + characters + canon + approved artifacts
        |
        v
Parent-approved Play Pack compiler
        |
        +---- Vercel: authenticated catalog + manifests
        |
        +---- R2: immutable art/audio/video
        |
        v
Abbie’s World iPad
verify + download + cache + play + unlock
```

The iPad never receives raw transcripts, production feedback, discarded drafts, private prompts, unrelated projects, or StoryBoard write credentials.

## `abbies-play-pack/v1`

StoryBoard is the schema owner. It should publish JSON Schema plus a golden fixture; the iOS app mirrors it with `Codable` types and contract tests.

```json
{
  "schemaVersion": "abbies-play-pack/v1",
  "id": "dino-tooth-spa",
  "version": 1,
  "source": {
    "storyId": "project-id",
    "storyRevision": 12,
    "sourceDocumentHash": "sha256",
    "exportHash": "sha256",
    "publishedAt": "2026-09-08T00:00:00Z"
  },
  "title": "Dino Tooth Spa",
  "summary": "Help friendly dinosaurs prepare for a tooth cleaning.",
  "approval": {
    "sanitized": true,
    "parentApproved": true,
    "contentWarnings": []
  },
  "pedagogy": {
    "parentGoal": "Make the sequence familiar through playful agency.",
    "playHypothesis": "Choosing tools may reduce unfamiliarity.",
    "successObservation": "Chooses another round or retells one true step."
  },
  "economy": {
    "completionReward": 5,
    "curiosityBonus": 1,
    "permanentUnlockIds": ["sticker.sparkle-toothbrush"],
    "ratingAffectsReward": false
  },
  "games": [
    {
      "id": "tooth-spa-round",
      "template": "care_sequence",
      "title": "Clean the Dino’s Teeth",
      "roundLengthSeconds": 60,
      "meaningfulChoices": ["dinosaur", "tool", "celebration"],
      "gentleAssists": ["large_targets", "idle_hint", "automatic_finish"],
      "failureState": "none",
      "sceneKeys": ["tooth-spa"],
      "beatKeys": ["choose-tool", "clean", "celebrate"]
    }
  ],
  "characters": [
    {
      "id": "dino-green",
      "name": "Green Dino",
      "canonicalAssetId": "character.dino-green"
    }
  ],
  "assets": [
    {
      "id": "character.dino-green",
      "kind": "image",
      "role": "canonical",
      "url": "https://media.example/immutable-path",
      "mimeType": "image/png",
      "sha256": "hex-digest",
      "bytes": 123456,
      "offlineRequired": true,
      "provenance": "gpt_image"
    }
  ],
  "dialogue": [],
  "avoid": [],
  "signature": {
    "algorithm": "Ed25519",
    "keyId": "pack-signing-2026-01",
    "value": "base64-signature"
  }
}
```

Compute `exportHash` over the normalized exported manifest and all asset hashes. Do not reuse StoryBoard’s current `documentHash` as package integrity because its canonical hash does not cover every production-graph and release field.

## Publishing rules

A Play Pack is publishable only when:

1. The parent explicitly approves the pack revision.
2. `sanitized` is true and the source brief excludes unnecessary personal data.
3. Every runtime asset is canonical or explicitly approved.
4. Every remote asset has HTTPS, MIME type, byte size, and SHA-256.
5. One complete offline round is identified.
6. Rewards are fixed and cannot depend on artistic judgment.
7. The target game template is supported by the installed iOS app.
8. The manifest passes JSON Schema and golden-fixture tests.
9. The exact candidate hash, source revision, policy version, and asset set are recorded in the approval.
10. The export hash and Ed25519 signature validate.

Published versions are immutable. Editing the StoryBoard project creates a new candidate version; it never silently changes an installed game.

“Canonical” means selected within StoryBoard; it does not mean approved for Abbie. Add separate release records for candidates, safety reviews, parent approvals, releases, assets, and revocations. Use the lifecycle `draft → safety_reviewed → parent_approved → published → revoked`.

## API surface

StoryBoard already provides authenticated APIs suitable for a read-only development slice:

```text
GET /api/projects
GET /api/viewer/{storyId}/graph
GET /api/viewer/{storyId}/canon
```

Use these initially to prove Auth0 parent pairing, project discovery, revision/hash polling, and Swift decoding. Import only non-archived content, canonical artifacts, canonical character media, and valid HTTPS URLs. Reject `local-media://`, pending/failed drafts, production feedback, and unrelated graph nodes.

These broad viewer projections are not the final kid-runtime contract. Before routine family use, add narrow routes to StoryBoard:

```text
GET  /api/integrations/abbies-world/v1/catalog
GET  /api/integrations/abbies-world/v1/packs/{packId}/releases/{version}/manifest
GET  /api/integrations/abbies-world/v1/packs/{packId}/releases/{version}/archive
POST /api/integrations/abbies-world/v1/packs/{packId}/publish
POST /api/integrations/abbies-world/v1/packs/{packId}/revoke
```

- `catalog` and `packs` are read-only and return approved content only.
- `publish` and `revoke` require project owner/editor authorization and explicit confirmation.
- Revocation prevents new downloads but does not remotely delete a child’s safe offline pack.
- Do not expose `/api/storyboard`, viewer canon, or MCP directly to the iPad.

## Authentication

Use Auth0 Native Application + Authorization Code with PKCE for one-time parent pairing:

1. Parent signs in on the iPad.
2. Token is stored in Keychain.
3. Abbie’s World requests a StoryBoard audience with read-only pack access.
4. StoryBoard resolves existing user/project membership and permits approved-pack reads.
5. Parent can revoke the device.

Do not bundle `STORYBOARD_MCP_TOKEN`, server API keys, Supabase service keys, or R2 credentials in the app.

Before connecting the systems, disable StoryBoard’s production `STORYBOARD_MCP_ALLOW_NO_AUTH`. Its current no-auth dogfood mode is incompatible with a private family-story pipeline.

## Media and CDN

- Continue using Cloudflare R2 for immutable media.
- Use a private bucket or authenticated media proxy for personal/family artifacts.
- Public game-generic art may use public immutable URLs.
- Keep one complete round bundled or persisted locally.
- Download signed archives in the background, validate the Ed25519 signature, export hash, space budget, MIME types, dimensions, and every asset SHA-256, then atomically activate them.
- Retain the last valid version if a network request or validation fails.

## Mapping StoryBoard to gameplay

- Project → play world or event quest
- Act → quest chapter
- Scene → game round or story interlude
- Beat → objective, reaction, or dialogue step
- Character → game actor and canonical appearance
- Style → art-pack visual rules
- Music cue → loop, transition, or celebration cue
- Continuity fact → runtime content constraint
- Canonical artifact → verified game asset
- Avoid feedback → content exclusion
- Concept + edge → world, prop, costume, location, and relationship graph

The bridge compiler is deliberately opinionated: it includes only fields needed to play the approved experience.

StoryBoard does not yet have first-class gameplay-template or typed-dialogue fields. For the first contract slice, attach canonical text artifacts using:

- `application/vnd.abbies-world.quest+json` on a scene
- `application/vnd.abbies-world.dialogue+json` on a beat
- `application/vnd.abbies-world.event-brief+json` on an approved concept

This uses the existing production-artifact model without polluting narrative beats with runtime configuration. Promote these profiles to first-class fields only if repeated use proves necessary.

## Repository ownership

### StoryBoard repository

- Own `abbies-play-pack/v1` Zod and JSON Schema.
- Add the compiler from `sidecar-story/v1`.
- Add approval, publish, catalog, and pack routes.
- Store pack records, version, approval, and source revision.
- Upload or reference verified immutable media.
- Test ACLs, sanitization, immutability, and projection.

### Abbie’s World repository

- Own Swift `Codable` mirror and fixture test.
- Add authenticated catalog client and Keychain token storage.
- Add pack download, signature/hash verification, cache, activation, and rollback.
- Map supported `template` identifiers to local game engines.
- Integrate pack entitlements with Star Seeds and the Wonder Market.
- Keep child observations local by default.

## iPad runtime boundaries

- `PlayPackCatalogClient` reads approved releases only.
- `PlayPackStore` verifies signatures and hashes, installs into Application Support, atomically activates, and retains the previous valid version.
- `GameTemplateRegistry` maps fixed manifest template IDs to native Swift game code.
- `QuestContext` supplies approved actors, assets, dialogue, choices, and assists.
- `EconomyLedger` remains a separate local append-only child-economy ledger.
- `LocalObservationLog` records concise session events without identity labels.

Content packs contain data and media only; they never deliver executable code.

Do not use the existing `ImageCache` as the durable pack store. Pack paths must use stable SHA-256 identifiers rather than Swift `String.hash`, and installed releases must not be evicted as ordinary image cache entries.

## Phased delivery

### Phase 0 — secure both trunks

- Rotate the server credential exposed in tracked `Info.plist` files and Git history.
- Remove shared credentials from app bundles and `UserDefaults`; move parent/device tokens to Keychain.
- Require HTTPS for the pack transport and remove insecure HTTP exceptions from the pack path.
- Disable production no-auth MCP before family content enters StoryBoard.
- Confirm which Vercel account/project owns `story-forge-eosin.vercel.app`.
- Push reviewed checkpoint branches in both repositories.

### Phase 1 — contract without networking

- Add schema, compiler, and one golden pack fixture to StoryBoard.
- Add matching Swift models and fixture decode test to Abbie’s World.
- Use a bundled fixture to launch one Dino Picnic round.

### Phase 2 — parent-approved publishing

- Add candidate preview, explicit approval, immutable publish, and revocation.
- Add Auth0 parent pairing and authenticated catalog reads.
- Keep media local or use a small private test pack.

### Phase 3 — CDN delivery

- Publish verified R2 assets.
- Add background download, checksum, offline activation, and rollback on iPad.
- Prove the full flow textually, in simulator, then on the physical iPad.

### Phase 4 — story-driven evolution

- Compile sanitized real-life event briefs into StoryBoard projects.
- Generate candidate characters, scenes, dialogue, music, and game mappings.
- Parent approves one vertical slice.
- Observe Abbie’s engagement and create a new immutable pack revision.

## Acceptance test

The first bridge is complete only when:

1. A sanitized StoryBoard project is compiled into `abbies-play-pack/v1`.
2. The exact candidate receives separate safety and parent approval.
3. A signed immutable version is retrieved with parent authentication.
4. The signature, export hash, and every asset validate, and one round remains available offline.
5. Abbie’s World launches the mapped game through a deterministic test argument.
6. Simulator autoplay reaches completion and emits structured events.
7. The same pack runs on Abbie’s iPad.
8. Completion awards the declared Star Seeds exactly once.
9. A revoked, unsigned, or malformed update cannot replace the last valid local pack.
