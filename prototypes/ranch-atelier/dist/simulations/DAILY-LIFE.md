# Believable-day pass

## Time policy
At 1×, a calendar day takes 180 active real seconds. Travel, work timers and animal consumption run at 6×. Thus 50 metres at 1.6 m/s takes about 5.2 real seconds, less than a calendar hour (7.5 seconds). Calendar, needs and movement all use the same capped frame delta; under sustained rendering stalls the whole simulation slows together. Hidden tabs pause. Lifetime year length remains independently adjustable; accelerated years are intentionally a toy abstraction, not a 365-day calendar.

## Implemented
- Seven-day week with distinct school/work weekdays, Saturday chores/play and Sunday leisure. Individual wake/bedtime offsets. Meals and school/town work happen inside the home portal; no human nutrition economy is implied.
- Physical travel to playground/garden/bench, timed play/work gestures and completed-activity counters. Chores finish before switching routine. Horse brushing approaches a pen; an available horse approaches the caretaker. Goats follow another goat and choose their climbing mound; chickens gather for feeding/scratching, retreat under the coop roof at night, and scatter from nearby people.
- Need-driven animal movement takes priority over routines. Urgent care can call visiting adults outside regular hours. Stock and cargo remain conserved by the existing delivery loop.
- House windows/porches use awake occupants actually at home, excluding school/work portal absences. Shared service lighting remains available at night.
- Animals have species-specific renewable lifetimes and growth scale. They renew in place, reusing the same render objects; generation increments. This is baseline replenishment, not a livestock breeding model.
- Fixed planted flower patches cycle seedling/flower/seed/renewal at the same anchors; existing meadow appearance cycles, and seasonal trees retain the established seasonal shader. Grazing patches thin and recover while retaining baseline cover. A bounded set of pollinator visuals visits gardens outside winter/rain/night.
- Deterministic daily weather: rain sends leisure participants inside, leaves puddles and contributes accounted water; heat encourages shelter; wind moves foliage. Winter snow continues using the established seasonal appearance.
- Up to 96 reused footstep marks, plus opt-in quiet synthesized ambient cues in Advanced. One audio context; short-lived voices disconnect. No recurring timers or unbounded trail objects.

## Limits still requiring development
- Existing library trees/shrubs do not yet have individual senescence/reseeding state. Renewable patches are a first ecological layer, not a complete ecosystem.
- Pollinators are habitat visuals, not a pollination/yield population model; berry-eating birds are not implemented.
- Human social preference/relationship selection is still rudimentary. Favorite-bench and goat-companion choices are stable but not a social affinity model.
- Activity counts are completed visits/chores, not independently stocked eggs/apples/meals. No claim of a production economy.
- Snow/wet weather does not yet choose different routes. Firewood stacks, changing bedding, gate sounds and spatial conversation recordings remain future work. Ambient cues are synthesis, not a full soundscape.
- Care recovery was observed in the current saved ranch and tested with transport/consumption at three distances in summer/winter conditions. This is not proof of sustained care in every generated layout.

## Verification
`node --test ranch-diorama-lab/*.test.mjs ranch-diorama-lab/tests/*.test.mjs ranch-diorama-lab/simulation/*.test.mjs`

Habitat rules import the pure play specification, so Node no longer needs the browser's Three.js import map for layout regression tests.

## Compact shared life records
Humans, livestock and the new flower patches now share durable individual IDs. Render slots remain reusable, but an animal/annual-plant successor receives a new identity and generation. Perennial pasture regrowth retains its identity. One known predecessor supplies simple bounded, deterministic traits; this is stylized lineage, not a reproduction model. Human learned interests and practiced chores remain separate from biological appearance.

Default Medium story detail retains 12 recent events per ordinary individual, 3 salient memories, 64 global events and 128 recently deceased records. Hero nomination permits 8 memories and 24 recent events; demotion preserves existing retained memories. Low/Medium/High/Ultra affect story retention and bookkeeping cadence only, not rendering, physics, needs or elapsed time. Older origins are explicitly summarized. A 700-generation annual-plant test verifies bounded storage and valid references after serialization. Existing trees and decorative pollinators do not acquire individual biographies through this change.

## Design suggestions, not an immediate feature checklist
Future careers, broader species, principles, detailed affinities and reactions to loss should reuse the same identity, event, memory, relationship and activity-choice primitives. An eventual perception/attribution layer must distinguish what happened from what an individual knows; grief need not imply hatred. Do not bolt on a subsystem for each example or claim these behaviors exist now. Preserve deterministic restore, bounded retention, truthful readouts and baseline survival. Known performance follow-up: many simultaneous successors currently repeat ancestor compaction; batch/index that operation with equivalence tests before increasing population scale.

## Presentation clock
Periodic foliage, idle gestures, livestock head/tail movements and decorative pollinators use a separate integrated clock. Its rate is `0.65 + 0.25 * tanh(log2(playbackSpeed) / 3)` animation seconds per active real second: 0.65 at 1×, smoothly bounded between 0.4 and 0.9. Pausing/hidden tabs freeze it, frame stalls do not cause catch-up, and speed changes do not reset phase. Walking gait remains distance-driven. Calendar, needs, chores and ecological growth retain simulation time. Foliage displacement was reduced from 0.08 to 0.025 shader units; reduced-motion preference disables wind displacement.

## Optional local tile experiment
Advanced now offers Physical experiment and original Glass House reassembly. Physical mode is a kinematic Lift/Tilt/Return harness using actual generated meshes and anchored fixture bindings, with Earth/Moon gravity on the selected tile. Bodies remain upright sphere approximations. It does not implement free dragging, dynamic tile drops, ragdolls or rebuilt routes on displaced tiles. Panic/Carry on currently change interruption/recovery handling, not a full emotional response model.

Life/calendar pause during either mode. In-flight experiments are not persisted: the previous normal save remains recoverable. Cancel restores the combined behavior and physical transaction. Physical Return waits for settled bodies on the original connected tile and navigation-valid footing; after 12 physical seconds without recovery it explicitly rolls back the experiment. Real generated-scene tests revealed footing mismatches, so physical mode remains experimental. Glass House uses disposable copies and original Sandbox spring code; Return restores original visibility and resumes the day. Camera bindings are unchanged.

Recovery follow-up: behavior proposes one waypoint within 2 metres using existing bounds/obstacles/peers, with 0.12 m extra target clearance. Physics retains pose ownership and steers horizontally at up to 0.6 m/s for at most 6 seconds, only on actual contact; gravity and mesh collisions remain active. Release checks are unchanged. The saved four-tile ranch completed Earth/Panic Lift→Return with zero retained bodies and resumed the day; impossible cases still roll back at 12 physical seconds. This does not establish universal recovery across layouts.

The initial physics harness currently uses equal 1 kg proxy bodies. Species-specific mass calibration is not implemented; pair impacts are not a realistic livestock mass model.

### Local verification follow-up
- Live loaded-job Cancel and successful physical Return ledgers are saved in `cancel-ledger-evidence.json` and `return-ledger-evidence.json`: clock, identities, resource totals, reservations and jobs passed; Cancel restored the exact ledger.
- Phone layout checked at 390 × 844: one 56 px toolbar, all controls within the viewport (`mobile-toolbar-verified.png`).
- Physics diagnostics build the entity lookup once per frame, without changing physics fidelity.
- Current ranch and tile-physics test invocation passes 69 tests. Physical recovery remains experimental; dense arrangements may safely roll back after the bounded recovery timeout.

### Dynamic tile controls (local integration)
Advanced contains an explicit Move tile tool and Drop action. The selected tile
can be dragged in a camera-facing plane; release calls the rigid adapter's drop.
Modified camera gestures remain owned by the shared camera contract. Escape,
pointer cancellation and lost capture roll back the transaction. A second touch
rolls back and hands both pointers to the existing camera implementation.
Mouse drag → Drop → Escape and Lift → Drop → Cancel passed live exact ledger
checks on seed 99589. Touch handoff remains subject to independent browser checks.
Sunlight now follows a continuous stylized seasonal 42°N arc; it uses calendar
time, unlike gentle periodic idle animations. Shadow coverage fits the ranch.

### Weather
Automatic seeded weather fronts change every six simulated hours with seasonal
probabilities. Advanced Weather can select clear, cloudy, rain, wind, hail, snow
or heat. This setting is saved with the ranch; Automatic remains the default.
Visual transitions ease over real seconds, independent of calendar acceleration.
A fixed 1,200-point GPU pool draws rain streaks, drifting snow or small bouncing
hail. Ten instanced alpha-masked cloud planes reuse the existing sun shadow map.
Maximum added main-view draws: two, plus cloud shadow rendering. There are no
per-particle physics bodies, raycasts, or unbounded particle allocations. Weather
geometries, materials and texture are disposed when the ranch is replaced.
Rain/hail trigger shelter, puddles and water collection; livestock seek shelter
in precipitation. Wind remains gentle and obeys reduced-motion preferences.
Ground snow cover is seasonal. Precipitation is a visual approximation anchored
to sampled terrain, without roof collisions, hail damage or fluid simulation.
