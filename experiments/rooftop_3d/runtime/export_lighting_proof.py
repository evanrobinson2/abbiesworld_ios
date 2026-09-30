"""Build a separate material proof from B10. The baseline/source remain untouched.
Reuse established mesh preparation, but export albedo and tangent normal atlases
without baked direct light. Native lights cast all direct shadows in this study.
"""
from pathlib import Path
src=Path(__file__).with_name('export_runtime.py').read_text()
src=src.replace("OUT=ROOT/'abbies.world.ios/abbies.world.ios/Resources/Rooftop3D'", "OUT=ROOT/'abbies.world.ios/abbies.world.ios/Resources/RooftopLightingProof'")
src=src.replace("WORK=ROOT/'experiments/rooftop_3d/runtime'", "WORK=ROOT/'experiments/rooftop_3d/runtime/lighting-proof'\nWORK.mkdir(parents=True,exist_ok=True)")
src=src.replace("'rooftop-'+key", "'rooftop-proof-'+key")
src=src.replace("# Apply only a small geometric budget.", """# Lay the independent loose cushions on their supporting surfaces before mesh batching.
for o in s.objects:
    if o.name.startswith('B loose cushion'):
        i=int(o.name.split()[-1])
        o.rotation_euler=(math.pi/2 + [.06,-.09,.04][i], [.04,-.05,.03][i], [-.32,.24,-.14][i])
        o.location.x=-3.04+[.02,-.08,.06][i]
        o.scale*=.9
        bpy.context.view_layer.update()
        bottom=min((o.matrix_world@Vector(c)).z for c in o.bound_box)
        o.location.z+=.56-bottom
    elif o.name.startswith('B floor pillow'):
        o.rotation_euler.x=math.pi/2+.05
        bpy.context.view_layer.update()
        bottom=min((o.matrix_world@Vector(c)).z for c in o.bound_box)
        o.location.z+=.02-bottom
# Separate luminous window from the shadow-receiving wall.
window=[o for o in groups['architecture'] if o.name.startswith('W06')]
for o in window:
    groups['architecture'].remove(o)
    add('window',o,256)
# Study geometry: the existing room, with its old tiny foliage replaced at runtime.
groups={k:v for k,v in groups.items() if not k.startswith(('foliage','lantern')) and k not in ['distance','fairylights']}
# Apply only a small geometric budget.""")
src=src.replace("s.cycles.samples=12", "s.cycles.samples=8")
src=src.replace("bpy.ops.object.bake(type='COMBINED')\n        img.save_render(str(OUT/info['texture']),scene=s)", """s.render.bake.use_pass_color=True
        s.render.bake.use_pass_direct=False
        s.render.bake.use_pass_indirect=False
        bpy.ops.object.bake(type='EMIT' if key=='window' else 'DIFFUSE')
        # Albedo is a color texture; use Standard transfer, not a cinematic exposure/look.
        s.view_settings.view_transform='Standard';s.view_settings.look='None';s.view_settings.exposure=0;s.view_settings.gamma=1
        img.save_render(str(OUT/info['texture']),scene=s)
        if key not in ['window']:
            normal=bpy.data.images.new(key+'_normal',width=info['size'],height=info['size'],alpha=False,float_buffer=True)
            normal.colorspace_settings.name='Non-Color'
            for m in mats:
                m.node_tree.nodes.active.image=normal
            bpy.ops.object.bake(type='NORMAL')
            normal.filepath_raw=str(OUT/('rooftop-proof-'+key+'-normal.png'));normal.file_format='PNG';normal.save()
            info['normal']='rooftop-proof-'+key+'-normal.png'
            bpy.data.images.remove(normal)
            ao=bpy.data.images.new(key+'_ao',width=512,height=512,alpha=False,float_buffer=True)
            ao.colorspace_settings.name='Non-Color'
            for m in mats:m.node_tree.nodes.active.image=ao
            # Short-range occlusion is contact detail, not a second roof-shadow bake.
            saved=[]
            for m in mats:
                nt=m.node_tree;output=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL')
                saved.append((nt,output,output.inputs['Surface'].links[0].from_socket))
                contact=nt.nodes.new('ShaderNodeAmbientOcclusion');contact.samples=4;contact.inputs['Distance'].default_value=.28
                floor=nt.nodes.new('ShaderNodeMath');floor.operation='MULTIPLY_ADD';floor.inputs[1].default_value=.55;floor.inputs[2].default_value=.45
                emit=nt.nodes.new('ShaderNodeEmission')
                nt.links.new(contact.outputs['AO'],floor.inputs[0]);nt.links.new(floor.outputs[0],emit.inputs['Color']);nt.links.new(emit.outputs[0],output.inputs['Surface'])
            bpy.ops.object.bake(type='EMIT')
            for nt,output,previous in saved:nt.links.new(previous,output.inputs['Surface'])
            ao.filepath_raw=str(OUT/('rooftop-proof-'+key+'-ao.png'));ao.file_format='PNG';ao.save()
            info['ambientOcclusion']='rooftop-proof-'+key+'-ao.png'
            bpy.data.images.remove(ao)""")
src=src.replace("rooftop-manifest.json", "rooftop-proof-manifest.json")
src=src.replace("'lighting':'UV baked Cycles direct/indirect sunset and roof shade; no projected reference image, live shadows or volume'", "'lighting':'Unlit albedo and tangent normals; native shadowed directional light plus pastel environment fill'")
# Fail closed if the shared exporter changes; never silently write study maps over baseline.
assert "OUT=ROOT/'abbies.world.ios/abbies.world.ios/Resources/RooftopLightingProof'" in src
assert "OUT=ROOT/'abbies.world.ios/abbies.world.ios/Resources/Rooftop3D'" not in src
assert "bpy.ops.object.bake(type='EMIT' if key=='window' else 'DIFFUSE')" in src
assert 'rooftop-proof-manifest.json' in src
exec(compile(src,str(Path(__file__)), 'exec'))
