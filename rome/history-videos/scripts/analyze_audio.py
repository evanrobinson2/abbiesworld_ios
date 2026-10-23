#!/usr/bin/env python3
"""
Measure a music track: tempo, key, section boundaries, energy curve, headroom.

Agents cannot hear audio. This produces the numbers that let one reason about a
track anyway — most importantly section boundaries with timestamps, which are the
cut points an edit is built on.

Writes a human-readable report to stdout and a JSON sidecar next to the input
(or into --outdir).

    python3 scripts/analyze_audio.py feedback/inbox/*.mp3
    python3 scripts/analyze_audio.py <file> --outdir /tmp/analysis
"""

from __future__ import annotations

import argparse
import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import numpy as np

PITCHES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Krumhansl-Schmuckler key profiles
MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def clock(seconds: float) -> str:
    m, s = divmod(int(round(seconds)), 60)
    return f"{m}:{s:02d}"


def estimate_key(chroma: np.ndarray) -> tuple[str, float, list[tuple[str, float]]]:
    """Correlate mean chroma against rotated major/minor profiles."""
    mean = chroma.mean(axis=1)
    if mean.sum() == 0:
        return "unknown", 0.0, []
    mean = mean / mean.sum()
    scores: list[tuple[str, float]] = []
    for i in range(12):
        for name, profile in (("major", MAJOR), ("minor", MINOR)):
            rotated = np.roll(profile, i)
            rotated = rotated / rotated.sum()
            corr = float(np.corrcoef(mean, rotated)[0, 1])
            scores.append((f"{PITCHES[i]} {name}", corr))
    scores.sort(key=lambda x: -x[1])
    return scores[0][0], scores[0][1], scores[:4]


def analyze(path: Path, outdir: Path | None) -> dict:
    import librosa

    y, sr = librosa.load(str(path), sr=22050, mono=True)
    duration = float(len(y) / sr)

    # ---- tempo -----------------------------------------------------------
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo_raw, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
    tempo = float(np.atleast_1d(tempo_raw)[0])

    # Median inter-beat interval is a useful cross-check on the estimator.
    beat_times = librosa.frames_to_time(beats, sr=sr)
    if len(beat_times) > 4:
        ibi = np.diff(beat_times)
        tempo_from_beats = float(60.0 / np.median(ibi))
    else:
        tempo_from_beats = tempo

    # ---- key -------------------------------------------------------------
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    key, key_conf, key_alts = estimate_key(chroma)

    # ---- sections --------------------------------------------------------
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    feat = np.vstack([librosa.util.normalize(mfcc, axis=1),
                      librosa.util.normalize(chroma, axis=1)])
    n_seg = max(3, min(10, int(duration // 22)))
    try:
        bounds = librosa.segment.agglomerative(feat, n_seg)
        bound_times = librosa.frames_to_time(bounds, sr=sr).tolist()
    except Exception:
        bound_times = [0.0]
    if not bound_times or bound_times[0] > 0.5:
        bound_times = [0.0] + bound_times
    bound_times = sorted(set(round(t, 2) for t in bound_times if t < duration))

    # ---- energy per section ---------------------------------------------
    rms = librosa.feature.rms(y=y)[0]
    rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
    sections = []
    for i, start in enumerate(bound_times):
        end = bound_times[i + 1] if i + 1 < len(bound_times) else duration
        mask = (rms_times >= start) & (rms_times < end)
        seg_rms = rms[mask]
        if seg_rms.size == 0:
            continue
        mean_rms = float(seg_rms.mean())
        sections.append({
            "index": i + 1,
            "start": round(start, 2),
            "end": round(end, 2),
            "start_clock": clock(start),
            "length_sec": round(end - start, 2),
            "mean_rms": round(mean_rms, 5),
            "mean_dbfs": round(float(20 * np.log10(max(mean_rms, 1e-9))), 1),
        })

    # ---- headroom --------------------------------------------------------
    peak = float(np.max(np.abs(y))) if y.size else 0.0
    peak_db = float(20 * np.log10(max(peak, 1e-9)))
    overall_rms = float(np.sqrt(np.mean(y ** 2))) if y.size else 0.0
    overall_rms_db = float(20 * np.log10(max(overall_rms, 1e-9)))
    crest = peak_db - overall_rms_db
    clipped = int(np.sum(np.abs(y) >= 0.999))

    result = {
        "file": str(path),
        "duration_sec": round(duration, 2),
        "duration_clock": clock(duration),
        "tempo_bpm": round(tempo, 1),
        "tempo_bpm_from_beat_intervals": round(tempo_from_beats, 1),
        "tempo_half": round(tempo / 2, 1),
        "tempo_double": round(tempo * 2, 1),
        "beat_count": int(len(beat_times)),
        "key_estimate": key,
        "key_confidence": round(key_conf, 3),
        "key_alternatives": [{"key": k, "corr": round(c, 3)} for k, c in key_alts],
        "peak_dbfs": round(peak_db, 2),
        "rms_dbfs": round(overall_rms_db, 2),
        "crest_factor_db": round(crest, 2),
        "samples_at_full_scale": clipped,
        "section_count": len(sections),
        "sections": sections,
    }

    if outdir:
        outdir.mkdir(parents=True, exist_ok=True)
        sidecar = outdir / f"{path.stem}.analysis.json"
    else:
        sidecar = path.with_suffix(".analysis.json")
    sidecar.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    result["_sidecar"] = str(sidecar)
    return result


def report(r: dict) -> None:
    print("=" * 74)
    print(Path(r["file"]).name)
    print("=" * 74)
    print(f"  length        : {r['duration_clock']}  ({r['duration_sec']}s)")
    print(f"  tempo         : {r['tempo_bpm']} BPM"
          f"   (from beat intervals: {r['tempo_bpm_from_beat_intervals']})")
    print(f"                  half={r['tempo_half']}  double={r['tempo_double']}"
          f"   beats detected={r['beat_count']}")
    print(f"  key           : {r['key_estimate']}  (corr {r['key_confidence']})")
    alts = ", ".join(f"{a['key']} {a['corr']}" for a in r["key_alternatives"][1:])
    print(f"                  alternatives: {alts}")
    print(f"  peak          : {r['peak_dbfs']} dBFS")
    print(f"  rms           : {r['rms_dbfs']} dBFS")
    print(f"  crest factor  : {r['crest_factor_db']} dB"
          f"   ({'heavily limited' if r['crest_factor_db'] < 10 else 'has dynamics'})")
    print(f"  full-scale    : {r['samples_at_full_scale']} samples at/over 0 dBFS"
          f"   ({'CLIPPING' if r['samples_at_full_scale'] > 0 else 'no clipping'})")
    print()
    print(f"  sections ({r['section_count']}) — cut points:")
    print(f"    {'#':>3}  {'start':>7}  {'len':>6}  {'level':>8}")
    for s in r["sections"]:
        print(f"    {s['index']:>3}  {s['start_clock']:>7}  "
              f"{s['length_sec']:>5.1f}s  {s['mean_dbfs']:>7.1f} dB")
    print()


def main() -> None:
    p = argparse.ArgumentParser(description="Measure tempo, key, sections, headroom.")
    p.add_argument("audio", nargs="+", type=Path)
    p.add_argument("--outdir", type=Path, default=None)
    args = p.parse_args()

    for path in args.audio:
        if not path.exists():
            print(f"SKIP (missing): {path}", file=sys.stderr)
            continue
        try:
            report(analyze(path, args.outdir))
        except Exception as exc:  # noqa: BLE001
            print(f"FAILED on {path}: {type(exc).__name__}: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
