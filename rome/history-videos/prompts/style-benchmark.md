# Style Benchmark

Status: **active tool**

The instrument for developing the aesthetic. A style is not a good image — it is a
set of answers that stay the same across every subject. This file tests whether a
candidate look actually holds.

How to use it: keep the twelve subject clauses below **exactly as written**, change
only the style clause, and generate all twelve. A style that survives all twelve is
an aesthetic. A style that only sings on one or two is a lucky picture.

---

## Part 1 — The style DNA

Before generating anything, answer these in words. They are the actual definition of
the aesthetic; the prompts are only how you test it. If a generated image is wrong,
the fix is usually here rather than in the prompt.

| Property | Question | Answer |
| --- | --- | --- |
| Line | Is there a visible drawn line? Weight, confidence, variation? | |
| Edge | How do forms meet — hard cut, soft blend, broken? | |
| Value | High contrast or compressed? Where do the darks live? | |
| Palette | How many colours? Family, saturation, temperature? | |
| Substrate | Is paper/canvas/ink texture visible? | |
| Finish | Where is detail spent, and where deliberately withheld? | |
| Faces | How much face before it becomes a portrait? | |
| Crowds | Many people resolved as individuals, shapes, or suggestion? | |
| Light | Depicted as illumination, or as flat shape? | |
| Depth | Atmospheric recession, or stacked flat planes? | |
| Dirt | How is grime, wear and damage actually drawn? | |
| Motion | Is movement implied at all, and how? | |

A style is consistent when these answers are consistent. That is the whole game.

## Part 2 — The twelve benchmark subjects

Chosen to stress every axis the story will demand. Six are matched Gothic/Roman
pairs, which is the fairness test: **the same hand must draw both peoples.**

### Faces — can it carry a person?

1. **Gothic elder, close.** A weathered Gothic woman in her sixties, close on her
   face, looking directly at us, plain daylight, no expression.
2. **Roman officer, close.** A late-Roman officer in his forties, close on his face,
   looking directly at us, plain daylight, no expression.

*Check: is one of them dignified and the other picturesque? If so, the style has
taken a side.*

### Crowds — can it carry a multitude?

3. **The Gothic host.** Thousands of Gothic refugees with wagons and livestock
   spread across a river plain, seen from a low rise, overcast.
4. **The Roman column.** A late-Roman field army on the march across open Thracian
   country, seen from a low rise, overcast.

*Check: do people dissolve into mush, or into shape? Mush is failure; shape is a
style decision.*

### Architecture and shelter — matched pair

5. **Roman interior.** A provincial Roman administrative room, plastered walls, a
   table, shuttered window, late afternoon light across the floor.
6. **Gothic shelter.** The interior of a Gothic wagon shelter, hides and worn
   textiles, a small fire, dim.

*Check: is Roman space rendered as order and Gothic space as squalor? Both are homes.*

### Light — the hard cases

7. **Firelight, night.** Four people around a low fire at night, faces lit from
   below, deep surrounding darkness.
8. **Flat noon.** An empty dirt road in flat overhead midday sun, hard short
   shadows, dust, no people.

*Check: does the style collapse without dramatic light? Most AI aesthetics do.*

### Material — the smuggling test

9. **Objects.** A shield, a cooking pot, a leather boot and a torn wool cloak laid
   out on bare ground, plain daylight, museum-like.

*Check: does the style invent ornament when nothing is happening?*

### Ordinary life — Principle 4

10. **Children playing.** Two children playing with a stick and a stone beside a
    parked wagon, an adult laughing in the background, warm morning.

*Check: can this aesthetic hold joy? If it can only do gravity, the catastrophe
later will have nothing to land against.*

### The hard content

11. **Aftermath.** An overturned cart and scattered belongings on a road at dusk,
    two bodies at distance, no detail, birds.

*Check: does it become lurid, or squeamish, or cartoonish? All three are failure.*

### The intimate beat

12. **Hands.** Close on a woman's filthy hands breaking a small flatbread in half
    between two thin children.

*Check: this is the emotional load-bearing frame of the entire project. If the style
cannot do this one, it cannot be the base register regardless of how good the
wides look.*

## Part 3 — Scoring

Score each candidate style out of 12. Anything below 10 is not a base register — it
may still be a secondary register (see the tiered system in
`bible/02-style-bible.md`).

| # | Subject | Holds? | Notes |
| --- | --- | --- | --- |
| 1 | Gothic elder | | |
| 2 | Roman officer | | |
| 3 | Gothic host | | |
| 4 | Roman column | | |
| 5 | Roman interior | | |
| 6 | Gothic shelter | | |
| 7 | Firelight night | | |
| 8 | Flat noon | | |
| 9 | Objects | | |
| 10 | Children playing | | |
| 11 | Aftermath | | |
| 12 | Hands | | |

**Fairness check:** compare 1 against 2, 3 against 4, 5 against 6. Same hand?
Same dignity? Same level of finish? If not, the style is editorialising and must be
corrected or discarded, however attractive it is.

## Part 4 — Locking it

Once a candidate passes, it stops being a prompt and becomes a reference.

- **Midjourney:** build a moodboard (`--p`) from the strongest 5–10 outputs rather
  than relying on a single `--sref` image. A moodboard averages a look and can be
  edited later; a single reference is brittle and a preset code is not yours.
- **Any engine:** save the winning images as the register's reference set, and
  record the style DNA answers from Part 1 in `bible/02-style-bible.md`. The written
  answers are what survive a change of tool. The images are not portable; the
  answers are.

Then every subsequent frame inherits the reference, and the prompt only has to carry
subject, blocking, light and moment — never style.

## Part 5 — Standing constraints

Every benchmark generation, regardless of style:

- No text, lettering, numbers, signature or watermark anywhere in the image
- Late-antique 376 CE material culture; no medieval plate, no mail hauberks, no fantasy
- No invented ornament, heraldry or shield devices
- Same rendering hand for Goths and Romans
