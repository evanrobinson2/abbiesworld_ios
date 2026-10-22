"""Create an asset library and a separate arrangement of linked collection instances."""
import bpy, json
from mathutils import Vector, Matrix


def assemble_modules(root, sources):
    bpy.context.view_layer.update()
    architecture, tree, soft, lanterns, flowers, lighting = sources
    kit = {}
    placements = []
    originals = set()
    assembly = bpy.data.collections.new('ASSEMBLY · placed pieces')
    bpy.context.scene.collection.children.link(assembly)

    def register(key, objects, pivot, role, pivot_description, matrix=None):
        objects = list(objects)
        assert objects, key
        for o in objects:
            assert o not in originals, 'Object assigned twice: '+o.name
            originals.add(o)
        world = matrix if matrix is not None else Matrix.Translation(Vector(pivot))
        inv = world.inverted()
        expected = [o.matrix_world.copy() for o in objects]
        if key not in kit:
            c = bpy.data.collections.new('ASSET · '+key)
            c.asset_mark()
            c.asset_data.description = role+'; pivot: '+pivot_description
            c['asset_id'] = key
            c['pivot'] = pivot_description
            for o in objects:
                original = o.matrix_world.copy()
                for old in list(o.users_collection): old.objects.unlink(o)
                c.objects.link(o)
                o.matrix_world = inv @ original
            kit[key] = {'collection': c, 'role': role, 'pivot': pivot_description}
        else:
            assert len(objects) == 1, 'Only identical single-mesh assets may be reused here'
            for o in objects: bpy.data.objects.remove(o, do_unlink=True)
        c=kit[key]['collection']
        # Assembly preserves the exact authored pose, including each pillow's own rotation.
        for canonical, original in zip(c.objects, expected):
            recomposed=world @ canonical.matrix_world
            assert max(abs(recomposed[r][s]-original[r][s]) for r in range(4) for s in range(4)) < 1e-4, key
        placements.append({'asset_id':key, 'matrix':world.copy(), 'role':role})

    def arch(prefixes):
        return [o for o in list(architecture.objects) if o.name.startswith(tuple(prefixes))]

    register('deck', arch(['Deck plank','Front fascia','Right fascia','Under-deck']), (0,0,0),
             'Bare platform only — no cushions, vegetation or loose petals', 'deck surface at center, Z=0')
    register('doorway.frame', arch(['Alcove wall','Door jamb','Door lintel','Door sill']), (-1.95,2.51,.13),
             'Stationary doorway shell', 'threshold center')
    register('doorway.panel', arch(['Rose panel','Round glowing','Round timber','Window upright','Window crossbar']), (-3.065,2.51,1.08),
             'Recessed rose window panel; three vertical and two horizontal bars; no invented handle', 'panel lower-left corner above crossbeam')
    register('bench', arch(['Bench under','Bench leg','Bench lower']), (-1.99,2.16,0), 'Low window bench beneath continuous crossbeam', 'floor contact center')
    register('railing', arch(['Railing post','Top handrail','Bottom rail','Baluster']), (-.83,2.62,0),
             'Railing assembly independent of deck', 'left foot contact')
    register('roof.slats', arch(['Roof board']), (-1.3,1.48,3.95), 'Shelter roof slats', 'support plane center')
    register('tree.bare', list(tree.objects), (-3.23,-2.34,-.9), 'Bare tree and woody branches; no flowers', 'root base')
    for o in list(soft.objects):
        if o.name.startswith('Low sofa'):
            register('seat.base',[o],(-2.45,-.77,0),'Low wooden seat base','floor contact center')
            continue
        key='cushion.seat' if o.name.startswith('Seat cushion') else 'cushion.back' if o.name.startswith('Back pillow') else 'cushion.loose'
        bounds=[Vector(v) for v in o.bound_box]
        pivot=Vector(((min(v.x for v in bounds)+max(v.x for v in bounds))/2,
                      (min(v.y for v in bounds)+max(v.y for v in bounds))/2,
                      min(v.z for v in bounds)))
        register(key,[o],None,'Independently placed reusable cushion','local bottom center',o.matrix_world @ Matrix.Translation(pivot))
    for index in range(4):
        parts=[o for c in (lanterns,lighting) for o in list(c.objects) if o.get('module_key')=='lantern.'+str(index)]
        cord=next(o for o in parts if o.name.startswith('Lantern cord'))
        # Top of cord is the suspension pivot, regardless of bulb size or cord length.
        ends=[cord.matrix_world @ Vector((0,0,z)) for z in (min(v[2] for v in cord.bound_box),max(v[2] for v in cord.bound_box))]
        pivot=max(ends,key=lambda point:point.z)
        register('lantern.'+str(index),parts,pivot,'Hanging lantern, cord, ribs and its own light','cord suspension point')
    for index in range(9):
        parts=[o for o in list(flowers.objects) if o.get('cluster_id')==index]
        pivot=Vector((0,0,0))
        for o in parts:pivot+=o.location
        pivot/=len(parts)
        register('blossom.cluster.'+str(index),parts,pivot,'Separate removable blossom cluster','cluster center; attachment adjustment remains editable')

    assert not list(architecture.objects) and not list(tree.objects) and not list(soft.objects) and not list(flowers.objects) and not list(lanterns.objects)
    (root/'assets').mkdir(exist_ok=True)
    library=root/'assets'/'rooftop-pieces.blend'
    collection_names=[v['collection'].name for v in kit.values()]
    bpy.data.libraries.write(str(library),{v['collection'] for v in kit.values()},fake_user=True,compress=True)
    # Remove local definitions. The study must actually consume the saved library.
    for record in kit.values():
        c=record['collection']
        for o in list(c.objects):bpy.data.objects.remove(o,do_unlink=True)
        bpy.data.collections.remove(c)
    with bpy.data.libraries.load(str(library),link=True) as (_,dest):dest.collections=collection_names
    linked={c['asset_id']:c for c in dest.collections}
    instances=[]
    counts={}
    for p in placements:
        key=p['asset_id'];counts[key]=counts.get(key,0)+1
        o=bpy.data.objects.new(key+' · '+str(counts[key]),None)
        o.instance_type='COLLECTION';o.instance_collection=linked[key]
        assembly.objects.link(o);o.matrix_world=p['matrix']
        o.empty_display_type='PLAIN_AXES';o.empty_display_size=.22
        o['asset_id']=key;o['role']=p['role'];o['independent_piece']=True
        p['instance_id']=o.name
        instances.append(o)
    for lib in bpy.data.libraries:
        if lib.filepath==str(library):lib.filepath='//assets/rooftop-pieces.blend'
    # Empty source buckets are removed; environment/light/cameras stay separate from kit.
    for c in (architecture,tree,soft,lanterns,flowers):bpy.data.collections.remove(c)
    bpy.context.view_layer.update()
    serial=[{'instance_id':p['instance_id'],'asset_id':p['asset_id'],'matrix_world':[list(row) for row in p['matrix']]} for p in placements]
    manifest={'schema':1,'units':'meters','up_axis':'Z','library':'assets/rooftop-pieces.blend',
              'assets':[{'asset_id':k,'collection':linked[k].name,'role':v['role'],'pivot':v['pivot'],'instances':counts[k]} for k,v in kit.items()],
              'placements':serial,'ground_petals':False,'vegetation_in_deck':False,
              'assembly_method':'linked collection instances; asset geometry in local coordinates',
              'effects':'falling petals are a future optional effect; no petals embedded in the base'}
    (root/'assembly.json').write_text(json.dumps(manifest,indent=2))
    return instances,manifest


def explode(instances):
    original={o:o.matrix_world.copy() for o in instances}
    pillow_counts={}
    for o in instances:
        key=o['asset_id']
        if key=='deck': delta=(0,0,-.8)
        elif key=='tree.bare':delta=(-2.7,1.5,.8)
        elif key.startswith('blossom'):delta=(-.8,1.5,3.2)
        elif key.startswith('doorway'):delta=(0,2.3,1.0)
        elif key=='roof.slats':delta=(0,2.3,2)
        elif key=='railing':delta=(2.8,1.0,.5)
        elif key.startswith('lantern'):delta=(2.5,-1,2.0)
        elif key.startswith('cushion'):
            column=pillow_counts.get(key,0);pillow_counts[key]=column+1
            row={'cushion.seat':0,'cushion.back':1,'cushion.loose':2}[key]
            o.location=Vector((-1.3+column*1.65,-4.8+row*1.55,1.05))
            continue
        elif key=='seat.base':delta=(-1.5,-1.8,.2)
        else:delta=(-.2,2.0,0)
        o.location+=Vector(delta)
    return original
