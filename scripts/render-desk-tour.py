#!/usr/bin/env python3
"""Render the captioned TGI membership tour. Requires Pillow, numpy and ffmpeg.

Usage: python3 scripts/render-desk-tour.py
The diagrams are illustrative, without live quotes, current setups or app claims.
"""
from pathlib import Path
import math
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
W, H, FPS = 1920, 1080, 24
DURATION = 42
GOLD = "#c99a3d"
IVORY = "#f2ede2"
MUTED = "#b7b5ab"
LINE = "#4b4028"
GREEN = "#6caa92"
SANS = "/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf"
BOLD = "/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf"
SERIF = "/usr/share/fonts/opentype/urw-base35/NimbusRoman-Regular.otf"


def font(size, family=SANS):
    return ImageFont.truetype(family, size)


FONTS = {(size, family): font(size, family) for size in
         [26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 52, 54, 56, 64, 70, 84, 86, 90, 94, 100, 108, 116]
         for family in [SANS, BOLD, SERIF]}


def text(draw, xy, value, size=40, color=IVORY, family=SANS, anchor=None):
    draw.text(xy, value, font=FONTS[(size, family)], fill=color, anchor=anchor,
              spacing=int(size * .25), stroke_width=0)


def wrapped(draw, xy, value, width, size=36, color=MUTED, family=SANS):
    words = value.split()
    lines, line = [], ""
    for word in words:
        trial = (line + " " + word).strip()
        if draw.textlength(trial, font=FONTS[(size, family)]) > width and line:
            lines.append(line)
            line = word
        else:
            line = trial
    if line:
        lines.append(line)
    text(draw, xy, "\n".join(lines), size, color, family)


def panel(draw, box, fill="#111614", outline=LINE, radius=16, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


xx, yy = np.meshgrid(np.linspace(0, 1, W), np.linspace(0, 1, H))
glow = np.exp(-((xx - .83) ** 2 / .15 + (yy - .27) ** 2 / .2))
bg = np.zeros((H, W, 3), dtype=np.uint8)
for channel, (base, light) in enumerate([(8, 22), (10, 17), (10, 8)]):
    bg[:, :, channel] = np.clip(base + glow * light, 0, 255)
BACKGROUND = Image.fromarray(bg, "RGB")


def canvas(chapter):
    image = BACKGROUND.copy()
    d = ImageDraw.Draw(image)
    d.rectangle((96, 65, 197, 153), outline=GOLD, width=2)
    text(d, (146, 107), "TGI", 44, GOLD, SERIF, "mm")
    text(d, (230, 82), "OPERATING DESK", 36, IVORY, BOLD)
    text(d, (230, 126), "MEMBERSHIP WALKTHROUGH", 26, MUTED)
    text(d, (1824, 102), chapter.upper(), 28, GOLD, SANS, "ra")
    d.line((96, 895, 1824, 895), fill=LINE, width=2)
    text(d, (96, 926), "Illustrative walkthrough · No live prices or current analysis", 30, MUTED)
    text(d, (96, 972), "Educational commentary. Trading involves risk.", 28, "#92978f")
    return image


PORTAL = Image.open(OUT / "tgi-operating-desk-portal.webp").convert("RGB")
PORTAL = PORTAL.crop((40, 150, 1160, 857)).resize((870, 549), Image.Resampling.LANCZOS)


def intro():
    im = canvas("01 / One member desk")
    d = ImageDraw.Draw(im)
    text(d, (96, 240), "Your market preparation.", 108, IVORY, SERIF)
    text(d, (96, 366), "One member desk.", 108, GOLD, SERIF)
    wrapped(d, (100, 540), "Weekly news. Daily Zones. Structural levels. Scenarios and outlooks.",
            1420, 52, MUTED)
    d.line((100, 712, 545, 712), fill=GOLD, width=3)
    text(d, (100, 755), "Prepare with structure. Own your decisions.", 42, IVORY)
    return im


GROUP_BOXES = [(96, 500, 482, 645), (508, 500, 894, 645),
               (96, 670, 482, 815), (508, 670, 894, 815)]


def board():
    im = canvas("02 / Current Desk")
    d = ImageDraw.Draw(im)
    text(d, (96, 235), "43 instruments.", 100, IVORY, SERIF)
    text(d, (96, 349), "Four market groups.", 84, GOLD, SERIF)
    for box, count, label in zip(GROUP_BOXES, [33, 4, 4, 2],
                                 ["Forex pairs", "Indices", "Commodities", "Crypto"]):
        panel(d, box)
        x, y = box[:2]
        text(d, (x + 26, y + 21), str(count), 70, GOLD, SERIF)
        text(d, (x + 26, y + 99), label, 34, IVORY)
    im.paste(PORTAL, (954, 252))
    d = ImageDraw.Draw(im)
    text(d, (960, 827), "One permanent page per instrument.", 32, MUTED)
    return im


NEWS_BOXES = [(990, 249, 1824, 423), (990, 448, 1824, 622), (990, 647, 1824, 821)]


def news():
    im = canvas("03 / News & Releases")
    d = ImageDraw.Draw(im)
    text(d, (96, 252), "Know what could", 100, IVORY, SERIF)
    text(d, (96, 367), "change the market.", 100, GOLD, SERIF)
    wrapped(d, (100, 560), "Connect news and scheduled releases to your market preparation.", 740, 44)
    for i, (box, title, subtitle) in enumerate(zip(NEWS_BOXES,
            ["Weekly news", "Economic-release context", "Desk announcements"],
            ["Follow the market-news announcements.", "Understand the events to monitor.", "Find notices in News & Releases."])):
        panel(d, box)
        x, y = box[:2]
        text(d, (x + 28, y + 20), f"0{i + 1}", 30, GOLD)
        text(d, (x + 99, y + 26), title, 44, IVORY, BOLD)
        text(d, (x + 99, y + 94), subtitle, 30, MUTED)
    return im


def zones():
    im = canvas("04 / Daily Zones & Structure")
    d = ImageDraw.Draw(im)
    text(d, (96, 242), "Daily Zones.", 108, IVORY, SERIF)
    text(d, (96, 372), "Structural levels.", 100, GOLD, SERIF)
    wrapped(d, (100, 573), "Read price location and market structure before forming a view.", 700, 44)
    panel(d, (944, 249, 1824, 821))
    text(d, (980, 275), "ILLUSTRATIVE CHART", 28, MUTED)
    for y in [384, 479, 574, 669, 764]:
        d.line((980, y, 1788, y), fill="#252f28", width=1)
    for x in range(1020, 1788, 96):
        d.line((x, 356, x, 790), fill="#252f28", width=1)
    d.rectangle((980, 355, 1788, 411), fill="#302918", outline=GOLD, width=2)
    d.rectangle((980, 709, 1788, 765), fill="#162b23", outline=GREEN, width=2)
    text(d, (990, 360), "SUPPLY", 28, GOLD)
    text(d, (990, 715), "DEMAND", 28, GREEN)
    return im


SCENARIO_BOXES = [(96, 422, 640, 724), (688, 422, 1232, 724), (1280, 422, 1824, 724)]


def scenarios():
    im = canvas("05 / Scenarios & Outlooks")
    d = ImageDraw.Draw(im)
    text(d, (96, 240), "Understand the scenario.", 100, IVORY, SERIF)
    text(d, (96, 348), "And what could change it.", 86, GOLD, SERIF)
    for i, (box, title, body) in enumerate(zip(SCENARIO_BOXES,
            ["Outlook", "Conditions", "Reassessment"],
            ["Read the working market interpretation.", "Check supporting evidence and invalidation.",
             "Return to the latest dated review and status."])):
        panel(d, box)
        x, y = box[:2]
        text(d, (x + 30, y + 24), f"0{i + 1}", 32, GOLD)
        text(d, (x + 30, y + 94), title, 52, IVORY, SERIF)
        wrapped(d, (x + 30, y + 175), body, 477, 36)
    text(d, (96, 798), "A conditional scenario is not an instruction to trade.", 42, MUTED)
    return im


RECORD_BOXES = [(990, 249, 1824, 423), (990, 448, 1824, 622), (990, 647, 1824, 821)]


def records():
    im = canvas("06 / Rules & Historical Work")
    d = ImageDraw.Draw(im)
    text(d, (96, 242), "Learn from the work.", 94, IVORY, SERIF)
    text(d, (96, 361), "Keep the record.", 100, GOLD, SERIF)
    wrapped(d, (100, 558), "Use the operating framework. Study completed decisions in their original context.",
            740, 44)
    for box, title, body in zip(RECORD_BOXES,
            ["Post Trade Case Studies", "DZC Operating Rules", "Archive"],
            ["Completed decisions and process lessons.", "Reference the operating framework.", "Revisit dated briefs and superseded reviews."]):
        panel(d, box)
        x, y = box[:2]
        text(d, (x + 30, y + 32), title, 44, IVORY, BOLD)
        text(d, (x + 30, y + 103), body, 30, MUTED)
    return im


def close():
    im = canvas("07 / Join the Desk")
    d = ImageDraw.Draw(im)
    text(d, (960, 274), "Follow the preparation.", 116, IVORY, SERIF, "ma")
    text(d, (960, 412), "Own your decisions.", 116, GOLD, SERIF, "ma")
    text(d, (960, 586), "$99 / month  ·  Cancel anytime", 54, IVORY, SANS, "ma")
    panel(d, (568, 682, 1352, 777), GOLD, GOLD, 10)
    text(d, (960, 728), "JOIN THE TGI OPERATING DESK", 36, "#080a0a", BOLD, "mm")
    text(d, (960, 826), "TraderGrowth.com/desk", 42, MUTED, SANS, "ma")
    return im


SCENES = [intro(), board(), news(), zones(), scenarios(), records(), close()]
STARTS = [0, 5, 11, 17, 24, 30, 36]
ENDS = [5, 11, 17, 24, 30, 36, 42]


def ease(x):
    x = max(0, min(1, x))
    return x * x * (3 - 2 * x)


CANDLES = [(700, 720), (719, 697), (696, 677), (679, 689), (689, 662),
           (661, 647), (646, 609), (610, 586), (585, 543), (542, 493),
           (493, 451), (450, 425), (426, 464), (464, 500), (501, 524),
           (524, 492), (491, 461)]


def scene_frame(index, elapsed):
    im = SCENES[index].copy()
    d = ImageDraw.Draw(im)
    if index in [1, 2, 4, 5]:
        boxes = {1: GROUP_BOXES, 2: NEWS_BOXES, 4: SCENARIO_BOXES, 5: RECORD_BOXES}[index]
        k = min(len(boxes) - 1, int(max(0, elapsed - .45) / ((ENDS[index] - STARTS[index] - .9) / len(boxes))))
        pulse = int(90 + 45 * math.sin(elapsed * 2))
        d.rounded_rectangle(boxes[k], radius=16, outline=(201, 154, 61), width=3)
        x0, y0, x1, y1 = boxes[k]
        d.line((x0 + 22, y0 + 2, x0 + pulse + 22, y0 + 2), fill="#e0bd76", width=4)
    if index == 3:
        visible = min(len(CANDLES), max(1, int(ease((elapsed - .3) / 4.8) * len(CANDLES))))
        for i, (opening, closing) in enumerate(CANDLES[:visible]):
            x = 1042 + i * 44
            col = GREEN if closing < opening else "#b99354"
            d.line((x, min(opening, closing) - 16, x, max(opening, closing) + 16), fill=col, width=3)
            d.rectangle((x - 10, min(opening, closing), x + 10, max(opening, closing) + 3), fill=col)
    if index == 0:
        length = int(445 * ease(elapsed / 2.2))
        d.line((100, 712, 100 + length, 712), fill="#e0bd76", width=4)
    return im


def frame_at(t):
    index = max(i for i, start in enumerate(STARTS) if t >= start)
    elapsed = t - STARTS[index]
    im = scene_frame(index, elapsed)
    if index and elapsed < .65:
        previous = scene_frame(index - 1, ENDS[index - 1] - STARTS[index - 1] - .1)
        im = Image.blend(previous, im, ease(elapsed / .65))
    if t < .6:
        im = Image.blend(BACKGROUND, im, ease(t / .6))
    d = ImageDraw.Draw(im)
    d.rectangle((0, H - 7, int(W * t / DURATION), H), fill=GOLD)
    return im


def main():
    output = OUT / "tgi-operating-desk-tour.mp4"
    command = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-vcodec", "rawvideo",
               "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an",
               "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p",
               "-profile:v", "high", "-level", "4.1", "-movflags", "+faststart", str(output)]
    with subprocess.Popen(command, stdin=subprocess.PIPE) as proc:
        for number in range(DURATION * FPS):
            proc.stdin.write(frame_at(number / FPS).tobytes())
            if number % (FPS * 6) == 0:
                print(f"Rendered {number // FPS}/{DURATION} seconds", flush=True)
        proc.stdin.close()
        if proc.wait():
            raise RuntimeError("ffmpeg render failed")
    frame_at(7.5).save(OUT / "tgi-operating-desk-tour-poster.webp", quality=93)
    print(f"Saved {output} ({output.stat().st_size:,} bytes)", flush=True)


if __name__ == "__main__":
    main()
