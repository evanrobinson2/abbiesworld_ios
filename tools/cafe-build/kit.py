"""The café modelling kit (AW-STUDY-0013): real-world materials, physics and low-poly part builders.

Evan, 2026-10-23 08:02Z: "everything low poly ... build the whole damn thing ... the game would work from iso, and
1st person, so everything should be hero level. and i want normal and bump mappings and materials, density, mass,
etc. model this please as if it were going into real life (within reason)".

So every part here is
- built at real size in metres (Z up, front faces -Y, origin on the ground at the footprint centre),
- faceted low poly (flat shaded; the facets are the style), with a tiled normal map from textures/ for the
  surface relief a real one has (wood grain, brushed steel, canvas weave, orange-peel paint),
- given a real material: colour, roughness, metalness, and a density and how the part is made (a solid block,
  or a shell of a given wall thickness, like a pressed-steel case or a glazed cup),
- weighed: mass from its closed volume (solid) or its area times wall thickness (shell), written with its centre of
  mass, friction and bounce into the glTF extras so the game's physics can use them,
- named by what it is, and when it moves, given a joint (hinge, slide, button, knob, lift-off) with axis and limits.

Material names start with the game's shading role (see tools/ranch-rebuild/MODELER.md), e.g. Metal_Chrome,
Clay_PinkGlaze, Plank_Honey, Cloth_Tangerine.
"""
import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'textures')

# ---------------------------------------------------------------- materials
# name: colour (sRGB hex), roughness, metallic, normal map, normal strength, metres per texture tile,
# density kg/m3, make ('solid' or 'shell'), wall thickness m, friction, restitution, what it is in real life.
# Optional: emit (hex, strength), glass (transmission), alpha.
M = {}
def mat(name, col, rough, metal=0.0, nmap='paint', nstr=0.4, tile=0.5, density=1000, make='solid', wall=0.0,
        friction=0.5, bounce=0.2, real='', emit=None, glass=0.0, alpha=1.0):
    M[name] = dict(col=col, rough=rough, metal=metal, nmap=nmap, nstr=nstr, tile=tile, density=density, make=make,
                   wall=wall, friction=friction, bounce=bounce, real=real, emit=emit, glass=glass, alpha=alpha)

# Architecture
mat('Plank_Honey', '#c9864a', 0.55, nmap='wood', nstr=0.6, tile=1.2, density=700, real='oak floorboards, 22 mm, satin lacquer', friction=0.55)
mat('Plank_Dark', '#8a4f2c', 0.55, nmap='wood', nstr=0.6, tile=1.2, density=700, real='stained oak deck boards', friction=0.55)
mat('Timber_Trim', '#d99a5b', 0.5, nmap='wood', nstr=0.5, tile=0.8, density=650, real='beech trim, lacquered')
mat('Plank_PinkPanel', '#e0679c', 0.6, nmap='wood', nstr=0.4, tile=1.0, density=600, real='painted tongue-and-groove pine')
mat('Plaster_Purple', '#7a2d8c', 0.85, nmap='paint', nstr=0.35, tile=1.0, density=1200, real='skimmed plaster on board, matt emulsion')
mat('Plaster_Magenta', '#b3246f', 0.85, nmap='paint', nstr=0.35, tile=1.0, density=1200, real='painted ceiling board')
mat('Plaster_Teal', '#1d8d93', 0.8, nmap='paint', nstr=0.35, tile=1.0, density=1200, real='painted soffit board')
mat('Plaster_Tangerine', '#f07c2b', 0.6, nmap='paint', nstr=0.35, tile=0.8, density=700, real='painted MDF frame, gloss')
mat('Plaster_Sun', '#ffcf3a', 0.6, nmap='paint', nstr=0.3, tile=0.8, density=700, real='painted MDF cut-out')
mat('Plaster_Pink', '#f05fa6', 0.6, nmap='paint', nstr=0.3, tile=0.8, density=700, real='painted MDF')
mat('Plaster_Cream', '#ffe9d6', 0.85, nmap='paint', nstr=0.3, tile=1.0, density=1200, real='painted plaster')
mat('Timber_DoorDark', '#3a1a36', 0.5, nmap='wood', nstr=0.5, tile=1.0, density=650, real='solid-core door, aubergine gloss')
mat('Glass_Window', '#bfe9ff', 0.05, glass=1.0, nmap='mirror', nstr=0.1, density=2500, make='shell', wall=0.006, real='6 mm float glass')
mat('Glass_Porthole', '#7fe8ff', 0.1, glass=0.8, nmap='mirror', nstr=0.1, density=2500, make='shell', wall=0.005, real='tinted glass porthole', emit=('#3ad7ff', 0.6))
mat('Metal_Brass', '#d8a74a', 0.3, 1.0, nmap='brushed', nstr=0.3, tile=0.3, density=8500, real='brass rail and fittings')
mat('Metal_Chrome', '#e6e8ee', 0.12, 1.0, nmap='brushed', nstr=0.2, tile=0.2, density=7900, make='shell', wall=0.0012, real='polished stainless 304, 1.2 mm', friction=0.4)
mat('Metal_ChromeBrass', '#e6e8ee', 0.12, 1.0, nmap='brushed', nstr=0.2, tile=0.2, density=8500, real='chrome-plated cast brass (E61-style group, about 4 kg)')
mat('Metal_Steel', '#a7adb6', 0.35, 1.0, nmap='brushed', nstr=0.4, tile=0.2, density=7900, real='brushed stainless 304', friction=0.45)
mat('Metal_Copper', '#c86b3c', 0.3, 1.0, nmap='brushed', nstr=0.3, tile=0.2, density=8960, make='shell', wall=0.0015, real='copper boiler, 1.5 mm')
mat('Metal_Dark', '#2a2630', 0.45, 0.8, nmap='brushed', nstr=0.3, tile=0.3, density=7850, real='black powder-coated steel')
mat('Metal_Aluminium', '#c9ccd2', 0.35, 1.0, nmap='brushed', nstr=0.3, tile=0.2, density=2700, real='anodised aluminium')
mat('Light_Warm', '#ffe2b0', 0.4, emit=('#ffd08a', 6.0), nmap='mirror', nstr=0.0, density=2500, make='shell', wall=0.001, real='LED downlight diffuser')
mat('Light_Bulb', '#fff1c9', 0.2, emit=('#ffcf7a', 8.0), nmap='mirror', nstr=0.0, density=2500, make='shell', wall=0.0008, real='marquee bulb, warm 2200 K')
# Neon (LED flex neon in silicone: lighter and safer than glass)
mat('Glass_NeonPink', '#ff6ec4', 0.3, emit=('#ff3fa4', 8.0), nmap='mirror', nstr=0.0, density=1150, real='LED neon flex in pink silicone')
mat('Glass_NeonCyan', '#8ff6ff', 0.3, emit=('#19e3f0', 8.0), nmap='mirror', nstr=0.0, density=1150, real='LED neon flex in cyan silicone')
mat('Glass_NeonWarm', '#fff3c4', 0.3, emit=('#ffe08a', 7.0), nmap='mirror', nstr=0.0, density=1150, real='LED neon flex, warm white')
mat('Glass_NeonTeal', '#7ff3e6', 0.3, emit=('#19c7cf', 5.0), nmap='mirror', nstr=0.0, density=1150, real='LED cove strip in diffuser')
mat('Glass_LedTile', '#f3a1a8', 0.25, emit=('#ff8fb0', 1.2), nmap='leddots', nstr=0.7, tile=0.6, density=1190, make='shell', wall=0.012, real='LED dance tile: 12 mm frosted acrylic over an LED matrix', friction=0.45)
mat('Glass_LedTileViolet', '#9b5cff', 0.25, emit=('#8a4dff', 1.2), nmap='leddots', nstr=0.7, tile=0.6, density=1190, make='shell', wall=0.012, real='LED dance tile, violet', friction=0.45)
mat('Glass_Mirror', '#f2f4ff', 0.05, 1.0, nmap='mirror', nstr=0.1, density=2500, make='shell', wall=0.003, real='3 mm mirror tiles on a polystyrene ball')
# Fabric and soft goods
mat('Cloth_Tangerine', '#ff7a1f', 0.95, nmap='weave', nstr=0.7, tile=0.25, density=30, real='cotton-canvas beanbag filled with EPS beads (about 30 kg/m3 filled)', friction=0.8, bounce=0.05)
mat('Cloth_Lime', '#a6dd2c', 0.95, nmap='weave', nstr=0.7, tile=0.25, density=30, real='canvas beanbag, EPS beads', friction=0.8, bounce=0.05)
mat('Cloth_Magenta', '#e0248a', 0.95, nmap='weave', nstr=0.7, tile=0.25, density=30, real='canvas beanbag, EPS beads', friction=0.8, bounce=0.05)
mat('Cloth_Rug', '#d22f8f', 1.0, nmap='carpet', nstr=0.8, tile=0.4, density=400, real='tufted wool rug, 12 mm pile', friction=0.9, bounce=0.0)
mat('Cloth_RugSun', '#ffd03c', 1.0, nmap='carpet', nstr=0.8, tile=0.4, density=400, real='tufted wool inlay')
mat('Cloth_Confetti', '#ff8fc6', 1.0, nmap='carpet', nstr=0.8, tile=0.4, density=400, real='printed nylon carpet tile', friction=0.9)
mat('Cloth_Plush', '#fff4fb', 1.0, nmap='carpet', nstr=0.9, tile=0.15, density=60, real='minky plush with fibre fill', friction=0.9, bounce=0.1)
mat('Cloth_SeatTeal', '#1fc2c4', 0.7, nmap='weave', nstr=0.5, tile=0.2, density=80, real='vinyl over foam seat pad', friction=0.7)
mat('Cloth_Speaker', '#231c28', 1.0, nmap='weave', nstr=0.9, tile=0.12, density=200, make='shell', wall=0.002, real='acoustic grille cloth')
# Ceramics, glass, plastics, food
mat('Clay_PinkGlaze', '#f27db3', 0.25, nmap='ceramic', nstr=0.2, tile=0.6, density=2000, make='shell', wall=0.015, real='glazed GRC (glass-fibre reinforced concrete) shell, 15 mm, on a steel frame', friction=0.4)
mat('Plank_BlackPly', '#231c28', 0.6, nmap='wood', nstr=0.3, tile=0.6, density=680, make='shell', wall=0.018, real='18 mm birch ply, black textured paint')
mat('Clay_CupTeal', '#36c9c2', 0.2, nmap='ceramic', nstr=0.2, tile=0.2, density=2400, make='shell', wall=0.005, real='glazed porcelain cup')
mat('Clay_CupLime', '#b6e43a', 0.2, nmap='ceramic', nstr=0.2, tile=0.2, density=2400, make='shell', wall=0.005, real='glazed porcelain cup')
mat('Clay_CupOrange', '#ff9a3c', 0.2, nmap='ceramic', nstr=0.2, tile=0.2, density=2400, make='shell', wall=0.005, real='glazed porcelain cup')
mat('Glass_Clear', '#e8fbff', 0.03, glass=1.0, nmap='mirror', nstr=0.05, density=2500, make='shell', wall=0.004, real='soda-lime glass, 4 mm')
mat('Glass_Pink', '#ffb3d6', 0.05, glass=0.85, nmap='mirror', nstr=0.05, density=1180, make='shell', wall=0.006, real='cast pink acrylic sundae glass, 6 mm')
mat('Glass_Tritan', '#eefcff', 0.05, glass=1.0, nmap='mirror', nstr=0.05, density=1180, make='shell', wall=0.004, real='Tritan copolyester blender jar, 4 mm')
mat('Glass_Tank', '#cdeffa', 0.1, glass=0.7, nmap='mirror', nstr=0.05, density=1190, make='shell', wall=0.003, real='clear acrylic water tank')
mat('Glass_Gauge', '#ffffff', 0.02, glass=1.0, nmap='mirror', nstr=0.0, density=2500, make='shell', wall=0.002, real='gauge lens glass')
mat('Glass_Crt', '#1b3b22', 0.08, emit=('#3dff7a', 1.6), nmap='mirror', nstr=0.05, density=2900, make='shell', wall=0.01, real='CRT faceplate, green P1 phosphor (glass about 10 mm)')
mat('Plastic_Pink', '#f26aae', 0.45, nmap='paint', nstr=0.3, tile=0.3, density=1050, make='shell', wall=0.003, real='ABS moulding, 3 mm')
mat('Plastic_Violet', '#9b5cff', 0.45, nmap='paint', nstr=0.3, tile=0.3, density=1050, make='shell', wall=0.003, real='ABS moulding')
mat('Plastic_Lime', '#b6e43a', 0.45, nmap='paint', nstr=0.3, tile=0.3, density=1050, real='ABS button')
mat('Plastic_Teal', '#22c9c4', 0.45, nmap='paint', nstr=0.3, tile=0.3, density=1050, real='ABS button')
mat('Plastic_Orange', '#ff8a2b', 0.45, nmap='paint', nstr=0.3, tile=0.3, density=1050, real='ABS knob')
mat('Plastic_Beige', '#d9cdb0', 0.6, nmap='stipple', nstr=0.6, tile=0.15, density=1050, make='shell', wall=0.0025, real='1980s textured ABS, aged beige')
mat('Plastic_BeigeKey', '#e8dfc8', 0.5, nmap='stipple', nstr=0.4, tile=0.05, density=1050, real='PBT keycap')
mat('Plastic_GreyKey', '#9a978f', 0.5, nmap='stipple', nstr=0.4, tile=0.05, density=1050, real='PBT modifier keycap')
mat('Plastic_Black', '#1d1a22', 0.4, nmap='stipple', nstr=0.3, tile=0.1, density=1050, real='black ABS')
mat('Rubber_Black', '#141216', 0.9, nmap='rubber', nstr=0.6, tile=0.05, density=1200, friction=1.0, bounce=0.6, real='EPDM rubber foot')
mat('Metal_PinkEnamel', '#f47ab8', 0.35, 0.0, nmap='paint', nstr=0.25, tile=0.3, density=7850, make='shell', wall=0.0012, real='powder-coated steel sheet, 1.2 mm')
mat('Metal_TealEnamel', '#2cc8bf', 0.35, 0.0, nmap='paint', nstr=0.25, tile=0.3, density=7850, make='shell', wall=0.0015, real='powder-coated steel plinth')
mat('Metal_OrangeEnamel', '#ff9a3c', 0.35, 0.0, nmap='paint', nstr=0.25, tile=0.3, density=7850, make='shell', wall=0.0015, real='powder-coated steel')
mat('Metal_PlumEnamel', '#7a2d6b', 0.35, 0.3, nmap='paint', nstr=0.25, tile=0.3, density=7850, real='powder-coated steel tube')
mat('Plank_Counter', '#b5582d', 0.5, nmap='wood', nstr=0.5, tile=0.8, density=700, real='lacquered plywood carcass')
mat('Stone_MintTop', '#bff5e4', 0.3, nmap='ceramic', nstr=0.2, tile=0.8, density=2000, real='solid-surface (acrylic stone) worktop, 20 mm')
mat('Plank_TealFront', '#22b8b8', 0.45, nmap='paint', nstr=0.3, tile=0.8, density=750, real='gloss-painted MDF bar front')
mat('Stone_Slate', '#2b3433', 0.85, nmap='slate', nstr=0.6, tile=0.6, density=2700, make='shell', wall=0.008, real='slate chalkboard, 8 mm')
mat('Food_Cream', '#ffe4ef', 0.7, nmap='ceramic', nstr=0.3, tile=0.2, density=500, real='whipped cream (about 0.5 g/ml)')
mat('Food_CreamPink', '#ffb7d5', 0.7, nmap='ceramic', nstr=0.3, tile=0.2, density=500, real='strawberry whipped cream')
mat('Food_Cherry', '#d0103a', 0.2, nmap='ceramic', nstr=0.1, tile=0.1, density=1050, real='glacé cherry')
mat('Food_Wafer', '#e9b46a', 0.8, nmap='knurl', nstr=0.6, tile=0.05, density=300, real='wafer cone')
mat('Food_Smoothie', '#ff5e8a', 0.5, nmap='ceramic', nstr=0.2, tile=0.2, density=1050, real='strawberry smoothie')
mat('Food_Shake', '#ffc1dc', 0.6, nmap='ceramic', nstr=0.2, tile=0.2, density=1030, real='milkshake')
mat('Food_Beans', '#4a2a17', 0.6, nmap='knurl', nstr=0.8, tile=0.03, density=400, real='roasted coffee beans (bulk density about 0.4)')
mat('Food_Pastry', '#e8a252', 0.75, nmap='paper', nstr=0.5, tile=0.1, density=300, real='croissant / pastry')
mat('Food_Icing', '#ff8ac2', 0.4, nmap='ceramic', nstr=0.2, tile=0.1, density=900, real='donut icing')
mat('Food_Sprinkles', '#7ad7ff', 0.4, nmap='knurl', nstr=0.5, tile=0.02, density=900, real='sprinkles')
mat('Food_Fruit', '#ff9a3c', 0.4, nmap='ceramic', nstr=0.2, tile=0.1, density=950, real='fruit pieces')
mat('Paper_Cover', '#ffcf3a', 0.8, nmap='paper', nstr=0.4, tile=0.2, density=800, real='laminated card cover')
mat('Paper_Pages', '#f7f1e0', 0.9, nmap='paper', nstr=0.4, tile=0.2, density=750, real='80 gsm paper block')
mat('Paper_Canvas', '#fff6ea', 0.9, nmap='weave', nstr=0.4, tile=0.2, density=500, make='shell', wall=0.02, real='stretched canvas on frame')
mat('Cork_Board', '#b98a56', 0.95, nmap='carpet', nstr=0.7, tile=0.12, density=240, real='10 mm natural cork sheet on a 6 mm board')
mat('Paper_Photo', '#fbfaf6', 0.35, nmap='paper', nstr=0.15, tile=0.2, density=1100, real='glossy photo paper, 0.25 mm')
mat('Paper_Sticker', '#ffffff', 0.6, nmap='paper', nstr=0.2, tile=0.3, density=1000, make='shell', wall=0.0005, real='vinyl stickers')
mat('Metal_Chalk', '#fdfcf5', 0.9, nmap='paper', nstr=0.3, tile=0.2, density=2700, real='chalk paint (drawn pictures)')

# Extra colour accents for stickers, plush, art (same make, different paint)
for nm, col in [('Plaster_Lime', '#a6dd2c'), ('Plaster_Violet', '#7a3cff'), ('Plaster_CyanPaint', '#19c7cf'), ('Plaster_White', '#fff7fb'), ('Plaster_Red', '#e0283a'), ('Plaster_Black', '#1d1424')]:
    mat(nm, col, 0.6, nmap='paint', nstr=0.3, tile=0.8, density=700, real='painted MDF / vinyl')
for nm, col in [('Plastic_Red', '#e0283a'), ('Plastic_White', '#f8f6f2'), ('Plastic_Yellow', '#ffd23f'), ('Plastic_Cyan', '#19c7cf')]:
    mat(nm, col, 0.45, nmap='paint', nstr=0.3, tile=0.3, density=1050, real='ABS')

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]

_bmats, _imgs = {}, {}
def bmat(name):
    """The Blender material for a kit material (made once per scene)."""
    if name in _bmats and _bmats[name].name in bpy.data.materials:
        return _bmats[name]
    s = M[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(s['col'])
    b.inputs['Roughness'].default_value = s['rough']
    b.inputs['Metallic'].default_value = s['metal']
    if s['glass']:
        b.inputs['Transmission Weight'].default_value = s['glass']
        b.inputs['IOR'].default_value = 1.5
    if s['emit']:
        b.inputs['Emission Color'].default_value = srgb(s['emit'][0])
        b.inputs['Emission Strength'].default_value = s['emit'][1]
    if s['nmap'] and s['nstr'] > 0:
        key = s['nmap']
        if key not in _imgs or _imgs[key].name not in bpy.data.images:
            img = bpy.data.images.load(os.path.join(TEX, f'{key}_normal.png'))
            img.colorspace_settings.name = 'Non-Color'
            _imgs[key] = img
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = _imgs[key]
        n = nt.nodes.new('ShaderNodeNormalMap'); n.inputs['Strength'].default_value = s['nstr']
        nt.links.new(t.outputs['Color'], n.inputs['Color'])
        nt.links.new(n.outputs['Normal'], b.inputs['Normal'])
    m['kit'] = {k: s[k] for k in ('density', 'make', 'wall', 'friction', 'bounce', 'real')}
    _bmats[name] = m
    return m

# ---------------------------------------------------------------- mesh helpers
def _finish(bm, name, material, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, smooth=False):
    me = bpy.data.meshes.new(name)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update(); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = rot
    if parent is not None:
        ob.parent = parent
    me.materials.append(bmat(material))
    for p in me.polygons:
        p.use_smooth = smooth
    box_uv(ob, M[material]['tile'])
    ob['material_kit'] = material
    return ob

def box_uv(ob, tile):
    """Box-projected UVs in object space, one texture repeat per `tile` metres."""
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    uv = me.uv_layers.active.data
    for p in me.polygons:
        n = p.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for li in p.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            a, b = [(v.y, v.z), (v.x, v.z), (v.x, v.y)][ax]
            uv[li].uv = (a / tile, b / tile)

def box(name, size, material, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, bevel=0.0, seg=1, origin='center'):
    """A box of size (x, y, z). origin 'bottom' puts the origin on the bottom face."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    sx, sy, sz = size
    oz = sz / 2 if origin == 'bottom' else 0
    for v in bm.verts:
        v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz + oz))
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, min(size) * 0.45), segments=seg, affect='EDGES', profile=0.5)
    return _finish(bm, name, material, loc, rot, parent)

def cyl(name, r, h, material, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, verts=12, r2=None, origin='bottom', bevel=0.0, cap=True):
    """A cylinder or cone along local Z. origin 'bottom' or 'center'."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    if origin == 'bottom':
        for v in bm.verts:
            v.co.z += h / 2
    if bevel > 0:
        rim = [e for e in bm.edges if all(abs(abs(v.co.z - (h / 2 if origin == 'bottom' else 0)) - h / 2) < 1e-5 for v in e.verts) and not all(abs(v.co.z - e.verts[0].co.z) < 1e-6 and (Vector((v.co.x, v.co.y)).length < 1e-6) for v in e.verts)]
        rim = [e for e in rim if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6 and Vector((e.verts[0].co.x, e.verts[0].co.y)).length > 1e-6]
        bmesh.ops.bevel(bm, geom=rim, offset=min(bevel, h * 0.45, r * 0.45), segments=1, affect='EDGES')
    return _finish(bm, name, material, loc, rot, parent)

def lathe(name, prof, material, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, verts=12, smooth=False):
    """Revolve a profile [(r, z), ...] (bottom to top) around Z. r == 0 at an end closes it to a point."""
    bm = bmesh.new()
    rings = []
    for (r, z) in prof:
        if r < 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / verts), r * math.sin(2 * math.pi * i / verts), z)) for i in range(verts)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        for i in range(verts):
            j = (i + 1) % verts
            if len(a) == 1:
                bm.faces.new((a[0], b[i], b[j]))
            elif len(b) == 1:
                bm.faces.new((a[i], b[0], a[j]))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    if len(rings[0]) > 1:
        bm.faces.new(list(reversed(rings[0])))
    if len(rings[-1]) > 1:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(bm, name, material, loc, rot, parent, smooth)

def prism(name, pts, depth, material, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, bevel=0.0, z0=0.0):
    """Extrude a 2D outline [(x, y), ...] (counter-clockwise) along Z from z0 by depth."""
    bm = bmesh.new()
    bot = [bm.verts.new((x, y, z0)) for x, y in pts]
    top = [bm.verts.new((x, y, z0 + depth)) for x, y in pts]
    n = len(pts)
    bm.faces.new(list(reversed(bot))); bm.faces.new(top)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=[e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > 0.5], offset=bevel, segments=1, affect='EDGES')
    return _finish(bm, name, material, loc, rot, parent)

def star_pts(r_out, r_in, n=5, phase=math.pi / 2):
    return [((r_out if i % 2 == 0 else r_in) * math.cos(phase + math.pi * i / n), (r_out if i % 2 == 0 else r_in) * math.sin(phase + math.pi * i / n)) for i in range(2 * n)]

def star(name, r, depth, material, loc=(0, 0, 0), rot=(math.pi / 2, 0, 0), parent=None, inner=0.45, puff=0.0):
    """A five-point star, extruded (stands upright facing -Y by default). puff > 0 gives it a raised ridge."""
    pts = star_pts(r, r * inner)
    if puff <= 0:
        return prism(name, pts, depth, material, loc, rot, parent, z0=-depth / 2)
    bm = bmesh.new()
    rim_b = [bm.verts.new((x, y, -depth / 2)) for x, y in pts]
    rim_t = [bm.verts.new((x, y, depth / 2)) for x, y in pts]
    cf, cb = bm.verts.new((0, 0, depth / 2 + puff)), bm.verts.new((0, 0, -depth / 2 - puff * 0.3))
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((rim_b[i], rim_b[j], rim_t[j], rim_t[i]))
        bm.faces.new((rim_t[i], rim_t[j], cf))
        bm.faces.new((rim_b[j], rim_b[i], cb))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(bm, name, material, loc, rot, parent)

def blob(name, radii, material, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, subdiv=2, jitter=0.0, seed=1, squash=None):
    """A faceted ico-sphere scaled to radii (x, y, z); jitter roughens it like a soft sack. squash(v) can reshape."""
    import random
    rnd = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    for v in bm.verts:
        p = v.co.copy()
        if squash:
            p = squash(p)
        k = 1 + (rnd.uniform(-jitter, jitter) if jitter else 0)
        v.co = Vector((p.x * radii[0] * k, p.y * radii[1] * k, p.z * radii[2] * k))
    return _finish(bm, name, material, loc, rot, parent)

def tube(name, path, r, material, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, verts=8, closed=False, caps=True):
    """Sweep a circle of radius r along a polyline [(x, y, z), ...] (pipes, rails, wands, handles)."""
    P = [Vector(p) for p in path]
    bm = bmesh.new(); rings = []
    n = len(P)
    up_prev = None
    for i, p in enumerate(P):
        if closed:
            t = (P[(i + 1) % n] - P[i - 1]).normalized()
        elif i == 0:
            t = (P[1] - P[0]).normalized()
        elif i == n - 1:
            t = (P[-1] - P[-2]).normalized()
        else:
            t = ((P[i + 1] - P[i]).normalized() + (P[i] - P[i - 1]).normalized()).normalized()
        ref = up_prev if up_prev is not None else (Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0)))
        a = t.cross(ref).normalized(); b = t.cross(a).normalized(); up_prev = -b
        rings.append([bm.verts.new(p + (a * math.cos(2 * math.pi * k / verts) + b * math.sin(2 * math.pi * k / verts)) * r) for k in range(verts)])
    seq = list(zip(rings, rings[1:])) + ([(rings[-1], rings[0])] if closed else [])
    for A, B in seq:
        for k in range(verts):
            m = (k + 1) % verts
            bm.faces.new((A[k], A[m], B[m], B[k]))
    if caps and not closed:
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(bm, name, material, loc, rot, parent)

def torus(name, R, r, material, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, seg=16, verts=6):
    path = [(R * math.cos(2 * math.pi * i / seg), R * math.sin(2 * math.pi * i / seg), 0) for i in range(seg)]
    return tube(name, path, r, material, loc, rot, parent, verts=verts, closed=True)

def arc(R, a0, a1, n, z=0.0, cx=0.0, cy=0.0):
    return [(cx + R * math.cos(a0 + (a1 - a0) * i / (n - 1)), cy + R * math.sin(a0 + (a1 - a0) * i / (n - 1)), z) for i in range(n)]

def empty(name, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc; e.rotation_euler = rot
    if parent is not None:
        e.parent = parent
    e.empty_display_size = 0.1
    return e

def joint(ob, kind, axis=(0, 0, 1), lo=0.0, hi=0.0, note=''):
    """Mark a moving part. kind: hinge (radians), slide (metres), button (travel m), knob (radians), lift (removable)."""
    ob['joint'] = json.dumps(dict(kind=kind, axis=list(axis), min=lo, max=hi, note=note))
    return ob

def shell(ob, wall, open=False):
    """Weigh this part as sheet of `wall` metres (open=True: a pressed sheet seen from both sides, count half the area)."""
    ob['make'] = 'shell'; ob['wall'] = wall
    if open:
        ob['open'] = 1
    return ob

def tag(ob, **kw):
    for k, v in kw.items():
        ob[k] = v if isinstance(v, (int, float, str)) else json.dumps(v)
    return ob

# ---------------------------------------------------------------- physics
def mesh_props(ob):
    """(volume m3, area m2, centroid world) of an object's mesh in world space."""
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.transform(ob.matrix_world)
    vol = abs(bm.calc_volume(signed=False)); area = sum(f.calc_area() for f in bm.faces)
    if bm.faces:
        cen = sum((f.calc_center_median() * f.calc_area() for f in bm.faces), Vector()) / max(area, 1e-9)
    else:
        cen = ob.matrix_world.translation.copy()
    bm.free()
    return vol, area, cen

def weigh(root):
    """Mass every mesh part from its kit material, store extras on each part and the totals on the root."""
    total, mom, parts = 0.0, Vector(), []
    for ob in [root] + list(root.children_recursive):
        if ob.type != 'MESH':
            continue
        name = ob.get('material_kit')
        s = M[name]
        vol, area, cen = mesh_props(ob)
        make = ob.get('make', s['make']); wall = float(ob.get('wall', s['wall']))
        dens = float(ob.get('density', s['density']))
        if make == 'shell':
            mass = min(area * wall / 2 if ob.get('open') else area * wall, vol if vol > 0 else area * wall) * dens
            how = f"shell {wall * 1000:.1f} mm"
        else:
            mass = vol * dens; how = 'solid'
        if 'mass_override_kg' in ob.keys():
            mass = float(ob['mass_override_kg']); how = 'given'
        ob['physics'] = json.dumps(dict(mass_kg=round(mass, 4), density_kg_m3=dens, made=how, friction=s['friction'],
                                        restitution=s['bounce'], material=name, real=s['real']))
        total += mass; mom += cen * mass
        parts.append((ob.name, mass))
    com = mom / total if total > 0 else Vector()
    root['physics'] = json.dumps(dict(mass_kg=round(total, 3), centre_of_mass=[round(c, 4) for c in (com - root.matrix_world.translation)],
                                      parts=len(parts)))
    return total, com, parts

# ---------------------------------------------------------------- scene, export, stats
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _bmats.clear(); _imgs.clear()
    bpy.context.scene.unit_settings.system = 'METRIC'

def tris(root):
    n = 0
    for ob in [root] + list(root.children_recursive):
        if ob.type == 'MESH':
            n += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    return n

def bounds(root):
    pts = []
    for ob in [root] + list(root.children_recursive):
        if ob.type == 'MESH':
            pts += [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi

def export(root, path):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root] + list(root.children_recursive):
        ob.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_extras=True, export_apply=True,
                              export_animations=False, export_image_format='AUTO', export_yup=True)

def materials_used(root):
    return sorted({ob['material_kit'] for ob in [root] + list(root.children_recursive) if ob.type == 'MESH'})

mat('Water', '#cfefff', 0.05, glass=1.0, nmap='mirror', nstr=0.0, density=1000, real='water')
mat('Coffee', '#3a1c0e', 0.2, nmap='ceramic', nstr=0.1, tile=0.1, density=1000, real='espresso')

# ---------------------------------------------------------------- registry
ASSETS = {}
def asset(id, name, group, tier, ref='', real='', moving=''):
    """Register an asset builder. The function builds at the origin and returns its root empty."""
    def wrap(fn):
        ASSETS[id] = dict(id=id, name=name, group=group, tier=tier, ref=ref, real=real, moving=moving, fn=fn, doc=(fn.__doc__ or '').strip())
        return fn
    return wrap

def cut(ob, cutter, op='DIFFERENCE'):
    """Boolean `cutter` out of `ob` and bake the result into ob's mesh (cutter is deleted)."""
    m = ob.modifiers.new('cut', 'BOOLEAN'); m.object = cutter; m.operation = op; m.solver = 'EXACT'
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = ob.data; ob.modifiers.remove(m); ob.data = me
    bpy.data.meshes.remove(old)
    bpy.data.objects.remove(cutter, do_unlink=True)
    for p in me.polygons:
        p.use_smooth = False
    box_uv(ob, M[ob['material_kit']]['tile'])
    return ob

def cutter_box(size, loc, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    me = bpy.data.meshes.new('cutter'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('cutter', me); bpy.context.scene.collection.objects.link(o); o.location = loc; o.rotation_euler = rot
    return o
