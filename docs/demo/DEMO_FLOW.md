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
4. **The board.** The town noticeboard (cork, painted wood, brass plate) holds four pinned cards: coffee shop basement, science
   lab, Moon base mining (sealed until a Moon tile is down) and the Moon Mission. Chest of ten charms bottom left, tile bag
   bottom right. Tap a tile, tap an open slot beside Winchester: it drops in and conforms.
5. **A mission.** Dolly to the place (0.9 s), a smoke puff on the place only, then the mission page. Done is read from the
   backpack charms (basement floppy, tardigrade, moon cheese, rocket), so each game only has to earn its charm.
   Finishing the Moon Mission unlocks the Moon tile in real play; the demo starts with it in the bag.

## What other threads own, and the hooks the demo uses
- **Winchester (hex city thread).** Evan wants exactly one Winchester. `board.mjs` has a seven-hex stand-in only so the flow runs until the hex city thread's board has an API; it is a fallback, to be deleted once `WINCHESTER.provider` loads the real one. To swap in the real town, set
  `WINCHESTER.provider = ({T, world, put, groundAt, spots}) => {...}` before `createStage`: add the hexes with `put(kind, q, r)`,
  and register `spots.cafe`, `spots.cafeRoof` (an Object3D on the café roof), `spots.lab`, `spots.school`, `spots.noticeboard`.
  Tiles conform by sharing one land height: `tileHeight(kind, x, z)` is `landHeight(x, z)` plus the tile's own relief, which fades
  to zero at the rim. Replace `landHeight` with Winchester's real height field and every tile follows.
- **Moon Mission thread.** Needs: `?beat=outpost` for mining (exists), a `rocket` charm on completion (exists), and the toy
  rocket from `moonmission/world3d.mjs` (used on the launch pad).
- **Café.** The launch pad grows from `spots.cafeRoof`; it expects a flat roof about 5 m across.
- **Voices.** Abbie and Ani use their designed voices from tools/voice-cast/cast.json; the demo-narration workflow renders the tour lines.

## Tour rule
Tour: **no** for the demo page itself (it is the tour). The chest and the noticeboard are `tour: yes` per the charms study.
