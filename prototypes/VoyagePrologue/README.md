# Voyage Prologue — standalone rehearsal app

Open `VoyagePrologue.xcodeproj`, choose VoyagePrologue and an iPad simulator. No game account, server, packages, or main-game changes. Separate bundle identity: `world.abbies.VoyagePrologue`.

This first animatic explores pacing and interaction with temporary repository artwork. It is not the finished cinematic. Existing catalog images are copied verbatim with SHA-256 provenance. The shot uses the established named gang: Raze, Vix, Morrow or Nib (selectable in Studio). Hyena alternate art was superseded during setup and is not displayed. The preview defaults to Raze, not a fixed canonical boss. The unicorn Shih Tzu still needs approved cinematic character art; no misleading cropped sprite is used.

Tap the opening marble, or Roll the marble. Panels 2–5 advance automatically; every shot also has a next button. Drag up on the climb (or use its accessible slider). Let’s Play calls the completion closure and shows a handoff preview. Skip uses that same closure. Studio offers shot selection, time scrubbing, pause, replay and restart. Motion pauses in background; Reduce Motion freezes decorative motion. `-shot=0` through `-shot=6` and `-still` support repeatable screenshots.

## Next production pass

1. Approve the story’s cause and effect and pacing while playing the animatic.
2. Generate a coherent friends-at-play master, matching Abbie + unicorn Shih Tzu hero master, villain close-up and a tall layered climb plate. Existing cast references guide identity. Preserve review and provenance. Do not use the cropped dog atlas or pixel-art overland Abbie as cinematic masters.
3. Separate depth layers; animate camera, petals, shadows, panels, typography, marble and cages in code. Petals currently use a Canvas gradient, not a custom Metal shader. Add Metal paper/light/refraction treatment only after shot composition reads well. No flashing strobe.
4. Score in Suno: warm hand-played plucks and marble clicks; a hard musical interruption; sparse low villain rhythm; Abbie’s whistle motif; ascending orchestration that resolves into game music. Export stems/cue edits if available. No soundtrack generated yet.
5. Integrate PrologueView(onComplete:) with the real run’s cast, seed and first marble. Persist watched/skipped state in the game, not this prototype. Game assets move into a shared bundle when integration is approved.

## Art/browser operating agreement

Use a dedicated Midjourney tab when generation begins; leave Evan’s active tab and unsent prompt alone. One deliberate submission at a time, at least 120 seconds between four-candidate grids and 30 seconds per individual image action. Inspect results before another submission; no auto-rerolls. Short generated motion is reserved for a rare shot that benefits from it. No Midjourney/Suno jobs were submitted for this initial animatic.

## Canon and collage constraints

Use existing named gang and existing rescue characters only. No new canonical names, roles, origin stories or redesigns. Dialogue is draft performance copy for review. All new close-ups preserve approved faces, outfits and species. Final edit should evolve as a collage: eye/hand/marble inserts, overlapping diagonal frames, shadow wipes and reaction cutouts; avoid a slideshow of full-scene paintings. Sources for cast: PlinkAttackerKind.swift and MarbleVoyageGangRun.swift.
