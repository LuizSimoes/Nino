"""Render all nine Nino v5 runtime expressions for visual review."""

from pathlib import Path

import bpy


ROOT = Path(bpy.data.filepath).resolve().parents[2]
OUT = ROOT / "outputs" / "3d" / "runtime_v5_expressions"
OUT.mkdir(parents=True, exist_ok=True)

if Path(bpy.data.filepath).name != "Nino_v5_runtime_ready.blend":
    raise RuntimeError("Open Nino_v5_runtime_ready.blend before rendering expressions")

scene = bpy.context.scene
arm = bpy.data.objects["Nino_Rig"]
cavity = bpy.data.objects["Mouth_Cavity_V4"]
tongue = bpy.data.objects.get("Tongue_V4")
sleep_group = bpy.data.objects["SleepEyes_Group"]
eye_detail_groups = {
    "L": bpy.data.objects["EyeDetailGroup_L"],
    "R": bpy.data.objects["EyeDetailGroup_R"],
}
pendant_groups = {
    slug: bpy.data.objects[f"PendantIcon_{slug}"]
    for slug in (
        "presente", "curioso", "eureka", "pensando", "cochilando",
        "concentrado", "confuso", "acolhedor", "orgulhoso",
    )
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


def reset_face() -> None:
    for obj in (cavity, bpy.data.objects["EyeWhite_L"], bpy.data.objects["EyeWhite_R"]):
        for key in obj.data.shape_keys.key_blocks:
            if key.name != "Basis":
                key.value = 0.0
    if tongue:
        tongue.scale = (0.001, 0.001, 0.001)


def apply_face(slug: str) -> None:
    reset_face()
    mouth, eyes = FACES[slug]
    for name, value in mouth.items():
        cavity.data.shape_keys.key_blocks[name].value = value
    left = bpy.data.objects["EyeWhite_L"].data.shape_keys.key_blocks
    right = bpy.data.objects["EyeWhite_R"].data.shape_keys.key_blocks
    if "blink_L" in eyes:
        left["blink_L"].value = eyes["blink_L"]
    if "blink_R" in eyes:
        right["blink_R"].value = eyes["blink_R"]
    if "squint_L" in eyes:
        left["squint"].value = eyes["squint_L"]
    if "squint_R" in eyes:
        right["squint"].value = eyes["squint_R"]
    if tongue and slug in {"eureka", "cochilando"}:
        amount = 0.78 if slug == "eureka" else 0.30
        tongue.scale = (amount, amount, amount)


def apply_runtime_state(slug: str) -> None:
    for mood, group in pendant_groups.items():
        amount = 1.0 if mood == slug else 0.001
        group.scale = (amount, amount, amount)
    sleeping = slug == "cochilando"
    lid_amount = 1.0 if sleeping else 0.001
    detail_amount = 0.001 if sleeping else 1.0
    sleep_group.scale = (lid_amount, lid_amount, lid_amount)
    for group in eye_detail_groups.values():
        group.scale = (detail_amount, detail_amount, detail_amount)


original_path = scene.render.filepath
original_resolution = (scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage)
scene.render.resolution_x = 720
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100

for slug in FACES:
    arm.animation_data.action = bpy.data.actions.get(f"mood_{slug}")
    scene.frame_set(24)
    apply_face(slug)
    apply_runtime_state(slug)
    scene.render.filepath = str(OUT / f"Nino_{slug}.png")
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)

arm.animation_data.action = bpy.data.actions.get("mood_presente")
scene.frame_set(24)
apply_face("presente")
apply_runtime_state("presente")
scene.render.filepath = original_path
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = original_resolution
bpy.ops.wm.save_as_mainfile(filepath=str(Path(bpy.data.filepath)))
print(f"NINO_V5_EXPRESSIONS_OK output={OUT}")
