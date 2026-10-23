CIVILIZATION ASSET CATALOG — planning draft, 2026-10-18

Open civilization-assets.sqlite in a SQLite browser, use the CSV in a table
viewer, or run query_catalog.py. JSON is provided for a future app inspector.
No model generation, gameplay execution, cloud database or app integration is
included in this database. No 2000-model batch has been requested or run here.

COUNTING
2000 named candidates in 40 packs of 50. These include complete objects and
modular building/vehicle components. States, LODs, colors and placed instances
are counted separately. This is a breadth-first proposal, not proof that 2000
unique meshes are needed or that 2000 approved designs exist. Several candidates
can share a base mesh; others will require multiple parts and animations.
Two concepts link to existing soft-toy studies; the rest are unmodeled.

SELECTED STYLE
Soft toy: simple rounded forms, bevels, matte surfaces, independently recolorable
regions. Cheap geometry and shared materials. No image texture or fur requirement.
Existing study geometry is not yet rigged, optimized, collision-tested or approved
as a production asset. The generic tree study is not assigned to a named species.

DATABASE BOUNDARIES
assets: semantic candidates and planning priorities.
representations: actual mesh/part/state/LOD/icon production records.
asset_eras: many-to-many setting tags, not an evolutionary or cultural ladder.
visual_states: proposed rendering contracts driven by simulator state.
affordances: action contracts, separately labeled source-supported or proposed.
bindings: inspected source mappings; none means integrated renderer behavior.
relationships: proposed use/attachment/composition dependencies.
scenarios: bundles; the 1920s ranch is the first production target.
evidence: reviewed chats and source paths.
production_batches: measured timing, with untimed work left NULL, never zero.

CURRENT SIMULATION REVIEW
Procedural: physical workers, resource hauling, construction, animal care,
cleanup, trail wear, replay, map rerolls and a selectable region size.
Procedural 2: simulator owns facts; crop sales and pair-specific bonds are goals.
Inspected horse source records approach, ride/play and completion. It tags
Abbie/Ani affinity and a temporary company effect; persistent pair bonds are not
implemented there. The catalog must not imply that a model implements a mechanic.
1920s ranch candidates still need technology, species and locality review.

ESTIMATING COVERAGE
2000 can be a useful reusable core for a stylized multi-scale game, not an
exhaustive representation of life and civilization. Build complete activity loops
first. Count needed representations for each scenario, then merge genuinely
reusable geometry. Do not multiply every asset by every possible state or color.
Microscopic, local and astronomical views need different scale conventions;
physical dimensions remain NULL until reviewed. No chronology is asserted.
Interstellar/intergalactic and alien concepts are design fiction, not predictions.

TIME PER TEN ASSETS
Measured local Blender batch: 5.65 seconds wall time, including startup/exit.
Geometry creation: 0.214 seconds; GLB exports: 1.723 seconds; scene save: 0.002
seconds. First GLB export includes exporter initialization. Ten different subjects:
horse, shelter, tree, trough, hay bale, bucket, crate, fence, barrel, bench.
Three builders reused, seven newly scripted simple props. This was a throughput
benchmark, not ten visually approved production assets. Authoring/review untimed.
Planning estimates per ten: simple new assets 15–35 minutes authoring plus
10–25 minutes review/revision; unfamiliar mixed creatures/buildings/vehicles
45–120 minutes overall. Animation and integration are additional. Reusable color
or size variants can be quicker but are not ten genuinely new asset types.
At 200 batches, 25–60 minutes per batch implies 83–200 production hours before
broader integration. This is arithmetic on estimates, not a delivery commitment.

QUERIES
python query_catalog.py --search horse
python query_catalog.py --era planetary --limit 20
python query_catalog.py --stats

MAINTENANCE
Stable IDs use pack.slug. Do not regenerate over reviewed data; apply migrations.
build_catalog.py deliberately refuses to overwrite an existing SQLite file.
The seed list is authored planning data, not imported licensed 3D content.
