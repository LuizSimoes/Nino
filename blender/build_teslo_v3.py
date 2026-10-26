"""Refine v2 surfaces without changing its named articulation or screen anchors.

Keeps earlier files untouched. Native Blender geometry, no generated textures.
"""
import math
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/android/refinement-v3'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'outputs/android/refinement-v2/Android_v2_refinement.blend'))
bpy.context.scene.frame_set(1)
head=bpy.data.objects['Head_Pivot']
ivory=bpy.data.materials['Ceramica marfim']
steel=bpy.data.materials['Titanio']
cyan=bpy.data.materials['Optica turquesa']
gold=bpy.data.materials['Latão']

def shader(material):
    return next(n for n in material.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfPrincipled')
shader(ivory).inputs['Metallic'].default_value=.22
shader(ivory).inputs['Roughness'].default_value=.34
shader(cyan).inputs['Base Color'].default_value=(.012,.38,.48,1)
shader(cyan).inputs['Emission Color'].default_value=(.015,.42,.52,1)
shader(cyan).inputs['Emission Strength'].default_value=.8
shader(cyan).inputs['Roughness'].default_value=.23
shader(bpy.data.materials['Placa de circuito']).inputs['Base Color'].default_value=(.005,.025,.018,1)

def base_y(x,z):return -.76+.12*(x/.85)**2+.035*((z-3.2)/1.1)**2

def round_outline(points,radius=.045):
    rounded=[]
    for i,p in enumerate(points):
        before=points[i-1];after=points[(i+1)%len(points)]
        d1=(before-p).length;d2=(after-p).length
        r=min(radius,d1*.22,d2*.22)
        a=p+(before-p).normalized()*r;b=p+(after-p).normalized()*r
        for k in range(5):
            t=k/4
            rounded.append(a*(1-t)**2+p*2*t*(1-t)+b*t*t)
    return rounded

prefixes=('Peitoral marfim','Painel lateral','Borda mandibular','Coroa frontal','Faixa central coroa','Monitor aro','Monitor vidro','Ponte facial','Brow_','Maxilar superior','Mandibula movel','Queixo detalhe')
refined=[]
for obj in list(bpy.data.objects):
    if obj.type!='MESH' or not obj.name.startswith(prefixes):continue
    # v2 panel generator stores center vertex first and the boundary thereafter.
    world=[obj.matrix_world@v.co for v in obj.data.vertices][1:]
    offset=sum(p.y-base_y(p.x,p.z) for p in world)/len(world)
    boundary=round_outline([Vector((p.x,0,p.z)) for p in world],.045 if not obj.name.startswith('Brow_') else .018)
    triangles=tessellate_polygon([boundary])
    verts=[];faces=[];lookup={}
    inverse=obj.matrix_world.inverted()
    def vertex(p):
        key=(round(p.x,7),round(p.z,7))
        if key not in lookup:
            lookup[key]=len(verts)
            verts.append(inverse@Vector((p.x,base_y(p.x,p.z)+offset,p.z)))
        return lookup[key]
    def split(a,b,c,depth):
        if depth:
            ab=(a+b)/2;bc=(b+c)/2;ca=(c+a)/2
            for tri in [(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)]:split(*tri,depth-1)
        else:
            normal=(b-a).cross(c-a)
            face=(vertex(a),vertex(b),vertex(c))
            faces.append(face if normal.y<0 else tuple(reversed(face)))
    for tri in triangles:
        points=[boundary[v] if isinstance(v,int) else v for v in tri]
        split(*points,2)
    data=bpy.data.meshes.new(obj.name+'_curved_v3');data.from_pydata(verts,[],faces);data.update()
    for material in obj.data.materials:data.materials.append(material)
    obj.data=data
    for face in data.polygons:face.use_smooth=True
    for modifier in list(obj.modifiers):obj.modifiers.remove(modifier)
    shell=obj.modifiers.new('Espessura de placa','SOLIDIFY');shell.thickness=.025;shell.offset=0
    bevel=obj.modifiers.new('Borda arredondada','BEVEL');bevel.width=.008;bevel.segments=3;bevel.limit_method='ANGLE'
    obj['teslo_curved_panel']=True
    refined.append(obj.name)

def add_mesh(name,verts,faces,material):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);data.materials.append(material)
    bpy.context.view_layer.update();world=obj.matrix_world.copy();obj.parent=head;obj.matrix_world=world
    for face in data.polygons:face.use_smooth=True
    return obj

# Sculpted ceramic orbital rims soften the goggle-like rings of the blockout.
for side in [-1,1]:
    x=side*.37;z=3.18;n=80;bands=6
    verts=[];faces=[]
    for band in range(bands+1):
        t=band/bands
        rx=.326*(1-t)+.267*t;rz=.272*(1-t)+.216*t
        for i in range(n):
            a=i*2*math.pi/n
            verts.append((x+rx*math.cos(a),-.788-.022*math.sin(math.pi*t),z+rz*math.sin(a)))
    for band in range(bands):
        for i in range(n):
            j=(i+1)%n;a=band*n+i;b=band*n+j
            faces.append((a,b,b+n,a+n))
    rim=add_mesh(f'Orbital_ceramica_{side}',verts,faces,ivory)
    solid=rim.modifiers.new('Espessura orbital','SOLIDIFY');solid.thickness=.014
    # Fine radial facets make the optical iris read as an engineered lens.
    verts=[];faces=[]
    for i in range(32):
        a=i*2*math.pi/32;da=.017
        start=len(verts)
        for radius,angle in [(.088,a-da),(.105,a-da),(.105,a+da),(.088,a+da)]:
            verts.append((x+radius*math.cos(angle),-.935,z+radius*math.sin(angle)))
        faces.append(tuple(range(start,start+4)))
    add_mesh(f'Detalhe_iris_radial_{side}',verts,faces,gold)

# Shrink the complete optical assembly, including both shutter shape keys,
# around each eye center. Keep their shared coverage instead of shrinking only
# the lenses and leaving oversized goggle-like sockets.
eye_prefixes=('Orbita titanio','Optica negra','Iris turquesa','Lente escura','Detalhe iris','Reflexo lente','Shutter_','Orbital_ceramica','Detalhe_iris_radial')
for obj in bpy.data.objects:
    if obj.type!='MESH' or not obj.name.startswith(eye_prefixes):continue
    bpy.context.view_layer.update()
    world=obj.matrix_world.copy();inverse=world.inverted()
    center_x=sum((world@v.co).x for v in obj.data.vertices)/len(obj.data.vertices)
    eye_x=-.37 if center_x<0 else .37
    def retarget(co):
        p=world@co
        p.x=eye_x+(p.x-eye_x)*.87;p.z=3.18+(p.z-3.18)*.87
        return inverse@p
    positions=[retarget(v.co.copy()) for v in obj.data.vertices]
    keys=[] if not obj.data.shape_keys else [(key,[retarget(v.co.copy()) for v in key.data]) for key in obj.data.shape_keys.key_blocks]
    for vertex,co in zip(obj.data.vertices,positions):vertex.co=co
    for key,values in keys:
        for vertex,co in zip(key.data,values):vertex.co=co

# Blend bevels in rigid mechanics without changing the moving shutter topology.
for obj in bpy.data.objects:
    if obj.type=='MESH' and obj.name.startswith(('Modulo temporal','Tampa temporal','Disco temporal','Coluna cervical','Articulacao ombro')):
        for face in obj.data.polygons:face.use_smooth=True
scene=bpy.context.scene
scene['stage']='Teslo v3: refinamento de superficies; ainda em desenvolvimento'
scene['refined_panels']=len(refined)
scene.cycles.samples=48
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Teslo_v3_refinement.blend'))
for frame,name in [(1,'neutro'),(30,'cochilo'),(60,'mandibula')]:
    scene.frame_set(frame);scene.render.filepath=str(OUT/f'Teslo_v3_{name}.png');bpy.ops.render.render(write_still=True)
print('Teslo v3: paineis refinados:',len(refined))
