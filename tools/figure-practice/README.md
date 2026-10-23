# Figure practice: the leaping wooden mannequin (2026-10-23)

Evan's practice figure for the day is a wooden artist's mannequin leaping, arms flung up. The reference is a
watermarked stock photo, kept private: it is never committed or published.

- `pose_svg.py`: joint positions read off the reference (pose B, the leap) and the wind-up crouch (pose A, world
  angles). Writes `rig.json`: bone lengths, offsets and local angles for both poses.
- `make_svg.py`: builds `pose-tween.svg`, a blue-graphite mannequin that animates crouch to leap with SMIL. Bones
  rotate in a hierarchy, so limbs keep their length; foreshortened bones in the photo are a squash along the bone.
- Midjourney sketches of the pose (4 styles x 4): `tools/midjourney/outputs/figure-practice-sketches/`.
- Practice page (claude.ai artifact): https://claude.ai/artifact/V3o16ka5SEmm4mxZnDZexE
