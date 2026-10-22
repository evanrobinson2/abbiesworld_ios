# Abbie’s Home — living landscape builder request

## Approved source and scope
Evan finalized Midjourney upscale job `2695686e-cb10-4a86-87ef-bd1ffd78118c`, index 0. Use the exact `home-animation-source.jpeg` beside this brief. Latest visible prompt: “redraw with a blank sky and blank waterfall so that I can animate these parts”. Preserve the original. This supersedes the earlier source reference 13f7e34d for this animation request.

Target existing `scene.home` and `map.home`; inspect the live/local asset binding before replacement. Coordinate through `art-requests/open/20260927-home-ambient-animation.json`. The source is approved, but layers and animation are NOT produced or runtime-verified yet. Builder owns preparation and implementation. Read AGENT_COORDINATION.md and preserve concurrent PlayerHomeView/WorldMapView work.

## Art direction
A beautiful, calm magical place that feels alive while Abbie plays. Static camera and stable terrain; gentle independent motion, no whole-image wobble. Keep all three building terraces and paths legible. Future large homes: Abbie pink, Anie purple, Evan a landed futuristic exploration habitat. These houses are a separate asset task; do not bake new houses into this plate or reuse old placement coordinates without checking this composition.

## Layer preparation
The JPEG has opaque white sky and pale waterfall regions, NOT transparency. Do not globally remove white: preserve highlights, branches and stonework. Hand-author reviewed masks for sky openings and each water segment, including narrow gaps and branch edges. Export a terrain/vegetation foreground with alpha, sky background, cloud sprites, waterfall texture and masks, foreground reed clusters, leaf sprites, and butterfly wing frames. Preserve dimensions/alignment; record derivative hashes and source parent. Water mask must respect bridge/rock occlusion. Inspect and retain existing residual water painting deliberately rather than double it.

Back-to-front: sky gradient; distant drifting clouds; fixed distant scenery and terrain; masked water with bridge/rock foreground occluders; POIs and characters at existing scene depths; sparse midground leaves/butterflies; near-camera reeds at bottom corners; game controls. Use local occlusion masks where a simple layer order is insufficient.

## Motion recipe — initial tuning, adjustable
- Clouds: 2–3 soft illustrated layers behind the tree/cliffs. Drift roughly one screen width over 90–180 seconds, varied phases, seamless wrap outside the visible area. No visible rectangular edges.
- Waterfall: flow along the actual painted cascade through each exposed opening; moving highlights/foam inside masks, quiet mist at landing points. Short seamless texture loops or procedural UV motion, stable edges, subtle opacity variation. No flashing or movement of bridges/rocks.
- Leaves: spawn from visible canopy edges, not randomly from empty sky. Usually 2–5 visible; intermittent 3–7 second spawn intervals. Drift/tumble for 6–12 seconds with varied scale; fade out unobtrusively. Share a gentle wind direction with the reeds.
- Foreground reeds: 2–3 separate close-up clusters rooted below the bottom edge or at bottom corners. Only tips intrude, roughly 6–12% of screen height, avoiding central route and controls. Bend from their bases with 3–6 second sway, independent phases and occasional soft gusts. No whole-sprite sliding.
- Butterflies: usually 1–3, with quiet gaps. Spawn near plants, curved wandering paths, small hovering pauses, occasional landings. 2–4 wing frames or simple hinge animation, restrained colors sampled from the scene. Keep away from important interactions; no repetitive synchronized loops.
- Optional magic: a few faint motes in waterfall spray or canopy light, only after the requested five effects work. No full-screen glitter layer.

## Runtime requirements
Use the existing scene renderer where possible (SpriteKit/Canvas/shader or equivalent), with bounded particle pools and a shared clock. Avoid one view/timer per particle or full-screen video replacing interactive art. Alpha-capable sprite sequences are appropriate for reusable motion; a Midjourney video is not inherently transparent. Do not spend new generation credits without a production request.

Store all masks, effect regions, emitters and anchors in normalized source-image coordinates. Apply the SAME aspect-fit/crop transform used by the background and POIs. Do not stretch the 77:58 source. Decorative layers must not intercept touches. Pause when scene is hidden/app inactive; respect Reduce Motion with still clouds/reeds, no roaming particles and reduced/static waterfall. Scale counts down on slower devices.

## Acceptance / handoff
1. Exact approved source hash retained; aligned derivatives with provenance and reviewed alpha edges.
2. Clouds move behind all foreground silhouettes; water remains inside channel and behind bridges.
3. Leaves originate from canopy, reeds bend naturally, butterflies appear intermittently.
4. Three home locations stay readable and tappable; resizing maintains alignment.
5. No hard loop resets, flicker, leaks, or accumulating particles over a 2-minute run; profile on target iPad.
6. Verify normal and Reduce Motion, background/resume, and departure/return to scene.home.
7. Provide an in-game screenshot and 15–20 second recording; record device/build and any remaining limitations before marking fulfilled.

No implementation, new animation generation, build, commit or push was performed in this art-direction handoff.

## Builder status (2026-09-27)
Runtime wired: `World2HomeAmbientLayer` (back: sky/clouds/water; front: leaves/butterflies/reeds), config dataset `world2_map_home_ambient_config`, plate `world2_1002_map_home` from approved source. Unit tests pass; sim screenshot at `artifacts/home-ambient/01-loading-or-home.png`. Art request stays **open** until Reduce Motion / background-resume / 15–20s recording are signed off — do not mark fulfilled yet.

