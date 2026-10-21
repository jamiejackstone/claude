"""Build the Hoop Hub Phase 1 concept visual brief (v3) as a .docx for review.

Usage: python3 brief/build_brief.py --media DIR --plan PNG --out DOCX
--media holds the v2 brief's images (image2 = orientation reference, image3/5/1/6 = Mega Slam references).
"""
import argparse
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

NAVY = RGBColor(0x14, 0x26, 0x4E)
GOLD = RGBColor(0xFB, 0xA9, 0x1A)
GRAY = RGBColor(0x33, 0x41, 0x55)
HEAD = "Lilita One"
BODY = "Montserrat"


def shade(cell, hex_fill):
    tc = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    tc.append(shd)


def run(p, text, bold=False, italic=False, size=10, color=GRAY, font=BODY):
    r = p.add_run(text)
    r.bold, r.italic = bold, italic
    r.font.size = Pt(size)
    r.font.name = font
    r.font.color.rgb = color
    r._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    return r


def para(doc, text="", **kw):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    if text:
        run(p, text, **kw)
    return p


def heading(doc, text, size=16, color=NAVY):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    run(p, text.upper(), size=size, color=color, font=HEAD)
    return p


def bullet(doc, label, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(2)
    if label:
        run(p, f"{label} - ", bold=True, color=NAVY)
    run(p, text)
    return p


def numbered(doc, n, label, text):
    # numbers written out so each list restarts at 1
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.8)
    p.paragraph_format.first_line_indent = Cm(-0.6)
    p.paragraph_format.space_after = Pt(3)
    run(p, f"{n}.  ", bold=True, color=NAVY)
    if label:
        run(p, f"{label} - ", bold=True, color=NAVY)
    run(p, text)


def table(doc, header, rows, widths):
    t = doc.add_table(rows=1, cols=len(header))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for i, h in enumerate(header):
        c = t.rows[0].cells[i]
        shade(c, "14264E")
        c.paragraphs[0].text = ""
        run(c.paragraphs[0], h, bold=True, size=9, color=RGBColor(255, 255, 255))
    for r in rows:
        cells = t.add_row().cells
        for i, v in enumerate(r):
            cells[i].paragraphs[0].text = ""
            run(cells[i].paragraphs[0], v, size=9, bold=(i == 0), color=NAVY if i == 0 else GRAY)
    for i, w in enumerate(widths):
        t.columns[i].width = Cm(w)
    for row in t.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = Cm(w)
    doc.add_paragraph()
    return t


def banner(doc, text, fill="14264E", color=RGBColor(255, 255, 255), size=10):
    t = doc.add_table(rows=1, cols=1)
    c = t.rows[0].cells[0]
    shade(c, fill)
    c.paragraphs[0].text = ""
    return c, run(c.paragraphs[0], text, bold=True, size=size, color=color)


def image(doc, path, width_cm, caption=None):
    doc.add_picture(str(path), width=Cm(width_cm))
    doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    if caption:
        p = para(doc, caption, italic=True, size=8.5)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER


def build(media: Path, plan: Path, out: Path):
    doc = Document()
    sec = doc.sections[0]
    sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
    sec.left_margin = sec.right_margin = Cm(1.8)
    sec.top_margin = sec.bottom_margin = Cm(1.6)
    st = doc.styles["Normal"]
    st.font.name = BODY
    st.font.size = Pt(10)

    banner(doc, "CONCEPT ONLY - NOT A REAL INSTALL. Generic UK school playground. No real school, no real site, no identifiable children.")
    p = para(doc)
    p.paragraph_format.space_before = Pt(10)
    run(p, "HOOP HUB PHASE 1 - CONCEPT VISUAL BRIEF v3", size=22, color=NAVY, font=HEAD)
    para(doc, "3x3 half court with a fixed in-ground Mega Slam hoop, a cross-court mini court with two portable hoops, and a branded storage container", bold=True, color=NAVY)
    para(doc, "For: external 3D designer / render artist   |   From: Jamie Stone, Hoop Heroes   |   Date: 21 October 2026   |   Status: v3 for designer briefing (replaces v2)", size=9)

    c, _ = banner(doc, "Changes in v3 (21 October 2026)", fill="FEF3DC", color=NAVY)
    for t in [
        "Court turned 90 degrees. The 3x3 baseline is now the 14.8 m side of the tiles, with the Mega Slam centred on it, and the court runs 10 m deep to the open end. It is wider than it is long, like a standard FIBA 3x3 court (15 x 11 m).",
        "Mini court runs across the 3x3 court. The 3x3 sidelines become the mini court's baselines, with a portable hoop at each. It is 14.8 m long between the hoops and 10 m wide, using the white 3x3 boundary lines as its edges.",
        "Markings simplified: all three keys are light grey; the gold mini court is a boundary just outside the white 3x3 boundary, plus at each end a key outline, a free-throw semicircle and a small 3-point line. There is no no-charge semicircle under the Mega Slam, and no mini-court halfway line or centre circle. The white 3x3 lines sit on top wherever they cross.",
        "The Mega Slam is not used in mini sessions. Because the mini court now covers the whole surface, the v2 idea of a lowered Mega Slam as a separate shooting station is dropped; in the mini-game shot it stays at 10 ft, not in use.",
        "Clear space beyond each sideline increased to 2.0 m so the portable hoop bases sit on tarmac.",
        "Container is now a billboard in a navy wrap with a gold stripe: huge logo with HOOP HUB in large gold letters beneath on both long sides, a QR code (Book a FREE Trial) and round logo on the doors. Full-width ramp; two ball racks inside, no hanging bags.",
        "Hub in a box: a 10 ft container carries the whole kit - the floor, both portable hoops and the balls. The floor is 60 large panels (1.23 x 2.0 m) instead of about 1,650 small tiles, stored flat on a wheeled trolley so they do not bend. New still (shot 7) shows the container as delivered.",
        "Mega Slam padding is navy. The round Hoop Heroes logo goes on all three backboards.",
        "Coordinates, key dimensions, plan drawing (Section 3), shot list and Section 11 rewritten to match.",
    ]:
        q = c.add_paragraph(style="List Bullet")
        run(q, t, size=9)

    heading(doc, "1. Orientation reference (start here)")
    para(doc, "This screenshot from a 3D court-designer tool shows the look and camera direction we want. Use it for layout, colours and viewpoint. It is not to scale and does not show the extra items (mini court, portable hoops, container): add those from the plan in Section 3.", italic=True, size=9)
    image(doc, media / "image2.png", 11, "Orientation reference: 3x3 half court in grey, wider than it is deep, lighter grey key, white lines and arc, Hoop Heroes logo at the open end. Viewed from the open end, looking towards the main hoop. (v3 moves the logo to the open end, left of centre; see Section 3.)")
    bullet(doc, "3x3 half court first and foremost", "the white 3x3 markings must read as the main court in every shot.")
    bullet(doc, "Surface", "mid-grey court panels, a lighter grey key, white lines including the 2-point arc, and a slim lighter border around the edge, as in the reference.")
    bullet(doc, "Logo", "Hoop Heroes logo (gold hand-and-ball icon, white wordmark) painted at the open end, left of centre, reading the right way up for someone standing at the open end.")
    bullet(doc, "Main camera direction", "from the open end of the court, looking towards the main hoop.")

    heading(doc, "2. What we want you to render")
    para(doc, "Hoop Hub Phase 1 is a concept for a small, open-air outdoor basketball court for Hoop Heroes, a UK basketball club for children aged 5 to 15. It sits on the tarmac of a generic UK school playground. The idea in one line: it arrives packed and unpacks onto court. A fixed Mega Slam hoop is the anchor for 3x3. Two wheeled, folding portable hoops come out of a small steel container for cross-court mini basketball, then fold away again.")
    bullet(doc, "Floor", "60 large modular court panels, each 1.23 x 2.0 m, laid 12 across and 5 deep to make 14.8 m wide x 10.0 m deep, directly on the playground tarmac. Show the panel joints faintly.")
    bullet(doc, "Primary: 3x3 half court (white)", "a standard 3x3 half court using the whole tile area: one hoop, one key, the 2-point arc, sidelines and baseline. The baseline is the 14.8 m edge with the fixed Mega Slam centred on it; the sidelines are the 10 m edges.")
    bullet(doc, "Secondary: mini court (gold)", "a mini basketball court for younger children running across the 3x3 court, at 90 degrees to it. The 3x3 sidelines are its baselines, with a portable hoop at each. Its gold lines are a boundary just outside the white, and at each end a key, a free-throw semicircle and a small 3-point line.")
    bullet(doc, "Fixed hoop", "Mega Slam 72, in-ground: post set in the tarmac just behind the centre of the 14.8 m baseline, board overhanging the baseline. Used for 3x3 only.")
    bullet(doc, "Portable hoops", "two Tarmak B900 Box hoops (Decathlon) on wheeled bases, one just outside each 10 m sideline, centred on it and facing each other across the 14.8 m. Used for the mini court only.")
    bullet(doc, "Storage container", "one 10 ft steel container, square to the court, set back behind and to one side of the main hoop, off the tiles. It is the hub in a box: it arrives holding the floor panels, both portable hoops and the balls, and is wrapped as a navy and gold billboard that is clearly ours and doubles as an advert.")
    para(doc, "Phase 1 is open air. There is no canopy, roof, floodlights, toilet or building. Do not add any of these.", bold=True, color=NAVY)

    heading(doc, "3. Top-down plan (to scale)")
    image(doc, plan, 16.5, "Plan v3, drawn to scale. Mega Slam end at the top, open end at the bottom. Model the scene from this plan.")
    para(doc, 'Coordinates used in this brief: "across" runs along the 14.8 m baseline, measured from the left sideline (0 m) to the right sideline (14.8 m) as seen from the open end. "Depth" runs from the Mega Slam baseline (0 m) to the open-end line (10 m).', size=9)
    para(doc, "How to read the source tags: [FIBA] = FIBA 3x3 Official Rules 2026, Article 2. [SUPPLIER] = the manufacturer's published spec. [DESIGN] = a Hoop Heroes design choice. [ASSUMED] = not published; please flag if it looks wrong.", italic=True, size=8.5)

    heading(doc, "3.1 Key dimensions", size=13)
    table(doc, ["Item", "Value", "Source"], [
        ["Floor (whole court)", "14.8 m wide x 10.0 m deep (148 m²): 60 panels of 1.233 x 2.0 m (12 across the baseline, 5 deep), about 15 to 20 mm thick, faint joints visible", "[DESIGN]"],
        ["Line widths", "White 3x3 lines 50 mm. Gold mini-court lines 40 mm", "[FIBA] / [DESIGN]"],
        ["3x3 court", "14.8 m baseline (FIBA 15 m) x 10.0 m deep (FIBA 11 m). The white boundary lines sit 0.10 m in from the tile edge, just inside the gold mini-court boundary. All dimensions below are measured from the tile edge", "[DESIGN]"],
        ["Basket centre", "1.575 m in from the baseline, centred across (7.4 m)", "[FIBA]"],
        ["Backboard face", "1.20 m in from the baseline (board overhangs the baseline)", "[FIBA]"],
        ["Key (restricted area)", "5.80 m deep x 4.90 m wide, lighter grey fill, white outline", "[FIBA] size / [DESIGN] colour"],
        ["Free-throw line and semicircle", "Line 5.80 m from the baseline, 3.60 m long; semicircle radius 1.80 m", "[FIBA]"],
        ["2-point arc", "Radius 6.75 m from basket centre; straight corner lines 0.90 m inside each white sideline (1.0 m from the tile edge), meeting the arc 3.72 m from the baseline; top of arc 8.33 m from the baseline", "[FIBA] radius / [DESIGN] corners"],
        ["No-charge semicircle", "Left off for a cleaner court", "[DESIGN]"],
        ["Mini court area", "The whole tile area, run across: 14.8 m long between the two 10 m sidelines (its baselines) x 10.0 m wide (its sidelines run along the 3x3 baseline and end line), outlined by the gold boundary", "[DESIGN]"],
        ["Mini court boundary", "Gold, 40 mm, on the tile edge all round; the white 3x3 boundary runs 60 mm inside it", "[DESIGN]"],
        ["Mini keys (one each end)", "Light grey fill (as the 3x3 key) with a gold outline: 2.75 m deep in from each 10 m tile edge x 2.50 m wide, centred 5.0 m from the baseline, with a gold free-throw semicircle of radius 1.25 m. The white 3x3 arc and corner line run over the top", "[DESIGN]"],
        ["Mini 3-point lines (one each end)", "Gold. Radius 4.0 m from the mini basket centre (0.6 m in from the tile edge, 5.0 m from the baseline); straight corner lines 1.2 m in from the 14.8 m edges, meeting the arc 1.85 m in from the end; top of arc 4.6 m in", "[DESIGN]"],
        ["Portable hoop bases", "1.45 x 0.77 m, on the tarmac just outside each 10 m sideline, centred 5.0 m from the baseline, facing each other across the 14.8 m", "[SUPPLIER] base / [DESIGN] position"],
        ["Portable hoop rim position", "About 0.6 m inside the tile edge", "[ASSUMED]"],
        ["Court logo", "Hoop Heroes landscape logo, about 3.0 m wide (artwork incl. margin), at the open end, left of centre, between the white arc and the end line: roughly 4.4 m to 1.4 m left of the centre line, about 0.35 m clear of every line", "[DESIGN]"],
        ["Mega Slam post", "On the tarmac just behind the baseline, centred across (7.4 m)", "[DESIGN]"],
        ["Storage container", "10 ft: 2.99 m long x 2.44 m deep x 2.59 m high. Square to the court, long side parallel to the baseline, set back 2.0 m behind the floor, to the right of the hoop seen from the open end (roughly 10.9 m to 13.9 m across). Doors on the outer short end", "[SUPPLIER] size / [DESIGN] position"],
        ["Clear space on the tarmac", "2.0 m behind the baseline, 2.0 m beyond each sideline (room for the portable hoop bases), 1.0 m beyond the open end", "[DESIGN]"],
    ], [4.2, 9.6, 3.6])

    heading(doc, "3.2 What differs from a full FIBA 3x3 court", size=13)
    for t in [
        "The court is 14.8 m x 10.0 m against FIBA's 15.0 m x 11.0 m, set by the tile area. The orientation is the same: wider than it is deep.",
        "The key, free-throw line, arc radius and basket position are full FIBA size, measured from the tile edge. FIBA measures from the inner edge of the baseline, which here is 0.15 m in, so the hoop sits about 0.15 m closer to the white baseline than FIBA; this keeps the Mega Slam post off the tiles. The no-charge semicircle is left off.",
        "The gold mini-court lines overlap the white ones: the white arc crosses each mini key and gold 3-point line. This is expected; white sits on top where they meet.",
        "The clear space around the court is tarmac, not tiles. Show the tiles ending with a slim bevelled edge.",
        "This is a community court, not an official competition court.",
    ]:
        bullet(doc, None, t)

    heading(doc, "4. Markings")
    table(doc, ["Markings", "Lines", "Fill", "Notes"], [
        ["Primary: 3x3 half court (Mega Slam on the 14.8 m baseline, 10 m deep)", "Solid white, 50 mm", "Court mid grey; key lighter grey (match the orientation reference)", "Must read as the main court from every angle"],
        ["Secondary: mini court (runs across, between the portable hoops on the 10 m sidelines)", "Gold #fba91a, 40 mm: boundary just outside the white, and at each end a key outline, free-throw semicircle and 3-point line", "Mini keys light grey, as the 3x3 key", "No halfway line, no centre circle. Where gold meets white, white sits on top"],
        ["Logo", "-", "Hoop Heroes logo painted at the open end, left of centre", "Gold icon, white wordmark. Only logo on the court surface"],
    ], [4.4, 4.0, 4.0, 5.0])

    heading(doc, "5. Materials and colours")
    table(doc, ["Element", "Material", "Colour / finish"], [
        ["Court panels", "Large-format modular sports-surface panels, 1.23 x 2.0 m, perforated top, clipped together", "Mid grey (about #6e7276), matt; faint joints"],
        ["Key", "As above", "Lighter grey (about #a7a9ac), matt"],
        ["White lines", "Painted on the tiles", "White #ffffff, matt"],
        ["Gold lines", "Painted on the tiles", "Gold #fba91a, matt"],
        ["Border strip", "Tile edge / bevel", "Slightly lighter grey, as in the reference"],
        ["Mega Slam post and arm", "Galvanised steel, black powder coat", "Black"],
        ["Mega Slam padding", "Post and base pad, backboard edge pad", "Navy #14264e; small Hoop Heroes logo on the post pad"],
        ["Mega Slam backboard", "Tempered glass, clear", "Clear glass, white border and target box; round Hoop Heroes logo (navy version, about 0.36 m) centred above the target box"],
        ["Portable hoops", "Tarmak B900 Box: polycarbonate board 132 x 78 cm, six-wheel base", "Black / grey as supplied. Round Hoop Heroes logo (navy version, about 0.25 m) centred above the target box; no other brands"],
        ["Storage container", "Steel mini container with end double doors", "Full vinyl wrap, navy #14264e base with a gold #fba91a stripe low down. Lettering and artwork as Section 8"],
        ["Playground", "Weathered dark-grey tarmac with faded generic play markings (hopscotch, number snake)", "Natural, no readable text"],
        ["Any lettering", "Lilita One (headings, upper case); Montserrat (body)", "-"],
    ], [4.0, 6.7, 6.7])
    heading(doc, "5.1 Logo files (use these; do not redraw)", size=13)
    bullet(doc, None, "Logo versions, all from the Hoop Heroes Drive (05 - Marketing / 01 - Logos & Brand): landscape logo with gold icon and white wordmark (court surface, Mega Slam pad, container sides); round logo, navy (backboards); round logo, white (container doors and far end). Hoop Heroes will supply the artwork files.")
    bullet(doc, None, 'Logo rules: always write "Hoop Heroes" (two words). Do not recolour or distort the logo. Never put it on a white pill or badge over a dark background. Keep clear space around it equal to the height of the basketball icon. Do not use gold for small text on a white background.')

    heading(doc, "6. Fixed hoop: Mega Slam 72 (in-ground, height-adjustable)")
    table(doc, ["Spec", "Value", "Source"], [
        ["Installation", "In-ground: the post is set in the tarmac just behind the centre of the baseline. Show it rising straight out of the tarmac with a padded base. No steel on the tiles", "[DESIGN]"],
        ["Backboard", "72 x 42 in (1.83 x 1.07 m), 1/2 in tempered glass", "[SUPPLIER]"],
        ["Overhang (post to board face)", "1.22 m at 10 ft rim height; about 1.52 m at 7.5 ft. The board overhangs the baseline", "[SUPPLIER]"],
        ["Rim height", "Adjustable 5 to 10 ft (1.52 to 3.05 m) with a crank handle on the post", "[SUPPLIER]"],
        ["Main post", "8 x 6 in steel with gusseted base", "[SUPPLIER]"],
        ["Top of board at full height", "About 3.9 m", "[SUPPLIER]"],
        ["Rim", "18 in (45.7 cm) breakaway rim", "[SUPPLIER]"],
    ], [4.2, 9.6, 3.6])
    para(doc, "Note: the overhang grows as the rim is lowered, so the rim moves about 0.3 m further onto the court in lowered shots. Please model that.", size=9)
    para(doc, "Reference images (manufacturer photos, for reference only, not for publication):", bold=True, color=NAVY, size=9)
    t = doc.add_table(rows=2, cols=4)
    caps = ["Mega Slam 72 (product shot)", "Mega Slam 60 (similar model, for shape only)", "Glass backboard and rim", "Base with gussets (padding goes over)"]
    for i, name in enumerate(["image3.jpg", "image5.jpg", "image1.jpg", "image6.jpg"]):
        cell = t.rows[0].cells[i]
        cell.paragraphs[0].add_run().add_picture(str(media / name), width=Cm(3.8))
        t.rows[1].cells[i].paragraphs[0].text = ""
        run(t.rows[1].cells[i].paragraphs[0], caps[i], size=8)
    para(doc, "Product page: https://www.megaslamhoops.uk/basketball-hoops/in-ground-adjustable/megaslam-72", size=9)

    heading(doc, "7. Portable hoops: 2 x Tarmak B900 Box (Decathlon)")
    table(doc, ["Spec", "Value", "Source"], [
        ["Position", "One just outside each 10 m sideline, centred on it (5.0 m from the baseline), facing each other across the 14.8 m", "[DESIGN]"],
        ["Rim height", "Crank-adjustable, about 2.40 to 3.05 m", "[SUPPLIER]"],
        ["Base", "145 x 77 cm, six large wheels, ballast tanks", "[SUPPLIER]"],
        ["Backboard", "132 x 78 cm polycarbonate", "[SUPPLIER]"],
        ["Folded size", "About 145 x 78 x 70 cm (L x W x H); post tilts and the board folds over the base", "[SUPPLIER]"],
    ], [4.2, 9.6, 3.6])

    heading(doc, "8. Storage container: 10 ft hub in a box and billboard")
    bullet(doc, "Size", "10 ft container, 2.99 m long x 2.44 m deep x 2.59 m high, double doors on one 2.44 m end.")
    bullet(doc, "Delivery concept", "three steps. 1: the Mega Slam goes in (a separate, permanent install). 2: the container is dropped behind it; the loaded panel trolley rolls out to the court corner and the panels are laid off the top, row by row from the Mega Slam end. 3: the trolley moves aside, both portable hoops roll out into position and go up, then the empty trolley goes back in and stands on its end against the back wall. Removal is the same in reverse.")
    bullet(doc, "Position", "square to the court (not at an angle), long side parallel to the baseline, set back 2.0 m behind the back edge of the tiles and to the right of the main hoop seen from the open end, so it is clearly visible behind the hoop. Off the tiles, on the tarmac.")
    bullet(doc, "Billboard wrap", "full vinyl wrap: navy #14264e base with a gold #fba91a stripe low down. Both long sides: the landscape logo (gold icon, white wordmark) as large as fits, with 'HOOP HUB' beneath in large gold Lilita One. Doors: one leaf carries a white panel with 'SCAN TO BOOK A FREE TRIAL' and a navy QR code; the other carries the round white logo and 'HOOP HEROES' in gold. Keep both clear of the vertical locking bars. Far end: the round white logo, large. No contact details or school name.")
    bullet(doc, "Inside", "as delivered (shot 7): the loaded panel trolley (60 panels flat, stack about 1.4 m high, gold pull handle) sits by the doors, with both folded hoops and the gold ball rack between them behind it, so the floor comes out first. In everyday use (shot 5): the empty trolley stands on its end against the back wall, handle folded, with the ball rack in front of it and the folded hoops by the doors when they are not out. A ramp the full width of the doorway in both cases.")

    heading(doc, "9. Setting, light and people")
    bullet(doc, "Location", "a generic UK school playground: weathered dark-grey tarmac with faded generic play markings, a green mesh or painted railing fence, a generic brick or render school block softly out of focus behind, a couple of mature trees, low-rise houses beyond. No signs, crests, names, banners or readable text anywhere except Hoop Heroes branding.")
    bullet(doc, "Weather and season", "dry UK autumn or spring day, light high cloud with soft sun. Court dry.")
    bullet(doc, "Time of day", "mid to late afternoon, low warm sun from the side so the tile texture and lines read. Soft shadows.")
    bullet(doc, "Lighting", "natural daylight only. No floodlights or lighting columns.")
    bullet(doc, "People", "preferably none. If scale figures help, one or two non-identifiable figures only (seen from behind, distant or motion-blurred): no faces, no names or numbers on kit, no logos other than Hoop Heroes.")

    heading(doc, "10. Shot list")
    para(doc, "All stills 3840 x 2160 px (4K), 16:9. Camera heights and lenses are starting points.", italic=True, size=9)
    numbered(doc, 1, "Orientation view (match the reference)", "elevated three-quarter view (about 5 to 6 m high) from the open end, looking across the depth of the court to the main hoop, framed like the reference screenshot. Grey half court, lighter key, white arc, logo at the open end. Gold mini markings visible but secondary. Portable hoops folded away; container billboard visible behind and to one side of the hoop.")
    numbered(doc, 2, "Bird's-eye top-down", "orthographic or near-orthographic view straight down, framing the tiles, both portable hoops (out) and the container. Must show both line systems clearly (white 3x3; gold boundary, keys and 3-point lines) and the logo. Use it to cross-check against the plan.")
    numbered(doc, 3, "Mega Slam at three heights (3 stills, same camera)", "camera at the free-throw line extended, about 1.2 m high, about 30 degrees off the court axis, 28 to 35 mm lens. Rim at (a) 7 ft / 2.13 m, (b) 8.5 ft / 2.59 m, (c) 10 ft / 3.05 m. Show the post in the tarmac behind the tiles, the board overhanging the baseline, the crank handle and the overhang growing as the rim lowers.")
    numbered(doc, 4, "Cross-court mini game set-up", "elevated three-quarter aerial (about 8 to 10 m high) from an open-end corner. Both portable hoops out, one at each end of the mini court, facing each other across the 14.8 m over the gold keys. Mega Slam at 10 ft and not in use (see Section 11).")
    numbered(doc, 5, "Storage container, doors open", "eye level, about 3 m out, square to the open doors, 24 to 28 mm lens. Shows the hub in a box: the panel stack at the back, the ball rack down the side, both folded hoops in front on the full-width ramp.")
    numbered(doc, 6, "Eye-level hero shot (cover image)", "child eye height (about 1.1 to 1.2 m), low and wide (24 mm), from the open end just behind the logo, looking towards the main hoop. The logo leads into the frame; the Mega Slam at 10 ft and the container billboard behind it. Warm late-afternoon light.")
    numbered(doc, 7, "As delivered", "elevated (about 3 m), looking square into the open doors, before the floor is laid: the Mega Slam already in on bare tarmac, the panel trolley at the back of the container with the hoops and ball rack in front.")
    para(doc, "Total: 9 stills (shot 3 is 3 frames).", bold=True, color=NAVY)

    heading(doc, "11. The Mega Slam does not serve the mini court")
    para(doc, "The Mega Slam faces across the 10 m depth for 3x3; the mini court runs at 90 degrees to it, along the 14.8 m between the two portable hoops. The Mega Slam sits behind the middle of one of the mini court's sidelines, side-on to the mini game, so it cannot be one of its baskets.")
    bullet(doc, None, "The mini court covers the whole tile area, so there is no room for a separate shooting station on the Mega Slam during mini sessions. In the mini-game shots, show the Mega Slam at 10 ft and not in use.")

    heading(doc, "12. Do not")
    for t in [
        "Do not name, show or hint at any real school: no crests, signs, uniforms, banners, recognisable buildings or postcodes.",
        "Do not show identifiable children: no faces, names or numbers on kit. Ideally no people at all.",
        "Do not add a canopy, roof, floodlights, toilet block or building. Phase 1 is open air.",
        "Do not add court markings beyond those listed in Sections 3.1 and 4: no no-charge semicircle, mini halfway line or centre circle. On the container, use only the artwork in Section 8.",
        "Do not use the Mega Slam as a basket for the mini court.",
        "Do not use other sports brands' logos (the portable hoop boards carry only the Hoop Heroes round logo).",
        "Do not recolour or redraw the Hoop Heroes logo; use the supplied files.",
        "Do not change the [FIBA] dimensions; flag anything that looks wrong.",
        'Every still must carry a small "CONCEPT - NOT A REAL INSTALL" label (bottom-left, Montserrat Bold, white on 60% navy).',
        "Do not present the renders as a real site or an approved plan.",
    ]:
        bullet(doc, None, t)

    heading(doc, "13. Deliverables")
    for t in [
        '9 x 4K stills (3840 x 2160 px, 16:9) per the shot list, PNG or high-quality JPG, sRGB, each with the "CONCEPT" label.',
        "The same 9 stills without the label.",
        "Two short videos: a fly-through of the finished hub, and an installation sequence (doors open, hoops out, trolley out, panels laid, trolley back in, hoops set up).",
        "A low-resolution clay (untextured) preview of shots 1 and 4 before final texturing, so we can check the layout.",
        "The source scene file (format to agree), built to the plan dimensions.",
        "A short note of any dimension you changed or assumed.",
    ]:
        bullet(doc, None, t)

    heading(doc, "14. Open questions for the designer")
    questions = []
    for label, t in [
        (None, "Portable hoop board overhang is not published; the plan assumes the rim is about 0.6 m inside the tile edge. Adjust if your reference model shows otherwise and tell us."),
        (None, "QR code: the renders use a placeholder pointing to hoopheroes.co.uk. Hoop Heroes will supply the final booking link."),
        (None, "Floor edge: show a slim bevelled edge strip around the floor unless it looks wrong at this scale."),
        (None, "Floor panels: 1.23 x 2.0 m is a concept size, chosen so the panel trolley and both hoops fit in a 10 ft container. Hoop Heroes will confirm with the surface supplier what large-format panels or pre-assembled sections are available."),
        (None, "Scale figures: empty court preferred. If you think one non-identifiable figure is needed for scale, ask first."),
        (None, "Optional extra: a dusk still with portable lighting only, if time allows."),
    ]:
        questions.append(t)
    for n, t in enumerate(questions, 1):
        numbered(doc, n, None, t)

    heading(doc, "15. Sources")
    for t in [
        "FIBA 3x3 Official Rules 2026, Article 2 (court markings and dimensions): fiba3x3.com/en/documents.html",
        "Mega Slam Hoops UK, MegaSlam 72 specifications: megaslamhoops.uk",
        "Decathlon, Tarmak B900 Box product and support pages",
        "UK container supplier specs for 10 ft units",
        "Hoop Heroes brand guidelines (colours navy #14264e and gold #fba91a, fonts Lilita One and Montserrat, logo rules)",
    ]:
        bullet(doc, None, t)
    para(doc, "Concept only, not a real install. Prepared 21 October 2026. v3.", italic=True, size=9)
    doc.save(out)
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--media", type=Path, required=True)
    ap.add_argument("--plan", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    print(build(a.media, a.plan, a.out))
