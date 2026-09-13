from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

import integrate
import generate
import qualify
import verify_integrated
from common import PipelineError, canonical_json_bytes, read_json, sha256_file, write_json


PASS_RESULT = {
    "decision": "pass",
    "evidence": ["The synthetic test image is visibly present and readable."],
    "autoPassRequirements": True,
    "softScores": {"readability": 5},
    "revisionNote": "",
}


def exact_prompt_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def test_spec(prompt_hash: str) -> dict:
    return {
        "productionId": "1001A",
        "semanticId": "test.square",
        "status": "canonical",
        "prompt": {
            "state": "exact",
            "path": "prompts/1001A/v1.txt",
            "sha256": prompt_hash,
            "version": "v1",
        },
        "source": {"candidatePath": None, "sha256": None},
        "qualification": {
            "intendedScreen": "Synthetic pipeline test",
            "audience": "test runner",
            "mustShow": ["A synthetic square"],
            "mustNotShow": ["Anything except the synthetic square"],
            "references": [],
            "useSizes": [{"name": "test", "width": 32, "height": 32}],
            "alphaContract": "allowed",
            "safeZones": [],
            "expectedEmbellishmentAreas": [],
            "fileContract": {
                "minimumWidth": 32,
                "minimumHeight": 32,
                "formats": ["PNG"],
                "expectedAspectRatio": 1.0,
                "aspectRatioTolerance": 0.0,
            },
            "transformation": {
                "kind": "optimize",
                "outputFormat": "PNG",
                "maxDimension": 64,
                "preserveAlpha": True,
            },
            "maximumRepairAttempts": 2,
        },
    }


class PipelineFixture:
    def __init__(self, root: Path):
        try:
            from PIL import Image
        except ImportError as error:
            raise unittest.SkipTest("Pillow is not installed") from error
        self.root = root
        self.world2 = root / "AssetSources" / "World2"
        self.catalog = root / "Assets.xcassets"
        self.catalog.mkdir(parents=True)
        prompt_text = "SYNTHETIC TEST PROMPT — NOT PRODUCTION CONTENT\n"
        prompt_hash = exact_prompt_hash(prompt_text)
        prompt_path = self.world2 / "prompts" / "1001A" / "v1.txt"
        prompt_path.parent.mkdir(parents=True)
        prompt_path.write_text(prompt_text, encoding="utf-8")
        write_json(
            self.world2 / "inventory.json",
            {"schemaVersion": 1, "assets": [test_spec(prompt_hash)]},
        )
        write_json(
            self.world2 / "source-manifest.json",
            {
                "schemaVersion": 1,
                "assets": [
                    {
                        "productionId": "1001A",
                        "promptPath": "prompts/1001A/v1.txt",
                        "promptSha256": prompt_hash,
                        "candidatePath": None,
                        "candidateSha256": None,
                        "sourceUrl": None,
                        "sourceState": "awaiting_authenticated_local_import",
                    }
                ],
            },
        )
        self.candidate = root / "candidate.png"
        Image.new("RGBA", (64, 64), (20, 100, 200, 255)).save(self.candidate)
        self.mock_fixture = root / "evaluator.json"
        write_json(self.mock_fixture, {"default": PASS_RESULT})

    def run_args(self) -> argparse.Namespace:
        return argparse.Namespace(
            world2_root=self.world2,
            asset_id="1001A",
            version="v1",
            candidate=self.candidate,
            mock_evaluator=self.mock_fixture,
        )


class World2AssetPipelineTests(unittest.TestCase):
    def test_checked_in_inventory_has_exact_required_ids(self) -> None:
        args = argparse.Namespace(
            world2_root=REPO_ROOT / "AssetSources" / "World2"
        )
        self.assertEqual(qualify.validate_inventory(args), 0)

    def test_live_evaluator_requires_both_environment_variables(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(PipelineError, "OPENAI_API_KEY"):
                qualify.OpenAIEvaluator()
        with mock.patch.dict(
            os.environ, {"OPENAI_API_KEY": "test-only-not-a-real-key"}, clear=True
        ):
            with self.assertRaisesRegex(PipelineError, "WORLD2_ASSET_EVAL_MODEL"):
                qualify.OpenAIEvaluator()

    def test_evaluator_must_cover_exact_hard_rubric(self) -> None:
        specification = test_spec("0" * 64)["qualification"]
        requirements = qualify.evaluator_requirements("semantic", specification)
        incomplete = {
            "decision": "pass",
            "evidence": ["Synthetic visible evidence."],
            "hardFindings": [],
            "softScores": {},
            "revisionNote": "",
        }
        with self.assertRaisesRegex(PipelineError, "exact rubric"):
            qualify.validate_evaluator_result(
                "semantic", incomplete, requirements
            )
        uncertain = {
            "decision": "uncertain",
            "evidence": ["The synthetic image is ambiguous."],
            "hardFindings": [
                {
                    "requirement": requirement,
                    "status": "uncertain",
                    "evidence": "The synthetic image does not establish this requirement.",
                }
                for requirement in requirements
            ],
            "softScores": {},
            "revisionNote": "",
        }
        normalized = qualify.validate_evaluator_result(
            "semantic", uncertain, requirements
        )
        self.assertIn("non-pass evidence", normalized["revisionNote"])

        advisory_extra = {
            "decision": "fail",
            "evidence": ["All declared requirements are visibly satisfied."],
            "hardFindings": [
                {
                    "requirement": requirement,
                    "status": "pass",
                    "evidence": "Synthetic passing evidence.",
                }
                for requirement in requirements
            ]
            + [
                {
                    "requirement": "undeclared evaluator preference",
                    "status": "fail",
                    "evidence": "This was not part of the declared hard rubric.",
                }
            ],
            "softScores": {},
            "revisionNote": "Ignore the undeclared preference.",
        }
        normalized = qualify.validate_evaluator_result(
            "semantic", advisory_extra, requirements
        )
        self.assertEqual(normalized["decision"], "pass")
        self.assertEqual(len(normalized["additionalFindings"]), 1)

    def test_missing_exact_prompt_fails_specification_node(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PipelineFixture(Path(temporary))
            inventory = read_json(fixture.world2 / "inventory.json")
            inventory["assets"][0]["prompt"]["state"] = (
                "awaiting_exact_supplied_prompt"
            )
            inventory["assets"][0]["prompt"]["sha256"] = None
            write_json(fixture.world2 / "inventory.json", inventory)
            with self.assertRaisesRegex(PipelineError, "exact supplied prompt"):
                qualify.run_qualification(fixture.run_args())

    def test_mock_dag_requalifies_derivative_and_resumes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PipelineFixture(Path(temporary))
            self.assertEqual(qualify.run_qualification(fixture.run_args()), 0)
            metadata_path = (
                fixture.world2
                / "derivatives"
                / "1001A"
                / "v1"
                / "transformation.json"
            )
            metadata = read_json(metadata_path)
            derivative_hash = metadata["derivativeSha256"]
            qualification_root = (
                fixture.world2 / "qualification" / "1001A" / derivative_hash
            )
            runtime_qualification = read_json(
                qualification_root / "qualification.json"
            )
            self.assertEqual(
                runtime_qualification["subjectKind"], "runtime_derivative"
            )
            self.assertEqual(
                runtime_qualification["automatedDecision"], "qualified"
            )
            self.assertEqual(runtime_qualification["evaluator"]["mode"], "mock")
            self.assertTrue(
                all(
                    "/runtime_derivative/" in path
                    for path in runtime_qualification["nodeEvidence"]
                )
            )
            before = canonical_json_bytes(runtime_qualification)
            self.assertEqual(qualify.run_qualification(fixture.run_args()), 0)
            self.assertEqual(
                before,
                (qualification_root / "qualification.json").read_bytes(),
            )

    def test_mock_qualification_cannot_be_approved_or_integrated(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PipelineFixture(Path(temporary))
            self.assertEqual(qualify.run_qualification(fixture.run_args()), 0)
            metadata = read_json(
                fixture.world2
                / "derivatives"
                / "1001A"
                / "v1"
                / "transformation.json"
            )
            approval_args = argparse.Namespace(
                world2_root=fixture.world2,
                asset_id="1001A",
                sha256=metadata["derivativeSha256"],
                decision="approved",
                reviewer="test-parent",
                note="Synthetic approval test",
                event_id="test-event",
                confirmed_by_parent=True,
            )
            with self.assertRaisesRegex(PipelineError, "Mock-evaluated"):
                qualify.approve(approval_args)
            integration_args = argparse.Namespace(
                world2_root=fixture.world2,
                asset_catalog=fixture.catalog,
                asset_id="1001A",
            )
            with self.assertRaisesRegex(PipelineError, "live OpenAI"):
                integrate.integrate(integration_args)

    def test_exact_live_evidence_integrates_and_verifies(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = PipelineFixture(Path(temporary))
            self.assertEqual(qualify.run_qualification(fixture.run_args()), 0)
            metadata = read_json(
                fixture.world2
                / "derivatives"
                / "1001A"
                / "v1"
                / "transformation.json"
            )
            derivative_hash = metadata["derivativeSha256"]
            qualification_path = (
                fixture.world2
                / "qualification"
                / "1001A"
                / derivative_hash
                / "qualification.json"
            )
            qualification = read_json(qualification_path)
            qualification["evaluator"] = {
                "provider": "openai",
                "model": "synthetic-live-model",
                "mode": "live",
            }
            write_json(qualification_path, qualification)
            write_json(
                fixture.world2
                / "approvals"
                / "1001A"
                / derivative_hash
                / "approved.json",
                {
                    "schemaVersion": 1,
                    "eventId": "approved",
                    "assetId": "1001A",
                    "sha256": derivative_hash,
                    "parentDecision": "approved",
                    "reviewer": "synthetic-parent",
                    "note": "Synthetic integration gate fixture",
                    "confirmedByParent": True,
                    "recordedAt": "2026-01-01T00:00:00Z",
                },
            )
            args = argparse.Namespace(
                world2_root=fixture.world2,
                asset_catalog=fixture.catalog,
                asset_id="1001A",
            )
            self.assertEqual(integrate.integrate(args), 0)
            self.assertEqual(verify_integrated.verify(args), 0)
            manifest = read_json(
                fixture.catalog
                / "world2_runtime_manifest.dataset"
                / "world2_runtime_manifest.json"
            )
            entry = manifest["assets"][0]
            image_path = (
                fixture.catalog
                / f"{entry['assetCatalogName']}.imageset"
                / entry["filename"]
            )
            image_path.write_bytes(image_path.read_bytes() + b"changed")
            with self.assertRaisesRegex(PipelineError, "Integrated bytes changed"):
                verify_integrated.verify(args)

    def test_checked_in_generation_manifest_locks_prompts_and_references(self) -> None:
        world2 = REPO_ROOT / "AssetSources" / "World2"
        manifest = read_json(world2 / "generation-manifest.json")
        self.assertEqual(
            manifest["model"],
            "gpt-image-2.5-flare-2026-09-08",
        )
        representatives = manifest["representativeCandidates"]
        self.assertEqual(
            {value["class"] for value in representatives},
            {"icon_board", "ingredient_board", "decoration", "card_frame"},
        )
        for candidate in representatives:
            generate.validate_candidate(world2, candidate)
            self.assertIsNone(candidate["productionId"])
            self.assertIn("blocked_until_qualified", candidate["integrationState"])
        self.assertEqual(
            manifest["avatarPolicy"]["state"],
            "blocked_needs_parent_approved_character_reference",
        )


if __name__ == "__main__":
    unittest.main()
