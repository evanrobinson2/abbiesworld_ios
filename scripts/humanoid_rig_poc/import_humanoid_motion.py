#!/usr/bin/env python3
"""Import humanoid motion from FBX/BVH to our canonical animation format.

Converts standard mocap data (Mixamo, Rokoko, etc.) to the Abbie's World
animation JSON format by:
1. Extracting bone transforms via Blender (headless)
2. Mapping source skeleton to our canonical rig
3. Projecting 3D motion to 2D plane
4. Simplifying curves to reduce keyframes
5. Emitting portable animation JSON

Usage:
    python import_humanoid_motion.py \\
        --input walk_animation.fbx \\
        --rig abbiesworld.humanoid.child.v1 \\
        --output walk.json \\
        --name walk \\
        --loop

Requirements:
    - Blender 3.0+ installed and in PATH (or specify --blender)
    - Python packages: numpy, scipy (for curve simplification)
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from scipy.interpolate import interp1d
from scipy.ndimage import uniform_filter1d

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "templates"
ANIMATIONS_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "animations"
MOTION_SOURCES_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "motion-sources"

SOURCE_TO_RIG_MAPPING = {
    "hips": {
        "target": "root",
        "use_translation": True,
        "use_rotation": False,
    },
    "spine": {
        "target": "torso",
        "combine_with": ["spine1", "spine2"],
        "use_rotation": True,
        "rotation_axis": "z",
        "scale": 0.5,
    },
    "spine1": {"target": None},
    "spine2": {"target": None},
    "neck": {
        "target": "head",
        "combine_with": ["head"],
        "use_rotation": True,
        "rotation_axis": "z",
        "scale": 0.7,
    },
    "head": {"target": None},
    "shoulder_left": {"target": None},
    "upper_arm_left": {
        "target": "upper_arm_left",
        "use_rotation": True,
        "rotation_axis": "z",
    },
    "forearm_left": {
        "target": "forearm_left",
        "use_rotation": True,
        "rotation_axis": "z",
    },
    "hand_left": {
        "target": "hand_left",
        "use_rotation": True,
        "rotation_axis": "z",
        "optional": True,
    },
    "shoulder_right": {"target": None},
    "upper_arm_right": {
        "target": "upper_arm_right",
        "use_rotation": True,
        "rotation_axis": "z",
    },
    "forearm_right": {
        "target": "forearm_right",
        "use_rotation": True,
        "rotation_axis": "z",
    },
    "hand_right": {
        "target": "hand_right",
        "use_rotation": True,
        "rotation_axis": "z",
        "optional": True,
    },
    "thigh_left": {
        "target": "thigh_left",
        "use_rotation": True,
        "rotation_axis": "z",
    },
    "shin_left": {
        "target": "shin_left",
        "use_rotation": True,
        "rotation_axis": "z",
    },
    "foot_left": {
        "target": "foot_left",
        "use_rotation": True,
        "rotation_axis": "z",
    },
    "toe_left": {"target": None},
    "thigh_right": {
        "target": "thigh_right",
        "use_rotation": True,
        "rotation_axis": "z",
    },
    "shin_right": {
        "target": "shin_right",
        "use_rotation": True,
        "rotation_axis": "z",
    },
    "foot_right": {
        "target": "foot_right",
        "use_rotation": True,
        "rotation_axis": "z",
    },
    "toe_right": {"target": None},
}

PLANE_PROJECTIONS = {
    "front": {"forward": "Y", "up": "Z", "right": "X"},
    "side": {"forward": "X", "up": "Z", "right": "Y"},
    "top": {"forward": "Y", "up": "X", "right": "Z"},
}


def find_blender() -> str:
    """Find Blender executable."""
    candidates = [
        "blender",
        "/usr/bin/blender",
        "/Applications/Blender.app/Contents/MacOS/Blender",
        "C:\\Program Files\\Blender Foundation\\Blender\\blender.exe",
    ]
    
    for candidate in candidates:
        if shutil.which(candidate):
            return candidate
    
    raise RuntimeError(
        "Blender not found. Install Blender 3.0+ and ensure it's in PATH, "
        "or specify --blender /path/to/blender"
    )


def extract_with_blender(
    input_path: Path,
    blender_path: str,
    fps: int = 30,
) -> dict:
    """Extract bone transforms using Blender in headless mode."""
    
    script_path = Path(__file__).parent / "blender_extract_motion.py"
    
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        output_path = tmp.name
    
    try:
        cmd = [
            blender_path,
            "--background",
            "--python", str(script_path),
            "--",
            "--input", str(input_path),
            "--output", output_path,
            "--fps", str(fps),
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        
        if result.returncode != 0:
            print(f"Blender stderr: {result.stderr}", file=sys.stderr)
            raise RuntimeError(f"Blender extraction failed: {result.returncode}")
        
        return json.loads(Path(output_path).read_text())
    
    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)


def project_rotation_to_2d(
    rotation_xyz: list[float],
    plane: str,
    axis: str = "z",
) -> float:
    """Project 3D rotation to 2D plane rotation."""
    
    rx, ry, rz = rotation_xyz
    
    if plane == "front":
        if axis == "z":
            return rz
        elif axis == "x":
            return rx
    elif plane == "side":
        if axis == "z":
            return rz
        elif axis == "y":
            return ry
    
    return rz


def project_position_to_2d(
    position_xyz: list[float],
    plane: str,
) -> tuple[float, float]:
    """Project 3D position to 2D plane coordinates."""
    
    x, y, z = position_xyz
    
    proj = PLANE_PROJECTIONS[plane]
    
    if plane == "front":
        return (x, z)
    elif plane == "side":
        return (y, z)
    elif plane == "top":
        return (x, y)
    
    return (x, z)


def simplify_curve(
    times: list[float],
    values: list[float],
    threshold: float = 0.5,
    min_keyframes: int = 2,
    max_keyframes: int = 24,
) -> list[dict]:
    """Simplify animation curve by removing redundant keyframes.
    
    Uses Ramer-Douglas-Peucker algorithm adapted for time-value curves.
    """
    
    if len(times) < 2:
        return [{"time": times[0], "value": values[0]}] if times else []
    
    smoothed = uniform_filter1d(values, size=3, mode='nearest')
    
    def rdp_simplify(indices: list[int], epsilon: float) -> list[int]:
        if len(indices) < 3:
            return indices
        
        start_idx, end_idx = indices[0], indices[-1]
        start_val, end_val = smoothed[start_idx], smoothed[end_idx]
        start_time, end_time = times[start_idx], times[end_idx]
        
        max_dist = 0
        max_idx = 0
        
        for i in indices[1:-1]:
            t = (times[i] - start_time) / max(0.001, end_time - start_time)
            expected = start_val + t * (end_val - start_val)
            dist = abs(smoothed[i] - expected)
            
            if dist > max_dist:
                max_dist = dist
                max_idx = i
        
        if max_dist > epsilon:
            left = rdp_simplify([idx for idx in indices if idx <= max_idx], epsilon)
            right = rdp_simplify([idx for idx in indices if idx >= max_idx], epsilon)
            return left[:-1] + right
        else:
            return [start_idx, end_idx]
    
    indices = list(range(len(times)))
    simplified_indices = rdp_simplify(indices, threshold)
    
    while len(simplified_indices) > max_keyframes:
        threshold *= 1.5
        simplified_indices = rdp_simplify(indices, threshold)
    
    while len(simplified_indices) < min_keyframes and len(indices) >= min_keyframes:
        threshold *= 0.7
        simplified_indices = rdp_simplify(indices, threshold)
        if threshold < 0.01:
            break
    
    if 0 not in simplified_indices:
        simplified_indices = [0] + simplified_indices
    if len(times) - 1 not in simplified_indices:
        simplified_indices = simplified_indices + [len(times) - 1]
    
    simplified_indices = sorted(set(simplified_indices))
    
    return [
        {"time": round(times[i], 3), "value": round(smoothed[i], 2)}
        for i in simplified_indices
    ]


def map_motion_to_rig(
    extracted: dict,
    plane: str = "front",
    simplify_threshold: float = 1.0,
) -> dict:
    """Map extracted motion to our canonical rig format."""
    
    frames = extracted["frames"]
    duration = extracted["duration"]
    
    raw_tracks = {}
    
    for frame_data in frames:
        time = frame_data["time"]
        bones = frame_data["bones"]
        
        for source_name, mapping in SOURCE_TO_RIG_MAPPING.items():
            if source_name not in bones:
                continue
            
            target = mapping.get("target")
            if not target:
                continue
            
            bone_data = bones[source_name]
            
            if mapping.get("use_translation"):
                pos = bone_data["world_position"]
                x, y = project_position_to_2d(pos, plane)
                
                track_key = f"{target}.y"
                if track_key not in raw_tracks:
                    raw_tracks[track_key] = {"times": [], "values": []}
                raw_tracks[track_key]["times"].append(time)
                raw_tracks[track_key]["values"].append(y * 100)
            
            if mapping.get("use_rotation"):
                rotation = bone_data["local_rotation"]
                axis = mapping.get("rotation_axis", "z")
                scale = mapping.get("scale", 1.0)
                
                angle = project_rotation_to_2d(rotation, plane, axis)
                angle *= scale
                
                if mapping.get("combine_with"):
                    for combine_name in mapping["combine_with"]:
                        if combine_name in bones:
                            combine_rot = bones[combine_name]["local_rotation"]
                            combine_angle = project_rotation_to_2d(combine_rot, plane, axis)
                            angle += combine_angle * scale * 0.5
                
                track_key = f"{target}.rotation"
                if track_key not in raw_tracks:
                    raw_tracks[track_key] = {"times": [], "values": []}
                raw_tracks[track_key]["times"].append(time)
                raw_tracks[track_key]["values"].append(angle)
    
    tracks = {}
    
    for track_key, track_data in raw_tracks.items():
        times = track_data["times"]
        values = track_data["values"]
        
        if not times:
            continue
        
        value_range = max(values) - min(values) if values else 0
        threshold = max(0.5, value_range * 0.02)
        
        keyframes = simplify_curve(
            times, values,
            threshold=threshold * simplify_threshold,
            min_keyframes=4,
            max_keyframes=16,
        )
        
        if keyframes:
            tracks[track_key] = {
                "keyframes": keyframes,
                "interpolation": "ease-in-out",
            }
    
    return {
        "duration": duration,
        "tracks": tracks,
    }


def create_animation_json(
    extracted: dict,
    name: str,
    rig_family: str,
    loop: bool,
    plane: str,
    simplify_threshold: float,
    source_info: dict,
) -> dict:
    """Create the final animation JSON."""
    
    mapped = map_motion_to_rig(extracted, plane, simplify_threshold)
    
    return {
        "schemaVersion": 1,
        "name": name,
        "rigFamily": rig_family,
        "duration": round(mapped["duration"], 3),
        "loop": loop,
        "tracks": mapped["tracks"],
        "provenance": source_info,
    }


def file_hash(path: Path) -> str:
    """Calculate SHA-256 hash of a file."""
    return sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(
        description="Import humanoid motion from FBX/BVH to canonical format"
    )
    parser.add_argument("--input", "-i", type=Path, required=True,
                       help="Input FBX or BVH file")
    parser.add_argument("--output", "-o", type=Path,
                       help="Output JSON file (default: animations/{name}.json)")
    parser.add_argument("--name", "-n", required=True,
                       help="Animation name (e.g., walk, run, idle)")
    parser.add_argument("--rig", default="abbiesworld.humanoid.child.v1",
                       help="Target rig family")
    parser.add_argument("--plane", choices=["front", "side", "top"], default="front",
                       help="Projection plane for 2D")
    parser.add_argument("--loop", action="store_true",
                       help="Mark animation as looping")
    parser.add_argument("--fps", type=int, default=30,
                       help="Sample rate for extraction")
    parser.add_argument("--simplify", type=float, default=1.0,
                       help="Curve simplification threshold multiplier")
    parser.add_argument("--blender", type=str,
                       help="Path to Blender executable")
    parser.add_argument("--source", default="unknown",
                       help="Motion source (e.g., mixamo, rokoko)")
    parser.add_argument("--license", default="",
                       help="License note for provenance")
    parser.add_argument("--extract-only", action="store_true",
                       help="Only extract, don't convert")
    args = parser.parse_args()
    
    if not args.input.exists():
        print(f"Error: Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    
    blender = args.blender or find_blender()
    print(f"Using Blender: {blender}")
    
    print(f"Extracting motion from: {args.input}")
    extracted = extract_with_blender(args.input, blender, args.fps)
    
    print(f"  Source: {extracted['source']['frameCount']} frames at {extracted['source']['sourceFPS']} FPS")
    print(f"  Duration: {extracted['duration']}s")
    print(f"  Bones found: {len(extracted['boneNames'])}")
    
    if args.extract_only:
        extract_path = args.output or Path(f"{args.name}_extracted.json")
        extract_path.write_text(json.dumps(extracted, indent=2) + "\n")
        print(f"  Extracted to: {extract_path}")
        return
    
    source_info = {
        "source": args.source,
        "sourceFile": args.input.name,
        "sourceHash": file_hash(args.input),
        "licenseNote": args.license,
        "importedAt": datetime.now(timezone.utc).isoformat(),
        "projectionPlane": args.plane,
        "simplifyThreshold": args.simplify,
        "rigFamily": args.rig,
    }
    
    print(f"Converting to {args.rig} format...")
    animation = create_animation_json(
        extracted,
        name=args.name,
        rig_family=args.rig,
        loop=args.loop,
        plane=args.plane,
        simplify_threshold=args.simplify,
        source_info=source_info,
    )
    
    output_path = args.output or (ANIMATIONS_DIR / f"{args.name}.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(animation, indent=2) + "\n", encoding="utf-8")
    
    track_count = len(animation["tracks"])
    keyframe_count = sum(
        len(t["keyframes"]) for t in animation["tracks"].values()
    )
    
    print(f"  Output: {output_path}")
    print(f"  Tracks: {track_count}")
    print(f"  Total keyframes: {keyframe_count}")
    print(f"  Duration: {animation['duration']}s")
    print(f"  Loop: {animation['loop']}")
    
    MOTION_SOURCES_DIR.mkdir(parents=True, exist_ok=True)
    provenance_path = MOTION_SOURCES_DIR / f"{args.name}_provenance.json"
    provenance_path.write_text(
        json.dumps(source_info, indent=2) + "\n",
        encoding="utf-8"
    )
    print(f"  Provenance: {provenance_path}")


if __name__ == "__main__":
    main()
