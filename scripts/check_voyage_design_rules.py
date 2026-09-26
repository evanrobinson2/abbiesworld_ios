#!/usr/bin/env python3
"""Marble Voyage / Plink design-rule regression gates (no Xcode build required).

Enforces the same numeric contract as MarbleVoyageDesignRules.swift:
  1. Screen real estate — 4:3 plates fill iPad landscape width
  2. Transparent UI — power icons keep real alpha (no opaque card stock)
  3. Readable battle feed — min panel width + font sizes in PlinkBattleHostView
  4. Climb intro — boss first, ~4s pan, player centered
  5. VS portraits — fox/enemy figurines resolve on disk
  6. No-clip plates — delegates to check_voyage_plate_aspects.py

Exit non-zero on any failure. Prefer:
  ./scripts/preflight_marble_voyage.sh
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow required: pip install pillow", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "abbies.world.ios" / "abbies.world.ios"
ASSETS = APP / "Assets.xcassets"
PLINK = APP / "Views" / "World2" / "Plink"
DESIGN_SWIFT = (
    APP / "Models" / "World2" / "PeglinEdition" / "MarbleVoyageDesignRules.swift"
)
HOST = PLINK / "MarbleVoyageHostView.swift"
BATTLE = PLINK / "PlinkBattleHostView.swift"
CLIMB_MAP = APP / "Models" / "World2" / "PeglinEdition" / "MarbleVoyageClimbMap.swift"
CHAR_ART = APP / "Models" / "World2" / "PeglinEdition" / "PeglinCharacterArt.swift"

# --- Thresholds (keep in sync with MarbleVoyageDesignRules.swift) ---
MIN_PLATE_WIDTH_FILL = 0.85
REF_VIEWPORTS = [(1180, 820), (1194, 834), (1366, 1024)]
CLIMB_MIN_W_FRAC = 0.70
CLIMB_MAX_W_FRAC = 0.92
CLIMB_REF = (1180, 700)
CLIMB_TARGET_W_FRAC = 0.88
CLIMB_HARD_CAP_W_FRAC = 0.92
CLIMB_MIN_SCROLL_SCREENS = 2.6
POWER_ICONS = [
    "world2_plink_power_icon_refresh",
    "world2_plink_power_icon_fire",
    "world2_plink_power_icon_split",
]
MAX_CORNER_ALPHA = 16
MIN_TRANSPARENT_FRAC = 0.12
FEED_MIN_WIDTH = 160
FEED_MIN_BODY = 12
FEED_MIN_META = 11
FEED_MIN_CHIP = 14
CLIMB_PAN_SEC = 4.0
CLIMB_SETTLE_SEC = 3.7
VS_FIGURINES = [
    "world2_peglin_bramble_figurine",
    "world2_peglin_fox_figurine",
    "world2_peglin_stag_figurine",
]


def fail(failures: list[str], msg: str) -> None:
    failures.append(msg)


def fit_size(bw: float, bh: float, aspect: float = 4.0 / 3.0) -> tuple[float, float]:
    if bw <= 1 or bh <= 1:
        return bw, bh
    bound = bw / bh
    if bound > aspect:
        return bh * aspect, bh
    return bw, bw / aspect


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def check_swift_contract(failures: list[str]) -> None:
    if not DESIGN_SWIFT.is_file():
        fail(failures, f"missing design contract: {DESIGN_SWIFT}")
        return
    text = read(DESIGN_SWIFT)
    expected = {
        "minPlateWidthFillFraction": str(MIN_PLATE_WIDTH_FILL),
        "battleFeedMinWidth": str(FEED_MIN_WIDTH),
        "battleFeedMinBodyFont": str(FEED_MIN_BODY),
        "battleFeedMinMetaFont": str(FEED_MIN_META),
        "battleFeedMinChipValueFont": str(FEED_MIN_CHIP),
        "climbIntroPanSeconds": str(CLIMB_PAN_SEC),
        "climbIntroSettleSeconds": str(CLIMB_SETTLE_SEC),
        "climbIntroPlayerScrollAnchorY": "0.5",
        "minTransparentPixelFraction": str(MIN_TRANSPARENT_FRAC),
        "climbChartMinWidthFraction": f"{CLIMB_MIN_W_FRAC:.2f}",
        "climbChartMaxWidthFraction": f"{CLIMB_MAX_W_FRAC:.2f}",
    }
    for key, value in expected.items():
        # Match `static let key: … = value` (CGFloat / TimeInterval / UInt8)
        pat = rf"static let {key}[^=]*=\s*{re.escape(value)}\b"
        if not re.search(pat, text):
            fail(
                failures,
                f"MarbleVoyageDesignRules.{key} must be {value} "
                f"(script/Swift contract drift)",
            )


def check_screen_real_estate(failures: list[str]) -> None:
    for w, h in REF_VIEWPORTS:
        fw, _fh = fit_size(w, h)
        fill = fw / w
        if fill + 1e-9 < MIN_PLATE_WIDTH_FILL:
            fail(
                failures,
                f"plate width fill {fill:.3f} < {MIN_PLATE_WIDTH_FILL} "
                f"on {w}x{h} (huge pillarbox)",
            )

    # Climb chart width band (mirrors MarbleVoyageClimbMap.contentSize intent)
    if not CLIMB_MAP.is_file():
        fail(failures, f"missing {CLIMB_MAP.name}")
        return
    climb_src = read(CLIMB_MAP)
    if "targetWidthFraction" not in climb_src and f"{CLIMB_TARGET_W_FRAC}" not in climb_src:
        fail(
            failures,
            "ClimbMap must target ~88% viewport width (no skinny 0.58 column)",
        )
    if "0.58" in climb_src:
        fail(
            failures,
            "ClimbMap still caps at 0.58 width — causes huge side pillarboxing",
        )

    # Compute expected content width using same formula as Swift (approx from image).
    climb_folder = ASSETS / "world2_map_marbleVoyage_climb.imageset"
    imgs = [
        p
        for p in climb_folder.iterdir()
        if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    ] if climb_folder.is_dir() else []
    if not imgs:
        fail(failures, "climb poster imageset missing")
        return
    with Image.open(imgs[0]) as im:
        cw, ch = im.size
    aspect = cw / ch if ch else 344 / 1024
    aspect_h_over_w = 1 / aspect if aspect else 1024 / 344
    vw, vh = CLIMB_REF
    width = min(vw * CLIMB_TARGET_W_FRAC, vw * CLIMB_HARD_CAP_W_FRAC)
    height = width * aspect_h_over_w
    min_height = max(vh * CLIMB_MIN_SCROLL_SCREENS, 1600)
    if height < min_height:
        height = min_height
        width = height * aspect
        cap = vw * CLIMB_HARD_CAP_W_FRAC
        if width > cap:
            width = cap
            height = width * aspect_h_over_w
    frac = width / vw
    if frac < CLIMB_MIN_W_FRAC or frac > CLIMB_MAX_W_FRAC:
        fail(
            failures,
            f"climb chart width fraction {frac:.3f} outside "
            f"[{CLIMB_MIN_W_FRAC}, {CLIMB_MAX_W_FRAC}] on {vw}x{vh}",
        )


def check_transparent_icons(failures: list[str]) -> None:
    for name in POWER_ICONS:
        folder = ASSETS / f"{name}.imageset"
        if not folder.is_dir():
            fail(failures, f"{name}: imageset missing")
            continue
        imgs = [
            p
            for p in folder.iterdir()
            if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
        ]
        if not imgs:
            fail(failures, f"{name}: no image file")
            continue
        for path in imgs:
            with Image.open(path) as im:
                rgba = im.convert("RGBA")
                w, h = rgba.size
                pixels = list(rgba.getdata())
            if not pixels:
                fail(failures, f"{path.name}: empty")
                continue
            corners = [
                pixels[0][3],
                pixels[w - 1][3],
                pixels[(h - 1) * w][3],
                pixels[h * w - 1][3],
            ]
            if any(a > MAX_CORNER_ALPHA for a in corners):
                fail(
                    failures,
                    f"{path.name}: opaque corners {corners} "
                    f"(need alpha ≤ {MAX_CORNER_ALPHA} — no card-stock background)",
                )
            transparent = sum(1 for p in pixels if p[3] < 16) / len(pixels)
            if transparent < MIN_TRANSPARENT_FRAC:
                fail(
                    failures,
                    f"{path.name}: transparent fraction {transparent:.1%} "
                    f"< {MIN_TRANSPARENT_FRAC:.0%}",
                )


def check_battle_feed(failures: list[str]) -> None:
    if not BATTLE.is_file():
        fail(failures, f"missing {BATTLE}")
        return
    text = read(BATTLE)
    # Width must reference design contract (not a magic skinny number).
    if "MarbleVoyageDesignRules.battleFeedMinWidth" not in text:
        fail(failures, "battle feed must use MarbleVoyageDesignRules.battleFeedMinWidth")
    # Guard against regressing to a hard-coded skinny panel.
    skinny = re.search(r"battleFeedPane\s*\n\s*\.frame\(width:\s*(\d+)", text)
    if skinny and int(skinny.group(1)) < FEED_MIN_WIDTH:
        fail(
            failures,
            f"battleFeedPane width {skinny.group(1)} < {FEED_MIN_WIDTH}",
        )
    for token in (
        "battleFeedMinBodyFont",
        "battleFeedMinMetaFont",
        "battleFeedMinChipValueFont",
    ):
        if f"MarbleVoyageDesignRules.{token}" not in text:
            fail(failures, f"battle feed must use MarbleVoyageDesignRules.{token}")

    # No sub-minimum hard-coded feed fonts in the feed pane helpers.
    if "battleFeedPane" in text:
        start = text.index("battleFeedPane")
        end = text.find("\n    private func flyingDamageChip", start)
        if end < 0:
            end = text.find("\n    private func fighterBanner", start)
        if end < 0:
            end = min(len(text), start + 4500)
        feed_region = text[start:end]
        for m in re.finditer(
            r"\.font\(\.system\(size:\s*(\d+(?:\.\d+)?)", feed_region
        ):
            size = float(m.group(1))
            if size + 1e-9 < FEED_MIN_META:
                fail(
                    failures,
                    f"battle feed font size {size} < min meta {FEED_MIN_META}",
                )


def check_climb_intro(failures: list[str]) -> None:
    if not HOST.is_file():
        fail(failures, f"missing {HOST}")
        return
    text = read(HOST)
    if "playClimbIntro" not in text:
        fail(failures, "playClimbIntro missing from MarbleVoyageHostView")
        return
    # Extract function body roughly.
    start = text.index("private func playClimbIntro")
    body = text[start : start + 2800]
    if ".boss" not in body and "bossID" not in body:
        fail(failures, "climb intro must start at boss / summit")
    if "MarbleVoyageDesignRules.climbIntroPanSeconds" not in body:
        fail(failures, "climb intro must use MarbleVoyageDesignRules.climbIntroPanSeconds")
    if "MarbleVoyageDesignRules.climbIntroSettleSeconds" not in body:
        fail(failures, "climb intro must use MarbleVoyageDesignRules.climbIntroSettleSeconds")
    if "climbIntroPlayerScrollAnchorY" not in body and "anchorY" not in body and "0.5" not in body:
        fail(failures, "climb intro must end with player centered")
    if "climbCameraOffset" not in text and "scrollTo" not in body:
        fail(
            failures,
            "climb intro must drive camera (climbCameraOffset) or scrollTo — "
            "proxy-only timing is unreliable",
        )
    # Contract file must keep ~4s pan.
    design = read(DESIGN_SWIFT) if DESIGN_SWIFT.is_file() else ""
    if not re.search(rf"climbIntroPanSeconds[^=]*=\s*{CLIMB_PAN_SEC}\b", design):
        fail(failures, f"climbIntroPanSeconds must be {CLIMB_PAN_SEC}")


def check_versus_portraits(failures: list[str]) -> None:
    for name in VS_FIGURINES:
        folder = ASSETS / f"{name}.imageset"
        if not folder.is_dir():
            fail(failures, f"VS figurine missing: {name}")
            continue
        imgs = [
            p
            for p in folder.iterdir()
            if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
        ]
        if not imgs:
            fail(failures, f"{name}: no image file")
            continue
        # Must be loadable and non-trivial.
        with Image.open(imgs[0]) as im:
            w, h = im.size
        if w < 64 or h < 64:
            fail(failures, f"{name}: too small {w}x{h}")

    # Versus view must use PeglinEnemyFigurine (resolves figurine catalog).
    versus = PLINK / "PlinkBattleVersusIntroView.swift"
    if versus.is_file():
        vtext = read(versus)
        if "PeglinEnemyFigurine" not in vtext:
            fail(failures, "VS screen must render PeglinEnemyFigurine for enemies")
    else:
        fail(failures, "PlinkBattleVersusIntroView.swift missing")

    if CHAR_ART.is_file():
        art = read(CHAR_ART)
        for catalog in VS_FIGURINES:
            if catalog not in art:
                fail(failures, f"PeglinCharacterArt missing figurine mapping {catalog}")


def check_no_clip_plates(failures: list[str]) -> None:
    script = ROOT / "scripts" / "check_voyage_plate_aspects.py"
    if not script.is_file():
        fail(failures, "check_voyage_plate_aspects.py missing")
        return
    proc = subprocess.run(
        [sys.executable, str(script)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        detail = (proc.stdout or proc.stderr or "").strip()
        fail(failures, f"no-clip plate check failed:\n{detail}")


def main() -> int:
    failures: list[str] = []
    check_swift_contract(failures)
    check_screen_real_estate(failures)
    check_transparent_icons(failures)
    check_battle_feed(failures)
    check_climb_intro(failures)
    check_versus_portraits(failures)
    check_no_clip_plates(failures)

    if failures:
        print("VOYAGE DESIGN RULES FAILED:")
        for line in failures:
            for i, part in enumerate(line.splitlines() or [line]):
                prefix = "  • " if i == 0 else "    "
                print(f"{prefix}{part}")
        print(
            "\nFix layout/art or update MarbleVoyageDesignRules.swift + this script "
            "together. Re-run: ./scripts/preflight_marble_voyage.sh"
        )
        return 1

    print(
        "OK — voyage design rules:\n"
        f"  • plate width fill ≥ {MIN_PLATE_WIDTH_FILL} on iPad landscape refs\n"
        f"  • {len(POWER_ICONS)} power icons have transparent corners\n"
        f"  • battle feed ≥ {FEED_MIN_WIDTH}pt / fonts ≥ {FEED_MIN_META}pt\n"
        f"  • climb intro pan {CLIMB_PAN_SEC}s, player centered\n"
        f"  • {len(VS_FIGURINES)} VS figurines present\n"
        "  • no-clip 4:3 plate aspects + no scaledToFill"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
