#!/usr/bin/env python3
"""Generate procedural humanoid motion data based on biomechanical principles.

This creates placeholder animations that approximate typical mocap patterns
without requiring actual FBX/BVH files. Useful for development and testing.

The procedural animations are based on:
- Standard walk/run gait cycles
- Biomechanical joint angle ranges
- Natural motion timing patterns

Usage:
    python generate_procedural_motion.py --clip idle
    python generate_procedural_motion.py --clip walk
    python generate_procedural_motion.py --clip run
    python generate_procedural_motion.py --all

These serve as functional placeholders until real mocap data is imported.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ANIMATIONS_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "animations"

RIG_FAMILY = "abbiesworld.humanoid.child.v1"


def sine_ease(t: float, phase: float = 0) -> float:
    """Smooth sinusoidal easing."""
    return math.sin((t + phase) * math.pi * 2)


def generate_keyframes(
    duration: float,
    func,
    num_keyframes: int = 12,
) -> list[dict]:
    """Generate keyframes from a function."""
    keyframes = []
    for i in range(num_keyframes):
        t = i / (num_keyframes - 1)
        time = round(t * duration, 3)
        value = round(func(t), 2)
        keyframes.append({"time": time, "value": value})
    return keyframes


def generate_idle() -> dict:
    """Generate subtle idle breathing animation."""
    duration = 2.4
    
    def torso_rotation(t): return sine_ease(t, 0) * 1.5
    def torso_scale(t): return 1.0 + sine_ease(t, 0) * 0.008
    def head_rotation(t): return sine_ease(t, 0.1) * 2.0
    def head_y(t): return sine_ease(t, 0) * 2
    def arm_left(t): return sine_ease(t, 0.2) * 1.5
    def arm_right(t): return sine_ease(t, 0.2) * -1.5
    def hair_front(t): return sine_ease(t, 0.15) * 1.0
    def hair_back(t): return sine_ease(t, 0.25) * -0.8
    
    return {
        "schemaVersion": 1,
        "name": "idle",
        "rigFamily": RIG_FAMILY,
        "duration": duration,
        "loop": True,
        "tracks": {
            "torso.rotation": {
                "keyframes": generate_keyframes(duration, torso_rotation, 8),
                "interpolation": "ease-in-out"
            },
            "head.rotation": {
                "keyframes": generate_keyframes(duration, head_rotation, 8),
                "interpolation": "ease-in-out"
            },
            "head.y": {
                "keyframes": generate_keyframes(duration, head_y, 8),
                "interpolation": "ease-in-out"
            },
            "upper_arm_left.rotation": {
                "keyframes": generate_keyframes(duration, arm_left, 6),
                "interpolation": "ease-in-out"
            },
            "upper_arm_right.rotation": {
                "keyframes": generate_keyframes(duration, arm_right, 6),
                "interpolation": "ease-in-out"
            },
            "hair_front.rotation": {
                "keyframes": generate_keyframes(duration, hair_front, 6),
                "interpolation": "ease-in-out"
            },
            "hair_back.rotation": {
                "keyframes": generate_keyframes(duration, hair_back, 6),
                "interpolation": "ease-in-out"
            },
        },
        "provenance": {
            "source": "procedural",
            "generator": "generate_procedural_motion.py",
            "template": "idle_breathing",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "rigFamily": RIG_FAMILY,
        }
    }


def generate_walk() -> dict:
    """Generate walk cycle based on standard gait biomechanics."""
    duration = 0.8
    
    def root_y(t):
        return 8 + math.sin(t * math.pi * 4) * 6
    
    def torso_rotation(t):
        return math.sin(t * math.pi * 2) * 4
    
    def head_rotation(t):
        return math.sin(t * math.pi * 2 + 0.2) * -2
    
    def thigh_left(t):
        return math.sin(t * math.pi * 2) * 28
    
    def shin_left(t):
        base = math.sin(t * math.pi * 2 + 0.3)
        return max(0, base) * 45
    
    def foot_left(t):
        return math.sin(t * math.pi * 2 + 0.5) * 15
    
    def thigh_right(t):
        return math.sin(t * math.pi * 2 + math.pi) * 28
    
    def shin_right(t):
        base = math.sin(t * math.pi * 2 + math.pi + 0.3)
        return max(0, base) * 45
    
    def foot_right(t):
        return math.sin(t * math.pi * 2 + math.pi + 0.5) * 15
    
    def arm_left(t):
        return math.sin(t * math.pi * 2 + math.pi) * 22
    
    def forearm_left(t):
        return 15 + math.sin(t * math.pi * 2 + math.pi + 0.2) * 10
    
    def arm_right(t):
        return math.sin(t * math.pi * 2) * 22
    
    def forearm_right(t):
        return -15 + math.sin(t * math.pi * 2 + 0.2) * -10
    
    def hair_front(t):
        return math.sin(t * math.pi * 4 + 0.3) * 2
    
    def hair_back(t):
        return math.sin(t * math.pi * 4 + 0.5) * -2
    
    return {
        "schemaVersion": 1,
        "name": "walk",
        "rigFamily": RIG_FAMILY,
        "duration": duration,
        "loop": True,
        "tracks": {
            "root.y": {
                "keyframes": generate_keyframes(duration, root_y, 12),
                "interpolation": "ease-in-out"
            },
            "torso.rotation": {
                "keyframes": generate_keyframes(duration, torso_rotation, 8),
                "interpolation": "ease-in-out"
            },
            "head.rotation": {
                "keyframes": generate_keyframes(duration, head_rotation, 8),
                "interpolation": "ease-in-out"
            },
            "thigh_left.rotation": {
                "keyframes": generate_keyframes(duration, thigh_left, 12),
                "interpolation": "ease-in-out"
            },
            "shin_left.rotation": {
                "keyframes": generate_keyframes(duration, shin_left, 12),
                "interpolation": "ease-in-out"
            },
            "foot_left.rotation": {
                "keyframes": generate_keyframes(duration, foot_left, 8),
                "interpolation": "ease-in-out"
            },
            "thigh_right.rotation": {
                "keyframes": generate_keyframes(duration, thigh_right, 12),
                "interpolation": "ease-in-out"
            },
            "shin_right.rotation": {
                "keyframes": generate_keyframes(duration, shin_right, 12),
                "interpolation": "ease-in-out"
            },
            "foot_right.rotation": {
                "keyframes": generate_keyframes(duration, foot_right, 8),
                "interpolation": "ease-in-out"
            },
            "upper_arm_left.rotation": {
                "keyframes": generate_keyframes(duration, arm_left, 8),
                "interpolation": "ease-in-out"
            },
            "forearm_left.rotation": {
                "keyframes": generate_keyframes(duration, forearm_left, 8),
                "interpolation": "ease-in-out"
            },
            "upper_arm_right.rotation": {
                "keyframes": generate_keyframes(duration, arm_right, 8),
                "interpolation": "ease-in-out"
            },
            "forearm_right.rotation": {
                "keyframes": generate_keyframes(duration, forearm_right, 8),
                "interpolation": "ease-in-out"
            },
            "hair_front.rotation": {
                "keyframes": generate_keyframes(duration, hair_front, 8),
                "interpolation": "ease-in-out"
            },
            "hair_back.rotation": {
                "keyframes": generate_keyframes(duration, hair_back, 8),
                "interpolation": "ease-in-out"
            },
        },
        "provenance": {
            "source": "procedural",
            "generator": "generate_procedural_motion.py",
            "template": "walk_gait_cycle",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "rigFamily": RIG_FAMILY,
        }
    }


def generate_run() -> dict:
    """Generate run cycle based on running biomechanics."""
    duration = 0.5
    
    def root_y(t):
        return 15 + math.sin(t * math.pi * 4) * 12
    
    def torso_rotation(t):
        return math.sin(t * math.pi * 2) * 6 + 5
    
    def head_rotation(t):
        return math.sin(t * math.pi * 2 + 0.2) * -3
    
    def thigh_left(t):
        return math.sin(t * math.pi * 2) * 40
    
    def shin_left(t):
        base = math.sin(t * math.pi * 2 + 0.25)
        return max(0, base) * 70
    
    def foot_left(t):
        return math.sin(t * math.pi * 2 + 0.4) * 25
    
    def thigh_right(t):
        return math.sin(t * math.pi * 2 + math.pi) * 40
    
    def shin_right(t):
        base = math.sin(t * math.pi * 2 + math.pi + 0.25)
        return max(0, base) * 70
    
    def foot_right(t):
        return math.sin(t * math.pi * 2 + math.pi + 0.4) * 25
    
    def arm_left(t):
        return math.sin(t * math.pi * 2 + math.pi) * 35
    
    def forearm_left(t):
        return 30 + math.sin(t * math.pi * 2 + math.pi + 0.15) * 20
    
    def arm_right(t):
        return math.sin(t * math.pi * 2) * 35
    
    def forearm_right(t):
        return -30 + math.sin(t * math.pi * 2 + 0.15) * -20
    
    def hair_front(t):
        return math.sin(t * math.pi * 4 + 0.2) * 4 - 3
    
    def hair_back(t):
        return math.sin(t * math.pi * 4 + 0.4) * -4 + 5
    
    return {
        "schemaVersion": 1,
        "name": "run",
        "rigFamily": RIG_FAMILY,
        "duration": duration,
        "loop": True,
        "tracks": {
            "root.y": {
                "keyframes": generate_keyframes(duration, root_y, 12),
                "interpolation": "ease-in-out"
            },
            "torso.rotation": {
                "keyframes": generate_keyframes(duration, torso_rotation, 8),
                "interpolation": "ease-in-out"
            },
            "head.rotation": {
                "keyframes": generate_keyframes(duration, head_rotation, 8),
                "interpolation": "ease-in-out"
            },
            "thigh_left.rotation": {
                "keyframes": generate_keyframes(duration, thigh_left, 12),
                "interpolation": "ease-in-out"
            },
            "shin_left.rotation": {
                "keyframes": generate_keyframes(duration, shin_left, 12),
                "interpolation": "ease-in-out"
            },
            "foot_left.rotation": {
                "keyframes": generate_keyframes(duration, foot_left, 10),
                "interpolation": "ease-in-out"
            },
            "thigh_right.rotation": {
                "keyframes": generate_keyframes(duration, thigh_right, 12),
                "interpolation": "ease-in-out"
            },
            "shin_right.rotation": {
                "keyframes": generate_keyframes(duration, shin_right, 12),
                "interpolation": "ease-in-out"
            },
            "foot_right.rotation": {
                "keyframes": generate_keyframes(duration, foot_right, 10),
                "interpolation": "ease-in-out"
            },
            "upper_arm_left.rotation": {
                "keyframes": generate_keyframes(duration, arm_left, 10),
                "interpolation": "ease-in-out"
            },
            "forearm_left.rotation": {
                "keyframes": generate_keyframes(duration, forearm_left, 10),
                "interpolation": "ease-in-out"
            },
            "upper_arm_right.rotation": {
                "keyframes": generate_keyframes(duration, arm_right, 10),
                "interpolation": "ease-in-out"
            },
            "forearm_right.rotation": {
                "keyframes": generate_keyframes(duration, forearm_right, 10),
                "interpolation": "ease-in-out"
            },
            "hair_front.rotation": {
                "keyframes": generate_keyframes(duration, hair_front, 8),
                "interpolation": "ease-in-out"
            },
            "hair_back.rotation": {
                "keyframes": generate_keyframes(duration, hair_back, 8),
                "interpolation": "ease-in-out"
            },
        },
        "provenance": {
            "source": "procedural",
            "generator": "generate_procedural_motion.py",
            "template": "run_gait_cycle",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "rigFamily": RIG_FAMILY,
        }
    }


CLIP_GENERATORS = {
    "idle": generate_idle,
    "walk": generate_walk,
    "run": generate_run,
}


def main():
    parser = argparse.ArgumentParser(
        description="Generate procedural humanoid animation clips"
    )
    parser.add_argument("--clip", choices=list(CLIP_GENERATORS.keys()),
                       help="Specific clip to generate")
    parser.add_argument("--all", action="store_true",
                       help="Generate all available clips")
    parser.add_argument("--output-dir", type=Path, default=ANIMATIONS_DIR,
                       help="Output directory for animation files")
    args = parser.parse_args()
    
    if not args.clip and not args.all:
        parser.print_help()
        return
    
    args.output_dir.mkdir(parents=True, exist_ok=True)
    
    clips_to_generate = list(CLIP_GENERATORS.keys()) if args.all else [args.clip]
    
    for clip_name in clips_to_generate:
        print(f"Generating {clip_name}...")
        
        generator = CLIP_GENERATORS[clip_name]
        animation = generator()
        
        output_path = args.output_dir / f"{clip_name}.json"
        output_path.write_text(
            json.dumps(animation, indent=2) + "\n",
            encoding="utf-8"
        )
        
        track_count = len(animation["tracks"])
        keyframe_count = sum(
            len(t["keyframes"]) for t in animation["tracks"].values()
        )
        
        print(f"  Duration: {animation['duration']}s")
        print(f"  Tracks: {track_count}")
        print(f"  Keyframes: {keyframe_count}")
        print(f"  Output: {output_path}")
    
    print("\nDone!")


if __name__ == "__main__":
    main()
