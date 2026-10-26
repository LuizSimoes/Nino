"""Checks v3 saved geometry, closed optical coverage and preserved articulation."""
from pathlib import Path
import bpy
from mathutils import Vector

root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'outputs/android/refinement-v3/Teslo_v3_refinement.blend'))
scene=bpy.context.scene
assert scene['refined_panels']==16
for name in ['Head_Pivot','Jaw_Pivot','Forehead_Display','Monitor vidro']:
    assert bpy.data.objects.get(name),name
assert len([o for o in scene.objects if o.name.startswith('Orbital_ceramica')])==2
assert len([o for o in scene.objects if o.name.startswith('Detalhe_iris_radial')])==2
lids=[o for o in scene.objects if o.name.startswith('Shutter_')]
assert len(lids)==4
off=[o for o in scene.objects if o.name.startswith('Cochilo_Off_')]
trace=bpy.data.objects['DeBoa_Linha']
chin=bpy.data.objects['Mandibula movel']
def center_z(obj):
    bpy.context.view_layer.update()
    return sum((obj.matrix_world@Vector(p)).z for p in obj.bound_box)/8
scene.frame_set(1)
neutral=center_z(chin)
assert all(o.data.shape_keys.key_blocks['Closed'].value==0 for o in lids)
assert not trace.hide_render and all(o.hide_render for o in off)
scene.frame_set(30)
assert all(o.data.shape_keys.key_blocks['Closed'].value==1 for o in lids)
assert trace.hide_render and all(not o.hide_render for o in off)
for lid in lids:
    closed=lid.data.shape_keys.key_blocks['Closed'].data
    width=max(v.co.x for v in closed)-min(v.co.x for v in closed)
    height=max(v.co.z for v in closed)-min(v.co.z for v in closed)
    assert width>.44 and height>.19,'Obturador reduzido deve continuar cobrindo lente'
    assert min(v.co.y for v in closed)<-.93,'Obturador deve ficar a frente da lente'
scene.frame_set(60)
assert center_z(chin)<neutral
scene.frame_set(90)
assert abs(center_z(chin)-neutral)<.00001
assert all(o.data.shape_keys.key_blocks['Closed'].value==0 for o in lids)
assert not trace.hide_render and all(o.hide_render for o in off)
print('Teslo v3: 16 paineis, optica, quatro obturadores, repouso e mandibula aprovados.')
