# Style Analysis — Reference Reel ("Peter's Barque")

Source: Facebook reel 1084435607347105. Downloaded to `reel.mp4`, 5:34, 1080×1920
vertical, 30fps. 114 frames sampled at 1 per 3 seconds in `frames/`.

---

## What it actually is

Not digital painting. It is **flat digital illustration built to imitate layered
cut paper and gold leaf on textured navy stock**, with light drawn as translucent
geometric shape rather than rendered as illumination.

That distinction is why it has been hard to name. There is almost no painterly
brushwork anywhere in it. What reads as richness is coming from three things:
paper fibre texture, crinkled gold-foil texture, and hard-edged drop shadows
between stacked planes.

Some frames lean more graphic-illustrative than papercraft (the cupped hands, the
two scribes), but the substrate texture, palette and light treatment stay constant,
which is exactly why the piece feels coherent across very different subjects.

## Style DNA

Filled against the rubric in `prompts/style-benchmark.md`.

| Property | Answer |
| --- | --- |
| Line | Almost no drawn line. Form is made by shape and edge, not contour. Occasional fine gold linework as decorative detail only. |
| Edge | Hard, clean, cut. Crisp as scissors or a die-cut. Occasional torn deckle edge for organic elements. |
| Value | High contrast. Dark navy field, bright cream or gold focal object, deep near-black silhouettes. Strong edge vignette. |
| Palette | Four colours, rigidly held: deep navy, gold/brass, cream/bone, near-black. Occasional muted wood brown or terracotta. Nothing else. |
| Substrate | Always visible. Flecked, fibrous handmade paper grain across the entire frame, including the background. |
| Finish | Very low detail count. Big simple shapes. All the richness is texture, never form. |
| Faces | **None.** Figures are featureless dark silhouettes. Identity carried entirely by posture, profile and gesture. |
| Crowds | Not tested in this reel — everything is one to four elements. This is the open question. |
| Light | Drawn as flat translucent shape: cones from lamps, radiating wedges, soft circular halos. Never rendered illumination. |
| Depth | Stacked flat planes with soft drop shadows between layers. No atmospheric perspective at all. |
| Dirt | Absent. This is a clean, devotional aesthetic with no grime vocabulary. **The biggest gap for our subject.** |
| Motion | Stylised curl and swirl — wave crests, cloud spirals, flag ripple. Decorative rather than physical. |
| Composition | Centred, symmetrical, iconic. Single dominant subject, heraldic rather than photographic. |

## Why this suits the project unusually well

Three things here solve problems we had already identified as hard.

**1. Silhouettes eliminate the character continuity problem.**
Our largest technical risk was keeping Fritigern's face consistent across hundreds
of generations. In this aesthetic there are no faces. Identity is carried by
silhouette, posture and costume shape — which are far easier to specify, verify by
inspection, and hold stable. The character sheets become silhouette sheets, and the
whole continuity apparatus gets dramatically cheaper and more reliable.

**2. Layered planes are parallax-native.**
The delivery constraint in `bible/00-scope-and-decisions.md` §4.2 asks for images
composed in separated depth planes for 2.5D moves. This style is *made* of
separated planes with drop shadows already implying the gaps. The aesthetic and the
technical requirement are the same thing.

**3. Stylisation solves the fake-photograph problem.**
A photoreal reconstruction implicitly claims we know what a moment looked like. This
aesthetic never makes that claim, because nothing in it pretends to be a photograph.
The honesty we were engineering through the register system is partly inherent to
the style — which means the registers can carry finer distinctions rather than doing
the heavy lifting alone.

## Risks and gaps for our subject

**No grime vocabulary.** This is a clean devotional look. Our project needs mud,
hunger, wear, torn cloth and accumulating damage. That has to be invented — probably
through paper texture, torn deckle edges and a dirtier palette extension — and it is
the main thing to test.

**Untested at crowd scale.** Every frame in the reference is one to four elements.
We need thousands of people along a riverbank. Flat stacked planes can do this
(receding bands of silhouette), but it is unproven here and must be screened.

**Iconic composition resists scale oscillation.** The reference is relentlessly
centred and symmetrical. Principle 3 wants radical alternation between the enormous
and the intimate. Breaking symmetry while keeping the look is an open question.

**Palette is devotional.** Navy and gold reads sacred. For a story about starvation
and a massacre, the palette likely shifts — earth, bone, iron, dried blood — while
keeping the same four-colour discipline and the same gold as a rationed accent.

## Prompt formula

```
[subject as simple shapes], [figures as featureless dark silhouettes],
[light as flat translucent shape], layered cut-paper illustration, stacked paper
planes with soft drop shadows, visible handmade paper fibre texture, crinkled gold
leaf accents, limited palette of [4 colours], hard clean cut edges, flat graphic
composition, no rendered lighting, no facial features
```

### Worked example — our benchmark gate subject

```
Inside a late Roman city gate at dawn, two soldiers as featureless dark silhouettes
at the frame edges with spears and round shields, looking out through a stone arch
at a long column of refugee families and ox wagons receding in flat bands to the
horizon. Layered cut-paper illustration, stacked paper planes with soft drop
shadows, visible handmade paper fibre texture, crinkled gold leaf accents, limited
palette of deep indigo, bone, iron grey and dull gold, light as flat translucent
wedges through the arch, hard clean cut edges, no facial features
```

## Attribution note

This is an established brand look belonging to another publisher. We are deriving
vocabulary and technique from it, applied to a different subject with a different
palette and a different purpose. Our aesthetic should end up recognisably its own —
the four-colour discipline and silhouette approach are general techniques, the navy
and gold devotional palette is theirs.

## Next step

Run this through the four-subject screen in `prompts/style-benchmark.md`: the
matched Gothic/Roman faces (which become silhouettes here), the crowd, firelight at
night, and the hands breaking bread. The crowd and the grime are the two that will
decide it.
