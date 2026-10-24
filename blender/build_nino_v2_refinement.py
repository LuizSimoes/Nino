"""Refine Nino's blockout while preserving the approved v1 files.

Adds subtle fur surface detail, a softer canine silhouette, a smaller mouth,
and wrist IK controls driven by the existing nine mood actions.
"""

from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector


# The script can run from Blender's console, where ``__file__`` is not set.
# Both the source and generated .blend files live in outputs/3d, so the open
# scene provides a stable project-root anchor.
ROOT = Path(bpy.data.filepath).resolve().parents[2]
OUT = ROOT / "outputs" / "3d"
SOURCE = OUT / "Nino_v1_expressions.blend"
BLEND_PATH = OUT / "Nino_v2_refined.blend"
GLB_PATH = OUT / "Nino_v2_refined.glb"
PREVIEW_DIR = OUT / "refined_expressions"
MANIFEST_PATH = OUT / "Nino_v2_refined_manifest.json"
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
    "presente": ({"smile": 0.58}, {}),
    "curioso": ({"O": 0.30, "smile": 0.16}, {"squint_R": 0.22}),
    "eureka": ({"smile_wide": 0.90, "jaw_open": 0.56, "A": 0.40}, {"squint_L": 0.72, "squint_R": 0.72}),
    "pensando": ({"frown": 0.40, "U": 0.16}, {"squint_L": 0.12}),
    "cochilando": ({"jaw_open": 0.23, "O": 0.24}, {"blink_L": 1.0, "blink_R": 1.0}),
    "concentrado": ({"MBP": 0.50}, {"squint_L": 0.58, "squint_R": 0.58}),
    "confuso": ({"frown": 0.48, "O": 0.12}, {"squint_L": 0.10, "squint_R": 0.34}),
    "acolhedor": ({"smile": 0.82}, {"squint_L": 0.32, "squint_R": 0.32}),
    "orgulhoso": ({"smile": 0.68, "smile_wide": 0.16}, {"squint_L": 0.18, "squint_R": 0.18}),
}


def remove_unfinished_primitives() -> None:
    """Remove an unmaterialed sphere left by an interrupted console run."""
    for obj in list(bpy.data.objects):
        materials = getattr(obj.data, "materials", ()) if getattr(obj, "data", None) else ()
        localized_sphere = obj.name.startswith(("Esfera UV", "UV Sphere"))
        if obj.type == "MESH" and localized_sphere and not materials and obj.matrix_world.translation.z > 8.0:
            bpy.data.objects.remove(obj, do_unlink=True)


def smooth(obj: bpy.types.Object) -> None:
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def parent_to_bone(obj: bpy.types.Object, bone_name: str) -> None:
    world = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def add_ellipsoid(name: str, location, scale, material, bone_name: str, rotation=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    existing = bpy.data.objects.get(name)
    if existing:
        return existing
    bpy.ops.mesh.primitive_uv_sphere_add(segments=36, ring_count=22, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth(obj)
    obj.data.materials.append(material)
    parent_to_bone(obj, bone_name)
    return obj


def refine_materials() -> None:
    for material_name in ("Fur_Golden", "Fur_Highlight", "Fur_Shadow", "Fur_Cream"):
        mat = bpy.data.materials.get(material_name)
        if not mat or not mat.use_nodes:
            continue
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        principled = next((node for node in nodes if node.bl_idname == "ShaderNodeBsdfPrincipled"), None)
        if not principled:
            continue
        tex = nodes.get("Nino Fur Coordinates") or nodes.new("ShaderNodeTexCoord")
        tex.name = "Nino Fur Coordinates"
        noise = nodes.get("Nino Fur Microtexture") or nodes.new("ShaderNodeTexNoise")
        noise.name = "Nino Fur Microtexture"
        noise.inputs["Scale"].default_value = 7.5
        noise.inputs["Detail"].default_value = 5.0
        noise.inputs["Roughness"].default_value = 0.72
        bump = nodes.get("Nino Fur Bump") or nodes.new("ShaderNodeBump")
        bump.name = "Nino Fur Bump"
        bump.inputs["Strength"].default_value = 0.065
        bump.inputs["Distance"].default_value = 0.035
        if not noise.inputs["Vector"].is_linked:
            links.new(tex.outputs["Generated"], noise.inputs["Vector"])
        if not bump.inputs["Height"].is_linked:
            links.new(noise.outputs["Fac"], bump.inputs["Height"])
        normal = principled.inputs.get("Normal")
        if normal and not normal.is_linked:
            links.new(bump.outputs["Normal"], normal)
        coat = principled.inputs.get("Coat Weight")
        if coat:
            coat.default_value = 0.10
        coat_roughness = principled.inputs.get("Coat Roughness")
        if coat_roughness:
            coat_roughness.default_value = 0.48


def refine_face_and_silhouette() -> list[bpy.types.Object]:
    mouth = bpy.data.objects["Mouth"]
    mouth.scale = (0.82, 0.92, 0.74)
    mouth.matrix_world.translation.z += 0.075
    for name in ("Brow_L", "Brow_R"):
        brow = bpy.data.objects.get(name)
        if brow and brow.type == "CURVE":
            brow.data.bevel_depth = 0.038

    fur = bpy.data.materials["Fur_Golden"]
    shadow = bpy.data.materials["Fur_Shadow"]
    new_parts = [
        # A short asymmetric forelock avoids the crown-like silhouette rejected
        # in the earlier concept while keeping the head from reading as bald.
        add_ellipsoid("Forelock_A", (-0.08, -0.17, 8.34), (0.15, 0.14, 0.29), fur, "head", rotation=(0.0, -0.48, -0.08)),
        add_ellipsoid("Forelock_B", (0.14, -0.15, 8.29), (0.12, 0.12, 0.23), fur, "head", rotation=(0.0, -0.58, -0.06)),
        add_ellipsoid("Ear_Inner_L", (-1.94, -0.79, 6.43), (0.28, 0.055, 0.67), shadow, "ear_L_1", rotation=(0.07, -0.12, -0.12)),
        add_ellipsoid("Ear_Inner_R", (1.94, -0.79, 6.43), (0.28, 0.055, 0.67), shadow, "ear_R_1", rotation=(0.07, 0.12, 0.12)),
    ]
    return new_parts


def capture_wrist_positions() -> dict[str, dict[str, Vector]]:
    captured: dict[str, dict[str, Vector]] = {}
    arm.animation_data_create()
    for slug in MOODS:
        action = bpy.data.actions.get(f"mood_{slug}")
        if not action:
            continue
        arm.animation_data.action = action
        scene.frame_set(24)
        bpy.context.view_layer.update()
        captured[slug] = {
            side: arm.pose.bones[f"forearm_{side}"].tail.copy()
            for side in ("L", "R")
        }
    arm.animation_data.action = None
    scene.frame_set(1)
    bpy.context.view_layer.update()
    return captured


def add_ik_controls(captured: dict[str, dict[str, Vector]]) -> None:
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for side in ("L", "R"):
        forearm = arm.data.edit_bones[f"forearm_{side}"]
        wrist = forearm.tail.copy()
        target_name = f"hand_ik_{side}"
        pole_name = f"elbow_pole_{side}"
        target = arm.data.edit_bones.get(target_name) or arm.data.edit_bones.new(target_name)
        target.head = wrist
        target.tail = wrist + Vector((0.0, 0.0, 0.34))
        target.parent = arm.data.edit_bones["root"]
        target.use_connect = False
        target.use_deform = False
        sx = -1.0 if side == "L" else 1.0
        pole = arm.data.edit_bones.get(pole_name) or arm.data.edit_bones.new(pole_name)
        pole.head = Vector((1.82 * sx, -1.85, 3.78))
        pole.tail = pole.head + Vector((0.0, 0.0, 0.30))
        pole.parent = arm.data.edit_bones["root"]
        pole.use_connect = False
        pole.use_deform = False
    bpy.ops.object.mode_set(mode="POSE")
    for side in ("L", "R"):
        forearm = arm.pose.bones[f"forearm_{side}"]
        for constraint in list(forearm.constraints):
            if constraint.name == f"Nino Wrist IK {side}":
                forearm.constraints.remove(constraint)
        ik = forearm.constraints.new("IK")
        ik.name = f"Nino Wrist IK {side}"
        ik.target = arm
        ik.subtarget = f"hand_ik_{side}"
        ik.chain_count = 2
        ik.influence = 1.0
    bpy.ops.object.mode_set(mode="OBJECT")

    # The target bones inherit the root's axes, so their location channels are
    # simple offsets from the rest wrist position.
    arm.animation_data_create()
    for slug, wrists in captured.items():
        action = bpy.data.actions.get(f"mood_{slug}")
        if not action:
            continue
        arm.animation_data.action = action
        for side in ("L", "R"):
            control = arm.pose.bones[f"hand_ik_{side}"]
            rest = arm.data.bones[f"hand_ik_{side}"].head_local
            desired = wrists[side]
            for frame, factor in ((1, 0.0), (14, 1.0), (34, 1.0), (48, 0.0)):
                control.location = (desired - rest) * factor
                control.keyframe_insert("location", frame=frame, group=control.name)
        arm.animation_data.action = None
    arm["rig_status"] = "refined_blockout_with_wrist_ik"
    arm["ik_controls"] = "hand_ik_L,hand_ik_R,elbow_pole_L,elbow_pole_R"


def apply_face(slug: str) -> None:
    mouth_keys = bpy.data.objects["Mouth"].data.shape_keys.key_blocks
    left_keys = bpy.data.objects["EyeWhite_L"].data.shape_keys.key_blocks
    right_keys = bpy.data.objects["EyeWhite_R"].data.shape_keys.key_blocks
    for blocks in (mouth_keys, left_keys, right_keys):
        for block in blocks:
            if block.name != "Basis":
                block.value = 0.0
    mouth, eyes = FACES[slug]
    for name, value in mouth.items():
        if name in mouth_keys:
            mouth_keys[name].value = value
    if "blink_L" in eyes:
        left_keys["blink_L"].value = eyes["blink_L"]
    if "blink_R" in eyes:
        right_keys["blink_R"].value = eyes["blink_R"]
    if "squint_L" in eyes:
        left_keys["squint"].value = eyes["squint_L"]
    if "squint_R" in eyes:
        right_keys["squint"].value = eyes["squint_R"]


remove_unfinished_primitives()
captured_wrists = capture_wrist_positions()
refine_materials()
new_parts = refine_face_and_silhouette()
add_ik_controls(captured_wrists)

original_path = scene.render.filepath
for mood in MOODS:
    action = bpy.data.actions.get(f"mood_{mood}")
    arm.animation_data.action = action
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
    "character": "Nino v2 refined blockout",
    "source": BLEND_PATH.name,
    "derived_from": SOURCE.name,
    "refinements": [
        "smaller mouth",
        "thinner brows",
        "subtle procedural fur bump",
        "short asymmetric forelock",
        "inner-ear volumes",
        "wrist IK controls keyed in nine mood actions",
    ],
    "ik_controls": ["hand_ik_L", "hand_ik_R", "elbow_pole_L", "elbow_pole_R"],
    "expressions": [
        {"id": mood, "action": f"mood_{mood}", "preview": f"refined_expressions/Nino_{mood}.png"}
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
print(f"NINO_REFINEMENT_OK blend={BLEND_PATH} glb={GLB_PATH} previews={PREVIEW_DIR}")
