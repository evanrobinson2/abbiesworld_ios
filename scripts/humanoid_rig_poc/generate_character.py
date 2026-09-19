#!/usr/bin/env python3
"""Generate a character using reference-conditioned image generation.

Uses the canonical construction template as geometry reference and a character
appearance reference to produce artwork that conforms to the known rig.

    python3 scripts/humanoid_rig_poc/generate_character.py \
        --reference path/to/character-ref.png \
        --character-id my-character-001

Outputs:
    AssetSources/HumanoidRigPOC/characters/{character-id}/
        generated-sheet.png
        generation.json
"""

from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import sys

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "templates"
CHARACTERS_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "characters"

STYLE_DIRECTION = """
Premium 2D animated storybook quality. Confident hand-inked dark outlines,
layered flat color with selective cel shadows, tiny gouache texture, expressive
and appealing character design. Strong silhouettes, jewel-toned accents where
appropriate. Child-safe, friendly, and charming. No photorealism, no 3D
rendering, no rough concept art.
"""

GEOMETRY_CONSTRAINT_ASSEMBLED = """
CRITICAL GEOMETRY CONSTRAINTS - DO NOT VIOLATE:
- Preserve the EXACT body proportions from the construction template
- Preserve the EXACT pose (neutral T-pose with arms slightly lowered)
- Preserve the EXACT joint locations - shoulders, elbows, wrists, hips, knees, ankles
- Do NOT change the canvas size or aspect ratio
- Do NOT change the silhouette topology
- Do NOT add any background, scenery, or additional objects
- Do NOT change the camera orientation or perspective
- The character must fill the same space as the template figure
- Paint/skin the construction template - do NOT redesign the body geometry
- Treat the construction image as authoritative GEOMETRY
- Treat the character reference as authoritative APPEARANCE
"""

GEOMETRY_CONSTRAINT_EXPLODED = """
CRITICAL GEOMETRY CONSTRAINTS - DO NOT VIOLATE:
- This is an EXPLODED CHARACTER SHEET with body parts in separate cells
- Preserve the EXACT cell boundaries - each body part stays in its labeled cell
- Preserve the EXACT geometry/silhouette of each body part within its cell
- Do NOT move parts between cells or merge cells
- Do NOT add any background within cells - each cell should have flat gray background
- Do NOT change the number, size, or arrangement of cells
- Each body part must remain SEPARATE and DISTINCT
- Paint each body part to match the character reference appearance
- The top preview area should show the assembled character
- Treat the construction image as authoritative GEOMETRY and LAYOUT
- Treat the character reference as authoritative APPEARANCE
"""


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def digest_bytes(data: bytes) -> str:
    return sha256(data).hexdigest()


def generate_assembled(
    client: OpenAI,
    *,
    model: str,
    template_path: Path,
    reference_path: Path,
    output_path: Path,
    character_description: str,
) -> dict:
    """Generate using the assembled neutral pose template."""
    
    prompt = f"""
{STYLE_DIRECTION}

CHARACTER TO PAINT: {character_description}

{GEOMETRY_CONSTRAINT_ASSEMBLED}

Repaint the construction template as this character. The template shows the
exact body proportions, pose, and structure to preserve. Apply the character's
appearance (colors, clothing, features, hair) while maintaining the template's
geometry exactly.
"""
    
    with open(template_path, "rb") as img:
        response = client.images.edit(
            model=model,
            image=img,
            prompt=prompt.strip(),
            size="2048x2048",
            quality="high",
            response_format="b64_json",
            n=1,
        )
    
    encoded = response.data[0].b64_json
    if not encoded:
        raise RuntimeError("OpenAI returned no image data")
    
    image_bytes = base64.b64decode(encoded)
    output_path.write_bytes(image_bytes)
    
    return {
        "method": "assembled",
        "templateSHA256": digest(template_path),
        "outputSHA256": digest_bytes(image_bytes),
        "promptSHA256": sha256(prompt.encode("utf-8")).hexdigest(),
    }


def generate_exploded(
    client: OpenAI,
    *,
    model: str,
    template_path: Path,
    reference_path: Path,
    output_path: Path,
    character_description: str,
) -> dict:
    """Generate using the exploded sheet template."""
    
    prompt = f"""
{STYLE_DIRECTION}

CHARACTER TO PAINT: {character_description}

{GEOMETRY_CONSTRAINT_EXPLODED}

This is a character construction sheet with labeled cells for each body part.
Paint each body part cell to match the character's appearance while preserving
the exact geometric silhouette shown in each cell. The cells contain:
- HEAD, TORSO, PELVIS, HAIR BACK, HAIR FRONT
- UPPER ARM LEFT/RIGHT, FOREARM LEFT/RIGHT, HAND LEFT/RIGHT  
- THIGH LEFT/RIGHT, SHIN LEFT/RIGHT, FOOT LEFT/RIGHT

Each part should be painted as the specified character but maintain its
exact shape and position within its cell. Use flat gray background in each cell.
"""
    
    with open(template_path, "rb") as img:
        response = client.images.edit(
            model=model,
            image=img,
            prompt=prompt.strip(),
            size="2048x2048",
            quality="high",
            response_format="b64_json",
            n=1,
        )
    
    encoded = response.data[0].b64_json
    if not encoded:
        raise RuntimeError("OpenAI returned no image data")
    
    image_bytes = base64.b64decode(encoded)
    output_path.write_bytes(image_bytes)
    
    return {
        "method": "exploded",
        "templateSHA256": digest(template_path),
        "outputSHA256": digest_bytes(image_bytes),
        "promptSHA256": sha256(prompt.encode("utf-8")).hexdigest(),
    }


def main():
    parser = argparse.ArgumentParser(description="Generate a rigged character")
    parser.add_argument("--reference", type=Path, help="Character appearance reference image")
    parser.add_argument("--character-id", required=True, help="Unique character identifier")
    parser.add_argument("--description", default="", help="Character appearance description")
    parser.add_argument(
        "--method",
        choices=["assembled", "exploded", "both"],
        default="exploded",
        help="Generation method"
    )
    parser.add_argument(
        "--model",
        default=os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1")
    )
    args = parser.parse_args()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    assembled_template = TEMPLATES_DIR / "construction-template.png"
    exploded_template = TEMPLATES_DIR / "exploded-sheet.png"
    
    if not assembled_template.exists():
        print(f"Error: Construction template not found at {assembled_template}", file=sys.stderr)
        print("Run generate_template.py first.", file=sys.stderr)
        sys.exit(1)
    
    if not exploded_template.exists():
        print(f"Error: Exploded sheet not found at {exploded_template}", file=sys.stderr)
        print("Run generate_template.py first.", file=sys.stderr)
        sys.exit(1)
    
    character_dir = CHARACTERS_DIR / args.character_id
    character_dir.mkdir(parents=True, exist_ok=True)
    
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"], timeout=600, max_retries=2)
    
    description = args.description
    if not description and args.reference and args.reference.exists():
        description = f"Character shown in reference image: {args.reference.name}"
    elif not description:
        description = "A friendly child character with colorful clothing"
    
    results = {
        "schemaVersion": 1,
        "characterID": args.character_id,
        "description": description,
        "model": args.model,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "methods": {}
    }
    
    if args.reference and args.reference.exists():
        results["referenceSHA256"] = digest(args.reference)
        ref_copy = character_dir / f"reference{args.reference.suffix}"
        ref_copy.write_bytes(args.reference.read_bytes())
    
    if args.method in ("assembled", "both"):
        print(f"Generating assembled sheet for {args.character_id}...")
        output_path = character_dir / "generated-assembled.png"
        try:
            result = generate_assembled(
                client,
                model=args.model,
                template_path=assembled_template,
                reference_path=args.reference,
                output_path=output_path,
                character_description=description,
            )
            results["methods"]["assembled"] = {
                **result,
                "outputFile": output_path.name,
                "success": True,
            }
            print(f"  Saved: {output_path}")
        except Exception as e:
            results["methods"]["assembled"] = {
                "success": False,
                "error": str(e),
            }
            print(f"  Error: {e}")
    
    if args.method in ("exploded", "both"):
        print(f"Generating exploded sheet for {args.character_id}...")
        output_path = character_dir / "generated-exploded.png"
        try:
            result = generate_exploded(
                client,
                model=args.model,
                template_path=exploded_template,
                reference_path=args.reference,
                output_path=output_path,
                character_description=description,
            )
            results["methods"]["exploded"] = {
                **result,
                "outputFile": output_path.name,
                "success": True,
            }
            print(f"  Saved: {output_path}")
        except Exception as e:
            results["methods"]["exploded"] = {
                "success": False,
                "error": str(e),
            }
            print(f"  Error: {e}")
    
    generation_path = character_dir / "generation.json"
    generation_path.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    print(f"  Metadata: {generation_path}")
    
    print("\nGeneration complete!")


if __name__ == "__main__":
    main()
