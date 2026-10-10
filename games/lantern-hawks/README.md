# Lantern Hawks

A free homage browser game inspired by a 1988 DOS mech RPG. An homage to a 1988 classic. Not affiliated with any rights holder. Every name comes from `names.json`, every line of text is original, and all art is original.

## Run it

No build step. Serve the folder and open it:

    python3 -m http.server 5178        # from this folder
    open http://localhost:5178

(Opening `index.html` from disk won't work: the game loads its data with `fetch`.)

Run the tests (Node 20 or newer):

    node --test

## How to play

- **Title:** New game, Continue (when a save exists), Sample battle, How to play.
- **Town:** you start in Citadel Town. Click any labelled place to visit it. "To the map" leaves for the overland hex board.
- **Map:** click a hex and the squad figurine hops there. Click the town hex to go back in. The port (east), the ridges (north), the cave and the old ruins all have scenes.
- **Story panels:** read, then pick a numbered choice (mouse, or keys 1-9; Enter or Space moves on).
- **Card battles:** see below. Esc opens the menu (save, load, deck, help, quit).

The complete 12-beat campaign follows cadet training, the raid and occupation, an escape through the port, recruiting the lanterns, the inventor's questions, the guarded cave, a key-card vault and the final decision. Optional road encounters, the stockade rescue and the hidden hangar extend the journey. Follow the objective below the scene when you need direction.

Progress saves when leaving a scene, at major story moments and when collecting cards. Menu → Save game also preserves the current conversation page. Continue returns to that page without replaying rewards; completing the campaign preserves the ending. Saves belong to this browser and address. Battles must be resolved before saving.

## Card battles

- Each mech's weapons build its base deck (`data/cards.json` > `loadout`), plus basic cards (move, brace, vent, kick) and cards your skills unlock (Gunnery adds Aim and Target Lock, Piloting adds Evasive Step and Charge).
- Each round you draw 5. Play as many as you like, then End turn.
- **Heat is the budget.** Every card shows the heat it adds. Sinks cool you at the end of each round. Heat 8+ makes shots harder (the engine's heat modifier). End a round above 20 and the excess damages your centre torso; reach 30 and you shut down for a turn. Vent cards cool you at once.
- **Hit chance** on each attack card is the engine's 2d6 target number (range bracket, your movement, the target's movement, heat, Gunnery or Piloting) shown as a percentage, with the working itemised under the hand. Every shot rolls two visible dice.
- The enemy plays a small deck with a simple AI: close to its best range, shoot what it can afford, vent when hot, defend with what's left.
- **Boosters:** packs of 3 cards from the arms dealer (30 C-bills) or for winning. Keep 1 to 3. Kept cards go into the deck while there's room (8 extras); the Deck button in the status panel adds and removes them.

Measured with a simple greedy bot over 400 seeded fights (not a test, a tuning note): the practice duel is won about 70% of the time, the sample battle against the Harrier about 45%.

## Audio

All music and sound is made in code with the Web Audio API (`src/audio/`); there are no audio files. Nothing plays until the first click or key press (browser autoplay rules). **M** mutes; the speaker button at the bottom right mutes too, and its slider sets the volume (hidden under 520 px wide). Both are remembered in localStorage (`lanternHawks.audio`).

- **Music** is original, written for this game, in a small tracker (`tracker.js`: tempo, 16th-note patterns, voices lead / bass / arpeggio / pad / noise drums). Cues: `title`, `town`, `occupied`, `interior`, `sneak`, `battle`, `cave`, `ending`, plus one-shot stings `victory` and `defeat` (`songs.js`). One E-minor theme (a rising E-B-E leap, then a stepwise fall) opens title, battle and ending; the ending plays it in E major.
- **Sounds:** `laser`, `missile`, `autocannon`, `hit`, `explode`, `kick`, `vent`, `card`, `click`, `alarm`, `door`, `powerup` (`sfx.js`), square / saw / noise with envelopes through a light bit-crusher, each under 1 s.
- **Hooks:** `window.LH_MUSIC(cue)` (null stops) and `window.LH_SFX(name, delaySec?)`. Without calls, `Game.setScreen` picks music by screen: title, town or occupied on the map and in town (by `mapVariant`), battle; story scenes choose from the scene id and background (cave and ruins: cave; raid, jail, disguise: sneak; indoor places and the dream: interior; ending scenes: ending). An explicit `LH_MUSIC` call during a story wins until the player leaves the story. Battles sound each weapon, hit, vent and overheat alarm from the battle log, then an explosion and the victory or defeat sting. Every button click clicks; battle cards make a card sound.
- `tests/audio.test.mjs` checks every cue exists, every pattern is whole bars with all voices the same length, every token is playable, and the theme opens title, battle and ending.

## File map

    index.html, style.css      page shell, scaling, panels
    names.json                 every proper name (the only source of names)
    data/
      scenes.json              story scenes: nodes, choices, conditions, effects
      battles.json             battle definitions and their win/lose outcomes
      cards.json               battle cards, loadout -> card mapping, boosters
      mechs.json               mech and weapon numbers (from the engine notes)
      world.json               overland hex board, terrain and special hexes
      cities.json              city scene art keys and clickable hotspots
    assets/
      manifest.json            real art that replaces placeholders (by role key)
      hex/*.png                hex tiles
    src/
      main.js                  boot, loop, Game object (screen flow, save, modals)
      core/                    pure logic, no DOM, all tested
        script.js              scene script runner (conditions, effects, costs)
        battle.js              card battle state machine and enemy AI
        cards.js               decks, drawing, boosters, collection
        rules.js               to-hit, heat, damage, hit locations
        hex.js                 hex geometry, neighbours, pathfinding
        state.js, save.js      game state and localStorage saves
        names.js, progress.js  name placeholders; current beat and objective
      screens/                 title, map, city, story, battle
      ui/                      status panel, menus (deck editor, booster picker), DOM helper
      audio/                   Web Audio: engine, sfx, tracker, songs, index (hooks, mute control)
      gfx/
        registry.js            asset registry: procedural first, manifest overrides
        procedural.js          placeholder pixel art drawn in code
        keys.js                every art role the game uses
        palette.js, font.js    the palette and a 3x5 bitmap font
    tests/                     node --test suites (logic and data contracts)

## Adding scenes

A scene in `data/scenes.json`:

    "my_scene": {
      "title": "Shown top right", "bg": "scene.poi.lounge",
      "portrait": "portrait.barkeep", "speaker": "Barkeep", "start": "start",
      "nodes": {
        "start": {
          "redirect": [ { "if": { "flag": "seen" }, "goto": "again" } ],
          "effects": [ { "set": "seen" } ],
          "text": ["Page one, {hero_first}.", "Page two."],
          "choices": [
            { "text": "Buy", "cost": 30, "effects": [ { "booster": 1 } ], "goto": "start" },
            { "text": "Fight", "effects": [ { "battle": "duel1" } ] },
            { "text": "Only if", "if": { "skill": "tech", "gte": 2 }, "goto": "again" },
            { "text": "Locked", "requires": { "flag": "key" }, "lockedText": "Need the key", "goto": "again" },
            { "text": "Leave", "exit": true }
          ]
        },
        "again": { "text": "...", "next": "start" }
      }
    }

- **Conditions:** `flag` (with `eq`, `ne`, `gte`, `gt`, `lte`, `lt`, or bare for truthy), `money`, `skill`, `item`, `variant` (`intact` / `ruined`), `day`, and `all`, `any`, `not`. A list means all.
- **Effects:** `set`, `add`, `clear`, `money`, `skill` (with `add`, `max`, optional `chance`), `item`, `removeItem`, `equip`, `wear`, `heal`, `day` (also clears daily flags), `variant`, `place` (`location`, `q`, `r`), `battle`, `booster`, `toast`, `save`, `exit`.
- **Costs:** a number, or `{ "tuition": "pistol" }` (125 x level + 75).
- A node without choices shows Continue (if it has `next`) or Leave. A choice with `scene` jumps to another scene. Text placeholders such as `{hero}`, `{rival_first}`, `{slot6}` (mech names by slot) come from `names.json`; an unknown one shows as `{?name}`.
- Hook a scene to a place in `data/cities.json` (hotspot `scene` / `sceneAfterRaid`, coordinates as fractions of the image) or to a hex in `data/world.json` (`specials`).
- `node --test` checks every link, battle, art key and placeholder.

## Adding art

Every picture is looked up by role: `hex.forest`, `scene.city.home.day`, `scene.city.home.ruined`, `scene.poi.hospital`, `scene.story.dream`, `portrait.regent`, `card.laser`, `mech.trainer`, `fig.squad`, `fig.mech.harrier`, `sprite.npc.cadet.down.0`. The full list is in `src/gfx/keys.js`. Procedural placeholders are drawn for all of them. To use real art, add a line to `assets/manifest.json`:

    "images": {
      "portrait.regent": "assets/portraits/regent.png",
      "fig.squad": { "src": "assets/figures.png", "rect": [0, 0, 32, 48] }
    }

No code changes. Hex art is drawn 48 px wide (height keeps its aspect) with rows 32 px apart, back to front, so tiles with an earth edge overlap correctly. A missing key draws a magenta checker and logs a warning rather than nothing. The burning town hex is the real city tile plus animated fire; set `hex.city_burning` in the manifest to replace that.

## Completion pass

- Full campaign route checked from new game to the independent-unit ending, using actual card battles with a seeded strategy bot.
- Dialogue saves preserve scene, page and return location; entry rewards are not repeated on load. Invalid save files do not offer Continue.
- Redirect checks now precede node rewards: incorrect vault codes stay locked, and ruins pay out once.
- Pause menus suspend map movement. Focused buttons respond to Enter without also triggering a story shortcut.
- Booster rewards are saved before selection and retained after collection.
- Story and battle panels flow below the artwork on narrow screens, with larger controls and scrollable content.
- The existing original art and soundtrack remain in place.

## Verification and limits

Run `node --test` for the logic and data checks, including the main campaign, puzzle failure/recovery, one-time rewards and dialogue recovery. The campaign helper checks routes and destination scenes; it does not trigger every intermediate road encounter. Browser smoke checks cover launch, town, story, save/reload and battle controls. This is a local browser release, not an exhaustive test of every optional branch or device. Storage is one local save slot; clearing browser data removes it.
