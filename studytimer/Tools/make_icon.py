#!/usr/bin/env python3
"""Generate the app icon.

Kept in the repo rather than committing a mystery PNG: the icon is the timer ring
from the Focus screen, so if the accent colour or the ring weight changes in
Theme.swift, this is the one place to change it back in sync.

    python3 Tools/make_icon.py

Writes Sources/App/Assets.xcassets/AppIcon.appiconset/AppIcon.png (1024x1024).
Xcode 26 only needs the single universal size.
"""

from __future__ import annotations

import math
import os

from PIL import Image, ImageDraw

# Supersample, then downscale — PIL has no antialiased arc, and a 1024px icon
# with jagged curves looks worse than no icon at all.
SCALE = 4
SIZE = 1024 * SCALE

BLACK = (0, 0, 0, 255)
BLUE = (10, 132, 255, 255)      # Theme.blue / --accent-blue
CYAN = (64, 200, 255, 255)      # highlight end of the ring gradient
WHITE = (255, 255, 255, 255)
# Pre-blended rather than translucent white: ImageDraw composites nothing, so an
# alpha fill on an opaque canvas lands fully opaque. This is 12% white over black.
TRACK = (31, 31, 33, 255)


def lerp(a: tuple, b: tuple, t: float) -> tuple:
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def draw_ring(draw: ImageDraw.ImageDraw, box: tuple, width: int,
              start: float, end: float) -> None:
    """Gradient arc, drawn as short segments so the colour can shift along it."""
    steps = 180
    for i in range(steps):
        t0 = start + (end - start) * (i / steps)
        t1 = start + (end - start) * ((i + 1) / steps)
        # Slight overlap keeps the seams invisible.
        draw.arc(box, t0, t1 + 0.6, fill=lerp(BLUE, CYAN, i / steps), width=width)


def draw_padlock(draw: ImageDraw.ImageDraw, cx: int, cy: int, unit: float) -> None:
    """A bold padlock — the one glyph that still reads at 40px."""
    body_w = unit * 2.05
    body_h = unit * 1.55
    body_top = cy - body_h * 0.18
    radius = unit * 0.34

    draw.rounded_rectangle(
        [cx - body_w / 2, body_top, cx + body_w / 2, body_top + body_h],
        radius=radius,
        fill=WHITE,
    )

    # Shackle: an arc thick enough not to disappear when the icon is scaled down.
    shackle_w = unit * 1.18
    shackle_top = cy - unit * 1.42
    shackle_thickness = int(unit * 0.36)
    draw.arc(
        [cx - shackle_w, shackle_top, cx + shackle_w, shackle_top + shackle_w * 2],
        start=180,
        end=360,
        fill=WHITE,
        width=shackle_thickness,
    )

    # Keyhole, punched out of the body so the lock doesn't read as a blank slab.
    key_r = unit * 0.24
    draw.ellipse(
        [cx - key_r, cy + unit * 0.16 - key_r, cx + key_r, cy + unit * 0.16 + key_r],
        fill=BLACK,
    )
    stem_w = unit * 0.15
    draw.rounded_rectangle(
        [cx - stem_w / 2, cy + unit * 0.2, cx + stem_w / 2, cy + unit * 0.78],
        radius=stem_w / 2,
        fill=BLACK,
    )


def build() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), BLACK)
    draw = ImageDraw.Draw(img)

    centre = SIZE // 2
    inset = SIZE * 0.155
    box = (inset, inset, SIZE - inset, SIZE - inset)
    ring_width = int(SIZE * 0.072)

    # Track: the same barely-there ring TimerRing draws behind the progress arc.
    draw.ellipse(box, outline=TRACK, width=ring_width)

    # Progress arc, ~72% round, starting at 12 o'clock. Not a full circle —
    # a closed ring reads as "done", and this app is about being mid-session.
    draw_ring(draw, box, ring_width, start=-90, end=-90 + 260)

    # Cap dot riding the leading edge, mirroring TimerRing.
    angle = math.radians(-90 + 260)
    radius = (SIZE - 2 * inset) / 2
    dot_r = ring_width * 0.52
    dx, dy = centre + radius * math.cos(angle), centre + radius * math.sin(angle)
    draw.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r], fill=WHITE)

    draw_padlock(draw, centre, centre, unit=SIZE * 0.105)

    return img.resize((1024, 1024), Image.LANCZOS).convert("RGB")


def main() -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(
        here, "..", "Sources", "App", "Assets.xcassets", "AppIcon.appiconset"
    )
    out = os.path.normpath(os.path.join(out_dir, "AppIcon.png"))
    build().save(out, "PNG")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
