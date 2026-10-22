# Holodeck Creator: live scene control

Recorded 2026-10-22. Evan's ask: start a session with Claude and a "Creator" skill that has
full, low-latency control of the scene shown in the app, synchronized with what he sees.
Claude is the ship's computer and the app is the holodeck. The control layer is
model-agnostic so ChatGPT voice (or anything else) can drive the same scene later.

Status: prototype behind a flag. Nothing changes for anyone who opens the sandbox without
`?creator=`.

## Pieces

| Piece | File | Role |
| --- | --- | --- |
| Protocol | `dist/simulations/holodeck/protocol.mjs` | The op vocabulary, JSON schemas and validator, shared by every side |
| Stage | `dist/simulations/holodeck/stage.mjs` | Runs in the viewer's browser: applies ops, streams state and taps, captures screenshots |
| Hook | `dist/simulations/lab.mjs` | Loads the stage only when the URL has `?creator=<room>`; two per-frame calls |
| Relay | `dist/api/holodeck.js`, `dist/lib/holodeck-relay.cjs` | Vercel Functions WebSocket; pairs stage and Creator in a room and forwards frames |
| Creator client | `dist/mcp/holodeck-client.mjs` | One persistent socket, cached state, event queue, ack timing |
| MCP server | `dist/mcp/holodeck.mjs` (+ `holodeck-launch.cjs`, repo `.mcp.json`) | Four tools: `holodeck_link`, `holodeck_state`, `holodeck_do`, `holodeck_look` |
| CLI | `dist/mcp/holodeck-cli.mjs` | Same client for shells; `bench` measures latency on the real device |
| Skill | `.claude/skills/creator/SKILL.md` | How to be the ship's computer |
| Tests | `dist/tests/holodeck.test.cjs` | Relay forwarding, room isolation, origin check, protocol validation |
| Local harness | `dist/scripts/holodeck-dev-server.cjs` | Serves `dist/` plus the relay on loopback for testing |

## Wire protocol (`holodeck/1`)

JSON text frames over one WebSocket per party, at `/api/holodeck?room=<key>&role=stage|creator`.

- Creator to stage: `{t:'cmd', id, ops:[{op, args}], sentAt}`. A batch applies in one frame.
- Stage to Creator: `{t:'ack', id, ok, results, error, timing}`, sent right after the frame
  that shows the change is drawn. `timing.applied` and `timing.drawn` are milliseconds since
  the stage received the command.
- Stage to Creator: `{t:'state', rev, state}` whenever the scene changes (camera, clock,
  entities, selection), at most 5 per second. The relay caches the last one so a Creator that
  connects gets it at once.
- Stage to Creator: `{t:'event', kind:'tap'|'select', ...}` when the viewer taps the world
  or selects an inhabitant. A tap carries the 3D point and the name of what was hit.
- Relay: `welcome` and `presence` (who is in the room), `ping`/`pong`.

Ops: `state`, `catalog`, `spawn` (shape, registered asset or person), `remove`, `move`,
`transform`, `style`, `animate` (spin, bob, pulse, orbit, hop), `camera` (focus, position,
fit), `time` (hour, pause, speed), `weather`, `narrate` (caption, optional speech),
`screenshot`. Schemas live in `protocol.mjs`; `node mcp/holodeck.mjs --tools` prints them as
plain function-calling tools for other models.

## Security

- The room key (144 random bits) is the capability. It lives in `~/.config/holodeck/room.json`
  on the Creator's machine and in the viewer's URL, and is never logged by the relay.
- Ops are data with strict schemas. There is no code execution, DOM access or URL loading;
  assets come only from the registered catalog.
- The relay admits a stage only from the app's own origin, caps each room at 4 stages and 4
  Creators, frames at 4 MB, and 240 messages per second per socket.
- `?relay=` (for local testing) is honored only for localhost relays, so a link cannot hand a
  viewer's scene to another server.

## Latency

Measured 2026-10-22 in the cloud container with a local relay and headless Chromium.
That container has no GPU, so Chromium renders in software (SwiftShader) at roughly one
frame every 0.5 to 0.9 seconds. Numbers that do not depend on the renderer:

| Step | p50 | p90 |
| --- | --- | --- |
| Relay ping (loopback) | 0.3 ms | |
| Creator send to stage receive | 9 ms | 18 ms |
| Stage applies the batch | 0.1 ms | 1.7 ms |
| Stage receive to changed pixel in the framebuffer (read back with `readPixels`) | 16 ms | 25 ms |

Presentation then waits for the compositor, which in software rendering took about 2 s.
On a device with a GPU that is one display refresh (about 16 ms at 60 Hz). Expected
end-to-end on Evan's devices is network one-way to and from Vercel plus one to two frames,
roughly 50 to 120 ms. That is an estimate until `node mcp/holodeck-cli.mjs bench` runs
against a real phone or PC. The model's own thinking time (seconds) dominates either way,
which is why the skill batches ops and reads the cached state instead of round-tripping.

## Known limits and next steps

- Vercel pins each WebSocket to one function instance. The stage and the Creator must land on
  the same one. The Creator reconnects up to five times to find the stage, which works for one
  viewer at Evan's traffic. If it proves flaky, put the room in a shared store (Upstash Redis
  pub/sub or a Durable Object); the protocol does not change.
- Connections close at the function's maximum duration; both sides reconnect automatically.
- Captions are DOM, so screenshots show the 3D view without them.
- Entities are a play layer and are not saved with the board yet.
- ChatGPT voice: expose the same tools through a remote MCP endpoint or the Realtime API's
  function tools (`--tools` output), with the relay unchanged.
