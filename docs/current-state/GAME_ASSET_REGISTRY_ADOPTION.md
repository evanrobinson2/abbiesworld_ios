# Game Asset Registry Adoption

Use the Game Asset API v1 for assets introduced by a new game. It replaces the
pattern of creating a game-specific static folder or another one-off asset API.
Existing games and legacy routes continue to work while they migrate.

The contract supports:

- server-hosted files;
- external HTTPS CDN files;
- resources bundled in an iOS target;
- arbitrary game metadata;
- immutable revisions and optimistic concurrency.

The server publishes its machine-readable contract at:

```http
GET /api/v1/asset-schema
```

Treat that endpoint as the deployment readiness check. If it returns `404`,
the target server has not yet deployed Game Asset API v1 and the game must keep
using its bundled fallback rather than inventing another route.

## Responsibilities

There are two deliberately separate access levels.

- A developer tool, CI job, or trusted server uses
  `ASSET_REGISTRY_ADMIN_API_KEY` to register games and upsert assets.
- A shipped iOS game uses the existing read API key in `ServerConfig` to list
  and fetch assets.

Never place the admin credential in source, `Info.plist`, an asset catalog, an
app bundle, or `UserDefaults`. The existing client read credential is locally
provisioned into Keychain by `ServerConfig`.

## 1. Choose stable keys

Choose one lowercase game key and keep it for the lifetime of the game:

```text
cozy-furniture
```

Organize that game's asset keys like paths:

```text
backgrounds/shop
characters/shopkeeper/idle
ingredients/coral-planks
music/shop-theme
ui/buttons/home
```

Keys may contain lowercase letters, numbers, dots, dashes, underscores, and
slashes. Treat keys as semantic identifiers, not filenames. A file format,
colorway, or revision should normally be metadata rather than part of the key.

## 2. Register the game

Run write commands only from a trusted developer shell or tool:

```bash
export ABBIES_SERVER_URL="https://your-server.example"
export ASSET_REGISTRY_ADMIN_API_KEY="<developer-secret>"

curl --fail-with-body \
  -X PUT "$ABBIES_SERVER_URL/api/v1/games/cozy-furniture" \
  -H "Authorization: Bearer $ASSET_REGISTRY_ADMIN_API_KEY" \
  -H "X-Actor-ID: evan" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "Cozy Furniture",
    "metadata": {
      "team": "world-2",
      "minimumClientVersion": "1.0"
    }
  }'
```

The returned game can subsequently be addressed by its stable key, UUID, or
display name. Client code should prefer the stable key.

## 3. Upsert assets

### Hosted file

```bash
curl --fail-with-body \
  -X PUT \
  "$ABBIES_SERVER_URL/api/v1/games/cozy-furniture/assets/ingredients/coral-planks" \
  -H "Authorization: Bearer $ASSET_REGISTRY_ADMIN_API_KEY" \
  -H "X-Actor-ID: asset-pipeline" \
  -F "file=@coral-planks.png;type=image/png" \
  -F 'metadata={
    "label":"Coral Furniture Planks",
    "category":"lumber",
    "role":"furniture-store-ingredient",
    "tags":["wood","planks","coral"]
  }' \
  -F "expectedRevision=0"
```

Use `expectedRevision=0` when creating an asset and the revision you last read
when updating one. A stale write receives `409 asset_revision_conflict` instead
of silently replacing another developer's work.

### External CDN file

```bash
curl --fail-with-body \
  -X PUT \
  "$ABBIES_SERVER_URL/api/v1/games/cozy-furniture/assets/music/shop-theme" \
  -H "Authorization: Bearer $ASSET_REGISTRY_ADMIN_API_KEY" \
  -H "X-Actor-ID: audio-pipeline" \
  -H "Content-Type: application/json" \
  --data '{
    "source": {
      "type": "external",
      "url": "https://cdn.example.com/cozy-furniture/shop-theme.m4a"
    },
    "metadata": {
      "role": "music",
      "loop": true
    },
    "expectedRevision": 0
  }'
```

External URLs must use HTTPS and must not contain embedded credentials.

### Bundled iOS resource

```bash
curl --fail-with-body \
  -X PUT \
  "$ABBIES_SERVER_URL/api/v1/games/cozy-furniture/assets/ui/buttons/home" \
  -H "Authorization: Bearer $ASSET_REGISTRY_ADMIN_API_KEY" \
  -H "X-Actor-ID: ios-developer" \
  -H "Content-Type: application/json" \
  --data '{
    "source": {
      "type": "bundled",
      "bundleName": "cozy_room_home_button"
    },
    "metadata": {
      "role": "button",
      "platform": "ios"
    },
    "expectedRevision": 0
  }'
```

A bundled record has no `deliveryURL`. Resolve `source.bundleName` through the
appropriate asset catalog or bundle API.

## 4. Read from an iOS game

Current metadata is read from:

```http
GET /api/v1/games/{game-key}/assets/{asset-key}
```

The response identifies the source and current immutable revision:

```json
{
  "schemaVersion": 1,
  "gameKey": "cozy-furniture",
  "key": "ingredients/coral-planks",
  "revision": 3,
  "source": {
    "type": "hosted",
    "filename": "coral-planks.png"
  },
  "deliveryURL": "/api/v1/asset-content/.../3/coral-planks.png",
  "mimeType": "image/png",
  "sha256": "content-sha256",
  "metadata": {
    "role": "furniture-store-ingredient"
  }
}
```

The following small reader shows the required client behavior. It is an
adoption example, not a claim that a shared `GameAssetReader` already exists in
the app:

```swift
import Foundation
import UIKit

struct RegistryAsset: Decodable {
    struct Source: Decodable {
        let type: String
        let bundleName: String?
    }

    let key: String
    let revision: Int
    let source: Source
    let deliveryURL: String?
    let mimeType: String?
    let sha256: String?
}

enum RegistryAssetLocation {
    case bundled(name: String)
    case remote(url: URL, requiresReadCredential: Bool)
}

struct GameAssetReader {
    let gameKey: String

    func current(_ assetKey: String) async throws -> RegistryAsset {
        var url = try serverBaseURL()
        for component in ["api", "v1", "games", gameKey, "assets"] {
            url.appendPathComponent(component)
        }
        for component in assetKey.split(separator: "/") {
            url.appendPathComponent(String(component))
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 10
        ServerConfig.shared.addAPIKeyHeader(to: &request)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(RegistryAsset.self, from: data)
    }

    func location(for assetKey: String) async throws -> RegistryAssetLocation {
        let asset = try await current(assetKey)
        if asset.source.type == "bundled",
           let name = asset.source.bundleName {
            return .bundled(name: name)
        }

        guard let value = asset.deliveryURL,
              let base = URL(string: ServerConfig.shared.baseURL),
              let url = URL(string: value, relativeTo: base)?.absoluteURL else {
            throw URLError(.badURL)
        }
        return .remote(url: url, requiresReadCredential: value.hasPrefix("/"))
    }

    private func serverBaseURL() throws -> URL {
        guard let url = URL(string: ServerConfig.shared.baseURL) else {
            throw URLError(.badURL)
        }
        return url
    }
}
```

When loading a remote location, add `ServerConfig` authentication only when
`requiresReadCredential` is true. Do not forward Abbie's World credentials to
an external CDN host. Immutable delivery URLs may be cached according to their
response headers.

For images, a bundled location maps to `UIImage(named:)`; a remote location is
downloaded and decoded with `UIImage(data:)`. Audio and data files use the same
location resolution but their own decoders.

## Offline and failure behavior

- Bundle the minimum art and data needed to start or recover the game.
- Register bundled fallbacks under the same game contract.
- Do not block a playable game forever waiting for registry metadata.
- Treat a missing asset, failed hash check, or unsupported MIME type as a
  visible diagnostic in developer mode.
- Fetch the current record when starting a session, then keep its revision
  stable for that session.
- Use `/revisions/{revision}` when a replay or saved game must pin exact bytes.

World 2's existing `AssetBootstrapService` demonstrates bundled-first startup
and cache behavior, but its `/api/world2/manifest` endpoint is legacy. New games
should preserve the offline behavior while using `/api/v1/games/.../assets`.

## Asset Carving Lab handoff

The age-gated [Asset Carving Lab](../../AssetSources/CozyRoomKit/DEV-CARVING-LOOP.md)
creates reviewed transparent PNGs and a review manifest. Saving a reviewed set
does not publish it. A trusted developer tool should upload approved files to
the registry with:

- the game key selected explicitly;
- a stable asset key for every approved item;
- label, category, role, tags, crop bounds, and source hash in metadata;
- `expectedRevision` copied from the latest server record.

This keeps parent review separate from production publication.

## Textual verification

These checks make an adoption inspectable without launching the game:

```bash
# Contract exists and returns JSON.
curl --fail-with-body \
  -H "Authorization: Bearer $ABBIES_WORLD_SERVER_API_KEY" \
  "$ABBIES_SERVER_URL/api/v1/asset-schema"

# Inspect all ingredient records.
curl --fail-with-body \
  -H "Authorization: Bearer $ABBIES_WORLD_SERVER_API_KEY" \
  "$ABBIES_SERVER_URL/api/v1/games/cozy-furniture/assets?prefix=ingredients"

# Inspect immutable history for one key.
curl --fail-with-body \
  -H "Authorization: Bearer $ABBIES_WORLD_SERVER_API_KEY" \
  "$ABBIES_SERVER_URL/api/v1/games/cozy-furniture/assets/ingredients/coral-planks/revisions"
```

Also verify in source review that:

- the game has one declared stable game key;
- asset keys are semantic and namespaced;
- no admin credential is present in the app;
- external delivery requests do not receive the server authorization header;
- critical assets have an intentional offline fallback.

## Migration from a legacy game

Migrate one asset family at a time:

1. Register the game's stable key.
2. Mirror existing bundled or external assets into registry records.
3. Move one client call site to the v1 read route.
4. Validate offline and authentication behavior.
5. Stop adding new files to the old route.
6. Remove legacy delivery only after every supported client has migrated.

No legacy route needs to be renamed or removed to begin adoption.
