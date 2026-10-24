# The demo flow (`/demo`)

Evan, 2026-10-23 20:19Z and 20:21Z. One path from the first tap to a mission, in the real game's look. Code:
`prototypes/ranch-atelier/dist/simulations/demo/` (`script.mjs`, `chat.mjs`, `board.mjs`, `missions.mjs`, `flow.mjs`), page
`demo/index.html`, route `/demo`. Test shortcuts: `?go=1` skips the start tap, `?quiet=1` mutes the voices, `?skip=1` jumps to
the board, `?at=scientist` jumps to the scientist chat, `?play=1` locks the Moon tile until the Moon Mission is done.

## The path
1. **Studio.** Cartoon Abbie and Ani (stand-ins until the Meshy heroes land) walk onto a studio set. A phone sits on the
   right; their lines arrive as chat bubbles with typing dots, a bloop and reactions, and are spoken (ElevenLabs designed voices
   in `simulations/demo/voice/<id>.mp3` when rendered, browser voice until then). `tools/demo-narration/render.py`.
2. **Tour.** One smoke cut to the Winchester diorama, rendered tilt-shift (a real render pass, not a blur layer). Camera visits
   Downtown, Ani's side, Abbie and Daddy's side, the high school in the middle, then the coffee shop.
3. **The strange scientist.** The phone turns portrait (group chat). The café roof unfolds a launch pad like a satellite, a tiny
   toy rocket sits on it, the kids laugh, the scientist uses the last grow spray, the rocket grows, and the mission is
   revealed: a strange disturbance on the far side of the Moon.
4. **The board and the mission notebook.** Tile bag bottom right, chest of ten charms bottom left. The mission selector is a
   paper notebook with a checklist (Evan, 21:25Z): tap a line and a halo with a beam into the sky marks its place; then go
   overhead (satellite button) or, when the mission offers it, drive there (kart button). Moon base mining is sealed until
   a Moon tile is down; "Show me where" sets the padlock on the open slot.
5. **A mission.** Dolly to the place (0.9 s), a smoke puff on the place only, then the mission page. Done is read from the
   backpack charms (basement floppy, tardigrade, moon cheese, rocket), so each game only has to earn its charm.
   Finishing the Moon Mission unlocks the Moon tile in real play; the demo starts with it in the bag.

## What other threads own, and the hooks the demo uses
- **One Winchester.** The demo runs the real board: `/demo` shows `/town?play` in a frame and drives `window.AbbieTown`
  (`board`, `stage`, `stage.tiles[hex].spots`). `simulations/demo/town-stage.mjs` adds the studio, the launch pad on the café roof
  (found by ray-casting the real roof), the Ranch and Moon tiles (they take their edge from `board.heightAt`, which is defined
  beyond the seven hexes) and the halo. Test with `?town=<url>` to point the frame at another build.
- **Missions.** `window.AbbieDemo.registerMission({id, title, line, icon, charm, at, page, drive, needs, beacon})`
  (see `missions.mjs`). `at` is a spot name on Downtown, `'moon'`, or a function returning an Object3D. `drive(mission, stage)`
  is called by the kart button; the Effect hunt and jet cart thread owns that.
- **Moon Mission thread.** `?beat=outpost` for mining, a `rocket` charm on completion.
- **Voices.** Abbie and Ani use their designed voices from tools/voice-cast/cast.json; the demo-narration workflow renders the tour lines.

## Tour rule
Tour: **no** for the demo page itself (it is the tour). The chest and the notebook are `tour: yes` per the charms study.
