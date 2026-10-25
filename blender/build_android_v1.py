"""Editable mechanical bust blockout, not the approved final-quality portrait.

Run: Blender --background --python blender/build_android_v1.py
Rigid parts use named hierarchy; timeline: idle 1, blink 30, speech 60.
"""
import math
from pathlib import Path
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'outputs/android/blockout'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, metal=0, glow=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = .3
    p.inputs['Emission Color'].default_value = (*color, 1)
    p.inputs['Emission Strength'].default_value = glow
    return m

ivory = mat('Ceramica marfim', (.72, .64, .46), .35)
steel = mat('Titanio', (.24, .29, .32), .85)
dark = mat('Estrutura grafite', (.018, .027, .036), .65)
gold = mat('Latão', (.52, .3, .09), .8)
cyan = mat('Optica turquesa', (.01, .65, .8), .4, 2)
green = mat('Monitor verde', (.025, .8, .15), .1, 2)
pcb = mat('Placa de circuito', (.012, .09, .055), .3)

def parent(obj, root):
    if root:
        bpy.context.view_layer.update()
        world = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_world = world
        bpy.context.view_layer.update()
    return obj

def empty(name, loc=(0, 0, 0), root=None):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    o.location = loc
    return parent(o, root)

def finish(o, name, material, root=None):
    o.name = name
    o.data.materials.append(material)
    return parent(o, root)

def box(name, loc, size, material, root=None, bevel=.08):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    b = o.modifiers.new('Arestas usinadas', 'BEVEL'); b.width = bevel; b.segments = 4
    o.modifiers.new('Normais', 'WEIGHTED_NORMAL')
    return finish(o, name, material, root)

def sphere(name, loc, scale, material, root=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, location=loc)
    o = bpy.context.object; o.scale = scale
    for p in o.data.polygons: p.use_smooth = True
    return finish(o, name, material, root)

def cylinder(name, loc, radius, depth, material, root=None, axis='Y'):
    rot = (math.pi/2, 0, 0) if axis == 'Y' else (0, math.pi/2, 0) if axis == 'X' else (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    b=o.modifiers.new('Borda', 'BEVEL'); b.width=.025; b.segments=3
    o.modifiers.new('Normais', 'WEIGHTED_NORMAL')
    return finish(o, name, material, root)

def line(name, points, material, radius=.015, root=None):
    c=bpy.data.curves.new(name, 'CURVE'); c.dimensions='3D'; c.bevel_depth=radius; c.bevel_resolution=3
    s=c.splines.new('POLY'); s.points.add(len(points)-1)
    for p, xyz in zip(s.points, points): p.co=(*xyz, 1)
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o)
    return finish(o,name,material,root)

body=empty('Android_Root')
box('Torax', (0,0,1.05), (2.3,.9,.95), ivory,body,.22)
for side in [-1,1]:
    sphere('Ombro', (side*1.22,0,1.1), (.5,.5,.5),steel,body)
    box('Placa peitoral', (side*.65,-.5,1.1), (.8,.12,.58),steel,body)
    cylinder('Pistao cervical', (side*.25,0,1.85),.09,.65,gold,body,axis='Z')
cylinder('Base cervical',(0,0,1.6),.38,.18,steel,body,axis='Z')
cylinder('Nucleo aro',(0,-.52,1.13),.27,.14,gold,body)
cylinder('Nucleo tela',(0,-.61,1.13),.21,.05,dark,body)
cylinder('Nucleo indicador',(0,-.65,1.13),.085,.02,cyan,body)

head=empty('Head_Pivot',(0,0,2),body)
sphere('Casco interno',(0,0,2.95),(.9,.59,1.05),dark,head)
box('Coroa',(0,.02,3.68),(1.5,.9,.25),ivory,head,.12)
box('Monitor moldura',(0,-.52,3.45),(1.55,.18,.62),gold,head,.12)
box('Monitor vidro',(0,-.63,3.45),(1.4,.06,.48),dark,head,.08)
screen=empty('Forehead_Display',(0,-.67,3.45),head)
line('DeBoa_Linha', [(-.62,-.675,3.45),(.62,-.675,3.45)],green,.012,screen)
for z in [3.3,3.4,3.5,3.6]:
    line('Grade horizontal',[(-.64,-.668,z),(.64,-.668,z)],pcb,.003,screen)
for x in [-.6,-.4,-.2,0,.2,.4,.6]:
    line('Grade vertical',[(x,-.668,3.26),(x,-.668,3.64)],pcb,.003,screen)

lids=[]; brows=[]
for side in [-1,1]:
    x=side*.4
    cylinder('Modulo lateral',(side*.93,0,2.95),.38,.23,steel,head,'X')
    cylinder('Sensor lateral',(side*1.055,0,2.95),.25,.025,gold,head,'X')
    box('Circuito bochecha',(side*.58,-.49,2.56),(.37,.12,.4),pcb,head,.04)
    for row in range(3):
        box('Chip',(side*.58,-.565,2.44+row*.1),(.17,.035,.055),dark,head,.01)
    line('Trilha circuito',[(side*.72,-.585,2.4),(side*.72,-.585,2.72),(side*.53,-.585,2.72)],gold,.008,head)
    box('Moldura zigomatica',(side*.79,-.37,2.58),(.16,.25,.55),ivory,head,.06)
    cylinder('Orbita',(x,-.5,2.98),.32,.15,steel,head)
    sphere('Globo optico',(x,-.58,2.98),(.25,.18,.25),dark,head)
    cylinder('Iris',(x,-.77,2.98),.145,.025,cyan,head)
    cylinder('Lente',(x,-.793,2.98),.105,.025,dark,head)
    sphere('Reflexo',(x-.04,-.819,3.03),(.025,.012,.025),ivory,head)
    pivot=empty('Eyelid_Pivot_L' if side<0 else 'Eyelid_Pivot_R',(x,-.56,2.98),head)
    lid=box('Palpebra opaca',(x,-.81,3.27),(.52,.075,.02),ivory,pivot,.009)
    lids.append(lid)
    brow=box('Brow_L' if side<0 else 'Brow_R',(x,-.62,3.24),(.58,.17,.11),steel,head,.035)
    brows.append(brow)
box('Ponte facial',(0,-.59,2.82),(.28,.2,.55),ivory,head,.08)
line('Luz nasal',[(0,-.705,2.7),(0,-.705,2.9)],gold,.018,head)
box('Base boca',(0,-.44,2.29),(.88,.36,.27),dark,head,.07)
box('Maxilar superior',(0,-.65,2.4),(.76,.12,.14),ivory,head,.05)
jaw=empty('Jaw_Pivot',(0,-.2,2.38),head)
box('Mandibula movel',(0,-.52,2.19),(.78,.37,.28),ivory,jaw,.09)

scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.render.resolution_x=800; scene.render.resolution_y=900; scene.render.resolution_percentage=100
scene.world.color=(.025,.035,.055)
scene.render.image_settings.file_format='PNG'
scene.frame_end=90
for frame in [1,20,30,36,50,60,70,90]:
    closed=frame==30
    for lid in lids:
        lid.scale.z=27 if closed else 1
        # Parent is eyelid pivot: all values below are local coordinates.
        lid.location.z=.0 if closed else .29
        lid.keyframe_insert(data_path='scale',frame=frame)
        lid.keyframe_insert(data_path='location',frame=frame)
    jaw.rotation_euler.x=math.radians(16 if frame==60 else 0)
    jaw.keyframe_insert(data_path='rotation_euler',frame=frame)
scene.timeline_markers.new('De boa',frame=1)
scene.timeline_markers.new('Piscar fechado',frame=30)
scene.timeline_markers.new('Teste mandibula',frame=60)

def aim(o,point): o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size in [('Key',(-3,-5,6),850,4),('Fill',(4,-3,4),650,3),('Rim',(1,3,5),1100,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object; o.name=name; o.data.energy=power; o.data.shape='DISK'; o.data.size=size; aim(o,(0,0,2.4))
bpy.ops.object.camera_add(location=(.3,-8.5,3.2))
camera=bpy.context.object; aim(camera,(0,0,2.25)); camera.data.type='ORTHO'; camera.data.ortho_scale=4.5
scene.camera=camera
scene.frame_set(1)
scene['stage']='Blockout tecnico, nao acabamento final aprovado'
scene['reference']='outputs/android/conceito/android-expressoes-aprovadas-v1.png'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Android_v1_blockout.blend'))
for frame,name in [(1,'neutro'),(30,'piscar'),(60,'mandibula')]:
    scene.frame_set(frame); scene.render.filepath=str(OUT/f'Android_v1_{name}.png'); bpy.ops.render.render(write_still=True)
print('Android blockout concluido: arquivo editavel e tres testes de articulacao.')
