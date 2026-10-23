# The scaling version (AW-STUDY-0021, round 4)

Evan, 2026-10-23: "Meshy will be perfect... so you'll be able to at least see what perfect means in this context, then
you can build a scaling version of it. Take loads of screenshots along the way, and unpack how to get back and forth
via language and Blender helper scripts."

Meshy (image-to-3D, task 01a167ca, no texturing) is the target: `../meshy/`. Its body came out square to itself, so
`../meshy/canonical/meshy_canonical.glb` is it in the study frame facing -Y. His picture is taken from about 24
degrees round (`../meshy/align.json`).

| Script | What it does |
|---|---|
| `learn.py` | Cuts the hero every 2 cm into rings (32 points), one stack per named part: torso, arm_R/L (deltoids split off the chest above the armpit), leg_R/L, hand pieces. Writes `spec/spec.json` (the recipe) and `spec/spec.md` (the same in words). |
| `edit.py` | The language side. Body words (`regions`: head, neck, chest, belly, hips, deltoid, upper arm, forearm, hand, thigh, shin, calf, foot...) map to a part and a height band; ops `measure`, `scale`, `move`, `flatten`, `undo`. Every edit keeps the old spec in `spec/history/` and logs the words with the op in `spec/edits.jsonl`. |
| `figure.py` | Builds a figure from rings alone (lofts) at any `--sides` / `--step` / `--tol`. Good for the body, loses the face, fingers and tank-top edges. Also holds the shot sheet and scoring used by both builders. |
| `deform.py` | The cage. Binds every Meshy vertex to its part's ring (angle and radius fraction), moves it with the edited rings, welds seams and decimates (`--ratio`, or `--planar` degrees). Keeps all of Meshy's detail; edits by body words still work. |

Every run with `--shots` saves `shots/NNN_<tag>.png`: Meshy on top, ours below, front / three-quarter / side / back,
then his picture beside our model in the study camera, with silhouette IoU against the hero from each side.

Results so far: rings only, 97% IoU from every side at 1,700 faces. The cage gets 97.2% at 900 faces, 99.2% at
3,000 and 99.7% at 9,000. `../runs/G/chest.py` puts the 3,000-face cage model on the study scoreboard as arm G,
next to Meshy as arm M.
Next: the same pipeline on brute #2 (`../ref/bruiser-2-queued.png`), which needs one Meshy run on Evan's Mac.
