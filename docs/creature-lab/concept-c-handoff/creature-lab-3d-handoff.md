# Creature Lab 3D Pre-Blender Handoff

Status: design handoff only; no Blender work and no Swift implementation  
Canonical concept: **Concept C — Radial Reactor**  
Specification version: `CL3D-HANDOFF-1.0.0-radial-c`  
Authored: `2026-09-11`  
Primary target: landscape iPad, centered 4:3 action-safe composition with wider-iPad overscan

## 1. Product intent and non-negotiables

Creature Lab is a believable, navigable physical room whose machinery happens to make selection easy. It must not read as a radial software menu laid flat on a floor.

- The central fabrication reactor is the visual and mechanical hub.
- Three raised machine wedges converge on it: Creature Type, Outfit, and Buddy.
- Each wedge has real thickness, a walk-up face, a moving option carrier, one dominant current choice, and two partially visible neighboring choices.
- Three recessed energy channels visibly connect selected options to the reactor.
- A separate tactile lever and dormant embellishment socket sit at the reactor’s front edge.
- A tap produces an immediate local reaction. There are no timers, lives, penalties, grind, failure screens, or forced repeated actions.
- First input is available within three seconds: all three stations are directly pressable from the hub view, and the closest path begins at the room entrance.
- The visual language is chunky, comedic, toy-like caricature: a machine should look as literal and readable as “a bookstore that is a book” or “a math store that is a calculator,” without copying any franchise.
- No device frame, hands, desk, or tablet mockup belongs in the game surface.

## 2. Source provenance

Concept source manifest: `/tmp/creature-lab-workshop-concepts/manifest.json`

Canonical source entry:

- ID: `concept-c-radial-reactor`
- Referenced image filename: `concept-c-radial-reactor-raw.png`
- Image SHA-256 from source manifest: `a15c432bc09bd8364f841c4fb6e3e0c9dacd525668b908a283c4a86a1f5fcaf0`
- Prompt SHA-256 from source manifest: `cbeceb875a38eeff244ab56a8e803ef38c742455742c8e66e4be611856d722fc`

Existing SwiftUI behavior was inspected for naming and selection semantics only:

- `/Users/evanrobinson/abbies-world-creature-card-builder/abbies.world.ios/abbies.world.ios/Views/CreatureBuilder/CreatureBuilderView.swift`
- `/Users/evanrobinson/abbies-world-creature-card-builder/abbies.world.ios/abbies.world.ios/Views/CreatureBuilder/IngredientTiles.swift`

The repo is not modified by this handoff.

## 3. Coordinate and authoring contract

Use meters and a right-handed coordinate system:

- `+X`: room right
- `+Y`: up
- `+Z`: room front / camera side
- World origin `(0, 0, 0)`: center of the reactor floor socket
- Finished walkable floor top: `Y = 0.00`
- Exported asset up axis: `+Y`
- Exported asset forward axis: `+Z`
- Every asset transform must be frozen at scale `1,1,1`.
- Every static asset origin sits at floor contact beneath its geometric center.
- Moving pivots and sockets retain authored transforms and names.

For polar locations, angle `0°` points toward `+Z`; positive angles rotate toward `+X` when viewed from above.

## 4. Room and floor

Overall shell:

- Circular raised room diameter: `15.50 m`
- Floor slab thickness: `0.35 m`
- Outer rim height above floor: `0.22 m`; rim width: `0.32 m`
- Open front sector: angles `-52°...+52°`
- Curved rear half-wall: radius `7.40 m`, angles `72°...288°`, height `2.80 m`
- Ceiling: none
- Front wall: none
- Side wall ends terminate as chunky rounded columns, not thin cut planes.

Floor layers:

1. Center reactor socket: circular, diameter `3.20 m`, visual recess `0.06 m`.
2. Inner service ring: radius `2.05...2.65 m`; not player-walkable while reactor is active.
3. Main annular walk path: radius `2.80...6.25 m`, minimum clear width `1.40 m`.
4. Three machine wedges: raised no more than `0.12 m`; all approach lips beveled into ramps.
5. Three energy channels: width `0.34 m`, visual depth `0.03 m`, covered by flush teal glass. They are never holes or nav obstacles.
6. Front entrance pad: center `(0, 0, 6.30)`, size `2.40 x 1.70 m`.

The shell needs visible depth: thick outer slab, rear wall ribs, raised wedge plinths, glass-covered channels, and vertical machinery. Do not paint rings or icons onto an otherwise flat disk.

## 5. Canonical radial layout

The three station wedges occupy the rear and side arc, leaving the front sector open for arrival, lever access, the dormant socket, and future UI composition.

### Creature Type station

- Stable station ID: `CL3D_STA_TYPE_WEDGE_V001`
- Center: `(-4.95, 0.12, -0.70)`
- Polar center: approximately `-98°`, radius `5.00 m`
- Footprint: `3.80 m` tangent width x `2.35 m` radial depth
- Maximum visual height: `2.65 m`
- Display frontage yaw: `+18°` toward the camera
- Walk-up interaction point: `(-4.05, 0.00, 1.05)`
- Energy outlet terminates toward reactor at `(-2.20, 0.08, -0.30)`
- Physical metaphor: friendly specimen carousel with ear-like fins and a body/form silhouette.
- Accent: purple with teal glass.

### Outfit station

- Stable station ID: `CL3D_STA_OUTFIT_WEDGE_V001`
- Center: `(4.95, 0.12, -0.70)`
- Polar center: approximately `+98°`, radius `5.00 m`
- Footprint: `3.80 m` tangent width x `2.35 m` radial depth
- Maximum visual height: `2.80 m`
- Display frontage yaw: `-18°` toward the camera
- Walk-up interaction point: `(4.05, 0.00, 1.05)`
- Energy outlet terminates toward reactor at `(2.20, 0.08, -0.30)`
- Physical metaphor: rotating wardrobe press/mannequin wheel with a broad outfit silhouette.
- Accent: orange with brass hardware.

### Buddy station

- Stable station ID: `CL3D_STA_BUDDY_WEDGE_V001`
- Center: `(0.00, 0.12, -5.00)`
- Polar center: `180°`, radius `5.00 m`
- Footprint: `3.55 m` tangent width x `2.20 m` radial depth
- Maximum visual height: `2.25 m`
- Display frontage yaw: `0°`
- Walk-up interaction point: `(0.00, 0.00, -3.55)`
- Energy outlet terminates toward reactor at `(0.00, 0.08, -2.20)`
- Physical metaphor: orbital beacon with companion pods moving on a brass arc.
- Accent: mint/green with violet trim.

### Option visibility at every station

- Current option occupies the center cradle at `100%` scale.
- Previous and next options occupy real adjacent cradles at `78%` scale.
- Neighbor centers sit `24°` around the local carrier arc from the current cradle.
- At least `35%` of each neighbor silhouette remains visible in the hub camera.
- Selection rotates the physical carrier one detent; it does not slide a flat row across the screen.
- Empty/unloaded content is represented by a softly glowing physical silhouette plate, never a spinner.

## 6. Central reactor, lever, and socket

### Reactor

- Stable asset ID: `CL3D_REACTOR_CORE_V001`
- Position: `(0, 0, 0)`
- Footprint: diameter `3.20 m`
- Glass chamber: diameter `1.90 m`, top `Y = 3.35 m`
- Empty reveal plinth top: `Y = 0.48 m`, diameter `1.15 m`
- Reactor is an obstacle; player navigation stops at radius `1.82 m`.
- Three feed sockets face the exact station energy outlets.
- The chamber remains transparent enough to read the empty plinth, but glass must not hide selection overlays.

Feed mapping:

- `SOCKET_feed_type`: points to Creature Type channel
- `SOCKET_feed_outfit`: points to Outfit channel
- `SOCKET_feed_buddy`: points to Buddy channel

### Tactile lever

- Stable asset ID: `CL3D_CTL_FABRICATE_LEVER_V001`
- Pivot position: `(0.92, 0.18, 2.18)`
- Footprint: `0.90 x 1.05 m`
- Neutral handle top: `Y = 1.20 m`
- Pull arc: `42°` around local `+X`, duration `0.38 s`
- Interaction collider is separate and inflated to produce at least a `72 x 72 pt` projected target at 4:3.
- Before all three selections: touching it gives a friendly wobble and sends three soft pulses toward unfilled stations. It never shows failure.
- After all three selections: pull starts fabrication immediately.

### Dormant embellishment socket

- Stable asset ID: `CL3D_CTL_EMBELLISH_SOCKET_V001`
- Position: `(-0.92, 0.14, 2.18)`
- Footprint: `0.82 x 0.82 m`
- State for first playable: capped, dark center, faint periodic breath; not selectable.
- Touch reaction: one curious purple pulse and a soft “later” visual curl; no lock, price, countdown, or scarcity message.

## 7. Camera and composition

Hub camera:

- Position: `(0.00, 12.50, 16.80)`
- Look target: `(0.00, 0.80, -0.80)`
- Roll: `0°`
- Perspective vertical field of view: `36°`
- Near/far clips: `0.10 m / 50.00 m`
- Camera may yaw no more than `8°` during station focus.
- Use a fixed camera for the first playable. Do not allow pinch, orbit, or free camera.

This produces an oblique top-down view: the radial convergence reads immediately, but machine height, floor thickness, paths, and rear wall remain visible.

Aspect behavior:

- Compose and approve at centered 4:3.
- On wider iPads, reveal horizontal overscan; do not scale UI or move world anchors independently.
- Keep all actionable geometry inside normalized viewport `X = 0.08...0.92`, `Y = 0.12...0.84` at 4:3.
- Never crop the current and adjacent option cradles.

Reserved future UI-safe zones:

- `SAFE_BACK`: normalized `X 0.00...0.16`, `Y 0.00...0.15`
- `SAFE_STATUS`: normalized `X 0.76...1.00`, `Y 0.00...0.15`
- `SAFE_HERO_BOARD`: normalized `X 0.30...0.70`, `Y 0.84...1.00`
- `SAFE_EDGE_GUTTER`: outer `4%` on every side

Only nonessential wall, floor, and ambient particles may project behind these zones. No station current choice, lever, or socket may project into them.

Station focus camera:

- Duration in: `0.45 s`, cubic ease-out
- Translate no more than `1.15 m`.
- Lower look target toward the active station by no more than `0.55 m`.
- Maintain reactor in frame as a secondary landmark.
- Return duration: `0.35 s`.
- Respect Reduce Motion by using a `0.15 s` crossfade/highlight with no camera travel.

## 8. Movement and interaction model

There is no virtual joystick in the first playable.

1. Hub opens with a player presence marker or helper token at `(0, 0.03, 6.30)`.
2. All three stations, the lever, and the dormant socket are raycast-pressable from the hub.
3. On touch-down, the station immediately lifts `0.04 m`, lights its route, and emits a tiny particle ping.
4. The presence marker follows a prevalidated nav spline to the station over `0.80...1.80 s`; interaction focus begins concurrently, so walking never delays feedback.
5. Horizontal swipe on a station’s physical rail changes one option per gesture.
6. Tapping a visible neighbor rotates that neighbor into the active cradle.
7. Tapping the current cradle confirms it and sends one colored packet down the energy channel.
8. Tapping elsewhere exits focus back to the hub without losing the selection.

Gesture thresholds:

- Station press: standard touch-up-inside after immediate touch-down reaction
- Swipe commitment: `24 pt` horizontal or `6%` of station projected width, whichever is smaller
- Vertical cancellation tolerance: `36 pt`
- One detent per swipe; no inertial multi-item spin
- Option rotation: `0.32 s` spring, damping ratio about `0.78`
- Current cradle lift: `0.12 m`
- Selected pulse: `0.26 s`

Idle help, if needed after observation:

- After eight seconds with no input, the nearest neighbor cradle performs one `5°` nudge and returns.
- No arrows, timers, nagging dialogue, or automatic selection.

## 9. Navigation and collider requirements

Navigation:

- Main walkable annulus: radius `2.80...6.25 m`
- Three approach spokes: minimum width `1.40 m`
- Maximum traversable slope: `5°`
- Maximum authored step: `0.08 m`; anything taller requires a ramp.
- Minimum visual clearance around moving station parts: `0.18 m`
- Presence marker radius: `0.24 m`
- Reactor nav exclusion radius: `1.82 m`
- Outer rim nav inset: `0.35 m`
- No nav link crosses an energy channel edge; channels are flush floor.

Colliders:

- `COLLIDER_floor`: one simple cylinder/disk or low-count convex compound.
- Static shell: convex compounds only; do not use rendered concave mesh as the runtime collider.
- Each station: one static base collider plus separate interaction and moving-carrier colliders.
- Reactor: one cylinder collider plus separate lever/socket interaction colliders.
- Screen-space press targets must be at least `64 x 64 pt`; lever target at least `72 x 72 pt`.
- Inflate interaction proxies up to `0.18 m` beyond visible geometry where needed.
- Interaction proxies never block navigation.
- Moving carrier collisions are disabled during a detent tween; hands/avatars cannot be trapped.

Occlusion acceptance:

- From the hub camera, at least `80%` of every current-choice silhouette is visible.
- Reactor may overlap neighbor cradles, but never a current cradle.
- Rear Buddy current cradle remains above the reactor collar in screen space.

## 10. Node, socket, and animation contract

Every exported mesh must use these common nodes where applicable:

- `ROOT`
- `GEO_STATIC`
- `GEO_MOVING`
- `COLLIDER_BASE`
- `COLLIDER_INTERACT`
- `SOCKET_interact`
- `SOCKET_label_optional`

Station-specific nodes:

- `PIVOT_option_carrier`
- `SOCKET_option_current`
- `SOCKET_option_previous`
- `SOCKET_option_next`
- `SOCKET_energy_out`
- `SOCKET_vfx_touch`
- `SOCKET_vfx_confirm`

Reactor-specific nodes:

- `SOCKET_feed_type`
- `SOCKET_feed_outfit`
- `SOCKET_feed_buddy`
- `SOCKET_output_reveal`
- `SOCKET_vfx_core`
- `SOCKET_vfx_top`
- `SOCKET_vfx_base`
- `SOCKET_lever_mount`
- `SOCKET_embellishment_mount`

Named runtime hooks:

- `station.touch_down`
- `station.focus_enter`
- `station.option_previous`
- `station.option_next`
- `station.option_confirm`
- `station.focus_exit`
- `reactor.feed_type`
- `reactor.feed_outfit`
- `reactor.feed_buddy`
- `reactor.fabricate_start`
- `reactor.assembly_stage`
- `reactor.polish_stage`
- `reactor.reveal`
- `lever.wobble_unready`
- `lever.pull_ready`
- `socket.dormant_touch`

Suggested animation clips or equivalent procedural tweens:

- `idle_breathe`: `2.8 s` loop, scale change <= `1.5%`
- `option_detent_left`: `0.32 s`
- `option_detent_right`: `0.32 s`
- `confirm_pulse`: `0.26 s`
- `reactor_charge`: event-driven loop, no countdown meaning
- `reactor_reveal`: `0.70 s`

Do not bake option art, particles, glow, or selection state into the static geometry.

## 11. Particle and overlay sockets

Particle systems are runtime overlays attached to sockets, not modeled geometry:

- Touch ping: `24` particles maximum, lifetime `0.35 s`
- Confirm packet: `12` particles moving along the selected channel, lifetime `0.55 s`
- Reactor idle motes: `36` live particles maximum
- Fabrication spiral: `80` live particles maximum
- Reveal burst: `120` particles for `0.45 s`, then fully released
- Dormant socket curl: `18` particles maximum

Use one shared `256 x 256` or `512 x 512` soft-shape atlas. Particles are camera-facing quads with depth fade; no mesh particles in the first playable.

## 12. Lighting and materials

Lighting:

- One warm key, direction approximately from `(-6, 10, 8)`, `4200 K`, intensity ratio `1.0`
- One cool hemispheric/ambient fill, `7000 K`, ratio `0.45`
- One soft reactor rim contribution, `5600 K`, ratio `0.35`; emissive appearance may be faked
- Only the key casts a real-time shadow.
- Shadow map: `1024 x 1024`, soft, maximum shadow distance `18 m`
- Contact shadows or blob shadows are preferred over additional shadow-casting lights.
- Do not bake directional highlights or hard shadows into base-color textures.

Material palette:

- Dark plum trim: `#2A1538`
- Reactor purple: `#7650C8`
- Mint: `#73D7B2`
- Teal glass/energy: `#46BFC5`
- Warm orange: `#EF8D45`
- Brass: `#C99A4A`
- Cream highlight: `#F4E4C0`

Production materials are mostly base color plus constant roughness. PBR maps are optional, not a requirement.

- Opaque toy panels: roughness `0.70...0.88`, metallic `0`
- Brass: roughness `0.42`, metallic `0.35` maximum
- Glass: opacity `0.38...0.52`, roughness `0.18`; one shared glass material
- Emissive channels: low-strength emissive map or unlit overlay, never bloom-dependent for readability
- Keep dark-plum edge definition in geometry/material boundaries; do not require ink-line post-processing.

## 13. Mobile geometry, texture, and runtime budgets

First playable hard targets:

- Total visible LOD0: `<= 65,000` triangles
- Typical hub view after LOD selection: `<= 42,000` triangles
- Shell: `<= 18,000`
- Each station: `<= 8,000`
- Reactor including lever/socket: `<= 11,000`
- Small props and rails combined: `<= 8,000`
- Draw calls in hub: `<= 45`
- Unique runtime materials: `<= 18`
- Transparent draw calls: `<= 8`
- Texture working set: `<= 64 MiB` after platform compression
- Maximum single texture: `2048 x 2048`
- Station option art: prefer shared `2048` atlas or per-category `1024` atlas
- Target: stable `60 fps`; minimum acceptable on supported oldest device: `30 fps` without input latency spikes

LOD:

- `LOD0`: authored target above
- `LOD1`: approximately `55%` of LOD0 triangles; switch below `260 px` projected height
- `LOD2`: approximately `28%` of LOD0 triangles; switch below `140 px`
- Keep silhouette, current/neighbor cradle locations, sockets, and collider proxies identical across LODs.
- Glass may become an unlit tinted plane at LOD2.

Export:

- Delivery formats: `.glb` and `.usdz`
- GLB is the geometry/material inspection source.
- USDZ is the iOS integration target.
- Embed textures for proof files; production may use shared external atlases if the renderer supports them.
- No Draco-only dependency for the USDZ path.

## 14. 2D-sprite fallback plan

The first playable may use camera-locked 2D renders while preserving the same world coordinates and interaction proxies.

### World representation

- Keep the 3D floor/nav/collider proxies as procedural primitives.
- Render each station and reactor from the exact hub camera with transparent background.
- Place each render on a camera-facing quad at its documented world anchor.
- Size each quad in meters from the asset’s projected bounds; do not position by arbitrary screen pixels.
- Use depth-write off, depth-test on, and explicit render order only for ties.
- Keep an invisible primitive proxy for all raycasts, nav exclusions, and sockets.
- Focus camera does not orbit in fallback mode; use a `1.08x` station scale tween and background dim instead.

### Required fallback layers

- `CL2D_ENV_RADIAL_SHELL_BG_V001`: opaque room/floor render, `2732 x 2048`
- `CL2D_STA_TYPE_IDLE_V001`: transparent station render, max `1024 x 1024`
- `CL2D_STA_OUTFIT_IDLE_V001`: transparent station render, max `1024 x 1024`
- `CL2D_STA_BUDDY_IDLE_V001`: transparent station render, max `1024 x 1024`
- `CL2D_REACTOR_IDLE_V001`: transparent reactor render, max `1024 x 1024`
- `CL2D_OPTION_TYPE_ATLAS_V001`: current/previous/next content cards
- `CL2D_OPTION_OUTFIT_ATLAS_V001`
- `CL2D_OPTION_BUDDY_ATLAS_V001`
- `CL2D_VFX_SHARED_ATLAS_V001`: pings, energy packets, spiral, reveal
- `CL2D_SHADOW_BLOBS_V001`: shared soft contact shadows

### Tween-only animation

- Idle: `1.0...1.015` breathing scale, 2.8-second loop
- Touch: `1.00 -> 1.045 -> 1.00`, `0.18 s`
- Option change: rotate/translate three content overlays along a shallow arc; station body remains fixed
- Confirm: cradle overlay lifts `8...12 px` at 4:3 reference and flashes its channel
- Reactor: overlay masks and particles; no baked video required
- Lever: separate two- or three-frame sprite around the documented pivot

All fallback actions emit the same named hooks as the eventual 3D assets. This is required so textual deterministic inspection can verify launch, first action, selection, fabrication, reveal, replay, exit, and cleanup without relying on screenshots.

## 15. Asset manifest

### A. Meshy-generated now / proof set

These are the smallest useful proof assets. Their current generation status is recorded separately in `/tmp/creature-lab-meshy-generation.json`.

1. `CL3D_ENV_RADIAL_SHELL_POC_V001`
   - Purpose: room/floor massing proof for Concept C
   - Authored size: `15.50 x 2.80 x 15.50 m`
   - Meshy target: `12,000` faces
   - Exports: `cl3d_env_radial_shell_poc_v001.glb`, `cl3d_env_radial_shell_poc_v001.usdz`
   - Required cleanup later: scale correction, collision proxy, station pad verification, UV/material consolidation

2. `CL3D_STA_TYPE_WEDGE_POC_V001`
   - Purpose: prove one physical radial selector with current and peeking neighbors
   - Authored envelope: `3.80 x 2.65 x 2.35 m`
   - Meshy target: `7,000` faces
   - Exports: `cl3d_sta_type_wedge_poc_v001.glb`, `cl3d_sta_type_wedge_poc_v001.usdz`
   - Required cleanup later: separate carrier pivot and three option sockets

3. `CL3D_REACTOR_CORE_POC_V001` — optional only after the first two previews are accepted and credit use is clear
   - Purpose: prove radial feed/readability and chamber silhouette
   - Authored envelope: `3.20 x 3.35 x 3.20 m`
   - Meshy target: `9,000` faces
   - Exports: `cl3d_reactor_core_poc_v001.glb`, `cl3d_reactor_core_poc_v001.usdz`
   - Required cleanup later: exact sockets, lever mount, glass separation, particle nozzles

### B. Procedural primitives

1. `CL3D_PROXY_FLOOR_DISC_V001` — cylinder, `15.50 m` diameter x `0.35 m`
2. `CL3D_PROXY_NAV_RING_V001` — invisible annulus and three approach spokes
3. `CL3D_PROXY_REACTOR_BLOCKER_V001` — invisible cylinder, radius `1.82 m`
4. `CL3D_PROXY_TYPE_COLLIDER_V001`
5. `CL3D_PROXY_OUTFIT_COLLIDER_V001`
6. `CL3D_PROXY_BUDDY_COLLIDER_V001`
7. `CL3D_CTL_FABRICATE_LEVER_V001` — separate base, pivot, and handle
8. `CL3D_CTL_EMBELLISH_SOCKET_V001` — separate capped socket
9. `CL3D_CHANNEL_TYPE_V001` — spline/strip from Type to reactor
10. `CL3D_CHANNEL_OUTFIT_V001`
11. `CL3D_CHANNEL_BUDDY_V001`
12. `CL3D_OPTION_CRADLE_CURRENT_V001`
13. `CL3D_OPTION_CRADLE_NEIGHBOR_V001`

### C. 2D overlays

1. `CL2D_OPTION_TYPE_ATLAS_V001`
2. `CL2D_OPTION_OUTFIT_ATLAS_V001`
3. `CL2D_OPTION_BUDDY_ATLAS_V001`
4. `CL2D_VFX_SHARED_ATLAS_V001`
5. `CL2D_CHANNEL_FLOW_STRIP_V001`
6. `CL2D_SELECTION_HALO_V001`
7. `CL2D_SHADOW_BLOBS_V001`
8. `CL2D_REACTOR_GLASS_GLOW_V001`
9. `CL2D_HERO_BOARD_PLACEHOLDER_V001` — reserved, not shown in first hub

### D. Deferred polish

1. `CL3D_ENV_RADIAL_SHELL_PROD_V001` — clean modular production shell
2. `CL3D_STA_TYPE_WEDGE_PROD_V001` — retopologized and rigged proof
3. `CL3D_STA_OUTFIT_WEDGE_PROD_V001`
4. `CL3D_STA_BUDDY_WEDGE_PROD_V001`
5. `CL3D_REACTOR_CORE_PROD_V001`
6. `CL3D_PROP_REAR_PIPEKIT_V001`
7. `CL3D_PROP_WALL_RIBKIT_V001`
8. `CL3D_PROP_TOOL_CLUTTER_V001` — edge-only; never blocks paths
9. `CL3D_FX_GLASS_DISTORTION_V001`
10. `CLAUDIO_LAB_INTERACTION_PACK_V001`
11. Production retopology, UVs, material atlas, authored LODs, accessibility color checks, and physical-iPad profiling

## 16. Acceptance checklist for the next artist/agent

- Concept C radial convergence is visible within one second.
- The room reads as a thick, navigable place, not a flat wheel or menu.
- Creature Type, Outfit, and Buddy are distinguishable from silhouette before labels.
- Current choice and both neighbors are visible at every station.
- Front entrance, annular path, and three walk-up points are unobstructed.
- Reactor, lever, and dormant socket are all physically separate and pressable.
- Three energy channels terminate at named reactor sockets.
- Camera framing respects all four UI-safe zones at 4:3.
- No station current choice is occluded by the reactor.
- Colliders are simple proxies; rendered concave meshes are not runtime colliders.
- Every input has immediate visual feedback.
- No timer, penalty, currency pressure, lockout, streak, or failure state is introduced.
- GLB and USDZ names match the stable IDs.
- Source prompts and generation status match the two JSON files in `/tmp`.
- No Blender file or Blender-generated output is part of this handoff.
