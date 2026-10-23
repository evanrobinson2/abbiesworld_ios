# Card art, part 2: how art is presented, and how to make it beautiful

Oracle study, 2026-10-23. Requested by Evan: "do a part 2: how to make beautiful art for a card (categorize the kinds of
way art is presented on the card, I think you've got 2 examples here: card as portal, and info as overlay .. what else
and is that it and explain / why?"

Part 1 is `CARD_STUDY.md`. This file adds a taxonomy of art presentation, art-direction rules with measures, a
"make once, present many" layered art package, and which mode each Abbie's World card uses. The rubric additions are
in `card-rubric.json` (version 1.1, `art_modes` and `art_direction`). Every mode is drawn as a live card on the study
page.

## The answer in one paragraph

Portal and overlay are two positions on one axis: **where the art sits relative to the card's surface**. A card is a
flat sheet the viewer holds, and art can only be behind that sheet (portal), on it (overlay, specimen, emblem), in
front of it (pop-out), inside it with real depth (shadowbox), or beyond the edges of one card (panorama). That axis is
complete: there is no other place for the art to be. Two other axes multiply it: **what the art shows** (a specimen,
a portrait, a scene, a symbol) and **whether it moves** (still or living). So the full list is about ten modes, each a
point in that space, and each one works for a different reason, rooted in how people read pictures.

## Axis 1: where the art sits (depth relative to the card plane)

Think of the card from the side, with the viewer's eye on the right.

```
   behind            on               in front          inside (depth)       beyond
  [ art ]|          |art|             |[ art ]          |[a][r][t]|         ...|art|art|art|...
         | card     | card            | card  ->        | card box |          cards side by side
  PORTAL            OVERLAY           POP-OUT           SHADOWBOX           PANORAMA
                    SPECIMEN
                    EMBLEM
```

### 1. Portal: the card is a window

- **What.** A frame with a cut-out; the art is a world seen through it. The frame carries all the information.
- **Seen in.** Standard Magic, standard Pokémon, Slay the Spire, Hearthstone minion portraits.
- **Why it works.** It is Alberti's window (*De pictura*, 1435): a picture is a view through a framed opening, the
  oldest convention in Western painting, so everyone reads it without learning it. The frame cleanly separates
  information from picture, so text never fights the art and the art can be as busy as it likes. The window's
  shape can carry meaning (card type in our spec). It is the cheapest to make consistently, since art only has to
  fill a rectangle.
- **Weakness.** The art is smaller (40 to 55 per cent of the face) and the card feels like a form with a picture in
  it if the frame is plain.
- **Best for.** Common cards, places and buildings, anything with an environment.
- **Physical.** Standard print; spot gloss on the window makes it feel like glass.

### 2. Overlay: the art is the card, information floats on it

- **What.** Art runs to the edges; name, numbers and text sit on plates over it.
- **Seen in.** Marvel Snap, Gwent, Pokémon illustration rares, Magic borderless and full art.
- **Why it works.** It is the magazine-cover and film-poster layout: the image owns the space and the type is
  placed into its quiet areas. The picture is two to three times larger than in a portal, which is why it reads as
  premium. Removing the frame also removes the "this is a form" signal.
- **Weakness.** Every element of text competes with art. It needs planned quiet zones (sky, ground, soft background)
  where the plates go, and translucent plates with blur, or it becomes unreadable.
- **Best for.** Top tiers, hero cards, cards whose art is the reward.
- **Physical.** Full art with spot UV on the subject, or full foil.

### 3. Pop-out (frame break): the subject steps toward you

- **What.** A portal, but the subject crosses the frame edge into the viewer's space: a head over the top border, a
  wing over the side.
- **Seen in.** Marvel Snap's frame break variants; promo and showcase cards in several games; die-cut sports cards.
- **Why it works.** The frame says "this is a flat picture behind glass", and the subject breaking it contradicts
  that. The brain reads the contradiction as depth and life. It is the trompe-l'oeil trick of Pere Borrell del Caso's
  *Escaping Criticism* (1874), a boy climbing out of his painting's frame. It also changes the card's silhouette,
  so you can spot it across the room, which is exactly what a rarity signal needs.
- **Rules.** Break by 5 to 15 per cent of card height; break with the focal part (head, crest, flower), never a
  limb tip; never cover the cost or stats; give the overlapping part a small cast shadow on the frame so it reads as
  in front.
- **Best for.** The top rarity, characters and animals.
- **Physical.** Raised clear varnish or embossing on the breaking part; die-cut for special prints.

### 4. Shadowbox: the card is a little box with depth

- **What.** Art built in three or more layers (background, middle, subject, foreground) that move at different rates
  as the card tilts. The frame is the front of the box.
- **Seen in.** Marvel Snap's 3D variants; lenticular and layered physical cards; Victorian paper theatres and
  Joseph Cornell's boxes as the craft tradition.
- **Why it works.** Motion parallax is one of the strongest depth cues the eye has, stronger than shading. A card that
  shows parallax under your finger stops reading as a picture and reads as an object with an inside: a diorama. That
  is Abbie's World's whole look (Tiny Glade, Bricktales: the world as a toy diorama), so this mode is the most
  "on brand" one we have, and we already own 3D models of every Ranch asset.
- **Rules.** At least 3 layers; parallax offsets about 0.3 (background), 0.6 (middle), 1.0 (subject), 1.4
  (foreground) of the tilt; an inner shadow where the frame meets the box; the background extends at least 15 per
  cent past the window so tilting never shows an edge.
- **Best for.** Epic tier; any card we want to feel like a tiny Ranch tile.
- **Physical.** Lenticular, or a layered acrylic collector piece.

### 5. Panorama: the art continues across cards

- **What.** Several cards share one painting; laid side by side they join into a scene.
- **Seen in.** Connected-art sets in Magic and Pokémon; sports-card puzzle backs; triptychs and polyptychs in
  churches.
- **Why it works.** It turns a collection into a picture: the empty slot is visible, which is the strongest
  "complete the set" pull there is (the Gestalt urge for closure). Kids understand it instantly.
- **Rules.** Each card must still work alone (its own focal point and subject); the horizon and light must match
  exactly across seams; three to five cards per panorama.
- **Best for.** A seasonal mini-set ("Spring on the Ranch", five cards), binder pages.
- **Physical.** Sold as a set; a binder page that shows the full scene.

### Modes on the surface (axis 1 = "on"), split by what they show

#### 6. Specimen: the subject alone on a plain ground

- **What.** The subject isolated on paper or a soft studio backdrop, with a contact shadow and no environment. A field
  guide plate.
- **Seen in.** Natural-history plates (Audubon, botanical illustration), Wingspan's bird cards, toy-catalogue
  photography (the LEGO catalogue look Bricktales borrows), item icons in cozy games.
- **Why it works.** With nothing behind it, the silhouette is perfect, so it survives the 72 px thumbnail better than
  any other mode. It was invented for identification, which is what a kid does with a collectible ("I have the
  goat!"). It is also the most consistent mode to produce: every card shares the same backdrop and light, so a set
  looks like a set.
- **Rules.** Subject fills 60 to 75 per cent of the window height; soft contact shadow; backdrop has at most a
  gentle gradient or paper texture; key light identical across the set.
- **Best for.** Common cards, animals, crops, tools; the bulk of a set.
- **Physical.** Matte paper with spot gloss on the subject only, so the subject shines.

#### 7. Emblem: the art is a symbol

- **What.** A designed, symmetrical symbol rather than a depicted scene: a sun, a raindrop, a heart.
- **Seen in.** Playing-card pips, tarot, Balatro's planet and tarot cards, heraldry.
- **Why it works.** Some cards are concepts, not things ("everyone gets a turn", "it rains"). A depicted scene of a
  concept is muddy; a symbol is instant. Symbols also read at any size and in any colour vision.
- **Rules.** Centred and symmetrical; at most three colours; fills 50 to 70 per cent of the window; no environment.
- **Best for.** Actions, rules, weather effects, season cards.

#### 8. Portrait: a close-up with a face

- **What.** Head and shoulders, cropped tight, with expression.
- **Seen in.** Hearthstone heroes, Legends of Runeterra champions, Gwent leaders, sports-card headshots.
- **Why it works.** People (and especially children) look at faces first and read emotion before anything else. A
  portrait makes a card a character you like, not an object you own.
- **Rules.** Eyes on the upper third line; face fills 40 to 60 per cent of the window; a clear expression; a simple
  background.
- **Best for.** Named animals and helpers ("Woolly"), a "best friend" variant of a common animal.

#### 9. Scene: a moment with action

- **What.** A small story: several elements doing something, with a beginning implied.
- **Seen in.** Magic's spell art ("a moment"), Pokémon special illustration rares (a creature in its daily life),
  Hearthstone spells.
- **Why it works.** Narrative: the art explains what the card does. A kid who can't read the text learns the rule
  from the picture ("rain makes the crops grow").
- **Rules.** One focal action; at most three actors; reading direction left to right toward the focal point; needs
  a bigger window (overlay or tall portal).
- **Best for.** Events, weather, story cards, the top of a set.

### Axis 3: time

#### 10. Living art

- **What.** Any of the above with motion: clouds drifting, a tail flicking, light changing.
- **Seen in.** Hearthstone golden cards, Gwent premiums, Snap animated variants; lenticular print.
- **Why it works.** Motion is the strongest attention cue the eye has, so a living card is always the one you look at.
  That makes it a reward, so use it sparingly: if everything moves, nothing stands out.
- **Rules.** Loops of 4 to 8 seconds; motion in the background or a small part of the subject, never the whole card;
  the still frame must already be a good card (print, reduced motion).

### Not an art mode: the card in the world

Inscryption's cards are props on a table. That is how the card object is presented (part 1's "card as a prop"), and it
works with any art mode. For Abbie's World it means cards live on the Ranch table, not in a menu.

### Is that it?

On the depth axis, yes: behind, on, in front, inside, beyond. Every card in the ten games studied is one of these or
a mix (a Snap card with frame break and animation is pop-out plus living). On the content axis, specimen, emblem,
portrait and scene cover the four things a picture can be about: a thing, an idea, a someone and an event. New modes
come from mixing, not from new positions. The two other variables that matter, the medium (watercolour,
papercraft, stained glass, woodcut, 3D render) and the finish (foil, gloss), change how the art looks, not where it sits.

## How to make the art beautiful

Rules that apply to every mode, each with a measure the generator can check (`art_direction` in the rubric).

1. **One focal point.** The highest value contrast in the art sits on the focal point (OKLab L difference at least 0.3
   between focal area and its surround); detail density is highest there (edge density in the background at most
   0.6 times the focal area's).
2. **Three values.** Posterised to three tones, the art still reads (a VLM names the subject from the 3-tone version).
   Most beautiful card art is a clear light, mid and dark pattern before it is anything else.
3. **Silhouette first.** The subject is nameable from a black silhouette at 64 px.
4. **One light for the whole set.** Key light from the upper left at about 45 degrees, warm key and cool shadows, a
   rim light to separate the subject from the background. One set, one sun: this is what makes a set look like a set,
   and it matches the warm, soft light of Tiny Glade that Evan likes.
5. **Depth in three planes.** Foreground, middle and background, with atmospheric perspective: the background has lower
   contrast and saturation and shifts toward the sky colour.
6. **Colour with a job.** Each card has one dominant hue and one accent; the most saturated colour sits on the focal
   point; background saturation at most 70 per cent of the subject's. Colours come from the set palette.
7. **Shapes that say what it is.** Round for friendly animals and food, square for buildings and tools; no sharp
   triangles except for mild mischief.
8. **Compose to the window.** The subject's mass echoes the window outline (a rounded subject in an arch); no
   tangents (subject edges within 2 per cent of the frame edge without crossing it); headroom above the focal point.
9. **Leave room for information.** Plan the quiet zones where the name, plate and numbers will sit before painting.
10. **A toy's camera for 3D renders.** Three-quarter view, 25 to 35 degrees above for objects and buildings (the
    diorama view), 5 to 15 degrees for heroic animals; 50 to 85 mm equivalent lens, so nothing distorts; a slight
    tilt-shift blur at the edges for the miniature feel. Same camera per card type across a set.
11. **Show what the card does.** The picture demonstrates the ability where it can (the rain card shows crops growing),
    so a pre-reader learns the rule from the art.
12. **One medium per set.** Our house medium is a soft toy-diorama render with painterly light. Mixing mediums in one set
    looks like clip art.

## Make once, present many: the layered art package

Every mode above can be built from the same layers, so the generator authors art once and presents it any way:

| Layer | Content | Used by |
|---|---|---|
| `bg.png` | Sky or backdrop, extending 15 per cent past the window on every side | Portal, overlay, shadowbox, panorama |
| `mid.png` | Ground, hills, buildings behind the subject | Portal, overlay, shadowbox, scene |
| `subject.png` | The subject with alpha, plus `subject_bbox` and `focal_point` in the manifest | All |
| `fg.png` | Grass, fence or flowers in front (optional) | Shadowbox, portal |
| `shadow.png` | Contact shadow of the subject | Specimen, pop-out |
| `depth.png` | Optional depth map for a parallax shader | Shadowbox, living |

All layers at the 600 ppi bleed canvas (1630 x 2221 px). In our pipeline the subject is a Blender render of the asset's
own 3D model with a transparent background (we already have every Ranch model), the backdrop is a render of a Ranch
tile scene or a Midjourney painting, and the prompts, job ids and camera settings go into the asset's
`provenance.json` as CLAUDE.md requires. One package, many cards: the standard (portal), the Sun upgrade (overlay with
pop-out) and the 3D variant (shadowbox) of the same animal share every layer.

## What Abbie's World uses

| Card | Mode | Why |
|---|---|---|
| Seed (common) | Specimen inside the type window | Clearest at small sizes, cheapest to keep consistent, reads like a toy catalogue |
| Sprout (uncommon) | Portal | The subject in its Ranch setting |
| Bloom (rare) | Portal with living light | A first taste of motion as a reward |
| Harvest (epic) | Shadowbox | The card becomes a tiny diorama, which is the house look |
| Sun (legendary) | Overlay with pop-out | Biggest art, new silhouette, the subject reaches out |
| Actions, rules | Emblem | Concepts read best as symbols |
| Weather and events | Scene | The picture explains the effect |
| Named animals, variants | Portrait | Faces make friends |
| Seasonal mini-sets | Panorama | A picture to complete |

## Sources

- Leon Battista Alberti, *De pictura* (1435): the picture as an open window.
- Pere Borrell del Caso, *Escaping Criticism* (1874, Banco de España collection): trompe-l'oeil frame break.
- Motion parallax as a depth cue: Rogers and Graham, "Motion parallax as an independent cue for depth perception",
  *Perception* 8 (1979).
- Faces first: the face-attention literature, e.g. Cerf, Harel, Einhäuser and Koch, "Predicting human gaze using
  low-level saliency combined with face detection" (NIPS 2007).
- Notan and value structure: Arthur Wesley Dow, *Composition* (1899); the three-value squint test is standard
  illustration practice.
- Card examples are the games studied in part 1 (`CARD_STUDY.md`), plus Wingspan (Stonemaier Games, 2019) for
  specimen-style cards. As in part 1, these are style observations only; no card art is copied or used as a reference.
