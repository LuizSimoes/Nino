"""Create a reversible mouth-focused refinement from Nino v2."""

from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(bpy.data.filepath).resolve().parents[2]
OUT = ROOT / "outputs" / "3d"
SOURCE = OUT / "Nino_v2_refined.blend"
BLEND_PATH = OUT / "Nino_v3_mouth_refined.blend"
GLB_PATH = OUT / "Nino_v3_mouth_refined.glb"
PREVIEW_DIR = OUT / "mouth_refined_expressions"
MANIFEST_PATH = OUT / "Nino_v3_mouth_refined_manifest.json"
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

if not bpy.data.filepath or Path(bpy.data.filepath).resolve() != SOURCE.resolve():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))

scene = bpy.context.scene
arm = bpy.data.objects["Nino_Rig"]

MOODS = [
    "presente", "curioso", "eureka", "pensando", "cochilando",
    "concentrado", "confuso", "acolhedor", "orgulhoso",
]

FACES = {
    "presente": ({"smile": 0.62}, {}),
    "curioso": ({"O": 0.52, "smile": 0.08}, {"squint_R": 0.22}),
    "eureka": ({"smile_wide": 0.52, "jaw_open": 0.84, "A": 0.52}, {"squint_L": 0.72, "squint_R": 0.72}),
    "pensando": ({"frown": 0.34, "U": 0.12}, {"squint_L": 0.12}),
    "cochilando": ({"jaw_open": 0.78, "O": 0.62}, {"blink_L": 1.0, "blink_R": 1.0}),
    "concentrado": ({"MBP": 0.48}, {"squint_L": 0.58, "squint_R": 0.58}),
    "confuso": ({"frown": 0.40, "O": 0.10}, {"squint_L": 0.10, "squint_R": 0.34}),
    "acolhedor": ({"smile": 0.68}, {"squint_L": 0.32, "squint_R": 0.32}),
    "orgulhoso": ({"smile": 0.56, "smile_wide": 0.10}, {"squint_L": 0.18, "squint_R": 0.18}),
}


def srgb(hex_color: str) -> tuple[float, float, float, float]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def curve_object(name: str, points, bevel_depth: float, material: bpy.types.Material) -> bpy.types.Object:
    existing = bpy.data.objects.get(name)
    if existing:
        bpy.data.objects.remove(existing, do_unlink=True)
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 8
    data.bevel_resolution = 4
    data.bevel_depth = bevel_depth
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def parent_to_bone(obj: bpy.types.Object, bone_name: str) -> None:
    world = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def refine_mouth() -> bpy.types.Object:
    mouth = bpy.data.objects["Mouth"]
    # The old flattened sphere read as a thick lip. Keep it as a dark cavity,
    # but turn the neutral state into a narrow, soft canine mouth opening.
    mouth.scale = (0.62, 0.60, 0.085)
    mouth.matrix_world.translation.z = 5.735

    # Exaggerate only the vertical deltas of open-mouth shapes. This keeps the
    # neutral/smile/frown states line-like while preserving readable speech.
    blocks = mouth.data.shape_keys.key_blocks
    basis = blocks["Basis"]
    for key_name in ("jaw_open", "A", "O", "U", "L"):
        key = blocks.get(key_name)
        if not key:
            continue
        for point, base in zip(key.data, basis.data):
            point.co.z = base.co.z + (point.co.z - base.co.z) * 3.15

    cavity = bpy.data.materials["Mouth_Cavity"]
    cavity.diffuse_color = srgb("#160B0D")
    principled = next((node for node in cavity.node_tree.nodes if node.bl_idname == "ShaderNodeBsdfPrincipled"), None)
    if principled:
        principled.inputs["Base Color"].default_value = srgb("#160B0D")
        principled.inputs["Roughness"].default_value = 0.64
        specular = principled.inputs.get("Specular IOR Level")
        if specular:
            specular.default_value = 0.28

    old_line = bpy.data.objects.get("Mouth_Lower_Line")
    if old_line:
        bpy.data.objects.remove(old_line, do_unlink=True)

    for name in ("Smile_L", "Smile_R"):
        line = bpy.data.objects.get(name)
        if line and line.type == "CURVE":
            line.data.bevel_depth = 0.022
    return mouth


def apply_face(slug: str) -> None:
    mouth_keys = bpy.data.objects["Mouth"].data.shape_keys.key_blocks
    left_keys = bpy.data.objects["EyeWhite_L"].data.shape_keys.key_blocks
    right_keys = bpy.data.objects["EyeWhite_R"].data.shape_keys.key_blocks
    for blocks in (mouth_keys, left_keys, right_keys):
        for block in blocks:
            if block.name != "Basis":
                block.value = 0.0
    mouth_values, eye_values = FACES[slug]
    for name, value in mouth_values.items():
        if name in mouth_keys:
            mouth_keys[name].value = value
    if "blink_L" in eye_values:
        left_keys["blink_L"].value = eye_values["blink_L"]
    if "blink_R" in eye_values:
        right_keys["blink_R"].value = eye_values["blink_R"]
    if "squint_L" in eye_values:
        left_keys["squint"].value = eye_values["squint_L"]
    if "squint_R" in eye_values:
        right_keys["squint"].value = eye_values["squint_R"]


refined_mouth = refine_mouth()
original_path = scene.render.filepath
for mood in MOODS:
    arm.animation_data.action = bpy.data.actions.get(f"mood_{mood}")
    scene.frame_set(24)
    apply_face(mood)
    bpy.context.view_layer.update()
    scene.render.filepath = str(PREVIEW_DIR / f"Nino_{mood}.png")
    bpy.ops.render.render(write_still=True)

arm.animation_data.action = bpy.data.actions.get("mood_presente")
scene.frame_set(24)
apply_face("presente")
scene.render.filepath = original_path

manifest = {
    "character": "Nino v3 mouth refinement",
    "source": BLEND_PATH.name,
    "derived_from": SOURCE.name,
    "changes": [
        "narrower and darker mouth cavity",
        "subtle lower mouth contour",
        "thinner smile creases",
        "rebalanced speech and emotion shape-key values",
    ],
    "expressions": [
        {"id": mood, "action": f"mood_{mood}", "preview": f"mouth_refined_expressions/Nino_{mood}.png"}
        for mood in MOODS
    ],
}
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
for obj in bpy.data.objects:
    if obj.parent == arm:
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
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
print(f"NINO_MOUTH_OK blend={BLEND_PATH} glb={GLB_PATH} previews={PREVIEW_DIR}")
