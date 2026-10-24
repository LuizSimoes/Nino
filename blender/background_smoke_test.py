from pathlib import Path

import bpy


result = Path(__file__).with_name("background_smoke_test.txt")
result.write_text(
    f"BACKGROUND_OK\nversion={bpy.app.version_string}\nbackground={bpy.app.background}\n",
    encoding="utf-8",
)

