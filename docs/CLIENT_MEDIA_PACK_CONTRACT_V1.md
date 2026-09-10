# Abbie's World — Client Media-Pack Contract V1

Existing client requests remain supported. The following contract applies when adopting server-managed packs.

---

## 1. Discover Packs

```
GET /api/media-packs
```

Then download the selected immutable manifest:

```
GET /api/media-packs/{packId}/versions/{version}/manifest
```

---

## 2. Client Responsibilities

- Render manifest rows and items generically.
- Enforce `minimumSelections` and `maximumSelections`.
- Display server-provided accessibility labels and spoken cues.
- Download backgrounds, thumbnails, references, and music from manifest URLs.
- Verify asset SHA-256 checksums.
- Cache content by `packId`, `packVersion`, and `manifestChecksum`.
- Retain a last-known-good cached version.
- Never construct pack prompts or send bundle file paths.
- Never use the media-pack administrative API key.

---

## 3. Image-Generation Request

```
POST /api/create
```

```json
{
  "packId": "animal-avenue",
  "packVersion": 1,
  "packManifestChecksum": "64-character-lowercase-sha256",
  "packSelections": [
    {
      "rowId": "friend",
      "itemId": "star-puppy"
    }
  ],
  "freeTextDescription": "Playing beside flowers",
  "imageWidth": 1024,
  "imageHeight": 1024
}
```

- `packVersion` and `packManifestChecksum` are **required**.
- Do **not** include `recipeItems` or `referenceImageIds` in a pack request.

---

## 4. Generation Response

The existing SSE statuses remain unchanged:

- `generating_prompt`
- `prompt_generated`
- `generating_image`
- `partial_image`
- `done`
- `error`

`prompt_generated` and `done` include:

```json
{
  "mediaPack": {
    "packId": "animal-avenue",
    "packVersion": 1,
    "packVersionId": "...",
    "manifestChecksum": "...",
    "selections": [
      {
        "rowId": "friend",
        "itemId": "star-puppy"
      }
    ],
    "referenceAssetIds": ["..."]
  }
}
```

---

## 5. Cache Updates

Refresh the pack catalog after either SSE event:

- `media_packs_updated`
- `reload_cache`

---

## 6. Client Pack Export

Export one ZIP:

```
pack.zip
├── pack.json
└── assets/
    ├── characters/
    ├── clothing/
    ├── places/
    ├── styles/
    ├── backgrounds/
    └── music/
```

The authoritative JSON schema is:

```
src/media_packs/pack.schema.json
```

Validate an export with:

```bash
python -m src.media_packs.cli validate pack.zip
```

---

## 7. Migration

1. Keep existing bundled packs as fallback initially.
2. Import, review, and publish their server equivalents.
3. Switch each bundled pack to manifest-driven rendering after it passes comparison and generation tests.
4. Remove bundled definitions only after the server-managed versions are proven on the target iPad.

---

## iOS Implementation

The following components implement this contract:

| Component | File | Responsibility |
|-----------|------|----------------|
| Models | `Models/ServerMediaPack.swift` | `PackIndexResponse`, `PackManifest`, `PackRow`, `PackItem`, `PackGenerationRequest` |
| Service | `Services/ServerMediaPackService.swift` | Fetch pack index, download manifests, verify SHA-256 checksums |
| Cache | `Services/MediaPackCache.swift` | Disk cache by pack/version/checksum, LKG retention |
| Manager | `Services/MediaPackManager.swift` | Orchestration, fallback to bundled, validation |
| SSE | `Services/SSEService.swift` | Handles `media_packs_updated` event |
| View | `Views/Components/PackRowView.swift` | Generic row rendering from manifest |
| ViewModel | `ViewModels/MainViewModel+ServerPacks.swift` | Server pack generation integration |

### Usage

```swift
// Refresh pack index
await MediaPackManager.shared.refreshPackIndex()

// Load a manifest
let manifest = await MediaPackManager.shared.loadManifest(for: packEntry)

// Create generation request
let request = MediaPackManager.shared.createGenerationRequest(
    manifest: manifest,
    selections: ["friend": "star-puppy", "outfit": "rainbow-raincoat", ...],
    freeTextDescription: "Playing beside flowers"
)

// Validate before generating
let errors = MediaPackManager.shared.validateSelections(selections, for: manifest)
```
