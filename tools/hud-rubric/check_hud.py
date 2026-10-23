#!/usr/bin/env python3
"""Reference checker for the automatable parts of the HUD rubric.

    python3 tools/hud-rubric/check_hud.py docs/oracle/hud/hud-ranch-proposed.json
    python3 tools/hud-rubric/check_hud.py hud.json --css play.css --code play.js   # also scan for web red flags

The rubric lives in docs/oracle/hud/hud-rubric.json; the study in docs/oracle/hud/HUD_STUDY.md.
The manifest (hud.json) describes one play-mode screen:

    {"id": "ranch-proposed", "viewports": {"portrait": {"size": [390, 844], "safe": [47, 0, 34, 0]},
                                           "landscape": {"size": [844, 390], "safe": [0, 47, 21, 47]}},
     "elements": [{"id": "sun_dial", "kind": "diegetic|spatial|meta|overlay|none", "tier": "T0..T4",
                   "time": "always|on_change|threshold|summoned", "readout": true, "touch": true,
                   "grownup": false, "hover_only": false, "words": 0, "numeral_cap_px": 0,
                   "colour": "#2b1d0e", "numeral_bbox": [x, y, w, h], "on_solid_token": false, "world_echo": "light", "touches_per_min": 2,
                   "bbox": {"portrait": [x, y, w, h], "landscape": [x, y, w, h]}}],
     "fade": {"focus": {...}, "change": {...}, "idle_tuck": {...}, "threshold": {...}, "summon_all": "..."},
     "signals": [{"id": "storm", "drives": ["light", "music", "npcs", "animals", "sound"]}],
     "kid_safe": {"red_alarm": false, "buzzer": false, "max_flash_hz": 0, "fail_screen": false},
     "captures": ["day.png", "dusk.png", "night.png"]}

Safe insets are [top, right, bottom, left] in CSS px. bboxes are only needed for overlay elements (and for
touchable spatial ones when a capture is checked). Captures are screenshots at the portrait size, relative to the
manifest. Prints one line per check and a JSON summary; exits 1 when a gate fails. LLM-judged and in-game
(playtrace) checks are listed as 'manual'.
"""
import json
import re
import sys
from pathlib import Path

RUBRIC = json.loads((Path(__file__).resolve().parents[2] / "docs/oracle/hud/hud-rubric.json").read_text())
T = RUBRIC["targets"]

WEB_CSS = [
    (r"border\s*:\s*1px\s+solid", "1px solid border"),
    (r"font-family\s*:[^;]*\b(system-ui|-apple-system|BlinkMacSystemFont|Segoe UI|Roboto|Helvetica|Arial)\b", "system font stack"),
    (r"(material-icons|lucide|font-?awesome|\bfa-[a-z])", "web icon set"),
    (r":hover\s*\{[^}]*\bbackground(-color)?\s*:[^}]*\}", "hover-only colour change"),
]
BANNED = r"\b(panel|sidebar|toolbar|drawer|modal|toast|tabs?|dropdown|<select|<input|<dialog)\b"


def area(b):
    return b[2] * b[3]


def union_area(boxes):
    """Exact union area of axis-aligned rectangles (coordinate compression; HUDs have few boxes)."""
    if not boxes:
        return 0
    xs = sorted({b[0] for b in boxes} | {b[0] + b[2] for b in boxes})
    ys = sorted({b[1] for b in boxes} | {b[1] + b[3] for b in boxes})
    total = 0
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            cx, cy = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            if any(b[0] <= cx <= b[0] + b[2] and b[1] <= cy <= b[1] + b[3] for b in boxes):
                total += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j])
    return total


def inside_safe(b, size, safe):
    top, right, bottom, left = safe
    left = max(left, T["back_swipe_strip_px"])
    return b[0] >= left and b[1] >= top and b[0] + b[2] <= size[0] - right and b[1] + b[3] <= size[1] - bottom


def rel_lum(rgb):
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(la, lb):
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hex_rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def ring_contrast(img, b, colour):
    """Worst contrast of the glyph colour against the 5th and 95th percentile luminance of a ring round the bbox."""
    import numpy as np
    a = np.asarray(img.convert("RGB"), float)
    x, y, w, h = b
    pad = max(4, int(0.25 * min(w, h)))
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(a.shape[1], x + w + pad), min(a.shape[0], y + h + pad)
    patch = a[y0:y1, x0:x1]
    mask = np.ones(patch.shape[:2], bool)
    mask[y - y0:y - y0 + h, x - x0:x - x0 + w] = False
    lin = np.where(patch / 255 <= 0.04045, patch / 255 / 12.92, ((patch / 255 + 0.055) / 1.055) ** 2.4)
    lum = (lin @ np.array([0.2126, 0.7152, 0.0722]))[mask]
    fg = rel_lum(hex_rgb(colour))
    return min(contrast(fg, float(np.percentile(lum, 5))), contrast(fg, float(np.percentile(lum, 95))))


def check(man_path, css=(), code=()):
    man = json.loads(Path(man_path).read_text())
    els = man["elements"]
    res = {}
    overlay_always = [e for e in els if e["kind"] == "overlay" and e.get("time") == "always"]

    # G1 chrome budget, per orientation
    worst, notes = 0.0, []
    for name, vp in man["viewports"].items():
        size = vp["size"]
        boxes = [e["bbox"][name] for e in overlay_always if name in e.get("bbox", {})]
        share = union_area(boxes) / (size[0] * size[1])
        worst = max(worst, share)
        notes.append(f"{name} {share:.1%}")
    res["G1_chrome_budget"] = (worst <= T["chrome_budget_share"], ", ".join(notes) + f" (max {T['chrome_budget_share']:.0%})")

    # G2 words
    words = sum(e.get("words", 0) for e in els if e.get("tier") != "T4_workbench" and e.get("time") != "summoned")
    summoned_words = sum(e.get("words", 0) for e in els if e.get("time") == "summoned" and e.get("tier") != "T4_workbench")
    res["G2_words"] = (words == 0 and summoned_words == 0, f"{words} words always or on change, {summoned_words} when summoned")

    # G3 touch targets and edges
    bad = []
    for e in els:
        if not e.get("touch"):
            continue
        floor = T["min_touch_px_grownup"] if e.get("grownup") else T["min_touch_px"]
        for name, b in e.get("bbox", {}).items():
            vp = man["viewports"][name]
            if min(b[2], b[3]) < floor:
                bad.append(f"{e['id']}/{name} {min(b[2], b[3])}px<{floor}")
            if not inside_safe(b, vp["size"], vp["safe"]):
                bad.append(f"{e['id']}/{name} outside safe area")
        for t in e.get("targets_px", []):
            if t < floor:
                bad.append(f"{e['id']} sub-target {t}px<{floor}")
    res["G3_targets_edges"] = (not bad, "; ".join(bad[:6]) or "all targets sized and inside safe area")

    # G4 hover only
    hov = [e["id"] for e in els if e.get("hover_only")]
    res["G4_no_hover_only"] = (not hov, ", ".join(hov) or "every preview has a touch path")

    # G5 numerals: size always; contrast when captures are given
    small = [f"{e['id']} {e['numeral_cap_px']}px" for e in els if 0 < e.get("numeral_cap_px", 0) < T["min_numeral_cap_px"]]
    low = []
    caps = [Path(man_path).parent / c for c in man.get("captures", [])]
    caps = [c for c in caps if c.exists()]
    if caps:
        from PIL import Image
        for c in caps:
            img = Image.open(c)
            for e in els:
                b = e.get("numeral_bbox") or e.get("bbox", {}).get("portrait")
                if e.get("numeral_cap_px") and e.get("colour") and b and not e.get("on_solid_token"):
                    r = ring_contrast(img, b, e["colour"])
                    if r < T["min_numeral_contrast"]:
                        low.append(f"{e['id']}@{c.stem} {r:.1f}:1")
    msg = "; ".join(small + low) or ("sizes ok" + (f", contrast ok over {len(caps)} captures" if caps else ", contrast needs captures"))
    res["G5_numeral_legibility"] = (not small and not low, msg)

    # G7 kid-safe (the automatable half)
    ks = man.get("kid_safe", {})
    ks_bad = [k for k in ("red_alarm", "buzzer", "fail_screen") if ks.get(k)]
    if ks.get("max_flash_hz", 0) > T["max_flash_hz"]:
        ks_bad.append(f"flash {ks['max_flash_hz']} Hz")
    res["G7_kid_safe"] = (not ks_bad and bool(ks), ", ".join(ks_bad) or ("declared safe" if ks else "not declared"))

    # Scored, automatable
    n_always = sum(1 for e in els if e.get("time") == "always" and e["kind"] == "overlay")
    res["always_on_count"] = (n_always <= T["max_always_on"], f"{n_always} always-on overlay elements (max {T['max_always_on']})")
    tiers = set(RUBRIC["taxonomy"]["tiers"])
    untiered = [e["id"] for e in els if e.get("tier") not in tiers]
    res["one_tier_each"] = (not untiered, ", ".join(untiered) or "every element has one tier")
    reads = [e for e in els if e.get("readout")]
    on_things = [e for e in reads if e["kind"] != "overlay"]
    share = len(on_things) / len(reads) if reads else 0
    res["spatial_share"] = (share >= T["spatial_share_min"], f"{len(on_things)}/{len(reads)} readouts on things ({share:.0%}, min {T['spatial_share_min']:.0%})")
    no_echo = [e["id"] for e in overlay_always if e.get("readout") and not e.get("world_echo")]
    res["world_echo"] = (not no_echo, ", ".join(no_echo) or "every always-on meter has a world echo")
    world = set(RUBRIC["core_rule"]["channels"])
    sigs = man.get("signals", [])
    thin = [f"{g['id']} ({len(set(g.get('drives', [])) & world)})" for g in sigs if len(set(g.get("drives", [])) & world) < RUBRIC["core_rule"]["min_world_channels"]]
    res["one_signal_many_channels"] = (bool(sigs) and not thin, ("no signals declared" if not sigs else ", ".join(thin) + " drive too few world channels") if (thin or not sigs) else f"{len(sigs)} signals each drive 3+ world channels")
    vp = man["viewports"].get("portrait")
    far = []
    if vp:
        for e in els:
            b = e.get("bbox", {}).get("portrait")
            if b and e.get("touch") and e.get("touches_per_min", 0) > 1 and b[1] + b[3] / 2 < vp["size"][1] * 0.6:
                far.append(e["id"])
    res["thumb_zone"] = (not far, ", ".join(far) or "frequent targets in the bottom 40%")
    missing = [k for k in ("focus", "change", "idle_tuck", "threshold", "summon_all") if k not in man.get("fade", {})]
    res["rules_declared"] = (not missing, ("missing " + ", ".join(missing)) if missing else "focus, change, idle, threshold, summon-all")
    orient = [n for n in ("portrait", "landscape") if n not in man["viewports"]]
    res["orientations"] = (not orient, ("missing " + ", ".join(orient)) if orient else "portrait and landscape declared")

    flags = []
    for f in css:
        text = Path(f).read_text(errors="ignore")
        for pat, label in WEB_CSS:
            n = len(re.findall(pat, text, re.I | re.S))
            if n:
                flags.append(f"{Path(f).name}: {n}x {label}")
    if css:
        res["web_red_flags"] = (not flags, "; ".join(flags) or "no web red flags")
    hits = []
    for f in code:
        text = Path(f).read_text(errors="ignore")
        n = len(re.findall(BANNED, text, re.I))
        if n:
            hits.append(f"{Path(f).name}: {n}")
    if code:
        res["banned_words"] = (not hits, "; ".join(hits) + " hits (each needs a reason)" if hits else "none")
    return man, res


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    css, code, man = [], [], None
    it = iter(argv)
    for a in it:
        if a == "--css":
            css.append(next(it))
        elif a == "--code":
            code.append(next(it))
        else:
            man = a
    m, res = check(man, css, code)
    print(f"HUD {m.get('id', man)}")
    gates_ok = all(v[0] for k, v in res.items() if k.startswith("G"))
    for k, (ok, why) in res.items():
        print(f"  {'PASS' if ok else 'FAIL'}  {k:22} {why}")
    print("  manual: G6_expression_ledger, one_second, silhouette, colour_not_alone, occlusion, gestures, rules_observed, "
          "juice timings, object_judge, sound_twin, identity_distance")
    print(json.dumps({"gates_passed": gates_ok, "auto_checks": {k: bool(v[0]) for k, v in res.items()}}))
    return 0 if gates_ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
