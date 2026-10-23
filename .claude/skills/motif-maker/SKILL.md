---
name: motif-maker
description: Use when Evan (or a thread) asks for a new page motif or theme for Abbie's World pages ("make it legion themed", "a candy motif", "something for the moonbase"), to turn a few words into a motif entry in docs/design/look/motifs.json.
---

# Motif maker

Evan, 2026-10-23: "motif maker is just a text skill for you, not a page." A motif repaints the shared kit (sky, hills,
tiles, signs); it never changes the pieces or the layout. The canon is `docs/design/look/LOOK.md`, the motifs live in
`docs/design/look/motifs.json`.

## Steps

1. Read the request as a place or mood, in a child's words: what world would this page sit in? (Legion: oxblood
   banners, brass, a sandstone sun, olive hills, marble.)
2. Pick the paint from that world's own materials, the way the Ranch palette came from its concept paintings. If an
   asset or concept image exists, measure it (`tools/aesthetic-rubric/check_aesthetic.py --measure <img>`).
3. Fill every token in `motifs.json` → `tokens`:
   - `--sky-top` the deep colour high in the sky, `--sky-low` the light at the horizon (lighter than the tile edge).
   - `--hill-far` / `--hill` two ground tones, near darker than far.
   - `--tile` near-white, tinted toward the world; `--tile-edge` a mid tone of its material (wood, marble, coral).
   - `--signc` the colour of the place's signs and plaques.
   - `--ink` / `--ink-soft` dark enough on `--tile`: contrast 4.5:1 or more for ink, 3:1 for ink-soft. Check it.
   - Optional: `--meadow` (keep), `--teal` (active), `--brass` (attention), `sign_font` (Google Fonts face for the
     sign only, e.g. Cinzel for Legion), `silly: true` for wobble (only for silly tones).
4. Give it a `tone` on the serious-to-silly line (serious, calm, dreamy, playful, silly). Keep at least five motifs
   spread along that line.
5. Add the entry to `motifs.json`, and if Evan wants to see it, show it on the look preview
   (`docs/design/look/previews/look.html`, published at https://claude.ai/artifact/WcNpa9yNKCy4k3ySrWSPL1).

## Rules

- Paint only. No new layouts, borders, panels or words.
- Never a UI-only night: night comes from the world's clock, not from a motif.
- Brass means "something to know" in the world; don't spend it on decoration.
- Colour-blind check: keep and attention colours must differ in lightness, not only hue.
