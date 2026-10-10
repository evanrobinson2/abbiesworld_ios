# Sequence grammar

Use this compact spec to keep each sequence declarative and cheap to revise. Keep it as JSON, YAML, or a small native data structure that the renderer can consume.

```yaml
sequence:
  id: rescue-intro
  purpose: Make the player understand who needs help and what fight begins.
  canvas: { aspect: 16:9, safeInset: 0.06 }
  duration: 5.0
  cast:
    - id: hero
      art: approved/path/to/hero.png
      parts: [head, torso, arm_near, arm_far, hair, prop] # omit when unavailable
      restPose: facing-right
    - id: foe
      art: approved/path/to/foe.png
      parts: []
  layers: [background, far-depth, action-plane, characters, foreground, captions, impact]
  beats:
    - at: 0.0
      duration: 1.1
      intent: establish
      camera: { move: push, from: 1.0, to: 1.06 }
      actions: [{ target: hero, move: enter, settle: 0.15 }]
      caption: { text: "A FRIEND IN TROUBLE", entrance: cut-in, hold: 0.7, exit: none }
    - at: 1.1
      duration: 1.5
      intent: reveal
      camera: { move: hold }
      actions: [{ target: foe, move: reveal, emphasis: 1.12 }]
      caption: { text: "THE FOX IS SURROUNDED", entrance: slam, hold: 1.0, exit: cut }
    - at: 2.6
      duration: 2.4
      intent: handoff
      camera: { move: settle }
      transition: iris-to-gameplay
      caption: { text: "LET'S GO!", entrance: pop, hold: 0.6, exit: dissolve }
  audioCues: []
  accessibility: { skippable: true, reducedMotion: dissolve-to-final-state }
```

## Fields and defaults

- `purpose` is one sentence describing the information or emotion the scene must communicate.
- `canvas` and `duration` come from the host screen and pacing needs. Use the current game defaults if omitted.
- `cast.art` must resolve to existing or explicitly approved artwork. `parts` is populated only when real cutout layers exist.
- `layers` are ordered back to front. Add only layers needed for the shot; captions and impact effects stay above art.
- Each beat has one `intent` (`establish`, `anticipate`, `reveal`, `impact`, `react`, or `handoff`), a start, and a duration. Merge redundant beats; keep the sequence to four or fewer.
- `camera`, `actions`, `caption`, and `transition` are optional. Omitted values hold position; motion starts from the prior beat's resolved state.
- Motion names are semantic. Map them to existing native animation APIs or CSS/SVG transforms instead of inventing a new effect for every phrase.
- Set caption text, emphasis, and hold explicitly. If no caption is needed, omit it; never auto-generate filler copy.
- Use one transition family per sequence. An intentional hard cut may replace it.
- `audioCues` should name cues and timing only when a sound asset or implementation is in scope.

## Minimal motion vocabulary

Prefer reusable primitives: `enter`, `push`, `pan`, `hold`, `anticipate`, `strike`, `recoil`, `settle`, `reveal`, `slam`, `cut`, `dissolve`, and `iris`. Compose those with layer opacity, position, scale, rotation about declared pivots, masks, blur, and limited parallax. Reserve strong blur or shake for brief impacts; preserve text readability and silhouette clarity.
