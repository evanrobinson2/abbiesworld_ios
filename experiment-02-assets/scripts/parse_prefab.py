#!/usr/bin/env python3
"""Parse Unity prefab to extract skeleton configuration."""

import re
import json
import math
from pathlib import Path

PREFAB_PATH = Path(__file__).parent.parent / "extracted"
OUTPUT_PATH = Path(__file__).parent.parent / "lab-page" / "public"

# Map sprite GUIDs to filenames
SPRITE_GUIDS = {
    "050060e73d83618458234d3feb41c54e": "arm_hand_close_1.png",
    "064888e6efb98b44c9b4095ebea80428": "wand_1.png",
    "0f43aff71f14a86499e6d7acc2ba7a76": "head_hair_back.png",
    "327869915f46cff44a5453ee00188021": "leg_upper.png",
    "340d521b6fcb280489770214144dbcd3": "body_upper.png",
    "35e218353a7e53b42a1234b43282c087": "leg_lower.png",
    "3a8c89fb8d4d34348bb0ce2eb77afefb": "leg_foot.png",
    "40e2a8edee778274b82d858f1e788b08": "head_3.png",
    "6bbefd9e9fe314548b08d28a8eb61011": "body_lower_front.png",
    "70fc94653da34c94f83d66402c832f5d": "head_hair_front_1.png",
    "8e427d91814249d4f880a447f28b5ead": "arm_lower.png",
    "ba5d9a73bf9d71544b787d222bd0d278": "wand_4.png",
    "bec3f986bf1ba664886d4056c4b5bfde": "head_1.png",
    "c2515c07853b9c04a81a472019ed0281": "body_middle.png",
    "c51b209f67352e44ca1d04fe7dea0838": "arm_hand_close_2.png",
    "c54df44d5d7ad4a48afa172cbd5946e5": "wand_2.png",
    "c8586749bbfd6e54c9f224a23ec0d769": "head_hair_front_2.png",
    "c997c7f4c2a2e03439faacf30aa9beff": "head_2.png",
    "d11f48038e5de164c9a4ec4e8729a0e8": "body_lower_back.png",
    "f31a9a6fc5e7cbe4caf28b210e62498f": "wand_3.png",
    "f77e49604b3651e4caf126fc0282db3f": "arm_hand_open_1.png",
    "fbd337c2c05da944eb36effbae5b5b17": "arm_upper.png",
}

def quat_to_euler_z(x, y, z, w):
    """Convert quaternion to Z euler angle in degrees."""
    siny_cosp = 2 * (w * z + x * y)
    cosy_cosp = 1 - 2 * (y * y + z * z)
    return math.degrees(math.atan2(siny_cosp, cosy_cosp))

def parse_prefab():
    """Parse the abbie.prefab file."""
    
    # Find prefab file
    prefab_content = None
    for d in PREFAB_PATH.iterdir():
        if d.is_dir():
            pathname_file = d / "pathname"
            if pathname_file.exists():
                pathname = pathname_file.read_text().strip()
                if "abbie.prefab" in pathname:
                    prefab_content = (d / "asset").read_text()
                    print(f"Found prefab: {pathname}")
                    break
    
    if not prefab_content:
        print("Prefab not found!")
        return
    
    # Parse using regex patterns
    go_pattern = r'--- !u!1 &(\d+)\nGameObject:.*?m_Name: ([^\n]+).*?m_IsActive: (\d)'
    go_matches = re.findall(go_pattern, prefab_content, re.DOTALL)
    
    game_objects = {}
    for file_id, name, active in go_matches:
        game_objects[file_id] = {"name": name.strip(), "active": active == "1"}
    
    print(f"Found {len(game_objects)} GameObjects")
    
    # Find all Transforms
    tf_pattern = r'--- !u!4 &(\d+)\nTransform:.*?m_GameObject: \{fileID: (\d+)\}.*?m_LocalRotation: \{x: ([-\d.e]+), y: ([-\d.e]+), z: ([-\d.e]+), w: ([-\d.e]+)\}.*?m_LocalPosition: \{x: ([-\d.e]+), y: ([-\d.e]+), z: ([-\d.e]+)\}.*?m_LocalScale: \{x: ([-\d.e]+), y: ([-\d.e]+), z: ([-\d.e]+)\}.*?m_Father: \{fileID: (\d+)\}'
    tf_matches = re.findall(tf_pattern, prefab_content, re.DOTALL)
    
    transforms = {}
    for match in tf_matches:
        tf_id, go_id, rx, ry, rz, rw, px, py, pz, sx, sy, sz, parent = match
        transforms[tf_id] = {
            "gameObject": go_id,
            "parent": parent if parent != "0" else None,
            "position": {"x": float(px), "y": float(py), "z": float(pz)},
            "rotation": {"x": float(rx), "y": float(ry), "z": float(rz), "w": float(rw)},
            "scale": {"x": float(sx), "y": float(sy), "z": float(sz)}
        }
    
    print(f"Found {len(transforms)} Transforms")
    
    # Find all SpriteRenderers
    sr_pattern = r'--- !u!212 &\d+\nSpriteRenderer:.*?m_GameObject: \{fileID: (\d+)\}.*?m_SortingOrder: ([-\d]+).*?m_Sprite: \{fileID: \d+, guid: ([a-f0-9]+).*?m_FlipX: (\d).*?m_FlipY: (\d)'
    sr_matches = re.findall(sr_pattern, prefab_content, re.DOTALL)
    
    sprite_renderers = {}
    for go_id, order, guid, flip_x, flip_y in sr_matches:
        sprite_renderers[go_id] = {
            "sorting_order": int(order),
            "sprite_guid": guid,
            "flip_x": flip_x == "1",
            "flip_y": flip_y == "1"
        }
    
    print(f"Found {len(sprite_renderers)} SpriteRenderers")
    
    # Build GO -> Transform map
    go_to_transform = {}
    for tf_id, tf in transforms.items():
        go_to_transform[tf["gameObject"]] = tf_id
    
    # Build Transform ID -> Transform map for parent lookups
    tf_id_to_tf = transforms
    
    # Function to get full path name
    def get_path_name(go_id, visited=None):
        if visited is None:
            visited = set()
        if go_id in visited:
            return "?"
        visited.add(go_id)
        
        go = game_objects.get(go_id)
        if not go:
            return "?"
        
        tf_id = go_to_transform.get(go_id)
        if not tf_id:
            return go["name"]
        
        tf = transforms[tf_id]
        if tf["parent"]:
            parent_tf = transforms.get(tf["parent"])
            if parent_tf:
                parent_go_id = parent_tf["gameObject"]
                parent_path = get_path_name(parent_go_id, visited)
                return f"{parent_path}/{go['name']}"
        
        return go["name"]
    
    # Build skeleton with unique names
    skeleton = {}
    bone_names = {}  # Map from go_id to unique bone name
    
    # First pass: collect all bones and determine unique names
    for go_id, go in game_objects.items():
        if not go["active"]:
            continue
        
        tf_id = go_to_transform.get(go_id)
        if not tf_id:
            continue
        
        # Determine unique name based on hierarchy
        path = get_path_name(go_id)
        parts = path.split("/")
        
        # Use simplified unique name
        name = go["name"]
        
        # Handle duplicates by adding parent context
        if name in ["leg_lower", "leg_foot", "arm_lower", "hand", "1", "2", "3"]:
            # Find if this is left or right side
            if "leg_upper_right" in path or "arm_upper_right" in path:
                name = f"{name}_right"
            elif "leg_upper_left" in path or "arm_upper_left" in path:
                name = f"{name}_left"
            elif "head" in path:
                # Face sprites named 1, 2, 3
                name = f"face_{name}"
        
        # Rename confusing names
        if name == "front":
            name = "skirt_front"
        elif name == "back":
            name = "skirt_back"
        
        bone_names[go_id] = name
    
    # Second pass: build skeleton with correct parent references
    for go_id, go in game_objects.items():
        if not go["active"]:
            continue
        
        name = bone_names.get(go_id)
        if not name:
            continue
        
        tf_id = go_to_transform.get(go_id)
        if not tf_id:
            continue
        tf = transforms[tf_id]
        
        sr = sprite_renderers.get(go_id)
        
        # Calculate euler Z rotation
        rot = tf["rotation"]
        euler_z = quat_to_euler_z(rot["x"], rot["y"], rot["z"], rot["w"])
        
        # Find parent name
        parent_name = None
        if tf["parent"]:
            parent_tf = transforms.get(tf["parent"])
            if parent_tf:
                parent_go_id = parent_tf["gameObject"]
                parent_name = bone_names.get(parent_go_id)
        
        # Get sprite info
        sprite_file = None
        sorting_order = 0
        flip_x = False
        flip_y = False
        
        if sr:
            sprite_guid = sr["sprite_guid"]
            sprite_file = SPRITE_GUIDS.get(sprite_guid)
            sorting_order = sr["sorting_order"]
            flip_x = sr["flip_x"]
            flip_y = sr["flip_y"]
        
        # Skip if no sprite AND not a needed parent bone
        needed_parents = ["body_lower", "body_middle", "head", "skirt", "hand", "hand_left", "hand_right"]
        if not sprite_file and name not in needed_parents:
            continue
        
        skeleton[name] = {
            "sprite": sprite_file,
            "x": round(tf["position"]["x"], 4),
            "y": round(tf["position"]["y"], 4),
            "rotation": round(euler_z, 2),
            "scaleX": round(tf["scale"]["x"], 2),
            "scaleY": round(tf["scale"]["y"], 2),
            "sortingOrder": sorting_order,
            "flipX": flip_x,
            "flipY": flip_y,
            "parent": parent_name
        }
        
        if sprite_file:
            print(f"\n{name}:")
            print(f"  sprite: {sprite_file}")
            print(f"  pos: ({tf['position']['x']:.3f}, {tf['position']['y']:.3f})")
            print(f"  rot: {euler_z:.1f}°")
            print(f"  z: {sorting_order}")
            print(f"  parent: {parent_name}")
    
    # Save skeleton config
    output_file = OUTPUT_PATH / "skeleton.json"
    with open(output_file, "w") as f:
        json.dump(skeleton, f, indent=2)
    
    print(f"\n\nSaved {len(skeleton)} bones to {output_file}")

if __name__ == "__main__":
    parse_prefab()
