# Creature Card Builder — Server Contract

**From:** iOS Client  
**To:** Server Team  
**Date:** 2026-09-11  
**Status:** Client implementation complete, awaiting server endpoints

---

## Overview

The iOS client for Creature Card Builder is complete and expects the following API contract. Server may accommodate or correct as needed.

---

## 1. Create Generation

### Request

```http
POST /api/games/creature-builder/generations
Content-Type: application/json
```

```json
{
  "creatureId": "dragon",
  "outfitId": "lightning-racer",
  "buddyId": "bat"
}
```

### Expected Response

```http
HTTP/1.1 201 Created
Content-Type: application/json
```

```json
{
  "generationId": "gen_abc123",
  "cardId": "card_xyz789",
  "status": "queued"
}
```

### Notes

- Client sends only IDs — server resolves ingredient definitions
- Server creates the generation job and returns immediately
- Client does NOT wait for generation to complete
- Up to 3 concurrent generations per user; additional requests should queue

---

## 2. Get Player State

### Request

```http
GET /api/games/creature-builder/state
```

### Expected Response

```json
{
  "active": [
    {
      "id": "gen_abc123",
      "cardId": "card_xyz789",
      "creatureId": "dragon",
      "outfitId": "lightning-racer",
      "buddyId": "bat",
      "status": "generating",
      "createdAt": "2026-09-11T22:00:00Z",
      "updatedAt": "2026-09-11T22:00:05Z",
      "errorMessage": null
    }
  ],
  "queued": [],
  "readyToReveal": [
    {
      "id": "card_def456",
      "generationId": "gen_older",
      "recipe": {
        "creatureId": "bunny",
        "outfitId": "astronaut",
        "buddyId": "cheetah"
      },
      "name": "Comet Bunny",
      "personality": "Fast, curious, and always reaching for the stars.",
      "powerName": "Stellar Hop",
      "imageURL": "/static/creature-cards/card_def456.png",
      "createdAt": "2026-09-11T21:55:00Z",
      "isFavorite": false,
      "isRevealed": false
    }
  ],
  "collection": [
    {
      "id": "card_old123",
      "generationId": "gen_old",
      "recipe": {
        "creatureId": "robot",
        "outfitId": "ninja",
        "buddyId": "owl"
      },
      "name": "Shadow Circuit",
      "personality": "Silent, calculating, and surprisingly wise.",
      "powerName": "Stealth Protocol",
      "imageURL": "/static/creature-cards/card_old123.png",
      "createdAt": "2026-09-11T20:00:00Z",
      "isFavorite": true,
      "isRevealed": true
    }
  ]
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `queued` | Waiting for generation slot |
| `generating` | Image generation in progress |
| `assembling` | Post-processing (optional) |
| `ready` | Complete, awaiting reveal |
| `revealed` | User has seen the card |
| `failed` | Generation failed |

### Notes

- Client polls this endpoint every ~3 seconds while jobs are active
- `readyToReveal` contains completed cards the user hasn't revealed yet
- `collection` contains all revealed cards (sorted by createdAt desc preferred)
- Client can fully restore UI state from this single response

---

## 3. Reveal Card

### Request

```http
POST /api/games/creature-builder/cards/{cardId}/reveal
```

No body required.

### Expected Response

```json
{
  "card": {
    "id": "card_xyz789",
    "generationId": "gen_abc123",
    "recipe": {
      "creatureId": "dragon",
      "outfitId": "lightning-racer",
      "buddyId": "bat"
    },
    "name": "Nightbolt Dragon",
    "personality": "Mischievous, fearless, and happiest after dark.",
    "powerName": "Midnight Lightning",
    "imageURL": "/static/creature-cards/card_xyz789.png",
    "createdAt": "2026-09-11T22:00:00Z",
    "isFavorite": false,
    "isRevealed": true
  }
}
```

### Notes

- Marks the card as revealed in persistent storage
- Returns the full card object for confirmation
- Idempotent — calling twice is safe

---

## 4. Toggle Favorite

### Request

```http
POST /api/games/creature-builder/cards/{cardId}/favorite
Content-Type: application/json
```

```json
{
  "favorite": true
}
```

### Expected Response

```json
{
  "success": true,
  "favorite": true
}
```

---

## 5. Server-Side Generation Flow

The server should:

### Step 1: Resolve Ingredients

Look up canonical definitions for `creatureId`, `outfitId`, `buddyId`.

### Step 2: Generate Creature Concept

Use AI to synthesize a coherent creature concept:

```json
{
  "name": "Nightbolt Dragon",
  "personality": "Mischievous, fearless, and happiest after dark.",
  "powerName": "Midnight Lightning",
  "visualConcept": "A powerful dragon in an electric racing uniform with gothic nighttime accents and a tiny bat companion perched on its shoulder."
}
```

**Important:** The name should be creative and reflect the combination — NOT just "Dragon Lightning Racer Bat".

### Step 3: Generate Image Prompt

Build an image generation prompt from the visual concept. Target:
- Portrait composition
- Clear face, recognizable creature
- Recognizable outfit/uniform
- Visible buddy companion
- Strong silhouette
- Uncluttered background
- Child-friendly, consistent style

### Step 4: Generate Image

Use fast generation settings (speed > quality for interactive game).

### Step 5: Store Card

Persist the card with all metadata. Mark status as `ready`.

---

## 6. Ingredient Definitions

The client has these hardcoded (for display purposes). Server should have canonical definitions with prompt text.

### Creatures

| ID | Name | Suggested Prompt Fragment |
|----|------|---------------------------|
| `abbie` | Abbie | a cheerful young girl with bright curious eyes |
| `dragon` | Dragon | a powerful but friendly dragon with expressive eyes |
| `robot` | Robot | a cute robot with glowing eyes and friendly demeanor |
| `bunny` | Bunny | an adorable bunny with soft fur and big ears |
| `cat` | Cat | a playful cat with bright eyes and fluffy tail |
| `dinosaur` | Dinosaur | a friendly dinosaur with a big smile |
| `alien` | Alien | a cute alien with big eyes and antennae |
| `monster` | Monster | a silly friendly monster with a goofy grin |

### Outfits

| ID | Name | Power Concept |
|----|------|---------------|
| `lightning-racer` | Lightning Racer | extreme speed and electrical energy |
| `astronaut` | Astronaut | space exploration and zero gravity |
| `ninja` | Ninja | stealth, agility, and shadow powers |
| `wizard` | Wizard | magic spells and mystical powers |
| `knight` | Knight | bravery, protection, and honor |
| `firefighter` | Firefighter | fire resistance and rescue abilities |
| `superhero` | Superhero | super strength and flying |
| `pirate` | Pirate | treasure hunting and sea adventures |

### Buddies

| ID | Name | Personality Traits |
|----|------|-------------------|
| `bat` | Bat | spooky, mischievous, gothic, nocturnal |
| `cheetah` | Cheetah | fast, competitive, energetic, athletic, confident |
| `puppy` | Puppy | happy, loyal, playful, friendly |
| `owl` | Owl | clever, mysterious, calm, magical |
| `unicorn` | Unicorn | magical, graceful, pure, dreamy |
| `peacock` | Peacock | dramatic, proud, colorful, glamorous |
| `frog` | Frog | bouncy, silly, nature-loving, adventurous |
| `fox` | Fox | clever, cunning, curious, playful |

---

## 7. Error Handling

### Failed Generation

If generation fails, set status to `failed` with an `errorMessage`:

```json
{
  "id": "gen_abc123",
  "status": "failed",
  "errorMessage": "Image generation timed out"
}
```

Client will display: "Oops! The creature machine got confused." with a retry option.

### Invalid Ingredient ID

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "error": "invalid_ingredient",
  "message": "Unknown creatureId: 'unicorn'"
}
```

---

## 8. Concurrency Rules

- Maximum 3 active generations per user
- Additional requests enter `queued` status
- When an active slot frees, promote oldest queued job
- No hard limit on queue size (but could add one)

---

## 9. Persistence

- Generation jobs survive app close and server restart
- Cards are permanent (no expiration)
- Favorites are persisted
- Reveal status is persisted

---

## 10. Image Serving

Cards should be served from a stable URL path:

```
/static/creature-cards/{cardId}.png
```

Or CDN equivalent. Client uses `imageURL` from the card object directly.

---

## 11. Authentication

Use existing Abbie's World authentication (API key header). No separate auth for this game.

---

## 12. Questions for Server Team

1. **Image generation config** — Should this use a separate "fast" config, or existing defaults?

2. **Name generation** — Any restrictions on generated names? (profanity filter, length limits)

3. **Rate limiting** — Any per-user limits beyond the 3 concurrent slots?

4. **Retry behavior** — Should failed jobs auto-retry, or require explicit client retry?

5. **Cleanup** — Any TTL on failed jobs? Or keep them for debugging?

---

## Client Implementation Reference

| File | Purpose |
|------|---------|
| `Models/CreatureCardModels.swift` | All data models matching this contract |
| `ViewModels/CreatureBuilderViewModel.swift` | API calls, polling, state management |
| `docs/CREATURE_CARD_BUILDER.md` | Full game spec (41 sections) |

The client is ready to test as soon as endpoints exist.
