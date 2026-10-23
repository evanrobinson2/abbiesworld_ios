# The artist's method: concept sheet to 3D, with the creative checks

AW-STUDY-0016, installment 1d (2026-10-23). Evan: "you're missing the creative skill" and "we keep studying but
you aren't doing reinforced practiced attempts". This file turns the drawing and Blender tutorials into steps a
thread can run, and adds the judgment checks that measuring alone misses. The reps themselves run in the
"Figure practice every 30 minutes" thread. This file is the method and the scorecard they use.

Reads with `construction.json` (forms and the order to build them), `anatomy.json` (bones, muscles, the 25-check
anatomy list) and `human-canon.json` (proportions).

## 1. Draw it the way the Procreate and Fresco tutorials teach

Every tutorial we read works in layers, from loose to tight. Each layer is one decision. Nothing is detailed until
the layer under it reads.

1. **Gesture layer.** Draw one line of action, head to the weight-bearing foot, in a C or an S. Draw it fast and
   lightly. Then lower the layer's opacity to 20 to 30% and work over it on a new layer.
2. **Masses layer.** Place three masses on the gesture: head, ribcage and pelvis. Set the head-to-ribcage rhythm
   first, then the pelvis angle against it. Add a sternum line for the torso's direction and the collarbones as
   handlebars.
3. **Construction layer.** Add the cylinders for the neck and limbs, boxes at the joints, triangles for the feet and
   mittens for the hands (construction.json steps 2 to 15).
4. **Check layer.** Flip the canvas horizontally (Procreate: Actions, Canvas, Flip Canvas Horizontally). A
   fresh-eyes flip shows lopsided shoulders and a leaning figure at once. Fix a wrong proportion by selecting and
   transforming it, or with Liquify (push), never by redrawing over the error.
5. **Contour layer.** Draw one line over the forms: straight against curve, and the nearer form overlapping the
   farther one.
6. **Values layer.** Use a clipping mask over the flat colour. Paint three values (light, half-tone, shadow) on the
   planes, dark to light, then highlights last.

Sources (technique only, nothing copied): Adobe, "How to draw people"; Sarah Holliday, "Drawing People: Creating
Unique and Dynamic Character Poses in Procreate" (Skillshare); "Dynamic People Illustration in Procreate"
(Skillshare); the Procreate Handbook (Actions, Canvas).

## 2. The creative checks (what measuring misses)

Score these by eye on every attempt, 0 to 2 each (0 missing, 1 present but weak, 2 clear). They come from
character-design practice: shape language, silhouette, and push and pull. They sit beside the anatomy checklist
because a figure can hit every landmark and still be dead.

| id | Check | Pass looks like |
|---|---|---|
| gesture | One clear line of action runs through the whole figure | you can draw it in one stroke over the render |
| contrapposto | Shoulders and hips tilt opposite ways; the weight sits over one foot | the pit of the neck is over the standing ankle |
| silhouette | The pose reads as a solid black shape, with no limbs lost inside the body | negative space between the arms and torso, and between the legs |
| shape_language | One dominant shape family fits the character: circles (friendly), squares (strong, steady), triangles (fast, dangerous) | you can name it, and the masses use it |
| big_medium_small | Sizes vary: one big mass, a medium, a small, never three equal | the chest or the legs dominate, the head and hands are accents |
| straight_curve | Every limb has a straight side against a curved side, and they swap at each joint | no sausage limb (both edges bulge at one height) |
| rhythm | Curves flow from one form into the next across the body (the S of the back into the calf) | the eye travels head to foot without stopping |
| overlap | Near forms overlap far ones at every joint | depth reads even in a flat render |
| tangents | No two edges just touch (hand on the hip line, knee on the frame edge) | edges either overlap or clearly separate |
| exaggeration | The gesture is pushed 10 to 20% past the reference. The joints and proportions are not | more energy, same anatomy |
| appeal | The face and hands are where the eye lands; detail clusters there and rests elsewhere | detail density is uneven on purpose |
| planes | 6 to 8 planes per limb read under one light before any detail | it holds up in a flat-shaded render |

A total under 16 out of 24 means the attempt is a study, not a pick, however well it matches the outline.

## 3. Concept sheet to 3D, the way Blender artists do it

From CG Cookie (turnaround sheets for modelling), GameDev.tv (character creation: blockout and reference) and
Overscore (low-poly character modelling with Blender):

1. **Make the turnaround.** Draw front, side and back (add a three-quarter view if details hide) in a neutral
   A-pose. Use the same scale in every view, with horizontal guide lines across all of them at the crown, chin,
   nipples, navel, crotch, knees and ankles. The same height in every view is the rule that makes the 3D work.
2. **Import.** Add each view as a reference image in its orthographic view (front along Y, side along X), at about
   40% opacity. Check the views are the same size and their guide lines meet.
3. **Blockout.** Place primitives on the canon landmarks: ribcage egg, pelvis box, cylinders for the limbs, boxes
   for the hands and feet. Judge it only from far away and in silhouette. Fix the proportions here, where it's cheap.
4. **Box model the body.** Start from a cube with a Mirror modifier (clipping on) and a Subdivision Surface preview.
   Shape the torso with loop cuts (Ctrl+R), matching vertices to the outlines in X-ray (Alt+Z). Extrude the limbs
   from 6- or 8-sided loops (LoopTools Circle), and bridge the legs to the torso with matching vertex counts.
5. **Push and pull.** Now the craft. Move edge loops to make the creative checks pass: the action-side curve, the
   straight inaction side, the bulge peaks offset (anatomy.json surface forms), and the gesture pushed. Check in
   perspective from several angles after every few moves, not only in the orthographic views.
6. **Planes.** In flat shading, make the planes read: deltoid wedge, ribcage box, pelvis box, knee box, shin plane.
   Add loops only where a plane changes.
7. **Clean.** Use mostly quads (Select All by Trait, Faces by Sides finds triangles and n-gons). Apply the mirror
   before any asymmetry. Make accessories separate objects.
8. **Score and repeat** (section 4).

Optional high road: sculpt from the blockout, then retopologise to the low-poly game mesh. Our recipe-first
pipeline (build.py) does step 4 as code, but steps 3, 5 and 6 are still judgment, and the creative checks score them.

## 4. One rep of deliberate practice

1. **Pick** the target and say the single thing this rep is practising (for example "the S-curve of the back from
   the side").
2. **Attempt** it with the method above. Time-box it.
3. **Render** in the target's own cameras (front, side, back, plus its hero camera), on the same background.
4. **Score** three ways:
   - outline match per view (IoU)
   - the anatomy checklist (`anatomy.json`, 25 checks)
   - the creative checks (section 2, 24 points)
5. **Write the one lesson** in a sentence, and the one thing the next rep will change.
6. **Repeat.** Keep every attempt, never overwrite one. One page shows attempt 1 to N, side by side, with its three
   scores and its lesson, so the curve is visible.

Practice notes:
- Change one thing per rep, so the score says what helped.
- A rep that raises IoU but drops the creative score is a regression.
- Blender runs in a cloud session, so the reps don't need the Mac or the PC. Install it with
  `pip install bpy` (Blender 5.2 as a Python module, about 400 MB), then
  `apt-get install -y libegl1 libgl1 libxkbcommon0 libsm6 libxi6 libxxf86vm1 libxfixes3 libxrender1`.
  It renders headless with Workbench (tested 2026-10-23).
