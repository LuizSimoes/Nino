"""Build the first editable Blender model of Nino v1.

The scene is generated from the approved production specification in
outputs/NINO_V1_ESPECIFICACAO_MODELAGEM_RIG.md.  It deliberately keeps every
anatomical/accessory part separate so later sculpting, retopology and skinning
can refine the character without losing the approved proportions.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "3d"
OUT.mkdir(parents=True, exist_ok=True)
BLEND_PATH = OUT / "Nino_v1_blockout.blend"
GLB_PATH = OUT / "Nino_v1_blockout.glb"
RENDER_PATH = OUT / "Nino_v1_blockout_preview.png"


def clear_scene() -> None:
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.armatures, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def srgb(hex_color: str) -> tuple[float, float, float, float]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def material(name: str, color: str, roughness: float, metallic: float = 0.0, emission: str | None = None, emission_strength: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = srgb(color)
    mat.use_nodes = True
    # Node display names are localized by Blender, so identify the shader by
    # its stable RNA type instead of the translated UI label.
    bsdf = next((node for node in mat.node_tree.nodes if node.bl_idname == "ShaderNodeBsdfPrincipled"), None)
    if bsdf:
        bsdf.inputs["Base Color"].default_value = srgb(color)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emission:
            socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
            if socket:
                socket.default_value = srgb(emission)
            strength = bsdf.inputs.get("Emission Strength")
            if strength:
                strength.default_value = emission_strength
    return mat


MATS: dict[str, bpy.types.Material] = {}


def assign(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)


def smooth(obj: bpy.types.Object) -> None:
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def bevel(obj: bpy.types.Object, width: float = 0.08, segments: int = 3) -> None:
    mod = obj.modifiers.new("Soft bevel", "BEVEL")
    mod.width = width
    mod.segments = segments


def uv_sphere(name: str, location, scale, mat, rotation=(0.0, 0.0, 0.0), segments=40, rings=24) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth(obj)
    assign(obj, mat)
    return obj


def cube(name: str, location, scale, mat, rotation=(0.0, 0.0, 0.0), bevel_width=0.12) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel(obj, bevel_width, 4)
    assign(obj, mat)
    return obj


def cylinder(name: str, location, radius: float, depth: float, mat, rotation=(math.pi / 2, 0.0, 0.0), vertices=48) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    smooth(obj)
    bevel(obj, 0.04, 3)
    assign(obj, mat)
    return obj


def torus(name: str, location, major_radius: float, minor_radius: float, mat, rotation=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=64,
        minor_segments=16,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    smooth(obj)
    assign(obj, mat)
    return obj


def curve_object(name: str, points, bevel_depth: float, mat, cyclic=False, resolution=5) -> bpy.types.Object:
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = resolution
    data.bevel_resolution = 4
    data.bevel_depth = bevel_depth
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bp, co in zip(spline.bezier_points, points):
        bp.co = co
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    assign(obj, mat)
    return obj


def make_mouth(name: str, location, mat) -> bpy.types.Object:
    obj = uv_sphere(name, location, (0.58, 0.12, 0.21), mat, segments=32, rings=16)
    basis = obj.shape_key_add(name="Basis")
    coords = [v.co.copy() for v in basis.data]

    def add_key(key_name: str, fn) -> None:
        key = obj.shape_key_add(name=key_name)
        for point, base in zip(key.data, coords):
            point.co = fn(base.copy())

    add_key("smile", lambda co: Vector((co.x, co.y, co.z + 0.26 * abs(co.x))))
    add_key("smile_wide", lambda co: Vector((co.x * 1.32, co.y, co.z * 1.18 + 0.24 * abs(co.x))))
    add_key("frown", lambda co: Vector((co.x, co.y, co.z - 0.25 * abs(co.x))))
    add_key("jaw_open", lambda co: Vector((co.x * 0.96, co.y, co.z * 1.9)))
    add_key("REST", lambda co: co)
    add_key("MBP", lambda co: Vector((co.x * 1.1, co.y, co.z * 0.20)))
    add_key("FV", lambda co: Vector((co.x * 1.18, co.y, co.z * 0.48)))
    add_key("A", lambda co: Vector((co.x * 1.05, co.y, co.z * 1.82)))
    add_key("E", lambda co: Vector((co.x * 1.52, co.y, co.z * 0.72)))
    add_key("O", lambda co: Vector((co.x * 0.68, co.y, co.z * 1.72)))
    add_key("U", lambda co: Vector((co.x * 0.52, co.y, co.z * 1.25)))
    add_key("L", lambda co: Vector((co.x * 0.9, co.y, co.z * 1.30)))
    obj.data.shape_keys.key_blocks["smile"].value = 0.72
    return obj


def add_eye_keys(obj: bpy.types.Object, blink_name: str) -> None:
    basis = obj.shape_key_add(name="Basis")
    coords = [v.co.copy() for v in basis.data]
    blink = obj.shape_key_add(name=blink_name)
    squint = obj.shape_key_add(name="squint")
    for p, base in zip(blink.data, coords):
        p.co = Vector((base.x, base.y, base.z * 0.08))
    for p, base in zip(squint.data, coords):
        p.co = Vector((base.x, base.y, base.z * 0.56))


def parent_to_bone(obj: bpy.types.Object, armature: bpy.types.Object, bone: str) -> None:
    matrix = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    obj.matrix_world = matrix


def build_armature() -> bpy.types.Object:
    data = bpy.data.armatures.new("Nino_Rig")
    arm = bpy.data.objects.new("Nino_Rig", data)
    bpy.context.collection.objects.link(arm)
    arm.show_in_front = True
    arm["rig_status"] = "blockout_controls"
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    bones: dict[str, bpy.types.EditBone] = {}

    def eb(name, head, tail, parent=None, connected=False):
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent:
            bone.parent = bones[parent]
            bone.use_connect = connected
        bones[name] = bone
        return bone

    eb("root", (0, 0, 0), (0, 0, 0.45))
    eb("pelvis", (0, 0, 2.0), (0, 0, 2.6), "root")
    eb("spine_01", (0, 0, 2.6), (0, 0, 3.7), "pelvis", True)
    eb("chest", (0, 0, 3.7), (0, 0, 4.8), "spine_01", True)
    eb("neck", (0, 0, 4.8), (0, 0, 5.2), "chest", True)
    eb("head", (0, 0, 5.2), (0, 0, 7.05), "neck", True)
    eb("jaw", (0, -1.35, 6.25), (0, -1.70, 5.95), "head")
    for side, sx in (("L", -1), ("R", 1)):
        eb(f"clavicle_{side}", (0, 0, 4.65), (0.85 * sx, 0, 4.62), "chest")
        eb(f"upper_arm_{side}", (0.85 * sx, 0, 4.62), (1.18 * sx, -0.04, 3.82), f"clavicle_{side}", True)
        eb(f"forearm_{side}", (1.18 * sx, -0.04, 3.82), (1.12 * sx, -0.13, 3.12), f"upper_arm_{side}", True)
        eb(f"paw_{side}", (1.12 * sx, -0.13, 3.12), (1.12 * sx, -0.28, 2.75), f"forearm_{side}", True)
        eb(f"thigh_{side}", (0.62 * sx, 0, 2.25), (0.65 * sx, 0, 1.45), "pelvis")
        eb(f"shin_{side}", (0.65 * sx, 0, 1.45), (0.69 * sx, -0.02, 0.62), f"thigh_{side}", True)
        eb(f"foot_{side}", (0.69 * sx, -0.02, 0.62), (0.69 * sx, -0.75, 0.28), f"shin_{side}")
        ear_parent = "head"
        for i in range(1, 4):
            x = (1.65 + (i - 1) * 0.12) * sx
            z = 7.15 - (i - 1) * 0.55
            eb(f"ear_{side}_{i}", (x, 0, z), (x + 0.06 * sx, 0, z - 0.48), ear_parent)
            ear_parent = f"ear_{side}_{i}"
    tail_points = [(-0.75, 0.38, 2.75), (-1.40, 0.58, 2.92), (-2.04, 0.48, 3.35), (-2.32, 0.30, 3.92), (-2.15, 0.12, 4.40), (-2.48, -0.02, 4.64)]
    parent = "pelvis"
    for i in range(5):
        eb(f"tail_{i + 1:02d}", tail_points[i], tail_points[i + 1], parent)
        parent = f"tail_{i + 1:02d}"
    eb("pendant", (0, -1.05, 4.90), (0, -1.40, 4.50), "chest")
    eb("eye_target", (0, -3.8, 6.78), (0, -4.2, 6.78), "root")
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


def create_action(arm: bpy.types.Object, name: str, frame_end: int, keys: dict[str, list[tuple[int, tuple[float, float, float]]]]) -> bpy.types.Action:
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = action
    for bone_name, frames in keys.items():
        bone = arm.pose.bones.get(bone_name)
        if not bone:
            continue
        bone.rotation_mode = "XYZ"
        for frame, euler in frames:
            bone.rotation_euler = euler
            bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone_name)
    action.frame_start = 1
    action.frame_end = frame_end
    arm.animation_data.action = None
    return action


def build_scene() -> None:
    clear_scene()
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(RENDER_PATH)
    scene.render.image_settings.color_mode = "RGBA"
    scene.frame_start = 1
    scene.frame_end = 144
    scene.render.fps = 24
    scene.world.color = (0.025, 0.032, 0.055)

    MATS.update(
        fur=material("Fur_Golden", "#E8AD35", 0.68),
        fur_light=material("Fur_Highlight", "#FFE990", 0.72),
        fur_shadow=material("Fur_Shadow", "#BD7022", 0.7),
        cream=material("Fur_Cream", "#FFF4BF", 0.72),
        dark=material("Eyes_Nose", "#2B1B1A", 0.28),
        eye_white=material("Eye_White", "#FFF9E9", 0.28),
        iris=material("Iris_Brown", "#5B321D", 0.22),
        collar=material("Collar_Teal", "#2D6177", 0.62),
        pendant=material("Pendant_Resin", "#102B3F", 0.30, metallic=0.18),
        cyan=material("Pendant_Light", "#65E5DE", 0.22, emission="#65E5DE", emission_strength=1.15),
        tongue=material("Tongue", "#F37D86", 0.38),
        mouth=material("Mouth_Cavity", "#351A19", 0.45),
        pawpad=material("Paw_Pads", "#C87857", 0.68),
    )

    arm = build_armature()
    parts: dict[str, bpy.types.Object] = {}

    # Compact pear-shaped body and high shoulders.
    parts["body"] = uv_sphere("Body", (0, 0, 3.55), (1.42, 1.03, 1.78), MATS["fur"])
    parts["chest"] = uv_sphere("Chest_Cream", (0, -0.94, 3.62), (0.78, 0.16, 1.20), MATS["cream"])
    parts["shoulders"] = uv_sphere("Shoulder_Mass", (0, -0.01, 4.48), (1.33, 0.94, 0.62), MATS["fur"])

    # Short sturdy legs and rounded three-toed feet.
    for side, sx in (("L", -1), ("R", 1)):
        parts[f"leg_{side}"] = uv_sphere(f"Leg_{side}", (0.64 * sx, 0.02, 1.42), (0.48, 0.52, 1.08), MATS["fur"])
        parts[f"foot_{side}"] = uv_sphere(f"Foot_{side}", (0.67 * sx, -0.42, 0.46), (0.75, 0.88, 0.47), MATS["fur"])
        for toe in (-0.24, 0.0, 0.24):
            parts[f"toe_{side}_{toe}"] = uv_sphere(
                f"Toe_{side}_{toe:+.2f}",
                (0.67 * sx + toe, -1.12, 0.40),
                (0.23, 0.32, 0.24),
                MATS["fur_light"],
                segments=28,
                rings=16,
            )

    # Arms start high and stay short; paws overlap the forearms to prevent gaps.
    for side, sx in (("L", -1), ("R", 1)):
        parts[f"upper_arm_{side}"] = uv_sphere(
            f"UpperArm_{side}",
            (1.25 * sx, -0.25, 3.95),
            (0.42, 0.46, 0.88),
            MATS["fur"],
            rotation=(0.0, 0.0, math.radians(-9 * sx)),
        )
        parts[f"paw_{side}"] = uv_sphere(f"Paw_{side}", (1.26 * sx, -0.31, 3.05), (0.48, 0.48, 0.55), MATS["fur"])

    # Large rounded head, drooping ears and affectionate muzzle.
    parts["head"] = uv_sphere("Head", (0, 0, 6.55), (2.40, 1.55, 2.02), MATS["fur"])
    parts["forehead_mark"] = uv_sphere("Forehead_Highlight", (0, -1.51, 7.92), (0.44, 0.075, 0.24), MATS["fur_light"])
    for side, sx in (("L", -1), ("R", 1)):
        parts[f"ear_{side}"] = uv_sphere(
            f"Ear_{side}",
            (1.94 * sx, -0.28, 6.47),
            (0.70, 0.54, 1.43),
            MATS["fur_shadow"],
            rotation=(math.radians(4), math.radians(8 * sx), math.radians(8 * sx)),
        )
    parts["muzzle_L"] = uv_sphere("Muzzle_L", (-0.54, -1.48, 6.02), (0.88, 0.50, 0.61), MATS["cream"])
    parts["muzzle_R"] = uv_sphere("Muzzle_R", (0.54, -1.48, 6.02), (0.88, 0.50, 0.61), MATS["cream"])
    parts["chin"] = uv_sphere("Chin", (0, -1.48, 5.62), (0.54, 0.35, 0.25), MATS["cream"])
    parts["nose"] = uv_sphere("Nose", (0, -2.02, 6.28), (0.48, 0.36, 0.32), MATS["dark"])

    # Eyes: large and readable in a compact UI, with pupils slightly forward.
    for side, sx in (("L", -1), ("R", 1)):
        eye = uv_sphere(f"EyeWhite_{side}", (0.72 * sx, -1.51, 7.03), (0.55, 0.23, 0.72), MATS["eye_white"])
        add_eye_keys(eye, f"blink_{side}")
        parts[f"eye_{side}"] = eye
        parts[f"iris_{side}"] = uv_sphere(f"Iris_{side}", (0.72 * sx, -1.72, 7.02), (0.25, 0.10, 0.36), MATS["iris"], segments=32, rings=18)
        parts[f"pupil_{side}"] = uv_sphere(f"Pupil_{side}", (0.72 * sx, -1.81, 7.03), (0.12, 0.07, 0.21), MATS["dark"], segments=28, rings=16)
        parts[f"eye_glint_{side}"] = uv_sphere(f"EyeGlint_{side}", (0.64 * sx, -1.87, 7.19), (0.052, 0.032, 0.070), MATS["eye_white"], segments=20, rings=12)

    parts["brow_L"] = curve_object("Brow_L", [(-1.08, -1.75, 7.56), (-0.74, -1.89, 7.66), (-0.40, -1.76, 7.58)], 0.048, MATS["fur_shadow"])
    parts["brow_R"] = curve_object("Brow_R", [(0.40, -1.76, 7.58), (0.74, -1.89, 7.66), (1.08, -1.75, 7.56)], 0.048, MATS["fur_shadow"])
    parts["mouth"] = make_mouth("Mouth", (0, -1.93, 5.66), MATS["mouth"])
    parts["tongue"] = uv_sphere("Tongue", (0, -2.04, 5.59), (0.20, 0.07, 0.11), MATS["tongue"], segments=28, rings=16)
    parts["tongue"].hide_render = True
    parts["smile_L"] = curve_object("Smile_L", [(-0.04, -2.00, 5.98), (-0.24, -2.03, 5.81), (-0.48, -1.89, 5.84)], 0.027, MATS["dark"])
    parts["smile_R"] = curve_object("Smile_R", [(0.04, -2.00, 5.98), (0.24, -2.03, 5.81), (0.48, -1.89, 5.84)], 0.027, MATS["dark"])

    # Collar and slightly enlarged pendant for legible state icons.
    parts["collar"] = torus("Collar", (0, 0, 4.98), 1.22, 0.18, MATS["collar"])
    parts["pendant_case"] = cylinder("Pendant_Case", (0, -1.34, 4.57), 0.43, 0.18, MATS["pendant"])
    parts["pendant_ring"] = torus("Pendant_Ring", (0, -1.46, 4.57), 0.34, 0.065, MATS["cyan"], rotation=(math.pi / 2, 0, 0))
    parts["pendant_light"] = uv_sphere("Pendant_Light", (0, -1.53, 4.57), (0.16, 0.07, 0.16), MATS["cyan"], segments=28, rings=16)

    # Voluminous elevated tail with the approved natural S curve.
    tail = curve_object(
        "Tail",
        [(-0.92, 0.28, 2.76), (-1.56, 0.42, 2.94), (-2.15, 0.28, 3.40), (-2.35, 0.08, 3.94), (-2.17, -0.08, 4.38), (-2.48, -0.12, 4.62)],
        0.36,
        MATS["fur"],
        resolution=8,
    )
    tail.data.taper_radius_mode = "OVERRIDE"
    parts["tail"] = tail
    parts["tail_tip"] = uv_sphere("Tail_Tip", (-2.48, -0.12, 4.62), (0.36, 0.36, 0.48), MATS["fur_light"], rotation=(0, math.radians(35), 0))

    # Parent rigid blockout pieces to the rig while preserving overlap and silhouette.
    bone_map = {
        "body": "spine_01", "chest": "chest", "shoulders": "chest", "head": "head", "forehead_mark": "head",
        "muzzle_L": "head", "muzzle_R": "head", "chin": "jaw", "nose": "head", "mouth": "jaw", "tongue": "jaw",
        "smile_L": "head", "smile_R": "head", "brow_L": "head", "brow_R": "head", "collar": "neck",
        "pendant_case": "pendant", "pendant_ring": "pendant", "pendant_light": "pendant", "tail": "tail_01", "tail_tip": "tail_05",
    }
    for side in ("L", "R"):
        bone_map.update({
            f"leg_{side}": f"shin_{side}", f"foot_{side}": f"foot_{side}", f"upper_arm_{side}": f"upper_arm_{side}",
            f"paw_{side}": f"paw_{side}", f"ear_{side}": f"ear_{side}_1", f"eye_{side}": "head", f"iris_{side}": "head",
            f"pupil_{side}": "head", f"eye_glint_{side}": "head",
        })
        for toe in (-0.24, 0.0, 0.24):
            bone_map[f"toe_{side}_{toe}"] = f"foot_{side}"
    for key, obj in parts.items():
        bone_name = bone_map.get(key)
        if bone_name:
            parent_to_bone(obj, arm, bone_name)

    # Named initial animation clips.
    create_action(
        arm,
        "idle",
        144,
        {
            "chest": [(1, (0, 0, 0)), (36, (math.radians(1.0), 0, 0)), (72, (0, 0, 0)), (108, (math.radians(1.0), 0, 0)), (144, (0, 0, 0))],
            "head": [(1, (0, 0, math.radians(-1.2))), (72, (0, 0, math.radians(1.2))), (144, (0, 0, math.radians(-1.2)))],
            "ear_L_1": [(1, (0, 0, 0)), (72, (math.radians(2), 0, math.radians(-2))), (144, (0, 0, 0))],
            "ear_R_1": [(1, (0, 0, 0)), (72, (math.radians(-2), 0, math.radians(2))), (144, (0, 0, 0))],
        },
    )
    create_action(
        arm,
        "tail_wag_soft",
        34,
        {"tail_01": [(1, (0, 0, math.radians(-10))), (9, (0, 0, math.radians(11))), (18, (0, 0, math.radians(-10))), (26, (0, 0, math.radians(11))), (34, (0, 0, math.radians(-10)))]},
    )
    create_action(
        arm,
        "tail_wag_happy",
        14,
        {"tail_01": [(1, (0, 0, math.radians(-18))), (4, (0, 0, math.radians(18))), (8, (0, 0, math.radians(-18))), (11, (0, 0, math.radians(18))), (14, (0, 0, math.radians(-18)))]},
    )
    create_action(
        arm,
        "look_left",
        29,
        {"head": [(1, (0, 0, 0)), (12, (0, 0, math.radians(9))), (24, (0, 0, math.radians(9))), (29, (0, 0, 0))]},
    )
    create_action(
        arm,
        "look_right",
        29,
        {"head": [(1, (0, 0, 0)), (12, (0, 0, math.radians(-9))), (24, (0, 0, math.radians(-9))), (29, (0, 0, 0))]},
    )

    # Speech test on the mouth shape keys.
    keys = parts["mouth"].data.shape_keys
    keys.animation_data_create()
    speech = bpy.data.actions.new("talk_idle")
    speech.use_fake_user = True
    keys.animation_data.action = speech
    for name in ("jaw_open", "A", "E", "O", "U", "MBP"):
        block = keys.key_blocks[name]
        block.value = 0.0
        block.keyframe_insert("value", frame=1)
    sequence = [(8, "A"), (15, "MBP"), (22, "E"), (29, "O"), (36, "U"), (43, "A"), (50, "MBP")]
    for frame, name in sequence:
        for block_name in ("A", "E", "O", "U", "MBP"):
            block = keys.key_blocks[block_name]
            block.value = 1.0 if block_name == name else 0.0
            block.keyframe_insert("value", frame=frame)
        jaw = keys.key_blocks["jaw_open"]
        jaw.value = 0.55 if name != "MBP" else 0.0
        jaw.keyframe_insert("value", frame=frame)
    speech.frame_start = 1
    speech.frame_end = 50
    keys.animation_data.action = None
    speech_track = keys.animation_data.nla_tracks.new()
    speech_track.name = "talk_idle"
    speech_strip = speech_track.strips.new("talk_idle", 1, speech)
    speech_strip.action_frame_start = 1
    speech_strip.action_frame_end = 50

    # Production metadata and useful custom properties.
    arm["character"] = "Nino v1"
    arm["concept"] = "Golden Retriever mix, anthropomorphic, affectionate"
    arm["scale_reference"] = "100 units: head 43, torso 31, legs 26"
    arm["next_stage"] = "sculpt, retopology, weight painting, nine emotion clips"

    # Floor, backdrop, camera and soft studio lighting for the preview only.
    floor_mat = material("Preview_Floor", "#202941", 0.82)
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    floor = bpy.context.object
    floor.name = "Preview_Floor"
    assign(floor, floor_mat)

    bpy.ops.object.camera_add(location=(0, -18.8, 6.0))
    camera = bpy.context.object
    camera.name = "Preview_Camera"
    scene.camera = camera

    def track(obj, point):
        direction = Vector(point) - obj.location
        obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    track(camera, (0, 0, 4.25))
    camera.data.lens = 58

    def area(name, location, energy, size, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        track(obj, (0, 0, 4.2))
        return obj

    area("Key_Light", (-5.5, -7.0, 10.0), 520, 5.0, (1.0, 0.78, 0.54))
    area("Fill_Light", (5.5, -5.0, 7.0), 340, 4.0, (0.48, 0.78, 1.0))
    area("Rim_Light", (0, 3.0, 9.5), 460, 3.0, (0.36, 0.95, 0.92))

    # Save full editable scene, then export character-only GLB.
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    for obj in parts.values():
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
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"NINO_BUILD_OK blend={BLEND_PATH} glb={GLB_PATH} render={RENDER_PATH}")


build_scene()

