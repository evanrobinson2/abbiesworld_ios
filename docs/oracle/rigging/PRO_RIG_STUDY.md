# How a professional 2D layer rig is built (from Evan's bought Unity pack, 2026-10-23)

Evan bought `abbie_assets_animation_effect.unitypackage` on Fiverr. It is a private purchase: the art stays in the project
files, never in this repo. This note records only its structure. `tools/rig-cutout/unitypack_render.py` reads such a pack
(text YAML only) and renders any clip, so the rig can be studied and compared.

## What is in the pack
- 21 character sprites (200 pixels per unit) as separate complete layers: `arm_upper`, `arm_lower`, `arm_hand_open_1`,
  `arm_hand_close_1/2`, `body_upper`, `body_middle`, `body_lower_front/back`, `head_1/2/3`, `head_hair_back`,
  `head_hair_front_1/2`, `leg_upper`, `leg_lower`, `leg_foot`, `wand_1..4`; plus effect sprites (bubble, heart, star, 6 slashes).
- One prefab: a bone hierarchy of plain transforms (about 30), each carrying one SpriteRenderer. Root `abbie` > `base`
  (the Animator sits here, clip paths are relative to it) > `body_lower` (hips) > `body_middle` > `body_upper` > `head`,
  `arm_upper_L/R` > `arm_lower` > `hand`; `body_lower` > `leg_upper_L/R` > `leg_lower` > `leg_foot`; `skirt/front`, `skirt/back`.
- 9 clips (idle 2 s, move 1 s, jump start/midair/land, attack, dodge, duck, hurt 3.4 s), one base `character.controller`
  (parameter `Blend`, states idle, move, jump, attack, dodge, 16 transitions) and `abbie.overrideController`.
- Effects (bubble, heart, star) as separate prefabs and clips.

## How it is built, and why it works
1. **Every part is a complete drawing.** A limb sprite is whole, including the end hidden inside the neighbour.
2. **The sprite pivot is the joint.** Each sprite has a custom pivot placed at its joint (arm_upper pivot 0.6, 0.7; leg_upper
   0.5, 0.8; head 0.5, 0.25). Rotating the transform turns the part about the joint. Bone lengths are set by child offsets.
3. **One sprite serves both sides.** `arm_upper`, `arm_lower`, `leg_*` are reused for left and right, the right side with
   scale x = -1. Half the art, perfect symmetry.
4. **Draw order is separate from the hierarchy.** Sorting orders (far arm -60, far leg -20, back hair -70/-72, near arm
   +30, head +20, front hair +40) put limbs in front or behind regardless of which bone they hang on.
5. **Variants are toggled, not redrawn.** `head_1/2/3` (expressions, blink), `arm_hand_open/close`, `wand_1..4` are sibling
   objects; clips switch `m_IsActive`. Secondary pieces (4 hair pieces, skirt back) are bones of their own.
6. **Clips are almost only rotation.** idle: 20 rotation curves of 3 keys each (0 s, 1 s, 2 s), biggest swing 29 degrees,
   a blink as an active toggle. move: 5 keys per curve, up to 135 degrees. Position is not animated except the root.
   A bone's scale is keyed for squash. Tangents are eased (zero slope), so a few keys read as smooth motion.
7. **Stock animations are retargeted by override.** The base controller points at empty placeholder clips; each character
   ships an `overrideController` that swaps in its own clips with the same bone paths. A new character that keeps the bone
   names and paths takes every stock clip.

## Our cut-out (AW-STUDY-0047) against it
| | Pro pack | Our cut-out |
|---|---|---|
| Parts | each drawn complete | sliced from a flat picture, hidden areas missing |
| Pose | neutral default | flying pose |
| Pivots | custom, inside the sprite at the joint | one cut at a nearest-bone border |
| Symmetry | one sprite mirrored for both sides | every part unique |
| Variants | swap expressions, hands, props | none |
| Order | explicit sort order, far limbs behind | order by hierarchy depth |
| Secondary | hair and skirt bones | none |
| Clips | 3 to 8 eased keys per bone | none |

The rigid transform hierarchy is the same idea as ours. The gap is the art: complete layers in a neutral pose with
pivots at the joints. Rebuilding ours to this standard needs painted complete parts, not a better cutter.
