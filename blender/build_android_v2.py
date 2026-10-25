"""Second editable study: shaped facial panels and two-part eyelid shutters.

Native geometry only. Still a modeling study, not the final approved render.
Run with Blender --background --python-exit-code 1 --python <this file>.
"""
import math
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'outputs/android/refinement-v2'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'outputs/android/blockout/Android_v1_blockout.blend'))
for o in list(bpy.data.objects):
    if o.type not in {'CAMERA', 'LIGHT'}:
        bpy.data.objects.remove(o, do_unlink=True)
ivory, steel, dark, gold, cyan, green, pcb = [bpy.data.materials[n] for n in ['Ceramica marfim','Titanio','Estrutura grafite','Latão','Optica turquesa','Monitor verde','Placa de circuito']]

def parent(o, root):
    if root:
        bpy.context.view_layer.update()
        world=o.matrix_world.copy(); o.parent=root; o.matrix_world=world
        bpy.context.view_layer.update()
    return o

def finish(o, name, material, root=None):
    o.name=name; o.data.materials.append(material)
    return parent(o,root)

def empty(name, loc, root=None):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); o.location=loc
    return parent(o,root)

def mesh(name, verts, faces, material, root, thickness=.035, bevel=.025):
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    o=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(o)
    if thickness:
        mod=o.modifiers.new('Espessura mecanica','SOLIDIFY'); mod.thickness=thickness
    if bevel:
        mod=o.modifiers.new('Arestas fresadas','BEVEL'); mod.width=bevel; mod.segments=3
        o.modifiers.new('Normais de superficie','WEIGHTED_NORMAL')
    return finish(o,name,material,root)

def surface_y(x,z,offset=0):
    return -.76+.12*(x/.85)**2+.035*((z-3.2)/1.1)**2+offset

def panel(name, outline, material, root, offset=0, bevel=.025):
    # A center fan follows the curved surface instead of a non-planar n-gon.
    cx=sum(x for x,z in outline)/len(outline);cz=sum(z for x,z in outline)/len(outline)
    verts=[(cx,surface_y(cx,cz,offset),cz)]+[(x,surface_y(x,z,offset),z) for x,z in outline]
    faces=[(0,i+1,(i+1)%len(outline)+1) for i in range(len(outline))]
    normal=(Vector(verts[faces[0][1]])-Vector(verts[0])).cross(Vector(verts[faces[0][2]])-Vector(verts[0]))
    if normal.y>0:faces=[tuple(reversed(f)) for f in faces]
    return mesh(name,verts,faces,material,root,bevel=bevel)

def sphere(name, loc, scale, material, root):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=32,location=loc)
    o=bpy.context.object; o.scale=scale
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,material,root)

def cylinder(name, loc, radius, depth, material, root, axis='Y'):
    rotation=(math.pi/2,0,0) if axis=='Y' else (0,math.pi/2,0) if axis=='X' else (0,0,0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius,depth=depth,location=loc,rotation=rotation)
    o=bpy.context.object
    mod=o.modifiers.new('Borda usinada','BEVEL'); mod.width=.015; mod.segments=3
    o.modifiers.new('Normais','WEIGHTED_NORMAL')
    return finish(o,name,material,root)

def line(name, points, material, root, radius=.012):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=radius; c.bevel_resolution=3
    s=c.splines.new('POLY'); s.points.add(len(points)-1)
    for p,xyz in zip(s.points,points):p.co=(*xyz,1)
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o)
    return finish(o,name,material,root)

def box(name, loc, dims, material, root):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object; o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    m=o.modifiers.new('Arredondamento','BEVEL'); m.width=min(dims)*.2;m.segments=3
    o.modifiers.new('Normais','WEIGHTED_NORMAL')
    return finish(o,name,material,root)

def ring(name,x,z,rx,rz,material,root,y=-.79,width=.03):
    verts=[]; faces=[]; n=64
    for r in [1,1-width/min(rx,rz)]:
        verts.extend((x+rx*r*math.cos(i*2*math.pi/n),y,z+rz*r*math.sin(i*2*math.pi/n)) for i in range(n))
    for i in range(n):j=(i+1)%n;faces.append((i,j,n+j,n+i))
    return mesh(name,verts,faces,material,root,.025,.005)

body=empty('Android_Root',(0,0,0))
sphere('Torax interno',(0,.04,1.16),(1.1,.5,.62),dark,body)
for side in [-1,1]:
    sphere('Articulacao ombro',(side*1.12,.03,1.18),(.42,.4,.43),steel,body)
    # Shaped torso panels replace the rectangular v1 chest plates.
    panel('Peitoral marfim',[(side*x,z) for x,z in [(0.2,1.67),(.6,1.72),(1.12,1.5),(1.23,1.1),(.95,.72),(.25,.72)]],ivory,body,offset=-.18,bevel=.04)
    for x,z in [(.95,1.47),(.99,.94)]:
        cylinder('Fixacao peitoral',(side*x,surface_y(side*x,z)-.21,z),.035,.025,gold,body)
    cylinder('Pistao cervical',(side*.24,0,1.94),.07,.62,gold,body,'Z')
    line('Cabo cervical',[(side*.34,.03,1.65),(side*.4,-.03,1.95),(side*.32,-.02,2.28)],dark,body,.045)
cylinder('Coluna cervical',(0,.05,1.97),.17,.7,steel,body,'Z')
for z in [1.72,1.85,2.0,2.15]:cylinder('Anel cervical',(0,.05,z),.21,.05,dark,body,'Z')
cylinder('Peito moldura',(0,-.57,1.29),.235,.12,gold,body)
cylinder('Peito vidro',(0,-.645,1.29),.195,.045,dark,body)
ring('Peito anel luminoso',0,1.29,.15,.15,cyan,body,-.675,.018)
cylinder('Peito sinal',(0,-.69,1.29),.045,.012,cyan,body)

head=empty('Head_Pivot',(0,0,2.25),body)
sphere('Calota traseira',(0,.03,3.22),(.83,.59,1.04),ivory,head)
# Dark inner facial backing ends near the cheeks; it does not imitate skin.
sphere('Face estrutura',(0,-.27,3.12),(.77,.43,.94),dark,head)
for side in [-1,1]:
    cylinder('Modulo temporal',(side*.85,.03,3.24),.34,.21,steel,head,'X')
    cylinder('Tampa temporal',(side*.968,.03,3.24),.28,.03,gold,head,'X')
    cylinder('Disco temporal',(side*.99,.03,3.24),.23,.02,dark,head,'X')
    # Outer ceramic contour, left/right mirrored.
    panel('Painel lateral',[(side*x,z) for x,z in [(.7,4.02),(.85,3.78),(.86,3.33),(.81,2.87),(.64,2.51),(.48,2.4),(.52,2.68),(.72,2.92),(.69,3.31),(.62,3.42)]],ivory,head)
    panel('Janela circuito',[(side*x,z) for x,z in [(.26,2.91),(.62,2.96),(.66,2.65),(.45,2.48),(.28,2.62)]],pcb,head,offset=-.035)
    for row in range(3):
        x=side*(.35+row*.085);z=2.79-row*.07
        box('Circuito integrado',(x,surface_y(x,z)-.072,z),(.09,.03,.12),dark,head)
        for d in [-1,1]:
            for k in range(3):
                box('Terminal CI',(x+d*.055,surface_y(x,z)-.09,z-.035+k*.035),(.018,.01,.009),gold,head)
    for k in range(3):
        points=[(side*.55,2.54+k*.025),(side*(.61+k*.02),2.69),(side*.6,2.86)]
        line('Cabo bochecha',[(x,surface_y(x,z)-.09,z) for x,z in points],gold if k==1 else steel,head,.009)
    panel('Borda mandibular',[(side*x,z) for x,z in [(.69,2.75),(.73,2.65),(.56,2.37),(.3,2.22),(.32,2.36),(.53,2.54)]],steel,head,offset=-.025)
    for x,z in [(.75,3.64),(.76,2.91),(.5,2.43)]:
        cylinder('Parafuso facial',(side*x,surface_y(side*x,z)-.03,z),.025,.02,gold,head)

panel('Coroa frontal',[(-.69,4.02),(-.5,4.2),(-.19,4.25),(-.16,4.11),(.16,4.11),(.19,4.25),(.5,4.2),(.69,4.02)],ivory,head)
panel('Faixa central coroa',[(-.16,4.13),(-.19,4.26),(.19,4.26),(.16,4.13)],steel,head,offset=-.02)
monitor_outline=[(-.69,3.61),(-.68,3.96),(-.54,4.07),(.54,4.07),(.68,3.96),(.69,3.61),(.6,3.53),(-.6,3.53)]
panel('Monitor aro',monitor_outline,gold,head,offset=-.04,bevel=.035)
panel('Monitor vidro',[(x*.93,3.8+(z-3.8)*.85) for x,z in monitor_outline],dark,head,offset=-.085,bevel=.02)
screen=empty('Forehead_Display',(0,-.87,3.8),head)
for z in [3.62,3.7,3.78,3.86,3.94,4.0]:
    line('Grade horizontal',[(x,surface_y(x,z)-.16,z) for x in [-.57+i*.0285 for i in range(41)]],pcb,screen,.002)
for x in [-.5,-.3,-.1,.1,.3,.5]:
    line('Grade vertical',[(x,surface_y(x,z)-.16,z) for z in [3.61,4]],pcb,screen,.002)
trace=line('DeBoa_Linha',[(x,surface_y(x,3.8)-.17,3.8+.002*math.sin(x*8)) for x in [-.56+i*.014 for i in range(81)]],green,screen,.009)
# Off glyph made from geometry, not font-dependent text.
off=[]
off.append(line('Cochilo_Off_Arco',[(.105*math.cos(t),surface_y(.105*math.cos(t),3.8+.105*math.sin(t))-.17,3.8+.105*math.sin(t)) for t in [math.radians(125+i*290/64) for i in range(65)]],cyan,screen,.012))
off.append(line('Cochilo_Off_Haste',[(0,surface_y(0,z)-.17,z) for z in [3.8,3.94]],cyan,screen,.012))

panel('Ponte facial',[(-.15,3.43),(.15,3.43),(.12,3.12),(.2,2.91),(.34,2.75),(.24,2.62),(-.24,2.62),(-.34,2.75),(-.2,2.91),(-.12,3.12)],ivory,head,offset=-.03,bevel=.035)
line('Luz nasal',[(0,surface_y(0,z)-.08,z) for z in [2.88,3.1]],gold,head,.014)
lids=[]
for side in [-1,1]:
    x=side*.37;z=3.18
    ring('Orbita titanio',x,z,.295,.25,steel,head,-.79,.04)
    sphere('Optica negra',(x,-.75,z),(.245,.14,.205),dark,head)
    cylinder('Iris turquesa',(x,-.898,z),.113,.018,cyan,head)
    cylinder('Lente escura',(x,-.914,z),.082,.018,dark,head)
    ring('Detalhe iris',x,z,.065,.065,steel,head,-.93,.006)
    sphere('Reflexo lente',(x-.025,-.938,z+.035),(.016,.008,.016),ivory,head)
    panel('Brow_L' if side<0 else 'Brow_R',[(x-.27,3.47),(x+.24,3.45),(x+.25,3.37),(x-.27,3.39)],steel,head,offset=-.08,bevel=.014)
    # Upper and lower curved shutters, each with closed shape key.
    for sign in [1,-1]:
        verts=[]; closed=[];faces=[]
        rows=8;cols=32
        for row in range(rows+1):
            r=row/rows
            for col in range(cols+1):
                a=math.pi*col/cols
                dx=.258*r*math.cos(a); dz=sign*.222*r*math.sin(a)
                y=-.95+.018*r*r
                closed.append((x+dx,y,z+dz))
                verts.append((x+dx,y,z+sign*.224+dz*.045))
        for row in range(rows):
            for col in range(cols):
                a=row*(cols+1)+col;faces.append((a,a+1,a+cols+2,a+cols+1))
        lid=mesh(f'Shutter_{side}_{sign}',verts,faces,ivory,head,.008,.002)
        lid.shape_key_add(name='Basis');k=lid.shape_key_add(name='Closed')
        for v,co in zip(k.data,closed):v.co=co
        lids.append(lid)

panel('Maxilar superior',[(-.31,2.66),(-.18,2.69),(0,2.66),(.18,2.69),(.31,2.66),(.33,2.56),(.18,2.53),(0,2.54),(-.18,2.53),(-.33,2.56)],ivory,head,offset=-.055)
panel('Cavidade oral',[(-.32,2.56),(.32,2.56),(.28,2.31),(-.28,2.31)],dark,head,offset=-.01)
jaw=empty('Jaw_Pivot',(0,-.23,2.58),head)
chin=panel('Mandibula movel',[(-.33,2.51),(-.18,2.48),(0,2.49),(.18,2.48),(.33,2.51),(.37,2.37),(.23,2.21),(-.23,2.21),(-.37,2.37)],ivory,jaw,offset=-.055,bevel=.03)
panel('Queixo detalhe',[(-.12,2.29),(.12,2.29),(.1,2.22),(-.1,2.22)],gold,jaw,offset=-.095,bevel=.01)

scene=bpy.context.scene;scene.frame_end=90
scene.render.resolution_x=960;scene.render.resolution_y=1080;scene.cycles.samples=48
scene.world.use_nodes=True
background=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
background.inputs[0].default_value=(.008,.015,.032,1);background.inputs[1].default_value=.35
scene.camera.location=(.45,-8,3.3)
scene.camera.rotation_euler=(Vector((0,-.1,2.47))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.ortho_scale=4.1
for frame in [1,20,30,36,50,60,70,90]:
    for lid in lids:
        key=lid.data.shape_keys.key_blocks['Closed'];key.value=1 if frame==30 else 0
        key.keyframe_insert('value',frame=frame)
    jaw.rotation_euler.x=math.radians(18 if frame==60 else 0);jaw.keyframe_insert('rotation_euler',frame=frame)
    trace.hide_render=frame==30;trace.keyframe_insert('hide_render',frame=frame)
    for o in off:o.hide_render=frame!=30;o.keyframe_insert('hide_render',frame=frame)
scene.frame_set(1)
scene['stage']='Estudo geometrico v2: ainda nao acabamento aprovado'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Android_v2_refinement.blend'))
for frame,name in [(1,'neutro'),(30,'cochilo'),(60,'mandibula')]:
    scene.frame_set(frame);scene.render.filepath=str(OUT/f'Android_v2_{name}.png');bpy.ops.render.render(write_still=True)
print('Android v2: paineis curvos, obturadores e tres renders concluidos.')
