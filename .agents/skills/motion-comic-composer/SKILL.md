---
name: motion-comic-composer
description: Compose short, authored 2D game sequences with kinetic captions, layered depth, and puppet-like character motion from existing art. Use for game intros, rescues, reveals, and similar visual beats; not for full 3D character rigging.
---

# Motion Comic Composer

Turn a short game moment into a polished, playable 2D sequence without reopening every art-direction decision. Favor strong composition and a few motivated movements over a pile of effects.

## Bounded workflow

Use at most three passes:

1. **Read the scene.** Inspect the current composition, asset files, target runtime, aspect ratio, and visual style. Identify the one thing the viewer must understand and the strongest available image or character pose. Reuse approved art; do not silently replace it.
2. **Compose.** Choose up to four beats, one focal subject per beat, and one transition language for the whole sequence. Default to a short readable setup, a clear action/reveal, and a resolved handoff. Set caption wording, entrance, hold, and exit to the action's meaning. Record choices in the sequence spec described in [the sequence grammar](references/sequence-grammar.md).
3. **Build and check.** Generate the smallest runnable preview in the requested runtime, play the whole sequence, then make one focused correction pass for the largest visible problem. Check timing, clipping, readability, replay/skip, and reduced-motion behavior. Report what is real versus simulated.

Do not pause for routine art-direction questions. Infer details from approved assets and nearby game screens. Ask only when a missing choice would change story meaning, use unapproved artwork, or require a materially different runtime. Do not expose private chain-of-thought; give the user the chosen defaults and the visible result.

## Composition rules

- Design the frame before animating it: establish foreground, character/action plane, and background; keep the focal silhouette and caption safe inside the target crop.
- Use captions as editorial storytelling, not permanent HUD. Keep phrases short, sequence them by emphasis, and leave enough hold time to read. Translate a named-director reference into broad traits such as rapid editorial pacing, freeze-frame introductions, kinetic type, and punchy cuts; do not copy a specific film's frames, titles, or exact sequence.
- Animate with cause and intent: camera push or pan, character anticipation/action/recovery, and caption impact should support the same beat. Use easing, overlap, and brief settles; avoid unrelated bobbing, random wipes, or constant movement.
- Prefer layered SVG, image cutouts, CSS transforms/filters, or the project's native compositor according to the target. Keep caption text and screen graphics as editable overlays, not baked into source art.
- When art has independently separable parts, define pivots and overlap order for head, torso, limbs, hair, cloth, props, and foreground occluders. Use small arcs, rotation, translation, and secondary follow-through to suggest a puppet. Preserve the original silhouette at rest.
- When only a flattened portrait exists, use it honestly: camera motion, layered scene depth, masks, and restrained whole-image movement are valid. Do not describe this as Live2D, a skeletal rig, or articulated animation. Never invent missing anatomy by cutting through important features.
- Keep transitions authored and repeatable. Select one transition that fits the dramatic idea; random selection belongs only in a mechanic explicitly meant to vary.
- Make the sequence skippable and respect reduced-motion settings. Provide a readable static state when motion is suppressed.

## Deliverable and review

Produce a playable preview plus its editable source/spec when the user asks to build. Keep the sequence data separate from reusable renderer code where the host project allows it. If the user asks only for a review, stop after assessment and do not edit.

Before delivery, verify the sequence from its true starting state through its final handoff. Confirm the art remains legible beneath overlays, captions do not collide with faces or controls, timing has no dead waits, and replay/skip cannot leave stale animation callbacks running. Summarize the sequence, identify any flat-art limitation, and link the preview directly where possible.
