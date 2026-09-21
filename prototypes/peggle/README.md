# Plink / Peg Battle (Abbie's World Peggle)

Kid-facing game name: **Plink**. The playable duel is **Peg Battle**. Internal key: `peggle`.

`/` is the Bad Doggo Peg Battle. `/dev/peg-battle` is the developer harness (seed, reset, debug). `/plink` is the older marble-drop toy.

Content lives in `AssetSources/World2/minigames/peg-battle/` and is copied into this prototype and the iOS bundle by `python3 scripts/minigame_packs/sync.py --pack peg-battle`.

## Run

Port **5174**. Never silently pick another.

```sh
cd prototypes/peggle
npm install
npm run check
npm run dev
```

Open http://127.0.0.1:5174 and http://127.0.0.1:5174/dev/peg-battle


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

The web flow currently has a **parked** Safari map, loadout, and mixed-critter clash overlay. Product spec is 1v1 (one animal, one opponent) in `docs/minigames/PLINK-PLAN.md`. Do not treat the swarm overlay as the iOS game.

Soundtrack for now: Abbie's World on safari; Cheerful Dance and Blocks in the Game on the board.

## Data

`GET /api/catalog` loads the bundled `data/campaign.json` (kept identical to `AssetSources/World2/minigames/plink/campaign.json`).

If `ABBIES_SERVER_URL` is set, the same route asks Game Asset API v1 for `minigames/plink/campaign` and uses that payload when it looks like a campaign. Missing server support falls back to the bundled file and says so in the footer (`data source: bundled` or `server`).

`PUT /api/progress` keeps local progress in memory and, when the read key is present, forwards it to the player minigame route. That server route may not exist yet; the prototype still plays.

## Inspect

```sh
curl -s http://127.0.0.1:5174/api/catalog | jq .inspect
```
