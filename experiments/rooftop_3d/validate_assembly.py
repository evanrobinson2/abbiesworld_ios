"""Reopen the saved assembly and verify real linked geometry and independent placement."""
import bpy, json
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(root/'rooftop-study.blend'))
manifest=json.loads((root/'assembly.json').read_text())
pieces={o.name:o for o in bpy.context.scene.objects if o.get('independent_piece')}
assert len(pieces)==len(manifest['placements'])
library=(root/manifest['library']).resolve()
for placement in manifest['placements']:
    o=pieces[placement['instance_id']]
    assert o.instance_type=='COLLECTION'
    c=o.instance_collection
    assert c.library and Path(bpy.path.abspath(c.library.filepath)).resolve()==library
    assert c['asset_id']==placement['asset_id']
    assert max(abs(o.matrix_world[r][s]-placement['matrix_world'][r][s]) for r in range(4) for s in range(4))<1e-4

deck=next(o.instance_collection for o in pieces.values() if o['asset_id']=='deck')
assert all(o.name.startswith(('Deck plank','Front fascia','Right fascia','Under-deck')) for o in deck.objects)
tree=next(o.instance_collection for o in pieces.values() if o['asset_id']=='tree.bare')
assert all(o.type=='CURVE' and 'cluster_id' not in o for o in tree.objects)
assert all(all(material.name.startswith('Bark') for material in o.data.materials) for o in tree.objects)
assert manifest['ground_petals'] is False and manifest['vegetation_in_deck'] is False
for key in ('cushion.seat','cushion.back','cushion.loose'):
    group=[o for o in pieces.values() if o['asset_id']==key]
    assert len(group)==3 and len({o.instance_collection for o in group})==1
for o in pieces.values():
    if not o['asset_id'].startswith('lantern.'):continue
    cord=next(part for part in o.instance_collection.objects if part.name.startswith('Lantern cord'))
    ends=[cord.matrix_world @ Vector((0,0,z)) for z in (min(v[2] for v in cord.bound_box),max(v[2] for v in cord.bound_box))]
    assert max(ends,key=lambda point:point.z).length<1e-4, 'Suspension pivot must sit at cord top'

def geometry_placements():
    bpy.context.view_layer.update()
    result={}
    for item in bpy.context.evaluated_depsgraph_get().object_instances:
        if item.is_instance and item.parent:
            result[(item.parent.original.name,item.object.original.name)]=item.matrix_world.copy()
    return result

selected=next(o for o in pieces.values() if o['asset_id']=='cushion.loose')
before=geometry_placements()
saved=selected.matrix_world.copy()
selected.location.x+=.75
after=geometry_placements()
assert before.keys()==after.keys()
moved=0
for key,matrix in before.items():
    expected=matrix.copy()
    if key[0]==selected.name:
        expected.translation.x+=.75
        moved+=1
    assert max(abs(expected[r][s]-after[key][r][s]) for r in range(4) for s in range(4))<1e-4
assert moved>0, 'Pillow must have actual independently movable rendered geometry'
selected.matrix_world=saved
report={'passed':True,'reopened_saved_scene':True,'relative_library_resolved':True,
        'assembly_instances':len(pieces),'unique_assets':len(manifest['assets']),
        'bare_deck_and_tree':True,'shared_cushion_definitions':True,
        'lantern_suspension_pivots':True,'independent_pillow_geometry':True,
        'native_export_validated':False}
(root/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('ROOFTOP_ASSEMBLY_VALIDATED',json.dumps(report))
