# Marble Voyage — App Store package

Standalone Peglin×FTL voyage game shipping inside Abbie’s World today, ready to spin out as its own iPad listing.

## Product

| Field | Value |
| --- | --- |
| Display name | **Abbie's World** (in-app: Abbie's World · Marble Voyage) |
| Subtitle | Peglin fights on an FTL star chart |
| Price (US) | **Free** (forever — no IAP in v1) |
| Device | iPad, landscape |
| Age | 4+ (no ads, no tracking SDKs in v1) |
| Modes | **Campaign** — 10 fight stages + events + boss · **Endless** — rising threat, best streak saved |
| Analytics | **App Store Connect Analytics only** (Apple-provided; no third-party SDK) |

## Analytics — what Apple already gives you

For any App Store app (including free), **App Store Connect → Analytics** is enough for downloads / usage. No extra SDK and no ATT prompt.

| Metric | Where | Notes |
| --- | --- | --- |
| Downloads / first-time downloads | App Analytics | Units for free apps = installs |
| Impressions, product page views | App Analytics | Funnel before install |
| Sessions, active devices | App Analytics | Usage after install |
| Retention (1 / 2 / 7 / 14 / 28 day) | App Analytics | Comes back or not |
| Source type (App Store search, browse, etc.) | App Analytics | How they found you |
| Crashes | Xcode Organizer / App Store Connect | Stability |
| Sales & Trends | Trends | Downloads over time (still useful when price = Free) |

**Gaps Apple does not fill:** which mode they pick (Campaign vs Endless), stage reached, fight win rate. Those need a light first-party event log or a privacy-friendly SDK later — not required for “are people downloading and opening it?”

**Do not add** IDFA / ATT / ad networks for v1. Free + Apple Analytics keeps the privacy nutrition label simple (no tracking).

## Play now

**Standalone (default app boot):** Abbie's World intro → fade → Marble Voyage title → Campaign / Endless.

**Household world:** launch with `-launchWorld2`.

**Inside Peglin map (household):** **Marble Voyage** button, or `-launchMarbleVoyage`.

## Art & sound

- Plates: semantic registry IDs via `MarbleVoyageArt` (`map.peglin.*`).
- Battle SFX: existing CC0 pack `Resources/SFX/Plink/` through `PlinkSFX` / `MarbleVoyageAudio`.
- Music: `PlinkMusicService` safari/board cues during fights.

## Code map

- Models: `MarbleVoyageModels.swift` (modes, chart generators, difficulty)
- Shell: `MarbleVoyageHostView.swift` (title, chart, events, end cards)
- Fights: `PlinkBattleHostView` + `overrideEnemyMaxHP` / `overrideEnemyAttack` / carried HP
- Tests: `MarbleVoyageTests.swift`

## Spin-out checklist (free App Store)

1. New Xcode target / bundle id (e.g. `world.abbies.marblevoyage`) with display name **Marble Voyage**.
2. Extract Plink continuum + voyage shell + SFX/music resources (no Auth0 / world sync required for free v1).
3. App Store Connect: price **Free**, iPad only, screenshots of title / chart / fight.
4. Privacy nutrition label: no data collected for tracking; optional “Product Interaction” / diagnostics only if you later add first-party events.
5. Age rating questionnaire → 4+.
6. Review notes: “Free game; Campaign 10 stages + Endless. No account, no ads, no IAP.”
7. After ship: watch **App Analytics** weekly for downloads, sessions, retention.

## Pricing note

Listing stays **Free forever**. Monetization (if ever) would be a separate decision — not required for download/usage visibility.
