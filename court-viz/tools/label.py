"""Stamp the brief's CONCEPT label (bottom-left, Montserrat Bold, white on 60% navy) onto stills.

Usage: python3 tools/label.py in.png [in2.png ...] --out DIR
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT = Path(__file__).resolve().parent.parent / "assets/fonts/Montserrat-Bold.ttf"
TEXT = "CONCEPT - HOOP HUB"  # --text overrides, e.g. "CONCEPT - HEROES ARENA"


def stamp(src: Path, out_dir: Path, text: str = TEXT) -> Path:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    size = round(h * 0.018)
    font = ImageFont.truetype(str(FONT), size)
    pad_x, pad_y, margin = round(size * 0.8), round(size * 0.5), round(h * 0.03)
    box = font.getbbox(text)
    tw, th = box[2] - box[0], box[3] - box[1]
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y1 = margin, h - margin
    y0 = y1 - th - 2 * pad_y
    d.rounded_rectangle((x0, y0, x0 + tw + 2 * pad_x, y1), radius=round(size * 0.3), fill=(20, 38, 78, 153))
    d.text((x0 + pad_x - box[0], y0 + pad_y - box[1]), text, font=font, fill=(255, 255, 255, 255))
    out = out_dir / src.name
    Image.alpha_composite(im, layer).convert("RGB").save(out)
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--text", default=TEXT)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    for f in a.files:
        print(stamp(f, a.out, a.text))
