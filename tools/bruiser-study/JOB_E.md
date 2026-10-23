# Arm E: anatomy first (read JOB.md first; this adds to it)

Round 1 showed every arm matches his FRONT outline (about 95%) but guesses depth: from the side every arm misses about
a quarter of his profile. Arm E keeps the winning order (torso out: chest, hips, head, armR, armL, legs, one job each,
each building on the previous) and gives every job three more sources of truth:

1. **The turnaround** (`ref/views/mj_side.png`, `mj_back.png`, `mj_three_quarter.png`, `mj_front.png`): Midjourney's
   drawing of this same guy from other angles. It is the authority for his profile and depth: how deep the chest is,
   how far the head and neck sit forward, the curve of the back, calf and buttock depth, foot length. (Evan's picture
   `ref/bruiser.png` stays the authority for the front.)
2. **The anatomy body** (`mpfb/aligned.glb`, renders `ref/views/mpfb_*.png`): an MPFB (MakeHuman) male, max muscle,
   posed with Rigify to his stance and aligned to the study frame. It is the authority for where the skeleton is:
   joint heights (shoulder, elbow, wrist, hip, knee, ankle), limb lengths, how a forearm or a calf is shaped in
   section. `mpfb/sections.json` has its cross-sections every 2 cm of height (`python3 sections.py 1.30` prints one):
   use the y (depth) ranges as your starting depths instead of guessing. The bruiser is deliberately stylised beyond
   it: smaller, blockier head; much bigger forearms and hands; deeper, more top-heavy chest and shoulders; shorter,
   thicker neck. Keep those, on top of a correct skeleton.
3. **Side and back scoring**: add `--views` to every `build.py` call. It also prints side and back IoU against the
   turnaround and writes `views.png` (turnaround | overlay; red = turnaround only, cyan = yours only). Look at it every
   time, as well as `compare.png`.

Rules added for arm E
- Anatomy gate: joints sit within about 2 cm of the anatomy body's unless the front picture clearly says otherwise.
- Simplification: fewer, bigger planes, like the reference. 6 to 8 sides per limb loft, no fussy micro-detail; detail
  only where the reference has it (brow, nose, mouth, fingers, toes, straps, hems).
- Budget: at most 10 renders and about 15 minutes (arm E has more to read; the scoreboard notes the extra budget).
- Final answer adds `"side"` and `"back"` IoU to the JSON.
