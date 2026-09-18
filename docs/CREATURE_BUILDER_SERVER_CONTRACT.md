# Creature Builder Server Contract

This is the server-authoritative contract for the iPad Creature Lab and
StoryBoard integrations.

---

## API

All JSON endpoints require the existing iPad API_KEY as
`Authorization: Bearer <key>`.

---

## Create a generation

```http
POST /api/games/creature-builder/generations
```

```json
{
  "creatureId": "dragon",
  "outfitId": "lightning-racer",
  "buddyId": "bat",
  "requestId": "optional-retry-safe-id"
}
```

The three ingredient IDs are required. `requestId` is optional for the
current iPad client but should be sent by StoryBoard and future clients.
Repeating it with the same recipe returns the original generation; reusing
it with a different recipe returns **409**.

New requests return **201**; idempotent replays return **200**:

```json
{
  "generationId": "gen_...",
  "cardId": "card_...",
  "status": "queued"
}
```

The server resolves IDs from its versioned catalog. It rejects unknown IDs
with `code: "invalid_ingredient"` and does not accept client-authored prompts.

---

## Read state

```http
GET /api/games/creature-builder/state
```

```json
{
  "catalogVersion": "creature-builder-v1",
  "active": [],
  "queued": [],
  "failed": [],
  "readyToReveal": [],
  "collection": [],
  "concurrency": {
    "scope": "server",
    "activeLimit": 3,
    "queuedLimit": 20
  }
}
```

### Jobs contain:

`id`, `cardId`, `creatureId`, `outfitId`, `buddyId`, `status`, `createdAt`,
`updatedAt`, and nullable `errorMessage`.

### Job statuses:

`queued`, `generating`, `assembling`, `ready`, or `failed`.

`failed` is an additive state collection which older Swift decoders may
ignore.

### Cards contain:

`id`, `generationId`, `recipe`, `name`, `personality`, nullable `powerName`,
`imageURL`, `createdAt`, `isFavorite`, and `isRevealed`.

`imageURL` is an absolute URL for the raw generated illustration. It is
intentionally not the client-composited playing card. The URL uses the same
Bearer authentication as the JSON API; the iOS client retrieves it through
the shared authenticated `ImageCache`.

Provenance for an immutable card asset is available from:

```http
GET /api/games/creature-builder/cards/{id}/provenance
```

It includes catalog and prompt versions, provider model, output SHA-256, and
approval state without exposing the server-authored prompt.

---

## Reveal a card

```http
POST /api/games/creature-builder/cards/{id}/reveal
```

The request has no body. The operation is idempotent and returns:

```json
{"card": {"id": "card_...", "isRevealed": true}}
```

The abbreviated card above represents the full card object.

---

## Set favorite

```http
POST /api/games/creature-builder/cards/{id}/favorite
```

```json
{"favorite": true}
```

The body is strict: `favorite` is the only accepted field and must be a
boolean.

---

## Processing decisions

- The server owns the canonical creature, outfit, and buddy definitions.

- Creature is the primary identity, outfit controls transformation/power,
  and buddy remains a separate companion that influences personality.

- The server first generates structured concept copy, then compiles a
  versioned image prompt, generates one illustration, and deterministically
  composes retained card assets.

- Creature Builder defaults to **gpt-image-2.5-flare** at **low** quality
  (fastest). Quality is the speed/fidelity tradeoff; `medium` remains
  available as a configuration override. Do not default to `high` / `xhigh`
  / `max` — kids wait on these completions.

- At most three Creature Builder jobs execute concurrently per server
  instance. The default waiting queue is 20; a full queue returns **429**.

- Paid generation attempts are not automatically retried. Failed jobs and
  their provenance are retained for diagnosis.

- Completed and failed jobs have no automatic TTL.

---

## Client obligations

- Continue sending the existing three IDs; adopt `requestId` before enabling
  automatic retries.

- Treat server-returned `name`, `personality`, `power`, and `imageURL` as canonical.

- Poll state while either `active` or `queued` is nonempty.

- Add failed-job UI using the additive `failed` array. Do not leave a failed
  generation looking active forever.

- Render `imageURL` through the shared authenticated media cache. Do not use
  unauthenticated `AsyncImage`; cached immutable output remains available
  offline after its first successful retrieval.

- After reveal or favorite mutations, reconcile from the returned object or
  the next state response instead of permanently relying on optimistic state.

- Do not embed provider credentials, prompts, ingredient definitions,
  concurrency policy, or card-generation rules in the iPad.

---

## Errors

Server errors use:

```json
{"error": "human-readable summary", "code": "stable_machine_code"}
```

Unknown fields are rejected so contract drift is visible during development.

### Error codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `invalid_ingredient` | 400 | Unknown creature/outfit/buddy ID |
| `conflict` | 409 | `requestId` reused with different recipe |
| `queue_full` | 429 | Server queue at capacity |

---

## Client Implementation Status

The iOS client has been updated to match this contract:

| Requirement | Status |
|-------------|--------|
| Send three IDs | ✅ |
| Optional `requestId` field | ✅ (sends null for now) |
| Handle 409 conflict | ✅ |
| Handle 429 queue full | ✅ |
| Poll while active/queued nonempty | ✅ |
| Failed job UI with retry/dismiss | ✅ |
| Authenticated immutable image retrieval | ✅ |
| Reconcile from server state | ✅ |

---

## Files

| File | Purpose |
|------|---------|
| `Models/CreatureCardModels.swift` | Models matching this contract |
| `ViewModels/CreatureBuilderViewModel.swift` | API calls, error handling |
| `Views/CreatureBuilder/MakingView.swift` | Failed job UI |
