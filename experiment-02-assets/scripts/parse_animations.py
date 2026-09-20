#!/usr/bin/env python3
"""Parse Unity animation files and convert to JSON for web playback."""

import re
import json
from pathlib import Path

ANIM_DIR = Path(__file__).parent.parent / "animations"
OUTPUT_DIR = Path(__file__).parent.parent / "lab-page" / "public"

def parse_unity_anim(filepath):
    """Parse a Unity .anim YAML file and extract animation data."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    animation = {
        "name": filepath.stem.replace("_abbie", ""),
        "duration": 0,
        "curves": {}
    }
    
    # Find all euler curves (rotation data)
    euler_pattern = r'- curve:\s+serializedVersion: 2\s+m_Curve:(.*?)m_PreInfinity.*?path: ([^\n]+)'
    matches = re.findall(euler_pattern, content, re.DOTALL)
    
    for curve_data, path in matches:
        path = path.strip()
        if not path or path.isdigit():
            continue
            
        # Parse keyframes
        keyframe_pattern = r'time: ([\d.]+)\s+value: \{x: ([-\d.]+), y: ([-\d.]+), z: ([-\d.]+)\}'
        keyframes = re.findall(keyframe_pattern, curve_data)
        
        if keyframes:
            animation["curves"][path] = {
                "type": "rotation",
                "keyframes": []
            }
            
            for time, x, y, z in keyframes:
                t = float(time)
                animation["curves"][path]["keyframes"].append({
                    "time": t,
                    "rotation": float(z)  # Z rotation for 2D
                })
                animation["duration"] = max(animation["duration"], t)
    
    # Find position curves
    pos_section = re.search(r'm_PositionCurves:(.*?)m_ScaleCurves:', content, re.DOTALL)
    if pos_section:
        pos_content = pos_section.group(1)
        pos_pattern = r'- curve:\s+serializedVersion: 2\s+m_Curve:(.*?)m_PreInfinity.*?path: ([^\n]+)'
        pos_matches = re.findall(pos_pattern, pos_content, re.DOTALL)
        
        for curve_data, path in pos_matches:
            path = path.strip()
            if not path or path.isdigit():
                continue
                
            keyframe_pattern = r'time: ([\d.]+)\s+value: \{x: ([-\d.]+), y: ([-\d.]+), z: ([-\d.]+)\}'
            keyframes = re.findall(keyframe_pattern, curve_data)
            
            if keyframes:
                if path not in animation["curves"]:
                    animation["curves"][path] = {"keyframes": []}
                
                animation["curves"][path]["type"] = "position"
                animation["curves"][path]["position_keyframes"] = []
                
                for time, x, y, z in keyframes:
                    t = float(time)
                    animation["curves"][path]["position_keyframes"].append({
                        "time": t,
                        "x": float(x),
                        "y": float(y)
                    })
    
    return animation

def simplify_path(path):
    """Convert Unity hierarchy path to simple part name."""
    # Map Unity paths to our asset names
    path_map = {
        "body_lower/leg_upper_left": "leg_upper",
        "body_lower/leg_upper_left/leg_lower": "leg_lower", 
        "body_lower/leg_upper_left/leg_lower/leg_foot": "leg_foot",
        "body_lower/leg_upper_right": "leg_upper_right",
        "body_lower/leg_upper_right/leg_lower": "leg_lower_right",
        "body_lower/leg_upper_right/leg_lower/leg_foot": "leg_foot_right",
        "body_lower/body_middle": "body_middle",
        "body_lower/body_middle/body_upper": "body_upper",
        "body_lower/body_middle/body_upper/arm_upper_left": "arm_upper",
        "body_lower/body_middle/body_upper/arm_upper_left/arm_lower": "arm_lower",
        "body_lower/body_middle/body_upper/arm_upper_right": "arm_upper_right",
        "body_lower/body_middle/body_upper/arm_upper_right/arm_lower": "arm_lower_right",
        "body_lower/body_middle/body_upper/head": "head",
        "body_lower/body_middle/body_upper/head/hair_1": "head_hair_front_1",
        "body_lower/body_middle/body_upper/head/hair_2": "head_hair_front_2",
        "body_lower/body_middle/body_upper/head/hair_3": "head_hair_back",
        "body_lower/body_middle/body_upper/head/hair_4": "head_hair_back",
        "body_lower/skirt": "body_lower_front",
        "body_lower/skirt/back": "body_lower_back",
        "body_lower": "body_lower_front",
    }
    return path_map.get(path, path.split("/")[-1])

def main():
    all_animations = {}
    
    for anim_file in ANIM_DIR.glob("*.anim"):
        print(f"Parsing {anim_file.name}...")
        anim = parse_unity_anim(anim_file)
        
        # Simplify paths for web use
        simplified_curves = {}
        for path, data in anim["curves"].items():
            simple_name = simplify_path(path)
            simplified_curves[simple_name] = data
        
        anim["curves"] = simplified_curves
        all_animations[anim["name"]] = anim
        
        print(f"  Duration: {anim['duration']}s")
        print(f"  Curves: {len(anim['curves'])}")
    
    # Write combined JSON
    output_file = OUTPUT_DIR / "animations.json"
    with open(output_file, 'w') as f:
        json.dump(all_animations, f, indent=2)
    
    print(f"\nSaved to {output_file}")
    print(f"Total animations: {len(all_animations)}")
    
    # Print summary
    for name, anim in all_animations.items():
        print(f"\n{name}:")
        print(f"  Duration: {anim['duration']}s")
        for part, data in list(anim['curves'].items())[:5]:
            print(f"  - {part}: {len(data.get('keyframes', []))} keyframes")

if __name__ == "__main__":
    main()
