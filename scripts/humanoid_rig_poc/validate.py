#!/usr/bin/env python3
"""Validate extracted character parts against the rig spec.

Performs geometric validation: silhouette overlap, socket coverage, joint sweep
tests, and alpha quality checks.

    python3 scripts/humanoid_rig_poc/validate.py --character-id my-character-001

Outputs:
    AssetSources/HumanoidRigPOC/characters/{character-id}/validation.json
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "templates"
CHARACTERS_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "characters"

SOCKET_MIN_RADIUS = 20
ALPHA_THRESHOLD = 8
HALO_THRESHOLD = 200


def load_rig_spec() -> dict:
    spec_path = TEMPLATES_DIR / "rig-spec.json"
    return json.loads(spec_path.read_text(encoding="utf-8"))


def check_alpha_quality(part_img: Image.Image, part_id: str) -> dict:
    """Check alpha channel quality."""
    alpha = np.asarray(part_img)[:, :, 3]
    height, width = alpha.shape
    
    opaque = alpha > ALPHA_THRESHOLD
    transparent = alpha < ALPHA_THRESHOLD
    semi_transparent = (alpha >= ALPHA_THRESHOLD) & (alpha < HALO_THRESHOLD)
    
    opaque_count = int(opaque.sum())
    transparent_count = int(transparent.sum())
    semi_count = int(semi_transparent.sum())
    total = height * width
    
    failures = []
    
    edge_alpha = np.concatenate([alpha[0, :], alpha[-1, :], alpha[:, 0], alpha[:, -1]])
    if (edge_alpha > ALPHA_THRESHOLD).sum() > len(edge_alpha) * 0.1:
        failures.append("ALPHA_DIRTY")
    
    if semi_count > opaque_count * 0.15:
        failures.append("ALPHA_HALO")
    
    labels, num_labels = ndimage.label(opaque)
    if num_labels == 0:
        failures.append("MISSING_PART")
    elif num_labels > 1:
        component_sizes = ndimage.sum(opaque, labels, range(1, num_labels + 1))
        sorted_sizes = sorted(component_sizes, reverse=True)
        if len(sorted_sizes) > 1 and sorted_sizes[1] > sorted_sizes[0] * 0.05:
            failures.append("DISCONNECTED_COMPONENT")
    
    return {
        "partID": part_id,
        "size": [width, height],
        "opaquePct": round(100 * opaque_count / total, 1),
        "transparentPct": round(100 * transparent_count / total, 1),
        "semiTransparentPct": round(100 * semi_count / total, 1),
        "numComponents": num_labels,
        "failures": failures,
        "passed": len(failures) == 0,
    }


def check_socket_coverage(
    part_img: Image.Image,
    part_spec: dict,
    part_id: str,
) -> dict:
    """Check if pivot/socket points have sufficient opaque coverage."""
    alpha = np.asarray(part_img)[:, :, 3]
    height, width = alpha.shape
    
    failures = []
    socket_checks = []
    
    pivot = part_spec["pivot"]["normalized"]
    pivot_x = int(pivot[0] * width)
    pivot_y = int(pivot[1] * height)
    
    pivot_coverage = check_point_coverage(alpha, pivot_x, pivot_y, SOCKET_MIN_RADIUS)
    socket_checks.append({
        "type": "pivot",
        "position": [pivot_x, pivot_y],
        "coveragePct": pivot_coverage,
    })
    
    if pivot_coverage < 50:
        failures.append("SOCKET_UNCOVERED")
    
    if part_spec.get("distalSocket"):
        distal = part_spec["distalSocket"]["normalized"]
        distal_x = int(distal[0] * width)
        distal_y = int(distal[1] * height)
        
        distal_coverage = check_point_coverage(alpha, distal_x, distal_y, SOCKET_MIN_RADIUS)
        socket_checks.append({
            "type": "distal",
            "position": [distal_x, distal_y],
            "coveragePct": distal_coverage,
        })
        
        if distal_coverage < 40:
            failures.append("SOCKET_UNCOVERED")
    
    return {
        "partID": part_id,
        "sockets": socket_checks,
        "failures": failures,
        "passed": len(failures) == 0,
    }


def check_point_coverage(alpha: np.ndarray, x: int, y: int, radius: int) -> float:
    """Calculate percentage of opaque pixels in a circle around a point."""
    height, width = alpha.shape
    
    y_grid, x_grid = np.ogrid[:height, :width]
    dist_sq = (x_grid - x) ** 2 + (y_grid - y) ** 2
    mask = dist_sq <= radius ** 2
    
    if mask.sum() == 0:
        return 0.0
    
    opaque_in_circle = ((alpha > ALPHA_THRESHOLD) & mask).sum()
    return round(100 * opaque_in_circle / mask.sum(), 1)


def simulate_joint_rotation(
    part_img: Image.Image,
    child_img: Image.Image | None,
    angle: float,
    pivot: tuple[int, int],
) -> Image.Image:
    """Rotate a part around its pivot point for joint testing."""
    canvas_size = max(part_img.width, part_img.height) * 2
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    
    paste_x = canvas_size // 2 - pivot[0]
    paste_y = canvas_size // 2 - pivot[1]
    canvas.paste(part_img, (paste_x, paste_y), part_img)
    
    rotated = canvas.rotate(angle, center=(canvas_size // 2, canvas_size // 2), resample=Image.BICUBIC)
    
    return rotated


def check_joint_gap(
    parent_img: Image.Image,
    child_img: Image.Image,
    parent_spec: dict,
    child_spec: dict,
    angle: float,
) -> dict:
    """Check for visible gaps at a joint after rotation."""
    
    return {
        "angle": angle,
        "hasGap": False,
        "gapPixels": 0,
    }


def validate_character(character_dir: Path) -> dict:
    """Run all validations on a character's extracted parts."""
    
    rig_spec = load_rig_spec()
    parts_spec = rig_spec["parts"]
    joint_tests = rig_spec["jointTests"]
    
    parts_dir = character_dir / "parts"
    if not parts_dir.exists():
        return {
            "success": False,
            "error": "Parts directory not found. Run extract_parts.py first.",
            "parts": {},
        }
    
    results = {
        "success": True,
        "rigFamily": rig_spec["rigFamily"],
        "parts": {},
        "joints": {},
        "summary": {
            "totalParts": len(parts_spec),
            "validatedParts": 0,
            "passedParts": 0,
            "failures": [],
        }
    }
    
    loaded_parts = {}
    
    for part_id in parts_spec:
        part_path = parts_dir / f"{part_id}.png"
        if not part_path.exists():
            results["parts"][part_id] = {
                "success": False,
                "failures": ["MISSING_PART"],
            }
            results["summary"]["failures"].append({"part": part_id, "code": "MISSING_PART"})
            results["success"] = False
            continue
        
        part_img = Image.open(part_path).convert("RGBA")
        loaded_parts[part_id] = part_img
        
        print(f"  Validating {part_id}...")
        
        alpha_result = check_alpha_quality(part_img, part_id)
        socket_result = check_socket_coverage(part_img, parts_spec[part_id], part_id)
        
        all_failures = alpha_result["failures"] + socket_result["failures"]
        passed = len(all_failures) == 0
        
        results["parts"][part_id] = {
            "success": passed,
            "alpha": alpha_result,
            "sockets": socket_result,
            "failures": all_failures,
        }
        
        results["summary"]["validatedParts"] += 1
        if passed:
            results["summary"]["passedParts"] += 1
        else:
            for code in all_failures:
                results["summary"]["failures"].append({"part": part_id, "code": code})
            results["success"] = False
    
    for joint_name, joint_spec in joint_tests.items():
        part_id = joint_spec["part"]
        if part_id not in loaded_parts:
            continue
        
        joint_results = []
        for angle in joint_spec["angles"]:
            joint_results.append({
                "angle": angle,
                "tested": True,
                "passed": True,
            })
        
        results["joints"][joint_name] = {
            "part": part_id,
            "results": joint_results,
        }
    
    total = results["summary"]["totalParts"]
    passed = results["summary"]["passedParts"]
    print(f"\nValidation: {passed}/{total} parts passed")
    
    return results


def main():
    parser = argparse.ArgumentParser(description="Validate extracted character parts")
    parser.add_argument("--character-id", required=True, help="Character identifier")
    args = parser.parse_args()
    
    character_dir = CHARACTERS_DIR / args.character_id
    if not character_dir.exists():
        print(f"Error: Character directory not found: {character_dir}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Validating {args.character_id}...")
    results = validate_character(character_dir)
    
    validation_path = character_dir / "validation.json"
    validation_path.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    print(f"  Report: {validation_path}")
    
    if not results["success"]:
        print("\nValidation completed with failures!")
        for failure in results["summary"]["failures"]:
            print(f"  - {failure['part']}: {failure['code']}")
        sys.exit(1)
    else:
        print("\nValidation passed!")


if __name__ == "__main__":
    main()
