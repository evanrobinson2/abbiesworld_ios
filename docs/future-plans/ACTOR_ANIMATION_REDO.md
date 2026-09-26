# Chore — Redo Abbie and Daddy animations from scratch

Status: done 2026-09-19. Each gait is its own Meshy task, exported Y-up, and the movement lab scores the nose with the stick (North 0.97, East 0.90, South 0.97, West 0.90). Daddy no longer mirrors.

- Abbie rig `01a0b998-a950-7235-8923-9c60be3ac67b` (the September 15 rig was gone). GLBs in `experiments/meshy_actor/output/redo/abbie/`.
- Daddy rig `01a0ac64-75b4-73e9-972e-f593b06a8bbe`. GLBs in `experiments/meshy_actor/output/redo/daddy/`.
- Shipped: `abbie_idle.usdz` Idle, `abbie.usdz` Casual_Walk, `abbie_run.usdz` Run_02, and the same three names for Daddy.
- `headingForTravel` is the lab camera basis (stick-right 135°, stick-down 51° for a +Z chest). Abbie subtracts `chestYawBias` (0.378 rad) because her chest is not +Z.
- `formation` keeps Daddy at (-0.07, 0.04). It ignores facing.

Filed 2026-09-18. Movement on the iPad is wrong enough that the clips should be regenerated, not remapped. Facing is part of the same job: a clean clip still looks broken if yaw and formation stay as they are.

## What is wrong now

Abbie's multi-clip Meshy export asked for five actions and kept four. The clip named Idle is the walk (feet travel). A later single request for action 0 is the rest clip now shipped as `abbie_idle.usdz`. Walk is still `abbie.usdz` (Meshy name Idle). Run is `abbie_run.usdz` (Meshy name Casual_Walk). Names are one slot off the motion.

Daddy's names match the motion (Idle is a real idle). He still reads wrong on the plate: stick-right faces left, and he swaps to Abbie's other side when travel crosses from right to left. That swap is `formation(facingRight:)`, which mirrors his offset whenever `next.x < lead.x`. It is not a missing clip.

The 678 MP4s under `experiments/meshy_actor/output/library_previews/mp4` are Meshy's generic library GIF previews, converted. They are not Abbie or Daddy. The characters are the GLBs.

## Do this

1. Keep the existing rigs only as a reference. Generate each gait as its own animation task. Do not use one multi-clip merge. That merge is what dropped Abbie's idle and shifted the rest.
2. Abbie gaits: idle (action 0), walk (Casual Walk 30), run (Run 2 14). Wave and celebrate only if they are still wanted. Bind by watching the GLB, not the clip name.
3. Daddy the same way, even though his current names happen to match. One pipeline for both.
4. Export each clip to its own Y-up USDZ the way the shipped files are: `upAxis = Y`, root `rotateXYZ (-90, 0, 0)`. RealityKit only plays `animationSource`, so one file per gait stays the contract.
5. Fix travel facing before calling the new clips done. `headingForTravel` still points the chest the wrong way on screen X. Stop mirroring Daddy across Abbie; he should trail, not flip sides.
6. Prove it in `experiments/meshy_actor/movement_lab/` (game camera, real GLB, yellow arrow = stick travel) before another iPad install. The lab page is started and not signed off.

## Do not

- Treat the library MP4s as the character animation.
- Put Abbie back on a frozen bind pose. Standing has to be a moving idle.
- Normalize the stick or let the right stick strafe. Those were already rejected.

## Sources

- Origin run: Meshy spike, 2026-09-15. Rig `01a0a753-db7d-7738-8cc8-8f142f0941d8`. Merged animation `01a0a754-ae78-71e0-a289-07ba5cdd2e92` (4 clips). Idle-only retry `01a0b66a-aeb4-7646-868e-221d890d0550`.
- Abbie GLB: `experiments/meshy_actor/output/character.glb`
- Daddy GLB: `experiments/meshy_actor/output/tactical_ops/character.glb`
- Shipped files: `Resources/World2Actors/`
