# Atelier pack before/after evidence (2026-10-22)

Captured in a cloud session from branch `claude/project-thread-hr9f64` (based on `codex/sandbox-production-2026-10-21`).

Same for every shot: board state `board-state.json` (seed 214, Laurel Orchard Ranch, clock 4:23 PM Monday, spring),
seeded `Math.random`, simulation paused on its first frame, 1600x1000 window, headless Chromium (SwiftShader).
Two runs of the "before" shot were compared and matched pixel for pixel.

- `before-wide.jpg` / `after-wide.jpg`: `/simulations/` vs `/simulations/?atelier`, default fitted camera.
- `before-z.jpg` / `after-z.jpg`: same, then four wheel steps in at (520, 640).
- `autumn.jpg`, `frost.jpg`: `?atelier=autumn`, `?atelier=frost`, wide camera.

Reproduce: serve `dist/` on :8080, then
`node capture.cjs "http://localhost:8080/simulations/index.html?atelier" after.png board-state.json`
(set `ZOOM=520,640,4` for the close-up).
