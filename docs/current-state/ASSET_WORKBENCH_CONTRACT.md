# Asset Workbench Contract

The **Asset Workbench** is a player-facing Work Land POI that creates qualified,
treehouse-placeable decorations from three predefined idea cards. It is not the
developer-only Asset Carving Lab and must never expose raw generation output.

The Workbench is inserted in Work Land. Awarded decorations persist in the
selected player's furniture drawer and can be placed in that player's treehouse.
Live generation still uses the local preview service until the server job
endpoint exists.

## Fixed v1 product contract

- Asset class: `treehouse.generatedDecoration/v1`
- Recipe axes: `finish`, `object-family`, `personality`
- Inputs: one server-recognized card ID from each axis; no free text
- Generated candidates: exactly 6
- Player selection: exactly 3
- Output: immutable Game Asset API v1 references pinned by key, revision, and SHA-256
- Placement: floor, wall, or hanging inside the owning player's treehouse

The initial example recipe is:

```text
finish.pearlescent + object.furniture + personality.fancy
```

## Artifact requirements

Every candidate is a single transparent PNG intended for direct room placement:

- 1024 × 1024 pixels;
- one complete object with no clipping;
- transparent background with visible margin around the object;
- no authored room, scenery, UI, labels, signatures, or watermarks;
- no people, faces, brands, unsafe content, or photorealistic child imagery;
- visually legible at treehouse placement size;
- placement layer declared as `floor`, `wall`, or `hanging`.

The server may use generation, carving, and bounded repair internally. A candidate
does not enter the six-item choice tray until its exact runtime PNG has:

1. passed file and alpha checks;
2. passed semantic, composition, style, safety, and use-size qualification;
3. been published as an immutable Game Asset API revision.

If six qualified candidates cannot be produced within the server's bounded attempt
policy, the job fails. The client must not fill missing positions with raw output.

## Recipe authority

The iOS app sends only stable card IDs. The server owns the prompt fragments and
validates that each ID belongs to the declared axis. This prevents a modified client
from turning the workbench into an unrestricted prompt endpoint.

The current client catalog is defined in
`Models/World2/AssetWorkbenchModels.swift`. Deployment should reject unknown IDs and
catalog-version mismatches rather than interpreting the ID as prompt text.

## Generation job API

Generation orchestration is separate from Game Asset API v1. The registry stores
finished assets; it does not run generators.

### Start

```http
POST /api/v1/games/abbies-world-2/asset-workbench/jobs
Authorization: Bearer <existing read/client credential>
Content-Type: application/json
```

```json
{
  "schemaVersion": 1,
  "playerID": "player.abbie",
  "recipe": {
    "assetClass": "treehouse.generatedDecoration/v1",
    "finishID": "finish.pearlescent",
    "objectFamilyID": "object.furniture",
    "personalityID": "personality.fancy"
  },
  "candidateCount": 6,
  "selectionCount": 3
}
```

The server returns `202` with a `World2AssetWorkbenchJob`.

### Poll

```http
GET /api/v1/games/abbies-world-2/asset-workbench/jobs/{job-id}
Authorization: Bearer <existing read/client credential>
```

Stages are:

```text
queued → generating → carving → qualifying → publishing → ready
                                                     ↘ failed
```

`progress` is a monotonic number from 0 through 1. A ready job contains one pack
with exactly six qualified candidate records. Candidate image bytes are fetched
through their pinned Game Asset API revision routes, not through arbitrary URLs in
the job payload.

### Commit the player's three

Game insertion should add an idempotent selection endpoint:

```http
PUT /api/v1/games/abbies-world-2/asset-workbench/jobs/{job-id}/selection
Authorization: Bearer <existing read/client credential>
Content-Type: application/json
```

```json
{
  "candidateIDs": [
    "candidate-1",
    "candidate-3",
    "candidate-6"
  ]
}
```

The server validates exactly three unique IDs from the job, records the choice once,
and returns the three `World2GeneratedDecoration` references. Repeating the same
selection is idempotent; a different second selection is a conflict.

## Registry records

Suggested immutable keys:

```text
workbench/packs/{pack-id}/candidates/1
workbench/packs/{pack-id}/candidates/2
...
workbench/packs/{pack-id}/candidates/6
```

Metadata carries the asset class, recipe IDs, placement layer, qualification hashes,
generation provenance, dimensions, and parent/product policy version. Provider
credentials and the asset-registry admin key stay server-side.

The iOS client fetches the exact selected revision and checks that the record's
revision, MIME type, and SHA-256 match the job candidate before decoding it.

## Offline and failure behavior

- Existing selected decorations remain usable from the immutable cache.
- Starting a new generation requires the server.
- A missing `/api/v1/asset-schema` makes generation unavailable; the app does not
  invent an alternate asset route.
- Cancelling the screen stops client polling but does not corrupt the durable server
  job.
- Reopening the workbench may resume the player's latest incomplete job.
- Failed jobs retain a child-friendly retry action and a developer-visible error code.

## Game insertion boundary

The Workbench module is inserted when its qualified exterior and interior, Work
Land POI, carousel UI, six-choice validation, and choose-three award compile, and
the awarded decorations persist in the owner's furniture inventory.

Still pending for production generation:

- connect the server implementation and selection endpoint;
- add generation entitlement/cost policy and production telemetry.
