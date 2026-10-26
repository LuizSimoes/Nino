"""Export neutral Teslo geometry; runtime owns screens and rigid expressions."""
from pathlib import Path
import sys
import bpy

root=Path(__file__).resolve().parents[1]
version='v3' if '--v3' in sys.argv else 'v2'
source=f'outputs/android/refinement-{version}/'+('Teslo_v3_refinement.blend' if version=='v3' else 'Android_v2_refinement.blend')
bpy.ops.wm.open_mainfile(filepath=str(root/source))
bpy.context.scene.frame_set(1)
for obj in list(bpy.data.objects):
    if obj.type in {'CAMERA','LIGHT'} or obj.name.startswith(('Grade ','DeBoa_','Cochilo_Off_')):
        bpy.data.objects.remove(obj,do_unlink=True)
        continue
    obj.animation_data_clear()
    if obj.type=='MESH' and obj.data.shape_keys:
        obj.data.shape_keys.animation_data_clear()
        obj.data.shape_keys.key_blocks['Closed'].value=0
    obj.hide_render=False
    obj.hide_set(False)
out=root/f'public/models/teslo-{version}.glb'
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_morph=True,export_extras=True)
print('Teslo exportado:',out)
