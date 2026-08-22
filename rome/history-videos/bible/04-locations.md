# Locations — Marcianople as a Virtual Set

Status: **SKELETON — awaiting research and fill.**
Fill using `templates/location-plan.md`.

---

## The principle

We do not generate "Marcianople." We build Marcianople, once, and then photograph
it repeatedly. Every later frame inherits the same geography, so the audience
learns the space without being taught it.

**Research the actual archaeology and topography before locking any layout below.**
The sketch plan is a placeholder for thinking, not a claim.

## Working plan — PLACEHOLDER, NOT RESEARCHED

```
                          NORTH

                    GOTHIC HOST
              wagons / people / animals
                          |
                        ROAD
                          |
                  [ OUTER GATE ]
                       ||||
                  [ GATEHOUSE ]
                          |
                   Roman troops
                          |
                    main street
                          |
                 [ headquarters ]
                   | courtyard |
                   |           |
                   | banquet   |
                   |   hall    |
```

Load-bearing spatial facts this plan must establish and then never contradict:

1. The gate is the boundary between the Gothic host and the city.
2. The road runs north from the gate into the host.
3. The headquarters lies inward along the main street from the gate.
4. The courtyard adjoins the banquet hall, with a door between them.
5. The retainers wait in the courtyard, roughly 15 metres from where Fritigern sits.
6. A messenger can run gate → street → courtyard → banquet door, and we can see
   every leg of that route.

Once locked, sun direction and time of day are derived from this plan, not invented
per frame.

## Location assets required for the pilot

| ID | Asset | Purpose | Status |
| --- | --- | --- | --- |
| MAR-MASTER-001 | Aerial / isometric reference of the whole set | Ground truth for all geography | `[ ]` |
| MAR-PLAN-001 | Top-down ground plan with distances | Blocking and sightlines | `[ ]` |
| MAR-ROAD-01 | Road approaching the gate, from the host side | Establishes the host | `[ ]` |
| MAR-GATE-EXT-01 | Gate exterior, straight on | Boundary, from outside | `[ ]` |
| MAR-GATE-EXT-02 | Gate exterior, ¾ east | Coverage | `[ ]` |
| MAR-GATE-EXT-03 | Gate exterior, ¾ west | Coverage | `[ ]` |
| MAR-GATE-INT-01 | Gate interior looking out | The reverse; boundary from inside | Style test exists |
| MAR-HQ-EXT-01 | Headquarters exterior from the street | Arrival | `[ ]` |
| MAR-HQ-COURT-01..04 | Courtyard, four-corner turnaround | The waiting retainers, the messenger's run | `[ ]` |
| MAR-BANQUET-01..04 | Banquet room, four-wall turnaround | The room we mostly stay out of | `[ ]` |

Note: `MAR-GATE-INT-01` currently exists only as style tests
(`assets/style-tests/`), which were generated to compare registers, not as approved
set reference. It must be regenerated properly once the R1 base register is chosen.

## Time-of-day variants

The pilot runs across a single day: morning arrival → midday tension → afternoon
violence → late-afternoon aftermath. Each locked set needs light variants matching
those four states, and sun direction must be consistent with `MAR-PLAN-001`.

| State | Time | Light | Sets needing a variant |
| --- | --- | --- | --- |
| Peaceful | Morning | `[ ]` | `[ ]` |
| Tense | Midday | `[ ]` | `[ ]` |
| Violent | Afternoon | `[ ]` | `[ ]` |
| Aftermath | Late afternoon | `[ ]` | `[ ]` |

## Architecture and materials board

`[ ]` — Masonry type, roofing, timber, door and gate construction, street surface,
interior finishes. This is where medieval architecture smuggles itself in; it needs
to be pinned down explicitly and cited.

## Fill checklist

- [ ] Archaeology and topography researched before layout lock
- [ ] Ground plan includes real distances, so "15 metres away" means something
- [ ] Sun direction derived from plan and consistent across every frame
- [ ] Messenger's route fully covered by existing set assets
- [ ] Every architectural assumption logged in `06-uncertainty-ledger.md`
