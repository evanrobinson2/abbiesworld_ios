#!/usr/bin/env python3
"""
Generate a project image via OpenAI's Image API (gpt-image-2).

Requires OPENAI_API_KEY in the environment. Do not commit keys to git.
Cloud agents: add OPENAI_API_KEY as a Runtime Secret in the Cursor dashboard.
"""

from __future__ import annotations

import argparse
import base64
import os
import sys
from pathlib import Path

DEFAULT_MODEL = "gpt-image-2"
DEFAULT_SIZE = "3840x2160"  # 16:9 at ~3x 1920x1080 delivery resolution
DEFAULT_QUALITY = "high"
DEFAULT_FORMAT = "png"

STANDING_CONSTRAINTS = (
    "Late-antique 376 CE material culture only. "
    "No medieval plate armour, no mail hauberks, no fantasy, no invented ornament. "
    "Absolutely no text, lettering, numbers, captions, signatures, or watermarks."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate an image with OpenAI gpt-image-2 and save to disk."
    )
    parser.add_argument(
        "--prompt",
        required=True,
        help="Image description (standing project constraints are appended automatically).",
    )
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Absolute or relative path for the output image file.",
    )
    parser.add_argument(
        "--model",
        default=os.environ.get("OPENAI_IMAGE_MODEL", DEFAULT_MODEL),
        help=f"OpenAI image model (default: {DEFAULT_MODEL}).",
    )
    parser.add_argument(
        "--size",
        default=os.environ.get("OPENAI_IMAGE_SIZE", DEFAULT_SIZE),
        help=f"Output size WxH (default: {DEFAULT_SIZE}).",
    )
    parser.add_argument(
        "--quality",
        default=os.environ.get("OPENAI_IMAGE_QUALITY", DEFAULT_QUALITY),
        choices=["low", "medium", "high", "auto"],
        help=f"Output quality (default: {DEFAULT_QUALITY}).",
    )
    parser.add_argument(
        "--format",
        default=os.environ.get("OPENAI_IMAGE_FORMAT", DEFAULT_FORMAT),
        choices=["png", "jpeg", "webp"],
        help=f"Output format (default: {DEFAULT_FORMAT}).",
    )
    parser.add_argument(
        "--no-standing-constraints",
        action="store_true",
        help="Do not append the project's standing material-culture / no-text rules.",
    )
    return parser.parse_args()


def require_api_key() -> str:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        print(
            "ERROR: OPENAI_API_KEY is not set.\n"
            "Local:  export OPENAI_API_KEY=sk-...\n"
            "Cloud:  add OPENAI_API_KEY as a Runtime Secret at\n"
            "        https://cursor.com/dashboard/cloud-agents",
            file=sys.stderr,
        )
        sys.exit(1)
    return key


def build_prompt(user_prompt: str, include_constraints: bool) -> str:
    prompt = user_prompt.strip()
    if include_constraints:
        prompt = f"{prompt}\n\n{STANDING_CONSTRAINTS}"
    return prompt


def main() -> None:
    args = parse_args()
    require_api_key()

    try:
        from openai import OpenAI
    except ImportError:
        print(
            "ERROR: openai package not installed. Run: pip install -r requirements.txt",
            file=sys.stderr,
        )
        sys.exit(1)

    prompt = build_prompt(args.prompt, not args.no_standing_constraints)
    output_path = args.output.expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    client = OpenAI()
    result = client.images.generate(
        model=args.model,
        prompt=prompt,
        size=args.size,
        quality=args.quality,
        output_format=args.format,
    )

    if not result.data:
        print("ERROR: API returned no image data.", file=sys.stderr)
        sys.exit(1)

    image = result.data[0]
    if image.b64_json:
        image_bytes = base64.b64decode(image.b64_json)
    elif image.url:
        import urllib.request

        with urllib.request.urlopen(image.url) as response:
            image_bytes = response.read()
    else:
        print("ERROR: API response had neither b64_json nor url.", file=sys.stderr)
        sys.exit(1)

    output_path.write_bytes(image_bytes)

    print(f"model:   {args.model}")
    print(f"size:    {args.size}")
    print(f"quality: {args.quality}")
    print(f"format:  {args.format}")
    print(f"saved:   {output_path}")
    print(f"bytes:   {len(image_bytes)}")


if __name__ == "__main__":
    main()
