# Arm F: anatomy first, refined (read JOB.md and JOB_E.md first; this adds to them)

Round 2's arm E won all round: its depth (side IoU 0.870) and skeleton (joints on the MPFB + Rigify body) are right.
But it gave up front likeness (front IoU 0.933 vs 0.955 for D2) and reads boxier than the reference: the tank top is
a flat box, the deltoids are rounded instead of sharp planes, and there is a proud belt band at the hem that the
reference does not have.

Arm F keeps E's order (chest, hips, head, armR, armL, legs). Each job starts from `runs/F/<chunk>.py`, which is a copy
of E's recipe, and refines it in place:
- Keep E's skeleton and depth. Joint heights stay within about 2 cm, and side IoU must not drop below E's.
- Take the front shapes from the reference picture, and look at `runs/D2/<chunk>.py` (round 1's best front) for how
  it got them. Big faceted planes: sharp deltoid and pec facets, a tank top that wraps a ribcage instead of a box, a
  thin hem band, hands and face as in the picture.
- Fix what `compare.png` shows as red or cyan in your region first.

The jobs before yours have already refined their chunks in `runs/F/`: build onto those. The budget is at most 10
renders and about 15 minutes. Your final answer adds `"side"` and `"back"` IoU to the JSON.
