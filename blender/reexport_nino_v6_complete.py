"""Re-export Nino v6 including every visible descendant of the rig."""

from pathlib import Path

import bpy


ROOT = Path(bpy.data.filepath).resolve().parents[2]
OUT = ROOT / "outputs" / "3d"
SOURCE = OUT / "Nino_v6_pendant_legible.blend"
GLB_PATH = OUT / "Nino_v6_pendant_legible.glb"

if Path(bpy.data.filepath).resolve() != SOURCE.resolve():
    raise RuntimeError(f"Open {SOURCE.name} before running this script")

arm = bpy.data.objects["Nino_Rig"]


def descends_from_rig(obj: bpy.types.Object) -> bool:
    parent = obj.parent
    while parent:
        if parent == arm:
            return True
        parent = parent.parent
    return False


bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
for obj in bpy.data.objects:
    if obj.name != "Pendant_Light" and not obj.hide_render and descends_from_rig(obj):
        obj.select_set(True)

bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_skins=True,
    export_morph=True,
    export_apply=False,
)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
print(f"NINO_V6_COMPLETE_EXPORT_OK glb={GLB_PATH}")
