# Scope and Locked Decisions

Status: **v0.1 — skeleton awaiting fill**
Owner: Evan Robinson

---

## 1. What this is

A narrated, historically grounded illustrated drama running from the Hunnic
expansion and the Gothic flight (c. 375) to the destruction of the eastern army and
the death of Valens at Adrianople (9 August 378). Delivered as video: still images
with controlled camera moves, spoken narration, burned-or-soft captions, and
multi-language dubs.

### Story arc — full span

| # | Movement | Roughly |
| --- | --- | --- |
| 1 | Hunnic pressure; the Gothic world comes apart | c. 375 |
| 2 | Flight to the Danube; the petition to Rome | 376 |
| 3 | The crossing, and the waiting | 376 |
| 4 | Exploitation, famine, the price of food | 376 |
| 5 | Marcianople — the banquet and the break | 376 |
| 6 | Open revolt across Thrace | 376–377 |
| 7 | Valens turns east to west; the imperial calculation | 377–378 |
| 8 | Adrianople | 9 Aug 378 |
| 9 | Aftermath; the emperor unaccounted for | 378 |

It is not a film. It is not a comic. The nearest honest description is a
**documentary-drama told in sequential still images**, where each image is a
composed, directed frame rather than an illustration of the sentence being spoken.

## 2. Pilot scope — LOCKED

**Build Marcianople first. Nothing else.**

Target: approximately 90 seconds of finished video.

If those 90 seconds feel like someone was present at Marcianople, the methodology is
proven and scales to the Danube and Adrianople. If they don't, we have lost 90
seconds instead of 100 assets.

In scope for the pilot:

| Class | Items |
| --- | --- |
| Characters | Fritigern, Alavivus, Lupicinus, 3 recurring Gothic retainers, 1 Roman messenger/officer |
| Locations | Road outside the gate, the gate itself, HQ courtyard, banquet room |
| Props | Gothic warrior equipment, late-Roman infantry equipment, banquet furniture and tableware, food/ration objects |
| Crowds | Gothic population (mixed civilian), Roman garrison soldiers |
| States | peaceful → tense → violent → aftermath |

Not yet in production (the story covers all of it; we are simply not building it
first): the Hunnic pressure, the Danube crossing, the famine, the Thracian revolt,
Valens, Gratian, Adrianople, maps, and the title sequence.

## 3. Deferred — decided later, deliberately

- **Sound design.** Not being worked on now. The narration script and ambience
  design are deferred. Nothing in the current templates should carry a sound field.
  (Noted here only so it isn't forgotten: sound will likely carry a large share of
  the finished experience, and images composed now should not foreclose it.)
- **Map design.** Deferred with the Danube phase.
- **Title and chapter cards.** Deferred, but see the no-baked-in-text rule below,
  which applies to them absolutely.

## 4. Delivery constraints — LOCKED

These follow from "narrated video with zoom effects, captions, and dubbing," and
they constrain every image generated from here forward.

### 4.1 Generate oversized

Final delivery is 1920×1080 or 3840×2160. A push-in crops into the source image, so
any asset generated at delivery resolution goes soft the moment it moves.

**Rule: generate every deliverable frame at ~3× linear resolution of its final
crop.** Compose with intentional dead space that the move will travel into. The
start frame and the end frame are both composition decisions made at generation
time, not in the edit.

### 4.2 Compose in depth planes

Any frame intended for a 2.5D parallax move must be composed in unambiguous
foreground / midground / background separation, with the foreground reading as a
distinct silhouette. This is a compositional constraint on the generation prompt,
not a post-production step.

Frames not intended for parallax should say so on their card, so nobody wastes time
trying to separate a layer that doesn't exist.

### 4.3 No baked-in text — absolute

**No image may contain any text, lettering, label, date, place name, caption,
signature, or watermark.**

Every label is an overlay layer composited in the edit, because the piece is
captioned and dubbed. A map with English place names painted into the artwork is
untranslatable and unfixable. This rule is violated most often on maps, chapter
cards, and anything with an inscription, so it is repeated in every prompt template.

### 4.4 Narration written for dubbing

Short sentences. No wordplay, no idiom that dies in translation, no puns.
Per-image narration budgeted so a German or Spanish dub running 20–30% longer than
English does not overrun the visual. This shapes script structure, so it is a bible
rule and not a localization afterthought.

## 5. Decision ledger

### Locked — Claude may not renegotiate these

- The ten creative principles (`01-creative-principles.md`)
- The tiered style system (`02-style-bible.md`)
- Marcianople-first pilot scope
- The asset ID scheme and naming convention
- "No redesign after approval" — once an asset is approved, later generations
  inherit it and may not reinterpret it
- The four delivery constraints above

### Open — Claude's job to propose

- Character faces, builds, silhouettes (offer options; we choose)
- Costume and prop specifics, sourced and cited
- Blocking within an established set
- Beat breakdown and image count for the pilot
- First drafts of every sheet, board, and card
- Every entry in the uncertainty ledger

## 6. Pipeline

```
PHASE 1  Research .............. source pack, material culture, geography, uncertainty ledger
PHASE 2  World Bible ........... this directory
PHASE 3  Asset Production ...... character sheets, costume/prop boards, location plans + turnarounds
PHASE 4  State & Continuity .... who owns what, what degrades, what persists
PHASE 5  Scene Comps ........... actors into sets; test geography, blocking, scale
PHASE 6  Beat Board ............ rough frames, edited before anything is finished
PHASE 7  Frame Cards ........... per-frame direction: framing, move, register, blocking
PHASE 8  Final Generation ...... approved assets + comp + card → finished frame
PHASE 9  Continuity Review ..... identity, costume state, set, props, light, damage, plausibility
         → LOCK
```

We are at the boundary of Phase 2 and Phase 3.

## 7. The overriding test

> If the narration were removed, would this still feel like people living through
> something, rather than illustrations of something that happened?
