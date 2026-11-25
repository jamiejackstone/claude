"""Assemble the Hero Dome video from tools/hero-dome-video.mjs frames: title card, captioned scenes with
cross-fades, end card and the CONCEPT label.

Usage: python3 tools/hero_dome_video.py --frames renders/video/hero-dome-frames --out renders/video/hero-dome.mp4

Captions carry no install timings or dates (KB "Head teacher concerns" sheet).
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
NAVY = (20, 38, 78)
GOLD = (251, 169, 26)
WHITE = (255, 255, 255)
FADE = 0.6  # seconds of cross-fade between scenes
CAPTION_FADE = 0.35
# scenes that run straight on from the one before, with no cross-fade
JOIN = set()


def font(name, size):
    return ImageFont.truetype(str(ROOT / "assets/fonts" / name), size)


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


class Look:
    def __init__(self, w, h):
        self.w, self.h = w, h
        s = h / 1080
        self.s = s
        self.title = font("LilitaOne-Regular.ttf", round(46 * s))
        self.sub = font("Montserrat-Bold.ttf", round(26 * s))
        self.label = font("Montserrat-Bold.ttf", round(20 * s))


def text_w(f, t):
    b = f.getbbox(t)
    return b[2] - b[0], b


def caption_layer(look, title, sub, alpha):
    """A navy panel, bottom centre: the title in Lilita One, a gold line under it."""
    s = look.s
    im = Image.new("RGBA", (look.w, look.h), (0, 0, 0, 0))
    if alpha <= 0:
        return im
    d = ImageDraw.Draw(im)
    tw, tb = text_w(look.title, title.upper())
    sw, sb = text_w(look.sub, sub) if sub else (0, None)
    pad_x, pad_y, gap = round(34 * s), round(20 * s), round(8 * s)
    th = tb[3] - tb[1]
    sh = (sb[3] - sb[1]) if sb else 0
    bw = max(tw, sw) + 2 * pad_x
    bh = th + (gap + sh if sub else 0) + 2 * pad_y
    x0 = (look.w - bw) // 2
    y1 = look.h - round(64 * s)
    y0 = y1 - bh
    a = round(255 * alpha)
    d.rounded_rectangle((x0 + round(6 * s), y0 + round(6 * s), x0 + bw + round(6 * s), y1 + round(6 * s)), radius=round(18 * s), fill=(0, 0, 0, round(40 * alpha)))
    d.rounded_rectangle((x0, y0, x0 + bw, y1), radius=round(18 * s), fill=NAVY + (round(235 * alpha),))
    d.text(((look.w - tw) // 2 - tb[0], y0 + pad_y - tb[1]), title.upper(), font=look.title, fill=WHITE + (a,))
    if sub:
        d.text(((look.w - sw) // 2 - sb[0], y0 + pad_y + th + gap - sb[1]), sub, font=look.sub, fill=GOLD + (a,))
    return im


def concept_label(look):
    im = Image.new("RGBA", (look.w, look.h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = look.s
    t = "CONCEPT - HERO DOME"
    tw, b = text_w(look.label, t)
    x0, y0 = round(28 * s), round(28 * s)
    d.rounded_rectangle((x0, y0, x0 + tw + round(28 * s), y0 + (b[3] - b[1]) + round(20 * s)), radius=round(6 * s), fill=NAVY + (153,))
    d.text((x0 + round(14 * s) - b[0], y0 + round(10 * s) - b[1]), t, font=look.label, fill=WHITE)
    return im


def centred(d, look, y, text, f, fill):
    w, b = text_w(f, text)
    d.text(((look.w - w) // 2 - b[0], y), text, font=f, fill=fill)


def card(look, path, lines, logo_w=380):
    im = Image.new("RGB", (look.w, look.h), NAVY)
    s = look.s
    logo = Image.open(ROOT / "assets/logo.png").convert("RGBA")
    lw = round(logo_w * s)
    logo = logo.resize((lw, round(lw * logo.height / logo.width)), Image.LANCZOS)
    total = logo.height + round(40 * s) + sum(round(g * s) for *_, g in lines)
    y = (look.h - total) // 2
    im.paste(logo, ((look.w - lw) // 2, y), logo)
    d = ImageDraw.Draw(im)
    y += logo.height + round(40 * s)
    for text, f, fill, gap in lines:
        centred(d, look, y, text, f, fill)
        y += round(gap * s)
    im.save(path)


def main(frames: Path, out: Path):
    m = json.loads((frames / "manifest.json").read_text())
    fps, w, h = m["fps"], m["w"], m["h"]
    look = Look(w, h)
    parts = out.parent / "hero-dome-parts"
    if parts.exists():
        shutil.rmtree(parts)
    parts.mkdir(parents=True)

    big = font("LilitaOne-Regular.ttf", round(120 * look.s))
    mid = font("LilitaOne-Regular.ttf", round(54 * look.s))
    body = font("Montserrat-Bold.ttf", round(30 * look.s))
    small = font("Montserrat-Bold.ttf", round(22 * look.s))
    card(look, parts / "intro.png", [
        ("HERO DOME", big, GOLD, 140),
        ("YOUR HOME COURT", mid, WHITE, 90),
        ("Concept visuals. Subject to planning and consents.", small, (200, 208, 222), 0),
    ])
    card(look, parts / "outro.png", [
        ("HERO DOME", big, GOLD, 140),
        ("YOUR HOME COURT", mid, WHITE, 80),
        ("A covered, year-round court on your school playground.", body, WHITE, 46),
        ("Installed, equipped and run by Hoop Heroes, at no cost to your school.", body, WHITE, 70),
        ("hoopheroes.co.uk/hero-dome", mid, GOLD, 80),
        ("Concept visuals. Subject to planning and consents.", small, (200, 208, 222), 0),
    ])
    label = concept_label(look)

    # burn captions and the label into each scene's frames
    clips = [(parts / "intro.png", 3.0, False)]
    for seg in m["segments"]:
        src = frames / seg["dir"]
        dst = parts / seg["dir"]
        dst.mkdir()
        files = sorted(src.glob("*.jpg"))
        cache = {}
        for k, f in enumerate(files):
            t = k / fps
            frame = Image.open(f).convert("RGBA")
            for a, b, title, sub in seg["captions"]:
                if a - CAPTION_FADE <= t <= b:
                    alpha = min(1.0, (t - a) / CAPTION_FADE + 1, (b - t) / CAPTION_FADE)
                    key = (title, round(alpha, 2))
                    if key not in cache:
                        cache[key] = caption_layer(look, title, sub, max(0.0, alpha))
                    frame = Image.alpha_composite(frame, cache[key])
            frame = Image.alpha_composite(frame, label)
            frame.convert("RGB").save(dst / f"{k:05d}.jpg", quality=93)
        clips.append((dst, len(files) / fps, seg["name"] in JOIN))
    clips.append((parts / "outro.png", 4.5, False))

    # merge joined scenes into the scene before them, then encode each clip the same way so xfade can chain them
    merged = []
    for src, dur, join in clips:
        if join and merged:
            merged[-1][0].append(src)
            merged[-1][1] += dur
        else:
            merged.append([[src], dur])
    encoded = []
    for i, (srcs, dur) in enumerate(merged):
        dst = parts / f"clip{i:02d}.mp4"
        if srcs[0].is_dir():
            listing = parts / f"clip{i:02d}.txt"
            listing.write_text("".join(f"file '{f.resolve()}'\nduration {1 / fps:.6f}\n" for s in srcs for f in sorted(s.glob("*.jpg"))))
            inp = ["-f", "concat", "-safe", "0", "-i", str(listing)]
        else:
            inp = ["-loop", "1", "-framerate", str(fps), "-t", f"{dur:.3f}", "-i", str(srcs[0])]
        run(["ffmpeg", "-y", *inp, "-vf", f"scale={w}:{h},fps={fps},format=yuv420p", "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-t", f"{dur:.3f}", str(dst)])
        encoded.append((dst, dur))

    inputs, filt = [], []
    for dst, _ in encoded:
        inputs += ["-i", str(dst)]
    prev, offset = "0:v", 0.0
    for i in range(1, len(encoded)):
        offset += encoded[i - 1][1] - FADE
        filt.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={FADE}:offset={offset:.3f}[x{i}]")
        prev = f"x{i}"
    total = offset + encoded[-1][1]
    filt.append(f"[{prev}]format=yuv420p[v]")
    run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[v]", "-c:v", "libx264", "-crf", "21", "-preset", "slow", "-movflags", "+faststart", "-r", str(fps), str(out)])
    print(f"{out}  {total:.1f}s")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    main(a.frames, a.out)
