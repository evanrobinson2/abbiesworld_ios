# AW-STUDY-0016, installment 1b: drawing the figure

Added 2026-10-23 after Evan's note that installment 1 measured the body but never said how to draw it, and that the
Midjourney arms and legs came out "too wrinkly". This is the how: the order the figure-drawing books build a body in,
written as data a modeler (or a prompt) can follow.

- `construction.json`: 17 ordered steps. Each is a simple form placed between two canon landmarks (names from
  `human-canon.json`), with its cross-section, plane count and where its muscle bulges peak along the limb (`peak_t`,
  0 at the top joint, 1 at the bottom). Also the limb rules, the proportion systems and the Midjourney phrases.
- `tools/bodies/construct.py`: draws the diagrams on the study page (build strip, gesture, sausage vs clean limb,
  cross-sections, foreshortening) and copies `construction.json` next to the page.
- The page: https://app.abbies.world/studies/#bodies-study, section "Drawing the figure".

## The order

1. **Gesture.** One line of action from the head to the weight-bearing foot, a C or an S. Shoulders and hips tilt
   opposite ways; the standing ankle sits under the pit of the neck (Loomis).
2. **Masses.** Head as a ball with a jaw plane; ribcage as an egg flattened into a box (8 planes); pelvis as a box
   narrower below, tilted forward 10 degrees on a man and 15 on a woman; the waist a soft bean between them. The two
   rigid blocks tilt against each other (Bridgman).
3. **Stick figure.** Joints as circles at the canon landmarks: shoulder, elbow, wrist, hip, knee, ankle.
4. **Cylinders and boxes.** Each limb a tapered cylinder (6 to 7 planes), each joint a beveled box, hands and feet as
   wedges. Cross-sections: upper arm flattened side to side; forearm round at the elbow and a 2:1 flat box at the
   wrist; thigh a rounded triangle; shin a D, flat in front.
5. **Contour.** Only now the outline, from form to form, with the bulges offset (below).
6. **Planes, then detail.** Make 6 to 8 planes read round each limb before any detail. Creases only where bone is near
   the surface (collarbone, elbow, wrist, kneecap, shin, ankles).

## Why the limbs went wrong

A contour drawn with no forms under it turns into a sausage: both edges bulge at the same height, and wrinkles get
added to fake the form. The books' fixes:

- Never bulge both edges at the same height. Upper arm: deltoid outside at 0.2, biceps inside at 0.55. Forearm: outer
  at 0.18, inner at 0.3. Thigh: outer at 0.25, inner teardrop at 0.82. Calf: outer at 0.25, inner lower at 0.38.
- Straight against curve: the shin is straight in front, the calf curved behind; each limb has a curved action side
  and a straighter inaction side, swapping at each joint (Bridgman).
- Muscle bellies in the top of a segment, tendons below (forearm, calf).
- Joints are boxes, bellies are cylinders: the planes change at the joints, which is what the eye reads as "knee"
  and "elbow", not wrinkles.
- Foreshortening: the nearer form overlaps the farther, and its end ellipse is rounder and bigger.

## For modelers

Build the steps as primitives on the canon landmarks (`construction.json` gives which landmarks each spans), then
loft or sculpt the contour over them, putting each bulge at its `peak_t`. Check the plane count in a low-poly pass
before smoothing. Score the result with `tools/bodies/score_body.py`.

## For Midjourney

Add: "anatomically correct adult proportions, relaxed contrapposto, weight on one leg, smooth clean limbs with simple
planes, defined knees elbows and ankles, straight shins, full body, front side and back views".
`--no wrinkles, rubber hose arms, sausage limbs, tube limbs, extra fingers, distorted hands`.

## Sources

Loomis, *Figure Drawing for All It's Worth* (line of action, mannequin frame, straights against curves,
foreshortening). Bridgman, *Constructive Anatomy* (masses, wedging, action and inaction sides, the knee as a beveled
square; public domain). Vanderpoel, *The Human Figure* (planes before detail; public domain). Lee and Buscema, *How to
Draw Comics the Marvel Way* (stick figure, cylinders, contour, detail). Evan's reference, the easydrawingguides.com
superhero tutorials: a contour-first beginner order (head, neck, shoulders, arms in overlapping curves, torso, legs and
kneecaps, costume). We keep its order of parts and its overlaps, and put the forms first so the drawing works in 3D.

The artist's side (layers, the 12 creative checks, concept sheet to Blender, and the practice-rep protocol) is in
`ARTIST_METHOD.md`.
