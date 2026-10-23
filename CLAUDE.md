# CLAUDE.md (live Ranch Atelier branch)

This branch builds the live site from `prototypes/ranch-atelier/dist`. The full house rules are in `CLAUDE.md` on `main`;
read them too. The rules below apply to every change to player-facing code here.

## How Abbie's World shows information
Follow these principles; they matter more than any UI grammar. The full study is `docs/oracle/hud/HUD_STUDY.md` on
`main`, and its page is https://claude.ai/artifact/66MG9h31W6fYFmRGdjPucx.
- Ask first: how would a character in the world know this? Show it that way (a bell, a sign, sheep heading home) before any UI.
- The 2x2 plus none: in the world or on the screen, crossed with "the characters know" or "only you know". Diegetic is
  feeling through the world; meta is feeling in your body; spatial is the social layer (bubbles and cues on the
  person, animal or thing they're about); overlay is precise information only. None means the world just behaves differently.
- The whole game adapts: one signal (time, threat, mood, a storm coming) drives light, music, people, animals and
  sound together. Sound sits on the same grid: a bell is diegetic, a heartbeat is meta, a UI tick is overlay.
- Place dialects: each place speaks the same grammar in its own materials (the Ranch uses wood, bells and painted
  signs; the Moonbase uses lights, radio and holograms).
- Two layers that never mix. The world layer holds only in-fiction things, and it is all that characters, the
  simulation, AI directors and the voice controller's `look` can perceive. The presentation layer (HUD, spatial cues,
  labels, selection, debug, tools) is drawn for the player and is invisible to every perception. Anything placed in
  the world becomes fiction, and the bots will react to it.
- No engine or editor artifacts in the player's view. In Evan's words: "we would never dream of dropping a 3D axes
  origin unit vector into the world." That means no gizmos, axis or grid helpers, debug boxes, raw ids or developer
  labels, except behind developer mode.
- Nothing masks the world: no edge haze, fade to white or backdrop blur. The play HUD covers at most 8% of the screen
  and has zero words. Everything else lives on things, is summoned, or goes to the grown-up workbench (`GAME_FEEL.md`).
- Keep what Evan likes: liquid glass (as objects with depth, not flat frosted panels), rich colours and live previews.
  Check a HUD with `tools/hud-rubric/check_hud.py`.
