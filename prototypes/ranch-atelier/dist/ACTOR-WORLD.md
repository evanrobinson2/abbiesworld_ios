# Shared world actors

## Where it runs

Canonical `/sandbox/outbreak` is the persistent shared-world encounter workspace. Exact generator slugs `/sandbox/wizard`, `/sandbox/rabbits`, `/sandbox/zombies`, and `/sandbox/brains` use the same scene composer, terrain, paths, cards and board persistence. The current main Sandbox editor stays intact; its Scenarios drawer links to Shared world actors. The separate Archers vs Zombies demonstration remains unchanged.

## Definitions and mechanics

`actor-catalog.mjs` defines actor senses, movement, health, diet tags, equipment and abilities. `actor-decisions.mjs` uses Yuka GoalEvaluator interfaces for flee/engage/rest desirability. Resting actors choose deterministic reachable wander goals. `world-navigation.mjs` uses Yuka's binary heap for serializable A* jobs, spatial attachments and connected-region rejection. See vendor/yuka for the MIT license and pinned source provenance.

`actor-projectiles.mjs` advances physical fireballs toward a fixed aim point with travel time, swept body/obstacle hits, splash, mana and burning. Bite, broom, claw and fire all resolve through the same damage stage. Collateral damage is possible. Obstacle footprints are conservative vertical columns; terrain is sampled at half-metre intervals. No flight, roof meshes, environmental fire propagation or building destruction is claimed.

Affinities inherit from place unless overridden per object. Explicit symmetric allied/neutral/hostile relations override diet matching, with familial, tribal, political, regional, then national precedence; hostile wins conflicts at one tier. Different nationality alone is neutral. Treaties stop new attacks and clear relevant retaliation, but physical fireballs already in flight and existing burns finish normally.

## Scaling

512 active actors maximum. Simulation ticks at 250 ms; up to 96 decisions, 96 perception candidates per decision, and 2048 path heap pops per tick; resumable paths use 64-pop slices. Persistent round-robin cursors keep overload fair and deterministic. All active actors move each tick. Crowds above 64 use shared instanced geometry, including optional health bars; individual actions remain in the admin list. Saves batch every two seconds, flush on pause/hidden, and hidden tabs stop without offline catch-up.

This is bounded local simulation, not a claim of millions of detailed NPCs. Large graphs still cost memory for pending searches; all current world state is cloned for a step and retained by history. Future scale work: region-level planning, shared flow fields for common goals, incremental snapshots, worker simulation, lower-frequency remote regions and explicitly approximate distant populations. Crowd avoidance/reservations and richer behavior trees remain future work.

## Research basis

- Yuka official source: https://github.com/Mugen87/yuka
- RimWorld developer region reachability: https://ludeon.com/blog/2013/07/reachability-at-last/
- Evan PC research: Clanfolk assembly metadata indicated queued/cancellable path requests, map versions, reservations and task queues; this is architecture evidence, not recovered algorithms. ONI chore-priority and They Are Billions mechanics notes informed scope. No proprietary game implementation was imported.

## Validation

Tests cover original zombie/broom encounters, real generated wizard/wildlife encounters, swept impacts, blockers, burning, explicit nations/treaties, save/reload replay, serialized pending searches, topology changes, load limits and instanced crowd drag/HP behavior. The benchmark includes state cloning but excludes renderer, UI, history and saving; see the release benchmark artifact for measured results.
