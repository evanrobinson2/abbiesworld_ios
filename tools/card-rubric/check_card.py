#!/usr/bin/env python3
"""Reference checker for the automatable parts of the card rubric.

    python3 tools/card-rubric/check_card.py card.png card.json        # one card
    python3 tools/card-rubric/check_card.py --rarity                  # rarity ladder colours (set-level)

The rubric lives in docs/oracle/cards/card-rubric.json; the study in docs/oracle/cards/CARD_STUDY.md.
The manifest (card.json) is what a generator writes next to each render:

    {"id": "ranch-001", "ppi": 600, "bleed": true, "rarity": "bloom", "type": "animal",
     "art":   {"bbox": [x, y, w, h], "source_px": [w, h], "layer": "art-only.png (needed for translucent plates)"},
     "boxes": [{"role": "name|text|numeral|gem|collector", "bbox": [x, y, w, h],
                "font_pt": 10, "family": "Fredoka", "text_colour": "#2b1d0e",
                "plate": "opaque|translucent"}],
     "collector": {"set": "RANCH", "number": 1, "total": 35, "maker": "...", "variant": "std"},
     "finish_masks": ["shimmer.png"]}

All boxes are in canvas pixels (bleed canvas when bleed is true). Prints one line per check and a JSON summary.
LLM-judged and in-game (playtrace) checks are listed as 'manual'.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RUBRIC = json.loads((Path(__file__).resolve().parents[2] / "docs/oracle/cards/card-rubric.json").read_text())
GEO = RUBRIC["geometry"]


def px(mm, ppi):
    return round(mm / 25.4 * ppi)


def srgb_to_lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def rel_lum(rgb):
    r, g, b = srgb_to_lin(np.asarray(rgb, float) / 255.0)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = sorted((rel_lum(a), rel_lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def hex_rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


# OKLab (Ottosson) and colour-vision-deficiency simulation (Machado et al. 2009, severity 1.0, linear RGB).
M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566],
               [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099],
               [0.0259040371, 0.7827717662, -0.8086757660]])
CVD = {
    "deuteranopia": np.array([[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413],
                              [-0.011820, 0.042940, 0.968881]]),
    "protanopia": np.array([[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216],
                            [-0.003882, -0.048116, 1.051998]]),
}


def lin_to_oklab(lin):
    return M2 @ np.cbrt(M1 @ lin)


def oklab_to_lin(lab):
    lms = np.linalg.solve(M2, lab) ** 3
    return np.linalg.solve(M1, lms)


def oklch_to_oklab(l, c, h):
    return np.array([l, c * math.cos(math.radians(h)), c * math.sin(math.radians(h))])


def check_rarity():
    tiers = RUBRIC["rarity"]["tiers"]
    labs = [oklch_to_oklab(*t["gem_colour_oklch"]) for t in tiers]
    rows = []
    for vision in ["normal", *CVD]:
        sim = []
        for lab in labs:
            lin = np.clip(oklab_to_lin(lab), 0, 1)
            if vision != "normal":
                lin = np.clip(CVD[vision] @ lin, 0, 1)
            sim.append(lin_to_oklab(lin))
        d = [float(np.linalg.norm(sim[i] - sim[j]) * 100) for i in range(len(sim)) for j in range(i + 1, len(sim))]
        rows.append((vision, min(d)))
    ok = all(m >= 15 for _, m in rows)
    for vision, m in rows:
        print(f"  gem_distance [{vision:12}] min pairwise deltaE = {m:5.1f}  {'ok' if m >= 15 else 'LOW'}")
    return ok


def box_blur(a, r):
    p = np.pad(a, r, mode="edge")
    k = 2 * r + 1
    return sum(p[i:i + a.shape[0], j:j + a.shape[1]] for i in range(k) for j in range(k)) / (k * k)


def spectral_residual(gray):
    """Hou and Zhang (2007) saliency map on a 64 px wide thumbnail."""
    small = np.asarray(Image.fromarray(gray).resize((64, int(64 * gray.shape[0] / gray.shape[1]))), float)
    f = np.fft.fft2(small)
    logamp = np.log(np.abs(f) + 1e-9)
    phase = np.angle(f)
    avg = box_blur(logamp, 1)
    sal = np.abs(np.fft.ifft2(np.exp(logamp - avg + 1j * phase))) ** 2
    return box_blur(box_blur(sal, 2), 2)


def edge_density(gray):
    e = np.asarray(Image.fromarray(gray).filter(ImageFilter.FIND_EDGES), float)
    return float((e > 40).mean())


def inside(b, r):
    return b[0] >= r[0] and b[1] >= r[1] and b[0] + b[2] <= r[0] + r[2] and b[1] + b[3] <= r[1] + r[3]


def clear_of_corners(b, r, rad):
    # A box is clear if none of its corners falls in a corner square of the trim rectangle outside the arc.
    for (cx, cy) in [(b[0], b[1]), (b[0] + b[2], b[1]), (b[0], b[1] + b[3]), (b[0] + b[2], b[1] + b[3])]:
        ox = r[0] + rad if cx < r[0] + rad else r[0] + r[2] - rad if cx > r[0] + r[2] - rad else None
        oy = r[1] + rad if cy < r[1] + rad else r[1] + r[3] - rad if cy > r[1] + r[3] - rad else None
        if ox is not None and oy is not None and math.hypot(cx - ox, cy - oy) > rad:
            return False
    return True


def check_card(img_path, man_path):
    im = Image.open(img_path).convert("RGB")
    man = json.loads(Path(man_path).read_text())
    ppi, bleed = man.get("ppi", 600), man.get("bleed", True)
    W, H = im.size
    res = {}

    tw, th = px(GEO["trim_mm"][0], ppi), px(GEO["trim_mm"][1], ppi)
    b = px(GEO["bleed_mm"], ppi) if bleed else 0
    exp = (tw + 2 * b, th + 2 * b) if bleed else (tw, th)
    res["G1_geometry"] = (abs(W - exp[0]) <= 1 and abs(H - exp[1]) <= 1 and ppi >= GEO["min_ppi"],
                          f"{W}x{H} at {ppi} ppi, expected {exp[0]}x{exp[1]}")

    trim = [b, b, tw, th]
    s = px(GEO["safe_mm"], ppi)
    safe = [b + s, b + s, tw - 2 * s, th - 2 * s]
    rad = px(GEO["corner_radius_mm"], ppi)
    boxes = man.get("boxes", [])
    bad = [x["role"] for x in boxes if not (inside(x["bbox"], safe) and clear_of_corners(x["bbox"], trim, rad))]
    res["G2_safe_area"] = (not bad, f"outside safe area: {bad}" if bad else f"{len(boxes)} boxes inside")

    mins = {"text": 8, "name": 10, "numeral": 18, "collector": 5}
    small = [f"{x['role']} {x.get('font_pt')}pt" for x in boxes
             if x["role"] in mins and x.get("font_pt", 0) < mins[x["role"]]]
    res["G3_min_text"] = (not small, f"too small: {small}" if small else "all sizes at or above minimum")

    arr = np.asarray(im)
    low = []
    for x in boxes:
        if "text_colour" not in x:
            continue
        X, Y, w, h = x["bbox"]
        region = arr[Y:Y + h, X:X + w].reshape(-1, 3)
        tc = np.array(hex_rgb(x["text_colour"]))
        # Plate colour = median of the region's pixels that are not close to the text colour.
        far = region[np.linalg.norm(region - tc, axis=1) > 60]
        plate = np.median(far if len(far) else region, axis=0)
        need = 3.0 if x["role"] == "numeral" else 4.5
        c = contrast(tc, plate)
        if c < need:
            low.append(f"{x['role']} {c:.2f}<{need}")
    res["G4_contrast"] = (not low, f"low: {low}" if low else "all text boxes pass")

    art = man["art"]
    aw, ah = art["bbox"][2], art["bbox"][3]
    need_w, need_h = aw * 300 / ppi, ah * 300 / ppi
    sw, sh = art.get("source_px", [0, 0])
    up = max(aw / sw, ah / sh) if sw and sh else float("inf")
    res["G5_art_resolution"] = (sw >= need_w and sh >= need_h and up <= 2.0,
                                f"source {sw}x{sh}, window needs {need_w:.0f}x{need_h:.0f} at 300 ppi, upscale {up:.2f}x")

    nums = [x for x in boxes if x["role"] == "numeral"]
    cap = min((x["font_pt"] * ppi / 72 * 0.7 for x in nums), default=0)  # cap height ~0.7 em
    res["numeral_height"] = (cap >= 0.06 * th, f"numeral cap {cap:.0f}px vs 6% of trim height {0.06 * th:.0f}px")

    share = aw * ah / (tw * th)
    sun = man.get("rarity") == "sun" or man.get("full_art")
    res["art_share"] = ((0.95 <= share) if sun else (0.50 <= share <= 0.65), f"art {share:.0%} of face")

    gray = np.asarray(im.convert("L"))
    # The art should draw more than its area's share of attention: saliency mass in the art / art area share >= 1.
    A = art["bbox"]
    sal = spectral_residual(gray)
    sy, sx = sal.shape[0] / H, sal.shape[1] / W
    in_art = sal[int(A[1] * sy):int((A[1] + A[3]) * sy), int(A[0] * sx):int((A[0] + A[2]) * sx)].sum() / sal.sum()
    lift = in_art / (A[2] * A[3] / (W * H))
    res["saliency_in_art"] = (lift >= 1.0, f"art holds {in_art:.0%} of saliency, {lift:.2f}x its area share")

    # Calm zones matter where text sits on a translucent plate over art: measured on the art layer alone
    # (manifest art.layer, same canvas size). Opaque plates hide the art and pass.
    zones = [x for x in boxes if x["role"] in ("name", "text") and x.get("plate") == "translucent"]
    if not zones:
        res["calm_text_zones"] = (True, "all text on opaque plates")
    elif not art.get("layer"):
        res["calm_text_zones"] = (False, "translucent plates need art.layer to measure")
    else:
        lg = np.asarray(Image.open(Path(man_path).parent / art["layer"]).convert("L"))
        art_ed = edge_density(lg[A[1]:A[1] + A[3], A[0]:A[0] + A[2]])
        zone_ed = max(edge_density(lg[y:y + h, x0:x0 + w]) for x0, y, w, h in (z["bbox"] for z in zones))
        res["calm_text_zones"] = (zone_ed <= 0.6 * art_ed, f"text-zone edge density {zone_ed:.3f} vs art {art_ed:.3f}")

    fams = {x["family"] for x in boxes if x.get("family")}
    res["families"] = (len(fams) <= 2, f"{sorted(fams)}")
    res["no_text_on_raw_art"] = (all(x.get("plate") in ("opaque", "translucent") for x in boxes if x["role"] in ("name", "text")),
                                 "every name/text box declares a plate")

    col = man.get("collector", {})
    missing = [k for k in ("set", "number", "total", "maker", "variant") if not col.get(k)]
    res["collector_line"] = (not missing and any(x["role"] == "collector" for x in boxes),
                             f"missing {missing}" if missing else "set, number/total, maker, variant present")

    face = np.zeros((H, W), bool)
    face[trim[1]:trim[1] + th, trim[0]:trim[0] + tw] = True
    framemask = face.copy()
    framemask[A[1]:A[1] + A[3], A[0]:A[0] + A[2]] = False
    for x in boxes:
        X, Y, w, h = x["bbox"]
        framemask[Y:Y + h, X:X + w] = False
    fshare = framemask.sum() / face.sum()
    res["frame_share"] = ((0.15 <= fshare <= 0.30) or sun, f"frame {fshare:.0%} of face")
    lum = gray[framemask] / 255.0 if framemask.any() else np.zeros(1)
    res["material_value_range"] = (float(lum.std()) >= 0.08 or sun, f"frame luminance std {lum.std():.3f}")

    masks = man.get("finish_masks", [])
    okm = all(Image.open(Path(man_path).parent / m).size == (W, H) for m in masks)
    needs = man.get("rarity") in ("bloom", "harvest", "sun")
    res["finish_masks"] = (okm and (masks or not needs), f"{len(masks)} masks" + ("" if okm else ", wrong size"))
    return res


def main(argv):
    if argv[:1] == ["--rarity"]:
        sys.exit(0 if check_rarity() else 1)
    if len(argv) != 2:
        print(__doc__)
        sys.exit(2)
    res = check_card(*argv)
    gates_ok = all(v[0] for k, v in res.items() if k.startswith("G"))
    for k, (ok, why) in res.items():
        print(f"  {'PASS' if ok else 'FAIL'}  {k:22} {why}")
    print("  manual: G6_expression_ledger, G7 reading level judge, thumb_vlm, reading_order, silhouette, lineup, "
          "object_not_ui, identity_distance, D8 juice (playtrace), D9 gamut/ink soft-proof")
    print(json.dumps({"gates_passed": gates_ok, "auto_checks": {k: bool(v[0]) for k, v in res.items()}}))
    sys.exit(0 if gates_ok else 1)


if __name__ == "__main__":
    main(sys.argv[1:])
