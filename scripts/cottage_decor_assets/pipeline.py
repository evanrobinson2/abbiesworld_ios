#!/usr/bin/env python3
"""Cottage decor DAG: Midjourney sheets → carved sprites → OpenAI metadata → catalog.

Required nodes (HANDOFF):
  verify_sources → openai_multimodal_inventory → carve_transparent_sprites →
  openai_multimodal_cutout_review → deep_metadata_stamp → ingest_registry_and_catalog →
  bind_all_cottage_scenes → runtime_verify_every_scene
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import shutil
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Fan-out width for OpenAI multimodal calls (inventory + cutout review).
OPENAI_WORKERS = max(1, int(os.environ.get("COTTAGE_DECOR_OPENAI_WORKERS", "8")))

REPO_ROOT = Path(__file__).resolve().parents[2]
PACK_ROOT = REPO_ROOT / "AssetSources" / "World2" / "cottage-decor-2026-09-27"
KIT_ROOT = REPO_ROOT / "AssetSources" / "World2" / "CottageDecorKit"
SOURCE_ROOT = KIT_ROOT / "sources"
EXTRACTED_ROOT = KIT_ROOT / "extracted"
EVIDENCE_ROOT = KIT_ROOT / "evidence"
OPENAI_ROOT = KIT_ROOT / "openai"
REVIEW_ROOT = KIT_ROOT / "review"
MANIFEST_PATH = KIT_ROOT / "manifest.json"
DAG_PATH = EVIDENCE_ROOT / "dag-run.json"
CATALOG_ROOT = REPO_ROOT / "abbies.world.ios" / "abbies.world.ios" / "Assets.xcassets"
DATASET_ROOT = CATALOG_ROOT / "cottage_decor_asset_manifest.dataset"
RUNTIME_MANIFEST_PATH = DATASET_ROOT / "cottage_decor_asset_manifest.json"

EDGE_THRESHOLD = 18.0
MIN_COMPONENT_AREA = 400
SOURCE_PADDING = 14
OUTPUT_PADDING = 12
ROW_BAND = 100

SHEETS = (
    {
        "packId": "pack.abbieCottage.lamps",
        "filename": "lamps-approved.jpeg",
        "sourceName": "lamps-approved.jpeg",
        "expectedCount": 6,
        "layout": "components",  # connected components on white
        "categoryDefault": "lighting",
        "placementLayer": "floor",
    },
    {
        "packId": "pack.abbieCottage.rugscushions",
        "filename": "rugs-cushions-approved.jpeg",
        "sourceName": "rugs-cushions-approved.jpeg",
        "expectedCount": 9,
        "layout": "components",
        "categoryDefault": "rugs",
        "placementLayer": "floor",
    },
    {
        "packId": "pack.abbieCottage.toys",
        "filename": "toys-approved.jpeg",
        "sourceName": "toys-approved.jpeg",
        "expectedCount": 6,
        # Sheet is not a clean 2x3: train rides the horizontal midline and the
        # castle spans bottom-left + bottom-center. Explicit ROIs (normalized).
        "layout": "rois",
        "rois": [
            # left, top, right, bottom — fractions of sheet size
            [0.02, 0.02, 0.40, 0.42],  # puppet theater
            [0.38, 0.04, 0.66, 0.40],  # closed walnut wardrobe
            [0.58, 0.00, 1.00, 0.52],  # rocking unicorn (full horn + rockers)
            [0.02, 0.38, 0.72, 0.68],  # woodland train (mid band)
            [0.02, 0.62, 0.65, 0.98],  # toy castle (bottom span; exclude chest)
            [0.64, 0.52, 0.99, 0.98],  # dress-up chest
        ],
        "categoryDefault": "play-stages",
        "placementLayer": "floor",
    },
)

COTTAGE_SCENES = [
    "poi.abbieTreehouse.interior",
    "poi.abbieTreehouse.interior.cozyNook",
    "poi.abbieTreehouse.interior.rooftopLookout",
    "poi.abbieTreehouse.interior.fitnessCenter",
    "poi.abbieTreehouse.interior.bedroom",
    "poi.abbieTreehouse.interior.playroom",
]


class PipelineError(RuntimeError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def load_dotenv() -> None:
    for path in (
        REPO_ROOT / "CreatureCreator" / "server" / ".env.local",
        REPO_ROOT / ".env",
    ):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            raw = line.strip()
            if not raw or raw.startswith("#") or "=" not in raw:
                continue
            key, value = raw.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'").strip('"')
            if key and key not in os.environ:
                os.environ[key] = value


def openai_client():
    load_dotenv()
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise PipelineError("OPENAI_API_KEY missing (CreatureCreator/server/.env.local)")
    from openai import OpenAI

    return OpenAI(api_key=key)


def resolve_model() -> str:
    return (
        os.environ.get("COTTAGE_DECOR_EVAL_MODEL", "").strip()
        or os.environ.get("WORLD2_ASSET_EVAL_MODEL", "").strip()
        or "gpt-5.6"
    )


def image_data_url(path: Path, max_w: int = 1400, *, checkerboard: bool = False) -> str:
    """Encode an image for multimodal review.

    JPEG flattens alpha. For cutouts, composite onto a loud checkerboard so the
    model can judge residual background without mistaking a flattened plate for
    an opaque canvas.
    """
    with Image.open(path) as im:
        if checkerboard and (
            im.mode in ("RGBA", "LA") or "transparency" in im.info
        ):
            rgba = im.convert("RGBA")
            if rgba.width > max_w:
                ratio = max_w / float(rgba.width)
                rgba = rgba.resize(
                    (max_w, max(1, int(rgba.height * ratio))), Image.Resampling.LANCZOS
                )
            cell = 16
            w, h = rgba.size
            board = Image.new("RGB", (w, h))
            px = board.load()
            for y in range(h):
                for x in range(w):
                    light = ((x // cell) + (y // cell)) % 2 == 0
                    px[x, y] = (210, 210, 215) if light else (70, 70, 80)
            board.paste(rgba, mask=rgba.split()[-1])
            import io

            buf = io.BytesIO()
            board.save(buf, format="JPEG", quality=90, optimize=True)
            encoded = base64.b64encode(buf.getvalue()).decode("ascii")
            return f"data:image/jpeg;base64,{encoded}"

        rgb = im.convert("RGB")
        if rgb.width > max_w:
            ratio = max_w / float(rgb.width)
            rgb = rgb.resize(
                (max_w, max(1, int(rgb.height * ratio))), Image.Resampling.LANCZOS
            )
        import io

        buf = io.BytesIO()
        rgb.save(buf, format="JPEG", quality=88, optimize=True)
        encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def chat_json(
    client: Any,
    model: str,
    system: str,
    user_text: str,
    image_path: Path,
    *,
    checkerboard: bool = False,
) -> dict[str, Any]:
    started = time.time()
    # gpt-5.x rejects custom temperature; omit so the API uses its default.
    kwargs: dict[str, Any] = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_data_url(
                                image_path, checkerboard=checkerboard
                            )
                        },
                    },
                ],
            },
        ],
    }
    if not model.startswith("gpt-5"):
        kwargs["temperature"] = 0.2
    response = client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise PipelineError(f"OpenAI returned non-JSON: {exc}") from exc
    return {
        "model": getattr(response, "model", model) or model,
        "responseId": getattr(response, "id", None),
        "latencyMs": int((time.time() - started) * 1000),
        "timestamp": utc_now(),
        "rawText": content,
        "parsed": parsed,
    }


@dataclass
class Component:
    label: int
    x: int
    y: int
    width: int
    height: int
    area: int

    @property
    def bounds(self) -> list[int]:
        return [self.x, self.y, self.x + self.width, self.y + self.height]


@dataclass
class Segmentation:
    background_bgr: np.ndarray
    distance: np.ndarray
    labels: np.ndarray
    components: list[Component]


def segment_sheet(image: np.ndarray) -> Segmentation:
    border = np.concatenate(
        [
            image[:30].reshape(-1, 3),
            image[-30:].reshape(-1, 3),
            image[:, :30].reshape(-1, 3),
            image[:, -30:].reshape(-1, 3),
        ]
    )
    background = np.median(border, axis=0).astype(np.float32)
    distance = np.linalg.norm(image.astype(np.float32) - background, axis=2)
    hard_mask = np.where(distance > EDGE_THRESHOLD, 255, 0).astype(np.uint8)
    hard_mask = cv2.morphologyEx(
        hard_mask, cv2.MORPH_CLOSE, np.ones((5, 5), dtype=np.uint8), iterations=2
    )
    count, labels, stats, _ = cv2.connectedComponentsWithStats(hard_mask)
    components = [
        Component(
            label=label,
            x=int(stats[label, cv2.CC_STAT_LEFT]),
            y=int(stats[label, cv2.CC_STAT_TOP]),
            width=int(stats[label, cv2.CC_STAT_WIDTH]),
            height=int(stats[label, cv2.CC_STAT_HEIGHT]),
            area=int(stats[label, cv2.CC_STAT_AREA]),
        )
        for label in range(1, count)
        if int(stats[label, cv2.CC_STAT_AREA]) > MIN_COMPONENT_AREA
    ]
    components.sort(key=lambda item: (item.y // ROW_BAND, item.x))
    return Segmentation(background, distance, labels, components)


def smoothstep(value: np.ndarray, lower: float, upper: float) -> np.ndarray:
    normalized = np.clip((value - lower) / (upper - lower), 0.0, 1.0)
    return normalized * normalized * (3.0 - 2.0 * normalized)


def extract_component(
    image: np.ndarray, segmentation: Segmentation, component: Component
) -> tuple[np.ndarray, list[int]]:
    height, width = image.shape[:2]
    left = max(0, component.x - SOURCE_PADDING)
    top = max(0, component.y - SOURCE_PADDING)
    right = min(width, component.x + component.width + SOURCE_PADDING)
    bottom = min(height, component.y + component.height + SOURCE_PADDING)

    roi = image[top:bottom, left:right]
    roi_distance = segmentation.distance[top:bottom, left:right]
    roi_labels = segmentation.labels[top:bottom, left:right]
    target = roi_labels == component.label
    if not np.any(target):
        raise PipelineError(f"Component {component.label} vanished")

    grab_mask = np.full(target.shape, cv2.GC_PR_BGD, dtype=np.uint8)
    other = (roi_labels != 0) & ~target
    grab_mask[other] = cv2.GC_BGD
    target_core = cv2.erode(
        target.astype(np.uint8), np.ones((3, 3), dtype=np.uint8), iterations=1
    ).astype(bool)
    grab_mask[target] = cv2.GC_PR_FGD
    grab_mask[target_core] = cv2.GC_FGD
    grab_mask[:2, :] = cv2.GC_BGD
    grab_mask[-2:, :] = cv2.GC_BGD
    grab_mask[:, :2] = cv2.GC_BGD
    grab_mask[:, -2:] = cv2.GC_BGD

    cv2.setRNGSeed(0)
    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(roi, grab_mask, None, bg_model, fg_model, 4, cv2.GC_INIT_WITH_MASK)
    selected = (grab_mask == cv2.GC_FGD) | (grab_mask == cv2.GC_PR_FGD)

    alpha = (smoothstep(roi_distance, 6.0, 30.0) * 255.0).astype(np.uint8)
    alpha = np.where(selected, alpha, 0).astype(np.uint8)
    alpha = np.maximum(alpha, np.where(target, 235, 0).astype(np.uint8))
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0.65)
    alpha = np.where(selected | target, alpha, 0).astype(np.uint8)

    # Drop soft ground-shadow islands outside the main silhouette.
    count, island_labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 2).astype(np.uint8))
    if count > 1:
        main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        alpha = np.where(island_labels == main, alpha, 0).astype(np.uint8)

    visible_y, visible_x = np.where(alpha > 2)
    if visible_x.size == 0:
        raise PipelineError("Empty matte")
    crop_left = max(0, int(visible_x.min()) - OUTPUT_PADDING)
    crop_top = max(0, int(visible_y.min()) - OUTPUT_PADDING)
    crop_right = min(alpha.shape[1], int(visible_x.max()) + 1 + OUTPUT_PADDING)
    crop_bottom = min(alpha.shape[0], int(visible_y.max()) + 1 + OUTPUT_PADDING)

    rgba = cv2.cvtColor(roi, cv2.COLOR_BGR2RGBA)
    alpha_float = alpha.astype(np.float32) / 255.0
    background_rgb = segmentation.background_bgr[::-1]
    rgb = rgba[:, :, :3].astype(np.float32)
    safe_alpha = np.maximum(alpha_float[:, :, None], 0.08)
    unblended = (rgb - (1.0 - safe_alpha) * background_rgb) / safe_alpha
    rgba[:, :, :3] = np.clip(unblended, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = alpha

    # Kill residual near-white sheet pixels that survived GrabCut (opaque halos).
    rgb_out = rgba[:, :, :3].astype(np.float32)
    min_ch = rgb_out.min(axis=2)
    chroma = rgb_out.max(axis=2) - min_ch
    sheet_residue = (min_ch > 228) & (chroma < 28) & (rgba[:, :, 3] > 0)
    soft_residue = (min_ch > 210) & (chroma < 18) & (rgba[:, :, 3] < 180)
    rgba[sheet_residue | soft_residue, 3] = 0

    # Re-crop after residue kill; keep largest opaque island only.
    count, island_labels, stats, _ = cv2.connectedComponentsWithStats(
        (rgba[:, :, 3] > 8).astype(np.uint8)
    )
    if count > 1:
        main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        rgba[island_labels != main, 3] = 0
    visible_y, visible_x = np.where(rgba[:, :, 3] > 8)
    if visible_x.size == 0:
        raise PipelineError("Empty matte after residue kill")
    crop_left = max(0, int(visible_x.min()) - OUTPUT_PADDING)
    crop_top = max(0, int(visible_y.min()) - OUTPUT_PADDING)
    crop_right = min(rgba.shape[1], int(visible_x.max()) + 1 + OUTPUT_PADDING)
    crop_bottom = min(rgba.shape[0], int(visible_y.max()) + 1 + OUTPUT_PADDING)
    rgba = rgba[crop_top:crop_bottom, crop_left:crop_right]
    # Force fully transparent border ring so tray/scene never show a plate edge.
    if rgba.shape[0] > 4 and rgba.shape[1] > 4:
        rgba[:1, :, 3] = 0
        rgba[-1:, :, 3] = 0
        rgba[:, :1, 3] = 0
        rgba[:, -1:, 3] = 0
    source_bounds = [
        left + crop_left,
        top + crop_top,
        left + crop_right,
        top + crop_bottom,
    ]
    return rgba, source_bounds


def strip_contact_shadow(rgba: np.ndarray) -> np.ndarray:
    """Remove soft gray cast-shadow under a carved prop without eating painted bases."""
    alpha = rgba[:, :, 3]
    if not np.any(alpha > 8):
        return rgba
    hsv = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2HSV)
    height = alpha.shape[0]
    ys, _ = np.where(alpha > 8)
    y_bot = int(ys.max())
    obj_h = int(ys.max() - ys.min() + 1)
    band_top = max(0, y_bot - max(14, int(0.22 * obj_h)))
    band = np.zeros_like(alpha, dtype=bool)
    band[band_top:, :] = True
    core = cv2.erode((alpha > 210).astype(np.uint8), np.ones((5, 5), np.uint8), 1)
    grayish = (hsv[:, :, 1] < 58) & (hsv[:, :, 2] > 85) & (hsv[:, :, 2] < 235)
    soft = (alpha > 0) & (alpha < 190)
    cool = (
        rgba[:, :, 2].astype(np.int16) + rgba[:, :, 1].astype(np.int16)
    ) / 2 - rgba[:, :, 0].astype(np.int16) > 4
    kill = band & (grayish | (soft & cool)) & (core == 0)
    out = rgba.copy()
    out[kill, 3] = 0
    # Peel soft gray fringe that still touches transparency near the base.
    # Protect saturated painted parts (teal rockers, blue metal, grass).
    for _ in range(4):
        alpha = out[:, :, 3]
        hsv = cv2.cvtColor(out[:, :, :3], cv2.COLOR_RGB2HSV)
        soft = (alpha > 0) & (alpha < 200) & (hsv[:, :, 1] < 45) & (hsv[:, :, 2] > 110)
        near_clear = (
            cv2.dilate((alpha <= 8).astype(np.uint8), np.ones((5, 5), np.uint8), 2) > 0
        )
        peel = soft & near_clear & (np.arange(height)[:, None] > int(height * 0.60))
        if not np.any(peel):
            break
        out[peel, 3] = 0
    # Drop tiny leftover islands.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(
        (out[:, :, 3] > 8).astype(np.uint8)
    )
    if count > 1:
        main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        out[labels != main, 3] = 0
    return out


def extract_roi(
    image: np.ndarray, cell: tuple[int, int, int, int]
) -> tuple[np.ndarray, list[int]]:
    """Carve the dominant object inside an explicit ROI with shadow suppression."""
    height, width = image.shape[:2]
    left, top, right, bottom = cell
    left = max(0, left)
    top = max(0, top)
    right = min(width, right)
    bottom = min(height, bottom)
    roi = image[top:bottom, left:right]
    if roi.size == 0:
        raise PipelineError(f"Empty ROI {cell}")

    border = np.concatenate(
        [
            image[:20].reshape(-1, 3),
            image[-20:].reshape(-1, 3),
            image[:, :20].reshape(-1, 3),
            image[:, -20:].reshape(-1, 3),
        ]
    )
    background = np.median(border, axis=0).astype(np.float32)
    distance = np.linalg.norm(roi.astype(np.float32) - background, axis=2)
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]
    shadow = (sat < 45) & (val > 140) & (val < 252) & (distance < 55)
    fg = ((distance > 16) & ~shadow).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(fg)
    if count <= 1:
        raise PipelineError(f"No foreground in ROI {cell}")
    main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    mask = (labels == main).astype(np.uint8)

    grab_mask = np.full(mask.shape, cv2.GC_BGD, dtype=np.uint8)
    grab_mask[mask == 1] = cv2.GC_PR_FGD
    core = cv2.erode(mask, np.ones((5, 5), np.uint8), iterations=2)
    grab_mask[core == 1] = cv2.GC_FGD
    grab_mask[shadow] = cv2.GC_BGD
    grab_mask[:2, :] = cv2.GC_BGD
    grab_mask[-2:, :] = cv2.GC_BGD
    grab_mask[:, :2] = cv2.GC_BGD
    grab_mask[:, -2:] = cv2.GC_BGD

    cv2.setRNGSeed(0)
    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(roi, grab_mask, None, bg_model, fg_model, 5, cv2.GC_INIT_WITH_MASK)
    selected = ((grab_mask == cv2.GC_FGD) | (grab_mask == cv2.GC_PR_FGD)) & ~shadow

    alpha = (selected.astype(np.uint8) * 255)
    alpha = np.maximum(alpha, np.where(mask == 1, 220, 0).astype(np.uint8))
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0.55)
    alpha = np.where(selected | (mask == 1), alpha, 0).astype(np.uint8)
    alpha[shadow] = 0

    count, island_labels, stats, _ = cv2.connectedComponentsWithStats(
        (alpha > 8).astype(np.uint8)
    )
    if count <= 1:
        raise PipelineError(f"Empty matte in ROI {cell}")
    main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    alpha = np.where(island_labels == main, alpha, 0).astype(np.uint8)

    rgba = cv2.cvtColor(roi, cv2.COLOR_BGR2RGBA)
    alpha_float = np.maximum(alpha.astype(np.float32) / 255.0, 0.08)
    rgb = rgba[:, :, :3].astype(np.float32)
    background_rgb = background[::-1]
    unblended = (rgb - (1.0 - alpha_float[:, :, None]) * background_rgb) / alpha_float[
        :, :, None
    ]
    rgba[:, :, :3] = np.clip(unblended, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = alpha

    rgb_out = rgba[:, :, :3].astype(np.float32)
    min_ch = rgb_out.min(axis=2)
    chroma = rgb_out.max(axis=2) - min_ch
    sheet_residue = (min_ch > 228) & (chroma < 28) & (rgba[:, :, 3] > 0)
    soft_residue = (min_ch > 210) & (chroma < 18) & (rgba[:, :, 3] < 180)
    rgba[sheet_residue | soft_residue, 3] = 0
    # Soft ground-shadow remnants from the Midjourney toys sheet (blue-gray).
    hsv_r = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2HSV)
    pale = (hsv_r[:, :, 1] < 55) & (rgba[:, :, 3] > 0) & (hsv_r[:, :, 2] > 130) & (
        hsv_r[:, :, 2] < 245
    )
    blue_bias = (
        (rgba[:, :, 2].astype(np.int16) - rgba[:, :, 0].astype(np.int16) > 8)
        & (hsv_r[:, :, 1] < 70)
        & (rgba[:, :, 3] > 0)
    )
    # Only strip shadow-like pixels that are not part of a dense object core.
    core = cv2.erode((rgba[:, :, 3] > 200).astype(np.uint8), np.ones((7, 7), np.uint8), 2)
    rgba[(pale | blue_bias) & (core == 0), 3] = 0
    rgba = strip_contact_shadow(rgba)

    visible_y, visible_x = np.where(rgba[:, :, 3] > 8)
    if visible_x.size == 0:
        raise PipelineError(f"Empty matte after cleanup in ROI {cell}")
    crop_left = max(0, int(visible_x.min()) - OUTPUT_PADDING)
    crop_top = max(0, int(visible_y.min()) - OUTPUT_PADDING)
    crop_right = min(rgba.shape[1], int(visible_x.max()) + 1 + OUTPUT_PADDING)
    crop_bottom = min(rgba.shape[0], int(visible_y.max()) + 1 + OUTPUT_PADDING)
    rgba = rgba[crop_top:crop_bottom, crop_left:crop_right]
    # Ensure clear transparent padding so reviewers don't read edge contact as clips.
    pad = max(OUTPUT_PADDING, 10)
    padded = np.zeros((rgba.shape[0] + 2 * pad, rgba.shape[1] + 2 * pad, 4), np.uint8)
    padded[pad : pad + rgba.shape[0], pad : pad + rgba.shape[1]] = rgba
    rgba = padded
    source_bounds = [
        left + crop_left,
        top + crop_top,
        left + crop_right,
        top + crop_bottom,
    ]
    return rgba, source_bounds


def save_png(path: Path, rgba: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    ok, encoded = cv2.imencode(
        ".png", cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA), [cv2.IMWRITE_PNG_COMPRESSION, 9]
    )
    if not ok:
        raise PipelineError(f"PNG encode failed: {path}")
    path.write_bytes(encoded.tobytes())


def slugify(text: str) -> str:
    out = []
    for ch in text.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in " -_/":
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")[:48] or "item"


def verify_sources(ctx: dict[str, Any]) -> dict[str, Any]:
    provenance = json.loads((PACK_ROOT / "provenance.json").read_text())
    by_name = {a["filename"]: a for a in provenance["assets"]}
    records = []
    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    for sheet in SHEETS:
        src = PACK_ROOT / sheet["filename"]
        if not src.is_file():
            raise PipelineError(f"Missing sheet: {src}")
        digest = sha256_file(src)
        expected = by_name[sheet["filename"]]["sha256"]
        if digest != expected:
            raise PipelineError(
                f"SHA mismatch for {sheet['filename']}: {digest} != {expected}"
            )
        dest = SOURCE_ROOT / sheet["sourceName"]
        if not dest.exists() or dest.read_bytes() != src.read_bytes():
            shutil.copy2(src, dest)
        with Image.open(src) as im:
            records.append(
                {
                    "packId": sheet["packId"],
                    "filename": sheet["filename"],
                    "sha256": digest,
                    "width": im.width,
                    "height": im.height,
                    "promptFile": by_name[sheet["filename"]].get("promptFile"),
                    "jobId": by_name[sheet["filename"]].get("jobId"),
                    "candidateIndex": by_name[sheet["filename"]].get("candidateIndex"),
                    "prompt": by_name[sheet["filename"]].get("prompt"),
                    "originalCreativeBrief": by_name[sheet["filename"]].get(
                        "originalCreativeBrief"
                    ),
                }
            )
    ctx["sources"] = records
    return {"sources": records}


def _inventory_one_sheet(
    sheet: dict[str, Any], source: dict[str, Any], model: str
) -> dict[str, Any]:
    """One sheet inventory — safe to run in a worker thread (own OpenAI client)."""
    client = openai_client()
    prompt = source.get("prompt") or ""
    brief = source.get("originalCreativeBrief") or ""
    system = (
        "You inventory Midjourney asset sheets for a children's game. "
        "Return JSON only. Count every visually distinct complete object. "
        "Pixels win over the prompt count. Do not invent physics or interactive "
        "behavior. If a walnut/seed wardrobe is closed, say closed — do not call "
        "it an open dollhouse. Keep multi-part toys that are one assembly as one item."
    )
    user = (
        f"Pack: {sheet['packId']}\n"
        f"Expected visual count hint: {sheet['expectedCount']}\n"
        f"Exact Midjourney prompt:\n{prompt}\n\n"
        f"Original creative brief (if different):\n{brief}\n\n"
        "Return JSON: {\n"
        '  "observedCount": int,\n'
        '  "confidence": 0-1,\n'
        '  "items": [{\n'
        '    "index": 1-based reading order left-to-right top-to-bottom,\n'
        '    "label": short name,\n'
        '    "detailedDescription": string,\n'
        '    "category": lighting|rugs|seating|play-stages|storage|decor,\n'
        '    "subcategory": string,\n'
        '    "materials": [string],\n'
        '    "colors": [string],\n'
        '    "motifs": [string],\n'
        '    "placementHints": ["floor"|"wall"|"table"],\n'
        '    "facing": string,\n'
        '    "notes": string\n'
        "  }]\n}"
    )
    result = chat_json(
        client, model, system, user, SOURCE_ROOT / sheet["sourceName"]
    )
    parsed = result["parsed"]
    observed = int(parsed.get("observedCount") or 0)
    items = parsed.get("items") or []
    if observed != sheet["expectedCount"] or len(items) != sheet["expectedCount"]:
        raise PipelineError(
            f"{sheet['packId']}: inventory observedCount={observed} "
            f"items={len(items)} expected={sheet['expectedCount']}"
        )
    out_path = OPENAI_ROOT / f"inventory-{sheet['packId'].split('.')[-1]}.json"
    write_json(
        out_path,
        {
            "packId": sheet["packId"],
            "model": result["model"],
            "responseId": result["responseId"],
            "latencyMs": result["latencyMs"],
            "timestamp": result["timestamp"],
            "system": system,
            "user": user,
            "parsed": parsed,
        },
    )
    return {
        "packId": sheet["packId"],
        "path": str(out_path.relative_to(REPO_ROOT)),
        "observedCount": observed,
        "items": items,
        "model": result["model"],
        "confidence": parsed.get("confidence"),
    }


def openai_multimodal_inventory(ctx: dict[str, Any]) -> dict[str, Any]:
    model = resolve_model()
    pairs = list(zip(SHEETS, ctx["sources"]))
    inventories: list[dict[str, Any] | None] = [None] * len(pairs)
    print(f"[dag] inventory fan-out workers={min(OPENAI_WORKERS, len(pairs))}", flush=True)
    with ThreadPoolExecutor(max_workers=min(OPENAI_WORKERS, len(pairs))) as pool:
        futures = {
            pool.submit(_inventory_one_sheet, sheet, source, model): index
            for index, (sheet, source) in enumerate(pairs)
        }
        for future in as_completed(futures):
            index = futures[future]
            inventories[index] = future.result()
            print(f"[dag]   inventory ok {inventories[index]['packId']}", flush=True)
    ctx["inventories"] = inventories  # type: ignore[assignment]
    return {"inventories": inventories, "workers": min(OPENAI_WORKERS, len(pairs))}


def carve_transparent_sprites(ctx: dict[str, Any]) -> dict[str, Any]:
    carved: list[dict[str, Any]] = []
    EXTRACTED_ROOT.mkdir(parents=True, exist_ok=True)
    for sheet, inventory in zip(SHEETS, ctx["inventories"]):
        image = cv2.imread(str(SOURCE_ROOT / sheet["sourceName"]), cv2.IMREAD_COLOR)
        if image is None:
            raise PipelineError(f"Decode failed: {sheet['sourceName']}")
        segmentation = segment_sheet(image)
        items = inventory["items"]
        if sheet["layout"] == "components":
            if len(segmentation.components) != sheet["expectedCount"]:
                raise PipelineError(
                    f"{sheet['packId']}: found {len(segmentation.components)} "
                    f"components, expected {sheet['expectedCount']}"
                )
            pairs = list(zip(segmentation.components, items))
        elif sheet["layout"] == "rois":
            h, w = image.shape[:2]
            rois = sheet.get("rois") or []
            if len(rois) != sheet["expectedCount"]:
                raise PipelineError(
                    f"{sheet['packId']}: rois={len(rois)} expected={sheet['expectedCount']}"
                )
            pairs = []
            for item, roi in zip(items, rois):
                cell = (
                    int(roi[0] * w),
                    int(roi[1] * h),
                    int(roi[2] * w),
                    int(roi[3] * h),
                )
                rgba, bounds = extract_roi(image, cell)
                pairs.append((item, rgba, bounds))
        else:
            raise PipelineError(f"Unknown layout: {sheet['layout']}")

        for index, entry in enumerate(pairs, 1):
            if sheet["layout"] == "components":
                component, item = entry  # type: ignore[misc]
                rgba, bounds = extract_component(image, segmentation, component)
            else:
                item, rgba, bounds = entry  # type: ignore[misc]

            label = str(item.get("label") or f"Item {index}")
            slug = slugify(label)
            pack_slug = sheet["packId"].split(".")[-1]
            asset_id = f"acd-{pack_slug}-{index:02d}-{slug}"
            catalog_name = asset_id.replace("-", "_")
            png_path = EXTRACTED_ROOT / f"{asset_id}.png"
            save_png(png_path, rgba)
            alpha = rgba[:, :, 3]
            border = np.concatenate((alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]))
            carved.append(
                {
                    "id": asset_id,
                    "assetCatalogName": catalog_name,
                    "packId": sheet["packId"],
                    "componentIndex": index,
                    "label": label,
                    "category": item.get("category") or sheet["categoryDefault"],
                    "subcategory": item.get("subcategory") or "",
                    "description": item.get("detailedDescription") or "",
                    "materials": item.get("materials") or [],
                    "colors": item.get("colors") or [],
                    "motifs": item.get("motifs") or [],
                    "placementHints": item.get("placementHints") or ["floor"],
                    "facing": item.get("facing") or "",
                    "inventoryNotes": item.get("notes") or "",
                    "pngPath": str(png_path.relative_to(REPO_ROOT)),
                    "pngSha256": sha256_file(png_path),
                    "sourceBounds": bounds,
                    "sourceSha256": sha256_file(SOURCE_ROOT / sheet["sourceName"]),
                    "sourcePath": str((SOURCE_ROOT / sheet["sourceName"]).relative_to(REPO_ROOT)),
                    "pixelSize": {"width": int(rgba.shape[1]), "height": int(rgba.shape[0])},
                    "alpha": {
                        "contract": "required",
                        "borderTransparentRatio": round(float(np.mean(border <= 2)), 6),
                        "visiblePixels": int(np.count_nonzero(alpha > 2)),
                    },
                    "role": "placeable-room-prop",
                    "eligibleCottageScenes": list(COTTAGE_SCENES),
                }
            )
    if len(carved) != 21:
        raise PipelineError(f"Expected 21 carved assets, got {len(carved)}")
    ctx["carved"] = carved
    write_json(EVIDENCE_ROOT / "carved-index.json", {"assets": carved})
    return {"carvedCount": len(carved)}


def _repair_cutout_png(path: Path) -> dict[str, Any]:
    """Strip contact shadow / pale fringe; return updated alpha + size fields."""
    loaded = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if loaded is None:
        raise PipelineError(f"Could not reload {path}")
    if loaded.shape[2] == 4:
        rgba = cv2.cvtColor(loaded, cv2.COLOR_BGRA2RGBA)
    else:
        rgba = cv2.cvtColor(loaded, cv2.COLOR_BGR2RGBA)
    rgba = strip_contact_shadow(rgba)
    hsv = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2HSV)
    pale = (hsv[:, :, 1] < 50) & (rgba[:, :, 3] > 0) & (hsv[:, :, 2] > 120)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(
        (rgba[:, :, 3] > 8).astype(np.uint8)
    )
    if count > 1:
        main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        for i in range(1, count):
            if i == main:
                continue
            if stats[i, cv2.CC_STAT_AREA] < 1200:
                rgba[labels == i, 3] = 0
    core = cv2.erode(
        (rgba[:, :, 3] > 200).astype(np.uint8), np.ones((7, 7), np.uint8), 2
    )
    rgba[pale & (core == 0), 3] = 0
    ys, xs = np.where(rgba[:, :, 3] > 8)
    if xs.size:
        pad = 10
        rgba = rgba[
            max(0, ys.min() - pad) : ys.max() + 1 + pad,
            max(0, xs.min() - pad) : xs.max() + 1 + pad,
        ]
    save_png(path, rgba)
    alpha = rgba[:, :, 3]
    border = np.concatenate((alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]))
    return {
        "pngSha256": sha256_file(path),
        "alpha": {
            "contract": "required",
            "borderTransparentRatio": round(float(np.mean(border <= 2)), 6),
            "visiblePixels": int(np.count_nonzero(alpha > 2)),
        },
        "pixelSize": {
            "width": int(rgba.shape[1]),
            "height": int(rgba.shape[0]),
        },
    }


def _review_one_cutout(asset: dict[str, Any], model: str) -> dict[str, Any]:
    """One asset cutout review — own OpenAI client; mutates a copy of asset fields."""
    client = openai_client()
    path = REPO_ROOT / asset["pngPath"]
    out = OPENAI_ROOT / f"review-{asset['id']}.json"
    border_ok = float(asset.get("alpha", {}).get("borderTransparentRatio") or 0) >= 0.98
    if not border_ok:
        raise PipelineError(
            f"Cutout border not transparent for {asset['id']}: {asset.get('alpha')}"
        )
    if out.is_file():
        prior = json.loads(out.read_text())
        if (
            prior.get("pngSha256") == asset.get("pngSha256")
            and prior.get("parsed", {}).get("pass") is True
        ):
            parsed = prior["parsed"]
            cutout = {
                "model": prior.get("model"),
                "path": str(out.relative_to(REPO_ROOT)),
                "pass": True,
                "confidence": parsed.get("confidence"),
                "refinedDescription": parsed.get("refinedDescription")
                or asset["description"],
                "suggestedScale": parsed.get("suggestedScale") or 0.8,
                "anchor": parsed.get("anchor") or "bottom-center",
                "placementLayer": parsed.get("placementLayer") or "floor",
                "resumed": True,
            }
            description = cutout["refinedDescription"] or asset["description"]
            return {
                "id": asset["id"],
                "pass": True,
                "resumed": True,
                "cutoutReview": cutout,
                "description": description,
                "pngSha256": asset.get("pngSha256"),
                "alpha": asset.get("alpha"),
                "pixelSize": asset.get("pixelSize"),
            }

    system = (
        "You review transparent game sprites carved from Midjourney sheets. "
        "The image is the PNG composited on a gray checkerboard — checker "
        "squares ARE the transparent areas, not background art. "
        "Return JSON only. Fail only if: (1) a solid white/sheet plate remains, "
        "(2) a soft detached cast-shadow blob under the object that is clearly "
        "NOT painted as part of the prop, (3) a fragment of a neighboring object, "
        "or (4) a cropped/incomplete silhouette. "
        "PASS painted bases that belong to the prop (grass tufts, rock mounds, "
        "wood platforms, rug edges, lamp stands). Soft anti-aliased edges and "
        "intentional light fabric are OK. Transparent padding around a complete "
        "prop is NOT a crop failure."
    )
    user = (
        f"Asset id: {asset['id']}\nLabel: {asset['label']}\n"
        f"Claimed description: {asset['description']}\n"
        "Checkerboard = transparency. Pass clean single-object cutouts. "
        "Return JSON: {\n"
        '  "pass": bool,\n'
        '  "confidence": 0-1,\n'
        '  "issues": [string],\n'
        '  "refinedDescription": string,\n'
        '  "suggestedScale": 0.5-1.2,\n'
        '  "anchor": "bottom-center"|"center",\n'
        '  "placementLayer": "floor"|"wall"|"table"\n}'
    )
    result = chat_json(client, model, system, user, path, checkerboard=True)
    parsed = result["parsed"]
    png_sha = asset.get("pngSha256")
    alpha = asset.get("alpha")
    pixel_size = asset.get("pixelSize")
    if not parsed.get("pass", False):
        issues = " ".join(str(x) for x in (parsed.get("issues") or [])).lower()
        repairable = any(
            key in issues
            for key in (
                "shadow",
                "streak",
                "swoosh",
                "residue",
                "fragment",
                "halo",
                "fringe",
                "blob",
            )
        )
        if repairable:
            repaired = _repair_cutout_png(path)
            png_sha = repaired["pngSha256"]
            alpha = repaired["alpha"]
            pixel_size = repaired["pixelSize"]
            result = chat_json(client, model, system, user, path, checkerboard=True)
            parsed = result["parsed"]
            parsed["repairedOnce"] = True
        if not parsed.get("pass", False):
            raise PipelineError(
                f"Cutout review failed for {asset['id']}: {parsed.get('issues')}"
            )
    write_json(
        out,
        {
            "assetId": asset["id"],
            "pngSha256": png_sha,
            "model": result["model"],
            "responseId": result["responseId"],
            "timestamp": result["timestamp"],
            "latencyMs": result["latencyMs"],
            "parsed": parsed,
        },
    )
    cutout = {
        "model": result["model"],
        "path": str(out.relative_to(REPO_ROOT)),
        "pass": True,
        "confidence": parsed.get("confidence"),
        "refinedDescription": parsed.get("refinedDescription") or asset["description"],
        "suggestedScale": parsed.get("suggestedScale") or 0.8,
        "anchor": parsed.get("anchor") or "bottom-center",
        "placementLayer": parsed.get("placementLayer") or "floor",
    }
    return {
        "id": asset["id"],
        "pass": True,
        "resumed": False,
        "cutoutReview": cutout,
        "description": cutout["refinedDescription"] or asset["description"],
        "pngSha256": png_sha,
        "alpha": alpha,
        "pixelSize": pixel_size,
    }


def openai_multimodal_cutout_review(ctx: dict[str, Any]) -> dict[str, Any]:
    model = resolve_model()
    carved = ctx["carved"]
    workers = min(OPENAI_WORKERS, max(1, len(carved)))
    print(f"[dag] cutout-review fan-out workers={workers} assets={len(carved)}", flush=True)
    by_id: dict[str, dict[str, Any]] = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(_review_one_cutout, asset, model): asset["id"]
            for asset in carved
        }
        done = 0
        for future in as_completed(futures):
            asset_id = futures[future]
            result = future.result()
            by_id[asset_id] = result
            done += 1
            tag = "resume" if result.get("resumed") else "ok"
            print(f"[dag]   cutout {done}/{len(carved)} {tag} {asset_id}", flush=True)
    reviews = []
    for asset in carved:
        result = by_id[asset["id"]]
        asset["cutoutReview"] = result["cutoutReview"]
        asset["description"] = result["description"]
        if result.get("pngSha256"):
            asset["pngSha256"] = result["pngSha256"]
        if result.get("alpha"):
            asset["alpha"] = result["alpha"]
        if result.get("pixelSize"):
            asset["pixelSize"] = result["pixelSize"]
        reviews.append(
            {
                "id": asset["id"],
                "pass": True,
                **({"resumed": True} if result.get("resumed") else {}),
            }
        )
    ctx["reviews"] = reviews
    return {"reviewed": len(reviews), "workers": workers}


def deep_metadata_stamp(ctx: dict[str, Any]) -> dict[str, Any]:
    provenance = json.loads((PACK_ROOT / "provenance.json").read_text())
    pack_by_id = {a["semanticId"]: a for a in provenance["assets"]}
    stamped = []
    for asset in ctx["carved"]:
        pack = pack_by_id[asset["packId"]]
        meta = {
            "schemaVersion": 1,
            "semanticId": f"decor.abbieCottage.{asset['id']}",
            "id": asset["id"],
            "label": asset["label"],
            "detailedVisualDescription": asset["description"],
            "category": asset["category"],
            "subcategory": asset["subcategory"],
            "role": "placeable-room-prop",
            "materials": asset["materials"],
            "colors": asset["colors"],
            "motifs": asset["motifs"],
            "style": "hand-painted 2D storybook / gouache",
            "intendedUse": "decorative room prop for Abbie cottage decorate mode",
            "interactionAffordances": {
                "implemented": ["place", "move", "scale", "return-to-inventory"],
                "visualInferenceOnly": asset.get("inventoryNotes") or "",
            },
            "placement": {
                "hints": asset["placementHints"],
                "layer": asset["cutoutReview"]["placementLayer"],
                "facing": asset["facing"],
                "defaultScale": asset["cutoutReview"]["suggestedScale"],
                "anchor": asset["cutoutReview"]["anchor"],
            },
            "alphaBounds": asset["alpha"],
            "sourceCropBounds": asset["sourceBounds"],
            "pixelSize": asset["pixelSize"],
            "hashes": {
                "sourceSha256": asset["sourceSha256"],
                "derivativeSha256": asset["pngSha256"],
            },
            "provenance": {
                "packSemanticId": asset["packId"],
                "jobId": pack.get("jobId"),
                "candidateIndex": pack.get("candidateIndex"),
                "requestedSourceUrl": pack.get("requestedSourceUrl"),
                "retrievedSourceUrl": pack.get("retrievedSourceUrl"),
                "prompt": pack.get("prompt"),
                "originalCreativeBrief": pack.get("originalCreativeBrief"),
                "promptFile": pack.get("promptFile"),
            },
            "eligibleCottageScenes": asset["eligibleCottageScenes"],
            "modelEvidence": {
                "inventoryModel": next(
                    i["model"] for i in ctx["inventories"] if i["packId"] == asset["packId"]
                ),
                "cutoutReviewModel": asset["cutoutReview"]["model"],
                "cutoutReviewPath": asset["cutoutReview"]["path"],
            },
            "reviewStatus": "accepted",
            "assetCatalogName": asset["assetCatalogName"],
        }
        path = OPENAI_ROOT / f"metadata-{asset['id']}.json"
        write_json(path, meta)
        asset["metadataPath"] = str(path.relative_to(REPO_ROOT))
        asset["semanticId"] = meta["semanticId"]
        asset["defaultScale"] = meta["placement"]["defaultScale"]
        asset["placementLayer"] = meta["placement"]["layer"]
        stamped.append(asset["id"])
    ctx["stamped"] = stamped
    return {"stamped": len(stamped)}


def ingest_registry_and_catalog(ctx: dict[str, Any]) -> dict[str, Any]:
    integrated = []
    for asset in ctx["carved"]:
        catalog_name = asset["assetCatalogName"]
        imageset = CATALOG_ROOT / f"{catalog_name}.imageset"
        filename = f"{catalog_name}.png"
        imageset.mkdir(parents=True, exist_ok=True)
        shutil.copy2(REPO_ROOT / asset["pngPath"], imageset / filename)
        write_json(
            imageset / "Contents.json",
            {
                "images": [
                    {"filename": filename, "idiom": "universal", "scale": "1x"},
                    {"idiom": "universal", "scale": "2x"},
                    {"idiom": "universal", "scale": "3x"},
                ],
                "info": {"author": "cottage-decor-dag", "version": 1},
                "properties": {"preserves-vector-representation": False},
            },
        )
        integrated.append(catalog_name)

    manifest = {
        "schemaVersion": 1,
        "assetCount": len(ctx["carved"]),
        "generatedAt": utc_now(),
        "pack": "abbie-cottage-decor-2026-09-27",
        "eligibleCottageScenes": COTTAGE_SCENES,
        "assets": [
            {
                "id": a["id"],
                "semanticId": a["semanticId"],
                "assetCatalogName": a["assetCatalogName"],
                "category": a["category"],
                "label": a["label"],
                "description": a["description"],
                "tags": list(
                    dict.fromkeys(
                        (a.get("motifs") or [])
                        + (a.get("materials") or [])
                        + [a["category"], "abbie-cottage", "cottage-decor"]
                    )
                ),
                "pixelSize": a["pixelSize"],
                "defaultScale": a.get("defaultScale", 0.8),
                "placementLayer": a.get("placementLayer", "floor"),
                "role": "placeable-room-prop",
                "eligibleCottageScenes": a["eligibleCottageScenes"],
                "pngSha256": a["pngSha256"],
                "sourceSha256": a["sourceSha256"],
                "metadataPath": a["metadataPath"],
            }
            for a in ctx["carved"]
        ],
    }
    # Retain separately approved packs imported into the shared cottage catalog.
    if MANIFEST_PATH.is_file():
        existing = json.loads(MANIFEST_PATH.read_text())
        rebuilt_ids = {asset["id"] for asset in manifest["assets"]}
        manifest["assets"].extend(
            asset for asset in existing.get("assets", [])
            if asset["id"] not in rebuilt_ids
        )
        manifest["assetCount"] = len(manifest["assets"])
    write_json(MANIFEST_PATH, manifest)
    DATASET_ROOT.mkdir(parents=True, exist_ok=True)
    write_json(RUNTIME_MANIFEST_PATH, manifest)
    write_json(
        DATASET_ROOT / "Contents.json",
        {
            "info": {"author": "cottage-decor-dag", "version": 1},
            "data": [{"filename": "cottage_decor_asset_manifest.json", "idiom": "universal"}],
        },
    )

    # Contact sheet
    cell_w, cell_h = 220, 240
    cols = 7
    rows = (len(ctx["carved"]) + cols - 1) // cols
    canvas = Image.new("RGB", (cols * cell_w, rows * cell_h), "#f4eef7")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    for index, asset in enumerate(ctx["carved"]):
        col, row = index % cols, index // cols
        ox, oy = col * cell_w, row * cell_h
        with Image.open(REPO_ROOT / asset["pngPath"]) as opened:
            prop = opened.convert("RGBA")
            prop.thumbnail((cell_w - 24, cell_h - 48), Image.Resampling.LANCZOS)
            canvas.paste(
                prop,
                (ox + (cell_w - prop.width) // 2, oy + 8),
                prop,
            )
        draw.text((ox + 8, oy + cell_h - 32), asset["id"][:28], fill="#2b1f35", font=font)
        draw.text((ox + 8, oy + cell_h - 18), asset["label"][:30], fill="#57455f", font=font)
    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    canvas.save(REVIEW_ROOT / "contact-sheet.png")
    return {"integrated": len(integrated), "manifest": str(MANIFEST_PATH.relative_to(REPO_ROOT))}


def bind_all_cottage_scenes(ctx: dict[str, Any]) -> dict[str, Any]:
    # Binding evidence: every asset lists every cottage scene ID. Runtime load
    # is completed by FurnitureModels reading cottage_decor_asset_manifest.
    coverage = {
        scene: [a["id"] for a in ctx["carved"]] for scene in COTTAGE_SCENES
    }
    write_json(
        EVIDENCE_ROOT / "scene-coverage.json",
        {
            "mode": "all-current-and-future-cottage-scenes",
            "poiId": "poi.abbieTreehouse",
            "scenes": coverage,
            "note": (
                "Decorate tray uses shared FurnitureItem.storeCatalog; room id only "
                "scopes placements, not catalog eligibility."
            ),
        },
    )
    return {"scenes": list(coverage.keys()), "assetsPerScene": len(ctx["carved"])}


def runtime_verify_every_scene(ctx: dict[str, Any]) -> dict[str, Any]:
    # Structural verification: catalog dataset + imagesets present; counts match.
    missing = []
    for asset in ctx["carved"]:
        imageset = CATALOG_ROOT / f"{asset['assetCatalogName']}.imageset"
        png = imageset / f"{asset['assetCatalogName']}.png"
        if not png.is_file():
            missing.append(str(png.relative_to(REPO_ROOT)))
    if missing:
        raise PipelineError(f"Missing imagesets: {missing[:5]}")
    if not RUNTIME_MANIFEST_PATH.is_file():
        raise PipelineError("Runtime manifest missing")
    manifest = json.loads(RUNTIME_MANIFEST_PATH.read_text())
    if manifest.get("assetCount") != len(manifest["assets"]) or not {a["id"] for a in ctx["carved"]}.issubset({a["id"] for a in manifest["assets"]}):
        raise PipelineError(f"Runtime manifest assetCount={manifest.get('assetCount')}")
    report = {
        "imagesetsPresent": 21,
        "manifestAssetCount": manifest["assetCount"],
        "eligibleScenes": manifest.get("eligibleCottageScenes"),
        "contactSheet": str((REVIEW_ROOT / "contact-sheet.png").relative_to(REPO_ROOT)),
        "status": "catalog_ready_awaiting_device_screenshots",
        "timestamp": utc_now(),
    }
    write_json(EVIDENCE_ROOT / "runtime-verify.json", report)
    return report


NODES: list[tuple[str, tuple[str, ...], Callable[[dict[str, Any]], dict[str, Any]]]] = [
    ("verify_sources", (), verify_sources),
    ("openai_multimodal_inventory", ("verify_sources",), openai_multimodal_inventory),
    ("carve_transparent_sprites", ("openai_multimodal_inventory",), carve_transparent_sprites),
    ("openai_multimodal_cutout_review", ("carve_transparent_sprites",), openai_multimodal_cutout_review),
    ("deep_metadata_stamp", ("openai_multimodal_cutout_review",), deep_metadata_stamp),
    ("ingest_registry_and_catalog", ("deep_metadata_stamp",), ingest_registry_and_catalog),
    ("bind_all_cottage_scenes", ("ingest_registry_and_catalog",), bind_all_cottage_scenes),
    ("runtime_verify_every_scene", ("bind_all_cottage_scenes",), runtime_verify_every_scene),
]


def run(start_from: str | None = None, stop_after: str | None = None) -> dict[str, Any]:
    ctx: dict[str, Any] = {}
    # Resume context from prior evidence when restarting mid-DAG.
    carved_index = EVIDENCE_ROOT / "carved-index.json"
    if carved_index.is_file() and start_from not in (None, "verify_sources", "openai_multimodal_inventory", "carve_transparent_sprites"):
        ctx["carved"] = json.loads(carved_index.read_text())["assets"]
    inv_files = sorted(OPENAI_ROOT.glob("inventory-*.json"))
    if inv_files and "inventories" not in ctx:
        ctx["inventories"] = []
        for path in inv_files:
            data = json.loads(path.read_text())
            ctx["inventories"].append(
                {
                    "packId": data["packId"],
                    "path": str(path.relative_to(REPO_ROOT)),
                    "observedCount": data["parsed"]["observedCount"],
                    "items": data["parsed"]["items"],
                    "model": data["model"],
                    "confidence": data["parsed"].get("confidence"),
                }
            )

    dag_events: list[dict[str, Any]] = []
    started = False if start_from else True
    for node_id, deps, fn in NODES:
        if not started:
            if node_id == start_from:
                started = True
            else:
                continue
        print(f"[dag] {node_id}…", flush=True)
        t0 = time.time()
        try:
            outputs = fn(ctx)
            event = {
                "node": node_id,
                "dependsOn": list(deps),
                "status": "ok",
                "elapsedMs": int((time.time() - t0) * 1000),
                "outputs": outputs,
                "timestamp": utc_now(),
            }
        except Exception as exc:
            event = {
                "node": node_id,
                "dependsOn": list(deps),
                "status": "failed",
                "error": str(exc),
                "elapsedMs": int((time.time() - t0) * 1000),
                "timestamp": utc_now(),
            }
            dag_events.append(event)
            write_json(DAG_PATH, {"events": dag_events, "failedAt": node_id})
            raise
        dag_events.append(event)
        write_json(DAG_PATH, {"events": dag_events})
        print(f"[dag] {node_id} ok ({event['elapsedMs']}ms)", flush=True)
        if stop_after and node_id == stop_after:
            break
    return {"events": dag_events}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--from", dest="start_from", default=None)
    parser.add_argument("--stop-after", default=None)
    args = parser.parse_args()
    try:
        run(start_from=args.start_from, stop_after=args.stop_after)
    except PipelineError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
