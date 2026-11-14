#!/usr/bin/env python3
"""Generate the PWA icons for 星屿塔罗 (Pillow + numpy, no external assets)."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
S = 4  # supersampling factor


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def background(size):
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    cx, cy = size * 0.5, size * 0.38
    dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (size * 0.72)
    dist = np.clip(dist, 0, 1)[..., None]
    inner = np.array([27, 39, 66], dtype=np.float32)
    middle = np.array([14, 22, 38], dtype=np.float32)
    outer = np.array([7, 10, 18], dtype=np.float32)
    near = inner + (middle - inner) * np.clip(dist / 0.55, 0, 1)
    far = middle + (outer - middle) * np.clip((dist - 0.55) / 0.45, 0, 1)
    rgb = np.where(dist <= 0.55, near, far)
    return Image.fromarray(rgb.astype(np.uint8), "RGB").convert("RGBA")


def gold_gradient(size):
    top = (236, 217, 168)
    mid = (201, 168, 106)
    bottom = (156, 125, 70)
    arr = np.zeros((size, size, 3), dtype=np.uint8)
    for y in range(size):
        t = y / max(1, size - 1)
        if t < 0.52:
            color = lerp(top, mid, t / 0.52)
        else:
            color = lerp(mid, bottom, (t - 0.52) / 0.48)
        arr[y, :, :] = color
    return Image.fromarray(arr, "RGB").convert("RGBA")


def star(draw, cx, cy, outer, inner, points, fill, rotation=-np.pi / 2):
    verts = []
    for i in range(points * 2):
        r = outer if i % 2 == 0 else inner
        a = rotation + i * np.pi / points
        verts.append((cx + np.cos(a) * r, cy + np.sin(a) * r))
    draw.polygon(verts, fill=fill)


def build(size, transparent=False):
    canvas = size * S
    gold = gold_gradient(canvas)

    if transparent:
        image = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    else:
        image = background(canvas)

        # Soft gold halo behind the emblem.
        halo = Image.new("L", (canvas, canvas), 0)
        hd = ImageDraw.Draw(halo)
        hd.ellipse(
            (canvas * 0.12, canvas * 0.12, canvas * 0.88, canvas * 0.88),
            fill=64,
        )
        halo = halo.filter(ImageFilter.GaussianBlur(canvas * 0.09))
        glow = Image.new("RGBA", (canvas, canvas), (201, 168, 106, 0))
        glow.putalpha(halo)
        image = Image.alpha_composite(image, glow)

    # Outer rings.
    ring = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse(
        (canvas * 0.14, canvas * 0.14, canvas * 0.86, canvas * 0.86),
        outline=(201, 168, 106, 190),
        width=round(canvas * 0.0117),
    )
    rd.ellipse(
        (canvas * 0.174, canvas * 0.174, canvas * 0.826, canvas * 0.826),
        outline=(201, 168, 106, 72),
        width=max(1, round(canvas * 0.0039)),
    )
    image = Image.alpha_composite(image, ring)

    # Crescent: a gold disc with an offset bite taken out.
    cx, cy, r = canvas * 0.484, canvas * 0.504, canvas * 0.203
    cut_x, cut_y, cut_r = canvas * 0.586, canvas * 0.400, canvas * 0.219
    mask = Image.new("L", (canvas, canvas), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    md.ellipse((cut_x - cut_r, cut_y - cut_r, cut_x + cut_r, cut_y + cut_r), fill=0)
    gold_layer = gold.copy()
    gold_layer.putalpha(mask)
    image = Image.alpha_composite(image, gold_layer)

    # Thin highlight along the crescent's outer edge.
    edge = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    ed = ImageDraw.Draw(edge)
    ed.ellipse(
        (cx - r, cy - r, cx + r, cy + r),
        outline=(241, 227, 189, 80),
        width=max(1, round(canvas * 0.0029)),
    )
    edge.putalpha(Image.composite(edge.getchannel("A"), Image.new("L", (canvas, canvas), 0), mask))
    image = Image.alpha_composite(image, edge)

    # Stars.
    deco = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    star(dd, canvas * 0.6875, canvas * 0.3047, canvas * 0.078, canvas * 0.027, 8, (201, 168, 106, 255))
    star(dd, canvas * 0.332, canvas * 0.1875, canvas * 0.023, canvas * 0.008, 4, (201, 168, 106, 150))
    dd.ellipse(
        (canvas * 0.766 - canvas * 0.006, canvas * 0.586 - canvas * 0.006,
         canvas * 0.766 + canvas * 0.006, canvas * 0.586 + canvas * 0.006),
        fill=(232, 215, 174, 200),
    )
    dd.ellipse(
        (canvas * 0.289 - canvas * 0.005, canvas * 0.695 - canvas * 0.005,
         canvas * 0.289 + canvas * 0.005, canvas * 0.695 + canvas * 0.005),
        fill=(232, 215, 174, 150),
    )
    image = Image.alpha_composite(image, deco)

    return image.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    icon = build(512)
    icon.save(OUT / "icon-512.png", optimize=True)
    build(192).save(OUT / "icon-192.png", optimize=True)

    # Transparent emblem for the Windows shortcut / desktop icon.
    clear = build(512, transparent=True)
    clear.save(OUT / "icon-transparent.png", optimize=True)
    clear.save(
        OUT / "astra-tarot-transparent.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("icons written:", OUT)


if __name__ == "__main__":
    main()
