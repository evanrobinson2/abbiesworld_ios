# Game Oracle

Production: https://abbies-game-oracle.vercel.app (Vercel project `abbies-game-oracle`, built from this folder on
`main` through GitHub).

The Game Oracle is Abbie's World's game knowledge and game design director. It answers two kinds of question:

1. **What do we know about games?** Evan's Steam library, game identity records (`docs/oracle/identity`), Steam
   study profiles (`tools/steam-study`), the game art catalog, anatomy studies of open-source games, design lessons,
   and the presentation styles from the Fritigern scene and `docs/oracle/BACKLOG.md`.
2. **How should this idea play?** `consult` turns a plain-language idea into a design plan: verbs, rules, a goal,
   story beats, choices, a presentation style (`clean`, `cinema`, `storybook`, `hud`, `telltale`) and requests for
   the model, sound, voice and music factories, grounded in the closest studies. It takes style and mechanics from
   reference games, never their expression (GAME_IDENTITY.md, "The legal line").

History: built on Evan's PC on 2026-10-20 and 21 (`ChatGPT\Abbie's Overland Map Generator\oracle`) and CLI-deployed
from there. Moved into this repo on 2026-10-22. The data files were taken from the live deployment, which matched
the PC copy byte for byte. The ingestion scripts (`oracle\work\*.py`) stay on the PC: they read local Steam
manifests. `data/catalog.json` is the sanitized snapshot they produced; don't overwrite the historical owned
snapshot with installed apps.

## Pages and API

| Path | What |
| --- | --- |
| `/ask` | Ask the Oracle (uses the model; rate-limited per address) |
| `/steam` | Steam library index: installed games, owned snapshot, styles, which games have identity records |
| `/`, `/game-anatomy`, `/research-100` | Game art library, anatomy studies, 100-game research list |
| `GET /api/steam?q=&installed=` | Steam library index as JSON |
| `GET /api/knowledge?q=&kinds=&limit=` | One ranked search over identities, Steam profiles, anatomy, lessons, catalog, styles |
| `GET /api/knowledge?identity=<slug or app id>` | One identity record and its Steam profile |
| `GET /api/consult` | Plan schema, styles, audiences, model |
| `POST /api/consult {idea, audience: kid\|family\|maker, style?}` | A design plan (`oracle.plan.v1`) |
| `POST /api/mcp` | Stateless MCP: `search_games`, `get_game`, `find_similar_games`, `get_catalog_coverage`, `search_game_anatomy`, `get_game_anatomy`, `search_oracle`, `get_game_identity`, `steam_library`, `consult_oracle` |
| `GET /api/games`, `/api/anatomy`, `/api/meta` | The original catalog and anatomy APIs |

## Who can spend model money

`consult` calls the AI Gateway (default `anthropic/claude-sonnet-5.5`, override with `ORACLE_MODEL`) with the
project's OIDC token, and only for:

- server callers that send `x-oracle-key: $ORACLE_KEY` (studio-mock's dispatch tools and Ranch live mode), and
- the Oracle's own `/ask` page (same origin), at most `ORACLE_PAGE_LIMIT` (default 8) plans per address per hour.

Everyone else, including MCP callers without the key, gets a free plan assembled from the studies
(`source: "studies"`). `ORACLE_MODEL_ENABLED=false` switches the model off everywhere.

## Working on it

```
npm test                     # node 22+
node sync-repo-data.mjs      # after changing docs/oracle/identity or docs/oracle/games
npm run build                # sync, tests, then copy static files into public/
```

`data/repo-knowledge.json` is generated from `docs/oracle`; edit the docs, not the bundle. Keep the "no machine
paths, account ids or secrets" tests passing. Steam profiles and identity records hold derived notes only, never a
game's meshes, textures, audio or text.
