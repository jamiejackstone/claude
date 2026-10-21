"""Lay out the flat court artwork as a to-scale plan sheet.

Usage: python3 tools/plan_sheet.py PLAN_DIR --out DIR
Reads court.png from tools/plan.mjs (400 px per metre, hoop end at the top).
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
NAVY = (20, 38, 78)
GOLD = (251, 169, 26)
INK = (51, 65, 85)
BG = (248, 250, 252)
HOOP = (40, 42, 46)
SRC_PX = 400
L, W = 10.0, 14.8  # depth from the Mega Slam baseline, baseline length


def font(name, size):
    return ImageFont.truetype(str(ROOT / "assets/fonts" / name), size)


def heading(size):
    return font("LilitaOne-Regular.ttf", size)


def body(size):
    return font("Montserrat-Bold.ttf", size)


def concept_label(d, h, x=40):
    f = body(22)
    t = "CONCEPT - NOT A REAL INSTALL"
    b = f.getbbox(t)
    y1 = h - 36
    y0 = y1 - (b[3] - b[1]) - 20
    d.rounded_rectangle((x, y0, x + b[2] - b[0] + 28, y1), radius=6, fill=NAVY)
    d.text((x + 14 - b[0], y0 + 10 - b[1]), t, font=f, fill="white")


def draw_hoops(d, ox, oy, s, line=4, bases=True):
    # Mega Slam: board face 1.2 m in, rim centre 1.575 m; post just behind the baseline
    d.line((ox + (W / 2 - 0.915) * s, oy + 1.2 * s, ox + (W / 2 + 0.915) * s, oy + 1.2 * s), fill=HOOP, width=line)
    r = 0.2286 * s
    cx, cy = ox + W / 2 * s, oy + 1.575 * s
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(224, 83, 31), width=max(2, line - 1))
    d.rectangle((cx - 0.08 * s, oy - 0.22 * s, cx + 0.08 * s, oy - 0.02 * s), fill=HOOP)
    # portable hoops: rim 0.6 m inside each 10 m side line, centred at 5.0 m, board 1.32 m wide, base outside the tiles
    for side in (-1, 1):
        rx = ox + (W / 2 + side * (W / 2 - 0.6)) * s
        bx = rx + side * 0.38 * s
        cz = oy + 5.0 * s
        d.line((bx, cz - 0.66 * s, bx, cz + 0.66 * s), fill=HOOP, width=line)
        d.ellipse((rx - r, cz - r, rx + r, cz + r), outline=(224, 83, 31), width=max(2, line - 1))
        if not bases:
            continue
        x_edge = ox + (W / 2 + side * W / 2) * s
        x0, x1 = sorted((x_edge + side * 0.02 * s, x_edge + side * 1.47 * s))
        d.rounded_rectangle((x0, cz - 0.385 * s, x1, cz + 0.385 * s), radius=int(0.06 * s), outline=HOOP, width=max(2, line - 1))


def dim_arrow(d, a, b, text, f, vertical=False):
    d.line((*a, *b), fill=INK, width=2)
    for p in (a, b):
        if vertical:
            d.line((p[0] - 10, p[1], p[0] + 10, p[1]), fill=INK, width=2)
        else:
            d.line((p[0], p[1] - 10, p[0], p[1] + 10), fill=INK, width=2)
    tb = f.getbbox(text)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    if vertical:
        lbl = Image.new("RGBA", (tw + 16, th + 12), BG + (255,))
        ImageDraw.Draw(lbl).text((8 - tb[0], 6 - tb[1]), text, font=f, fill=INK)
        lbl = lbl.rotate(90, expand=True)
        return lbl, (int(mx - lbl.width / 2), int(my - lbl.height / 2))
    d.rectangle((mx - tw / 2 - 8, my - th / 2 - 6, mx + tw / 2 + 8, my + th / 2 + 6), fill=BG)
    d.text((mx - tw / 2 - tb[0], my - th / 2 - tb[1]), text, font=f, fill=INK)
    return None


def main_sheet(court_png: Path, out: Path):
    s = 100  # px per metre on the sheet
    cw, ch = int(W * s), int(L * s)
    left, right, top, bottom = 330, 300, 440, 480
    sheet = Image.new("RGB", (left + cw + right, top + ch + bottom), BG)
    d = ImageDraw.Draw(sheet)
    court = Image.open(court_png).convert("RGB").resize((cw, ch), Image.LANCZOS)
    ox, oy = left, top
    # tarmac surround so the slim tile border reads
    d.rectangle((ox - 30, oy - 40, ox + cw + 30, oy + ch + 30), fill=(92, 95, 99))
    sheet.paste(court, (ox, oy))
    draw_hoops(d, ox, oy, s)

    d.text((60, 50), "HOOP HUB PHASE 1", font=heading(64), fill=NAVY)
    d.text((60, 128), "COURT MARKINGS PLAN", font=heading(40), fill=GOLD)
    d.text((60, 190), "Bird's-eye plan, to scale. 14.8 m baseline, 10 m deep; mini court runs across between the portable hoops.", font=body(22), fill=INK)

    f = body(20)
    dim_arrow(d, (ox, oy - 90), (ox + cw, oy - 90), "14.8 m baseline", f)
    lbl = dim_arrow(d, (ox - 240, oy), (ox - 240, oy + ch), "10.0 m", f, vertical=True)
    sheet.paste(lbl[0], lbl[1])
    d = ImageDraw.Draw(sheet)
    for text, y in (("MEGA SLAM END", oy - 150), ("OPEN END", oy + ch + 60)):
        tb = heading(30).getbbox(text)
        d.text((ox + cw / 2 - (tb[2] - tb[0]) / 2, y), text, font=heading(30), fill=NAVY)
    for x in (ox - 147, ox + cw + 40):
        y = oy + 5.0 * s + 52
        d.text((x, y), "PORTABLE", font=body(18), fill=INK)
        d.text((x, y + 24), "HOOP", font=body(18), fill=INK)

    # legend
    ly = oy + ch + 130
    items = [
        ((255, 255, 255), "White 50 mm: 3x3 half court (FIBA key, arc, free-throw line and semicircle)"),
        (GOLD, "Gold 40 mm: mini court boundary just outside the white; key outline, free-throw semicircle and 3-point line at each portable hoop"),
        ((110, 114, 118), "Court tiles, mid grey #6e7276"),
        ((167, 169, 172), "All three keys, lighter grey #a7a9ac"),
        (HOOP, "Hoop positions, for reference only (not painted)"),
    ]
    for i, (col, text) in enumerate(items):
        x = 60
        y = ly + i * 44
        d.rectangle((x, y + 4, x + 34, y + 26), fill=col, outline=(150, 150, 150))
        d.text((x + 48, y + 2), text, font=body(17), fill=INK)
    concept_label(d, sheet.height, 60)
    sheet.save(out)
    return out


def variants_sheet(files, captions, title, subtitle, out: Path, pick=None):
    """Side-by-side comparison of court artwork variants."""
    s = 64
    cw, ch = int(W * s), int(L * s)
    gap, top = 150, 260
    sheet = Image.new("RGB", (gap + len(files) * (cw + gap), top + ch + 260), BG)
    d = ImageDraw.Draw(sheet)
    d.text((60, 50), title, font=heading(56), fill=NAVY)
    d.text((60, 125), subtitle, font=body(22), fill=INK)
    for i, (f, (t, l1, l2)) in enumerate(zip(files, captions)):
        ox, oy = gap + i * (cw + gap), top
        d.rectangle((ox - 18, oy - 22, ox + cw + 18, oy + ch + 18), fill=(92, 95, 99))
        sheet.paste(Image.open(f).convert("RGB").resize((cw, ch), Image.LANCZOS), (ox, oy))
        draw_hoops(d, ox, oy, s, line=3, bases=False)
        d.text((ox, oy + ch + 40), t, font=heading(34), fill=GOLD if i == pick else NAVY)
        d.text((ox, oy + ch + 92), l1, font=body(18), fill=INK)
        d.text((ox, oy + ch + 118), l2, font=body(18), fill=INK)
    concept_label(d, sheet.height, 60)
    sheet.save(out)
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("plan_dir", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    print(main_sheet(a.plan_dir / "court.png", a.out / "court-markings-plan.png"))
    logos = sorted(a.plan_dir.glob("logo-*.png"))
    if logos:
        print(variants_sheet(logos, [
            ("A  CURRENT", "Main landscape logo at the open end,", "left of centre, about 3 m wide."),
            ("B  ROUND LOGO, KEY CENTRE", "White round logo, 1.2 m across, where", "the centre circle was (inside the key)."),
            ("C  ROUND LOGO, LARGER", "White round logo, 2.0 m across,", "centred in the key, clear of the rim."),
        ], "COURT LOGO OPTIONS", "Same markings, three ways to brand the surface.", a.out / "logo-options.png"))
