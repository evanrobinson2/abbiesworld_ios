#!/usr/bin/env python3
"""Generate the Creature Lab source boards with OpenAI's image API.

The API key must be supplied through OPENAI_API_KEY. It is never read from or
written to this repository.
"""

from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path

from openai import OpenAI


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "AssetSources" / "CreatureLab"

SHARED_DIRECTION = """
Match the reference image's premium 2D animated storybook quality while
simplifying forms for a board-game selection tile. Use confident hand-inked
dark plum outlines, layered flat color, selective cel shadows, tiny gouache
texture, expressive faces, strong silhouettes, and jewel-toned accents.
Everything must remain readable when displayed at 120 points. This is polished
production art, not clip art, emoji, 3D rendering, or a rough concept.
"""

PROMPTS = {
    "creatures": """
Create one exact 3-by-3 square sprite board with nine perfectly equal rounded
square tiles and narrow uniform ivory gutters. Every tile uses the same deep
lavender-to-periwinkle painted-paper backdrop and the exact shared art style.
Each subject fills 84 percent of its tile but stays fully inside it.

Row-major subjects:
1. fictional cheerful girl adventurer, dark curly hair, purple field jacket
2. friendly emerald baby dragon
3. cute rounded silver robot with cyan face display
4. fluffy white bunny
5. playful orange cat
6. smiling teal dinosaur, clearly different from the dragon
7. friendly mint alien with two round antennae
8. silly fuzzy purple monster
9. simple sparkling purple Creature Lab flask emblem

Keep all nine tiles visually consistent. No text, letters, labels, logos,
weapons, photorealism, 3D, overlapping tiles, duplicate subjects, or cropped
limbs. Child-safe.
""",
    "outfits": """
Create one exact 3-by-3 square sprite board with nine perfectly equal rounded
square tiles and narrow uniform ivory gutters. Every tile uses the same warm
apricot painted-paper backdrop and the exact shared art style. Show each
complete costume on the same small faceless neutral chibi dress form. Each
costume fills 84 percent of its tile but stays fully inside it.

Row-major costumes:
1. electric blue lightning racer suit, yellow bolt, goggles
2. white and blue astronaut suit, clear bubble helmet
3. midnight navy ninja outfit, soft cloth mask
4. purple starry wizard robe and pointed hat
5. bright silver knight armor and blue protective shield, no weapon
6. yellow firefighter coat and red helmet
7. teal and red superhero suit and cape
8. cheerful navy pirate coat and tricorn hat, no skull and no weapon
9. simple sparkling orange wardrobe emblem

Keep all nine tiles visually consistent. No text, letters, labels, logos,
weapons, skulls, photorealism, 3D, overlapping tiles, or cropped costumes.
Child-safe.
""",
    "buddies": """
Create one exact 3-by-3 square sprite board with nine perfectly equal rounded
square tiles and narrow uniform ivory gutters. Every tile uses the same fresh
mint painted-paper backdrop and the exact shared art style. Each baby companion
fills 84 percent of its tile but stays fully inside it.

Row-major companions:
1. tiny friendly purple bat
2. playful cheetah cub
3. happy golden puppy
4. wise round tawny owl
5. tiny pastel unicorn foal
6. colorful friendly peacock
7. cheerful green frog
8. curious red fox kit
9. simple sparkling green friendship-heart emblem

Keep all nine tiles visually consistent. No text, letters, labels, logos,
photorealism, 3D, overlapping tiles, duplicate animals, or cropped bodies.
Child-safe.
""",
    "background": """
Create a wide 3:2 background plate in the exact shared 2D animated storybook
style: a magical cozy Creature Lab built inside a giant tree observatory at
twilight. Include three glowing empty circular invention platforms, rounded
windows with stars, shelves of colorful harmless curios, purple crystals,
teal glass tubes, warm amber lamps, and an open calm center for interface
content. Put visual detail around the edges and keep the middle lower contrast.
No characters, creatures, text, letters, logos, interface elements, weapons,
photorealism, or 3D rendering. Child-safe.
""",
}

OUTPUTS = {
    "creatures": "creature-lab-creatures-2d-board.png",
    "outfits": "creature-lab-outfits-2d-board.png",
    "buddies": "creature-lab-buddies-2d-board.png",
    "background": "creature-lab-workshop-background.png",
}


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def generate(
    client: OpenAI,
    *,
    model: str,
    reference: Path,
    output: Path,
    prompt: str,
    size: str,
) -> None:
    with reference.open("rb") as image:
        response = client.images.edit(
            model=model,
            image=image,
            prompt=f"{SHARED_DIRECTION}\n\n{prompt}",
            size=size,
            quality="high",
            output_format="png",
            n=1,
        )
    encoded = response.data[0].b64_json
    if not encoded:
        raise RuntimeError(f"OpenAI returned no PNG data for {output.name}")
    output.write_bytes(base64.b64decode(encoded))
    print(
        f"creature_builder.openai_asset_ready name={output.name} "
        f"bytes={output.stat().st_size} sha256={digest(output)}",
        flush=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--model", default=os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2.5-flare")
    )
    parser.add_argument(
        "--assets",
        nargs="+",
        choices=tuple(PROMPTS),
        default=list(PROMPTS),
    )
    args = parser.parse_args()

    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is required")
    if not args.reference.is_file():
        raise SystemExit(f"Reference image not found: {args.reference}")
    args.output_dir.mkdir(parents=True, exist_ok=True)

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"], timeout=600, max_retries=2)
    metadata_path = args.output_dir / "openai-generation.json"
    records = {}
    if metadata_path.is_file():
        existing = json.loads(metadata_path.read_text(encoding="utf-8"))
        if (
            existing.get("model") == args.model
            and existing.get("referenceSHA256") == digest(args.reference)
        ):
            records.update(existing.get("assets", {}))
    for asset in args.assets:
        output = args.output_dir / OUTPUTS[asset]
        size = "1536x1024" if asset == "background" else "1024x1024"
        print(
            f"creature_builder.openai_asset_start name={output.name} "
            f"model={args.model} size={size}",
            flush=True,
        )
        generate(
            client,
            model=args.model,
            reference=args.reference,
            output=output,
            prompt=PROMPTS[asset],
            size=size,
        )
        records[asset] = {
            "filename": output.name,
            "sha256": digest(output),
            "promptSHA256": sha256(
                f"{SHARED_DIRECTION}\n\n{PROMPTS[asset]}".encode("utf-8")
            ).hexdigest(),
        }

    metadata = {
        "schemaVersion": 1,
        "provider": "OpenAI",
        "model": args.model,
        "quality": "high",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "referenceSHA256": digest(args.reference),
        "assets": records,
    }
    metadata_path.write_text(
        json.dumps(metadata, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
