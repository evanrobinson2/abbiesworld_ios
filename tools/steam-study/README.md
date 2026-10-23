# Steam study tool (Game Oracle)

Studies games Evan owns on Steam so the Game Oracle can learn from their design. It never copies a game's art,
models, audio or code into this repo; only derived notes and profiles land here (`docs/oracle/games/`).

Runs on Evan's Windows PC, through the Steam client he is already signed in to. It never reads or handles his
Steam password or login files.

```
python steam_study.py list [--json]          # games installed in every Steam library on this PC
python steam_study.py owned STEAMID64        # full owned list; needs Steam profile Game details: Public
python steam_study.py install APPID          # opens Steam's own install dialog (Evan clicks Install)
python steam_study.py profile APPID [...]    # writes docs/oracle/games/<slug>.json
```

A profile has public store metadata, an engine fingerprint taken from file names in the install folder (never
file contents), and an empty `identity` block (core loop, mechanics, UI and game feel, information grammar, camera,
art direction, palette, audio mood, pacing, lessons) for the Oracle to fill from play sessions, screenshots and public docs.
Fill `information_grammar` in the shape of `layers.information_grammar` in
`docs/oracle/identity/game-identity.schema.json` (schema 1.1; see the section in `GAME_IDENTITY.md`).
Screenshots or captures used for study stay on the PC (`%LOCALAPPDATA%\AbbiesWorld\game-study`), not in git.

`docs/oracle/games/_installed.json` is the snapshot of installed games (appid, name, size) from 2026-10-22.

## Cloud study notes (2026-10-23)

`library_notes.py` (Evan's 87 installed games) and `free_notes.py` (25 free-to-play games picked across genres, not
installed) hold the Oracle's study of each game in our own words: core loop, feel, how it shows information (mix of
diegetic, spatial, meta, overlay and none, plus HUD share), art, audio, a lesson for Abbie's World, and a Game DNA of
8 axes (tempo, challenge, expression, structure, social, systems, chance, session). Free games also get a short
review. `python study_games.py` writes them into the profiles; then `node sync-repo-data.mjs` in
prototypes/game-oracle. Values are estimates from public knowledge, marked with their confidence; games released
too recently to know are marked "needs play session".

`owned_notes.py` (added overnight 2026-10-23) studies the games in the owned snapshot that aren't installed, in
waves ordered by what they can teach Abbie's World. Those profiles carry `study.set: "owned"` and `installed: false`.
The Oracle shows any profile as a page at `/game?id=<appid or slug>`.

`reference_notes.py` (2026-10-23) studies reference games outside the library that studies kept asking the Oracle
about: cozy shop games for the café (Coffee Talk, Unpacking, A Little to the Left, Animal Crossing: New Horizons),
fighting games for Brute Fight (Street Fighter 6, Super Smash Bros. Ultimate, Absolver), and climbing and kid-friendly
stealth for the School Jump (A Short Hike, Jusant, Untitled Goose Game). Those profiles carry `study.set: "reference"`
and `owned: false`; Nintendo games have no app id and are found by slug. Each also has a hand entry in
`rendering_notes.py` ("How it's drawn") and a full identity record in `docs/oracle/identity/examples/`, so `consult`
can ground plans in them. To add another, add a row here, a HAND entry, and a record (same shape as these ten).
