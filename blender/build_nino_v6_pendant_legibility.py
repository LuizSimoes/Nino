"""Improve pendant icon legibility while preserving Nino v5."""

from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(bpy.data.filepath).resolve().parents[2]
OUT = ROOT / "outputs" / "3d"
SOURCE = OUT / "Nino_v5_runtime_ready.blend"
BLEND_PATH = OUT / "Nino_v6_pendant_legible.blend"
GLB_PATH = OUT / "Nino_v6_pendant_legible.glb"
MANIFEST_PATH = OUT / "Nino_v6_pendant_legible_manifest.json"
PREVIEW_DIR = OUT / "pendant_v6_previews"
FULL_DIR = PREVIEW_DIR / "full"
CLOSE_DIR = PREVIEW_DIR / "close"
FULL_DIR.mkdir(parents=True, exist_ok=True)
CLOSE_DIR.mkdir(parents=True, exist_ok=True)

if Path(bpy.data.filepath).resolve() != SOURCE.resolve():
    raise RuntimeError(f"Open {SOURCE.name} before running this script")

scene = bpy.context.scene
arm = bpy.data.objects["Nino_Rig"]
cavity = bpy.data.objects["Mouth_Cavity_V4"]
tongue = bpy.data.objects.get("Tongue_V4")
sleep_group = bpy.data.objects["SleepEyes_Group"]
eye_detail_groups = {
    "L": bpy.data.objects["EyeDetailGroup_L"],
    "R": bpy.data.objects["EyeDetailGroup_R"],
}

MOODS = [
    "presente", "curioso", "eureka", "pensando", "cochilando",
    "concentrado", "confuso", "acolhedor", "orgulhoso",
]

# Per-symbol geometry sizing makes every glyph occupy roughly two thirds of
# the screen.  The visibility group must stay at scale 1 while visible;
# scaling that group also moves bone-parented children away from the pendant.
ICON_GEOMETRY_SCALES = {
    "presente": 1.20,
    "curioso": 1.44,
    "eureka": 1.26,
    "pensando": 1.38,
    "cochilando": 1.38,
    "concentrado": 1.30,
    "confuso": 1.42,
    "acolhedor": 1.36,
    "orgulhoso": 1.34,
}

FACES = {
    "presente": ({"closed": 1.0, "smile": 0.42}, {}),
    "curioso": ({"O": 0.34, "smile": 0.10}, {"squint_R": 0.22}),
    "eureka": ({"smile_wide": 0.50, "jaw_open": 0.54, "A": 0.20}, {"squint_L": 0.72, "squint_R": 0.72}),
    "pensando": ({"frown": 0.36, "U": 0.12}, {"squint_L": 0.12}),
    "cochilando": ({"jaw_open": 0.23, "O": 0.38}, {"blink_L": 1.0, "blink_R": 1.0}),
    "concentrado": ({"closed": 1.0, "MBP": 0.72}, {"squint_L": 0.58, "squint_R": 0.58}),
    "confuso": ({"frown": 0.42, "O": 0.10}, {"squint_L": 0.10, "squint_R": 0.34}),
    "acolhedor": ({"closed": 1.0, "smile": 0.62}, {"squint_L": 0.32, "squint_R": 0.32}),
    "orgulhoso": ({"closed": 1.0, "smile": 0.50}, {"squint_L": 0.18, "squint_R": 0.18}),
}


def set_material_emission(name: str, color, strength: float) -> None:
    mat = bpy.data.materials[name]
    mat.diffuse_color = (*color, 1.0)
    shader = next((node for node in mat.node_tree.nodes if node.bl_idname == "ShaderNodeBsdfPrincipled"), None)
    if not shader:
        return
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    emission = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
    if emission:
        emission.default_value = (*color, 1.0)
    emission_strength = shader.inputs.get("Emission Strength")
    if emission_strength:
        emission_strength.default_value = strength


def refine_pendant() -> None:
    for name in ("Pendant_Case", "Pendant_Ring"):
        obj = bpy.data.objects.get(name)
        if obj:
            obj.scale = tuple(value * 1.12 for value in obj.scale)

    # The original central glow sat behind every glyph and obscured its shape.
    original_light = bpy.data.objects.get("Pendant_Light")
    if original_light:
        original_light.hide_render = True
        original_light.hide_viewport = True
        original_light.scale = (0.001, 0.001, 0.001)

    set_material_emission("Pendant_Icon_Cyan", (0.03, 0.96, 0.91), 4.4)
    set_material_emission("Pendant_Icon_Gold", (1.00, 0.42, 0.025), 4.8)
    set_material_emission("Pendant_Icon_Pink", (1.00, 0.10, 0.32), 4.4)


def rebuild_pendant_actions() -> dict[str, bpy.types.Object]:
    groups = {slug: bpy.data.objects[f"PendantIcon_{slug}"] for slug in MOODS}
    for slug, group in groups.items():
        geometry_scale = ICON_GEOMETRY_SCALES[slug]
        for child in group.children:
            # Several legacy icon meshes/curves were authored with their
            # geometry in world coordinates and their object origin at zero.
            # Scaling the object therefore moves the glyph.  Scaling the data
            # around its own bounding-box centre keeps it locked to the screen.
            if child.type in {"MESH", "CURVE"} and hasattr(child.data, "transform"):
                corners = [Vector(corner) for corner in child.bound_box]
                center = sum(corners, Vector()) / len(corners)
                transform = (
                    Matrix.Translation(center)
                    @ Matrix.Scale(geometry_scale, 4)
                    @ Matrix.Translation(-center)
                )
                child.data.transform(transform)
                if hasattr(child.data, "update"):
                    child.data.update()
            else:
                child.scale = tuple(value * geometry_scale for value in child.scale)
        action_name = f"mood_{slug}_pendant"
        old = bpy.data.actions.get(action_name)
        if old:
            bpy.data.actions.remove(old)
        action = bpy.data.actions.new(action_name)
        action.use_fake_user = True
        group.animation_data_create()
        group.animation_data.action = action
        for frame, value in ((1, 0.001), (14, 1.0), (34, 1.0), (48, 0.001)):
            group.scale = (value, value, value)
            group.keyframe_insert("scale", frame=frame)
        action.frame_start = 1
        action.frame_end = 48
        group.animation_data.action = None
        group.scale = (0.001, 0.001, 0.001)
    return groups


def reset_face() -> None:
    for obj in (cavity, bpy.data.objects["EyeWhite_L"], bpy.data.objects["EyeWhite_R"]):
        for key in obj.data.shape_keys.key_blocks:
            if key.name != "Basis":
                key.value = 0.0
    if tongue:
        tongue.scale = (0.001, 0.001, 0.001)


def apply_face(slug: str) -> None:
    reset_face()
    mouth_values, eye_values = FACES[slug]
    for name, value in mouth_values.items():
        cavity.data.shape_keys.key_blocks[name].value = value
    left = bpy.data.objects["EyeWhite_L"].data.shape_keys.key_blocks
    right = bpy.data.objects["EyeWhite_R"].data.shape_keys.key_blocks
    if "blink_L" in eye_values:
        left["blink_L"].value = eye_values["blink_L"]
    if "blink_R" in eye_values:
        right["blink_R"].value = eye_values["blink_R"]
    if "squint_L" in eye_values:
        left["squint"].value = eye_values["squint_L"]
    if "squint_R" in eye_values:
        right["squint"].value = eye_values["squint_R"]
    if tongue and slug in {"eureka", "cochilando"}:
        amount = 0.78 if slug == "eureka" else 0.30
        tongue.scale = (amount, amount, amount)


def apply_state(slug: str, groups: dict[str, bpy.types.Object]) -> None:
    for mood, group in groups.items():
        value = 1.0 if mood == slug else 0.001
        group.scale = (value, value, value)
    sleeping = slug == "cochilando"
    lid_value = 1.0 if sleeping else 0.001
    detail_value = 0.001 if sleeping else 1.0
    sleep_group.scale = (lid_value, lid_value, lid_value)
    for group in eye_detail_groups.values():
        group.scale = (detail_value, detail_value, detail_value)


def track_camera(camera: bpy.types.Object, point) -> None:
    direction = Vector(point) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


refine_pendant()
groups = rebuild_pendant_actions()

camera = scene.camera
camera_matrix = camera.matrix_world.copy()
camera_lens = camera.data.lens
resolution = (scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage)
original_path = scene.render.filepath

# Full-body renders prove the symbols remain readable at the real character size.
scene.render.resolution_x = 720
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
for slug in MOODS:
    arm.animation_data.action = bpy.data.actions.get(f"mood_{slug}")
    scene.frame_set(24)
    apply_face(slug)
    apply_state(slug, groups)
    scene.render.filepath = str(FULL_DIR / f"Nino_{slug}.png")
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)

# Pendant close-ups check the shape of each glyph independently.
scene.render.resolution_x = 720
scene.render.resolution_y = 720
camera.location = (0.0, -10.8, 5.05)
camera.data.lens = 92
track_camera(camera, (0.0, -0.30, 4.62))
for slug in MOODS:
    arm.animation_data.action = bpy.data.actions.get(f"mood_{slug}")
    scene.frame_set(24)
    apply_face(slug)
    apply_state(slug, groups)
    scene.render.filepath = str(CLOSE_DIR / f"Nino_{slug}_pendant.png")
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)

camera.matrix_world = camera_matrix
camera.data.lens = camera_lens
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = resolution
scene.render.filepath = original_path
arm.animation_data.action = bpy.data.actions.get("mood_presente")
scene.frame_set(24)
apply_face("presente")
apply_state("presente", groups)

arm["pendant_version"] = "v6_high_contrast_legible_icons"
arm["pendant_icon_geometry_scales"] = json.dumps(ICON_GEOMETRY_SCALES, ensure_ascii=False)

manifest = {
    "character": "Nino v6 pendant legibility",
    "source": BLEND_PATH.name,
    "derived_from": SOURCE.name,
    "changes": [
        "pendant case and ring enlarged by 12 percent",
        "legacy central glow hidden to remove visual competition",
        "individual icon sizing for consistent screen coverage",
        "higher-contrast emissive cyan, gold and pink materials",
        "nine full-body and nine close-up validation renders",
    ],
    "icon_geometry_scales": ICON_GEOMETRY_SCALES,
}
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)


def descends_from_rig(obj: bpy.types.Object) -> bool:
    parent = obj.parent
    while parent:
        if parent == arm:
            return True
        parent = parent.parent
    return False


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
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
print(f"NINO_V6_PENDANT_OK blend={BLEND_PATH} glb={GLB_PATH} previews={PREVIEW_DIR}")
