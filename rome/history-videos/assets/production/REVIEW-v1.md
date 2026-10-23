# Artistic Review — Batch v1 → v2

Date: 2026-08-23  
Reviewer: agent screen against `bible/02-style-bible.md` + FRI/ALA/LUP turnarounds

## Failure modes (recurring)

1. **Painterly/photoreal principals** — especially Valens mood sheets
2. **Lorica segmentata / segmented plate** — wrong for 376 CE; use scale or mail only
3. **Palette leaks** — red, purple, burgundy, brown leather, terracotta
4. **Decorative gold** — on jewelry, trim, shields (gold = light/heat only)
5. **Invented shield heraldry** — winged bosses, stars, laurel wreaths
6. **Character drift** — Fritigern/Alavivus/Lupicinus not matching turnarounds

## PASS (24) — keep as-is

| File | Notes |
| --- | --- |
| VAL-001-turnaround.png | Lock as Valens identity reference |
| SCENE-02-UPROOTING-01.png | |
| SCENE-03-PETITION-01.png | |
| SCENE-04-ENDURANCE-01.png | |
| SCENE-05-HUMILIATION-02.png | |
| SCENE-05-HUMILIATION-03.png | |
| SCENE-05-HUMILIATION-04.png | |
| SCENE-05-HUMILIATION-06.png | |
| SCENE-05-HUMILIATION-07.png | |
| SCENE-06-HUNGER-01.png | |
| SCENE-07-TENDERNESS-01.png | |
| SCENE-08-LEVITY-01.png | Lock banquet look |
| SCENE-09-UNEASE-02.png | |
| SCENE-10-BETRAYAL-01.png | |
| SCENE-10-BETRAYAL-03-R3.png | **Intentional R3 register** — keep register, may refine later |
| SCENE-10-BETRAYAL-04.png | |
| SCENE-10-BETRAYAL-05.png | |
| SCENE-BATTLE-LAAGER-02.png | |
| SCENE-BATTLE-LAAGER-05.png | |
| SCENE-BATTLE-LAAGER-07.png | |
| SCENE-BATTLE-LAAGER-08.png | |
| SCENE-ADV-04.png | Cavalry charge — lock |
| SCENE-ADV-09.png | |
| SCENE-ADV-10.png | |

## REJECT (26) — regenerate v2

| File | Reason | v2 fix |
| --- | --- | --- |
| VAL-001-COSTUME-COURT.png | Painterly not cut-paper | Match turnaround; reference image |
| VAL-001-COSTUME-FIELD.png | Painterly face | Reference turnaround |
| VAL-001-MOOD-13-HUBRIS-A.png | Painterly + Chi-Rho + decorative gold | Cut-paper; no sacred symbols |
| VAL-001-MOOD-13-HUBRIS-B.png | Decorative gold on regalia | Gold wedge sun only |
| VAL-001-MOOD-14-TERROR-A.png | Shield heraldry | Plain oval shields |
| VAL-001-MOOD-14-TERROR-B.png | Decorative gold brooch | Gold = sun/dust only |
| VAL-001-MOOD-15-RUIN-A.png | No indigo/grey at all | Bone-dominant but keep grey/indigo traces |
| VAL-001-MOOD-15-RUIN-B.png | Painterly atmospheric | Cut-paper layers |
| SCENE-05-HUMILIATION-01.png | Painterly civilian faces | Silhouette crowd + stylized principals only |
| SCENE-05-HUMILIATION-05.png | Red/rust cloaks | Indigo/bone/grey only |
| SCENE-09-UNEASE-01.png | Wrong beat + palette | Fritigern listening, door crack, indigo only |
| SCENE-09-UNEASE-03.png | Purple/red palette | Match LEVITY-01 palette |
| SCENE-10-BETRAYAL-02.png | Brown sandals palette | Calcei in bone/grey |
| SCENE-11-FURY-01.png | Segmentata + burgundy | Scale armour, indigo paludamentum |
| SCENE-BATTLE-LAAGER-01.png | Segmentata aerial | Scale/mail Romans |
| SCENE-BATTLE-LAAGER-03.png | Segmentata + shield bosses | Plain shields |
| SCENE-BATTLE-LAAGER-04.png | Red/brown palette | Four-colour only |
| SCENE-BATTLE-LAAGER-06.png | Red horses + segmentata | Indigo/grey horses, scale armour |
| SCENE-ADV-01.png | Segmentata | Scale/mail legionaries |
| SCENE-ADV-02.png | Painterly Valens + gold circlet | Reference turnaround |
| SCENE-ADV-03.png | Segmentata | Scale/mail |
| SCENE-ADV-05.png | Decorative gold trim | Gold dust wedges only |
| SCENE-ADV-06.png | Red tunics + Fury not Terror | Terror palette; Fritigern ref |
| SCENE-ADV-07.png | Shield heraldry | Plain shields |
| SCENE-ADV-08.png | Heraldry + segmentata scraps | Clean ruin field |
| SCENE-PAIR-HUBRIS-01.png | Purple imperial robe | Purple as deeper indigo plane |

## v2 iteration status (2026-08-23)

All 26 rejects regenerated. v1 files archived in `assets/rejected/v1/`.

**Still flag for your eye (may need v3):**
- `VAL-001-COSTUME-COURT.png` — gold embroidery on cloak hem
- `VAL-001-COSTUME-FIELD.png` — purple/red tunic drift (reference helped face, not palette)
- `SCENE-PAIR-HUBRIS-01.png` — laurel panel on throne (minor heraldry)

**v2 clear improvements:**
- No SPQR/text in humiliation corral
- Laager + Adrianople sets lose segmentata armour
- Unease beat reads listening not confrontation
- Valens turnaround-linked faces on mood sheets

## v2 prompt suffix (all regenerations)

```
MANDATORY: flat layered cut-paper ONLY not painterly not photoreal not 3D render.
Four colours ONLY: deep indigo, bone, iron grey, tarnished gold — gold ONLY as flat
light wedges for sun/fire/lamp NEVER on clothing jewelry trim or shields.
Late 4th century CE scale or mail armour ONLY — NO lorica segmentata NO segmented
plate NO medieval plate. Principals: stylized simple cut-paper faces. Crowds:
faceless dark silhouettes. NO text NO heraldry NO shield emblems NO purple NO red
NO burgundy NO brown leather. Handmade paper fibre, scissor-cut edges, torn deckle.
16:9 horizontal, off-center composition, crop headroom.
```
