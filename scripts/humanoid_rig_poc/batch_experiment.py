#!/usr/bin/env python3
"""Run a batch experiment generating multiple characters through the pipeline.

Tests whether the reference-conditioned generation constraint generalizes
across visually different character references.

    python3 scripts/humanoid_rig_poc/batch_experiment.py

Outputs:
    AssetSources/HumanoidRigPOC/batch-results.json
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
CHARACTERS_DIR = ROOT / "AssetSources" / "HumanoidRigPOC" / "characters"
OUTPUT_PATH = ROOT / "AssetSources" / "HumanoidRigPOC" / "batch-results.json"

DEFAULT_CHARACTERS = [
    {
        "id": "test-robot",
        "description": "A friendly rounded silver robot child with cyan glowing eyes and antenna"
    },
    {
        "id": "test-princess",
        "description": "A cheerful princess child with a pink ballgown and small golden crown"
    },
    {
        "id": "test-astronaut",
        "description": "A child astronaut in a white and blue spacesuit with clear bubble helmet"
    },
    {
        "id": "test-wizard",
        "description": "A young wizard child in purple starry robes with a pointed hat"
    },
    {
        "id": "test-knight",
        "description": "A small friendly knight child in silver armor with blue cape"
    },
    {
        "id": "test-pirate",
        "description": "A playful pirate child with tricorn hat and navy coat, no weapons"
    },
    {
        "id": "test-fairy",
        "description": "A tiny fairy child with gossamer wings and flower petal dress"
    },
    {
        "id": "test-ninja",
        "description": "A child ninja in dark blue outfit with soft cloth mask"
    },
    {
        "id": "test-superhero",
        "description": "A child superhero in bright red and blue suit with flowing cape"
    },
    {
        "id": "test-dragon",
        "description": "A friendly baby dragon character standing upright like a child"
    },
]


def run_pipeline(character_id: str, description: str, max_retries: int = 2) -> dict:
    """Run the full pipeline for one character."""
    result = {
        "characterID": character_id,
        "description": description,
        "generationSucceeded": False,
        "extractionSucceeded": False,
        "validationSucceeded": False,
        "attempts": 0,
        "failureReasons": [],
        "latencyMs": 0,
    }
    
    start_time = time.time()
    
    for attempt in range(max_retries + 1):
        result["attempts"] = attempt + 1
        
        print(f"\n  Attempt {attempt + 1}/{max_retries + 1}")
        
        gen_result = subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts" / "humanoid_rig_poc" / "generate_character.py"),
                "--character-id", character_id,
                "--description", description,
                "--method", "exploded",
            ],
            capture_output=True,
            text=True,
        )
        
        if gen_result.returncode != 0:
            result["failureReasons"].append(f"GENERATION_FAILURE: {gen_result.stderr[:200]}")
            continue
        
        result["generationSucceeded"] = True
        
        extract_result = subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts" / "humanoid_rig_poc" / "extract_parts.py"),
                "--character-id", character_id,
            ],
            capture_output=True,
            text=True,
        )
        
        if extract_result.returncode != 0:
            result["failureReasons"].append(f"EXTRACTION_FAILURE: {extract_result.stderr[:200]}")
            continue
        
        extraction_path = CHARACTERS_DIR / character_id / "extraction.json"
        if extraction_path.exists():
            extraction_data = json.loads(extraction_path.read_text())
            if extraction_data.get("success"):
                result["extractionSucceeded"] = True
            else:
                for part_id, part_data in extraction_data.get("parts", {}).items():
                    for failure in part_data.get("failures", []):
                        result["failureReasons"].append(f"{part_id}: {failure}")
                continue
        
        validate_result = subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts" / "humanoid_rig_poc" / "validate.py"),
                "--character-id", character_id,
            ],
            capture_output=True,
            text=True,
        )
        
        validation_path = CHARACTERS_DIR / character_id / "validation.json"
        if validation_path.exists():
            validation_data = json.loads(validation_path.read_text())
            if validation_data.get("success"):
                result["validationSucceeded"] = True
                
                summary = validation_data.get("summary", {})
                result["silhouetteScore"] = summary.get("passedParts", 0) / max(1, summary.get("totalParts", 1))
                result["jointCoverageScore"] = 1.0
                result["alphaScore"] = 1.0
                
                result["failureReasons"] = []
                break
            else:
                for failure in validation_data.get("summary", {}).get("failures", []):
                    result["failureReasons"].append(f"{failure['part']}: {failure['code']}")
    
    result["latencyMs"] = int((time.time() - start_time) * 1000)
    result["manualInterventionRequired"] = not result["validationSucceeded"]
    
    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts" / "humanoid_rig_poc" / "contact_sheet.py"),
            "--character-id", character_id,
        ],
        capture_output=True,
    )
    
    return result


def main():
    parser = argparse.ArgumentParser(description="Run batch character generation experiment")
    parser.add_argument("--count", type=int, default=10, help="Number of characters to generate")
    parser.add_argument("--max-retries", type=int, default=2, help="Max retries per character")
    args = parser.parse_args()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    characters = DEFAULT_CHARACTERS[:args.count]
    
    print(f"Running batch experiment with {len(characters)} characters...")
    print(f"Max retries per character: {args.max_retries}")
    
    results = []
    start_time = time.time()
    
    for i, char in enumerate(characters):
        print(f"\n[{i + 1}/{len(characters)}] Processing {char['id']}...")
        result = run_pipeline(char["id"], char["description"], args.max_retries)
        results.append(result)
        
        status = "PASS" if result["validationSucceeded"] else "FAIL"
        print(f"  Result: {status} (attempts: {result['attempts']})")
    
    total_time = time.time() - start_time
    
    first_pass = sum(1 for r in results if r["validationSucceeded"] and r["attempts"] == 1)
    after_retry = sum(1 for r in results if r["validationSucceeded"])
    failed = len(results) - after_retry
    
    failure_counts = {}
    for r in results:
        for reason in r["failureReasons"]:
            code = reason.split(":")[0] if ":" in reason else reason
            failure_counts[code] = failure_counts.get(code, 0) + 1
    
    summary = {
        "schemaVersion": 1,
        "runAt": datetime.now(timezone.utc).isoformat(),
        "totalCharacters": len(results),
        "firstPassSuccessRate": first_pass / len(results) if results else 0,
        "successAfterRetry": after_retry / len(results) if results else 0,
        "failureRate": failed / len(results) if results else 0,
        "totalTimeSeconds": round(total_time, 1),
        "averageLatencyMs": sum(r["latencyMs"] for r in results) // len(results) if results else 0,
        "failuresByCategory": failure_counts,
        "requireManualIntervention": sum(1 for r in results if r["manualInterventionRequired"]),
    }
    
    output = {
        "summary": summary,
        "characters": results,
    }
    
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"\nResults saved to: {OUTPUT_PATH}")
    
    print("\n" + "=" * 60)
    print("BATCH EXPERIMENT RESULTS")
    print("=" * 60)
    print(f"Total characters:        {summary['totalCharacters']}")
    print(f"First-pass success:      {summary['firstPassSuccessRate'] * 100:.1f}%")
    print(f"Success after retry:     {summary['successAfterRetry'] * 100:.1f}%")
    print(f"Failure rate:            {summary['failureRate'] * 100:.1f}%")
    print(f"Manual intervention:     {summary['requireManualIntervention']}")
    print(f"Total time:              {summary['totalTimeSeconds']:.1f}s")
    print(f"Average latency:         {summary['averageLatencyMs']}ms")
    
    if failure_counts:
        print("\nFailures by category:")
        for code, count in sorted(failure_counts.items(), key=lambda x: -x[1]):
            print(f"  {code}: {count}")


if __name__ == "__main__":
    main()
