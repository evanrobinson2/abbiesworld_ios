import bpy,json
bpy.ops.wm.open_mainfile(filepath='/Users/evanrobinson/abbies.world.ios/experiments/rooftop_3d/scene_v2/rooftop-current.blend')
rows=[]
for c in bpy.data.collections:
    obs=[o for o in c.objects if o.type in ['MESH','CURVE'] and not o.hide_render]
    rows.append({'collection':c.name,'objects':len(obs),'verts':sum(len(o.data.vertices) for o in obs if o.type=='MESH'),'sample':[(o.name,o.type,len(o.data.vertices) if o.type=='MESH' else 0,[(m.name,m.type,m.show_render) for m in o.modifiers]) for o in obs[:3]]})
print(json.dumps(rows,indent=2))
print('USD',[(p.identifier,p.default if hasattr(p,'default') else '') for p in bpy.ops.wm.usd_export.get_rna_type().properties])
print('MATERIALS',[(m.name,len(m.node_tree.nodes) if m.node_tree else 0) for m in bpy.data.materials])
