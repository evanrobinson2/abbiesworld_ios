"""Reference-led rooftop alcove: timber framing, recessed rose panel and round lattice."""
import bpy, math
from mathutils import Vector


def build_alcove(cube, material, move, architecture):
    timber=material('Alcove timber · dark aged mulberry',(.071,.026,.032),.82)
    endgrain=material('Alcove timber · warm worn edges',(.10,.035,.04),.8)
    plaster=material('Alcove panel · warm rose',(.39,.074,.15),.88)
    lattice=material('Window joinery · reddish heartwood',(.20,.042,.05),.74)
    glazing=material('Window panes · amber to petal light',(1,.55,.20),.6,.75)

    # Wood grain follows each beam's long local axis; modeled edge wear stays subtle.
    for mat in (timber,endgrain):
        nt=mat.node_tree;p=nt.nodes.get('Principled BSDF')
        tex=nt.nodes.new('ShaderNodeTexCoord')
        mapping=nt.nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY'
        mapping.inputs[1].default_value=(15,15,.65)
        noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=3.4;noise.inputs['Detail'].default_value=4
        nt.links.new(tex.outputs['Generated'],mapping.inputs[0]);nt.links.new(mapping.outputs[0],noise.inputs['Vector'])
        ramp=nt.nodes.new('ShaderNodeValToRGB');base=mat.diffuse_color[:3]
        ramp.color_ramp.elements[0].position=.24;ramp.color_ramp.elements[0].color=(*(v*.65 for v in base),1)
        ramp.color_ramp.elements[1].position=.8;ramp.color_ramp.elements[1].color=(*(v*1.5 for v in base),1)
        nt.links.new(noise.outputs['Fac'],ramp.inputs[0]);nt.links.new(ramp.outputs[0],p.inputs['Base Color'])
        bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.32;bump.inputs['Distance'].default_value=.012
        nt.links.new(noise.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs[0],p.inputs['Normal'])
    nt=plaster.node_tree;p=nt.nodes.get('Principled BSDF')
    noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=95
    bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.004
    nt.links.new(noise.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs[0],p.inputs['Normal'])

    # Lower pink wall continues below the crossbeam, as in the artwork.
    cx=-1.99;cy=2.51;cz=2.64;inner=.602;outer=.73
    cube('Alcove wall lower',(cx,2.64,.61),(2.31,.20,1.12),plaster,bevel=.014)
    panel=cube('Rose panel with round opening',(cx,cy,2.30),(2.15,.13,2.44),plaster,bevel=0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=inner,depth=.65,location=(cx,cy,cz),rotation=(math.pi/2,0,0))
    cutter=bpy.context.object
    bpy.context.view_layer.objects.active=panel
    mod=panel.modifiers.new('Actual round window opening','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    b=panel.modifiers.new('Small plaster edges','BEVEL');b.width=.008;b.segments=2
    panel.modifiers.new('Panel weighted normals','WEIGHTED_NORMAL')

    def beam(name,loc,width,depth,height,mat=timber,horizontal=False):
        if horizontal:
            o=cube(name,loc,(height,depth,width),mat,bevel=.018)
            o.rotation_euler.y=math.pi/2
        else:o=cube(name,loc,(width,depth,height),mat,bevel=.018)
        return o
    # Broad structural posts, nested inset strips and a continuous sill; no invented knob.
    for side,x in [('left',-3.16),('right',-.80)]:
        beam('Door jamb structural '+side,(x,2.43,1.79),.24,.33,3.55)
        inset=x+(.135 if side=='left' else -.135)
        beam('Door jamb inset '+side,(inset,2.395,2.31),.075,.115,2.43,endgrain)
        beam('Door jamb narrow shadow bead '+side,(inset+(.055 if side=='left' else -.055),2.432,2.31),.025,.055,2.41)
    beam('Door lintel structural',(cx,2.405,3.60),2.73,.40,.23,horizontal=True)
    beam('Door lintel inset',(cx,2.40,3.465),2.23,.13,.065,endgrain,True)
    beam('Door sill continuous crossbeam',(cx,2.30,1.075),2.80,.31,.17,horizontal=True)
    beam('Door sill worn upper lip',(cx,2.277,1.168),2.69,.34,.04,endgrain,True)
    # Dowel ends provide small joinery cues without metal hardware.
    for x in (-3.16,-.80):
        for z in (1.077,3.60):
            bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.022,depth=.01,location=(x,2.19 if z<2 else 2.20,z),rotation=(math.pi/2,0,0))
            peg=bpy.context.object;peg.name='Door jamb wooden peg';peg.data.materials.append(endgrain);move(peg,architecture)

    # Flat annular surround with a shallow bevel, replacing the inflated torus.
    def ring(name,r0,r1,yfront,yback,mat):
        verts=[];faces=[];steps=128
        for y,r in ((yfront,r1),(yfront,r0),(yback,r1),(yback,r0)):
            verts.extend((cx+r*math.cos(i*math.tau/steps),y,cz+r*math.sin(i*math.tau/steps)) for i in range(steps))
        for i in range(steps):
            j=(i+1)%steps
            faces.extend(((i,j,steps+j,steps+i),(i,2*steps+i,2*steps+j,j),
                          (steps+i,steps+j,3*steps+j,3*steps+i),(2*steps+i,3*steps+i,3*steps+j,2*steps+j)))
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(mat)
        o=bpy.data.objects.new(name,mesh);architecture.objects.link(o)
        bevel=o.modifiers.new('Worked timber rim edges','BEVEL');bevel.width=.012;bevel.segments=3
        o.modifiers.new('Rim weighted normals','WEIGHTED_NORMAL')
        return o
    ring('Round timber broad surround',inner,outer,2.342,2.485,lattice)
    ring('Round timber inner reveal',inner-.022,inner+.02,2.37,2.56,endgrain)

    # A single luminous recessed pane provides a color gradient behind actual wooden bars.
    bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=inner,depth=.016,location=(cx,2.575,cz),rotation=(math.pi/2,0,0))
    pane=bpy.context.object;pane.name='Round glowing recessed pane'
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    pane.data.materials.append(glazing);move(pane,architecture)
    nt=glazing.node_tree;p=nt.nodes.get('Principled BSDF')
    tex=nt.nodes.new('ShaderNodeTexCoord');separate=nt.nodes.new('ShaderNodeSeparateXYZ');ramp=nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(tex.outputs['Generated'],separate.inputs[0]);nt.links.new(separate.outputs['Z'],ramp.inputs[0])
    ramp.color_ramp.elements[0].position=0;ramp.color_ramp.elements[0].color=(.66,.23,.30,1)
    ramp.color_ramp.elements[1].position=1;ramp.color_ramp.elements[1].color=(1,.79,.30,1)
    e=ramp.color_ramp.elements.new(.53);e.color=(1,.64,.25,1)
    nt.links.new(ramp.outputs[0],p.inputs['Base Color']);nt.links.new(ramp.outputs[0],p.inputs['Emission Color'])
    # Three verticals, two horizontals; endpoints are shaped to the opening's circle.
    def clipped_bar(name,offset,width,vertical):
        a=offset-width/2;b=offset+width/2
        contour=[]
        for t in range(9):
            v=a+(b-a)*t/8;u=math.sqrt((inner+.012)**2-v*v)
            contour.append((v,u) if vertical else (u,v))
        for t in range(9):
            v=b-(b-a)*t/8;u=-math.sqrt((inner+.012)**2-v*v)
            contour.append((v,u) if vertical else (u,v))
        if not vertical:contour.reverse()
        # A shallow lap keeps the crossing faces from occupying the same plane.
        front=2.38 if vertical else 2.369
        count=len(contour);verts=[(cx+x,y,cz+z) for y in (front,2.455) for x,z in contour]
        faces=[tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]
        faces.extend((i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count))
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(lattice)
        o=bpy.data.objects.new(name,mesh);architecture.objects.link(o)
        b=o.modifiers.new('Lattice softened edges','BEVEL');b.width=.005;b.segments=2
        o.modifiers.new('Lattice weighted normals','WEIGHTED_NORMAL')
    for x in (-.27,0,.27):clipped_bar('Window upright',x,.062,True)
    for z in (-.17,.16):clipped_bar('Window crossbar',z,.062,False)
    beam('Bench under window',(cx,2.13,.43),2.30,.62,.13,horizontal=True)
    for x in (-2.87,-1.11):beam('Bench leg',(x,2.12,.19),.13,.14,.39)
    beam('Bench lower stretcher',(cx,2.24,.21),1.82,.085,.075,horizontal=True)
    return {'panel_width':2.15,'panel_height':2.44,'round_window_diameter':outer*2,
            'vertical_window_bars':3,'horizontal_window_bars':2,'visible_knob':False,
            'interpretation':'recessed window alcove above continuous crossbeam and low bench'}
