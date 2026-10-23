#!/usr/bin/env python3
"""
Transcribe an audio file locally with faster-whisper. No API key, no credits.

Companion to scripts/transcribe_inbox.py (which uses the OpenAI API). Use this
one when the OpenAI balance is exhausted or when you want to avoid API cost.

Outputs three files alongside a chosen --outdir:
  <stem>.txt   plain text
  <stem>.srt   timestamped subtitles (human review)
  <stem>.json  segments with start/end seconds (for correlating to image beats)

Examples
--------
    # whole file
    python3 scripts/transcribe_local.py feedback/inbox/audio1834333043.m4a

    # just the window where the useful discussion happens
    python3 scripts/transcribe_local.py feedback/inbox/audio1834333043.m4a \
        --start 240 --end 720

    # faster, less accurate
    python3 scripts/transcribe_local.py <file> --model base.en
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Local Whisper transcription (no API).")
    p.add_argument("audio", type=Path, help="Input audio/video file.")
    p.add_argument(
        "--outdir",
        type=Path,
        default=None,
        help="Output directory (default: alongside input).",
    )
    p.add_argument(
        "--model",
        default="small.en",
        help="faster-whisper model: tiny.en, base.en, small.en, medium.en, large-v3 "
        "(default: small.en).",
    )
    p.add_argument("--start", type=float, default=None, help="Clip start, seconds.")
    p.add_argument("--end", type=float, default=None, help="Clip end, seconds.")
    p.add_argument(
        "--language", default="en", help="Force language code (default: en)."
    )
    p.add_argument(
        "--no-vad",
        action="store_true",
        help="Disable voice-activity filtering. VAD is on by default and skips "
        "silence, which is a large speedup on meeting recordings.",
    )
    return p.parse_args()


def srt_timestamp(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def clock(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h:d}:{m:02d}:{s:02d}" if h else f"{m:d}:{s:02d}"


def prepare_audio(src: Path, start: float | None, end: float | None) -> tuple[Path, bool]:
    """Decode to 16 kHz mono WAV, optionally trimmed. Returns (path, is_temp)."""
    tmp = Path(tempfile.mkdtemp(prefix="whisper-")) / "audio.wav"
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    cmd += ["-i", str(src)]
    if end is not None:
        duration = end - (start or 0.0)
        if duration <= 0:
            sys.exit("ERROR: --end must be greater than --start.")
        cmd += ["-t", str(duration)]
    cmd += ["-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(tmp)]
    subprocess.run(cmd, check=True)
    return tmp, True


def main() -> None:
    args = parse_args()
    if not args.audio.exists():
        sys.exit(f"ERROR: no such file: {args.audio}")

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("ERROR: pip install faster-whisper")

    outdir = args.outdir or args.audio.parent
    outdir.mkdir(parents=True, exist_ok=True)
    stem = args.audio.stem
    if args.start is not None or args.end is not None:
        stem += f"-{int(args.start or 0)}s-{int(args.end) if args.end else 'end'}"

    wav, is_temp = prepare_audio(args.audio, args.start, args.end)

    print(f"model   : {args.model}")
    print(f"input   : {args.audio}")
    if args.start is not None or args.end is not None:
        print(f"window  : {clock(args.start or 0)} -> "
              f"{clock(args.end) if args.end else 'end'}")
    print(f"vad     : {'off' if args.no_vad else 'on'}")
    print("loading model (first run downloads weights)...", flush=True)

    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    t0 = time.time()
    segments, info = model.transcribe(
        str(wav),
        language=args.language,
        vad_filter=not args.no_vad,
        beam_size=5,
    )
    print(f"duration: {clock(info.duration)}  (transcribing...)", flush=True)

    offset = args.start or 0.0
    rows = []
    for seg in segments:
        rows.append(
            {
                "index": len(rows) + 1,
                "start": round(seg.start + offset, 3),
                "end": round(seg.end + offset, 3),
                "text": seg.text.strip(),
            }
        )
        # progress: print as we go so long runs are observable
        if len(rows) % 25 == 0:
            print(f"  ...{len(rows)} segments, at {clock(rows[-1]['end'])}", flush=True)

    elapsed = time.time() - t0

    txt_path = outdir / f"{stem}.txt"
    srt_path = outdir / f"{stem}.srt"
    json_path = outdir / f"{stem}.json"

    txt_path.write_text("\n".join(r["text"] for r in rows) + "\n", encoding="utf-8")

    srt_path.write_text(
        "\n".join(
            f"{r['index']}\n"
            f"{srt_timestamp(r['start'])} --> {srt_timestamp(r['end'])}\n"
            f"{r['text']}\n"
            for r in rows
        ),
        encoding="utf-8",
    )

    json_path.write_text(
        json.dumps(
            {
                "source": str(args.audio),
                "model": args.model,
                "language": args.language,
                "window": {"start": args.start, "end": args.end},
                "audio_duration_sec": round(info.duration, 2),
                "transcribe_elapsed_sec": round(elapsed, 1),
                "segment_count": len(rows),
                "segments": rows,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    if is_temp:
        wav.unlink(missing_ok=True)

    speed = info.duration / elapsed if elapsed else 0.0
    print()
    print(f"segments: {len(rows)}")
    print(f"elapsed : {elapsed:.1f}s  ({speed:.1f}x realtime)")
    print(f"wrote   : {txt_path}")
    print(f"wrote   : {srt_path}")
    print(f"wrote   : {json_path}")


if __name__ == "__main__":
    main()
