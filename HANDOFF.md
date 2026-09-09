# Local agent handoff — Halloween media pack

Cloud agent could not run this in Xcode. You have the Mac/iPad. Finish and verify here.

- **Repo:** `evanrobinson2/abbiesworld_ios`
- **Branch:** `cursor/halloween-media-pack-bc3d`
- **PR:** https://github.com/evanrobinson2/abbiesworld_ios/pull/1
- **Base:** `main`

## Run

1. Checkout the branch in Xcode.
2. Run on the iPad.
3. Top-left control is **Everyday ↔ Halloween**.

Pack files: `abbies.world.ios/abbies.world.ios/MediaPacks/Halloween/`  
Catalog: `catalog.json`  
Art list: `docs/media-packs/HALLOWEEN_PACK.md`

## Done in code (untested on device)

- Bundled spooky background + 10 monsters, 10 costumes, 10 haunts, 10 styles
- Sticker tile chrome + four-row layout forced in Halloween
- Skin toggle persists in `UserDefaults` (`mediaPack`)
- Halloween generate path skips server reference images and sends a text prompt from the tile descriptions

## Not done

1. **Music is not wired.** The three uploaded MP3s are in `MediaPacks/Halloween/music/` but `MusicService` still plays the server `music/main` playlist. Halloween should play:
   - `midnight_monster_groove.mp3` (1:30)
   - `glass_chapel_waltz.mp3` (4:44)
   - `late_train_glow.mp3` (0:59)
   Do **not** download from Suno. These are the chat uploads (Late Train Glow replaced Tilt-A-Whirl Grin).
2. **Halloween “make a picture” may fail.** Recipe IDs are local (`halloween_monster_boo_blob`, etc.). Server still expects real ingredient IDs. Confirm generation; if it 400s, send prompt-only or map to real IDs.
3. **Bundle load.** Images use `Bundle.main.url(..., subdirectory: "MediaPacks/Halloween/...")`. Confirm tiles and background actually appear (folder structure must survive the Xcode synchronized root group).

## Verify on device

- Everyday: old three-row server assets + old music
- Halloween: new background, four rows, sticker chrome, new names (Monster / Costume / Haunt / Spooky Style)
- Toggle back: classic assets return, state stays consistent
- After music wiring: Halloween plays the three bundled tracks; Everyday stays on server playlist

## Art nits (redo only if Evan wants)

- Pumpkin Overalls should be a pumpkin *wearing* overalls
- Peekaboo Sheet should be a ghost character, not a laid-out costume
- Gym Halloween Dance should be crowded with animal party-goers

Tone: childish, spooky, silly. Nothing scary.
