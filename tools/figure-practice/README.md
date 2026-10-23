# Figure practice: the leaping wooden mannequin (2026-10-23)

Evan's practice figure for the day is a wooden artist's mannequin leaping, arms flung up. The reference is a
watermarked stock photo, kept private: it is never committed or published.

- `pose_svg.py`: joint positions read off the reference (pose B, the leap) and the wind-up crouch (pose A, world
  angles). Writes `rig.json`: bone lengths, offsets and local angles for both poses.
- `make_svg.py`: builds `pose-tween.svg`, a blue-graphite mannequin that animates crouch to leap with SMIL. Bones
  rotate in a hierarchy, so limbs keep their length; foreshortened bones in the photo are a squash along the bone.
- Midjourney sketches of the pose (4 styles x 4): `tools/midjourney/outputs/figure-practice-sketches/`.
- Practice page (claude.ai artifact): https://claude.ai/artifact/V3o16ka5SEmm4mxZnDZexE

## Low-poly mannequin (`mannequin/`)
- `build.py`: 30 named wooden parts in Blender, posed from joints read off the photo; depth comes from keeping each
  bone its true length. Renders from the photo's orthographic camera and exports `mannequin.glb`.
- `parts.py`: renders every part on its own (`parts.jpg`). `score.py`: silhouette IoU against the private mask.
- `notes.json`: Evan's asks and each round's score and lesson (round 3: IoU 0.80, 1,538 faces).
- `banana-split/`: the mannequin in the toon set (shader copied from `docs/oracle/rendering/shaders-article.html`),
  "banana split day", with a still per look.
