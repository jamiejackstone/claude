"""Assemble the fly-through: title card, segments with cross-fades, end card, CONCEPT label.

Usage: python3 tools/assemble_video.py --frames renders/video/frames --out renders/video/hoop-hub-flythrough.mp4
"""
import argparse
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
NAVY = (20, 38, 78)
GOLD = (251, 169, 26)
W, H, FPS = 1920, 1080, 30
FADE = 1.0  # seconds of cross-fade between clips


def font(name, size):
    return ImageFont.truetype(str(ROOT / "assets/fonts" / name), size)


def centred(d, y, text, f, fill):
    b = f.getbbox(text)
    d.text(((W - (b[2] - b[0])) / 2 - b[0], y), text, font=f, fill=fill)


def card(path, lines):
    im = Image.new("RGB", (W, H), NAVY)
    logo = Image.open(ROOT / "assets/logo.png").convert("RGBA")
    lw = 760
    logo = logo.resize((lw, round(lw * logo.height / logo.width)), Image.LANCZOS)
    im.paste(logo, ((W - lw) // 2, 170), logo)
    d = ImageDraw.Draw(im)
    y = 170 + logo.height + 30
    for text, f, fill, gap in lines:
        centred(d, y, text, f, fill)
        y += gap
    im.save(path)


def label(path):
    # the brief's CONCEPT label, bottom-left, white on 60% navy
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = font("Montserrat-Bold.ttf", 20)
    t = "CONCEPT - NOT A REAL INSTALL"
    b = f.getbbox(t)
    x0, y1 = 32, H - 32
    y0 = y1 - (b[3] - b[1]) - 20
    d.rounded_rectangle((x0, y0, x0 + b[2] - b[0] + 28, y1), radius=6, fill=NAVY + (153,))
    d.text((x0 + 14 - b[0], y0 + 10 - b[1]), t, font=f, fill="white")
    im.save(path)


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def main(frames: Path, out: Path):
    parts = out.parent / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    head = font("LilitaOne-Regular.ttf", 96)
    sub = font("Montserrat-Bold.ttf", 34)
    small = font("Montserrat-Bold.ttf", 24)
    card(parts / "intro.png", [
        ("HOOP HUB", head, GOLD, 120),
        ("PHASE 1: A 3X3 COURT AND MINI COURT FOR YOUR SCHOOL", sub, (255, 255, 255), 70),
        ("CONCEPT - NOT A REAL INSTALL", small, (255, 255, 255), 0),
    ])
    card(parts / "outro.png", [
        ("SWAP SCREENTIME FOR GAMETIME", head, GOLD, 130),
        ("HOOP HUB PHASE 1  ·  CONCEPT VISUALS", sub, (255, 255, 255), 0),
    ])
    label(parts / "label.png")

    clips = [(parts / "intro.png", 4.0)]
    for seg in sorted(p for p in frames.iterdir() if p.is_dir()):
        clips.append((seg, len(list(seg.glob("*.jpg"))) / FPS))
    clips.append((parts / "outro.png", 5.0))

    # encode each clip at the same size and rate so xfade can join them
    encoded = []
    for i, (src, dur) in enumerate(clips):
        dst = parts / f"clip{i}.mp4"
        if src.is_dir():
            inp = ["-framerate", str(FPS), "-i", str(src / "%05d.jpg")]
        else:
            inp = ["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", str(src)]
        run(["ffmpeg", "-y", *inp, "-vf", f"scale={W}:{H},format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-r", str(FPS), str(dst)])
        encoded.append((dst, dur))

    # chain cross-fades, then lay the CONCEPT label over the scene clips (not the cards)
    inputs, filt = [], []
    for dst, _ in encoded:
        inputs += ["-i", str(dst)]
    inputs += ["-i", str(parts / "label.png")]
    prev, offset = "0:v", 0.0
    for i in range(1, len(encoded)):
        offset += encoded[i - 1][1] - FADE
        filt.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={FADE}:offset={offset:.3f}[x{i}]")
        prev = f"x{i}"
    total = offset + encoded[-1][1]
    start, end = encoded[0][1], total - encoded[-1][1]
    filt.append(f"[{prev}][{len(encoded)}:v]overlay=0:0:enable='between(t,{start - FADE / 2:.2f},{end + FADE / 2:.2f})',format=yuv420p[v]")
    run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[v]", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", "-r", str(FPS), str(out)])
    print(f"{out}  {total:.1f}s")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    main(a.frames, a.out)
