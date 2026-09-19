"""Blender script to extract bone transforms from FBX/BVH files.

This script is executed by Blender in headless mode. It extracts skeletal
animation data and outputs it as JSON for the motion import pipeline.

Usage (called by import_humanoid_motion.py):
    blender --background --python blender_extract_motion.py -- \
        --input animation.fbx \
        --output extracted.json \
        --fps 30

Do NOT run this directly - use import_humanoid_motion.py instead.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector


COMMON_BONE_MAPPINGS = {
    "mixamorig:Hips": "hips",
    "mixamorig:Spine": "spine",
    "mixamorig:Spine1": "spine1",
    "mixamorig:Spine2": "spine2",
    "mixamorig:Neck": "neck",
    "mixamorig:Head": "head",
    "mixamorig:LeftShoulder": "shoulder_left",
    "mixamorig:LeftArm": "upper_arm_left",
    "mixamorig:LeftForeArm": "forearm_left",
    "mixamorig:LeftHand": "hand_left",
    "mixamorig:RightShoulder": "shoulder_right",
    "mixamorig:RightArm": "upper_arm_right",
    "mixamorig:RightForeArm": "forearm_right",
    "mixamorig:RightHand": "hand_right",
    "mixamorig:LeftUpLeg": "thigh_left",
    "mixamorig:LeftLeg": "shin_left",
    "mixamorig:LeftFoot": "foot_left",
    "mixamorig:LeftToeBase": "toe_left",
    "mixamorig:RightUpLeg": "thigh_right",
    "mixamorig:RightLeg": "shin_right",
    "mixamorig:RightFoot": "foot_right",
    "mixamorig:RightToeBase": "toe_right",
    
    "Hips": "hips",
    "Spine": "spine",
    "Spine1": "spine1",
    "Spine2": "spine2",
    "Neck": "neck",
    "Head": "head",
    "LeftShoulder": "shoulder_left",
    "LeftArm": "upper_arm_left",
    "LeftForeArm": "forearm_left",
    "LeftHand": "hand_left",
    "RightShoulder": "shoulder_right",
    "RightArm": "upper_arm_right",
    "RightForeArm": "forearm_right",
    "RightHand": "hand_right",
    "LeftUpLeg": "thigh_left",
    "LeftLeg": "shin_left",
    "LeftFoot": "foot_left",
    "LeftToeBase": "toe_left",
    "RightUpLeg": "thigh_right",
    "RightLeg": "shin_right",
    "RightFoot": "foot_right",
    "RightToeBase": "toe_right",
    
    "hip": "hips",
    "abdomen": "spine",
    "chest": "spine2",
    "lCollar": "shoulder_left",
    "lShldr": "upper_arm_left",
    "lForeArm": "forearm_left",
    "lHand": "hand_left",
    "rCollar": "shoulder_right",
    "rShldr": "upper_arm_right",
    "rForeArm": "forearm_right",
    "rHand": "hand_right",
    "lThigh": "thigh_left",
    "lShin": "shin_left",
    "lFoot": "foot_left",
    "rThigh": "thigh_right",
    "rShin": "shin_right",
    "rFoot": "foot_right",
}


def normalize_bone_name(name: str) -> str:
    """Map various skeleton naming conventions to our canonical names."""
    if name in COMMON_BONE_MAPPINGS:
        return COMMON_BONE_MAPPINGS[name]
    
    lower = name.lower()
    for source, target in COMMON_BONE_MAPPINGS.items():
        if source.lower() == lower:
            return target
    
    return name.lower().replace(" ", "_").replace(":", "_")


def get_armature():
    """Find the armature object in the scene."""
    for obj in bpy.data.objects:
        if obj.type == 'ARMATURE':
            return obj
    return None


def extract_bone_transforms(armature, frame: int) -> dict:
    """Extract world-space transforms for all bones at a given frame."""
    bpy.context.scene.frame_set(frame)
    
    transforms = {}
    
    for bone in armature.pose.bones:
        canonical_name = normalize_bone_name(bone.name)
        
        matrix_world = armature.matrix_world @ bone.matrix
        
        location = matrix_world.to_translation()
        rotation = matrix_world.to_euler('XYZ')
        
        if bone.parent:
            parent_matrix = armature.matrix_world @ bone.parent.matrix
            local_matrix = parent_matrix.inverted() @ matrix_world
            local_rotation = local_matrix.to_euler('XYZ')
        else:
            local_rotation = rotation
        
        transforms[canonical_name] = {
            "original_name": bone.name,
            "world_position": [location.x, location.y, location.z],
            "world_rotation": [math.degrees(rotation.x), 
                              math.degrees(rotation.y), 
                              math.degrees(rotation.z)],
            "local_rotation": [math.degrees(local_rotation.x),
                              math.degrees(local_rotation.y),
                              math.degrees(local_rotation.z)],
            "parent": normalize_bone_name(bone.parent.name) if bone.parent else None,
        }
    
    return transforms


def extract_animation(input_path: str, target_fps: int = 30) -> dict:
    """Extract complete animation from FBX/BVH file."""
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    ext = Path(input_path).suffix.lower()
    if ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=input_path)
    elif ext == '.bvh':
        bpy.ops.import_anim.bvh(filepath=input_path)
    else:
        raise ValueError(f"Unsupported format: {ext}")
    
    armature = get_armature()
    if not armature:
        raise RuntimeError("No armature found in file")
    
    scene = bpy.context.scene
    
    action = None
    if armature.animation_data and armature.animation_data.action:
        action = armature.animation_data.action
    
    if action:
        frame_start = int(action.frame_range[0])
        frame_end = int(action.frame_range[1])
    else:
        frame_start = scene.frame_start
        frame_end = scene.frame_end
    
    source_fps = scene.render.fps
    
    bone_names = set()
    skeleton_hierarchy = {}
    for bone in armature.pose.bones:
        canonical = normalize_bone_name(bone.name)
        bone_names.add(canonical)
        skeleton_hierarchy[canonical] = {
            "original_name": bone.name,
            "parent": normalize_bone_name(bone.parent.name) if bone.parent else None,
        }
    
    frames = []
    frame_count = frame_end - frame_start + 1
    
    sample_interval = max(1, int(source_fps / target_fps))
    
    for frame in range(frame_start, frame_end + 1, sample_interval):
        transforms = extract_bone_transforms(armature, frame)
        time = (frame - frame_start) / source_fps
        frames.append({
            "frame": frame,
            "time": round(time, 4),
            "bones": transforms,
        })
    
    duration = (frame_end - frame_start) / source_fps
    
    return {
        "schemaVersion": 1,
        "source": {
            "file": Path(input_path).name,
            "format": ext[1:].upper(),
            "sourceFPS": source_fps,
            "targetFPS": target_fps,
            "frameStart": frame_start,
            "frameEnd": frame_end,
            "frameCount": frame_count,
            "sampledFrames": len(frames),
        },
        "skeleton": skeleton_hierarchy,
        "boneNames": sorted(bone_names),
        "duration": round(duration, 4),
        "frames": frames,
    }


def main():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input FBX/BVH file")
    parser.add_argument("--output", required=True, help="Output JSON file")
    parser.add_argument("--fps", type=int, default=30, help="Target sample rate")
    args = parser.parse_args(argv)
    
    print(f"Extracting motion from: {args.input}")
    
    result = extract_animation(args.input, args.fps)
    
    Path(args.output).write_text(
        json.dumps(result, indent=2) + "\n",
        encoding="utf-8"
    )
    
    print(f"Extracted {len(result['frames'])} frames, {len(result['boneNames'])} bones")
    print(f"Duration: {result['duration']}s")
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()
