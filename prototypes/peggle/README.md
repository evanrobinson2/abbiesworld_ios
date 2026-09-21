# Plink (Abbie's World Peggle)

Localhost prototype for **Peggle Land** and **The Plink Pavilion**.

Kid-facing game name: **Plink**. Internal game key: `peggle`.

This is the playable first slice. The iOS app registers the same land, POI, and campaign JSON. Painted production art is generated through the World 2 asset pipeline; until those derivatives are parent-approved, the prototype draws the board in code.

## Run

This uses the existing studio localhost port **5174**. Stop the asset browser first if it is already bound there.

```sh
cd prototypes/peggle
npm install
npm run check
npm run dev
```

Open http://127.0.0.1:5174

Play the same prototype on Vercel (no localhost): https://abbies-world-plink.vercel.app

Flow a six-year-old can follow:

1. Peggle Land overland.
2. Tap **The Plink Pavilion**.
3. Pick a bed.
4. Drag to aim, release to drop the dewdrop marble.
5. Wake every **glow seed**. Extra drops come from bowls; the garden always gifts one last drop.

## Data

`GET /api/catalog` loads the bundled `data/campaign.json` (kept identical to `AssetSources/World2/minigames/plink/campaign.json`).

If `ABBIES_SERVER_URL` is set, the same route asks Game Asset API v1 for `minigames/plink/campaign` and uses that payload when it looks like a campaign. Missing server support falls back to the bundled file and says so in the footer (`data source: bundled` or `server`).

`PUT /api/progress` keeps local progress in memory and, when the read key is present, forwards it to the player minigame route. That server route may not exist yet; the prototype still plays.

## Inspect

```sh
curl -s http://127.0.0.1:5174/api/catalog | jq .inspect
```
