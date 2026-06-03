"""Normalize shoe photos from Desktop/asd: clean white background, consistent framing."""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageFilter

ASD = Path(r"C:\Users\Szabolcs\Desktop\asd")
OUT = Path(r"C:\Users\Szabolcs\Desktop\igen\images")

SLIDESHOW = {
    "nike airmax feher.png": "akcio-airmax-feher.png",
    "airmax feher+kék.png": "akcio-airmax-feher-kek.png",
    "airmax kék 2.png": "akcio-airmax-kek-2.png",
    "nike cipo kék.png": "akcio-nike-kek.png",
    "nike cipo piros.png": "akcio-nike-piros.png",
}

PRODUCTS = {
    "Nike cipo fekete feher.png": "termek-white-af1.png",
    "nike cipo piros.png": "termek-black-af1.png",
    "nike airmax feher.png": "termek-airmax-feher.png",
    "Nike cipo fekete feher.png": "termek-nike-fekete-feher.png",
}

BG_THRESHOLD = 238


def is_background_pixel(r: int, g: int, b: int, a: int = 255) -> bool:
    if a < 20:
        return True
    mx = max(r, g, b)
    mn = min(r, g, b)
    if mx >= BG_THRESHOLD and (mx - mn) <= 28:
        return True
    if mx >= 218 and mn >= 195 and (mx - mn) <= 40:
        return True
    return False


def content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    found = False
    step = 2
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b, a = pixels[x, y]
            if not is_background_pixel(r, g, b, a):
                found = True
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if not found:
        return None
    max_x = min(w - 1, max_x + step)
    max_y = min(h - 1, max_y + step)
    return min_x, min_y, max_x + 1, max_y + 1


def normalize_product(
    src: Path,
    dst: Path,
    *,
    canvas_ratio: tuple[int, int] = (4, 3),
    max_px: int = 900,
    pad_ratio: float = 0.07,
) -> None:
    im = Image.open(src).convert("RGBA")
    bbox = content_bbox(im)
    if not bbox:
        shutil.copy2(src, dst)
        return

    cropped = im.crop(bbox)
    px = cropped.load()
    for y in range(cropped.height):
        for x in range(cropped.width):
            r, g, b, a = px[x, y]
            if is_background_pixel(r, g, b, a):
                px[x, y] = (255, 255, 255, 255)

    cw, ch = cropped.size
    pad = int(max(cw, ch) * pad_ratio)
    padded = Image.new("RGBA", (cw + pad * 2, ch + pad * 2), (255, 255, 255, 255))
    padded.paste(cropped, (pad, pad), cropped)

    ratio_w, ratio_h = canvas_ratio
    target_ratio = ratio_w / ratio_h
    pw, ph = padded.size
    if pw / ph > target_ratio:
        new_w, new_h = pw, int(pw / target_ratio)
    else:
        new_h, new_w = ph, int(ph * target_ratio)

    canvas = Image.new("RGBA", (new_w, new_h), (255, 255, 255, 255))
    canvas.paste(padded, ((new_w - pw) // 2, (new_h - ph) // 2), padded)

    scale = min(1.0, max_px / max(canvas.size))
    if scale < 1.0:
        canvas = canvas.resize(
            (int(canvas.width * scale), int(canvas.height * scale)),
            Image.Resampling.LANCZOS,
        )

    canvas = canvas.convert("RGB")
    canvas = canvas.filter(ImageFilter.UnsharpMask(radius=1.1, percent=85, threshold=2))
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dst, "PNG", optimize=True)


def make_logo(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    bbox = content_bbox(im)
    if not bbox:
        shutil.copy2(src, dst)
        return
    cropped = im.crop(bbox)
    px = cropped.load()
    for y in range(cropped.height):
        for x in range(cropped.width):
            r, g, b, a = px[x, y]
            if is_background_pixel(r, g, b, a):
                px[x, y] = (255, 255, 255, 0)
    side = max(cropped.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2), cropped)
    canvas = canvas.resize((220, 220), Image.Resampling.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dst, "PNG", optimize=True)


def resolve_asd(name: str) -> Path | None:
    direct = ASD / name
    if direct.exists():
        return direct
    key = name.casefold()
    for p in ASD.iterdir():
        if p.is_file() and p.name.casefold() == key:
            return p
    return None


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    for src_name, out_name in SLIDESHOW.items():
        src = resolve_asd(src_name)
        if not src:
            print("MISSING", src_name)
            continue
        normalize_product(src, OUT / out_name, canvas_ratio=(16, 10), max_px=960)
        print("akcio:", out_name)

    for src_name, out_name in PRODUCTS.items():
        src = resolve_asd(src_name)
        if not src:
            print("MISSING", src_name)
            continue
        normalize_product(src, OUT / out_name, canvas_ratio=(4, 3), max_px=800)
        print("termek:", out_name)

    logo_src = resolve_asd("nike airmax feher.png")
    if logo_src:
        make_logo(logo_src, OUT / "logo.png")
        print("logo.png")

    print("done")


if __name__ == "__main__":
    main()
