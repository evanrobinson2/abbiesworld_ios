# UE5 cooperation and integration rules

Destination: evanrobinson2/abbiesworld_ios, branch UE5 (case sensitive).
Coordinator: Mother Hen chat. All four workstreams feed this branch.

## Ownership
- Overland view: world composition, terrain, camera, world navigation and atmosphere.
- 3D Artist: original scenery library, stable asset IDs, style variants and generation provenance.
- Overcooked!: kitchen/restaurant gameplay and its assets, isolated from world core.
- Desktop Dungeons: Potion Meadow gameplay and its original family/encounter assets.
- Mother Hen: repository integration, shared project/config, dependency contracts and release validation.

## Cooperating without overwrites
1. Work in your own workspace or feature branch based on UE5. Do not push directly to UE5, force-push, or modify another owner's files. Mother Hen integrates reviewed handoffs.
2. Propose canonical project and Content paths before migrating assets. Preserve existing Unreal package paths during initial intake; changing a folder requires editor migration and reference validation. Each owner supplies a dependency list; shared configs and entry maps require coordinator review.
3. Hand off an immutable snapshot or commit with file list, SHA-256 hashes, engine version, source paths, asset IDs, dependencies, provenance, validation evidence and explicit limitations. Notify the coordinator when ready; never copy files while their producer is writing them.
4. Coordinate shared changes directly with the affected owner. No concurrent editor saves to the same project, map, asset or generated registry. Use separate staging projects and merge under coordinator control.
5. Preserve stable asset IDs. Record units in centimeters, axes, pivot, dimensions, collision, materials, texture settings, rig/animation state and intended camera use. Style variants use separate identities or explicit variant mappings.
6. Commit original/authorized source, scripts, configs and necessary native assets only. Exclude extracted commercial game media, private study assets, credentials, purchases, caches, Intermediate, Saved, DerivedDataCache and build products. Check provenance before publication to this public repository. Use Git LFS for large native binaries after confirming support; never push a file over GitHub's size limit.
7. Validate import and reload, package references and a representative render/play flow. Label static previews, browser prototypes, native editor success, packaged gameplay and device validation separately. An editor render does not prove iOS delivery.
8. Keep papercraft and Halloween Candyland distinct style variants. 3D Artist and Overland jointly verify geometry/material placement and tilt-shift presentation before release. Human visual approval remains explicit.
9. Provide prompt visual proofs and clear acceptance status. Mother Hen publishes integration status and unresolved dependencies. A handoff is ready only when evidence and limitations accompany it.

## Initial intake status
UE5 starts from main. No UE5 project existed in the repository at branch creation.
The four local workstreams are active; their current folders are not yet approved immutable release snapshots.
Do not treat raw study directories or browser previews as a finished native/iOS product.
