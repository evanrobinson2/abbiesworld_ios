# Square cliff garden v0.4.0

The prior layout stretched cells to 68x56 and made the painted river/bridge dictate movement. User rejected that result and the blanket blur. This revision uses one 10x10 grid of 60x60 squares, origin (340,160), with a sharp grass floor. The river column restriction and bridge-reservation coordinates are removed. All 100 squares belong to the board, with randomized rocks, encounters and ingredients. Start remains (2,7), cauldron (3,6), goal now (10,1). Parents and instructions sit outside the play area.

One cardinal square per action, first-reveal healing and reciprocal goon recovery, potions, three difficulties and level 3 goal remain. Fog is an edge-to-edge veil with a visible lattice and gold adjacent targets. It no longer blurs the whole floor. The original cliff poster is scenery around the board; its bridge is covered by the independent playfield. No new or modified native art assets.

3000 seeded boards checked for connectivity, resources, deterministic layouts and winning potion plans. All difficulty playthroughs and menu controls checked through native handlers; packaged Easy additionally replayed. Human visual acceptance, host-world and device checks pending.
