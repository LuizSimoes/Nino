"""Run in Blender against the saved blockout, without modifying it."""
from pathlib import Path
import bpy

path=Path(__file__).resolve().parents[1]/'outputs/android/blockout/Android_v1_blockout.blend'
bpy.ops.wm.open_mainfile(filepath=str(path))
scene=bpy.context.scene
for name in ['Android_Root','Head_Pivot','Jaw_Pivot','Eyelid_Pivot_L','Eyelid_Pivot_R','Forehead_Display']:
    assert bpy.data.objects.get(name), f'Controle ausente: {name}'
lids=[o for o in scene.objects if o.name.startswith('Palpebra opaca')]
assert len(lids)==2
scene.frame_set(1)
assert all(o.dimensions.z < .03 for o in lids)
jaw=bpy.data.objects['Mandibula movel']
neutral=jaw.matrix_world.translation.z
scene.frame_set(30)
assert all(o.dimensions.z >= .5 for o in lids), 'Palpebras nao cobrem as lentes'
scene.frame_set(60)
assert jaw.matrix_world.translation.z < neutral, 'Mandibula deve abrir para baixo'
assert bpy.data.objects['Jaw_Pivot'].rotation_euler.x > 0
print('Android: hierarquia, duas palpebras opacas e abertura inferior da mandibula aprovadas.')
