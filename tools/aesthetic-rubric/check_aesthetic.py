#!/usr/bin/env python3
"""Reference checker for the automatable parts of the motif, aesthetic and palette rubric.

    python3 tools/aesthetic-rubric/check_aesthetic.py docs/oracle/aesthetic/aesthetic-ranch-proposed.json
    python3 tools/aesthetic-rubric/check_aesthetic.py --measure capture.png [--crop x,y,w,h] [--k 8]

The rubric lives in docs/oracle/aesthetic/aesthetic-rubric.json; the study in docs/oracle/aesthetic/AESTHETIC_STUDY.md.
--measure prints one capture's palette in the identity schema's `layers.art.palette` shape (source footage_cv), plus
the extra measures the rubric uses (value bands, accent share, engine colours). The manifest describes one place:

    {"id": "ranch-proposed", "place": "ranch", "dialect": "wood, bells, painted signs",
     "roles": {"ground": {"hex": "#9fb465", "kind": "ground"}, "roof": {"hex": "#3f7f86", "kind": "figure"}, ...},
     "ui": {"glass_tint": "#f3ead6", "ink": "#3b2a1a", ...},
     "meanings": [{"id": "thirsty", "hex": "#4f93c4", "against": "ground", "also": ["droop", "bubble shape"]}],
     "signals": [{"id": "time", "drives": ["sky", "sun", "fog", "windows", "music"],
                  "states": {"day": {"capture": "day.jpg", "crop": [x, y, w, h]}, "night": {...}}}],
     "motifs": [{"id": "scalloped_roof_trim", "appears_in": ["home", "feed_store", "coop"]}],
     "shape_language": {"homes": "round", "animals": "round", "fences": "square", "roofs": "triangle"},
     "kid_safe": {"alarm_red": false, "max_flash_hz": 0},
     "captures": [{"file": "day.jpg", "crop": [x, y, w, h]}]}

Paths in the manifest are relative to the manifest. Colours are compared in OKLab (Ottosson 2020); colour-vision
deficiency uses the Machado, Oliveira and Fernandes (2009) matrices at full severity. Prints one line per check and
a JSON summary; exits 1 when a gate fails. LLM-judged and human checks are listed as 'manual'.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np

RUBRIC = json.loads((Path(__file__).resolve().parents[2] / "docs/oracle/aesthetic/aesthetic-rubric.json").read_text())
T = RUBRIC["targets"]

# Machado et al. 2009, severity 1.0, applied to linear RGB.
CVD = {
    "protan": [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    "deutan": [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    "tritan": [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
ENGINE = {"#ff0000": "pure red (axis X)", "#00ff00": "pure green (axis Y)", "#0000ff": "pure blue (axis Z)",
          "#ff00ff": "missing-texture magenta"}


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255


def rgb_hex(c):
    c = np.clip(np.round(np.asarray(c) * 255), 0, 255).astype(int)
    return "#%02x%02x%02x" % tuple(c)


def to_linear(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def oklab(rgb):
    """sRGB in [0,1] (... x 3) to OKLab (... x 3)."""
    lin = to_linear(rgb)
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    lms = np.cbrt(lin @ m1.T)
    return lms @ m2.T


def lch(lab):
    lab = np.asarray(lab)
    c = np.hypot(lab[..., 1], lab[..., 2])
    h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    return lab[..., 0], c, h


def simulate(rgb, kind):
    lin = to_linear(rgb) @ np.array(CVD[kind]).T
    lin = np.clip(lin, 0, 1)
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)


def de(a, b):
    return float(np.linalg.norm(oklab(a) - oklab(b)))


def warm(h, c):
    """Share of chroma in warm hues (OKLCH hue 350..110 deg: reds, oranges, yellows)."""
    w = ((h >= 350) | (h <= 110)).astype(float)
    return float((w * c).sum() / max(c.sum(), 1e-9))


def load(path, crop=None, max_side=512):
    from PIL import Image
    im = Image.open(path).convert("RGB")
    if crop:
        x, y, w, h = crop
        im = im.crop((x, y, x + w, y + h))
    s = max_side / max(im.size)
    if s < 1:
        im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))))
    return np.asarray(im, float).reshape(-1, 3) / 255


def kmeans(lab, k=8, iters=25, seed=7):
    rng = np.random.default_rng(seed)
    pts = lab[rng.choice(len(lab), min(len(lab), 20000), replace=False)]
    cent = [pts[rng.integers(len(pts))]]
    for _ in range(k - 1):  # k-means++ seeding
        d = np.min([((pts - c) ** 2).sum(1) for c in cent], axis=0)
        cent.append(pts[rng.choice(len(pts), p=d / d.sum())])
    cent = np.array(cent)
    for _ in range(iters):
        lab_ = np.argmin(((pts[:, None] - cent[None]) ** 2).sum(2), 1)
        cent = np.array([pts[lab_ == i].mean(0) if (lab_ == i).any() else cent[i] for i in range(k)])
    share = np.bincount(lab_, minlength=k) / len(pts)
    order = np.argsort(-share)
    return cent[order], share[order]


def lab_to_rgb(lab):
    m2i = np.linalg.inv(np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                                  [1.9779984951, -2.4285922050, 0.4505937099],
                                  [0.0259040371, 0.7827717662, -0.8086757660]]))
    m1i = np.linalg.inv(np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                                  [0.2119034982, 0.6806995451, 0.1073969566],
                                  [0.0883024619, 0.2817188376, 0.6299787005]]))
    lin = np.clip(((np.asarray(lab) @ m2i.T) ** 3) @ m1i.T, 0, 1)
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)


def measure(path, crop=None, k=8):
    rgb = load(path, crop)
    lab = oklab(rgb)
    L, C, H = lch(lab)
    cent, share = kmeans(lab, k)
    bands = T["value_bands"]
    dark, light = float((L < bands[0]).mean()), float((L > bands[1]).mean())
    acc = float(((C >= T["accent_chroma"]) & (C >= 2 * np.median(C))).mean())
    eng = {}
    for h, label in ENGINE.items():
        n = float((np.linalg.norm(lab - oklab(hex_rgb(h)), axis=1) < 0.08).mean())
        if n:
            eng[label] = round(n, 5)
    mean_l = float(L.mean())
    return {
        "dominant_hex": [rgb_hex(lab_to_rgb(c)) for c in cent[:5]],
        "cluster_share": [round(float(s), 3) for s in share[:5]],
        "mean_lightness": round(mean_l, 3),
        "mean_saturation": round(float(min(1, C.mean() / 0.2)), 3),
        "mean_chroma": round(float(C.mean()), 4),
        "value_key": "high" if mean_l > 0.72 else "low" if mean_l < 0.5 else "mid",
        "contrast_rms": round(float(L.std()), 3),
        "warmth": round(warm(H, C), 3),
        "value_bands": {"dark": round(dark, 3), "mid": round(1 - dark - light, 3), "light": round(light, 3)},
        "accent_share": round(acc, 3),
        "engine_colours": eng,
        "_lab": lab,
        "_cent": cent,
        "_share": share,
    }


def palette_distance(a, b):
    """Share-weighted chamfer distance (OKLab) between two measured palettes' clusters."""
    def one(x, y):
        return float(sum(w * np.min(np.linalg.norm(y["_cent"] - c, axis=1)) for c, w in zip(x["_cent"], x["_share"])))
    return (one(a, b) + one(b, a)) / 2


def public(m):
    return {k: v for k, v in m.items() if not k.startswith("_")}


def check(man_path):
    man_path = Path(man_path)
    m = json.loads(man_path.read_text())
    base = man_path.parent
    res = {}
    roles = m.get("roles", {})
    rc = {k: hex_rgb(v["hex"]) for k, v in roles.items()}

    def colour(ref):
        return rc[ref] if ref in rc else hex_rgb(ref)

    # Measure every capture once.
    caps = {}
    for c in m.get("captures", []):
        p = base / c["file"]
        if p.exists():
            caps[c["file"]] = measure(p, c.get("crop"))

    # G1 value readable: every capture has at least two value bands over the floor; figures separate from ground in value.
    bad = []
    for f, me in caps.items():
        vb = me["value_bands"]
        if sum(v >= T["band_floor"] for v in vb.values()) < 2 or me["contrast_rms"] < T["contrast_rms_min"]:
            bad.append(f"{f} bands {vb} rms {me['contrast_rms']}")
    grounds = [k for k, v in roles.items() if v.get("kind") == "ground"]
    for k, v in roles.items():
        if v.get("kind") == "figure":
            for g in grounds:
                dl = abs(float(oklab(rc[k])[0] - oklab(rc[g])[0]))
                if dl < T["figure_ground_dL"]:
                    bad.append(f"{k} on {g} dL {dl:.3f}")
    res["G1_value_readable"] = (not bad and bool(caps), "; ".join(bad) or f"{len(caps)} captures, figures clear of ground in value")

    # G2 colour never alone: every meaning has at least one non-colour cue.
    lone = [x["id"] for x in m.get("meanings", []) if not x.get("also")]
    res["G2_colour_never_alone"] = (not lone, ("colour only: " + ", ".join(lone)) if lone else
                                    f"{len(m.get('meanings', []))} meanings each carry shape, motion or sound too")

    # G3 colour-blind safe: every meaning against its ground, and meanings against each other, under 3 simulations.
    bad = []
    means = m.get("meanings", [])
    pairs = [(x["id"], colour(x["hex"]), x.get("against", "ground"), colour(x.get("against", "ground"))) for x in means]
    pairs += [(a["id"], colour(a["hex"]), b["id"], colour(b["hex"])) for i, a in enumerate(means) for b in means[i + 1:]
              if a.get("against", "ground") == b.get("against", "ground")]  # meanings that can sit side by side
    worst, worst_pair = None, ""
    for a, ca, b, cb in pairs:
        for kind in ["normal", *CVD]:
            sa, sb = (ca, cb) if kind == "normal" else (simulate(ca, kind), simulate(cb, kind))
            d = de(sa, sb)
            if worst is None or d < worst:
                worst, worst_pair = d, f"{a}/{b} {kind}"
            if d < T["cvd_min_de"]:
                bad.append(f"{a}/{b} {kind} dE {d:.3f}")
    res["G3_cvd_safe"] = (not bad, "; ".join(bad[:6]) or (f"{len(pairs)} pairs, worst dE {worst:.3f} ({worst_pair})" if pairs else
                                                     "no colour meanings to confuse"))

    # G4 the light follows the signal: each signal's states change the world, not only the UI.
    bad, notes = [], []
    for s in m.get("signals", []):
        if len([c for c in s.get("drives", []) if c in T["world_channels"]]) < 3:
            bad.append(f"{s['id']} drives {len(s.get('drives', []))} world channels (< 3)")
        st = s.get("states", {})
        meas, spec = {}, {}
        for name, cfg in st.items():
            if "capture" in cfg and (base / cfg["capture"]).exists():
                meas[name] = measure(base / cfg["capture"], cfg.get("crop"))
            elif "sky" in cfg:
                spec[name] = cfg
        if s["id"] == "time" and {"day", "night"} <= meas.keys():
            dl = meas["day"]["mean_lightness"] - meas["night"]["mean_lightness"]
            dw = meas["day"]["warmth"] - meas["night"]["warmth"]
            notes.append(f"time day->night measured dL {dl:+.3f} warmth {dw:+.3f}")
            if dl < T["night_dL_min"]:
                bad.append(f"night is not darker than day (dL {dl:+.3f}, need >= {T['night_dL_min']})")
        elif s["id"] == "time" and {"day", "night"} <= spec.keys():
            dl = float(oklab(hex_rgb(spec["day"]["sky"]))[0] - oklab(hex_rgb(spec["night"]["sky"]))[0])
            notes.append(f"time day->night specified sky dL {dl:+.3f} (capture to confirm)")
            if dl < T["night_dL_min"]:
                bad.append(f"night sky is not darker than day (dL {dl:+.3f})")
        elif len(meas) >= 2:
            names = list(meas)
            d = max(palette_distance(meas[a], meas[b]) for i, a in enumerate(names) for b in names[i + 1:])
            dw = max(abs(meas[a]["warmth"] - meas[b]["warmth"]) for i, a in enumerate(names) for b in names[i + 1:])
            notes.append(f"{s['id']} states differ by palette distance {d:.3f}, warmth {dw:.2f}")
            if d < T["state_de_min"] and dw < T["state_warmth_min"]:
                bad.append(f"{s['id']} states look alike ({d:.3f})")
    if not m.get("signals"):
        bad.append("no signals declared")
    res["G4_light_follows_signal"] = (not bad, "; ".join(bad + notes) or "signals drive the world")

    # G5 no engine colours in the world.
    bad = [f"{f}: {me['engine_colours']}" for f, me in caps.items()
           if sum(me["engine_colours"].values()) > T["engine_share_max"]]
    res["G5_no_engine_colours"] = (not bad, "; ".join(bad) or "no axis primaries or missing-texture magenta")

    # G6 kid safe.
    ks = m.get("kid_safe", {})
    bad = [k for k, v in [("alarm_red", ks.get("alarm_red")), ("flash", ks.get("max_flash_hz", 0) > 3),
                          ("fail_desaturate", ks.get("fail_desaturate"))] if v]
    res["G6_kid_safe"] = (not bad, ("fails: " + ", ".join(bad)) if bad else "no alarm red, no flashing over 3 Hz")

    # Scored, automatable.
    hues = {v.get("hue_family") for v in roles.values() if v.get("hue_family")}
    res["role_count"] = (T["roles"][0] <= len(roles) <= T["roles"][1] and len(hues) <= T["hue_families_max"],
                         f"{len(roles)} roles, {len(hues)} hue families")
    if caps:
        acc = max(me["accent_share"] for me in caps.values())
        res["accent_scarcity"] = (acc <= T["accent_share_max"], f"max accent share {acc:.3f}")
        chroma = [me["mean_chroma"] for me in caps.values()]
        lo, hi = T["world_chroma"]
        res["rich_not_neon"] = (all(lo <= c <= hi for c in chroma), "world mean chroma " + ", ".join(f"{c:.3f}" for c in chroma))
        if roles:
            pal = oklab(np.array(list(rc.values())))
            share = []
            for me in caps.values():
                d = np.min(np.linalg.norm(me["_lab"][:, None] - pal[None], axis=2), 1)
                share.append(float((d < T["in_gamut_de"]).mean()))
            res["in_gamut"] = (min(share) >= T["in_gamut_min"], "share near a palette role " + ", ".join(f"{s:.2f}" for s in share))

    def C(ref):
        return float(lch(oklab(colour(ref)))[1])

    figs = [C(k) for k, v in roles.items() if v.get("kind") == "figure"]
    grd = [C(k) for k in grounds]
    back = [C(k) for k, v in roles.items() if v.get("kind") == "backdrop"]
    if figs and grd:
        ok = np.median(figs) > max(grd) * T["figure_chroma_ratio"] and (not back or max(back) <= min(grd))
        res["saturation_ladder"] = (bool(ok), f"figure chroma {np.median(figs):.3f} > ground {max(grd):.3f}"
                                    + (f" >= backdrop {max(back):.3f}" if back else ""))
    if "light" in roles and "shadow" in roles:
        _, cl, hl = lch(oklab(rc["light"]))
        _, cs, hs = lch(oklab(rc["shadow"]))
        cool = 180 <= float(hs) <= 300 or (cs < 0.02)
        res["warm_light_cool_shadow"] = (warm(np.array([hl]), np.array([cl + 1e-6])) > 0.5 and cool,
                                         f"light hue {float(hl):.0f} deg, shadow hue {float(hs):.0f} deg")
    ui = m.get("ui", {})
    if ui and roles:
        far = []
        for k, h in ui.items():
            if k == "ink":  # ink is a dark text colour: it only has to lean warm, not sit in the world palette
                continue
            d = min(de(hex_rgb(h), c) for c in rc.values())
            if d > T["ui_from_world_de"]:
                far.append(f"{k} {h} (dE {d:.2f})")
        web = [f"{k} {h}" for k, h in ui.items() if h.lower() in T["web_colours"]]
        grey = [f"{k} {h}" for k, h in ui.items() if k not in ("ink",) and float(lch(oklab(hex_rgb(h)))[1]) < T["grey_chroma"]]
        res["ui_speaks_world"] = (not far and not web, "; ".join(far + web) or "every UI colour comes from the world palette")
        res["no_dead_grey"] = (not grey, ("grey fills: " + ", ".join(grey)) if grey else "UI tints carry the world's warmth")
    world = [x for x in means if x.get("layer", "world") == "world"]
    res["palette_carries_state"] = (len(world) >= T["world_meanings_min"],
                                    f"{len(world)} states shown by colour in the world itself")
    grey = [x["id"] for x in means
            if abs(float(oklab(colour(x["hex"]))[0] - oklab(colour(x.get("against", "ground")))[0])) < T["greyscale_dL"]]
    if means:
        res["survives_greyscale"] = (not grey, ("same lightness as ground: " + ", ".join(grey)) if grey else "every meaning differs in lightness")
    if pairs:
        res["cvd_margin"] = (worst >= 1.25 * T["cvd_min_de"], f"worst {worst:.3f} ({worst_pair}), target {1.25 * T['cvd_min_de']:.3f}")
    sigs = {s["id"]: s.get("states", {}) for s in m.get("signals", [])}
    res["time_states"] = (len(sigs.get("time", {})) >= T["time_states_min"], f"{len(sigs.get('time', {}))} times of day")
    seasons = [k for k, v in sigs.get("season", {}).items() if "capture" in v]
    res["season_states"] = (len(seasons) >= T["season_states_min"], f"{len(seasons)} seasons captured")
    flat = [k for k, v in roles.items() if v.get("kind") in ("backdrop", "ground") and not 0.12 <= float(oklab(rc[k])[0]) <= 0.96]
    flat += [k for k, h in ui.items() if not 0.12 <= float(oklab(hex_rgb(h))[0]) <= 0.96]
    res["glare"] = (not flat, ("outside L 0.12-0.96: " + ", ".join(flat)) if flat else "no glare fields")
    hexes = [x["hex"].lower() for x in means]
    if hexes:
        res["one_meaning_per_colour"] = (len(set(hexes)) == len(hexes), f"{len(hexes)} meanings, {len(set(hexes))} colours")
    motifs = m.get("motifs", [])
    res["motif_recurs"] = (len(motifs) >= T["motifs_min"] and all(len(x.get("appears_in", [])) >= 3 for x in motifs),
                           f"{len(motifs)} motifs, each in >= 3 things" if motifs else "no motifs declared")
    sl = m.get("shape_language", {})
    res["shape_language_declared"] = (len(sl) >= 3 and len(set(sl.values())) >= 2, f"{len(sl)} families, {len(set(sl.values()))} shapes")
    return m, res, caps


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    if argv[0] == "--measure":
        crop, k, files = None, 8, []
        it = iter(argv[1:])
        for a in it:
            if a == "--crop":
                crop = [int(v) for v in next(it).split(",")]
            elif a == "--k":
                k = int(next(it))
            else:
                files.append(a)
        out = {f: dict(public(measure(f, crop, k)), source="footage_cv") for f in files}
        print(json.dumps(out, indent=1))
        return 0
    m, res, caps = check(argv[0])
    print(f"Aesthetic {m.get('id', argv[0])}")
    gates_ok = all(v[0] for k, v in res.items() if k.startswith("G"))
    for k, (ok, why) in res.items():
        print(f"  {'PASS' if ok else 'FAIL'}  {k:26} {why}")
    score, of = 0.0, 0
    for d in RUBRIC["dimensions"]:
        auto = [c["id"] for c in d["checks"] if c.get("auto") and c["id"] in res]
        if auto:
            score += d["weight"] * sum(res[c][0] for c in auto) / len(auto)
            of += d["weight"]
    print(f"  provisional score {score:.0f} / {of} on automatable checks (ship at {RUBRIC['ship_threshold']} / 100 with manual checks)")
    print("  manual: silhouette_squint, one_world_pairwise, motif_meaning, mood_script, dialect_judge, glass_reads_as_object, "
          "previews_live, G7_expression_ledger")
    print(json.dumps({"gates_passed": gates_ok, "provisional_score": round(score, 1), "auto_weight": of, "auto_checks": {k: bool(v[0]) for k, v in res.items()},
                      "captures": {f: public(me) for f, me in caps.items()}}))
    return 0 if gates_ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
