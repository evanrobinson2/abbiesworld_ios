# Parameter guide: papercraft helmet

Units: the dome is about 1 unit across. Z is up. Before `place.yaw` the helmet faces -Y (toward the camera); angles are degrees.
Paths use dots; list indices are numbers (e.g. `shape.dome.2` is the dome height radius).

- `shape.dome` [rx, ry, rz]: dome radii (side, front-back, height). Low and wide dome = smaller rz.
- `shape.band_h`: brow band height at the sides. `shape.band_front`: extra depth of the band at the front (the forehead plate).
  `shape.lip`: how far the brow ledge sticks out. `shape.lip_z`: ledge height. `shape.lip_front`: extra ledge projection at the front. `shape.front_drop`: lowers the whole band at the front.
- `shape.open`: half-angle of the face opening. `shape.eye_gap`: depth of the eye slot under the brow at the opening; `shape.eye_w`: how far round the side it extends.
- `shape.low_h`, `shape.low_back`, `shape.taper`: lower helmet below the brow (height at the sides, extra at the back, inward taper).
- Cheek guards: `shape.cheek_w` (width, degrees around the head), `cheek_len`, `cheek_back_len` (fraction for the back edge), `cheek_tip_u` (tip position, fraction of the width toward the back), `cheek_in` (how far the tip tucks in), `cheek_front` (front edge position as a fraction of the opening half-angle).
- Neck guard: `shape.neck_w` (half width, degrees), `neck_len`, `neck_flare` (0 = straight down, 90 = straight out), `neck_off`.
- Bosses (rivets by the ears): `shape.boss_th` (degrees from the front), `shape.boss_r`.
- Crest: `shape.crest.a0`/`a1` start and end angle along the mid-line (0 = top, negative = front). `len` blade length, `w` blade width, `hold_h` holder band height, `lift` raises the crest,
  `rake` tilts all blades (positive = backward), `curl` tilts the FRONT blades (negative = curl forward), `peak_at` where along the crest the blades are longest (0 = front), `taper` length at the ends relative to the peak, `cap` angled cut of each blade tip, `fill` how much of the arc the blades fill (gaps between them).
- Grammar (style rules): `grammar.dome_u`/`dome_v` facet counts around/up the dome, `band_u`, `shell_u`, `blades` (count), `plate_fold` (centre fold depth of plates), `hem_w`/`hem_h` (bevelled border width/height), `ridge` (crease on each crest blade), `paper_t` (paper thickness), `blade_jitter`.
- `place.yaw/pitch/roll/scale/x/z`: helmet pose. Do not change the camera.
