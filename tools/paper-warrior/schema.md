# Parameter guide: armoured humanoid kit

World units are metres. Z is up. Before `fig.yaw` is applied, the figure faces -Y, toward the camera, and the figure's RIGHT side is at -X, which is image LEFT. Paths use dots, and list indices are numbers, for example `joints.r_elbow.2` (the z of the right elbow) or `skirt.rows.0.len`.

- `cam.*`: dist, height, target_z, focal (mm), tx (horizontal aim). `fig.yaw` turns the whole figure about Z in degrees, and `fig.x` slides it.
- `joints.<name>`: [x,y,z] skeleton points. Names: pelvis, abdomen, chest, neck, head, {r,l}_shoulder, _elbow, _wrist, _hand, {r,l}_hip, _knee, _ankle, _toe. Moving a joint moves the limb and everything attached to it. The shield hangs from l_hand.
- `radii.<joint>`: body thickness at that joint. `body.blobs.N.r` is the torso mass radius (0 chest, 1 abdomen, 2 pelvis), and `body.blobs.N.size` is its [x,y,z] stretch.
- `body.bulge.<a>-<b>`: extra muscle in the middle of a limb segment.
- `helmet.r`: [x,y,z] dome radii. `helmet.off`: offset from the head joint. Also cheek_len, neck_flare, neck_len and peak.
- `crest.*`: the plume of folded blades along the top of the helmet. a0/a1 are the start and end angles in degrees (0 is straight up, positive is toward the back). len is blade length, rake tilts the blades backward, curl bends the tips (negative curls forward), lift raises the plume, taper and peak_at shape the profile, and w is blade width.
- `skirt.*`: two rows of hanging strips. rows.N: z, rx and ry (waist ellipse), len, flare (outward splay), overlap, fold. front_long makes the front and back strips longer. `skirt.off` is an offset from the pelvis.
- `shoulders.rows.N`: strips over each shoulder cap: n, spread (degrees), r, z, len, w, flare, fold.
- `shield.*`: oval scutum hanging from l_hand. off [x,y,z], w, h, curve (bend radius, smaller is more curved), vcurve, squareness, thick, yaw/pitch/roll in degrees.
- `sash.*`: diagonal strap from the right shoulder to the left hip: w, a_off, b_off.
- `light.*`: key_az/key_el (degrees; az 0 is the camera side and +90 is figure-left/image-right), key_size, key_power (W), key_dist, fill_az, fill_power, world_color, world_strength.
- `look.*`: paper_albedo, paper_rough, crumple (facet jitter), bg_albedo [r,g,b] linear, exposure (stops).

Overlay colours in the silhouette image: white is the overlap, BLUE is where the reference has figure and the model does not (grow or move parts there), and RED is where the model has figure and the reference does not (shrink or move parts away).
