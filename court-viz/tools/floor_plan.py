"""Draw the Hoop Hub floor markings plans for floor tile suppliers: A3 landscape SVGs at 1:75, dimensioned.

Usage: python3 tools/floor_plan.py --out renders/floor
Then: node tools/floor_plan.mjs renders/floor   (PDFs and PNGs from the SVGs)

Two versions: 'basketball' (3x3 with a grey key, the mini court across, the logo) and 'multi-sport' (no 3x3
key fill or logo, so the mini court reads as the main court, plus a gold dodgeball halfway line and blue
lines for three children's pickleball and badminton courts).

The 3x3 markings are drawn to FIBA measurements from the inner edge of the white baseline (key 4.9 x 5.8 m,
basket centre 1.575 m, three-point line 6.75 m with 0.9 m corners). The court itself, 14.8 x 10 m, is sized
to the floor, not to the full FIBA 3x3 court (15 x 11 m). The gold mini court is Hoop Heroes' own layout.
"""
import argparse
import base64
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAVY, GOLD, WHITE = "#14264e", "#fba91a", "#ffffff"
COURT, KEY, INK, PAPER = "#6e7276", "#a7a9ac", "#334155", "#ffffff"
HOOP = "#e0531f"
BLUE = "#2f9bdc"  # racket lines in the multi-sport version

# floor: 18.0 m between the container faces x 12.19 m between the end walls; court 14.8 x 10 m, centred
FX, FZ0, FZ1 = 9.0, -1.095, 11.095
W, L = 14.8, 10.0
WHITE_W, GOLD_W = 0.05, 0.04
BASE_IN = 0.15  # inner edge of the white baseline from the court edge (0.10 inset + 0.05 line)
# children's racket courts (multi-sport): bounded by the gold mini court boundary, inner sidelines at x ±2.60
# make a 5.20 m middle court and two 4.78 m outer courts, 9.96 m long (to line centres); service (non-volley)
# lines 1.80 m from the net
RACKET_X = 2.6
RACKET_EDGE = GOLD_W / 2  # centre of the gold boundary in from the court edge
RACKET_MID = (W / 2 - RACKET_EDGE + 2.6) / 2  # centre lines of the outer courts
RACKET_SERVICE = 1.8
RACKET_W = 0.04

SCALE = 1000 / 75  # mm on the sheet per metre: 1:75 on A3
OX, OY = 26.0, 56.0  # sheet position of the floor's top-left corner (x -9, z -1.095)


def X(x):
    return OX + (x + FX) * SCALE


def Y(z):
    return OY + (z - FZ0) * SCALE


def m(v):
    return v * SCALE


def b64(path):
    return base64.b64encode((ROOT / path).read_bytes()).decode()


class Sheet:
    def __init__(self):
        self.parts = []

    def add(self, s):
        self.parts.append(s)

    def line(self, x0, z0, x1, z1, color, w, extra=""):
        self.add(f'<line x1="{X(x0):.3f}" y1="{Y(z0):.3f}" x2="{X(x1):.3f}" y2="{Y(z1):.3f}" stroke="{color}" stroke-width="{m(w):.3f}" {extra}/>')

    def rect(self, x0, z0, x1, z1, fill="none", stroke="none", w=0, extra=""):
        self.add(
            f'<rect x="{X(x0):.3f}" y="{Y(z0):.3f}" width="{m(x1 - x0):.3f}" height="{m(z1 - z0):.3f}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{m(w):.3f}" {extra}/>'
        )

    def path(self, d, color, w, extra=""):
        self.add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{m(w):.3f}" {extra}/>')

    def text(self, x, y, s, size=2.6, color=INK, anchor="middle", weight="700", family="Montserrat", rotate=None, extra=""):
        rot = f' transform="rotate({rotate} {x:.2f} {y:.2f})"' if rotate is not None else ""
        self.add(
            f'<text x="{x:.2f}" y="{y:.2f}" font-family="{family}" font-weight="{weight}" font-size="{size}" '
            f'fill="{color}" text-anchor="{anchor}"{rot} {extra}>{s}</text>'
        )

    def label(self, x, y, s, size=2.3, rotate=0):
        # a dimension figure on a white pill so it reads over the floor; rotate turns it about its centre
        w = 0.62 * size * len(s) + 1.6
        cy = y - size * 0.35
        self.add(f'<g transform="rotate({rotate} {x:.2f} {cy:.2f})">')
        self.add(f'<rect x="{x - w / 2:.2f}" y="{y - size * 0.95:.2f}" width="{w:.2f}" height="{size * 1.35:.2f}" rx="{size * 0.6:.2f}" fill="{PAPER}" fill-opacity="0.92"/>')
        self.text(x, y, s, size=size, color=NAVY)
        self.add("</g>")

    def dim(self, x0, y0, x1, y1, s, off=0.0, size=2.3):
        """Dimension line between two sheet points (mm), with end ticks and the figure in the middle."""
        self.add(f'<line x1="{x0:.2f}" y1="{y0:.2f}" x2="{x1:.2f}" y2="{y1:.2f}" stroke="{NAVY}" stroke-width="0.22"/>')
        ang = math.atan2(y1 - y0, x1 - x0)
        for px, py in ((x0, y0), (x1, y1)):
            dx, dy = math.cos(ang + math.pi / 4) * 1.1, math.sin(ang + math.pi / 4) * 1.1
            self.add(f'<line x1="{px - dx:.2f}" y1="{py - dy:.2f}" x2="{px + dx:.2f}" y2="{py + dy:.2f}" stroke="{NAVY}" stroke-width="0.3"/>')
        # figures on vertical runs read up the sheet, along the line; radii stay level
        upright = abs(x1 - x0) < 0.01
        self.label((x0 + x1) / 2 + off, (y0 + y1) / 2 + size * 0.35, s, size, rotate=-90 if upright else 0)


def arc_path(cx, cz, r, a0, a1, sweep):
    # SVG arc on the floor's coordinates; angles in radians, measured in the x-z plane
    x0, z0 = cx + r * math.cos(a0), cz + r * math.sin(a0)
    x1, z1 = cx + r * math.cos(a1), cz + r * math.sin(a1)
    large = 1 if abs(a1 - a0) > math.pi else 0
    return f"M {X(x0):.3f} {Y(z0):.3f} A {m(r):.3f} {m(r):.3f} 0 {large} {sweep} {X(x1):.3f} {Y(z1):.3f}"


MULTI_NOTES = [
    "Mini basketball (gold), the main court: played",
    "across, between the 10 m sides. Keys 2.75 x 2.50 m,",
    "free-throw semicircles R 1.25 m, three-point lines",
    "R 4.00 m from the rim (0.60 m in), corners 1.20 m in.",
    "Dodgeball (gold): the mini court boundary plus a",
    "halfway line: two halves of 7.40 x 10.00 m.",
    "Pickleball / badminton (blue): three children's",
    "courts inside the gold boundary, 4.78 / 5.20 / 4.78 m",
    "wide and 9.96 m long (to line centres), portable",
    "nets across the middle. Service (non-volley) lines",
    "1.80 m from the net; centre lines to the ends. The",
    "gold halfway line is the middle court's centre line.",
    "No 3x3 markings and no logo in this version.",
]
MULTI_SUPPLIER = [
    "Whole floor 18.00 x 12.19 m (219 m²), indoors under",
    "a fabric canopy, laid on school playground tarmac.",
    "Run-off in the same grey as the court.",
    "Not to official sizes: laid out for 5 to 11-year-olds",
    "to make the most of the floor.",
    "Please propose tile type, size and layout, and how",
    "the lines are applied (printed, inlaid or painted).",
    "Net posts: freestanding, at the dots on the net line.",
    "Hoop bases: dashed outlines, for reference only.",
]


def build(variant):
    multi = variant == "multi-sport"
    s = Sheet()
    hw, gw = WHITE_W / 2, GOLD_W / 2
    # floor: run-off and court in the same grey, keys lighter
    s.rect(-FX, FZ0, FX, FZ1, fill=COURT, stroke=NAVY, w=0.03)
    s.rect(-W / 2, 0, W / 2, L, fill="none", stroke="#565a5e", w=0.012, extra='stroke-dasharray="1.2 0.8"')
    if not multi:
        s.rect(-2.45, 0.10, 2.45, BASE_IN + 5.8, fill=KEY)
    for sd in (-1, 1):
        x0, x1 = sorted((sd * W / 2, sd * (W / 2 - 2.75)))
        s.rect(x0, 3.75, x1, 6.25, fill=KEY)

    # gold mini court: boundary on the court edge, then at each 10 m side a key, free-throw semicircle and
    # a 4.0 m three-point line with corner lines 1.2 m in from the 14.8 m sides
    s.rect(-W / 2 + gw, gw, W / 2 - gw, L - gw, stroke=GOLD, w=GOLD_W)
    for sd in (-1, 1):
        edge = sd * W / 2
        inner = sd * (W / 2 - 2.75)
        s.line(edge, 3.75 + gw, inner, 3.75 + gw, GOLD, GOLD_W)
        s.line(edge, 6.25 - gw, inner, 6.25 - gw, GOLD, GOLD_W)
        s.line(inner - sd * gw, 3.75, inner - sd * gw, 6.25, GOLD, GOLD_W)
        a = -math.pi / 2 if sd > 0 else math.pi / 2
        s.path(arc_path(inner, 5.0, 1.25 - gw, a, a + math.pi, 0 if sd > 0 else 0), GOLD, GOLD_W)
        rim = sd * (W / 2 - 0.6)
        r3 = 4.0 - gw
        for zc in (1.2, 8.8):
            dz = zc - 5.0
            dx = math.sqrt(r3 * r3 - dz * dz)
            s.line(edge, zc, rim - sd * dx, zc, GOLD, GOLD_W)
        ang = math.asin(3.8 / r3)
        if sd < 0:
            s.path(arc_path(rim, 5.0, r3, -ang, ang, 1), GOLD, GOLD_W)
        else:
            s.path(arc_path(rim, 5.0, r3, math.pi + ang, math.pi - ang, 0), GOLD, GOLD_W)

    # white 3x3 (basketball version only): boundary 0.10 m inside the court edge, key, free-throw semicircle,
    # three-point line
    basket = BASE_IN + 1.575
    b = 0.10 + hw
    if not multi:
        s.rect(-W / 2 + b, b, W / 2 - b, L - b, stroke=WHITE, w=WHITE_W)
        ft = BASE_IN + 5.8 - hw
        s.path(f"M {X(-2.45 + hw):.3f} {Y(BASE_IN):.3f} L {X(-2.45 + hw):.3f} {Y(ft):.3f} L {X(2.45 - hw):.3f} {Y(ft):.3f} L {X(2.45 - hw):.3f} {Y(BASE_IN):.3f}", WHITE, WHITE_W)
        s.path(arc_path(0, ft, 1.8 - hw, math.pi, 0, 0), WHITE, WHITE_W)
        r3 = 6.75 - hw
        cx = W / 2 - BASE_IN - 0.9 - hw
        meet = basket + math.sqrt(r3 * r3 - cx * cx)
        ang = math.atan2(meet - basket, cx)
        s.path(
            f"M {X(-cx):.3f} {Y(BASE_IN):.3f} L {X(-cx):.3f} {Y(meet):.3f} "
            + arc_path(0, basket, r3, math.pi - ang, ang, 0).replace("M", "L", 1)
            + f" L {X(cx):.3f} {Y(BASE_IN):.3f}",
            WHITE,
            WHITE_W,
        )

    if not multi:
        # logo at the open end, left of centre
        lw = 2.98
        lh = lw * 1418 / 2929
        s.add(f'<image x="{X(-4.38):.2f}" y="{Y(8.27):.2f}" width="{m(lw):.2f}" height="{m(lh):.2f}" href="data:image/png;base64,{b64("assets/logo.png")}"/>')
    else:
        # dodgeball (gold): the mini court's boundary with a halfway line between the two 14.8 m sides, giving
        # two 7.40 x 10.00 m halves; it also serves as the middle racket court's centre line
        s.line(0, gw, 0, L - gw, GOLD, GOLD_W)
        # racket courts (blue): three side by side inside the white 3x3 boundary, which is their outer line;
        # nets across the middle (z 5.0), service lines 1.80 m either side, centre lines to the ends
        rb = RACKET_EDGE
        for x in (-RACKET_X, RACKET_X):
            s.line(x, rb, x, L - rb, BLUE, RACKET_W)
        for zc in (5.0 - RACKET_SERVICE, 5.0 + RACKET_SERVICE):
            s.line(-W / 2 + rb, zc, W / 2 - rb, zc, BLUE, RACKET_W)
        for x in (-RACKET_MID, RACKET_MID):
            s.line(x, rb, x, 5.0 - RACKET_SERVICE, BLUE, RACKET_W)
            s.line(x, 5.0 + RACKET_SERVICE, x, L - rb, BLUE, RACKET_W)
        # portable nets and their posts, for reference (not markings)
        s.line(-W / 2 + rb, 5.0, W / 2 - rb, 5.0, "#0f172a", 0.02, extra='stroke-dasharray="1.6 0.9"')
        for x in (-W / 2 + rb, -RACKET_X, RACKET_X, W / 2 - rb):
            s.add(f'<circle cx="{X(x):.2f}" cy="{Y(5.0):.2f}" r="1.0" fill="#0f172a"/>')

    # hoops, for reference only (not floor markings): main portable goal, base straddling the baseline; mini
    # hoops on the 10 m sides, bases on the run-off
    dash = 'stroke-dasharray="0.9 0.6"'
    s.rect(-0.495, -1.07, 0.495, 0.48, fill="#14264e", stroke=WHITE, w=0.015, extra=f'fill-opacity="0.35" {dash}')
    s.line(-0.76, BASE_IN + 1.2, 0.76, BASE_IN + 1.2, "#16181b", 0.05)
    s.add(f'<circle cx="{X(0):.2f}" cy="{Y(basket):.2f}" r="{m(0.2286):.2f}" fill="none" stroke="{HOOP}" stroke-width="0.35"/>')
    for sd in (-1, 1):
        rx = sd * (W / 2 - 0.6)
        x0, x1 = sorted((sd * 7.51, sd * 8.96))
        s.rect(x0, 4.615, x1, 5.385, fill="#16181b", stroke=WHITE, w=0.015, extra=f'fill-opacity="0.35" {dash}')
        s.line(sd * 7.18, 4.34, sd * 7.18, 5.66, "#16181b", 0.05)
        s.add(f'<circle cx="{X(rx):.2f}" cy="{Y(5.0):.2f}" r="{m(0.2286):.2f}" fill="none" stroke="{HOOP}" stroke-width="0.35"/>')

    # ---------------------------------------------------------------- dimensions (metres)
    top = Y(FZ0)
    bot = Y(FZ1)
    s.dim(X(-FX), top - 9, X(FX), top - 9, "18.00 floor (container face to container face)")
    s.dim(X(-FX) - 9, Y(FZ0), X(-FX) - 9, Y(FZ1), "12.19 floor (end wall to end wall)", size=2.3)
    s.dim(X(-W / 2), bot + 7, X(W / 2), bot + 7, "14.80 court")
    s.dim(X(-FX), bot + 7, X(-W / 2), bot + 7, "1.60")
    s.dim(X(W / 2), bot + 7, X(FX), bot + 7, "1.60")
    s.dim(X(FX) + 7, Y(0), X(FX) + 7, Y(L), "10.00 court")
    s.dim(X(FX) + 7, Y(FZ0), X(FX) + 7, Y(0), "1.10")
    s.dim(X(FX) + 7, Y(L), X(FX) + 7, Y(FZ1), "1.10")
    if multi:
        # racket courts, along the bottom end; dodgeball halves along the top
        zr = 8.9
        s.dim(X(-W / 2 + RACKET_EDGE), Y(zr), X(-RACKET_X), Y(zr), "4.78", size=2.0)
        s.dim(X(-RACKET_X), Y(zr), X(RACKET_X), Y(zr), "5.20", size=2.0)
        s.dim(X(RACKET_X), Y(zr), X(W / 2 - RACKET_EDGE), Y(zr), "4.78", size=2.0)
        s.dim(X(-RACKET_MID - 0.9), Y(RACKET_EDGE), X(-RACKET_MID - 0.9), Y(L - RACKET_EDGE), "racket court 9.96", size=2.0)
        s.dim(X(RACKET_MID + 0.7), Y(5.0 - RACKET_SERVICE), X(RACKET_MID + 0.7), Y(5.0), "1.80", size=1.9)
        s.dim(X(RACKET_MID + 0.7), Y(5.0), X(RACKET_MID + 0.7), Y(5.0 + RACKET_SERVICE), "1.80", size=1.9)
        s.dim(X(-W / 2), Y(-0.55), X(0), Y(-0.55), "dodgeball half 7.40", size=2.0)
        s.dim(X(0), Y(-0.55), X(W / 2), Y(-0.55), "dodgeball half 7.40", size=2.0)
        s.label(X(-1.3), Y(5.0) - 1.6, "nets", size=1.9)
    # 3x3
    if not multi:
        s.dim(X(-2.45), Y(7.15), X(2.45), Y(7.15), "key 4.90")
        s.dim(X(-3.2), Y(BASE_IN), X(-3.2), Y(BASE_IN + 5.8), "key 5.80", off=0)
    if not multi:
        s.dim(X(0.0), Y(BASE_IN), X(0.0), Y(basket), "1.575", size=2.0)
        s.dim(X(0), Y(basket), X(0) + m(6.75) * math.cos(math.radians(62)), Y(basket) + m(6.75) * math.sin(math.radians(62)), "R 6.75")
        s.dim(X(0), Y(ft), X(0) + m(1.8) * math.cos(math.radians(120)), Y(ft) + m(1.8) * math.sin(math.radians(120)), "R 1.80", size=2.0)
        s.dim(X(-W / 2 + BASE_IN), Y(0.9), X(-cx - hw), Y(0.9), "0.90", size=2.0)
    # mini court (right-hand end)
    s.dim(X(W / 2 - 2.75), Y(3.2), X(W / 2), Y(3.2), "2.75", size=2.0)
    s.dim(X(W / 2 - 4.05), Y(3.75), X(W / 2 - 4.05), Y(6.25), "2.50", size=2.0)
    s.dim(X(W / 2 - 0.6), Y(5.0), X(W / 2 - 0.6) - m(4.0) * math.cos(math.radians(32)), Y(5.0) + m(4.0) * math.sin(math.radians(32)), "R 4.00", size=2.0)
    s.dim(X(W / 2 - 2.75), Y(5.0), X(W / 2 - 2.75) - m(1.25) * math.cos(math.radians(-35)), Y(5.0) + m(1.25) * math.sin(math.radians(-35)), "R 1.25", size=1.9)
    s.dim(X(W / 2 - 1.0), Y(0), X(W / 2 - 1.0), Y(1.2), "1.20", size=2.0)
    s.dim(X(W / 2 - 0.6), Y(6.6), X(W / 2), Y(6.6), "0.60", size=1.9)

    # ---------------------------------------------------------------- title, notes, legend
    title = "HOOP HUB · FLOOR MARKINGS PLAN" + (" · MULTI-SPORT" if multi else "")
    s.text(OX - 6, 20, title, size=9, color=NAVY, anchor="start", family="Lilita One", weight="400")
    s.text(OX - 6, 28, "Example for floor tile suppliers · covered hub floor · scale 1:75 at A3 · dimensions in metres", size=3.4, color=INK, anchor="start")
    sub = (
        "For 5 to 11-year-olds: mini basketball across the court, dodgeball and three children's pickleball / badminton courts."
        if multi
        else "Main hoop end at the top. 3x3 markings to FIBA measurements from the inner edge of the white baseline."
    )
    s.text(OX - 6, 33.5, sub, size=2.7, color=INK, anchor="start", weight="400")

    nx, ny = 300.0, 52.0
    s.text(nx, ny, "COLOURS", size=4, color=NAVY, anchor="start", family="Lilita One", weight="400")
    rows = [
        (COURT, "Court and run-off tiles", "mid grey · #6e7276"),
        (KEY, "Mini court keys" if multi else "Keys (3x3 and both mini)", "light grey · #a7a9ac"),
    ] + ([] if multi else [(WHITE, "3x3 lines", "white · 50 mm wide")]) + [
        (GOLD, "Mini basketball" + (" and dodgeball" if multi else " court lines"), "Hoop Heroes gold · #fba91a · 40 mm wide"),
    ] + ([(BLUE, "Pickleball / badminton", "blue · #2f9bdc · 40 mm wide")] if multi else [])
    for i, (col, a, b2) in enumerate(rows):
        y = ny + 7 + i * 9
        s.add(f'<rect x="{nx:.2f}" y="{y - 4:.2f}" width="7" height="5.5" rx="1" fill="{col}" stroke="#94a3b8" stroke-width="0.25"/>')
        s.text(nx + 10, y - 0.6, a, size=2.8, color=INK, anchor="start")
        s.text(nx + 10, y + 3, b2, size=2.4, color=INK, anchor="start", weight="400")

    y = ny + 7 + len(rows) * 9 + 5
    s.text(nx, y, "MARKINGS", size=4, color=NAVY, anchor="start", family="Lilita One", weight="400")
    notes = MULTI_NOTES if multi else [
        "3x3 (white): boundary 0.10 m inside the court edge;",
        "key 4.90 x 5.80 m; free-throw semicircle R 1.80 m;",
        "three-point line R 6.75 m from the basket centre",
        "(1.575 m from the baseline), straight 0.90 m in",
        "from the sidelines. No no-charge semicircle.",
        "Mini court (gold): played across, between the 10 m",
        "sides. Boundary on the court edge; at each end a",
        "2.75 x 2.50 m key, free-throw semicircle R 1.25 m",
        "and three-point line R 4.00 m from the rim (0.60 m",
        "in), straight 1.20 m in from the 14.8 m sides.",
        "No halfway line or centre circle.",
        "Logo: Hoop Heroes, about 3.0 x 1.4 m, open end,",
        "left of centre (artwork to be supplied).",
    ]
    for i, t in enumerate(notes):
        s.text(nx, y + 6 + i * 4.2, t, size=2.45, color=INK, anchor="start", weight="400")

    y += 6 + len(notes) * 4.2 + 6
    s.text(nx, y, "FOR THE SUPPLIER", size=4, color=NAVY, anchor="start", family="Lilita One", weight="400")
    notes = MULTI_SUPPLIER if multi else [
        "Whole floor 18.00 x 12.19 m (219 m²), indoors under",
        "a fabric canopy, laid on school playground tarmac.",
        "Run-off in the same grey as the court.",
        "Please propose tile type, size and layout, and how",
        "the lines are applied (printed, inlaid or painted).",
        "Main portable hoop base (155 x 99 cm, about 260 kg",
        "plus ballast) sits partly on the court; mini hoop",
        "bases sit on the run-off. Dashed outlines show",
        "them for reference; they are not markings.",
        "Court is sized to the floor, not to the full FIBA",
        "3x3 court (15 x 11 m).",
    ]
    for i, t in enumerate(notes):
        s.text(nx, y + 6 + i * 4.2, t, size=2.45, color=INK, anchor="start", weight="400")

    # concept label
    s.add(f'<rect x="{OX - 6:.2f}" y="275" width="52" height="9" rx="1.5" fill="{NAVY}"/>')
    s.text(OX - 6 + 26, 281.2, "CONCEPT - HOOP HUB", size=3.2, color=WHITE)
    s.text(410, 281.2, "Concept only · confirm all dimensions on site", size=2.6, color=INK, anchor="end", weight="400")

    fonts = (
        f"@font-face{{font-family:'Lilita One';src:url(data:font/ttf;base64,{b64('assets/fonts/LilitaOne-Regular.ttf')})}}"
        f"@font-face{{font-family:'Montserrat';font-weight:700;src:url(data:font/ttf;base64,{b64('assets/fonts/Montserrat-Bold.ttf')})}}"
        f"@font-face{{font-family:'Montserrat';font-weight:400;src:url(data:font/ttf;base64,{b64('assets/fonts/Montserrat-Bold.ttf')})}}"
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297">'
        f"<style>{fonts}</style>"
        f'<rect width="420" height="297" fill="{PAPER}"/>' + "".join(s.parts) + "</svg>"
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="renders/floor")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    for variant, name in (("basketball", "Hoop Hub floor markings plan"), ("multi-sport", "Hoop Hub floor markings plan - multi-sport")):
        f = out / f"{name}.svg"
        f.write_text(build(variant))
        print(f)
