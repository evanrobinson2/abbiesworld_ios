#!/usr/bin/env python3
"""Render a reference card that follows the spec, with its manifest, to exercise check_card.py.

    python3 tools/card-rubric/sample_card.py OUT_DIR
    python3 tools/card-rubric/check_card.py OUT_DIR/sample.png OUT_DIR/sample.json

Placeholder art (a sky, a hill and a round sheep) stands in for pipeline art. Fonts are whatever DejaVu is installed;
a real generator uses the open-licence display and text faces named in CARD_STUDY.md.
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

PPI = 600
mm = lambda v: round(v / 25.4 * PPI)
W, H = mm(63) + 2 * mm(3), mm(88) + 2 * mm(3)
B, S = mm(3), mm(3)
TW, TH = mm(63), mm(88)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TEXT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
pt = lambda p: round(p * PPI / 72)


def main(out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    im = Image.new("RGB", (W, H), (120, 82, 48))
    d = ImageDraw.Draw(im)
    # Pine frame with a bevel: light top-left edge, dark bottom-right edge, wood grain lines.
    for i in range(0, H, 9):
        d.line([(0, i), (W, i + 40)], fill=(132 + (i * 7) % 18, 92 + (i * 5) % 12, 54), width=4)
    d.rounded_rectangle([B + 20, B + 20, B + TW - 20, B + TH - 20], radius=mm(3), outline=(214, 170, 112), width=18)
    d.rounded_rectangle([B + 38, B + 38, B + TW - 38, B + TH - 38], radius=mm(3), outline=(70, 44, 22), width=14)

    # Art window, arch top (Animal type), 56% of the face.
    ax, ay = B + S + 20, B + S + 20
    aw, ah = TW - 2 * (S + 20), round(0.56 * TW * TH / (TW - 2 * (S + 20)))
    art = Image.new("RGB", (aw, ah))
    ad = ImageDraw.Draw(art)
    for y in range(ah):
        t = y / ah
        ad.line([(0, y), (aw, y)], fill=(int(150 + 80 * t), int(200 + 30 * t), int(240 - 40 * t)))
    ad.ellipse([-aw * 0.3, ah * 0.62, aw * 1.3, ah * 1.6], fill=(118, 170, 84))
    cx, cy, r = aw // 2, int(ah * 0.55), int(ah * 0.2)
    for k in range(9):
        a = k / 9 * 2 * math.pi
        ad.ellipse([cx + r * 0.7 * math.cos(a) - r * 0.5, cy + r * 0.6 * math.sin(a) - r * 0.5,
                    cx + r * 0.7 * math.cos(a) + r * 0.5, cy + r * 0.6 * math.sin(a) + r * 0.5], fill=(250, 248, 240))
    ad.ellipse([cx + r * 0.5, cy - r * 0.7, cx + r * 1.2, cy - r * 0.05], fill=(60, 48, 44))
    mask = Image.new("L", (aw, ah), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([0, aw // 2, aw, ah], fill=255)
    md.ellipse([0, 0, aw, aw], fill=255)
    im.paste(art, (ax, ay), mask)

    boxes = []

    def plate(box, fill):
        x, y, w, h = box
        d.rounded_rectangle([x, y, x + w, y + h], radius=40, fill=fill, outline=(70, 44, 22), width=8)

    # Name ribbon on a cream plate across the top of the art.
    nb = [ax + 260, ay + 60, aw - 320, 150]
    plate(nb, (246, 236, 214))
    d.text((nb[0] + nb[2] // 2, nb[1] + nb[3] // 2), "Woolly", font=ImageFont.truetype(FONT, pt(12)),
           fill=(43, 29, 14), anchor="mm")
    boxes.append({"role": "name", "bbox": nb, "font_pt": 12, "family": "DejaVu Sans", "text_colour": "#2b1d0e",
                  "plate": "opaque"})

    # Cost token top-left.
    cb = [B + S + 10, B + S + 10, 230, 230]
    d.ellipse([cb[0], cb[1], cb[0] + cb[2], cb[1] + cb[3]], fill=(250, 240, 210), outline=(70, 44, 22), width=14)
    d.text((cb[0] + 115, cb[1] + 118), "2", font=ImageFont.truetype(FONT, pt(22)), fill=(43, 29, 14), anchor="mm")
    boxes.append({"role": "numeral", "bbox": cb, "font_pt": 22, "family": "DejaVu Sans", "text_colour": "#2b1d0e"})

    # Rarity gem (Bloom, five petals) where art meets the text plate.
    gx, gy = B + TW // 2, ay + ah
    for k in range(5):
        a = k / 5 * 2 * math.pi - math.pi / 2
        d.ellipse([gx + 50 * math.cos(a) - 40, gy + 50 * math.sin(a) - 40, gx + 50 * math.cos(a) + 40,
                   gy + 50 * math.sin(a) + 40], fill=(69, 170, 222), outline=(30, 60, 90), width=5)
    d.ellipse([gx - 28, gy - 28, gx + 28, gy + 28], fill=(250, 220, 120))
    boxes.append({"role": "gem", "bbox": [gx - 100, gy - 100, 200, 200]})

    # Text plate.
    tb = [ax + 30, gy + 120, aw - 60, 360]
    plate(tb, (246, 236, 214))
    d.text((tb[0] + tb[2] // 2, tb[1] + tb[3] // 2), "Grows a wool coat\nevery morning.",
           font=ImageFont.truetype(TEXT, pt(10)), fill=(43, 29, 14), anchor="mm", align="center", spacing=20)
    boxes.append({"role": "text", "bbox": tb, "font_pt": 10, "family": "DejaVu Sans", "text_colour": "#2b1d0e",
                  "plate": "opaque"})

    # Two stat tokens in the bottom corners.
    for i, val in enumerate(["3", "4"]):
        sb = [B + S + 30 if i == 0 else B + TW - S - 30 - 210, B + TH - S - 330, 210, 210]
        d.ellipse([sb[0], sb[1], sb[0] + 210, sb[1] + 210], fill=(250, 240, 210), outline=(70, 44, 22), width=14)
        d.text((sb[0] + 105, sb[1] + 108), val, font=ImageFont.truetype(FONT, pt(22)), fill=(43, 29, 14),
               anchor="mm")
        boxes.append({"role": "numeral", "bbox": sb, "font_pt": 22, "family": "DejaVu Sans",
                      "text_colour": "#2b1d0e"})

    # Collector line.
    kb = [B + S + 280, B + TH - S - 100, TW - 2 * S - 560, 70]
    d.text((kb[0] + kb[2] // 2, kb[1] + 35), "RANCH  001/035  sample  STD", font=ImageFont.truetype(TEXT, pt(5.5)),
           fill=(250, 236, 210), anchor="mm")
    boxes.append({"role": "collector", "bbox": kb, "font_pt": 5.5, "family": "DejaVu Sans"})

    im = im.filter(ImageFilter.SMOOTH)
    im.save(out / "sample.png")
    Image.new("L", (W, H), 0).save(out / "shimmer.png")
    man = {"id": "ranch-sample-001", "ppi": PPI, "bleed": True, "rarity": "bloom", "type": "animal",
           "art": {"bbox": [ax, ay, aw, ah], "source_px": [aw, ah]}, "boxes": boxes,
           "collector": {"set": "RANCH", "number": 1, "total": 35, "maker": "sample_card.py", "variant": "std"},
           "finish_masks": ["shimmer.png"]}
    (out / "sample.json").write_text(json.dumps(man, indent=2))
    print(out / "sample.png")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
