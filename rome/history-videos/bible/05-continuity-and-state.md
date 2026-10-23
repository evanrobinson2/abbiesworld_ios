# Continuity and State

Status: **SKELETON — awaiting fill.**
Fill using `templates/state-sheet.md`.

---

## The problem this solves

Every image generation begins in a pristine universe. Ours must not. The single
most detectable failure mode of AI-assisted historical work is that nothing
accumulates: mud dries between frames, torn cloaks heal, starving people are
plump again three images later.

**The work accumulates entropy.** That is the difference between a slideshow and a
world.

## State naming

Assets that change over time carry a state suffix, and the suffix is part of the
asset ID:

```
CAMP-DANUBE-376-A     relatively intact migration
CAMP-DANUBE-376-B     after prolonged waiting
CAMP-THRACE-376-C     food scarcity

YOUNG-WARRIOR-376-A   original Gothic equipment
YOUNG-WARRIOR-376-B   exhausted, clothing damaged
YOUNG-WARRIOR-376-C   Roman shield acquired at Marcianople
YOUNG-WARRIOR-378-A   same shield, battered and repaired
```

A frame card names the exact state, never the bare asset. `YOUNG-WARRIOR` alone is
never a valid reference.

## Object ownership ledger

Objects have histories and owners. Track them.

| Object ID | Description | Acquired | By whom | How | Later states |
| --- | --- | --- | --- | --- | --- |
| `[ ]` | Roman shield taken at Marcianople | Marcianople, 376 | `[ ]` | `[ ]` | `[ ]` |
| `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

## Persistent world conditions

Conditions that, once set, constrain every subsequent frame until something changes
them.

| Condition | Set at | Consequence | Cleared by |
| --- | --- | --- | --- |
| Weather / ground state | `[ ]` | Mud persists; wheels and feet carry it | `[ ]` |
| Gothic nutritional state | `[ ]` | Faces, bodies, energy, children | `[ ]` |
| Clothing condition | `[ ]` | Tears are repaired, not regenerated | `[ ]` |
| Damage to sets | `[ ]` | What broke stays broken | `[ ]` |

## Pilot state arc

The Marcianople pilot passes through four states. Every set, crowd, and principal
needs a defined condition in each.

| # | State | Trigger | Gothic host | Roman garrison | Sets | Light |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Peaceful | Arrival | `[ ]` | `[ ]` | `[ ]` | Morning |
| 2 | Tense | `[ ]` | `[ ]` | `[ ]` | `[ ]` | Midday |
| 3 | Violent | Skirmish outside the gate | `[ ]` | `[ ]` | `[ ]` | Afternoon |
| 4 | Aftermath | `[ ]` | `[ ]` | `[ ]` | `[ ]` | Late afternoon |

Note that under Principle 4, State 1 must contain genuine ordinary life — jokes,
play, boredom, appetite — and State 2 must not simply be State 1 with everyone
scowling.

## Continuity review checklist (Phase 9)

Run against every frame before it locks:

- [ ] Does each character look like their approved identity sheet?
- [ ] Correct costume **state**, not just correct costume?
- [ ] Correct set, matching the approved turnaround?
- [ ] Correct props, all traceable to an approved board?
- [ ] Sun direction consistent with the ground plan and the time of day?
- [ ] Accumulated damage, dirt, and wear present and consistent with prior frames?
- [ ] Crowd count and composition plausible and consistent?
- [ ] Any invented ornament? (Check shields, belts, jewellery, architecture.)
- [ ] Any text anywhere in the image? (Must be zero.)
- [ ] Historically defensible, or logged as uncertain?
