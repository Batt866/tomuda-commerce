#!/usr/bin/env python3
"""Regenerate PWA and Android launcher icons from branding/logo-blue.png."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = ROOT / "static/tomuda/branding/logo-blue.png"
PWA_DIR = ROOT / "static/tomuda/icons"
ANDROID_RES = ROOT / "android/app/src/main/res"

# Padding so OS masks (iOS squircle / Android adaptive) do not clip the mark.
# The previous icon filled too much of the canvas, so some launchers showed only
# the leading T after applying their own mask.
PWA_LOGO_SCALE = 0.56
ADAPTIVE_LOGO_SCALE = 0.46
ICON_BG = (255, 255, 255, 255)


def compose_icon(logo: Image.Image, canvas_size: int, scale: float, background):
    canvas = Image.new("RGBA", (canvas_size, canvas_size), background)
    max_side = int(canvas_size * scale)
    lw, lh = logo.size
    ratio = min(max_side / lw, max_side / lh)
    nw, nh = max(1, int(lw * ratio)), max(1, int(lh * ratio))
    resized = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (canvas_size - nw) // 2
    y = (canvas_size - nh) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)
    print(f"wrote {path.relative_to(ROOT)} ({image.size[0]}x{image.size[1]})")


def main() -> None:
    logo = Image.open(LOGO_PATH).convert("RGBA")

    pwa_targets = {
        180: ["icon-180.png", "apple-touch-icon.png"],
        192: ["icon-192.png"],
        512: ["icon-512.png"],
    }
    for size, names in pwa_targets.items():
        icon = compose_icon(logo, size, PWA_LOGO_SCALE, ICON_BG)
        for name in names:
            save_png(icon, PWA_DIR / name)

    adaptive_sizes = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432,
    }
    for folder, size in adaptive_sizes.items():
        fg = compose_icon(logo, size, ADAPTIVE_LOGO_SCALE, (0, 0, 0, 0))
        save_png(fg, ANDROID_RES / folder / "ic_launcher_foreground.png")

    legacy_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in legacy_sizes.items():
        icon = compose_icon(logo, size, PWA_LOGO_SCALE, ICON_BG)
        save_png(icon, ANDROID_RES / folder / "ic_launcher.png")
        save_png(icon, ANDROID_RES / folder / "ic_launcher_round.png")


if __name__ == "__main__":
    main()
