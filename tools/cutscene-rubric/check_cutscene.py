#!/usr/bin/env python3
"""Reference checker for the automatable parts of the cutscene rubric (AW-STUDY-0009).

    python3 tools/cutscene-rubric/check_cutscene.py docs/oracle/cutscenes/cutscene-ranch-proposed.json
    python3 tools/cutscene-rubric/check_cutscene.py --overlays prototypes/ranch-atelier/dist/fritigern/overlays.js
    python3 tools/cutscene-rubric/check_cutscene.py --cut prototypes/ranch-atelier/dist/fritigern/scene.js

The rubric lives in docs/oracle/cutscenes/cutscene-rubric.json; the study in docs/oracle/cutscenes/CUTSCENE_STUDY.md.
A manifest lists one place's cutscenes:

    {"id": "...", "bpm": 124, "cutscenes": [{"id": "creature-arrives", "category": "reward", "jobs": ["reward"],
      "style": "puppet", "render": "in_engine", "control_taken": "camera_only", "first_s": 3.9, "repeat_s": 1.9,
      "interaction": "poke", "skip": {"pause": true, "seen_skip": true, "hold_to_skip": true, "tap_answers": true},
      "words_on_screen": 0, "read_aloud": true, "masks": [], "letterbox": false, "world_events": ["bell rings"],
      "recorded": true, "presentation_perceivable": false, "engine_artifacts": false, "fail_state": false,
      "horror_sting": false, "flash_hz": 0, "choice_timer_s": null, "audience": "child",
      "signal": {"id": "mood", "drives": ["animals", "music", "sound"]}, "music": {"bars": 2, "sting": "reward"},
      "hand_back": "play_camera", "dialect": "ranch", "transition_in": "camera_move", "transition_out": "camera_move",
      "cover": {"ends": "on_ready_bar", "settle_bars": 1, "show": "world_build", "fake_percent": false}}]}

Prints one line per check and a JSON summary; exits 1 when a gate fails. --overlays measures words on screen and
read-aloud pace per style; --cut prints shot lengths and how many bars each spans.
"""
import json
import re
import sys
from pathlib import Path

RUBRIC = json.loads((Path(__file__).resolve().parents[2] / "docs/oracle/cutscenes/cutscene-rubric.json").read_text())
T = RUBRIC["targets"]
TAX = RUBRIC["taxonomy"]
THROUGH_WORLD = {"camera_move", "page_turn", "world_sparkle", "world_build", "door", "cloud", "airlock", "match_cut", "radio_static"}


def bars(seconds, bpm):
    return seconds / (60 / bpm * 4)


def gates(cs):
    out = {}
    fails = {g["id"]: [] for g in RUBRIC["gates"]}
    for c in cs:
        cid = c["id"]
        if not c.get("jobs") or any(j not in TAX["jobs"] for j in c["jobs"]) or c.get("category") not in TAX["categories"]:
            fails["G1_job_declared"].append(cid)
        sk = c.get("skip", {})
        need = ["pause", "hold_to_skip", "tap_answers"] + ([] if c.get("category") == "loading_cover" else ["seen_skip"])
        short = (c.get("first_s") or 0) <= 3 and c.get("control_taken") != "full"
        if not short and not all(sk.get(k) for k in need):
            fails["G2_no_trap"].append(cid)
        if c.get("words_on_screen", 0) > 0 and not c.get("read_aloud"):
            fails["G3_zero_required_reading"].append(cid)
        bad_mask = [m for m in c.get("masks", []) if m in T["banned_masks"]]
        bad_box = c.get("letterbox") and (c.get("style") not in T["letterbox_allowed_styles"] or c.get("category") in T["letterbox_banned_categories"])
        if bad_mask or bad_box or c.get("transition_in") == "fade_white" or c.get("transition_out") == "fade_white":
            fails["G4_no_mask"].append(cid)
        band = T["length_bands_s"].get(c.get("category"), {})
        if c.get("category") == "loading_cover":
            cv = c.get("cover", {})
            if cv.get("ends") not in ("on_ready", "on_ready_bar") or cv.get("settle_bars", 0) > T["cover_settle_bars_max"]:
                fails["G5_length_band"].append(cid)
        else:
            for key in ("first", "repeat"):
                v = c.get(key + "_s")
                lo, hi = band.get(key, [0, 9999])
                if v is None or not lo <= v <= hi:
                    fails["G5_length_band"].append(cid)
                    break
        if (c.get("world_events") and not c.get("recorded")) or c.get("presentation_perceivable") or c.get("engine_artifacts"):
            fails["G6_layers_apart"].append(cid)
        if c.get("fail_state") or c.get("horror_sting") or c.get("flash_hz", 0) > T["flash_hz_max"] or \
                (c.get("audience") == "child" and c.get("choice_timer_s")):
            fails["G7_kid_safe"].append(cid)
    for g in RUBRIC["gates"]:
        out[g["id"]] = {"pass": not fails[g["id"]], "failing": fails[g["id"]]}
    return out


def share(items, pred):
    return sum(1 for c in items if pred(c)) / len(items) if items else 1.0


def scores(cs):
    pts = {s["id"]: s["points"] for s in RUBRIC["scored"]}
    non_cover = [c for c in cs if c.get("category") != "loading_cover"]
    covers = [c for c in cs if c.get("category") == "loading_cover"]
    world = set(T["world_channels"])

    def brief(c):
        lo, hi = T["length_bands_s"][c["category"]]["first"]
        return c.get("first_s") is not None and c["first_s"] <= lo + (hi - lo) / 2

    s = {
        "S1_purpose_fit": share(cs, lambda c: len(c.get("jobs", [])) >= 2),
        "S2_brevity": share(non_cover, brief),
        "S3_hand_back": share(cs, lambda c: c.get("hand_back") == "play_camera"),
        "S4_interaction": share(cs, lambda c: c.get("interaction") in ("camera", "poke", "choice", "rhythm")),
        "S5_one_signal": share(cs, lambda c: len(world & set(c.get("signal", {}).get("drives", []))) >= T["signal_channels_min"]),
        "S6_music_sync": share(cs, lambda c: bool((c.get("music", {}).get("bars") or c.get("music", {}).get("loop")) and c.get("music", {}).get("sting"))),
        "S7_cover_honesty": share(covers, lambda c: c.get("cover", {}).get("show") in ("world_build", "play", "travel") and not c.get("cover", {}).get("fake_percent")),
        "S8_repeat_shortening": share(non_cover, lambda c: c.get("control_taken") == "none" or (c.get("repeat_s") is not None and c.get("first_s") is not None and c["repeat_s"] < c["first_s"])),
        "S9_place_dialect": share(cs, lambda c: bool(c.get("dialect")) and c.get("transition_in") in THROUGH_WORLD and c.get("transition_out") in THROUGH_WORLD | {None}),
        "S10_recap_available": 1.0 if any(c.get("category") == "recap" for c in cs) else 0.0,
    }
    return {k: round(v * pts[k], 1) for k, v in s.items()}


def check_manifest(path):
    m = json.loads(Path(path).read_text())
    cs = m["cutscenes"]
    bpm = m.get("bpm", T["bpm"])
    print(f"manifest {m['id']}: {len(cs)} cutscenes at {bpm} bpm")
    for c in cs:
        f = c.get("first_s")
        length = "until ready" if f is None else f"{f:g} s ({bars(f, bpm):.1f} bars)"
        print(f"  {c['id']:<22} {c['category']:<14} {c.get('style',''):<10} {length}")
    g = gates(cs)
    for gid, r in g.items():
        print(f"  {'PASS' if r['pass'] else 'FAIL'} {gid}" + ("" if r["pass"] else f"  <- {', '.join(r['failing'])}"))
    s = scores(cs)
    total = round(sum(s.values()), 1)
    for k, v in s.items():
        print(f"  {v:>5} {k}")
    ok = all(r["pass"] for r in g.values())
    verdict = "ships" if ok and total >= RUBRIC["ship_threshold"] else "does not ship"
    print(f"  score {total}/100, gates {'pass' if ok else 'fail'}: {verdict}")
    print("  manual:", ", ".join(x["id"] for x in RUBRIC["manual"]))
    print(json.dumps({"id": m["id"], "gates": {k: v["pass"] for k, v in g.items()}, "scores": s, "total": total, "ships": verdict == "ships"}))
    return ok


ENTRY = re.compile(r'(\w+):\s*\[|\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*"(\w+)"\s*,\s*"((?:[^"\\]|\\.)*)"')


def words(text):
    text = re.sub(r"<[^>]+>", " ", text)
    return len(re.findall(r"[\w’']+", text.replace("|", " ")))  # "ALARIC|line": the speaker name is on screen too


def check_overlays(path):
    src = Path(path).read_text()
    block = src[src.index("const CARDS"):]
    block = block[:block.index("\n};") + 3]
    style, per = None, {}
    for mt in ENTRY.finditer(block):
        if mt.group(1):
            style = mt.group(1)
            continue
        a, b, kind, text = float(mt.group(2)), float(mt.group(3)), mt.group(4), mt.group(5)
        n = words(text)
        per.setdefault(style, []).append({"t": [a, b], "kind": kind, "words": n, "wps": round(n / max(b - a, 0.01), 2)})
    report = {}
    for st, cards in per.items():
        total = sum(c["words"] for c in cards)
        peak = max(c["wps"] for c in cards)
        fast = [c for c in cards if c["wps"] > T["read_aloud_wps_max"]]
        report[st] = {"cards": len(cards), "words": total, "peak_wps": peak,
                      "mean_wps": round(sum(c["wps"] for c in cards) / len(cards), 2), "too_fast": len(fast)}
        print(f"  {st:<10} {len(cards)} cards, {total} words, mean {report[st]['mean_wps']} w/s, peak {peak} w/s"
              + (f", {len(fast)} faster than a read-aloud ({T['read_aloud_wps_max']} w/s)" if fast else ""))
    print(json.dumps(report))


def check_cut(path, bpm=T["bpm"]):
    src = Path(path).read_text()
    dur = re.search(r"const DUR\s*=\s*([\d.]+)", src)
    body = src[src.index("const CUT"):]
    body = body[:body.index("];") + 2]
    shots = [(n, float(a), float(b) if b[0].isdigit() else float(dur.group(1)) if dur else float(a))
             for n, a, b in re.findall(r'\["(\w+)",\s*([\d.]+),\s*([\w.+ ]+?)\]', body)]
    lens = []
    for n, a, b in shots:
        b = min(b, float(dur.group(1))) if dur else b
        lens.append(b - a)
        print(f"  {n:<10} {a:>5.1f}-{b:<5.1f} {b - a:4.1f} s  {bars(b - a, bpm):.1f} bars")
    print(json.dumps({"shots": len(shots), "mean_s": round(sum(lens) / len(lens), 2), "max_s": round(max(lens), 2)}))


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    if args[0] == "--overlays":
        check_overlays(args[1])
    elif args[0] == "--cut":
        check_cut(args[1])
    else:
        sys.exit(0 if all([check_manifest(p) for p in args]) else 1)
