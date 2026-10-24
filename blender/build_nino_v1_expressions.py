"""Add the nine approved emotional poses to the Nino v1 blockout."""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "3d"
SOURCE = OUT / "Nino_v1_blockout.blend"
BLEND_PATH = OUT / "Nino_v1_expressions.blend"
GLB_PATH = OUT / "Nino_v1_expressions.glb"
PREVIEW_DIR = OUT / "expressions"
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

if not bpy.data.filepath or Path(bpy.data.filepath).resolve() not in {SOURCE.resolve(), BLEND_PATH.resolve()}:
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))

scene = bpy.context.scene
arm = bpy.data.objects["Nino_Rig"]
mouth_keys = bpy.data.objects["Mouth"].data.shape_keys
eye_l_keys = bpy.data.objects["EyeWhite_L"].data.shape_keys
eye_r_keys = bpy.data.objects["EyeWhite_R"].data.shape_keys


def rad3(values):
    return tuple(math.radians(value) for value in values)


MOODS = {
    "presente": {
        "label": "Presente",
        "symbol": "ponto ciano",
        "bones": {"head": (0, 0, 0), "chest": (0, 0, 0)},
        "mouth": {"smile": 0.58},
        "eyes": {},
    },
    "curioso": {
        "label": "Curioso",
        "symbol": "?",
        "bones": {
            "head": (0, 0, 11), "ear_L_1": (4, 0, -7), "ear_R_1": (-5, 0, 7),
            "upper_arm_R": (-90, 0, 0), "tail_01": (0, 0, 9),
        },
        "mouth": {"O": 0.30, "smile": 0.16},
        "eyes": {"squint_R": 0.22},
    },
    "eureka": {
        "label": "Eureca",
        "symbol": "lâmpada dourada com três raios",
        "bones": {
            "head": (-4, 0, 0), "chest": (-3, 0, 0),
            "upper_arm_L": (-100, 0, 0), "upper_arm_R": (-100, 0, 0),
            "ear_L_1": (-8, 0, -8), "ear_R_1": (8, 0, 8), "tail_01": (0, 0, 18),
        },
        "mouth": {"smile_wide": 0.90, "jaw_open": 0.56, "A": 0.40},
        "eyes": {"squint_L": 0.72, "squint_R": 0.72},
    },
    "pensando": {
        "label": "Pensando",
        "symbol": "reticências",
        "bones": {
            "head": (0, 0, -7), "upper_arm_R": (-78, 0, 0),
            "upper_arm_L": (-24, 0, 0), "tail_01": (0, 0, -5),
        },
        "mouth": {"frown": 0.40, "U": 0.16},
        "eyes": {"squint_L": 0.12},
    },
    "cochilando": {
        "label": "Cochilando",
        "symbol": "Z",
        "bones": {
            "head": (13, 0, 3), "chest": (4, 0, 0),
            "ear_L_1": (8, 0, -3), "ear_R_1": (8, 0, 3), "tail_01": (0, 0, -12),
        },
        "mouth": {"jaw_open": 0.23, "O": 0.24},
        "eyes": {"blink_L": 1.0, "blink_R": 1.0},
    },
    "concentrado": {
        "label": "Concentrado",
        "symbol": "alvo",
        "bones": {
            "head": (-3, 0, 0), "upper_arm_L": (-68, 0, 0), "upper_arm_R": (-68, 0, 0),
            "tail_01": (0, 0, 2),
        },
        "mouth": {"MBP": 0.50},
        "eyes": {"squint_L": 0.58, "squint_R": 0.58},
    },
    "confuso": {
        "label": "Confuso",
        "symbol": "¿",
        "bones": {
            "head": (0, 0, -12), "ear_L_1": (-5, 0, 9), "ear_R_1": (7, 0, -8),
            "upper_arm_L": (-52, 0, 0), "tail_01": (0, 0, -9),
        },
        "mouth": {"frown": 0.48, "O": 0.12},
        "eyes": {"squint_L": 0.10, "squint_R": 0.34},
    },
    "acolhedor": {
        "label": "Acolhedor",
        "symbol": "coração",
        "bones": {
            "head": (0, 0, 3), "chest": (-2, 0, 0),
            "upper_arm_L": (-38, 0, 0), "upper_arm_R": (-38, 0, 0),
            "ear_L_1": (2, 0, -3), "ear_R_1": (-2, 0, 3), "tail_01": (0, 0, 11),
        },
        "mouth": {"smile": 0.82},
        "eyes": {"squint_L": 0.32, "squint_R": 0.32},
    },
    "orgulhoso": {
        "label": "Orgulhoso",
        "symbol": "estrela",
        "bones": {
            "head": (-7, 0, 0), "chest": (-7, 0, 0),
            "tail_01": (0, 0, 14),
        },
        "mouth": {"smile": 0.68, "smile_wide": 0.16},
        "eyes": {"squint_L": 0.18, "squint_R": 0.18},
    },
}


def reset_pose() -> None:
    for bone in arm.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)


def remove_old_action(name: str) -> None:
    old = bpy.data.actions.get(name)
    if old:
        bpy.data.actions.remove(old)


def make_armature_action(slug: str, definition: dict) -> bpy.types.Action:
    name = f"mood_{slug}"
    remove_old_action(name)
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = action
    reset_pose()
    affected = set(definition["bones"])
    for bone_name in affected:
        bone = arm.pose.bones.get(bone_name)
        if not bone:
            continue
        bone.rotation_euler = (0, 0, 0)
        bone.keyframe_insert("rotation_euler", frame=1, group=bone_name)
        bone.rotation_euler = rad3(definition["bones"][bone_name])
        bone.keyframe_insert("rotation_euler", frame=14, group=bone_name)
        bone.keyframe_insert("rotation_euler", frame=34, group=bone_name)
        bone.rotation_euler = (0, 0, 0)
        bone.keyframe_insert("rotation_euler", frame=48, group=bone_name)
    action.frame_start = 1
    action.frame_end = 48
    arm.animation_data.action = None
    return action


def reset_shapes() -> None:
    for keys in (mouth_keys, eye_l_keys, eye_r_keys):
        for block in keys.key_blocks:
            if block.name != "Basis":
                block.value = 0.0


def apply_shapes(definition: dict) -> None:
    reset_shapes()
    for name, value in definition["mouth"].items():
        if name in mouth_keys.key_blocks:
            mouth_keys.key_blocks[name].value = value
    eyes = definition["eyes"]
    for key, value in eyes.items():
        if key == "blink_L":
            eye_l_keys.key_blocks["blink_L"].value = value
        elif key == "blink_R":
            eye_r_keys.key_blocks["blink_R"].value = value
        elif key == "squint_L":
            eye_l_keys.key_blocks["squint"].value = value
        elif key == "squint_R":
            eye_r_keys.key_blocks["squint"].value = value


def remove_expression_tracks(keys) -> None:
    keys.animation_data_create()
    for track in list(keys.animation_data.nla_tracks):
        if track.name.startswith("mood_"):
            keys.animation_data.nla_tracks.remove(track)


def make_shape_track(keys, slug: str, values: dict[str, float], key_map: dict[str, str]) -> None:
    action_name = f"mood_{slug}_{keys.name}"
    remove_old_action(action_name)
    action = bpy.data.actions.new(action_name)
    action.use_fake_user = True
    keys.animation_data_create()
    keys.animation_data.action = action
    targets = {key_map[name]: value for name, value in values.items() if name in key_map and key_map[name] in keys.key_blocks}
    for block_name, value in targets.items():
        block = keys.key_blocks[block_name]
        block.value = 0.0
        block.keyframe_insert("value", frame=1)
        block.value = value
        block.keyframe_insert("value", frame=14)
        block.keyframe_insert("value", frame=34)
        block.value = 0.0
        block.keyframe_insert("value", frame=48)
    action.frame_start = 1
    action.frame_end = 48
    keys.animation_data.action = None
    if targets:
        track = keys.animation_data.nla_tracks.new()
        track.name = f"mood_{slug}"
        strip = track.strips.new(f"mood_{slug}", 1, action)
        strip.action_frame_start = 1
        strip.action_frame_end = 48
        track.mute = True


# Remove earlier generated mood tracks and build fresh actions.
for key_data in (mouth_keys, eye_l_keys, eye_r_keys):
    remove_expression_tracks(key_data)

arm_actions: dict[str, bpy.types.Action] = {}
for mood_slug, mood in MOODS.items():
    arm_actions[mood_slug] = make_armature_action(mood_slug, mood)

# Render a review image for every emotional pose.
original_path = scene.render.filepath
for mood_slug, mood in MOODS.items():
    reset_pose()
    arm.animation_data.action = arm_actions[mood_slug]
    scene.frame_set(24)
    apply_shapes(mood)
    scene.render.filepath = str(PREVIEW_DIR / f"Nino_{mood_slug}.png")
    bpy.ops.render.render(write_still=True)

arm.animation_data.action = arm_actions["presente"]
scene.frame_set(24)
apply_shapes(MOODS["presente"])

# Create facial animation tracks after the review renders so they cannot affect them.
mouth_map = {name: name for name in mouth_keys.key_blocks.keys()}
eye_l_map = {"blink_L": "blink_L", "squint_L": "squint"}
eye_r_map = {"blink_R": "blink_R", "squint_R": "squint"}
for mood_slug, mood in MOODS.items():
    make_shape_track(mouth_keys, mood_slug, mood["mouth"], mouth_map)
    make_shape_track(eye_l_keys, mood_slug, mood["eyes"], eye_l_map)
    make_shape_track(eye_r_keys, mood_slug, mood["eyes"], eye_r_map)

arm["expression_set"] = ",".join(MOODS)
arm["expression_symbols"] = json.dumps({slug: mood["symbol"] for slug, mood in MOODS.items()}, ensure_ascii=False)

manifest = {
    "character": "Nino v1",
    "source": BLEND_PATH.name,
    "expressions": [
        {
            "id": slug,
            "label": mood["label"],
            "armature_action": f"mood_{slug}",
            "pendant_symbol": mood["symbol"],
            "preview": f"expressions/Nino_{slug}.png",
        }
        for slug, mood in MOODS.items()
    ],
}
(OUT / "Nino_v1_expression_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

scene.render.filepath = original_path
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
for obj in bpy.data.objects:
    if obj.parent == arm or obj == arm:
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
print(f"NINO_EXPRESSIONS_OK blend={BLEND_PATH} glb={GLB_PATH} previews={PREVIEW_DIR}")

