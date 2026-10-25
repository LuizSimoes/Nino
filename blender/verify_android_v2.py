"""Read back v2 and check articulation and state visibility, without saving."""
from pathlib import Path
import bpy
from mathutils import Vector

path=Path(__file__).resolve().parents[1]/'outputs/android/refinement-v2/Android_v2_refinement.blend'
bpy.ops.wm.open_mainfile(filepath=str(path))
scene=bpy.context.scene
for name in ['Android_Root','Head_Pivot','Jaw_Pivot','Forehead_Display','Monitor vidro']:
    assert bpy.data.objects.get(name),name
lids=[o for o in scene.objects if o.name.startswith('Shutter_')]
assert len(lids)==4,'Duas pecas por olho'
off=[o for o in scene.objects if o.name.startswith('Cochilo_Off_')]
assert len(off)==2
trace=bpy.data.objects['DeBoa_Linha']
chin=bpy.data.objects['Mandibula movel']
def center_z(obj):
    bpy.context.view_layer.update()
    return sum((obj.matrix_world@Vector(v)).z for v in obj.bound_box)/8
scene.frame_set(1)
assert all(o.data.shape_keys.key_blocks['Closed'].value==0 for o in lids)
assert not trace.hide_render and all(o.hide_render for o in off)
neutral=center_z(chin)
scene.frame_set(30)
assert all(o.data.shape_keys.key_blocks['Closed'].value==1 for o in lids)
assert trace.hide_render and all(not o.hide_render for o in off)
for o in lids:
    verts=o.data.shape_keys.key_blocks['Closed'].data
    assert max(v.co.x for v in verts)-min(v.co.x for v in verts)>.5
    assert max(v.co.z for v in verts)-min(v.co.z for v in verts)>.21
scene.frame_set(60)
assert center_z(chin)<neutral,'Mandibula abre para baixo'
scene.frame_set(90)
assert abs(center_z(chin)-neutral)<.00001
assert all(o.data.shape_keys.key_blocks['Closed'].value==0 for o in lids)
assert not trace.hide_render and all(o.hide_render for o in off)
print('Android v2: quatro obturadores, simbolo off, retorno ao repouso e mandibula aprovados.')
