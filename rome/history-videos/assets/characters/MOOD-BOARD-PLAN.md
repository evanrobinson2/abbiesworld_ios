# Mood Board Production Plan

Status: **PLAN — awaiting approval before generation**  
Scope: Main principals + Valens turnaround  
Rule: **Named characters have stylized faces in every principal image.** Crowds stay faceless.

---

## 1. What we're building

Three asset types, generated in this order:

| Type | Purpose | Count (approx.) |
| --- | --- | --- |
| **A. Identity turnaround** | Who they are — neutral pose, four views | 1 per character (Valens missing) |
| **B. Costume state sheet** | What they wear — travel / civil / battle | 3–4 per character |
| **C. Mood board set** | How they feel — same person + costume + mood preset | 2–3 images per (character × mood) |

Mood does **not** change face or body. It changes palette weighting, light shape, layer
count, edge quality, horizon, and negative space (`bible/07-moods.md` Step 2).

Costume does **not** change face. It changes garments, weapons, damage, and props.

---

## 2. Main characters

| ID | Character | Faction | Turnaround | Notes |
| --- | --- | --- | --- | --- |
| FRI-001 | Fritigern | Gothic | ✅ draft v2 | Tallest; watchful; not sanctified |
| ALA-001 | Alavivus | Gothic | ✅ draft v2 | Vanishes after Marcianople |
| LUP-001 | Lupicinus | Roman | ✅ draft v2 | Principle 5 — not villain-shaped |
| VAL-001 | **Valens** | Roman | ❌ **needed** | Emperor; Adrianople boss; Hubris → Terror → Ruin |

Retainers (RET-01..03) and messenger (ROM-MSG) are **Phase 2** — not in this plan.

---

## 3. Costume states (all principals)

Each state gets a **single full-body reference** (front ¾, plain bone background)
before mood boards use it.

| State ID | Name | Who wears it | Description |
| --- | --- | --- | --- |
| `-TRAVEL` | Migration | FRI, ALA | Wool cloak, road dust, belt, sword (FRI only), trousers, no armour |
| `-CIVIL` | Diplomatic | FRI, ALA, LUP | Cleanest garments; FRI/ALA travelling noble; LUP columnar tunic + paludamentum |
| `-BANQUET` | Marcianople feast | FRI, ALA, LUP | FRI/ALA: open cloak, bench garb; LUP: convivial, cup, chair |
| `-BATTLE` | Battle garb | FRI, ALA, VAL | Mail or scale (late 4th c. — no full plate), helmet or leather cap, shield, spear/sword, mud and wear |
| `-COURT` | Imperial court | VAL only | Purple-trim paludamentum (as flat indigo shape — not decorative gold), diadem silhouette, staff of office optional |
| `-FIELD` | Campaign command | VAL only | Same as battle but paludamentum over armour, maps/tablet prop, heat exhaustion later |

**Lupicinus** does not get `-BATTLE` in historical scope for Marcianople — he is
procedure and banquet, not Adrianople field command.

**Damage ladder** (same costume, worsening — for Fury → Terror arc):

| Suffix | When |
| --- | --- |
| `-BATTLE-A` | Fresh, before Adrianople |
| `-BATTLE-B` | Heat, dust, thirst (Terror) |
| `-BATTLE-C` | Routed / absent (Ruin — Valens only: empty armour or abandoned paludamentum) |

---

## 4. Mood presets — must lock before batch generation

Complete `bible/07-moods.md` Step 2 first. Draft presets below for approval:

| Mood | Palette | Light | Layers | Edges | Shapes | Horizon | Gold |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Dread | indigo heavy | none / distant wedge | many, thin | clean | curved, distant | low sky | none |
| 2 Uprooting | bone + grey | soft side wedge | medium | torn deckle | wagons, curves | mid | none |
| 3 Petition | bone dominant | narrow from above | few, compressed | clean | angular, bowed | high trap | none |
| 4 Endurance | grey dominant | flat diffuse | many horizontal bands | torn | static | low | none |
| 5 Humiliation | bone washed out | harsh overhead | few | clean | hunched masses | high | none |
| 6 Hunger | grey + bone | weak wedge | few | torn deckle | thin, brittle | mid | none |
| 7 Tenderness | warm bone | soft wide wedge | medium | clean | curved | low | tiny, lamp only |
| 8 Levity | bone + indigo balanced | open side | medium | clean | rounded | mid | none |
| 9 Unease | indigo creeping in | split wedge | medium | mixed | off-balance | mid | sliver |
| 10 Betrayal | indigo + iron grey | door-slice wedge | few | sharp | angular shards | high | cut off |
| 11 Fury | iron grey + indigo | hard shards | few | torn deckle | jagged | low | fire wedges |
| 12 Procedure | bone flat | even flat | many thin | clean | vertical columns | high | none |
| 13 Hubris | bone + gold accent | wide gold wedge | medium | clean | upright, centred* | low | sun/heat only |
| 14 Terror | grey collapse | strobe shards | chaotic few | torn | encircling | crushed | dust gold |
| 15 Ruin | bone monochrome | single low wedge | one layer | deckle | empty | vast low | none |

\*Hubris may earn centred composition; Valens only.

---

## 5. Character × mood matrix

Only moods a character **actually carries**. 2–3 images each = shot types **A / B / C**:

| Shot | Framing | Use |
| --- | --- | --- |
| **A** | Full body, neutral stance | Registry default |
| **B** | ¾ body, gesture / action | Emotional beat |
| **C** | Bust or hands + prop | Intimate or object continuity |

### Fritigern (FRI-001) — 8 moods × 3 = **24 images**

| Mood | Costume | Shot A | Shot B | Shot C |
| --- | --- | --- | --- | --- |
| 2 Uprooting | TRAVEL | full, looking back | ¾, hand on wagon | bust, wind in hair |
| 3 Petition | CIVIL | full, head bowed | ¾, empty hands out | bust, restrained face |
| 7 Tenderness | TRAVEL | full, bread broken | ¾, hands only | bust, soft expression |
| 9 Unease | BANQUET | full, seated forward | ¾, toward door | bust, listening |
| 10 Betrayal | BANQUET | full, rising from bench | ¾, hand on table | bust, face turned |
| 11 Fury | BATTLE | full, spear raised | ¾, charge | bust, battle-worn |
| 13 Hubris | CIVIL | full, opposite Valens (pair comp) | — | — |
| 14 Terror | BATTLE-B | full, dust | ¾, shield up | bust, thirst |

### Alavivus (ALA-001) — 5 moods × 3 = **15 images**

| Mood | Costume | Notes |
| --- | --- | --- |
| 3 Petition | CIVIL | with Fritigern but triangle-drape ID visible |
| 9 Unease | BANQUET | withdrawn, smaller in frame |
| 10 Betrayal | BANQUET | **last appearance** — face half in shadow |
| 11 Fury | BATTLE | optional — if he fights at gate |
| 15 Ruin | — | **absence image**: empty cloak on bench (no face) |

### Lupicinus (LUP-001) — 4 moods × 3 = **12 images**

| Mood | Costume | Notes |
| --- | --- | --- |
| 8 Levity | BANQUET | genuinely convivial — Principle 5 |
| 9 Unease | BANQUET | still seated, listening |
| 12 Procedure | CIVIL | counting / administrating gesture |
| 11 Fury | CIVIL | reacts to news — not commanding battle |

### Valens (VAL-001) — turnaround + 4 moods × 3 = **1 sheet + 12 images**

**Turnaround first** (four views, faces visible, COURT costume default).

| Mood | Costume | Boss-fight read |
| --- | --- | --- |
| 13 Hubris | COURT or FIELD | confident, impatient, **not cartoon villain** |
| 13 Hubris | FIELD | ignoring scouts — information withheld |
| 14 Terror | BATTLE-B | encircled, heat, no cavalry reveal |
| 15 Ruin | BATTLE-C or empty | throne/camp empty; armour abandoned |

Valens **identity sheet** (`VAL-001.md`):

- Late 40s–50s, Eastern emperor bearing
- Short imperial haircut, clean-shaven or trimmed beard
- **Not** grotesque, **not** taller than reality — ordinary man with extraordinary title
- Court: paludamentum with purple as **deeper indigo plane** (not gold wealth)
- Field: same face, armour under cloak, legions implied not shown

---

## 6. File naming

```
assets/characters/
  FRI-001-turnaround.png
  FRI-001-COSTUME-TRAVEL.png
  FRI-001-COSTUME-BATTLE.png
  FRI-001-MOOD-11-FURY-A.png
  FRI-001-MOOD-11-FURY-B.png
  FRI-001-MOOD-11-FURY-C.png
  ...
  VAL-001-turnaround.png
  VAL-001-COSTUME-COURT.png
  VAL-001-MOOD-14-TERROR-B.png
```

Registry entry per file: `status: draft` until you approve.

---

## 7. Phased rollout (recommended)

Do not generate all 64+ images at once. Approve each phase.

| Phase | Deliverables | Images | Gate |
| --- | --- | --- | --- |
| **0** | Lock mood presets in `07-moods.md` Step 2 | 0 | You approve preset table |
| **1** | VAL-001 turnaround + costume COURT + FIELD | 3 | Valens reads as emperor not boss monster |
| **2** | Costume sheets: all `-TRAVEL`, `-CIVIL`, `-BATTLE` for FRI/ALA/LUP | 9 | Faces match turnarounds |
| **3** | Marcianople moods: 8, 9, 10, 11, 12 for FRI/ALA/LUP | 27 | Banquet treachery readable |
| **4** | Danube / early arc moods: 2, 3, 5, 6, 7 for FRI (+ALA where shared) | 18 | Humiliation carries |
| **5** | Valens boss arc: 13, 14, 15 | 12 | Terror ≠ Fury visually |
| **6** | Pair comps (Fritigern vs Valens hubris, banquet trio, etc.) | ~6 | Scale and dignity matched |

**Total after Phase 6: ~75 images** (manageable, inspectable, approvable in chunks).

---

## 8. Generation rules (every image)

- Layered cut-paper R1; visible stylized **face** on named principals
- Palette from mood preset; costume from state sheet
- No text, no invented heraldry, 376 CE material culture
- Same cut quality Gothic and Roman (Principle 5)
- NOT Batman silhouette; NOT solid black void figures
- Generate at 16:9; production frames later at 3× with crop headroom

---

## 9. Decisions needed from you

1. **Approve mood preset table** (§4) or edit before any mood images
2. **Valens face direction** — lean younger/impatient or older/exhausted?
3. **Alavivus after Marcianople** — literal absence asset (empty cloak) or skip?
4. **Start Phase 0+1 now?** (Valens turnaround + court/field costumes)

---

## 10. Image count summary

| Character | Turnaround | Costumes | Mood images | Subtotal |
| --- | --- | --- | --- | --- |
| Fritigern | ✅ | 4 | 24 | 28 |
| Alavivus | ✅ | 3 | 15 | 18 |
| Lupicinus | ✅ | 2 | 12 | 14 |
| Valens | 1 | 3 | 12 | 16 |
| **Total** | 1 new | 12 | 63 | **~76** |

Pair comps and retainers add ~10–15 later.
