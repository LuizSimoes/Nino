"""Prepare Nino v4 for runtime review: speech and pendant mood icons."""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(bpy.data.filepath).resolve().parents[2]
OUT = ROOT / "outputs" / "3d"
SOURCE = OUT / "Nino_v4_mouth_rebuild.blend"
BLEND_PATH = OUT / "Nino_v5_runtime_ready.blend"
GLB_PATH = OUT / "Nino_v5_runtime_ready.glb"
MANIFEST_PATH = OUT / "Nino_v5_runtime_ready_manifest.json"
PREVIEW_DIR = OUT / "runtime_v5_previews"
PENDANT_DIR = PREVIEW_DIR / "pendant"
TALK_DIR = PREVIEW_DIR / "talk"
PENDANT_DIR.mkdir(parents=True, exist_ok=True)
TALK_DIR.mkdir(parents=True, exist_ok=True)

if Path(bpy.data.filepath).resolve() != SOURCE.resolve():
    raise RuntimeError(f"Open {SOURCE.name} before running this script")

scene = bpy.context.scene
arm = bpy.data.objects["Nino_Rig"]
cavity = bpy.data.objects["Mouth_Cavity_V4"]

MOODS = [
    "presente", "curioso", "eureka", "pensando", "cochilando",
    "concentrado", "confuso", "acolhedor", "orgulhoso",
]

ICON_LABELS = {
    "presente": "ponto ciano",
    "curioso": "?",
    "eureka": "lâmpada dourada com raios",
    "pensando": "reticências",
    "cochilando": "Z",
    "concentrado": "alvo",
    "confuso": "? inclinado",
    "acolhedor": "coração",
    "orgulhoso": "estrela",
}


def material(name: str, color, emission_strength: float) -> bpy.types.Material:
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = next((node for node in mat.node_tree.nodes if node.bl_idname == "ShaderNodeBsdfPrincipled"), None)
    if shader:
        shader.inputs["Base Color"].default_value = (*color, 1.0)
        emission = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
        if emission:
            emission.default_value = (*color, 1.0)
        strength = shader.inputs.get("Emission Strength")
        if strength:
            strength.default_value = emission_strength
        shader.inputs["Roughness"].default_value = 0.32
    return mat


CYAN = material("Pendant_Icon_Cyan", (0.23, 0.96, 0.92), 2.3)
GOLD = material("Pendant_Icon_Gold", (1.00, 0.57, 0.08), 2.7)
PINK = material("Pendant_Icon_Pink", (1.00, 0.29, 0.46), 2.2)


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


def parent_keep_world(obj: bpy.types.Object, parent: bpy.types.Object) -> None:
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world


def remove_prefixed(prefix: str) -> None:
    for obj in list(bpy.data.objects):
        if obj.name.startswith(prefix):
            bpy.data.objects.remove(obj, do_unlink=True)


def make_group(slug: str) -> bpy.types.Object:
    name = f"PendantIcon_{slug}"
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    group = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(group)
    group.empty_display_type = "CIRCLE"
    group.empty_display_size = 0.12
    group.location = (0.0, -1.595, 4.57)
    parent_to_bone(group, "pendant")
    # Children are parented while the group is at unit scale. Starting hidden
    # here would bake an inverse scale into every child and make icons overlap.
    group.scale = (1.0, 1.0, 1.0)
    return group


def add_disc(name: str, location, radius: float, mat, group, depth=0.025) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48,
        radius=radius,
        depth=depth,
        location=location,
        rotation=(math.pi / 2, 0.0, 0.0),
    )
    obj = bpy.context.object
    obj.name = name
    smooth(obj)
    obj.data.materials.append(mat)
    parent_keep_world(obj, group)
    return obj


def add_torus(name: str, location, major: float, minor: float, mat, group) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=48,
        minor_segments=10,
        location=location,
        rotation=(math.pi / 2, 0.0, 0.0),
    )
    obj = bpy.context.object
    obj.name = name
    smooth(obj)
    obj.data.materials.append(mat)
    parent_keep_world(obj, group)
    return obj


def add_curve(name: str, points, bevel: float, mat, group) -> bpy.types.Object:
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 6
    data.bevel_resolution = 3
    data.bevel_depth = bevel
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    parent_keep_world(obj, group)
    return obj


def add_text(name: str, body: str, location, size: float, mat, group, rotation_z=0.0) -> bpy.types.Object:
    bpy.ops.object.text_add(location=location, rotation=(math.pi / 2, 0.0, rotation_z))
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.008
    obj.data.bevel_depth = 0.004
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    parent_keep_world(obj, group)
    return obj


def add_polygon(name: str, points_xz, y: float, mat, group) -> bpy.types.Object:
    vertices = [(x, y, z) for x, z in points_xz]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], [list(range(len(vertices)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    solidify = obj.modifiers.new("Icon depth", "SOLIDIFY")
    solidify.thickness = 0.024
    bevel = obj.modifiers.new("Icon bevel", "BEVEL")
    bevel.width = 0.010
    bevel.segments = 3
    parent_keep_world(obj, group)
    return obj


def star_points(cx: float, cz: float, outer: float, inner: float):
    points = []
    for index in range(10):
        angle = math.pi / 2 + index * math.pi / 5
        radius = outer if index % 2 == 0 else inner
        points.append((cx + math.cos(angle) * radius, cz + math.sin(angle) * radius))
    return points


def heart_points(cx: float, cz: float, scale: float):
    points = []
    for index in range(40):
        t = 2 * math.pi * index / 40
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        points.append((cx + scale * x, cz + scale * z))
    return points


def build_icons() -> dict[str, bpy.types.Object]:
    remove_prefixed("PendantIcon_")
    groups = {slug: make_group(slug) for slug in MOODS}
    y = -1.605

    add_disc("PendantIcon_presente_Dot", (0.0, y, 4.57), 0.095, CYAN, groups["presente"])
    add_text("PendantIcon_curioso_Mark", "?", (0.0, y, 4.57), 0.42, CYAN, groups["curioso"])

    # Compact bulb: luminous globe, base and three readable rays.
    add_disc("PendantIcon_eureka_Bulb", (0.0, y, 4.60), 0.105, GOLD, groups["eureka"])
    add_curve("PendantIcon_eureka_Base", [(-0.07, y - 0.012, 4.49), (0.07, y - 0.012, 4.49)], 0.018, GOLD, groups["eureka"])
    for idx, (x0, z0, x1, z1) in enumerate(((-0.15, 4.68, -0.21, 4.74), (0.0, 4.73, 0.0, 4.82), (0.15, 4.68, 0.21, 4.74))):
        add_curve(f"PendantIcon_eureka_Ray_{idx}", [(x0, y - 0.012, z0), (x1, y - 0.012, z1)], 0.013, GOLD, groups["eureka"])

    for index, x in enumerate((-0.13, 0.0, 0.13)):
        add_disc(f"PendantIcon_pensando_Dot_{index}", (x, y, 4.57), 0.045, CYAN, groups["pensando"])
    add_text("PendantIcon_cochilando_Z", "Z", (0.0, y, 4.57), 0.34, CYAN, groups["cochilando"])

    add_torus("PendantIcon_concentrado_Ring", (0.0, y, 4.57), 0.115, 0.021, CYAN, groups["concentrado"])
    add_disc("PendantIcon_concentrado_Dot", (0.0, y - 0.008, 4.57), 0.040, CYAN, groups["concentrado"])
    add_text("PendantIcon_confuso_Mark", "?", (0.0, y, 4.57), 0.40, CYAN, groups["confuso"], rotation_z=math.radians(18))

    add_polygon("PendantIcon_acolhedor_Heart", heart_points(0.0, 4.575, 0.0105), y, PINK, groups["acolhedor"])
    add_polygon("PendantIcon_orgulhoso_Star", star_points(0.0, 4.57, 0.17, 0.075), y, GOLD, groups["orgulhoso"])
    for group in groups.values():
        group.scale = (0.001, 0.001, 0.001)
    return groups


def build_sleep_eyes() -> tuple[bpy.types.Object, dict[str, bpy.types.Object]]:
    """Add explicit closed lids and group eye details for true eye closure."""
    remove_prefixed("SleepEyes")
    remove_prefixed("EyeDetailGroup_")

    sleep_group = bpy.data.objects.new("SleepEyes_Group", None)
    bpy.context.collection.objects.link(sleep_group)
    sleep_group.location = (0.0, -1.92, 7.0)
    parent_to_bone(sleep_group, "head")
    sleep_group.scale = (0.001, 0.001, 0.001)

    lid_material = bpy.data.materials["Fur_Shadow"]
    lids = (
        add_curve("SleepEyes_L", [(-1.14, -1.96, 7.04), (-0.72, -2.01, 6.91), (-0.30, -1.96, 7.04)], 0.034, lid_material, sleep_group),
        add_curve("SleepEyes_R", [(0.30, -1.96, 7.04), (0.72, -2.01, 6.91), (1.14, -1.96, 7.04)], 0.034, lid_material, sleep_group),
    )
    for lid in lids:
        lid["purpose"] = "closed eyelid for cochilando"

    detail_groups: dict[str, bpy.types.Object] = {}
    for side, x in (("L", -0.72), ("R", 0.72)):
        group = bpy.data.objects.new(f"EyeDetailGroup_{side}", None)
        bpy.context.collection.objects.link(group)
        group.location = (x, -1.72, 7.02)
        parent_to_bone(group, "head")
        for object_name in (f"EyeWhite_{side}", f"Iris_{side}", f"Pupil_{side}", f"EyeGlint_{side}"):
            parent_keep_world(bpy.data.objects[object_name], group)
        detail_groups[side] = group

    return sleep_group, detail_groups


def build_sleep_actions(sleep_group: bpy.types.Object, detail_groups: dict[str, bpy.types.Object]) -> None:
    action_specs = [(sleep_group, "mood_cochilando_closed_lids", False)] + [
        (group, f"mood_cochilando_eye_details_{side}", True)
        for side, group in detail_groups.items()
    ]
    for obj, action_name, inverse in action_specs:
        old = bpy.data.actions.get(action_name)
        if old:
            bpy.data.actions.remove(old)
        action = bpy.data.actions.new(action_name)
        action.use_fake_user = True
        obj.animation_data_create()
        obj.animation_data.action = action
        for frame, open_amount in ((1, 0.0), (14, 1.0), (34, 1.0), (48, 0.0)):
            value = (1.0 - open_amount) if inverse else open_amount
            value = max(value, 0.001)
            obj.scale = (value, value, value)
            obj.keyframe_insert("scale", frame=frame)
        action.frame_start = 1
        action.frame_end = 48
        obj.animation_data.action = None


def set_sleep_visibility(sleep_group: bpy.types.Object, detail_groups: dict[str, bpy.types.Object], sleeping: bool) -> None:
    lid_scale = 1.0 if sleeping else 0.001
    detail_scale = 0.001 if sleeping else 1.0
    sleep_group.scale = (lid_scale, lid_scale, lid_scale)
    for group in detail_groups.values():
        group.scale = (detail_scale, detail_scale, detail_scale)


def build_group_action(group: bpy.types.Object, slug: str) -> None:
    name = f"mood_{slug}_pendant"
    old = bpy.data.actions.get(name)
    if old:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    group.animation_data_create()
    group.animation_data.action = action
    for frame, value in ((1, 0.001), (14, 1.0), (34, 1.0), (48, 0.001)):
        group.scale = (value, value, value)
        group.keyframe_insert("scale", frame=frame)
    action.frame_start = 1
    action.frame_end = 48
    group.animation_data.action = None


def reset_mouth_values() -> None:
    for key in cavity.data.shape_keys.key_blocks:
        if key.name != "Basis":
            key.value = 0.0


def build_talk_action() -> bpy.types.Action:
    keys = cavity.data.shape_keys
    name = "talk_idle_v4"
    old = bpy.data.actions.get(name)
    if old:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    keys.animation_data_create()
    keys.animation_data.action = action
    channels = ("closed", "jaw_open", "MBP", "A", "E", "O", "U", "L")
    sequence = {
        1: {"closed": 1.0},
        5: {"jaw_open": 0.26, "A": 0.42},
        9: {"E": 0.34},
        13: {"closed": 1.0, "MBP": 0.82},
        17: {"jaw_open": 0.20, "O": 0.46},
        21: {"U": 0.38},
        25: {"closed": 1.0, "MBP": 0.78},
        29: {"jaw_open": 0.24, "A": 0.38},
        33: {"E": 0.30},
        37: {"jaw_open": 0.18, "O": 0.40},
        41: {"closed": 1.0, "MBP": 0.76},
        45: {"closed": 1.0},
    }
    for frame, active in sequence.items():
        for channel in channels:
            key = keys.key_blocks.get(channel)
            if key:
                key.value = active.get(channel, 0.0)
                key.keyframe_insert("value", frame=frame)
    action.frame_start = 1
    action.frame_end = 45
    keys.animation_data.action = None
    return action


def set_group_visibility(groups: dict[str, bpy.types.Object], active: str) -> None:
    for slug, group in groups.items():
        value = 1.0 if slug == active else 0.001
        group.scale = (value, value, value)


def track_camera(camera: bpy.types.Object, point) -> None:
    direction = Vector(point) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


groups = build_icons()
sleep_group, eye_detail_groups = build_sleep_eyes()
build_sleep_actions(sleep_group, eye_detail_groups)
for mood, group in groups.items():
    build_group_action(group, mood)
talk_action = build_talk_action()

camera = scene.camera
camera_matrix = camera.matrix_world.copy()
camera_lens = camera.data.lens
resolution = (scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage)
original_path = scene.render.filepath

# Pendant review renders.
scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
camera.location = (0.0, -10.8, 5.05)
camera.data.lens = 92
track_camera(camera, (0.0, -0.30, 4.62))
for mood in MOODS:
    arm.animation_data.action = bpy.data.actions.get(f"mood_{mood}")
    scene.frame_set(24)
    set_group_visibility(groups, mood)
    set_sleep_visibility(sleep_group, eye_detail_groups, mood == "cochilando")
    scene.render.filepath = str(PENDANT_DIR / f"Nino_{mood}_pendant.png")
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)

# Speech review renders at representative phoneme frames.
set_group_visibility(groups, "presente")
set_sleep_visibility(sleep_group, eye_detail_groups, False)
arm.animation_data.action = bpy.data.actions.get("mood_presente")
camera.location = (0.0, -12.2, 6.72)
camera.data.lens = 72
track_camera(camera, (0.0, -0.35, 6.65))
cavity.data.shape_keys.animation_data.action = talk_action
for frame in (1, 5, 13, 17, 29):
    scene.frame_set(frame)
    scene.render.filepath = str(TALK_DIR / f"Nino_talk_{frame:02d}.png")
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)
cavity.data.shape_keys.animation_data.action = None

# Dedicated proof that the sleeping expression has fully closed eyes.
arm.animation_data.action = bpy.data.actions.get("mood_cochilando")
set_sleep_visibility(sleep_group, eye_detail_groups, True)
set_group_visibility(groups, "cochilando")
left_eye_keys = bpy.data.objects["EyeWhite_L"].data.shape_keys.key_blocks
right_eye_keys = bpy.data.objects["EyeWhite_R"].data.shape_keys.key_blocks
left_eye_keys["blink_L"].value = 1.0
right_eye_keys["blink_R"].value = 1.0
reset_mouth_values()
cavity.data.shape_keys.key_blocks["jaw_open"].value = 0.23
cavity.data.shape_keys.key_blocks["O"].value = 0.38
tongue = bpy.data.objects.get("Tongue_V4")
if tongue:
    tongue.scale = (0.30, 0.30, 0.30)
scene.frame_set(24)
scene.render.filepath = str(PREVIEW_DIR / "Nino_cochilando_olhos_fechados.png")
bpy.context.view_layer.update()
bpy.ops.render.render(write_still=True)

left_eye_keys["blink_L"].value = 0.0
right_eye_keys["blink_R"].value = 0.0
if tongue:
    tongue.scale = (0.001, 0.001, 0.001)
set_sleep_visibility(sleep_group, eye_detail_groups, False)
set_group_visibility(groups, "presente")
reset_mouth_values()
cavity.data.shape_keys.key_blocks["closed"].value = 1.0
cavity.data.shape_keys.key_blocks["smile"].value = 0.42

camera.matrix_world = camera_matrix
camera.data.lens = camera_lens
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = resolution
scene.render.filepath = original_path
scene.frame_set(24)
set_group_visibility(groups, "presente")
set_sleep_visibility(sleep_group, eye_detail_groups, False)

arm["runtime_version"] = "v5_speech_and_pendant_icons"
arm["talk_action"] = talk_action.name
arm["pendant_icons"] = json.dumps(ICON_LABELS, ensure_ascii=False)

manifest = {
    "character": "Nino v5 runtime ready",
    "source": BLEND_PATH.name,
    "derived_from": SOURCE.name,
    "talk_action": talk_action.name,
    "talk_frames": [1, 5, 13, 17, 29],
    "sleep_eye_actions": ["mood_cochilando_closed_lids", "mood_cochilando_eye_details_L", "mood_cochilando_eye_details_R"],
    "pendant_icons": ICON_LABELS,
    "moods": [
        {"id": mood, "body_action": f"mood_{mood}", "pendant_action": f"mood_{mood}_pendant"}
        for mood in MOODS
    ],
}
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
for obj in bpy.data.objects:
    if obj.parent == arm or (obj.parent and obj.parent.name.startswith("PendantIcon_")):
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
print(f"NINO_V5_RUNTIME_OK blend={BLEND_PATH} glb={GLB_PATH} previews={PREVIEW_DIR}")
