# Abbie's World for iOS

This repository contains the main iOS app and its standalone game prototypes.
Games should remain independently testable while using shared platform
contracts for server configuration, authentication, and assets.

## Developing a game

Start with these guides:

1. [Standalone minigame pattern](docs/current-state/STANDALONE_MINIGAME_PATTERN.md)
   explains the expected view, model, service, and integration boundaries.
2. [Game Asset Registry adoption](docs/current-state/GAME_ASSET_REGISTRY_ADOPTION.md)
   is the standard for new game images, audio, data, and metadata.
3. [Documentation index](docs/README.md) links the current architecture,
   minigame briefs, integrations, and future plans.

## Asset rule for new games

Every game gets one stable registry key and owns namespaced asset keys such as:

```text
cozy-furniture
  backgrounds/shop
  ingredients/coral-planks
  music/shop-theme
  ui/buttons/home
```

Assets may be hosted by the server, point to an external HTTPS CDN, or name a
resource bundled in the app. All three use the same metadata and immutable
revision contract.

Do not create a new static folder or game-specific API route for new assets.
Do not ship `ASSET_REGISTRY_ADMIN_API_KEY` in an app target; iOS clients only
receive the read credential managed by `ServerConfig`.

## Repository map

- `abbies.world.ios/` — Xcode project and main application source
- `docs/` — current patterns, feature contracts, and development guides
- `AssetSources/` — reviewed source art, manifests, and provenance
- `scripts/` — repeatable asset preparation and validation tools
- standalone game directories — isolated prototypes that can later join the app

Open `abbies.world.ios/abbies.world.ios.xcodeproj` in Xcode to build the main
application.
