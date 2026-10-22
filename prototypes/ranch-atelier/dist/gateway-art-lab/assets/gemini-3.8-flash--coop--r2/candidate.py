import math
import random
import bmesh
import bpy
import mathutils

random.seed(42)

# Material IDs
MAT_RED_WOOD = 0
MAT_CREAM_TRIM = 1
MAT_TEAL_ROOF = 2
MAT_NAT_WOOD = 3
MAT_DARK_IRON = 4
MAT_CONCRETE = 5
MAT_STRAW = 6
MAT_INTERIOR = 7


def create_pbr_material(name, base_color, roughness=0.7, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new(type="ShaderNodeOutputMaterial")
    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    bsdf.location = (0, 0)
    out.location = (300, 0)
    mat.node_tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    if "Base Color" in bsdf.inputs:
        bsdf.inputs["Base Color"].default_value = base_color
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic
    return mat


def add_cuboid(bm, center, size, mat_idx=0, rot=(0.0, 0.0, 0.0)):
    hx, hy, hz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
    coords = [
        (-hx, -hy, -hz),
        (hx, -hy, -hz),
        (hx, hy, -hz),
        (-hx, hy, -hz),
        (-hx, -hy, hz),
        (hx, -hy, hz),
        (hx, hy, hz),
        (-hx, hy, hz),
    ]
    if rot[0] != 0.0 or rot[1] != 0.0 or rot[2] != 0.0:
        euler = mathutils.Euler(rot, "XYZ")
        mat = euler.to_matrix()
        coords = [mat @ mathutils.Vector(c) for c in coords]
    cv = mathutils.Vector(center)
    verts = [bm.verts.new(cv + mathutils.Vector(c)) for c in coords]
    faces_indices = [
        (0, 3, 2, 1),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (2, 3, 7, 6),
        (0, 4, 7, 3),
        (1, 2, 6, 5),
    ]
    created = []
    for fi in faces_indices:
        f = bm.faces.new([verts[i] for i in fi])
        f.material_index = mat_idx
        created.append(f)
    return created


def add_beam(bm, start, end, width, depth, mat_idx=0, up_hint=(0, 0, 1)):
    s = mathutils.Vector(start)
    e = mathutils.Vector(end)
    vec = e - s
    length = vec.length
    if length < 1e-6:
        return []
    dz = vec.normalized()
    up = mathutils.Vector(up_hint).normalized()
    if abs(dz.dot(up)) > 0.98:
        up = mathutils.Vector((0, 1, 0))
    dx = dz.cross(up).normalized()
    dy = dx.cross(dz).normalized()

    center = (s + e) * 0.5
    hx, hy, hz = width * 0.5, depth * 0.5, length * 0.5
    offsets = [
        (-hx, -hy, -hz),
        (hx, -hy, -hz),
        (hx, hy, -hz),
        (-hx, hy, -hz),
        (-hx, -hy, hz),
        (hx, -hy, hz),
        (hx, hy, hz),
        (-hx, hy, hz),
    ]
    verts = [
        bm.verts.new(center + dx * off[0] + dy * off[1] + dz * off[2])
        for off in offsets
    ]
    faces_indices = [
        (0, 3, 2, 1),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (2, 3, 7, 6),
        (0, 4, 7, 3),
        (1, 2, 6, 5),
    ]
    created = []
    for fi in faces_indices:
        f = bm.faces.new([verts[i] for i in fi])
        f.material_index = mat_idx
        created.append(f)
    return created


def add_pier(bm, cx, cy, z_base=0.0, z_top=0.08, w_b=0.22, w_t=0.16):
    b = w_b * 0.5
    t = w_t * 0.5
    coords = [
        (-b, -b, z_base),
        (b, -b, z_base),
        (b, b, z_base),
        (-b, b, z_base),
        (-t, -t, z_top),
        (t, -t, z_top),
        (t, t, z_top),
        (-t, t, z_top),
    ]
    cv = mathutils.Vector((cx, cy, 0.0))
    verts = [bm.verts.new(cv + mathutils.Vector(c)) for c in coords]
    for fi in [
        (0, 3, 2, 1),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    ]:
        f = bm.faces.new([verts[i] for i in fi])
        f.material_index = MAT_CONCRETE


def build():
    m_red = create_pbr_material(
        "Mat_RedSiding", (0.52, 0.17, 0.12, 1.0), roughness=0.76
    )
    m_cream = create_pbr_material(
        "Mat_CreamTrim", (0.86, 0.83, 0.74, 1.0), roughness=0.62
    )
    m_teal = create_pbr_material(
        "Mat_TealRoof", (0.13, 0.38, 0.40, 1.0), roughness=0.45, metallic=0.1
    )
    m_wood = create_pbr_material(
        "Mat_NaturalWood", (0.56, 0.39, 0.24, 1.0), roughness=0.82
    )
    m_iron = create_pbr_material(
        "Mat_IronHdw", (0.12, 0.12, 0.13, 1.0), roughness=0.35, metallic=0.88
    )
    m_conc = create_pbr_material(
        "Mat_ConcretePier", (0.60, 0.58, 0.54, 1.0), roughness=0.9
    )
    m_straw = create_pbr_material(
        "Mat_HayStraw", (0.80, 0.65, 0.28, 1.0), roughness=0.85
    )
    m_dark = create_pbr_material(
        "Mat_InteriorVoid", (0.05, 0.04, 0.04, 1.0), roughness=0.95
    )

    bm = bmesh.new()

    # --- 1. FOUNDATION & POSTS ---
    # Coop body footprint: X in [-0.85, 0.85] (1.7m wide), Y in [-0.75, 0.75] (1.5m deep)
    # Total width with nest box = 2.25m, total depth with ramp = 2.2m. Height to ridge = 2.45m.
    posts = [
        (-0.75, -0.65),
        (0.75, -0.65),
        (-0.75, 0.65),
        (0.75, 0.65),
        (0.0, -0.65),
        (0.0, 0.65),
    ]
    z_pier = 0.08
    z_floor = 0.42

    for px, py in posts:
        add_pier(bm, px, py, 0.0, z_pier)
        add_beam(
            bm,
            (px, py, z_pier),
            (px, py, z_floor),
            0.10,
            0.10,
            mat_idx=MAT_NAT_WOOD,
        )

    # Floor Joists / Perimeter Skirt
    add_cuboid(
        bm,
        (0, -0.65, (z_pier + z_floor) * 0.5),
        (1.56, 0.08, z_floor - z_pier),
        MAT_NAT_WOOD,
    )
    add_cuboid(
        bm,
        (0, 0.65, (z_pier + z_floor) * 0.5),
        (1.56, 0.08, z_floor - z_pier),
        MAT_NAT_WOOD,
    )
    add_cuboid(
        bm,
        (-0.75, 0, (z_pier + z_floor) * 0.5),
        (0.08, 1.30, z_floor - z_pier),
        MAT_NAT_WOOD,
    )
    add_cuboid(
        bm,
        (0.75, 0, (z_pier + z_floor) * 0.5),
        (0.08, 1.30, z_floor - z_pier),
        MAT_NAT_WOOD,
    )

    # Solid Subfloor & Floor Planks
    add_cuboid(bm, (0, 0, z_floor + 0.02), (1.70, 1.50, 0.04), MAT_NAT_WOOD)

    # --- 2. MAIN COOP BODY WALLS ---
    # Wall height from floor (z=0.44) up to eave plate (z=1.65). Gable rises to z=2.35 at X=0.
    # Front Wall (Y = -0.75): Chicken entry is located at X in [-0.55, -0.20], Z in [0.44, 0.88]
    # Real physical hollow entry through front wall:
    z_wall_b = 0.44
    z_wall_t = 1.65
    door_x_min, door_x_max = -0.55, -0.20
    door_z_t = 0.88

    # Front wall Left segment (X < door_x_min)
    w_left = door_x_min - (-0.85)
    cx_left = -0.85 + w_left * 0.5
    add_cuboid(
        bm,
        (cx_left, -0.73, (z_wall_b + z_wall_t) * 0.5),
        (w_left, 0.04, z_wall_t - z_wall_b),
        MAT_RED_WOOD,
    )

    # Front wall Right segment (X > door_x_max)
    w_right = 0.85 - door_x_max
    cx_right = door_x_max + w_right * 0.5
    add_cuboid(
        bm,
        (cx_right, -0.73, (z_wall_b + z_wall_t) * 0.5),
        (w_right, 0.04, z_wall_t - z_wall_b),
        MAT_RED_WOOD,
    )

    # Front wall Header above chicken door
    w_door = door_x_max - door_x_min
    cx_door = (door_x_min + door_x_max) * 0.5
    h_header = z_wall_t - door_z_t
    cz_header = door_z_t + h_header * 0.5
    add_cuboid(
        bm, (cx_door, -0.73, cz_header), (w_door, 0.04, h_header), MAT_RED_WOOD
    )

    # Door Frame Trim (Cream) around opening
    add_beam(
        bm,
        (door_x_min - 0.02, -0.74, z_wall_b),
        (door_x_min - 0.02, -0.74, door_z_t + 0.04),
        0.05,
        0.04,
        MAT_CREAM_TRIM,
    )
    add_beam(
        bm,
        (door_x_max + 0.02, -0.74, z_wall_b),
        (door_x_max + 0.02, -0.74, door_z_t + 0.04),
        0.05,
        0.04,
        MAT_CREAM_TRIM,
    )
    add_beam(
        bm,
        (door_x_min - 0.04, -0.74, door_z_t + 0.02),
        (door_x_max + 0.04, -0.74, door_z_t + 0.02),
        0.05,
        0.04,
        MAT_CREAM_TRIM,
        up_hint=(1, 0, 0),
    )

    # Sliding pop-hole hatch above opening (held open by timber slide rails)
    add_beam(
        bm,
        (door_x_min - 0.03, -0.755, door_z_t),
        (door_x_min - 0.03, -0.755, door_z_t + 0.45),
        0.025,
        0.03,
        MAT_NAT_WOOD,
    )
    add_beam(
        bm,
        (door_x_max + 0.03, -0.755, door_z_t),
        (door_x_max + 0.03, -0.755, door_z_t + 0.45),
        0.025,
        0.03,
        MAT_NAT_WOOD,
    )
    add_cuboid(
        bm,
        (cx_door, -0.75, door_z_t + 0.22),
        (w_door + 0.03, 0.02, 0.40),
        MAT_CREAM_TRIM,
    )

    # Front Wall Ranch Window / Shaded Ventilation (Slatted Louver at X: 0.15 to 0.65, Z: 0.95 to 1.45)
    add_cuboid(bm, (0.40, -0.74, 1.20), (0.54, 0.03, 0.54), MAT_CREAM_TRIM)
    add_cuboid(bm, (0.40, -0.73, 1.20), (0.44, 0.035, 0.44), MAT_INTERIOR)
    for l_idx in range(4):
        lz = 1.05 + l_idx * 0.10
        add_cuboid(
            bm,
            (0.40, -0.75, lz),
            (0.42, 0.02, 0.06),
            MAT_CREAM_TRIM,
            rot=(math.radians(20), 0, 0),
        )
    # Window decorative awning hood
    add_cuboid(
        bm,
        (0.40, -0.79, 1.50),
        (0.60, 0.14, 0.03),
        MAT_TEAL_ROOF,
        rot=(math.radians(-25), 0, 0),
    )

    # Back Wall (Y = +0.75) with Human Cleaning/Access Door
    add_cuboid(
        bm,
        (0, 0.73, (z_wall_b + z_wall_t) * 0.5),
        (1.70, 0.04, z_wall_t - z_wall_b),
        MAT_RED_WOOD,
    )
    # Access door framing & panel
    add_cuboid(
        bm,
        (0.0, 0.745, (z_wall_b + z_wall_t) * 0.5 - 0.02),
        (0.66, 0.02, z_wall_t - z_wall_b - 0.08),
        MAT_CREAM_TRIM,
    )
    add_cuboid(
        bm,
        (0.0, 0.755, (z_wall_b + z_wall_t) * 0.5 - 0.02),
        (0.58, 0.02, z_wall_t - z_wall_b - 0.16),
        MAT_RED_WOOD,
    )
    # Z-brace on human access door
    add_beam(
        bm,
        (-0.25, 0.77, z_wall_b + 0.06),
        (0.25, 0.77, z_wall_b + 0.06),
        0.05,
        0.02,
        MAT_CREAM_TRIM,
        up_hint=(0, 0, 1),
    )
    add_beam(
        bm,
        (-0.25, 0.77, z_wall_t - 0.14),
        (0.25, 0.77, z_wall_t - 0.14),
        0.05,
        0.02,
        MAT_CREAM_TRIM,
        up_hint=(0, 0, 1),
    )
    add_beam(
        bm,
        (-0.24, 0.77, z_wall_b + 0.08),
        (0.24, 0.77, z_wall_t - 0.16),
        0.04,
        0.02,
        MAT_CREAM_TRIM,
        up_hint=(0, 1, 0),
    )
    # Heavy iron strap hinges & latch
    add_cuboid(bm, (-0.28, 0.77, z_wall_b + 0.25), (0.16, 0.025, 0.04), MAT_DARK_IRON)
    add_cuboid(bm, (-0.28, 0.77, z_wall_t - 0.35), (0.16, 0.025, 0.04), MAT_DARK_IRON)
    add_cuboid(bm, (0.24, 0.77, 1.05), (0.04, 0.03, 0.12), MAT_DARK_IRON)

    # Left Wall (X = -0.85)
    add_cuboid(
        bm,
        (-0.83, 0, (z_wall_b + z_wall_t) * 0.5),
        (0.04, 1.46, z_wall_t - z_wall_b),
        MAT_RED_WOOD,
    )

    # Right Wall (X = +0.85) has Nesting Box opening
    # Wall around nesting opening (opening X: +0.85, Y: [-0.45, 0.45], Z: [0.55, 1.05])
    add_cuboid(bm, (0.83, -0.58, 1.045), (0.04, 0.30, 1.21), MAT_RED_WOOD)
    add_cuboid(bm, (0.83, 0.58, 1.045), (0.04, 0.30, 1.21), MAT_RED_WOOD)
    add_cuboid(bm, (0.83, 0.0, 1.35), (0.04, 0.90, 0.60), MAT_RED_WOOD)
    add_cuboid(bm, (0.83, 0.0, 0.495), (0.04, 0.90, 0.11), MAT_RED_WOOD)

    # --- 3. EXTERNAL NESTING BOX (Cantilevered with diagonal timber knee-braces) ---
    # Box body at X: +0.85 to +1.28 (0.43m projection), Y: [-0.48, +0.48]
    add_cuboid(bm, (1.065, 0.0, 0.54), (0.43, 0.96, 0.04), MAT_NAT_WOOD)  # floor
    add_cuboid(bm, (1.27, 0.0, 0.78), (0.04, 0.96, 0.46), MAT_RED_WOOD)  # outer wall
    add_cuboid(bm, (1.065, -0.47, 0.78), (0.41, 0.04, 0.46), MAT_RED_WOOD)  # side 1
    add_cuboid(bm, (1.065, 0.47, 0.78), (0.41, 0.04, 0.46), MAT_RED_WOOD)  # side 2
    add_cuboid(
        bm, (1.065, 0.0, 0.78), (0.39, 0.03, 0.44), MAT_NAT_WOOD
    )  # internal divider
    # Straw in compartments
    add_cuboid(bm, (1.05, -0.23, 0.58), (0.32, 0.40, 0.05), MAT_STRAW)
    add_cuboid(bm, (1.05, 0.23, 0.58), (0.32, 0.40, 0.05), MAT_STRAW)
    # Sloped Teal Nesting Lid
    add_cuboid(
        bm,
        (1.08, 0.0, 1.05),
        (0.50, 1.04, 0.04),
        MAT_TEAL_ROOF,
        rot=(0, math.radians(22), 0),
    )
    # Iron hinges on nesting box lid
    add_cuboid(bm, (0.88, -0.32, 1.13), (0.08, 0.04, 0.02), MAT_DARK_IRON)
    add_cuboid(bm, (0.88, 0.32, 1.13), (0.08, 0.04, 0.02), MAT_DARK_IRON)
    # Diagonal timber support struts under nest box
    add_beam(
        bm, (0.85, -0.35, 0.20), (1.22, -0.35, 0.52), 0.06, 0.06, MAT_NAT_WOOD
    )
    add_beam(
        bm, (0.85, 0.35, 0.20), (1.22, 0.35, 0.52), 0.06, 0.06, MAT_NAT_WOOD
    )

    # --- 4. GABLES & PITCHED ROOF WITH OVERHANGS ---
    # Ridge runs along Y axis from Y = -0.92 to +0.92 at X = 0, Z = 2.42
    # Eaves extend to X = +-1.08 at Z = 1.62.
    # Front and Rear Gables:
    for gy in [-0.73, 0.73]:
        # Triangular gable infill constructed as stacked timber slats
        for step in range(8):
            gz = 1.65 + step * 0.085
            gw = 1.70 * (1.0 - (step + 0.5) / 8.0)
            add_cuboid(bm, (0, gy, gz), (gw, 0.04, 0.08), MAT_RED_WOOD)

    # Front Gable Diamond Louver Vent
    add_cuboid(
        bm,
        (0.0, -0.75, 2.02),
        (0.24, 0.03, 0.24),
        MAT_CREAM_TRIM,
        rot=(0, 0, math.radians(45)),
    )
    add_cuboid(
        bm,
        (0.0, -0.74, 2.02),
        (0.18, 0.035, 0.18),
        MAT_INTERIOR,
        rot=(0, 0, math.radians(45)),
    )

    # Main Pitched Roof: Left and Right Slopes
    # Slope angle ~ 36.5 deg
    slope_angle = math.atan2(2.42 - 1.62, 1.08)  # ~ 0.637 rad (36.5 deg)
    slope_len = math.sqrt(1.08**2 + 0.80**2) + 0.06  # ~ 1.40m
    roof_y_len = 1.90  # covers -0.95 to +0.95 (generous front and back overhangs)

    # Left roof plane
    cx_l = -0.54
    cz_l = (2.42 + 1.62) * 0.5
    add_cuboid(
        bm,
        (cx_l, 0, cz_l),
        (slope_len, roof_y_len, 0.06),
        MAT_TEAL_ROOF,
        rot=(0, slope_angle, 0),
    )

    # Right roof plane
    cx_r = 0.54
    cz_r = cz_l
    add_cuboid(
        bm,
        (cx_r, 0, cz_r),
        (slope_len, roof_y_len, 0.06),
        MAT_TEAL_ROOF,
        rot=(0, -slope_angle, 0),
    )

    # Ridge Cap (Teal)
    add_cuboid(bm, (0, 0, 2.45), (0.16, 1.94, 0.04), MAT_TEAL_ROOF)

    # Decorative Bargeboards / Fascia (Cream trim along front and back gable rafters)
    for gy in [-0.94, 0.94]:
        add_cuboid(
            bm,
            (cx_l, gy, cz_l),
            (slope_len + 0.04, 0.04, 0.09),
            MAT_CREAM_TRIM,
            rot=(0, slope_angle, 0),
        )
        add_cuboid(
            bm,
            (cx_r, gy, cz_r),
            (slope_len + 0.04, 0.04, 0.09),
            MAT_CREAM_TRIM,
            rot=(0, -slope_angle, 0),
        )
        # Ridge apex finial bracket
        add_cuboid(bm, (0, gy - 0.01 * (1 if gy < 0 else -1), 2.38), (0.12, 0.05, 0.16), MAT_CREAM_TRIM)

    # Corner Posts / Vertical Trims (Cream)
    corner_coords = [(-0.85, -0.73), (0.85, -0.73), (-0.85, 0.73), (0.85, 0.73)]
    for cx, cy in corner_coords:
        add_cuboid(
            bm,
            (cx, cy, (z_wall_b + z_wall_t) * 0.5),
            (0.08, 0.08, z_wall_t - z_wall_b + 0.02),
            MAT_CREAM_TRIM,
        )

    # --- 5. CHICKEN ENTRY INTERIOR & GROUNDED SLATTED RAMP ---
    # Dark shadow box inside doorway to give real depth and no solid wall look
    door_center_x = (door_x_min + door_x_max) * 0.5
    add_cuboid(
        bm,
        (door_center_x, -0.45, (z_floor + door_z_t) * 0.5),
        (w_door + 0.02, 0.50, door_z_t - z_floor),
        MAT_INTERIOR,
    )
    # Straw bedding visible right inside opening
    add_cuboid(
        bm, (door_center_x, -0.55, z_floor + 0.03), (w_door - 0.04, 0.30, 0.03), MAT_STRAW
    )

    # Ramp: connects from door threshold (Y = -0.73, Z = 0.44) down to ground (Y = -1.65, Z = 0.0)
    # Real plausible chicken slope ~ 25 degrees, cleated for traction
    ramp_start = mathutils.Vector((door_center_x, -0.73, 0.44))
    ramp_end = mathutils.Vector((door_center_x, -1.65, 0.02))
    ramp_vec = ramp_end - ramp_start
    ramp_len = ramp_vec.length
    ramp_dir = ramp_vec.normalized()
    ramp_pitch = math.atan2(ramp_vec.z, math.sqrt(ramp_vec.x**2 + ramp_vec.y**2))

    # Ramp Main Planks (Natural Wood)
    ramp_mid = (ramp_start + ramp_end) * 0.5
    add_cuboid(
        bm,
        ramp_mid,
        (0.32, ramp_len, 0.035),
        MAT_NAT_WOOD,
        rot=(-ramp_pitch, 0, 0),
    )

    # Transverse anti-slip slats / cleats (every 11cm along ramp)
    num_cleats = 8
    for i in range(1, num_cleats + 1):
        t = i / (num_cleats + 1)
        pt = ramp_start.lerp(ramp_end, t)
        # slight elevation above plank surface
        n_up = mathutils.Vector((0, math.sin(ramp_pitch), math.cos(ramp_pitch)))
        c_pos = pt + n_up * 0.025
        add_cuboid(
            bm,
            c_pos,
            (0.30, 0.03, 0.02),
            MAT_CREAM_TRIM,
            rot=(-ramp_pitch, 0, 0),
        )

    # Ramp Ground Support Timber Block
    add_cuboid(
        bm,
        (door_center_x, -1.60, 0.025),
        (0.36, 0.08, 0.05),
        MAT_NAT_WOOD,
    )

    # Ramp Upper Mounting Hinge Brackets
    add_cuboid(
        bm,
        (door_center_x - 0.10, -0.74, 0.45),
        (0.04, 0.05, 0.02),
        MAT_DARK_IRON,
    )
    add_cuboid(
        bm,
        (door_center_x + 0.10, -0.74, 0.45),
        (0.04, 0.05, 0.02),
        MAT_DARK_IRON,
    )

    # --- 6. WEATHERVANE ACCENT (Rooster silhouette atop roof ridge) ---
    add_cuboid(bm, (0.0, 0.0, 2.52), (0.02, 0.02, 0.14), MAT_DARK_IRON)
    add_cuboid(bm, (0.0, 0.0, 2.57), (0.24, 0.015, 0.015), MAT_DARK_IRON)
    add_cuboid(bm, (0.0, 0.0, 2.57), (0.015, 0.24, 0.015), MAT_DARK_IRON)
    # Stylized rooster atop rod
    add_cuboid(bm, (0.0, 0.0, 2.65), (0.015, 0.14, 0.10), MAT_DARK_IRON)
    add_cuboid(bm, (0.0, -0.07, 2.68), (0.015, 0.05, 0.08), MAT_DARK_IRON)  # head/comb
    add_cuboid(bm, (0.0, 0.08, 2.69), (0.015, 0.08, 0.12), MAT_DARK_IRON)  # tail

    # Create mesh & object
    mesh = bpy.data.meshes.new("RanchChickenCoop")
    bm.to_mesh(mesh)
    bm.free()

    for m in [
        m_red,
        m_cream,
        m_teal,
        m_wood,
        m_iron,
        m_conc,
        m_straw,
        m_dark,
    ]:
        mesh.materials.append(m)

    obj = bpy.data.objects.new("RanchChickenCoop", mesh)
    bpy.context.scene.collection.objects.link(obj)

    return {
        "notes": "Authentic ranch chicken coop with stilted pier foundation, open chicken portal, cleated wooden entry ramp, external nesting box, slatted ventilation, and teal pitched roof."
    }