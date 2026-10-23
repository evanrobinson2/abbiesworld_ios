# Shared scene mechanics

`resource-loop.mjs` is the renderer-independent core used by the live ranch.
`../ranch-life-state.mjs` is its first scene adapter, not a second implementation.

## Define a scene, do not copy a simulator

1. Declare resources: starting stock, external replenishment, destination refill
   threshold, job priority, load size and destination capacity.
2. Declare needs: a normalized deficit, growth rate, start/stop thresholds,
   resource consumption rate and relief per consumed unit.
3. Bind generated places to stable site IDs and real access points. Reuse
   `ranch-navigation.mjs` and `ranch-routes.mjs` for obstacle-aware movement;
   those existing functions already accept geometry rather than ranch nouns.
4. Reserve a delivery; route to its source; collect only after arrival; route to
   its destination; finish after arrival. Cancel failed routes to return cargo
   and release reservations. Never award a delivery because an animation ended.
5. Advance needs with arrival evidence from actual movement. Derive UI and
   rendered station contents from this same state.

A workshop can declare timber, a workbench, a porter and work demand. A moon
base can declare oxygen, habitat tanks, technicians and oxygen deficits. Their
geometry, production recipes and policies differ; reservation, carrying,
consumption, cancellation and accounting do not. The workshop test exercises
this today; no workshop or moon-base scene is claimed to be implemented.

## API

- `createResourceState(resources, sites, stock?)`
- `advanceResources(state, dt)` / `advanceConsumer(state, site, consumer, rules, dt, arrived)`
- `reserveDelivery(state, workerId)` → job or null
- `collectDelivery(state, job)` / `finishDelivery(state, job)` / `cancelDelivery(state, job)`
- `resourceBalance(state, resource)` → zero, within floating point tolerance

Stock + station contents + carried loads + consumed quantities equals initial
supply + replenishment. Duplicate collection/completion is harmless. A worker
owns at most one delivery. Resource names and units belong to the adapter.

`baseline=false` stops outside replenishment without replacing logistics.
Grazing remains ranch policy. Crop production, human nutrition, breeding,
economics and new scene renderers are not implemented by this core.

## Persistence

Serialize state and worker movement together. On restore, `sites` and the ranch
compatibility alias `pens` must reference the same array; each worker's job must
reference `state.activeJobs[job.id]`, not a separate deserialized copy. Save
presentation/camera separately. Lighting and camera changes must never recreate
simulation state.

## Spatial contract

`ranch-habitat.mjs` defines enclosure dimensions, shelter placement and rest
slots once. Rendering and movement consume it. `ranch-shelter.mjs` reuses the
existing calibrated roof and supporting timbers as an open shelter; support
footprints enter the collision system. New families should provide similarly
explicit access and occupancy data, rather than infer semantics from mesh names.

Run `node --test simulation/*.test.mjs ranch-life.test.mjs` from the ranch folder.

## Instance ownership and worker workflow

`spatial-bounds.mjs` supplies `hexBounds(radius)` and
`boardBounds(plans, radius)`. These capture their dimensions and centers. The
actual generator records `assembly.radiusMetres`; the live runtime binds its
own bounds once, including after loading a saved instance. Generating or
resuming another scene cannot change these closures.

`delivery-workflow.mjs` supplies `stepDelivery(worker, dt, hooks)`. The hooks
provide reservation/accounting, source/destination/home points, routing,
movement arrival evidence, and status text. The shared cycle handles timed
collection/delivery, completion, rest and cancellation after failed routes.
A scene may map phase names for save compatibility. The ranch retains
`to-pen`; the generic default is `to-destination`.

Every runtime should own these capabilities:

- `state`, `bounds`, and its route network: never read another scene's globals.
- `update(dt)`: advance only this instance.
- `snapshot()`: detached state plus movement, targets and carried jobs.
- `restore(snapshot)`: restore stable identities and rebind active jobs.
- `dispose()`: release unfinished reservations/cargo before the view releases
  meshes. Cached instances stay alive and are not disposed on a mere switch.

The ranch implements this contract. Its DOM, portraits and species policies
remain in the scene adapter; another family does not need to copy them.
