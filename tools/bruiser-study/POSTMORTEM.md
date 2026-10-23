# Bruiser study post-mortem (2026-10-23)

Evan, 09:26Z: "review all anatomy, review the methods, review what's worked okay, review what you did TO mesh to get
what you got, DIFF meshy from the actual image.. figure out how you MISSED such obvious cues." And: "you can do it for
so much more cheaply after you get good".

Numbers come from `postmortem.py` (outputs in `postmortem/`): every build and the Meshy body are put in the same frame,
square to the camera, and measured surface to surface.

## 1. The headline: our score was wrong

Hand-built arm C scored front IoU 0.957 against his picture, and Meshy scored 0.915. But Meshy is far closer to the real
brute: measured surface to surface, C is 4.3 cm off on average and Meshy-derived G is 0.8 cm off. The score was
rewarding a wrong model over a right one, because:

- **The picture is not a front view.** It is a three-quarter view, turned about 23 to 24 degrees. Two separate checks
  agree: align_meshy found 24 degrees, and the Mac's picture diff (rembg cutout, yaw swept) found 23 degrees, IoU 0.961.
  `JOB.md` told every arm "the reference is a front view with slight perspective". So every arm built a square-on body
  and then stretched its outline until a square-on camera matched a turned picture.
- **We only scored one camera.** A front silhouette can't see depth. Arms could cheat the outline and lose nothing.
- **The side and back views we added came from the Midjourney turnaround**, which is itself a guess drawn from the same
  picture, not ground truth.
- **There was no 3D answer key until Meshy.** Nobody could say "your chest is 15 cm too shallow" because nobody had a
  chest to compare against.

## 2. The obvious cues we missed (see `postmortem/cues.jpg`)

1. The head shows its side plane and the nose points to picture-right.
2. The tank top's neckline sits off the centre of the shoulders.
3. The far shoulder shows its top and outer plane.
4. The far forearm shows its outer plane; the near one shows its front.
5. The shorts show a side panel on one side only.
6. One foot points out about 45 degrees.
7. The other foot points at the camera.

Agents did notice some of these (arm E logged "head turned 7 degrees", "right foot turned 43 degrees"), but each was
written down as pose, a quirk of that body part, and modelled as such. No step asked "is the camera turned?", and no
step was allowed to change the brief. One look at seven cues all leaning the same way says "camera", not "pose".

## 3. Anatomy, region by region against Meshy

Mean surface gap (cm) / signed (minus = ours falls short):

| region | A | B | C | D1 | D2 | D3 | E | G |
|---|---|---|---|---|---|---|---|---|
| head | 1.8/-0.2 | 1.9/-0.5 | 1.6/-0.1 | 1.6/-0.4 | 1.4/-0.3 | 1.6/-0.5 | 1.8/-0.5 | 0.6/0.0 |
| neck | 4.0/-1.8 | 4.6/-1.6 | 4.3/-1.7 | 3.0/-1.2 | 2.4/-0.5 | 4.4/-1.4 | 2.7/0.0 | 0.5/0.0 |
| chest | 5.6/-3.2 | 4.8/-2.9 | 4.8/-2.8 | 4.6/-2.6 | 2.7/-0.9 | 4.6/-2.4 | 2.6/-0.8 | 0.6/0.0 |
| belly | 2.8/-1.0 | 2.8/-0.5 | 2.7/-0.4 | 3.2/-1.1 | 2.7/+1.3 | 3.1/-0.1 | 2.3/-0.1 | 0.9/0.0 |
| hips | 2.1/-0.8 | 2.6/-0.1 | 2.1/-0.2 | 3.2/-1.8 | 1.8/+0.3 | 2.2/-0.6 | 1.9/-0.5 | 0.9/0.0 |
| deltoid R | 5.8/-4.0 | 5.9/-4.1 | 5.8/-3.8 | 5.2/-4.1 | 4.8/-3.0 | 4.7/-3.0 | 2.5/-1.5 | 0.9/0.0 |
| upper arm R | 6.0/-3.8 | 6.2/-3.7 | 6.6/-4.0 | 4.9/-3.4 | 5.5/-3.2 | 4.9/-2.8 | 3.2/-2.1 | 1.0/0.0 |
| forearm R | 6.0/-3.3 | 5.5/-3.0 | 6.8/-4.2 | 5.0/-2.9 | 6.1/-3.3 | 4.5/-2.9 | 3.1/-1.6 | 1.2/-0.1 |
| hand L | 6.5/-2.8 | 5.8/-2.5 | 6.0/-2.5 | 5.7/-2.4 | 5.6/-2.5 | 5.9/-2.3 | 4.5/-1.9 | 0.6/0.0 |
| thigh R | 1.5/-0.7 | 1.6/-0.7 | 1.7/-0.6 | 2.2/-1.3 | 1.6/-0.1 | 2.0/-0.7 | 1.7/-0.4 | 0.9/0.0 |
| shin R | 4.0/-1.6 | 3.7/-1.4 | 5.4/-3.4 | 3.2/-1.7 | 5.8/-2.5 | 3.8/-2.0 | 2.8/-0.8 | 1.1/-0.1 |
| foot R | 12.0/-4.7 | 9.6/-3.9 | 4.9/-2.7 | 7.4/-3.3 | 6.2/-2.9 | 5.9/-2.8 | 3.1/-1.7 | 0.7/-0.1 |
| **whole body** | 4.5 | 4.4 | 4.3 | 3.9 | 3.5 | 4.1 | **2.6** | 0.8 |

(Full table, both sides: `postmortem/regions.json`.)

What it says:

- **Every hand build is too thin, everywhere.** No region of any arm sticks out past Meshy on average except D2's belly.
- **Depth is the bigger miss.** On faces pointing front or back, the builds fall short by 1.1 to 3.0 cm; on faces
  pointing sideways, by 0.7 to 1.5 cm (`postmortem/facing.json`). Chest depth at nipple height: Meshy 51 cm, E 44,
  D2 45, A 35.
- **The back is missing.** In the side heatmap (`postmortem/heatmap.png`) the back of every hand build is dark blue:
  no trapezius mass, no lats, no shoulder blades. The picture can't show the back, and nothing we scored could see it.
  Against the anatomy checklist that fails `muscle.back` and `skeleton.spine` (no S-curve) outright.
- **Arms are the worst region**: deltoids, upper arms and forearms are 3 to 4 cm short of Meshy's radius all round.
  In a three-quarter picture the arms are partly hidden behind the torso, so a front-only outline undercounts them.
- **Head and thighs were fine** in every arm (under 2 cm), because they are the parts the picture shows most squarely.
- **Arm E (anatomy first) was the best hand build in every region**, because it took its depth from a skeleton (MPFB)
  and the turnaround instead of inventing it. It still fell short where the turnaround guessed wrong (back, arms).

## 4. The methods

| arm | method | whole-body gap | what it taught |
|---|---|---|---|
| A | six crops, each job sees only its crop | 4.5 cm | parts built blind don't fit; worst feet (12 cm) |
| B | six jobs, each sees the whole picture | 4.4 cm | context helps a little |
| C | one job after another, top down | 4.3 cm | best front score, still 4.3 cm off: the score lied |
| D1 | feet up | 3.9 cm | grounding first fixes legs, not torso |
| D2 | torso out | 3.5 cm | best of round 1: the torso sets everything else |
| D3 | face last | 4.1 cm | the face doesn't drive the body |
| E | anatomy first: skeleton, depth from the turnaround | 2.6 cm | the only real step forward |
| F | E refined (chest and hips only) | paused | |
| R5 | MPFB + Rigify body, 29 named settings fitted to Meshy, head close-up fit | 2.4 cm (after scaling him to 2.0 m) | the first learned build that beats E; was built 12% too short |
| M | Meshy image-to-3D, 43 s, 30 credits | 0 (the key) | 0.961 against his picture at 23 degrees |
| G | Meshy's surface on our ring cage, decimated | 0.8 cm | best asset, but dressing, not learning |

The order didn't matter much (A to D3 all within 1 cm). What mattered was where depth came from.

Round 5 (`recipe/`, on the Mac) is the first build that is learned rather than copied: a parametric body with named
settings (head width, squareness, jaw, brow, neck, chest depth, arm thickness, leg length, stance) fitted against Meshy.
Region by region it is best of all our own builds at the chest (1.8 cm), neck (1.6) and head (1.7), and its depth
shortfall is gone (-0.4 cm front-to-back against E's -1.1). Its weak spots are forearms (4.3 to 4.7 cm short) and feet.
One more miss of the same kind: it was built at 1.77 m against Meshy's 2.0 m, because its fit never checked stature.

Transfer to brute 2 (silhouette match against brute 2's Meshy model, mean of four views):
brute 1's settings unchanged 0.737; refitted 0.762; a guess from brute 2's picture alone, by an agent that saw no 3D,
0.718. 14 of 29 settings carried over within 10%; head and chest depth moved most. The picture-only guess was worst on
chest depth, forearms and elbow bend: the same depth blindness as rounds 1 and 2. Brute 2's ceiling is structural for
now: the body model has open hands where he has fists, and no round shoulder caps.

## 5. What we did TO Meshy's mesh to get G

1. Turned it square (-24 degrees), stood it on the ground, scaled it to 2.0 m (`meshy/canonical/`).
2. Welded the vertices Meshy splits at its UV seams (`remove_doubles` 1e-5) and recalculated normals. Without this the
   decimated mesh cracked (IoU 0.968; with it 0.992).
3. `learn.py`: sliced the body every 2 cm, split each slice into pieces, made a 32-spoke ring for each piece, and
   tracked the rings into named chains: torso, arms, legs, hands; deltoids split off above the armpit.
4. `deform.py`: bound every Meshy vertex to its ring (part, angle, fraction of radius), so editing a ring in words
   (`edit.py`: "flatten the chest", "forearms 20% thicker") moves the surface.
5. Decimated to 10% (3,000 faces), flat shading, and painted materials by height band (skin, shorts, tank top).

Nothing in those steps came from the picture. The shape is all Meshy's, which is why it's the best model and why it
isn't learning.

## 6. Meshy against his actual picture (`postmortem/meshy-vs-picture.png`)

At its best turn Meshy matches his picture's outline at 0.961 (brute 2: 0.951 at 9 degrees). Where it differs:

- Hands smaller and set higher; feet shorter, and the out-turned foot points less far out.
- The head is a little narrower; the chin block is softer.
- The tank top's rolled neckline and hem are smoothed into the body.
- The picture is a lower, slightly wider camera than our 85 mm study camera, which enlarges his feet and legs.

So Meshy is a very good answer key for the body, not a perfect one for hands, feet and trim.

## 7. The process, and why it gets cheap

What we know now, as rules for the next figure:

1. **Measure the camera before modelling.** Read the cues (neckline, shoulder planes, feet, head) and estimate the
   turn; check it by sweeping a turn on a rough body against the cutout. Never assume "front view".
2. **Score in 3D and in the picture's own camera.** Silhouette in one view is not a score.
3. **Depth comes from a skeleton and a body model**, never from the outline: MPFB + Rigify base with named settings
   (head, neck, chest depth, arm thickness, leg length, stance).
4. **Build the back on purpose**: trapezius, lats, shoulder blades and the spine's S-curve, from the anatomy checklist.
5. **Score anatomy**, region by region, against the checklist in `docs/oracle/bodies/anatomy.json`.

Cost: Meshy is 20 to 30 credits and under a minute per figure. Once the named settings are learned, a new figure is a
camera estimate plus a settings guess from the picture, built in Blender on our machines for nothing. Meshy then
only needs to run as an occasional audit. Round 5 says we are not there yet: reusing brute 1's settings beats a
picture-only guess (0.737 against 0.718), so the settings carry real knowledge, but depth still can't be read from one
picture without the camera and anatomy rules above. Next: fists and deltoid caps in the kit, a camera estimate in
every fit, and the picture-only guess re-run with rules 1 to 5 until it reaches the refitted score without Meshy.
