# Living Ranch release — 2026-10-20

Canonical page: https://abbies-ranch-atelier.vercel.app/simulations/

This branch checkpoint reconciles the complete current production source
(baseline dpl_6QvQdXGYUSM9DtZdmEVXwUyW6w3H, 2,698 source entries) with the
living Ranch implementation in dist/simulations. Existing app pages, shared
appearance settings, navigation, assets and APIs are preserved.

Includes daily/weekly routines, lifecycle and identity history, ecology,
continuous seasonal sunlight, bounded weather, and experimental tile physics
with long-press pickup. Physics remains experimental: crowded dynamic drops
may be slow and recovery may restore the original scene. Weather uses a fixed
GPU particle pool and instanced clouds; it is not a fluid or roof-collision
simulation. See dist/simulations/DAILY-LIFE.md and tile-physics/INTEGRATION.md.

Validation: 110 Ranch/physics tests pass in both the working source and this
portable repository layout. The existing production build gate is retained;
its route-file validation now supports nested HTML destinations within root.
The Vercel release uses the unchanged production source hashes plus additive
simulation files and the nested-route validation/routing updates.
