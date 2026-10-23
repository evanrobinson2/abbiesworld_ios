#!/usr/bin/env python3
"""
Transcribe an inbox audio file with OpenAI Whisper.

Agents cannot play audio. Use this instead of declaring an .m4a "broken."
Requires OPENAI_API_KEY. Do not commit keys.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from openai import OpenAI

# Whisper file cap is 25 MB. Stay under it.
CHUNK_SECONDS = 600
MAX_DIRECT_BYTES = 20 * 1024 * 1024


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Transcribe inbox audio to markdown.")
    p.add_argument("audio", help="Path to .m4a / .mp3 / .wav")
    p.add_argument(
        "--output",
        help="Markdown path (default: same stem as the audio, .md)",
    )
    p.add_argument("--model", default="whisper-1")
    return p.parse_args()


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def duration_seconds(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        text=True,
    ).strip()
    return float(out)


def transcribe_file(client: OpenAI, model: str, path: Path) -> str:
    with path.open("rb") as fh:
        result = client.audio.transcriptions.create(model=model, file=fh)
    return (result.text or "").strip()


def main() -> int:
    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY is not set.", file=sys.stderr)
        return 1

    args = parse_args()
    audio = Path(args.audio).expanduser().resolve()
    if not audio.is_file():
        print(f"Not found: {audio}", file=sys.stderr)
        return 1

    dest = Path(args.output).expanduser() if args.output else audio.with_suffix(".md")
    dest = dest.resolve()
    client = OpenAI()
    seconds = duration_seconds(audio)
    size = audio.stat().st_size
    print(f"source={audio.name} duration={seconds:.1f}s size={size}")

    parts: list[str] = []
    if size <= MAX_DIRECT_BYTES and seconds <= CHUNK_SECONDS + 30:
        parts.append(transcribe_file(client, args.model, audio))
    else:
        with tempfile.TemporaryDirectory(prefix="inbox-whisper-") as tmp:
            pattern = str(Path(tmp) / "chunk-%03d.mp3")
            run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(audio),
                    "-ac",
                    "1",
                    "-c:a",
                    "libmp3lame",
                    "-b:a",
                    "48k",
                    "-f",
                    "segment",
                    "-segment_time",
                    str(CHUNK_SECONDS),
                    "-reset_timestamps",
                    "1",
                    pattern,
                ]
            )
            chunks = sorted(Path(tmp).glob("chunk-*.mp3"))
            for i, chunk in enumerate(chunks):
                start = i * CHUNK_SECONDS
                print(f"chunk {i + 1}/{len(chunks)} t={start}s")
                text = transcribe_file(client, args.model, chunk)
                mm, ss = divmod(start, 60)
                parts.append(f"## {int(mm):02d}:{int(ss):02d}\n\n{text}")

    body = "\n\n".join(p for p in parts if p)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(
        f"# Transcript — {audio.name}\n\n"
        f"Duration ~{seconds / 60:.1f} min. Transcribed with `{args.model}` "
        f"on localhost. The source audio is valid; this text is what cloud "
        f"agents should read.\n\n{body}\n",
        encoding="utf-8",
    )
    print(f"wrote {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
