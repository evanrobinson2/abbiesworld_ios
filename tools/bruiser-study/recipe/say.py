#!/usr/bin/env python3
"""Talk to the character card in plain words. Each request makes a new card version.

  python3 say.py "make the head 10% smaller"
  python3 say.py "bigger forearms" "arms closer to the body" "shorter legs"
  python3 say.py --list            # the words it understands

It edits character.fitted.json, keeps every version in versions/vNNN.json with the
request that made it, and prints what changed. Then rebuild:

  Blender -b -P tools/bruiser-study/recipe/build_bruiser.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CARD = os.path.join(HERE, "character.fitted.json")
VERSIONS = os.path.join(HERE, "versions")

# part words -> (section, key, kind). kind "scale" multiplies, "deg" adds degrees, "weight" adds.
PARTS = {
    r"head": [("stylise", "head", "scale")],
    r"neck": [("stylise", "neck_girth", "scale"), ("shape", "neck/measure-neck-circ-incr", "weight")],
    r"(upper ?arms?|biceps?)": [("stylise", "upper_arm_girth", "scale")],
    r"forearms?": [("stylise", "forearm_girth", "scale")],
    r"hands?": [("stylise", "hand", "scale")],
    r"(thighs?|quads?)": [("stylise", "thigh_girth", "scale")],
    r"(shins?|calf|calves)": [("stylise", "shin_girth", "scale")],
    r"legs?": [("stylise", "leg_length", "scale")],
    r"feet|foot": [("stylise", "foot", "scale")],
    r"(chest|pecs?)": [("shape", "torso/torso-muscle-pectoral-incr", "weight"), ("shape", "torso/torso-scale-depth-incr", "weight")],
    r"(shoulders?|traps?)": [("shape", "torso/measure-shoulder-dist-incr", "weight")],
    r"(back|lats?)": [("shape", "torso/torso-muscle-dorsi-incr", "weight")],
    r"(waist|belly|gut)": [("shape", "torso/measure-waist-circ-incr", "weight")],
    r"(jaw|chin)": [("shape", "chin/chin-width-incr", "weight"), ("shape", "chin/chin-prominent-incr", "weight")],
    r"(brow|eyebrows?)": [("shape", "eyebrows/eyebrows-trans-forward", "weight")],
    r"elbows?": [("pose", "elbow_bend", "deg")],
    r"arms?": [("pose", "arm_drop_from_vertical", "deg")],
}
UP = r"\b(bigger|larger|wider|thicker|longer|taller|heavier|more|beefier|bulkier|out|further out|away|bent more|deeper|heavier)\b"
DOWN = r"\b(smaller|narrower|thinner|shorter|slimmer|less|closer|in|straighter|bent less|flatter|lighter)\b"


def amount(text, kind):
    m = re.search(r"(\d+(?:\.\d+)?)\s*(%|percent|deg|degrees?)?", text)
    if kind == "deg":
        return float(m.group(1)) if m else 5.0
    if m and m.group(2) in ("%", "percent"):
        return float(m.group(1)) / 100.0
    if re.search(r"\b(a (lot|ton)|much|way)\b", text):
        return 0.25
    if re.search(r"\b(a (little|bit|touch)|slightly)\b", text):
        return 0.05
    return 0.1


def apply(card, request):
    text = request.lower()
    sign = 1 if re.search(UP, text) else -1 if re.search(DOWN, text) else 0
    if sign == 0:
        return [f"? no direction word in '{request}' (try bigger/smaller, wider/thinner, longer/shorter, closer/out)"]
    # "arms closer" means the arms hang closer to the body: less drop angle
    changes = []
    for pat, targets in PARTS.items():
        if not re.search(r"\b" + pat + r"\b", text):
            continue
        for sec, key, kind in targets:
            old = card[sec].get(key, 0.0)
            a = amount(text, kind)
            if kind == "scale":
                new = round(old * (1 + sign * a), 3)
            elif kind == "deg":
                new = round(max(old + sign * a, 0.0), 2)
            else:
                new = round(max(old + sign * a * 2, 0.0), 3)
            card[sec][key] = new
            changes.append(f"{sec}.{key}: {old} -> {new}")
        break  # first matching part wins ("forearms" before "arms")
    return changes or [f"? no body part I know in '{request}' (python3 say.py --list)"]


def main(args):
    if not args or args[0] == "--list":
        print("Parts:", ", ".join(p.strip("()").replace("?", "").replace("|", "/") for p in PARTS))
        print("Up:", UP[3:-3].replace("|", ", "))
        print("Down:", DOWN[3:-3].replace("|", ", "))
        print("Amounts: '10%', '5 degrees', 'a little' (5%), 'a lot' (25%); default 10% / 5 degrees")
        return
    with open(CARD) as f:
        card = json.load(f)
    os.makedirs(VERSIONS, exist_ok=True)
    n = len([f for f in os.listdir(VERSIONS) if f.endswith(".json")])
    if n == 0:
        with open(os.path.join(VERSIONS, "v000.json"), "w") as f:
            json.dump({"request": "fitted to Meshy", "card": card}, f, indent=2)
        n = 1
    log = []
    for req in args:
        ch = apply(card, req)
        log.append({"request": req, "changes": ch})
        for c in ch:
            print(f"{req!r}: {c}")
    with open(os.path.join(VERSIONS, f"v{n:03d}.json"), "w") as f:
        json.dump({"request": args, "changes": log, "card": card}, f, indent=2)
    with open(CARD, "w") as f:
        json.dump(card, f, indent=2)
        f.write("\n")
    print(f"saved versions/v{n:03d}.json; rebuild with build_bruiser.py")


if __name__ == "__main__":
    main(sys.argv[1:])
