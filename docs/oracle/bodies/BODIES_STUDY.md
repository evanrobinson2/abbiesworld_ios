# AW-STUDY-0016 - Bodies and Creatures

Oracle study, started 2026-10-23. Requested by Evan: read five books on human anatomy, two on drawing the human form
and one on drawing comics, then study normal humans, heroic humans, bipedal aliens, weird aliens and representative
animals (mostly land animals, a few birds, fish and whales), in short installments, one at a time. Evan also asked for
real adult anatomy ("anatomically correct, not anime fantasy") and to see the whole body for every type.

It feeds the papercraft figures (`tools/paper-body`, the Roman kit) and every future creature model.

Rules for every installment: PG, no nudity (figure-drawing mannequins in a fitted base layer, simplified écorché for
muscles), no real faces, pictures first. Each one gives a proportion and landmark sheet, body-type ranges, the toy-style
rules, and a checklist modelers score against.

| # | Installment | State |
|---|---|---|
| 1 | The normal human | this file, 2026-10-23 |
| 2 | Heroic humans (the Marvel Way hero, gesture and action) | next |
| 3 | Bipedal aliens | |
| 4 | Weird aliens | |
| 5 | Animals: land first, then birds, fish and whales | |

Files:

- `human-canon.json`: the canon. Landmarks, widths and depths for the average man and woman, and the four builds
  (average, heroic, skinny, heavy) as overrides and multipliers. Everything else is generated from it.
- `scores.json`: the ten paper bodies scored against the canon.
- `tools/bodies/figure.py`: draws the sheets (front, side, back), the eight-type lineup and the toy comparison as SVG
  into `prototypes/ranch-atelier/dist/studies/bodies-study/img/`. Layers: landmarks, construction, muscles, bones.
- `tools/bodies/score_body.py`: the scorer. Scores a paper-body measurement file or a plain landmarks file.
- The page: `prototypes/ranch-atelier/dist/studies/bodies-study/`, https://app.abbies.world/studies/#bodies-study

## Sources

Read from public-domain texts where they exist, and from publisher editions, previews and published lesson notes for
the books still in copyright. Nothing is reproduced; the numbers are restated and redrawn.

| Area | Book | Access |
|---|---|---|
| Anatomy | Gray, *Anatomy of the Human Body* (1918) | public domain |
| Anatomy | Bridgman, *Constructive Anatomy* (1920) | public domain, archive.org |
| Anatomy | Duval, *Artistic Anatomy* (1884) | public domain, Project Gutenberg #77743 |
| Anatomy | Richer, *Artistic Anatomy* and his canon (1890) | canon as tabulated in Proko's average-figure lesson |
| Anatomy | Thomson, *A Handbook of Anatomy for Art Students* (1896) | public domain |
| Figure drawing | Loomis, *Figure Drawing for All It's Worth* (1943) | publisher edition, Proko's idealistic-figure lesson |
| Figure drawing | Vanderpoel, *The Human Figure* (1907) | public domain, drawingbooks.org |
| Comics | Lee and Buscema, *How to Draw Comics the Marvel Way* (1978) | publisher edition and published summaries |

Measured averages for shoulder-to-hip ratios: Wikipedia, "Body proportions" (1.18 for men, 1.03 for women, lateral
widths).

## Installment 1: the normal human

### What the books agree on

1. **Head count.** A real adult is about 7.5 heads tall (Richer). 8 is Loomis's ideal, 8.5 to 8.75 the comic hero.
   A woman is about 93% of a man's height at about the same head count.
2. **The middle is the crotch.** Half the height falls at the pubic bone. Head and torso take about 4 heads; in taller
   canons the extra length goes into the legs (Loomis, Marvel Way).
3. **One head apart.** Chin, chest line, navel and crotch are about one head apart (Loomis, Richer).
4. **Shoulders and hips.** Man: shoulders 2 heads across the deltoids, hips about 1.5 (ratio 1.15 to 1.4). Woman:
   shoulders about 1.75, hips about 1.7, nearly equal; the trochanters are her widest point (Richer, Duval).
5. **Arms.** Hanging: elbow at the waist, wrist at the crotch, fingertips at mid-thigh. Arm span equals height
   (Richer). Shoulder to elbow equals elbow to knuckles.
6. **Knee.** The bottom of the kneecap sits halfway between the front hip point and the floor (Richer).
7. **Plumb line.** At rest, ear, shoulder, hip joint and the front of the ankle stack on one vertical (Gray,
   Vanderpoel).
8. **Masses.** Head, ribcage and pelvis are rigid blocks; the waist is the flexible link. Masses wedge and interlock,
   and when the pelvis tilts one way the ribcage tilts the other (Bridgman: "think in masses, define them in lines").
9. **Bones that show.** Collarbones and the pit of the neck, the shoulder point, the elbow, the iliac crest and front
   hip points, the kneecap, the shin, both ankle bones (the inner one higher), C7 and the shoulder blades from behind,
   and the two dimples over the sacrum (Duval, Bridgman). These are hard planes on any build.
10. **Man and woman.** The woman has narrower shoulders, a wider and deeper pelvis tilted a little more forward, a
    higher and narrower waist relative to the hips, a longer trunk relative to the legs, more inward-angled thighs, a
    wider carrying angle at the elbow, and softer contours over the muscles (Duval, Richer, Thomson).

### Body types

Same skeleton, different covering: landmark heights stay within a tenth of a head across average, skinny and heavy;
widths and depths change. Heroic is the one stylisation (longer legs, smaller head).

| Build | Man | Woman | What changes |
|---|---|---|---|
| Average | 7.5 heads | 7.4 heads | the canon |
| Heroic | 8.5 | 8.2 | shoulders 2.33 heads on a man, narrow waist, legs longer, muscle on, joints and hands true |
| Skinny | 7.6 | 7.5 | less on the frame; joints look big; collarbones, ribs, hip points show |
| Heavy | 7.4 | 7.3 | more soft mass: men on the belly in front, women on the hips, thighs and seat; head, hands, wrists and ankles unchanged |

Kids and elders come later, as their own ranges.

### Toy style for Abbie's World

Stay anatomically true; push readability, not anatomy.

- Exaggerate: the head about 3% bigger (7.25 heads instead of 7.5); hands and feet 10% bigger; the planes where bone
  is near the surface (on paper models these are the folds); the silhouette turns; gesture.
- Keep true: every landmark height against the figure's height; limb segment lengths; shoulder-to-hip ratios in the
  real range for the sex; bust, waist and hips in real adult ranges (no anime or fantasy shapes); where fat goes by sex.

### The modeler checklist

1. Head count: 7.25 heads for toy average (real 7.5, heroic 8.5).
2. Half the height at the crotch, within a sixth of a head.
3. Chin, chest line, navel and crotch about one head apart.
4. Elbow at the waist, wrist at the crotch, fingertips at mid-thigh, arm span equal to height.
5. Knee halfway between the front hip point and the floor.
6. Shoulders, chest, waist and hips within 12% of the canon for the build; shoulder-to-hip ratio in range for the sex.
7. Side view: the S of the spine, chest ahead of the belly (unless heavy), seat behind, calf behind the shin, ear over
   the ankle.
8. Bones that show are hard planes; the inner ankle is higher than the outer.
9. Fat and muscle go where the build and sex put them; joints, hands and head stay their size.
10. PG: base layer always on (briefs, and a fitted top on women).

Checks 1 to 6 are automatic: `python tools/bodies/score_body.py <body.json>`.

### Our paper bodies, scored

All ten paper bodies in `tools/paper-body/out` come out at 8 heads (the ideal canon, not real and not our toy 7.25).
Two misses repeat on every body:

- **Knees sit about a quarter of a head too low.** `leg_len` in `body.py` gives the thigh 0.235 and the shin 0.215 of
  the height; the canon knee is at 0.28 of the height, theirs at 0.245.
- **Fingertips stop about 0.3 head too high.** The arms are short (`arm_len` 0.185 and 0.165, hand 0.095 m); the canon
  puts the fingertips at 0.37 of the height, theirs at 0.41.

The women also miss the waist height (theirs is the man's, 0.60; the canon is 0.63) and the shoulder-to-hip ratio
(0.95, just under the real range). The heroic bodies are bulked-up average bodies, not heroic proportions. These are
recorded here, not fixed: the paper body belongs to the Roman model study, and the fix is a small change to `BASE`.
