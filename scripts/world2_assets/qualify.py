#!/usr/bin/env python3
"""Resumable, fail-closed World 2 visual asset qualification DAG."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import uuid
from pathlib import Path
from typing import Any

from common import (
    DEFAULT_WORLD2_ROOT,
    PipelineError,
    StructuredLogger,
    asset_spec,
    canonical_json_bytes,
    copy_immutable,
    load_inventory,
    read_json,
    resolve_inside,
    safe_name,
    sha256_bytes,
    sha256_file,
    utc_now,
    write_immutable_json,
)


EVALUATION_NODES = (
    "semantic",
    "composition",
    "style",
    "safety",
)
ALLOWED_EVALUATOR_DECISIONS = {"pass", "fail", "uncertain"}


def require_pillow() -> tuple[Any, Any, Any]:
    try:
        from PIL import Image, ImageOps, UnidentifiedImageError
    except ImportError as error:
        raise PipelineError(
            "Pillow is required to decode, transform, and preview assets. "
            "Install it with: python3 -m pip install Pillow"
        ) from error
    return Image, ImageOps, UnidentifiedImageError


def prompt_aspect_ratio(prompt_text: str) -> float | None:
    matches = re.findall(r"(?:^|\s)--ar\s+(\d+):(\d+)(?:\s|$)", prompt_text)
    if len(matches) != 1:
        return None
    width, height = (int(value) for value in matches[0])
    if width <= 0 or height <= 0:
        return None
    return width / height


def complete_spec(
    world2_root: Path, spec: dict[str, Any]
) -> tuple[str, str, dict[str, Any]]:
    if spec.get("status") not in {
        "canonical",
        "canonical_repair",
        "supplemental_candidate",
        "supplemental_repair",
    }:
        raise PipelineError(
            f"{spec.get('productionId') or spec.get('semanticId')} is "
            f"{spec.get('status')!r}, not a qualifiable asset"
        )
    qualification = spec.get("qualification")
    required = (
        "intendedScreen",
        "audience",
        "mustShow",
        "mustNotShow",
        "references",
        "useSizes",
        "alphaContract",
        "safeZones",
        "expectedEmbellishmentAreas",
        "fileContract",
        "transformation",
    )
    if not isinstance(qualification, dict):
        raise PipelineError("Specification node failed: qualification object is missing")
    missing = [key for key in required if key not in qualification]
    if missing:
        raise PipelineError(
            "Specification node failed; missing fields: " + ", ".join(missing)
        )
    for list_field in (
        "mustShow",
        "mustNotShow",
        "references",
        "useSizes",
        "safeZones",
        "expectedEmbellishmentAreas",
    ):
        if not isinstance(qualification[list_field], list):
            raise PipelineError(
                f"Specification node failed: {list_field} must be an array"
            )
    if not qualification["mustShow"] or not qualification["mustNotShow"]:
        raise PipelineError(
            "Specification node failed: mustShow and mustNotShow cannot be empty"
        )
    if not qualification["useSizes"]:
        raise PipelineError("Specification node failed: useSizes cannot be empty")

    prompt = spec.get("prompt")
    if not isinstance(prompt, dict) or prompt.get("state") != "exact":
        raise PipelineError(
            "Specification node failed: exact supplied prompt is not present. "
            "Store it verbatim and set prompt.state to 'exact' with its SHA-256."
        )
    prompt_path = resolve_inside(world2_root, str(prompt.get("path", "")))
    if spec.get("status") == "canonical":
        source_manifest = read_json(world2_root / "source-manifest.json")
        source_entries = {
            entry.get("productionId"): entry
            for entry in source_manifest.get("assets", [])
        }
        source_entry = source_entries.get(spec.get("productionId"))
        if not source_entry:
            raise PipelineError(
                f"Specification node failed: source-manifest entry is missing for "
                f"{spec.get('productionId')}"
            )
        if (
            source_entry.get("promptPath") != prompt.get("path")
            or source_entry.get("promptSha256") != prompt.get("sha256")
        ):
            raise PipelineError(
                "Specification node failed: inventory and source-manifest prompt "
                f"provenance disagree for {spec.get('productionId')}"
            )
    else:
        record_identity = spec.get("productionId") or spec["semanticId"]
        generation_record = read_json(
            world2_root
            / "generation-runs"
            / safe_name(record_identity)
            / f"{safe_name(prompt['version'])}.json"
        )
        if (
            generation_record.get("semanticId") != spec["semanticId"]
            or generation_record.get("productionId") != spec.get("productionId")
            or generation_record.get("promptSha256") != prompt.get("sha256")
            or generation_record.get("outputSha256")
            != spec.get("source", {}).get("sha256")
            or generation_record.get("provider")
            not in {"OpenAI", "local-deterministic"}
            or not generation_record.get("model")
        ):
            raise PipelineError(
                "Specification node failed: generated candidate provenance is incomplete "
                f"or mismatched for {spec['semanticId']}"
            )
    if not prompt_path.is_file():
        raise PipelineError(f"Exact prompt file is missing: {prompt_path}")
    prompt_text = prompt_path.read_text(encoding="utf-8")
    if not prompt_text.strip():
        raise PipelineError(f"Exact prompt file is empty: {prompt_path}")
    prompt_hash = sha256_bytes(prompt_text.encode("utf-8"))
    if prompt.get("sha256") != prompt_hash:
        raise PipelineError(
            f"Exact prompt hash mismatch for {prompt_path}; expected "
            f"{prompt.get('sha256')}, found {prompt_hash}"
        )
    effective_qualification = json.loads(json.dumps(qualification))
    if effective_qualification["fileContract"].get("expectedAspectRatio") is None:
        derived_ratio = prompt_aspect_ratio(prompt_text)
        if derived_ratio is None:
            raise PipelineError(
                "Specification node failed: expectedAspectRatio is unset and the "
                "exact prompt does not contain one unambiguous --ar W:H contract"
            )
        effective_qualification["fileContract"]["expectedAspectRatio"] = derived_ratio
        effective_qualification["fileContract"][
            "aspectRatioSource"
        ] = "derived_from_exact_prompt"
    return prompt_text, prompt_hash, effective_qualification


def spec_for_run(
    world2_root: Path,
    inventory: dict[str, Any],
    asset_id: str,
    version: str,
) -> dict[str, Any]:
    base = asset_spec(inventory, asset_id)
    if version == base.get("prompt", {}).get("version"):
        return base
    repair_path = (
        world2_root
        / "repairs"
        / safe_name(asset_id)
        / safe_name(version)
        / "spec.json"
    )
    repair = read_json(repair_path)
    expected_status = (
        "canonical_repair"
        if base.get("status") == "canonical"
        else "supplemental_repair"
    )
    if (
        repair.get("status") != expected_status
        or repair.get("productionId") != base.get("productionId")
        or repair.get("semanticId") != base.get("semanticId")
        or repair.get("prompt", {}).get("version") != version
    ):
        raise PipelineError(
            f"Repair specification is missing or mismatched: {repair_path}"
        )
    return repair


def inspect_image(path: Path, file_contract: dict[str, Any]) -> dict[str, Any]:
    Image, _, UnidentifiedImageError = require_pillow()
    try:
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            width, height = image.size
            image_format = image.format
            mode = image.mode
            info = dict(image.info)
            exif = image.getexif()
    except (UnidentifiedImageError, OSError) as error:
        raise PipelineError(f"File-integrity node could not decode {path}: {error}") from error

    minimum_width = int(file_contract.get("minimumWidth", 1))
    minimum_height = int(file_contract.get("minimumHeight", 1))
    if width < minimum_width or height < minimum_height:
        raise PipelineError(
            f"File-integrity node rejected {width}x{height}; minimum is "
            f"{minimum_width}x{minimum_height}"
        )
    expected_formats = [str(value).upper() for value in file_contract.get("formats", [])]
    if expected_formats and str(image_format).upper() not in expected_formats:
        raise PipelineError(
            f"File-integrity node rejected format {image_format}; "
            f"expected one of {expected_formats}"
        )
    ratio = width / height
    expected_ratio = file_contract.get("expectedAspectRatio")
    if expected_ratio is not None:
        tolerance = float(file_contract.get("aspectRatioTolerance", 0.03))
        if abs(ratio - float(expected_ratio)) > tolerance:
            raise PipelineError(
                f"File-integrity node rejected aspect ratio {ratio:.6f}; "
                f"expected {expected_ratio} ± {tolerance}"
            )
    has_alpha = "A" in mode or "transparency" in info
    alpha_contract = file_contract.get("alpha")
    if alpha_contract == "required" and not has_alpha:
        raise PipelineError("File-integrity node rejected image without required alpha")
    if alpha_contract == "forbidden" and has_alpha:
        raise PipelineError("File-integrity node rejected unexpected alpha")
    icc_profile = info.get("icc_profile")
    orientation = exif.get(274, 1) if exif else 1
    if orientation not in (None, 1):
        raise PipelineError(
            f"File-integrity node rejected non-normalized EXIF orientation {orientation}"
        )
    return {
        "sha256": sha256_file(path),
        "bytes": path.stat().st_size,
        "width": width,
        "height": height,
        "aspectRatio": round(ratio, 8),
        "format": image_format,
        "mode": mode,
        "hasAlpha": has_alpha,
        "orientation": orientation,
        "colorProfile": (
            {"kind": "icc", "sha256": sha256_bytes(icc_profile)}
            if isinstance(icc_profile, bytes)
            else {"kind": "unspecified"}
        ),
    }


def data_url(path: Path) -> str:
    suffix = path.suffix.lower()
    media_type = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }.get(suffix, "application/octet-stream")
    return f"data:{media_type};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def evaluator_requirements(
    node: str, specification: dict[str, Any]
) -> list[str]:
    if node == "semantic":
        return [
            "exactPromptConformance: assess only visible art facts and exclusions in the exact prompt; do not require absent UI overlays, ownership labels, metadata, exact source pixel dimensions, alpha-channel proof, or other non-visible facts in this semantic node.",
            *[f"mustShow: {value}" for value in specification["mustShow"]],
            *[f"mustNotShow: {value}" for value in specification["mustNotShow"]],
        ]
    if node == "composition":
        return [
            *[f"safeZone: {value}" for value in specification["safeZones"]],
            *[
                (
                    f"targetRenderLayout: {value['name']}; assess only visible fit, "
                    "edge safety, and overlay space in the supplied rendering; numeric "
                    "dimensions are outside this evaluator's rubric"
                )
                for value in specification["useSizes"]
            ],
        ]
    if node == "style":
        return [
            "Style evidence addresses outlines, shape language, shading, texture, palette, perspective, and detail density.",
            "Style is sophisticated rather than babyish and is not chibi.",
        ]
    if node == "safety":
        return [
            "Based solely on visible content, child-safe with no frightening, sexual, or violent material.",
            "Based solely on visible content, no manipulative reward cues, quality judgment, or compliance pressure.",
            "Based solely on visible content, no visible real-world logos or recognizable brand marks.",
            "Based solely on visible content, no disallowed or invented personal details.",
        ]
    if node == "small_scale_readability":
        return [
            (
                f"readabilityInPreview: {value['name']}; assess whether the dominant "
                "silhouette, broad color regions, and primary focal symbol remain "
                "visibly distinct in the supplied rendered preview. Do not require "
                "identification of every depicted building, prop, or texture; numeric "
                "dimensions are outside this evaluator's rubric"
            )
            for value in specification["useSizes"]
        ]
    raise PipelineError(f"Unknown evaluator node: {node}")


def validate_evaluator_result(
    node: str, result: Any, required_requirements: list[str]
) -> dict[str, Any]:
    if not isinstance(result, dict):
        raise PipelineError(f"Evaluator returned non-object output for {node}")
    if result.get("decision") not in ALLOWED_EVALUATOR_DECISIONS:
        raise PipelineError(
            f"Evaluator output for {node} requires decision pass/fail/uncertain"
        )
    evidence = result.get("evidence")
    if not isinstance(evidence, list) or not evidence or any(
        not isinstance(item, str) or not item.strip() for item in evidence
    ):
        raw_findings = result.get("hardFindings")
        derived_evidence = (
            [
                str(finding.get("evidence", "")).strip()
                for finding in raw_findings
                if isinstance(finding, dict)
                and str(finding.get("evidence", "")).strip()
            ]
            if isinstance(raw_findings, list)
            else []
        )
        if not derived_evidence:
            raise PipelineError(
                f"Evaluator output for {node} requires cited visual evidence"
            )
        evidence = derived_evidence
    findings = result.get("hardFindings")
    if not isinstance(findings, list):
        raise PipelineError(f"Evaluator output for {node} requires hardFindings")
    for finding in findings:
        if (
            not isinstance(finding, dict)
            or finding.get("status") not in {"pass", "fail", "uncertain"}
            or not str(finding.get("evidence", "")).strip()
        ):
            raise PipelineError(
                f"Evaluator hardFindings for {node} require status and evidence"
            )
    finding_requirements = [finding.get("requirement") for finding in findings]
    if len(finding_requirements) != len(set(finding_requirements)):
        severity = {"pass": 0, "uncertain": 1, "fail": 2}
        deduplicated: dict[str, dict[str, Any]] = {}
        for finding in findings:
            requirement = str(finding["requirement"])
            existing = deduplicated.get(requirement)
            if existing is None or severity[finding["status"]] > severity[
                existing["status"]
            ]:
                deduplicated[requirement] = finding
        findings = list(deduplicated.values())
        finding_requirements = [finding["requirement"] for finding in findings]
    if not set(required_requirements).issubset(set(finding_requirements)):
        missing = sorted(set(required_requirements) - set(finding_requirements))
        raise PipelineError(
            f"Evaluator hardFindings for {node} do not cover the exact rubric; "
            f"missing={missing}"
        )
    required_set = set(required_requirements)
    required_findings = [
        finding for finding in findings if finding["requirement"] in required_set
    ]
    additional_findings = [
        finding for finding in findings if finding["requirement"] not in required_set
    ]
    required_statuses = [finding["status"] for finding in required_findings]
    if "fail" in required_statuses:
        normalized_decision = "fail"
    elif "uncertain" in required_statuses:
        normalized_decision = "uncertain"
    else:
        normalized_decision = "pass"
    soft_scores = result.get("softScores", {})
    if not isinstance(soft_scores, dict) or any(
        not isinstance(score, (int, float)) or score < 0 or score > 5
        for score in soft_scores.values()
    ):
        raise PipelineError(f"Evaluator softScores for {node} must be numbers from 0 to 5")
    revision_note = str(result.get("revisionNote", "")).strip()
    if (
        normalized_decision != "pass"
    ) and not revision_note:
        non_pass = [
            str(finding["requirement"])
            for finding in required_findings
            if finding["status"] != "pass"
        ]
        revision_note = (
            "Review the cited non-pass evidence before another version: "
            + "; ".join(non_pass or [f"{node} evaluator decision"])
        )
    return {
        "decision": normalized_decision,
        "evidence": evidence,
        "hardFindings": required_findings,
        "additionalFindings": additional_findings,
        "softScores": soft_scores,
        "revisionNote": revision_note or None,
    }


class MockEvaluator:
    mode = "mock"
    provider = "mock"
    model = "mock-evaluator"

    def __init__(self, fixture_path: Path):
        self.fixture_path = fixture_path
        self.fixture = read_json(fixture_path)

    def evaluate(
        self,
        node: str,
        image_path: Path,
        prompt: str,
        specification: dict[str, Any],
        reference_paths: list[Path],
    ) -> dict[str, Any]:
        del image_path, prompt, reference_paths
        value = self.fixture.get("nodes", {}).get(node, self.fixture.get("default"))
        if value is None:
            raise PipelineError(f"Mock evaluator fixture has no response for node {node}")
        value = dict(value)
        requirements = evaluator_requirements(node, specification)
        if value.pop("autoPassRequirements", False):
            value["hardFindings"] = [
                {
                    "requirement": requirement,
                    "status": "pass",
                    "evidence": f"Synthetic fixture evidence for: {requirement}",
                }
                for requirement in requirements
            ]
        return validate_evaluator_result(node, value, requirements)


class OpenAIEvaluator:
    mode = "live"
    provider = "openai"

    def __init__(self):
        api_key = os.environ.get("OPENAI_API_KEY")
        self.model = os.environ.get("WORLD2_ASSET_EVAL_MODEL", "").strip()
        if not api_key:
            raise PipelineError(
                "Live evaluation requires OPENAI_API_KEY in the environment"
            )
        if not self.model:
            raise PipelineError(
                "Live evaluation requires explicit WORLD2_ASSET_EVAL_MODEL"
            )
        try:
            from openai import OpenAI
        except ImportError as error:
            raise PipelineError(
                "The OpenAI Python package is required for live evaluation. "
                "Install it with: python3 -m pip install openai"
            ) from error
        self.client = OpenAI(api_key=api_key)

    def evaluate(
        self,
        node: str,
        image_path: Path,
        prompt: str,
        specification: dict[str, Any],
        reference_paths: list[Path],
    ) -> dict[str, Any]:
        instruction = {
            "task": node,
            "rules": [
                "Describe only visible evidence; never infer hidden intent.",
                "Evaluate every declared hard requirement relevant to this task.",
                "hardFindings must contain each provided hardRequirements string exactly once; put any additional image-grounded hard concern in a separate additional finding.",
                "Use uncertain whenever the image does not provide enough evidence.",
                "Transparent pixels may be composited against black or white by the image renderer. Do not treat that display color as an opaque background; alpha validity is decided by file_integrity.",
                "Call an asset clipped only when visible subject artwork touches or visibly continues past the outer image boundary. Do not infer clipping from internal paths, platforms, steps, perspective, or deliberate silhouette endings.",
                "Return strict JSON only.",
            ],
            "exactPrompt": prompt,
            "specification": specification,
            "hardRequirements": evaluator_requirements(node, specification),
            "outputSchema": {
                "decision": "pass|fail|uncertain",
                "evidence": ["specific visible observation"],
                "hardFindings": [
                    {
                        "requirement": "requirement text",
                        "status": "pass|fail|uncertain",
                        "evidence": "specific visible observation",
                    }
                ],
                "softScores": {"named_dimension": "number 0..5"},
                "revisionNote": "constrained repair note or empty string",
            },
        }
        content: list[dict[str, Any]] = [
            {"type": "input_text", "text": json.dumps(instruction, ensure_ascii=False)},
            {"type": "input_text", "text": "Candidate image:"},
            {"type": "input_image", "image_url": data_url(image_path)},
        ]
        for index, reference in enumerate(reference_paths, start=1):
            content.extend(
                [
                    {"type": "input_text", "text": f"Canonical reference {index}:"},
                    {"type": "input_image", "image_url": data_url(reference)},
                ]
            )
        try:
            response = self.client.responses.create(
                model=self.model,
                input=[{"role": "user", "content": content}],
            )
        except Exception as error:
            status = getattr(error, "status_code", "unknown")
            code = getattr(error, "code", None) or "unknown"
            raise PipelineError(
                f"Evaluator request failed: {type(error).__name__} "
                f"status={status} code={code}"
            ) from error
        output_text = response.output_text.strip()
        if output_text.startswith("```"):
            output_text = output_text.removeprefix("```json").removeprefix("```")
            output_text = output_text.removesuffix("```").strip()
        try:
            result = json.loads(output_text)
        except json.JSONDecodeError as error:
            raise PipelineError(
                f"Evaluator returned invalid JSON for {node}: {error}"
            ) from error
        return validate_evaluator_result(
            node, result, evaluator_requirements(node, specification)
        )


def node_evidence(
    path: Path,
    *,
    node: str,
    input_material: dict[str, Any],
    operation: Any,
    logger: StructuredLogger,
) -> dict[str, Any]:
    input_digest = sha256_bytes(canonical_json_bytes(input_material))
    if path.exists():
        existing = read_json(path)
        if existing.get("inputDigest") != input_digest:
            raise PipelineError(
                f"Resumable node input changed; preserve evidence and use a new version: {path}"
            )
        logger.emit("world2.asset.node.resumed", node=node, evidencePath=str(path))
        return existing
    logger.emit("world2.asset.node.started", node=node)
    output = operation()
    record = {
        "schemaVersion": 1,
        "node": node,
        "inputDigest": input_digest,
        "recordedAt": utc_now(),
        "output": output,
    }
    write_immutable_json(path, record)
    logger.emit("world2.asset.node.completed", node=node, evidencePath=str(path))
    return record


def reference_paths(
    world2_root: Path, inventory: dict[str, Any], spec: dict[str, Any]
) -> list[Path]:
    paths: list[Path] = []
    source_manifest = read_json(world2_root / "source-manifest.json")
    source_entries = {
        entry.get("productionId"): entry for entry in source_manifest.get("assets", [])
    }
    for reference_id in spec["qualification"]["references"]:
        asset_spec(inventory, reference_id)
        source = source_entries.get(reference_id, {})
        relative = source.get("candidatePath")
        expected_hash = source.get("candidateSha256")
        if not relative or not expected_hash:
            raise PipelineError(
                f"Reference {reference_id} has no immutable candidatePath and sha256"
            )
        path = resolve_inside(world2_root, relative)
        if not path.is_file() or sha256_file(path) != expected_hash:
            raise PipelineError(
                f"Reference {reference_id} is missing or does not match its declared hash"
            )
        paths.append(path)
    return paths


def make_previews(
    source: Path, destination: Path, use_sizes: list[dict[str, Any]]
) -> dict[str, Any]:
    Image, ImageOps, _ = require_pillow()
    from PIL import ImageDraw
    panels: list[Any] = []
    rendered: list[dict[str, Any]] = []
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGBA")
        for use_size in use_sizes:
            name = str(use_size["name"])
            width = int(use_size["width"])
            height = int(use_size["height"])
            if width <= 0 or height <= 0 or width > 4096 or height > 4096:
                raise PipelineError(f"Invalid use size {name}: {width}x{height}")
            panel = Image.new("RGBA", (width, height), (236, 236, 236, 255))
            fitted = ImageOps.contain(image, (width, height), method=Image.Resampling.LANCZOS)
            panel.alpha_composite(
                fitted, ((width - fitted.width) // 2, (height - fitted.height) // 2)
            )
            review_scale = 1
            if "icon" in name.lower():
                mask = Image.new("L", (width, height), 0)
                ImageDraw.Draw(mask).rounded_rectangle(
                    (0, 0, width - 1, height - 1),
                    radius=max(1, int(min(width, height) * 0.22)),
                    fill=255,
                )
                masked = Image.new("RGBA", (width, height), (0, 0, 0, 0))
                masked.paste(panel, (0, 0), mask)
                panel = Image.new("RGBA", (width, height), (236, 236, 236, 255))
                panel.alpha_composite(masked)
                # Preserve the real rendered pixels, but enlarge the review artifact so
                # the multimodal evaluator can inspect a tiny Home Screen tile.
                review_scale = max(1, 240 // max(width, height))
                panel = panel.resize(
                    (width * review_scale, height * review_scale),
                    Image.Resampling.LANCZOS,
                )
            panels.append(panel)
            rendered.append(
                {
                    "name": name,
                    "width": width,
                    "height": height,
                    "reviewScale": review_scale,
                }
            )
    max_width = max(panel.width for panel in panels)
    total_height = sum(panel.height for panel in panels)
    sheet = Image.new("RGBA", (max_width, total_height), (255, 255, 255, 255))
    y = 0
    for panel in panels:
        sheet.alpha_composite(panel, ((max_width - panel.width) // 2, y))
        y += panel.height
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
    sheet.save(temporary, format="PNG", optimize=True)
    if destination.exists():
        if sha256_file(destination) != sha256_file(temporary):
            temporary.unlink()
            raise PipelineError(f"Immutable preview differs from existing file: {destination}")
        temporary.unlink()
    else:
        os.replace(temporary, destination)
    return {
        "path": str(destination),
        "sha256": sha256_file(destination),
        "renderedUseSizes": rendered,
    }


def transform(
    source: Path,
    destination: Path,
    transformation: dict[str, Any],
) -> dict[str, Any]:
    Image, ImageOps, _ = require_pillow()
    if transformation.get("kind") != "optimize":
        raise PipelineError("Only the declared non-destructive 'optimize' transform is supported")
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        original_size = list(image.size)
        crop = transformation.get("crop")
        if crop is not None:
            if (
                not isinstance(crop, list)
                or len(crop) != 4
                or any(not isinstance(value, int) for value in crop)
            ):
                raise PipelineError("Transformation crop must be [left, top, right, bottom]")
            image = image.crop(tuple(crop))
        max_dimension = int(transformation.get("maxDimension", 4096))
        if max(image.size) > max_dimension:
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
        output_format = str(transformation.get("outputFormat", "PNG")).upper()
        if output_format != "PNG":
            raise PipelineError("World 2 runtime transformation currently supports PNG only")
        if transformation.get("preserveAlpha", True) and (
            "A" in image.mode or "transparency" in image.info
        ):
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
        metadata_marker = transformation.get("metadataMarker")
        if metadata_marker:
            from PIL.PngImagePlugin import PngInfo

            metadata = PngInfo()
            metadata.add_text("World2QualificationVersion", str(metadata_marker))
            image.save(
                temporary,
                format="PNG",
                optimize=True,
                pnginfo=metadata,
            )
        else:
            image.save(temporary, format="PNG", optimize=True)
    if destination.exists():
        if sha256_file(destination) != sha256_file(temporary):
            temporary.unlink()
            raise PipelineError(
                f"Transformation output changed for immutable version: {destination}"
            )
        temporary.unlink()
    else:
        os.replace(temporary, destination)
    with Image.open(destination) as runtime_image:
        runtime_dimensions = list(runtime_image.size)
    return {
        "kind": "optimize",
        "sourceSha256": sha256_file(source),
        "outputSha256": sha256_file(destination),
        "originalDimensions": original_size,
        "runtimeDimensions": runtime_dimensions,
        "parameters": transformation,
    }


def deterministic_decision(records: list[dict[str, Any]]) -> tuple[str, list[str]]:
    decisions: list[str] = []
    revision_notes: list[str] = []
    for record in records:
        output = record["output"]
        decision = output.get("decision")
        if decision:
            decisions.append(decision)
        if output.get("revisionNote"):
            revision_notes.append(output["revisionNote"])
        for finding in output.get("hardFindings", []):
            decisions.append(finding["status"])
    if "fail" in decisions:
        return "rejected", revision_notes
    if "uncertain" in decisions or any(value != "pass" for value in decisions):
        return "needs_review", revision_notes
    return "qualified", revision_notes


def evaluate_subject(
    *,
    subject_kind: str,
    image_path: Path,
    asset_id: str,
    prompt_text: str,
    prompt_hash: str,
    specification: dict[str, Any],
    evaluator: Any,
    references: list[Path],
    world2_root: Path,
    logger: StructuredLogger,
    source_hash: str | None = None,
    transformation_record: dict[str, Any] | None = None,
) -> dict[str, Any]:
    image_hash = sha256_file(image_path)
    evidence_root = (
        world2_root / "qualification" / safe_name(asset_id) / image_hash
    )
    final_path = evidence_root / (
        "qualification.json"
        if subject_kind == "runtime_derivative"
        else "source-qualification.json"
    )
    node_root = evidence_root / "nodes" / safe_name(subject_kind)
    specification_hash = sha256_bytes(canonical_json_bytes(specification))
    if final_path.exists():
        final = read_json(final_path)
        expected_resume = {
            "assetId": asset_id,
            "subjectKind": subject_kind,
            "sha256": image_hash,
            "sourceSha256": source_hash,
            "promptSha256": prompt_hash,
            "specificationSha256": specification_hash,
            "evaluator": {
                "provider": evaluator.provider,
                "model": evaluator.model,
                "mode": evaluator.mode,
            },
        }
        changed = [
            key for key, expected in expected_resume.items() if final.get(key) != expected
        ]
        if changed:
            raise PipelineError(
                "Existing immutable qualification has different inputs "
                f"({', '.join(changed)}); use a new candidate version/hash"
            )
        logger.emit(
            "world2.asset.qualification.resumed",
            assetId=asset_id,
            subjectKind=subject_kind,
            sha256=image_hash,
            automatedDecision=final.get("automatedDecision"),
        )
        return final

    specification_record = node_evidence(
        node_root / "000-specification.json",
        node=f"{subject_kind}.specification",
        input_material={
            "assetId": asset_id,
            "promptSha256": prompt_hash,
            "specification": specification,
        },
        operation=lambda: {
            "decision": "pass",
            "hardFindings": [],
            "evidence": [
                "Exact prompt hash and complete structured purpose specification are present."
            ],
            "promptSha256": prompt_hash,
            "specification": specification,
        },
        logger=logger,
    )
    evaluations: list[dict[str, Any]] = [specification_record]
    if transformation_record is not None:
        transformation_evidence = node_evidence(
            node_root / "005-transformation.json",
            node=f"{subject_kind}.transformation",
            input_material=transformation_record,
            operation=lambda: {
                "decision": "pass",
                "hardFindings": [],
                "evidence": [
                    "Runtime derivative exact hash is linked to the immutable source hash and declared transformation."
                ],
                "transformation": transformation_record,
            },
            logger=logger,
        )
        evaluations.append(transformation_evidence)

    file_contract = dict(specification["fileContract"])
    file_contract["alpha"] = specification["alphaContract"]
    integrity = node_evidence(
        node_root / "010-file-integrity.json",
        node=f"{subject_kind}.file_integrity",
        input_material={
            "imageSha256": image_hash,
            "fileContract": file_contract,
        },
        operation=lambda: {
            "decision": "pass",
            "hardFindings": [],
            "evidence": ["Image decoded and all declared file contracts passed."],
            "inspection": inspect_image(image_path, file_contract),
        },
        logger=logger,
    )
    evaluations.append(integrity)
    for index, node in enumerate(EVALUATION_NODES, start=20):
        record = node_evidence(
            node_root / f"{index:03d}-{node}.json",
            node=f"{subject_kind}.{node}",
            input_material={
                "imageSha256": image_hash,
                "promptSha256": prompt_hash,
                "specification": specification,
                "referenceHashes": [sha256_file(path) for path in references],
                "evaluator": {
                    "provider": evaluator.provider,
                    "model": evaluator.model,
                    "mode": evaluator.mode,
                },
            },
            operation=lambda node=node: evaluator.evaluate(
                node, image_path, prompt_text, specification, references
            ),
            logger=logger,
        )
        evaluations.append(record)

    preview_path = evidence_root / "previews" / f"{subject_kind}-use-sizes.png"
    preview_record = node_evidence(
        node_root / "060-use-size-preview.json",
        node=f"{subject_kind}.use_size_preview",
        input_material={
            "imageSha256": image_hash,
            "useSizes": specification["useSizes"],
        },
        operation=lambda: make_previews(
            image_path, preview_path, specification["useSizes"]
        ),
        logger=logger,
    )
    readability = node_evidence(
        node_root / "070-small-scale-readability.json",
        node=f"{subject_kind}.small_scale_readability",
        input_material={
            "previewSha256": preview_record["output"]["sha256"],
            "promptSha256": prompt_hash,
            "specification": specification,
            "evaluator": {
                "provider": evaluator.provider,
                "model": evaluator.model,
                "mode": evaluator.mode,
            },
        },
        operation=lambda: evaluator.evaluate(
            "small_scale_readability",
            preview_path,
            prompt_text,
            specification,
            references,
        ),
        logger=logger,
    )
    evaluations.append(readability)
    automated_decision, repair_notes = deterministic_decision(evaluations)
    final = {
        "schemaVersion": 1,
        "assetId": asset_id,
        "subjectKind": subject_kind,
        "sha256": image_hash,
        "sourceSha256": source_hash,
        "promptSha256": prompt_hash,
        "specificationSha256": specification_hash,
        "evaluator": {
            "provider": evaluator.provider,
            "model": evaluator.model,
            "mode": evaluator.mode,
        },
        "nodeEvidence": [
            str(path.relative_to(world2_root))
            for path in sorted(node_root.glob("*.json"))
        ],
        "useSizePreview": str(preview_path.relative_to(world2_root)),
        "automatedDecision": automated_decision,
        "promptRepair": {
            "originalPromptPreserved": True,
            "maximumAttempts": int(specification.get("maximumRepairAttempts", 2)),
            "revisionNotes": repair_notes,
        },
        "recordedAt": utc_now(),
    }
    write_immutable_json(final_path, final)
    logger.emit(
        "world2.asset.qualification.completed",
        assetId=asset_id,
        subjectKind=subject_kind,
        sha256=image_hash,
        automatedDecision=automated_decision,
        evidencePath=str(final_path),
    )
    return final


def run_qualification(args: argparse.Namespace) -> int:
    logger = StructuredLogger()
    world2_root = args.world2_root.resolve()
    inventory = load_inventory(world2_root)
    version = safe_name(args.version)
    spec = spec_for_run(
        world2_root,
        inventory,
        args.asset_id,
        version,
    )
    prompt_text, prompt_hash, specification = complete_spec(world2_root, spec)
    candidate_input = args.candidate.resolve()
    if not candidate_input.is_file():
        raise PipelineError(f"Candidate file is missing: {candidate_input}")
    input_hash = sha256_file(candidate_input)
    declared_source_hash = spec.get("source", {}).get("sha256")
    if declared_source_hash and input_hash != declared_source_hash:
        raise PipelineError(
            f"Candidate hash does not match the declared immutable source for {args.asset_id}"
        )
    suffix = candidate_input.suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise PipelineError(f"Unsupported candidate file extension: {suffix}")
    candidate_path = (
        world2_root
        / "candidates"
        / safe_name(args.asset_id)
        / version
        / f"source{suffix}"
    )
    copy_immutable(candidate_input, candidate_path)
    logger.emit(
        "world2.asset.candidate.stored",
        assetId=args.asset_id,
        version=version,
        sha256=input_hash,
        path=str(candidate_path),
    )

    evaluator = (
        MockEvaluator(args.mock_evaluator.resolve())
        if args.mock_evaluator
        else OpenAIEvaluator()
    )
    references = reference_paths(world2_root, inventory, spec)
    source_qualification = evaluate_subject(
        subject_kind="source",
        image_path=candidate_path,
        asset_id=args.asset_id,
        prompt_text=prompt_text,
        prompt_hash=prompt_hash,
        specification=specification,
        evaluator=evaluator,
        references=references,
        world2_root=world2_root,
        logger=logger,
    )
    if source_qualification["automatedDecision"] != "qualified":
        logger.emit(
            "world2.asset.pipeline.stopped",
            assetId=args.asset_id,
            reason="source_not_qualified",
            automatedDecision=source_qualification["automatedDecision"],
        )
        return 2

    derivative_path = (
        world2_root
        / "derivatives"
        / safe_name(args.asset_id)
        / version
        / "runtime.png"
    )
    transformation = transform(
        candidate_path, derivative_path, specification["transformation"]
    )
    metadata = {
        "schemaVersion": 1,
        "assetId": args.asset_id,
        "semanticId": spec["semanticId"],
        "version": version,
        "sourceSha256": input_hash,
        "derivativeSha256": transformation["outputSha256"],
        "runtimePath": str(derivative_path.relative_to(world2_root)),
        "transformation": transformation,
        "recordedAt": utc_now(),
    }
    metadata_path = derivative_path.parent / "transformation.json"
    if metadata_path.exists():
        existing = read_json(metadata_path)
        if {k: v for k, v in existing.items() if k != "recordedAt"} != {
            k: v for k, v in metadata.items() if k != "recordedAt"
        }:
            raise PipelineError(
                f"Immutable transformation metadata differs: {metadata_path}"
            )
        metadata = existing
    else:
        write_immutable_json(metadata_path, metadata)
    logger.emit(
        "world2.asset.transformation.completed",
        assetId=args.asset_id,
        sourceSha256=input_hash,
        derivativeSha256=transformation["outputSha256"],
    )

    runtime_qualification = evaluate_subject(
        subject_kind="runtime_derivative",
        image_path=derivative_path,
        asset_id=args.asset_id,
        prompt_text=prompt_text,
        prompt_hash=prompt_hash,
        specification=specification,
        evaluator=evaluator,
        references=references,
        world2_root=world2_root,
        logger=logger,
        source_hash=input_hash,
        transformation_record=metadata,
    )
    logger.emit(
        "world2.asset.pipeline.completed",
        assetId=args.asset_id,
        derivativeSha256=transformation["outputSha256"],
        automatedDecision=runtime_qualification["automatedDecision"],
        parentDecision="pending",
    )
    return 0 if runtime_qualification["automatedDecision"] == "qualified" else 2


def approve(args: argparse.Namespace) -> int:
    logger = StructuredLogger()
    world2_root = args.world2_root.resolve()
    inventory = load_inventory(world2_root)
    asset_spec(inventory, args.asset_id)
    qualification_path = (
        world2_root
        / "qualification"
        / safe_name(args.asset_id)
        / args.sha256
        / "qualification.json"
    )
    qualification = read_json(qualification_path)
    if qualification.get("sha256") != args.sha256:
        raise PipelineError("Qualification hash does not match approval hash")
    if qualification.get("subjectKind") != "runtime_derivative":
        raise PipelineError("Parent approval is only valid for a runtime derivative")
    if qualification.get("automatedDecision") != "qualified":
        raise PipelineError("Parent cannot approve a derivative that is not qualified")
    if qualification.get("evaluator", {}).get("mode") != "live":
        raise PipelineError("Mock-evaluated derivatives cannot receive production approval")
    if not args.confirmed_by_parent:
        raise PipelineError("Approval requires explicit --confirmed-by-parent")
    event_id = args.event_id or str(uuid.uuid4())
    decision = {
        "schemaVersion": 1,
        "eventId": event_id,
        "assetId": args.asset_id,
        "sha256": args.sha256,
        "parentDecision": args.decision,
        "reviewer": args.reviewer,
        "note": args.note,
        "confirmedByParent": True,
        "recordedAt": utc_now(),
    }
    destination = (
        world2_root
        / "approvals"
        / safe_name(args.asset_id)
        / args.sha256
        / f"{safe_name(event_id)}.json"
    )
    write_immutable_json(destination, decision)
    logger.emit(
        "world2.asset.parent_decision.recorded",
        assetId=args.asset_id,
        sha256=args.sha256,
        parentDecision=args.decision,
        evidencePath=str(destination),
    )
    return 0


def validate_inventory(args: argparse.Namespace) -> int:
    logger = StructuredLogger()
    world2_root = args.world2_root.resolve()
    inventory = load_inventory(world2_root)
    canonical = [
        entry for entry in inventory["assets"] if entry.get("status") == "canonical"
    ]
    reserved = [
        entry for entry in inventory["assets"] if entry.get("status") == "reserved"
    ]
    expected_canonical = {
        "1001A",
        "1001B",
        "1002",
        "1004",
        "1005",
        "1006",
        "1007",
        "1008",
        "1009",
    }
    expected_reserved = {"1003", *(str(value) for value in range(1010, 1020))}
    canonical_ids = [entry["productionId"] for entry in canonical]
    if not expected_canonical.issubset(set(canonical_ids)):
        raise PipelineError("Canonical inventory is missing a required foundation ID")
    if len(canonical_ids) != len(set(canonical_ids)):
        raise PipelineError("Canonical inventory contains duplicate production IDs")
    if {entry["productionId"] for entry in reserved} != expected_reserved:
        raise PipelineError("Reserved inventory IDs must be 1003 and 1010-1019")
    semantic_ids = [entry.get("semanticId") for entry in inventory["assets"]]
    if any(not isinstance(value, str) or not value for value in semantic_ids):
        raise PipelineError("Every inventory entry requires a semanticId")
    if len(semantic_ids) != len(set(semantic_ids)):
        raise PipelineError("Inventory semanticId values must be unique")

    source_manifest = read_json(world2_root / "source-manifest.json")
    if source_manifest.get("schemaVersion") != 1:
        raise PipelineError("source-manifest.json must use schemaVersion 1")
    source_entries = source_manifest.get("assets")
    if not isinstance(source_entries, list):
        raise PipelineError("source-manifest.json requires an assets array")
    source_by_id = {
        entry.get("productionId"): entry
        for entry in source_entries
        if isinstance(entry, dict)
    }
    if len(source_by_id) != len(source_entries):
        raise PipelineError("source-manifest.json contains duplicate or invalid entries")
    if set(source_by_id) != set(canonical_ids):
        raise PipelineError("source-manifest.json must match all canonical inventory IDs")

    for entry in canonical:
        asset_id = entry["productionId"]
        prompt = entry.get("prompt", {})
        source = entry.get("source", {})
        qualification = entry.get("qualification", {})
        source_entry = source_by_id[asset_id]
        if (
            source_entry.get("promptPath") != prompt.get("path")
            or source_entry.get("promptSha256") != prompt.get("sha256")
        ):
            raise PipelineError(
                f"Prompt provenance disagrees between manifests for {asset_id}"
            )
        if prompt.get("state") == "exact":
            prompt_path = resolve_inside(world2_root, str(prompt.get("path", "")))
            if not prompt_path.is_file():
                raise PipelineError(f"Exact prompt file is missing for {asset_id}")
            if sha256_bytes(prompt_path.read_bytes()) != prompt.get("sha256"):
                raise PipelineError(f"Exact prompt hash mismatch for {asset_id}")
            if (
                qualification.get("fileContract", {}).get("expectedAspectRatio") is None
                and prompt_aspect_ratio(prompt_path.read_text(encoding="utf-8")) is None
            ):
                raise PipelineError(
                    f"Exact prompt requires one declared or prompt-derived aspect ratio "
                    f"for {asset_id}"
                )
        elif prompt.get("state") == "awaiting_exact_supplied_prompt":
            if prompt.get("sha256") is not None:
                raise PipelineError(
                    f"Awaiting prompt must not claim a hash for {asset_id}"
                )
        else:
            raise PipelineError(f"Invalid prompt state for {asset_id}")
        references = qualification.get("references")
        if not isinstance(references, list) or any(
            reference not in set(canonical_ids) for reference in references
        ):
            raise PipelineError(f"Invalid canonical references for {asset_id}")
        if asset_id in references:
            raise PipelineError(f"Asset {asset_id} cannot reference itself")
        if (
            not isinstance(qualification.get("mustShow"), list)
            or not qualification["mustShow"]
            or not isinstance(qualification.get("mustNotShow"), list)
            or not qualification["mustNotShow"]
            or not isinstance(qualification.get("useSizes"), list)
            or not qualification["useSizes"]
        ):
            raise PipelineError(f"Incomplete qualification specification for {asset_id}")
        if source_entry.get("sourceState") == "imported_exact_hash":
            relative = source_entry.get("candidatePath")
            expected_hash = source_entry.get("candidateSha256")
            path = resolve_inside(world2_root, str(relative or ""))
            if (
                not relative
                or not expected_hash
                or not path.is_file()
                or sha256_file(path) != expected_hash
            ):
                raise PipelineError(f"Imported source is missing or changed for {asset_id}")
            if (
                source.get("candidatePath") != relative
                or source.get("sha256") != expected_hash
            ):
                raise PipelineError(
                    f"Imported source provenance disagrees for {asset_id}"
                )
        elif source_entry.get("sourceState") != "awaiting_authenticated_local_import":
            raise PipelineError(f"Invalid source state for {asset_id}")
    for schema_name in (
        "inventory.schema.json",
        "source-manifest.schema.json",
        "qualification.schema.json",
    ):
        read_json(world2_root / "schemas" / schema_name)
    logger.emit(
        "world2.asset.inventory.validated",
        canonicalCount=len(canonical),
        reservedCount=len(reserved),
    )
    return 0


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument(
        "--world2-root", type=Path, default=DEFAULT_WORLD2_ROOT, help=argparse.SUPPRESS
    )
    subparsers = value.add_subparsers(dest="command", required=True)
    validate = subparsers.add_parser("validate", help="validate inventory identity")
    validate.set_defaults(handler=validate_inventory)

    run = subparsers.add_parser("run", help="qualify source and runtime derivative")
    run.add_argument("--asset-id", required=True)
    run.add_argument("--version", required=True)
    run.add_argument("--candidate", type=Path, required=True)
    run.add_argument(
        "--mock-evaluator",
        type=Path,
        help="test-only deterministic evaluator fixture; never production-approvable",
    )
    run.set_defaults(handler=run_qualification)

    approval = subparsers.add_parser("approve", help="append a parent decision event")
    approval.add_argument("--asset-id", required=True)
    approval.add_argument("--sha256", required=True)
    approval.add_argument("--decision", choices=("approved", "rejected"), required=True)
    approval.add_argument("--reviewer", required=True)
    approval.add_argument("--note", required=True)
    approval.add_argument("--event-id")
    approval.add_argument("--confirmed-by-parent", action="store_true")
    approval.set_defaults(handler=approve)
    return value


def main() -> int:
    args = parser().parse_args()
    try:
        return int(args.handler(args))
    except PipelineError as error:
        StructuredLogger().emit(
            "world2.asset.pipeline.failed",
            errorType=type(error).__name__,
            message=str(error),
        )
        return 1
    except KeyboardInterrupt:
        StructuredLogger().emit(
            "world2.asset.pipeline.failed",
            errorType="KeyboardInterrupt",
            message="Interrupted; immutable completed nodes remain resumable.",
        )
        return 130


if __name__ == "__main__":
    sys.exit(main())
