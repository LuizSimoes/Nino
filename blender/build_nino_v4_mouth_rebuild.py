"""Rebuild Nino's mouth from scratch on top of the approved v2 body.

The previous mouth was a flattened sphere and read as a large rubber lip.
This version separates the canine lip seams, the small mouth cavity and the
tongue, preserving the v2 model as a reversible source.
"""

from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(bpy.data.filepath).resolve().parents[2]
OUT = ROOT / "outputs" / "3d"
SOURCE = OUT / "Nino_v2_refined.blend"
BLEND_PATH = OUT / "Nino_v4_mouth_rebuild.blend"
GLB_PATH = OUT / "Nino_v4_mouth_rebuild.glb"
PREVIEW_DIR = OUT / "mouth_v4_expressions"
CLOSEUP_DIR = PREVIEW_DIR / "closeups"
MANIFEST_PATH = OUT / "Nino_v4_mouth_rebuild_manifest.json"
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
CLOSEUP_DIR.mkdir(parents=True, exist_ok=True)

if Path(bpy.data.filepath).resolve() != SOURCE.resolve():
    raise RuntimeError(f"Open {SOURCE.name} before running this script")

scene = bpy.context.scene
arm = bpy.data.objects["Nino_Rig"]

MOODS = [
    "presente", "curioso", "eureka", "pensando", "cochilando",
    "concentrado", "confuso", "acolhedor", "orgulhoso",
]

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

TONGUE_MOODS = {"eureka": 0.78, "cochilando": 0.30}


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


def remove_object(name: str) -> None:
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)


def curve_object(name: str, points, bevel_depth: float, material: bpy.types.Material) -> bpy.types.Object:
    remove_object(name)
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 10
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


def add_mouth_cavity() -> bpy.types.Object:
    remove_object("Mouth_Cavity_V4")
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=48,
        ring_count=24,
        location=(0.0, -2.045, 5.735),
    )
    obj = bpy.context.object
    obj.name = "Mouth_Cavity_V4"
    obj.scale = (0.33, 0.045, 0.045)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth(obj)
    obj.data.materials.append(bpy.data.materials["Mouth_Cavity"])

    basis = obj.shape_key_add(name="Basis")
    coords = [vertex.co.copy() for vertex in basis.data]

    def add_key(name: str, transform) -> None:
        key = obj.shape_key_add(name=name)
        for point, base in zip(key.data, coords):
            point.co = transform(base.copy())

    add_key("closed", lambda co: Vector((co.x * 0.88, co.y * 0.75, co.z * 0.08)))
    add_key("smile", lambda co: Vector((co.x, co.y, co.z + 0.046 * (abs(co.x) / 0.33) ** 1.35 - 0.010)))
    add_key("smile_wide", lambda co: Vector((co.x * 1.23, co.y, co.z * 1.18 + 0.050 * (abs(co.x) / 0.33) ** 1.2 - 0.009)))
    add_key("frown", lambda co: Vector((co.x, co.y, co.z - 0.044 * (abs(co.x) / 0.33) ** 1.25 + 0.009)))
    add_key("jaw_open", lambda co: Vector((co.x * 0.98, co.y, co.z * 3.45 - 0.050)))
    add_key("MBP", lambda co: Vector((co.x * 1.04, co.y, co.z * 0.18)))
    add_key("A", lambda co: Vector((co.x * 1.06, co.y, co.z * 3.75 - 0.048)))
    add_key("E", lambda co: Vector((co.x * 1.28, co.y, co.z * 1.65)))
    add_key("O", lambda co: Vector((co.x * 0.62, co.y, co.z * 3.25 - 0.025)))
    add_key("U", lambda co: Vector((co.x * 0.62, co.y, co.z * 2.10 - 0.012)))
    add_key("L", lambda co: Vector((co.x * 0.92, co.y, co.z * 2.30 - 0.035)))
    parent_to_bone(obj, "jaw")
    return obj


def add_tongue() -> bpy.types.Object:
    remove_object("Tongue_V4")
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=36,
        ring_count=18,
        location=(0.0, -2.105, 5.635),
    )
    obj = bpy.context.object
    obj.name = "Tongue_V4"
    obj.scale = (0.20, 0.030, 0.075)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth(obj)
    obj.data.materials.append(bpy.data.materials["Tongue"])
    parent_to_bone(obj, "jaw")
    obj.scale = (0.001, 0.001, 0.001)
    return obj


def rebuild_mouth() -> tuple[bpy.types.Object, bpy.types.Object, list[bpy.types.Object]]:
    # Preserve legacy data in the file, but do not render or export it.
    for name in ("Mouth", "Tongue", "Smile_L", "Smile_R", "Mouth_Lower_Line"):
        legacy = bpy.data.objects.get(name)
        if legacy:
            legacy.hide_render = True
            legacy.hide_viewport = True

    dark = bpy.data.materials["Mouth_Cavity"]
    dark.diffuse_color = (0.055, 0.018, 0.020, 1.0)
    if dark.use_nodes:
        principled = next((node for node in dark.node_tree.nodes if node.bl_idname == "ShaderNodeBsdfPrincipled"), None)
        if principled:
            principled.inputs["Base Color"].default_value = (0.055, 0.018, 0.020, 1.0)
            principled.inputs["Roughness"].default_value = 0.62
    seams = [
        curve_object("Philtrum_V4", [(0.0, -2.085, 6.035), (0.0, -2.098, 5.910), (0.0, -2.100, 5.855)], 0.013, dark),
        curve_object("UpperLip_L_V4", [(0.0, -2.100, 5.855), (-0.18, -2.092, 5.815), (-0.40, -2.015, 5.842)], 0.016, dark),
        curve_object("UpperLip_R_V4", [(0.0, -2.100, 5.855), (0.18, -2.092, 5.815), (0.40, -2.015, 5.842)], 0.016, dark),
    ]
    for seam in seams:
        parent_to_bone(seam, "head")

    cavity = add_mouth_cavity()
    tongue = add_tongue()
    return cavity, tongue, seams


def reset_face(cavity: bpy.types.Object) -> None:
    for blocks in (
        cavity.data.shape_keys.key_blocks,
        bpy.data.objects["EyeWhite_L"].data.shape_keys.key_blocks,
        bpy.data.objects["EyeWhite_R"].data.shape_keys.key_blocks,
    ):
        for block in blocks:
            if block.name != "Basis":
                block.value = 0.0


def apply_face(slug: str, cavity: bpy.types.Object, tongue: bpy.types.Object) -> None:
    reset_face(cavity)
    mouth_values, eye_values = FACES[slug]
    mouth_keys = cavity.data.shape_keys.key_blocks
    for name, value in mouth_values.items():
        if name in mouth_keys:
            mouth_keys[name].value = value
    left_keys = bpy.data.objects["EyeWhite_L"].data.shape_keys.key_blocks
    right_keys = bpy.data.objects["EyeWhite_R"].data.shape_keys.key_blocks
    if "blink_L" in eye_values:
        left_keys["blink_L"].value = eye_values["blink_L"]
    if "blink_R" in eye_values:
        right_keys["blink_R"].value = eye_values["blink_R"]
    if "squint_L" in eye_values:
        left_keys["squint"].value = eye_values["squint_L"]
    if "squint_R" in eye_values:
        right_keys["squint"].value = eye_values["squint_R"]
    amount = TONGUE_MOODS.get(slug, 0.0)
    tongue.scale = (amount, amount, amount) if amount else (0.001, 0.001, 0.001)


def remove_mood_tracks(keys: bpy.types.Key) -> None:
    keys.animation_data_create()
    for track in list(keys.animation_data.nla_tracks):
        if track.name.startswith("mood_"):
            keys.animation_data.nla_tracks.remove(track)


def make_shape_track(keys: bpy.types.Key, slug: str, values: dict[str, float]) -> None:
    action_name = f"mood_{slug}_MouthV4"
    old = bpy.data.actions.get(action_name)
    if old:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new(action_name)
    action.use_fake_user = True
    keys.animation_data_create()
    keys.animation_data.action = action
    for block_name, value in values.items():
        if block_name not in keys.key_blocks:
            continue
        block = keys.key_blocks[block_name]
        for frame, amount in ((1, 0.0), (14, value), (34, value), (48, 0.0)):
            block.value = amount
            block.keyframe_insert("value", frame=frame)
    action.frame_start = 1
    action.frame_end = 48
    keys.animation_data.action = None
    if values:
        track = keys.animation_data.nla_tracks.new()
        track.name = f"mood_{slug}"
        strip = track.strips.new(f"mood_{slug}", 1, action)
        strip.action_frame_start = 1
        strip.action_frame_end = 48
        track.mute = True


def track_camera(camera: bpy.types.Object, point) -> None:
    direction = Vector(point) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


cavity, tongue, seams = rebuild_mouth()

# Render the nine full-character checks.
original_path = scene.render.filepath
camera = scene.camera
camera_matrix = camera.matrix_world.copy()
camera_lens = camera.data.lens
resolution = (scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage)
for mood in MOODS:
    arm.animation_data.action = bpy.data.actions.get(f"mood_{mood}")
    scene.frame_set(24)
    apply_face(mood, cavity, tongue)
    bpy.context.view_layer.update()
    scene.render.filepath = str(PREVIEW_DIR / f"Nino_{mood}.png")
    bpy.ops.render.render(write_still=True)

# Render close-ups for the four expressions that best expose the mouth design.
scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
camera.location = (0.0, -12.2, 6.72)
camera.data.lens = 72
track_camera(camera, (0.0, -0.35, 6.65))
for mood in ("presente", "curioso", "eureka", "cochilando"):
    arm.animation_data.action = bpy.data.actions.get(f"mood_{mood}")
    scene.frame_set(24)
    apply_face(mood, cavity, tongue)
    bpy.context.view_layer.update()
    scene.render.filepath = str(CLOSEUP_DIR / f"Nino_{mood}_close.png")
    bpy.ops.render.render(write_still=True)

camera.matrix_world = camera_matrix
camera.data.lens = camera_lens
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = resolution

# Store the new facial clips without touching the approved body actions.
remove_mood_tracks(cavity.data.shape_keys)
for mood in MOODS:
    make_shape_track(cavity.data.shape_keys, mood, FACES[mood][0])

arm.animation_data.action = bpy.data.actions.get("mood_presente")
scene.frame_set(24)
apply_face("presente", cavity, tongue)
scene.render.filepath = original_path

arm["mouth_version"] = "v4_separate_canine_seams_cavity_tongue"
arm["mouth_controls"] = "closed,smile,smile_wide,frown,jaw_open,MBP,A,E,O,U,L"

manifest = {
    "character": "Nino v4 mouth rebuild",
    "source": BLEND_PATH.name,
    "derived_from": SOURCE.name,
    "changes": [
        "legacy flattened-sphere mouth hidden but preserved",
        "separate canine philtrum and upper-lip seams",
        "small independent mouth cavity with ten facial shape keys",
        "independent tongue reserved for open-mouth expressions",
        "nine expression previews plus four face close-ups",
    ],
    "expressions": [
        {"id": mood, "action": f"mood_{mood}", "preview": f"mouth_v4_expressions/Nino_{mood}.png"}
        for mood in MOODS
    ],
}
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
for obj in bpy.data.objects:
    if obj.parent == arm and obj.name not in {"Mouth", "Tongue", "Smile_L", "Smile_R", "Mouth_Lower_Line"}:
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
print(f"NINO_MOUTH_V4_OK blend={BLEND_PATH} glb={GLB_PATH} previews={PREVIEW_DIR}")
