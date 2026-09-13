#!/usr/bin/env python3
"""Extract labeled transparent Cozy Room props through a deterministic DAG."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[2]
PIPELINE_ROOT = REPO_ROOT / "AssetSources" / "CozyRoomKit"
SOURCE_ROOT = PIPELINE_ROOT / "sources"
EXTRACTED_ROOT = PIPELINE_ROOT / "extracted"
EVIDENCE_ROOT = PIPELINE_ROOT / "evidence"
REVIEW_ROOT = PIPELINE_ROOT / "review"
SPEC_PATH = PIPELINE_ROOT / "catalog-spec.json"
MANIFEST_PATH = PIPELINE_ROOT / "manifest.json"
CATALOG_ROOT = (
    REPO_ROOT
    / "abbies.world.ios"
    / "abbies.world.ios"
    / "Assets.xcassets"
)
DATASET_ROOT = CATALOG_ROOT / "cozy_room_asset_manifest.dataset"
RUNTIME_MANIFEST_PATH = DATASET_ROOT / "cozy_room_asset_manifest.json"

SHEET_NAMES = ("sheet-01.jpg", "sheet-02.jpg", "sheet-03.jpg", "sheet-04.jpg")
PIPELINE_VERSION = 1
MIN_COMPONENT_AREA = 400
EDGE_THRESHOLD = 18.0
ROW_BAND_PIXELS = 100
SOURCE_PADDING = 14
OUTPUT_PADDING = 8


class PipelineError(RuntimeError):
    """An actionable extraction or validation failure."""


def canonical_json(value: Any, *, pretty: bool = False) -> bytes:
    if pretty:
        text = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    else:
        text = json.dumps(
            value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
        )
    return text.encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_if_changed(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() == data:
        return
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_bytes(data)
    os.replace(temporary, path)


def write_json(path: Path, value: Any) -> None:
    write_if_changed(path, canonical_json(value, pretty=True))


def save_png(path: Path, rgba: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    success, encoded = cv2.imencode(
        ".png",
        cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA),
        [cv2.IMWRITE_PNG_COMPRESSION, 9],
    )
    if not success:
        raise PipelineError(f"Could not encode PNG: {path}")
    write_if_changed(path, encoded.tobytes())


def import_sources(paths: list[Path]) -> None:
    if len(paths) != len(SHEET_NAMES):
        raise PipelineError(f"Expected exactly four source sheets, received {len(paths)}")
    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    for source, name in zip(paths, SHEET_NAMES):
        source = source.expanduser().resolve()
        if not source.is_file():
            raise PipelineError(f"Source sheet is missing: {source}")
        destination = SOURCE_ROOT / name
        data = source.read_bytes()
        if destination.exists() and destination.read_bytes() != data:
            raise PipelineError(
                f"Immutable source differs at {destination}; remove it explicitly "
                "before importing a different atlas."
            )
        write_if_changed(destination, data)


def load_spec() -> dict[str, Any]:
    if not SPEC_PATH.is_file():
        raise PipelineError(f"Catalog specification is missing: {SPEC_PATH}")
    value = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    if value.get("schemaVersion") != 1 or not isinstance(value.get("assets"), list):
        raise PipelineError("catalog-spec.json must use schemaVersion 1 with assets[]")
    return value


def load_sheet(path: Path) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise PipelineError(f"Could not decode source image: {path}")
    if image.shape[:2] != (1024, 1024):
        raise PipelineError(
            f"{path.name} is {image.shape[1]}x{image.shape[0]}; expected 1024x1024"
        )
    return image


@dataclass(frozen=True)
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
        hard_mask,
        cv2.MORPH_CLOSE,
        np.ones((5, 5), dtype=np.uint8),
        iterations=2,
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
    components.sort(key=lambda item: (item.y // ROW_BAND_PIXELS, item.x))
    return Segmentation(background, distance, labels, components)


def smoothstep(value: np.ndarray, lower: float, upper: float) -> np.ndarray:
    normalized = np.clip((value - lower) / (upper - lower), 0.0, 1.0)
    return normalized * normalized * (3.0 - 2.0 * normalized)


def extract_component(
    image: np.ndarray,
    segmentation: Segmentation,
    component: Component,
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
        raise PipelineError(f"Component label {component.label} vanished during crop")

    # GrabCut receives the edge-connected component as definite foreground and every
    # neighboring component as definite background. This matters where bounding boxes
    # overlap, such as the bunk bed and rug on sheet 4.
    grab_mask = np.full(target.shape, cv2.GC_PR_BGD, dtype=np.uint8)
    other_components = (roi_labels != 0) & ~target
    grab_mask[other_components] = cv2.GC_BGD
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
    background_model = np.zeros((1, 65), dtype=np.float64)
    foreground_model = np.zeros((1, 65), dtype=np.float64)
    cv2.grabCut(
        roi,
        grab_mask,
        None,
        background_model,
        foreground_model,
        4,
        cv2.GC_INIT_WITH_MASK,
    )
    selected = (grab_mask == cv2.GC_FGD) | (grab_mask == cv2.GC_PR_FGD)

    alpha = (smoothstep(roi_distance, 6.0, 30.0) * 255.0).astype(np.uint8)
    alpha = np.where(selected, alpha, 0).astype(np.uint8)
    alpha = np.maximum(alpha, np.where(target, 235, 0).astype(np.uint8))
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0.65)
    alpha = np.where(selected | target, alpha, 0).astype(np.uint8)

    visible_y, visible_x = np.where(alpha > 2)
    if visible_x.size == 0:
        raise PipelineError("Matting produced an empty asset")
    crop_left = max(0, int(visible_x.min()) - OUTPUT_PADDING)
    crop_top = max(0, int(visible_y.min()) - OUTPUT_PADDING)
    crop_right = min(alpha.shape[1], int(visible_x.max()) + 1 + OUTPUT_PADDING)
    crop_bottom = min(alpha.shape[0], int(visible_y.max()) + 1 + OUTPUT_PADDING)

    rgba = cv2.cvtColor(roi, cv2.COLOR_BGR2RGBA)
    alpha_float = alpha.astype(np.float32) / 255.0
    # Undo compositing against the pale atlas background to suppress white fringes.
    background_rgb = segmentation.background_bgr[::-1]
    rgb = rgba[:, :, :3].astype(np.float32)
    safe_alpha = np.maximum(alpha_float[:, :, None], 0.08)
    unblended = (rgb - (1.0 - safe_alpha) * background_rgb) / safe_alpha
    rgba[:, :, :3] = np.clip(unblended, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = alpha
    rgba = rgba[crop_top:crop_bottom, crop_left:crop_right]

    source_bounds = [
        left + crop_left,
        top + crop_top,
        left + crop_right,
        top + crop_bottom,
    ]
    return rgba, source_bounds


def annotated_sheet(
    image: np.ndarray,
    components: list[Component],
    metadata: list[dict[str, Any]],
) -> np.ndarray:
    value = image.copy()
    for index, (component, asset) in enumerate(zip(components, metadata), 1):
        x1, y1, x2, y2 = component.bounds
        cv2.rectangle(value, (x1, y1), (x2, y2), (30, 70, 230), 2)
        cv2.putText(
            value,
            f"{index}: {asset['label']}",
            (x1 + 4, y1 + 22),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.44,
            (30, 70, 230),
            1,
            cv2.LINE_AA,
        )
    return value


def transparent_metrics(path: Path) -> dict[str, Any]:
    with Image.open(path) as opened:
        image = opened.convert("RGBA")
        alpha = np.asarray(image.getchannel("A"))
    border = np.concatenate((alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]))
    opaque_count = int(np.count_nonzero(alpha >= 250))
    return {
        "width": image.width,
        "height": image.height,
        "sha256": sha256_file(path),
        "opaquePixels": opaque_count,
        "visiblePixels": int(np.count_nonzero(alpha > 2)),
        "borderTransparentRatio": round(float(np.mean(border <= 2)), 6),
    }


def integrate_asset(asset: dict[str, Any], extracted_path: Path) -> dict[str, Any]:
    catalog_name = asset["assetCatalogName"]
    filename = f"{catalog_name}.png"
    imageset = CATALOG_ROOT / f"{catalog_name}.imageset"
    write_if_changed(imageset / filename, extracted_path.read_bytes())
    write_json(
        imageset / "Contents.json",
        {
            "images": [
                {"filename": filename, "idiom": "universal", "scale": "1x"},
                {"idiom": "universal", "scale": "2x"},
                {"idiom": "universal", "scale": "3x"},
            ],
            "info": {"author": "cozy-room-extraction-dag", "version": 1},
            "properties": {"preserves-vector-representation": False},
        },
    )
    return {
        "assetCatalogName": catalog_name,
        "filename": filename,
        "imageset": str(imageset.relative_to(REPO_ROOT)),
    }


def make_contact_sheet(assets: list[dict[str, Any]]) -> Path:
    cell_width, cell_height = 230, 250
    columns = 6
    rows = (len(assets) + columns - 1) // columns
    canvas = Image.new("RGB", (columns * cell_width, rows * cell_height), "#f4eef7")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    checker = Image.new("RGB", (cell_width - 20, cell_height - 54), "white")
    checker_draw = ImageDraw.Draw(checker)
    tile = 12
    for y in range(0, checker.height, tile):
        for x in range(0, checker.width, tile):
            if (x // tile + y // tile) % 2:
                checker_draw.rectangle(
                    (x, y, x + tile - 1, y + tile - 1), fill="#dedede"
                )
    for index, asset in enumerate(assets):
        column, row = index % columns, index // columns
        origin = (column * cell_width, row * cell_height)
        canvas.paste(checker, (origin[0] + 10, origin[1] + 8))
        with Image.open(EXTRACTED_ROOT / f"{asset['id']}.png") as opened:
            prop = opened.convert("RGBA")
            prop.thumbnail((checker.width - 16, checker.height - 16), Image.Resampling.LANCZOS)
            position = (
                origin[0] + 10 + (checker.width - prop.width) // 2,
                origin[1] + 8 + (checker.height - prop.height) // 2,
            )
            canvas.paste(prop, position, prop)
        draw.text(
            (origin[0] + 10, origin[1] + cell_height - 40),
            asset["id"],
            fill="#2b1f35",
            font=font,
        )
        draw.text(
            (origin[0] + 10, origin[1] + cell_height - 25),
            asset["label"][:34],
            fill="#57455f",
            font=font,
        )
    destination = REVIEW_ROOT / "contact-sheet.png"
    temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(temporary, format="PNG", optimize=True)
    write_if_changed(destination, temporary.read_bytes())
    if temporary.exists():
        temporary.unlink()
    return destination


@dataclass(frozen=True)
class DagNode:
    node_id: str
    dependencies: tuple[str, ...]
    operation: Callable[[dict[str, Any]], dict[str, Any]]


def topological_order(nodes: list[DagNode]) -> list[DagNode]:
    by_id = {node.node_id: node for node in nodes}
    if len(by_id) != len(nodes):
        raise PipelineError("DAG node IDs must be unique")
    resolved: set[str] = set()
    ordered: list[DagNode] = []
    while len(ordered) < len(nodes):
        ready = [
            node
            for node in nodes
            if node.node_id not in resolved
            and all(dependency in resolved for dependency in node.dependencies)
        ]
        if not ready:
            unresolved = sorted(set(by_id) - resolved)
            raise PipelineError(f"DAG contains a cycle or missing dependency: {unresolved}")
        for node in sorted(ready, key=lambda item: item.node_id):
            ordered.append(node)
            resolved.add(node.node_id)
    return ordered


def run_pipeline() -> dict[str, Any]:
    spec = load_spec()
    assets = spec["assets"]
    assets_by_sheet = {
        sheet: sorted(
            [asset for asset in assets if asset["sheet"] == sheet],
            key=lambda item: item["componentIndex"],
        )
        for sheet in SHEET_NAMES
    }
    context: dict[str, Any] = {"spec": spec, "assets": assets}

    def verify_sources(_: dict[str, Any]) -> dict[str, Any]:
        records = []
        for name in SHEET_NAMES:
            path = SOURCE_ROOT / name
            image = load_sheet(path)
            records.append(
                {
                    "sheet": name,
                    "sha256": sha256_file(path),
                    "width": int(image.shape[1]),
                    "height": int(image.shape[0]),
                }
            )
        return {"sources": records}

    def detect_edges(ctx: dict[str, Any]) -> dict[str, Any]:
        segmentations: dict[str, Segmentation] = {}
        images: dict[str, np.ndarray] = {}
        records = []
        for name in SHEET_NAMES:
            image = load_sheet(SOURCE_ROOT / name)
            segmentation = segment_sheet(image)
            expected = len(assets_by_sheet[name])
            if len(segmentation.components) != expected:
                raise PipelineError(
                    f"{name} yielded {len(segmentation.components)} components; "
                    f"catalog expects {expected}. Refuse to relabel shifted art."
                )
            images[name] = image
            segmentations[name] = segmentation
            annotated = annotated_sheet(
                image, segmentation.components, assets_by_sheet[name]
            )
            review_path = EVIDENCE_ROOT / "edge-labels" / name.replace(".jpg", ".png")
            success, encoded = cv2.imencode(
                ".png", annotated, [cv2.IMWRITE_PNG_COMPRESSION, 9]
            )
            if not success:
                raise PipelineError(f"Could not encode edge review for {name}")
            write_if_changed(review_path, encoded.tobytes())
            records.append(
                {
                    "sheet": name,
                    "backgroundRGB": [
                        int(value) for value in segmentation.background_bgr[::-1]
                    ],
                    "componentCount": len(segmentation.components),
                    "components": [
                        {
                            "componentIndex": index,
                            "edgeBounds": component.bounds,
                            "foregroundArea": component.area,
                        }
                        for index, component in enumerate(
                            segmentation.components, start=1
                        )
                    ],
                    "reviewPath": str(review_path.relative_to(REPO_ROOT)),
                    "reviewSha256": sha256_file(review_path),
                }
            )
        ctx["images"] = images
        ctx["segmentations"] = segmentations
        return {"sheets": records}

    def extract(ctx: dict[str, Any]) -> dict[str, Any]:
        records = []
        for name in SHEET_NAMES:
            image = ctx["images"][name]
            segmentation = ctx["segmentations"][name]
            for component, asset in zip(
                segmentation.components, assets_by_sheet[name]
            ):
                rgba, source_bounds = extract_component(image, segmentation, component)
                destination = EXTRACTED_ROOT / f"{asset['id']}.png"
                save_png(destination, rgba)
                metrics = transparent_metrics(destination)
                if metrics["visiblePixels"] < 500 or metrics["opaquePixels"] < 100:
                    raise PipelineError(f"Extraction is unexpectedly empty: {asset['id']}")
                if metrics["borderTransparentRatio"] < 0.95:
                    raise PipelineError(
                        f"Extraction touches its border: {asset['id']} "
                        f"({metrics['borderTransparentRatio']})"
                    )
                records.append(
                    {
                        "id": asset["id"],
                        "sourceBounds": source_bounds,
                        "edgeBounds": component.bounds,
                        "foregroundArea": component.area,
                        "path": str(destination.relative_to(REPO_ROOT)),
                        **metrics,
                    }
                )
        ctx["extractions"] = {record["id"]: record for record in records}
        return {"assetCount": len(records), "assets": records}

    def integrate(ctx: dict[str, Any]) -> dict[str, Any]:
        records = []
        for asset in assets:
            records.append(
                {
                    "id": asset["id"],
                    **integrate_asset(asset, EXTRACTED_ROOT / f"{asset['id']}.png"),
                }
            )
        return {"assetCount": len(records), "assets": records}

    def catalog(ctx: dict[str, Any]) -> dict[str, Any]:
        manifest_assets = []
        for asset in assets:
            extraction = ctx["extractions"][asset["id"]]
            manifest_assets.append(
                {
                    **asset,
                    "sourcePath": str((SOURCE_ROOT / asset["sheet"]).relative_to(REPO_ROOT)),
                    "sourceSha256": sha256_file(SOURCE_ROOT / asset["sheet"]),
                    "sourceBounds": extraction["sourceBounds"],
                    "pixelSize": {
                        "width": extraction["width"],
                        "height": extraction["height"],
                    },
                    "pngPath": extraction["path"],
                    "pngSha256": extraction["sha256"],
                    "alpha": {
                        "contract": "required",
                        "borderTransparentRatio": extraction[
                            "borderTransparentRatio"
                        ],
                    },
                }
            )
        category_counts: dict[str, int] = {}
        for asset in manifest_assets:
            category_counts[asset["category"]] = (
                category_counts.get(asset["category"], 0) + 1
            )
        manifest = {
            "schemaVersion": 1,
            "collectionId": "cozy-room-kit",
            "pipelineVersion": PIPELINE_VERSION,
            "assetCount": len(manifest_assets),
            "categoryCounts": dict(sorted(category_counts.items())),
            "assets": manifest_assets,
        }
        write_json(MANIFEST_PATH, manifest)
        DATASET_ROOT.mkdir(parents=True, exist_ok=True)
        write_json(
            DATASET_ROOT / "Contents.json",
            {
                "data": [
                    {
                        "filename": RUNTIME_MANIFEST_PATH.name,
                        "idiom": "universal",
                    }
                ],
                "info": {"author": "cozy-room-extraction-dag", "version": 1},
            },
        )
        write_json(RUNTIME_MANIFEST_PATH, manifest)
        ctx["manifest"] = manifest
        return {
            "manifestPath": str(MANIFEST_PATH.relative_to(REPO_ROOT)),
            "runtimeManifestPath": str(RUNTIME_MANIFEST_PATH.relative_to(REPO_ROOT)),
            "manifestSha256": sha256_file(MANIFEST_PATH),
            "assetCount": len(manifest_assets),
            "categoryCounts": manifest["categoryCounts"],
        }

    def review(ctx: dict[str, Any]) -> dict[str, Any]:
        path = make_contact_sheet(ctx["assets"])
        return {
            "contactSheetPath": str(path.relative_to(REPO_ROOT)),
            "contactSheetSha256": sha256_file(path),
        }

    def validate(ctx: dict[str, Any]) -> dict[str, Any]:
        manifest = ctx["manifest"]
        ids = [asset["id"] for asset in assets]
        catalog_names = [asset["assetCatalogName"] for asset in assets]
        if len(ids) != len(set(ids)):
            raise PipelineError("Catalog contains duplicate asset IDs")
        if len(catalog_names) != len(set(catalog_names)):
            raise PipelineError("Catalog contains duplicate asset catalog names")
        if manifest["assetCount"] != len(assets) or len(assets) != 66:
            raise PipelineError("Expected exactly 66 cataloged transparent props")
        for asset in assets:
            extracted = EXTRACTED_ROOT / f"{asset['id']}.png"
            integrated = (
                CATALOG_ROOT
                / f"{asset['assetCatalogName']}.imageset"
                / f"{asset['assetCatalogName']}.png"
            )
            if not integrated.is_file() or sha256_file(integrated) != sha256_file(
                extracted
            ):
                raise PipelineError(f"Integrated bytes differ: {asset['id']}")
        if MANIFEST_PATH.read_bytes() != RUNTIME_MANIFEST_PATH.read_bytes():
            raise PipelineError("Repository and runtime manifests differ")
        return {
            "status": "pass",
            "assetCount": len(assets),
            "sourceSheetCount": len(SHEET_NAMES),
            "alphaContract": "required",
            "runtimeBytesMatchExtracted": True,
            "runtimeManifestMatchesRepositoryManifest": True,
        }

    nodes = [
        DagNode("010.verify-sources", (), verify_sources),
        DagNode("020.detect-edges", ("010.verify-sources",), detect_edges),
        DagNode("030.extract-alpha", ("020.detect-edges",), extract),
        DagNode("040.integrate-xcassets", ("030.extract-alpha",), integrate),
        DagNode("050.write-catalog", ("030.extract-alpha",), catalog),
        DagNode("060.render-review", ("030.extract-alpha",), review),
        DagNode(
            "070.validate",
            ("040.integrate-xcassets", "050.write-catalog", "060.render-review"),
            validate,
        ),
    ]
    records = []
    outputs: dict[str, dict[str, Any]] = {}
    for node in topological_order(nodes):
        result = node.operation(context)
        outputs[node.node_id] = result
        input_digest = sha256_bytes(
            canonical_json(
                {
                    "pipelineVersion": PIPELINE_VERSION,
                    "node": node.node_id,
                    "dependencyOutputs": {
                        dependency: outputs[dependency]
                        for dependency in node.dependencies
                    },
                    "specSha256": sha256_file(SPEC_PATH),
                }
            )
        )
        records.append(
            {
                "node": node.node_id,
                "dependencies": list(node.dependencies),
                "inputDigest": input_digest,
                "status": "completed",
                "output": result,
            }
        )
        print(
            json.dumps(
                {
                    "event": "cozy-room.dag.node.completed",
                    "node": node.node_id,
                    "output": result,
                },
                separators=(",", ":"),
            )
        )
    run_record = {
        "schemaVersion": 1,
        "pipeline": "cozy-room-edge-extraction",
        "pipelineVersion": PIPELINE_VERSION,
        "specSha256": sha256_file(SPEC_PATH),
        "nodes": records,
        "edges": [
            {"from": dependency, "to": node.node_id}
            for node in nodes
            for dependency in node.dependencies
        ],
        "status": "completed",
    }
    write_json(EVIDENCE_ROOT / "dag-run.json", run_record)
    return run_record


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument(
        "--source",
        type=Path,
        action="append",
        default=[],
        help="Source atlas path, repeated exactly four times in sheet order",
    )
    return value


def main() -> int:
    args = parser().parse_args()
    try:
        if args.source:
            import_sources(args.source)
        missing = [name for name in SHEET_NAMES if not (SOURCE_ROOT / name).is_file()]
        if missing:
            raise PipelineError(
                "Missing imported source sheets: "
                + ", ".join(missing)
                + ". Supply four ordered --source arguments."
            )
        run = run_pipeline()
        print(
            json.dumps(
                {
                    "event": "cozy-room.dag.completed",
                    "status": run["status"],
                    "assetCount": 66,
                    "manifest": str(MANIFEST_PATH.relative_to(REPO_ROOT)),
                },
                separators=(",", ":"),
            )
        )
        return 0
    except (PipelineError, OSError, ValueError, cv2.error) as error:
        print(
            json.dumps(
                {
                    "event": "cozy-room.dag.failed",
                    "errorType": type(error).__name__,
                    "message": str(error),
                },
                separators=(",", ":"),
            ),
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
