#!/usr/bin/env python3
"""Build the NSIS welcome/header bitmaps from the app's transparent icon."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = Path(__file__).resolve().parent / "assets"
ICON = ROOT / "icons" / "icon-transparent.png"

BG = (7, 11, 20)
GOLD = (201, 168, 106)
GOLD_DIM = (150, 124, 77)
CREAM = (232, 224, 207)


def font(size: int, serif: bool = True) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\simsun.ttc" if serif else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\msyh.ttc",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


def add_stars(draw: ImageDraw.ImageDraw, width: int, height: int, seed: int = 7, count: int = 52) -> None:
    rng = random.Random(seed)
    for _ in range(count):
        x = rng.uniform(4, width - 4)
        y = rng.uniform(4, height - 4)
        radius = rng.choice([0.4, 0.4, 0.5, 0.7, 0.9])
        alpha = rng.randint(22, 95)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(210, 196, 168, alpha))


def radial_background(width: int, height: int, glow_xy: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", (width, height), BG + (255,))
    pixels = image.load()
    gx, gy = glow_xy
    max_dist = math.hypot(width, height) * 0.78
    for y in range(height):
        for x in range(width):
            distance = math.hypot(x - gx, y - gy)
            strength = max(0.0, 1.0 - distance / max_dist) ** 2
            r = int(BG[0] + 18 * strength)
            g = int(BG[1] + 16 * strength)
            b = int(BG[2] + 22 * strength)
            pixels[x, y] = (r, g, b, 255)
    return image


def gold_star(draw: ImageDraw.ImageDraw, cx: float, cy: float, radius: float) -> None:
    points = []
    for index in range(16):
        angle = -math.pi / 2 + index * math.pi / 8
        r = radius if index % 2 == 0 else radius * 0.30
        points.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    draw.polygon(points, fill=GOLD + (255,))


def build_welcome() -> Image.Image:
    width, height = 164, 314
    image = radial_background(width, height, (82, 118))
    draw = ImageDraw.Draw(image, "RGBA")
    add_stars(draw, width, height)

    draw.rectangle((0, 0, width - 1, height - 1), outline=(80, 68, 47, 255), width=1)
    draw.line((16, 22, 148, 22), fill=GOLD_DIM + (150,), width=1)
    draw.line((16, 292, 148, 292), fill=GOLD_DIM + (150,), width=1)

    icon = Image.open(ICON).convert("RGBA")
    icon = icon.resize((122, 122), Image.LANCZOS)
    image.alpha_composite(icon, (21, 54))

    draw.text((82, 196), "星 屿 塔 罗", font=font(17), fill=CREAM + (255,), anchor="mm")
    draw.text((82, 218), "A S T R A   T A R O T", font=font(6, serif=False), fill=GOLD + (255,), anchor="mm")
    return image.convert("RGB")


def build_header() -> Image.Image:
    width, height = 150, 57
    image = radial_background(width, height, (38, 28))
    draw = ImageDraw.Draw(image, "RGBA")
    add_stars(draw, width, height, seed=12, count=14)
    draw.line((0, height - 1, width, height - 1), fill=GOLD_DIM + (120,), width=1)

    icon = Image.open(ICON).convert("RGBA").resize((42, 42), Image.LANCZOS)
    image.alpha_composite(icon, (8, 7))
    draw.text((57, 28), "星屿塔罗", font=font(14), fill=CREAM + (255,), anchor="lm")
    return image.convert("RGB")


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    welcome = build_welcome()
    header = build_header()
    welcome.save(ASSETS / "welcome.bmp", "BMP")
    header.save(ASSETS / "header.bmp", "BMP")
    print(f"welcome: {welcome.size} -> {ASSETS / 'welcome.bmp'}")
    print(f"header:  {header.size} -> {ASSETS / 'header.bmp'}")


if __name__ == "__main__":
    main()


