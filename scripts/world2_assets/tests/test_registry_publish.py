from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest import mock


SCRIPT_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

import publish_registry
from common import PipelineError


class RegistryPlanTests(unittest.TestCase):
    def test_plan_covers_world2_asset_families_with_stable_keys(self) -> None:
        records = publish_registry.build_records(REPO_ROOT)
        by_key = {record["key"]: record for record in records}

        self.assertEqual(len(records), 138)
        self.assertIn("backgrounds/title", by_key)
        self.assertIn("pois/furniture-store/interior", by_key)
        self.assertIn("pois/poi-factory/exterior", by_key)
        self.assertIn("pois/poi-factory/interior", by_key)
        self.assertIn("pois/asset-workbench/exterior", by_key)
        self.assertIn("pois/asset-workbench/interior", by_key)
        self.assertIn("furniture/beds/abbie-starter", by_key)
        self.assertIn("furniture/props/crk-s1-01-forest-canopy-bed", by_key)
        self.assertIn("music/joyful-bounce", by_key)
        self.assertIn("video/intro", by_key)
        self.assertIn("minigames/save-the-vowels/config", by_key)
        self.assertTrue(
            all(record["source"]["type"] == "bundled" for record in records)
        )
        self.assertNotIn("ASSET_REGISTRY_ADMIN_API_KEY", repr(records))

    def test_new_asset_uses_expected_revision_zero(self) -> None:
        client = publish_registry.RegistryClient(
            "https://assets.example.test",
            "test-secret",
            "test-actor",
        )
        record = {
            "key": "ui/buttons/home",
            "source": {"type": "bundled", "bundleName": "home_button"},
            "metadata": {"role": "button"},
        }

        with mock.patch.object(
            client,
            "_request",
            side_effect=[(404, {}), (200, {"revision": 1})],
        ) as request:
            revision = client.upsert("abbies-world-2", record)

        self.assertEqual(revision, 1)
        upsert_payload = request.call_args_list[1].args[2]
        self.assertEqual(upsert_payload["expectedRevision"], 0)

    def test_existing_asset_uses_last_read_revision(self) -> None:
        client = publish_registry.RegistryClient(
            "https://assets.example.test",
            "test-secret",
            "test-actor",
        )
        record = {
            "key": "music/joyful-bounce",
            "source": {"type": "bundled", "bundleName": "joyful_bounce"},
            "metadata": {"role": "music"},
        }

        with mock.patch.object(
            client,
            "_request",
            side_effect=[(200, {"revision": 7}), (200, {"revision": 8})],
        ) as request:
            revision = client.upsert("abbies-world-2", record)

        self.assertEqual(revision, 8)
        upsert_payload = request.call_args_list[1].args[2]
        self.assertEqual(upsert_payload["expectedRevision"], 7)

    def test_admin_writes_reject_cleartext_non_loopback_server(self) -> None:
        with self.assertRaises(PipelineError):
            publish_registry.RegistryClient(
                "http://abbies.world:8000",
                "test-secret",
                "test-actor",
            )


if __name__ == "__main__":
    unittest.main()
