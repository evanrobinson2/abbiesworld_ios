# Motion Sources

This directory holds provenance records for imported motion clips.

## Recommended Sources

### Mixamo (Adobe)
- URL: https://www.mixamo.com
- License: Free for commercial use with Adobe account
- Format: FBX with embedded animation
- How to use:
  1. Sign in with Adobe account
  2. Select any character (we only use the skeleton)
  3. Choose animation
  4. Download as FBX (With Skin, 30 fps)
  5. Import with `import_humanoid_motion.py`

### Rokoko Free Motion Library
- URL: https://www.rokoko.com/products/motion-library
- License: Free for commercial use (check specific clips)
- Format: FBX/BVH
- How to use:
  1. Download motion pack
  2. Extract desired clips
  3. Import with `import_humanoid_motion.py`

### Other Sources

Any standard humanoid FBX or BVH should work. The importer handles:
- Mixamo naming convention (`mixamorig:Hips`, `mixamorig:Spine`, etc.)
- Standard naming (`Hips`, `Spine`, `LeftArm`, etc.)
- BVH joint names (`hip`, `chest`, `lShldr`, etc.)

## Import Example

```bash
python3 scripts/humanoid_rig_poc/import_humanoid_motion.py \
  --input "Walking.fbx" \
  --name walk \
  --rig abbiesworld.humanoid.child.v1 \
  --plane front \
  --loop \
  --source mixamo \
  --license "Mixamo free license - commercial use permitted"
```

## Provenance Files

Each imported clip generates a provenance record:

```json
{
  "source": "mixamo",
  "sourceFile": "Walking.fbx",
  "sourceHash": "sha256...",
  "licenseNote": "Mixamo free license",
  "importedAt": "2026-09-19T...",
  "projectionPlane": "front",
  "simplifyThreshold": 1.0,
  "rigFamily": "abbiesworld.humanoid.child.v1"
}
```

**Never commit raw third-party assets without a provenance record.**

## Target Animation Library

### Vertical Slice
- [x] idle
- [x] walk  
- [x] run

### Future Pack
- [ ] wave
- [ ] cheer
- [ ] jump
- [ ] land
- [ ] clap
- [ ] point
- [ ] pick_up
- [ ] place_down
- [ ] look_around
- [ ] dance_simple
- [ ] surprised

## Notes

- We only use the skeletal motion, not mesh data
- Complex skeletons are collapsed (spine chain → torso, etc.)
- Fingers, toes, twist bones, and facial bones are ignored
- Curves are simplified to reduce mocap noise
- Target: 6-12 keyframes per joint for a typical 1-second clip
