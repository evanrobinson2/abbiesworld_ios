#!/usr/bin/env python3
"""Unit tests for voyage_opening_screen_dag (no Xcode)."""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "voyage_opening_screen_dag.py"


def load_mod():
    spec = importlib.util.spec_from_file_location("voyage_opening_screen_dag", SCRIPT)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    import sys

    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


class VoyageOpeningScreenDagTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.mod = load_mod()

    def test_topological_order_contracts_first(self) -> None:
        nodes = self.mod.topological_order(self.mod.build_dag(self.mod.SCREEN_SPECS))
        ids = [n.node_id for n in nodes]
        self.assertEqual(ids[0], "contracts")
        self.assertIn("title", ids)
        self.assertIn("fight", ids)
        self.assertLess(ids.index("contracts"), ids.index("fight"))

    def test_live_repo_passes(self) -> None:
        report = self.mod.run_dag()
        self.assertTrue(
            report["ok"],
            msg=f"anomalies={report['anomalies']}",
        )
        self.assertIn("title", report["okScreens"])
        self.assertIn("fight", report["okScreens"])
        self.assertIn("shop", report["okScreens"])

    def test_catalog_is_templatized(self) -> None:
        report = self.mod.run_dag()
        catalog = report["catalog"]
        self.assertEqual(report["template"], "voyage_opening_screen_dag.v1")
        ids = [row["screen_id"] for row in catalog]
        self.assertEqual(
            ids,
            ["contracts", "title", "chart", "fight", "shop", "event"],
        )
        fight = next(row for row in catalog if row["screen_id"] == "fight")
        self.assertTrue(any("porcupine" in p.lower() or "porcupine" in p for p in fight["predictions"])
                        or any("fightCastKinds" in p for p in fight["predictions"]))

    def test_anomaly_when_versus_hardcodes_named_crew(self) -> None:
        """Synthetic: fight check fails closed if namedCrew is wired again."""
        # Call the real check — if repo is healthy, inject via temporary forbid path
        # by verifying forbid_substring helper behavior.
        findings = self.mod.forbid_substring(
            'badGuys: PlinkAttackerKind.namedCrew',
            "badGuys: PlinkAttackerKind.namedCrew",
            code="fight.versus_no_full_gang",
            message="Versus must not hardcode the full named gang",
        )
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].severity, "anomaly")


if __name__ == "__main__":
    unittest.main()
