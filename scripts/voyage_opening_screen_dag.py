#!/usr/bin/env python3
"""Marble Voyage opening-screen DAG — predicted contracts → anomalies.

Templatized gate for every *predictable* opening still (capture stages). Each
screen is a DAG node with a frozen prediction list; the runner walks the graph,
collects hard anomalies + advisory issues, and exits non-zero on hard findings.

Designed so a future screen is one `ScreenSpec` entry + optional source probes —
not a new pipeline.

Usage:
  python3 scripts/voyage_opening_screen_dag.py
  python3 scripts/voyage_opening_screen_dag.py --json artifacts/voyage-opening-dag/latest.json
  python3 scripts/voyage_opening_screen_dag.py --list

Wired into:
  ./scripts/preflight_marble_voyage.sh
  ./scripts/build_marble_voyage.sh  (unless --skip-opening-dag)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "abbies.world.ios" / "abbies.world.ios"
PLINK = APP / "Views" / "World2" / "Plink"
MODELS = APP / "Models" / "World2" / "PeglinEdition"
ASSETS = APP / "Assets.xcassets"

CAPTURE_SWIFT = MODELS / "MarbleVoyageCapture.swift"
HOST_SWIFT = PLINK / "MarbleVoyageHostView.swift"
BATTLE_SWIFT = PLINK / "PlinkBattleHostView.swift"
VERSUS_SWIFT = PLINK / "PlinkBattleVersusIntroView.swift"
SHOP_SWIFT = PLINK / "MarbleVoyageShopView.swift"
ART_SWIFT = MODELS / "MarbleVoyageArt.swift"
MODELS_SWIFT = MODELS / "MarbleVoyageModels.swift"
FOE_SWIFT = MODELS / "PlinkBattleFoe.swift"
CAPTURE_SCRIPT = ROOT / "scripts" / "capture_marble_voyage.sh"


# ---------------------------------------------------------------------------
# Template types — reuse for every future opening screen
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Finding:
    """One anomaly (hard) or issue (advisory) for a screen node."""

    severity: str  # "anomaly" | "issue"
    code: str
    message: str
    evidence: str = ""


@dataclass
class ScreenResult:
    screen_id: str
    status: str  # "ok" | "failed" | "skipped"
    findings: list[Finding] = field(default_factory=list)
    predictions_checked: int = 0

    @property
    def anomalies(self) -> list[Finding]:
        return [f for f in self.findings if f.severity == "anomaly"]

    @property
    def issues(self) -> list[Finding]:
        return [f for f in self.findings if f.severity == "issue"]


CheckFn = Callable[[], list[Finding]]


@dataclass(frozen=True)
class ScreenSpec:
    """One predictable opening screen.

    Add a future still by appending a ScreenSpec — keep `predictions` kid-readable
    so the JSON report explains *why* the gate exists.
    """

    screen_id: str
    title: str
    dependencies: tuple[str, ...]
    predictions: tuple[str, ...]
    check: CheckFn
    required_for_default_matrix: bool = False


@dataclass(frozen=True)
class DagNode:
    node_id: str
    dependencies: tuple[str, ...]
    run: Callable[[dict[str, ScreenResult]], ScreenResult]


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.is_file() else ""


def imageset_exists(catalog_name: str) -> bool:
    return (ASSETS / f"{catalog_name}.imageset").is_dir()


def require_file(path: Path, code: str) -> list[Finding]:
    if path.is_file():
        return []
    return [
        Finding(
            severity="anomaly",
            code=code,
            message=f"Missing source file: {path.relative_to(ROOT)}",
            evidence=str(path),
        )
    ]


def require_substring(
    text: str,
    needle: str,
    *,
    code: str,
    message: str,
    severity: str = "anomaly",
) -> list[Finding]:
    if needle in text:
        return []
    return [Finding(severity=severity, code=code, message=message, evidence=needle)]


def require_regex(
    text: str,
    pattern: str,
    *,
    code: str,
    message: str,
    severity: str = "anomaly",
) -> list[Finding]:
    if re.search(pattern, text, re.MULTILINE):
        return []
    return [Finding(severity=severity, code=code, message=message, evidence=pattern)]


def forbid_substring(
    text: str,
    needle: str,
    *,
    code: str,
    message: str,
    severity: str = "anomaly",
) -> list[Finding]:
    if needle not in text:
        return []
    return [Finding(severity=severity, code=code, message=message, evidence=needle)]


# ---------------------------------------------------------------------------
# Screen checks (predicted opening states)
# ---------------------------------------------------------------------------


def check_contracts() -> list[Finding]:
    """Shared capture / stage vocabulary — every screen depends on this."""
    findings: list[Finding] = []
    findings.extend(require_file(CAPTURE_SWIFT, "contracts.capture_swift"))
    findings.extend(require_file(CAPTURE_SCRIPT, "contracts.capture_script"))
    text = read(CAPTURE_SWIFT)
    script = read(CAPTURE_SCRIPT)

    for stage in ("title", "chart", "fight", "shop", "event"):
        findings.extend(
            require_substring(
                text,
                f"case {stage}",
                code=f"contracts.stage.{stage}",
                message=f"MarbleVoyageCaptureStage must include .{stage}",
            )
        )

    findings.extend(
        require_substring(
            text,
            "static let defaultMatrix: [MarbleVoyageCaptureStage] = [.title, .chart, .fight]",
            code="contracts.default_matrix",
            message="defaultMatrix must stay title → chart → fight (App Store core stills)",
        )
    )
    findings.extend(
        require_substring(
            text,
            'static let captureFightNodeID = "land0_fight1"',
            code="contracts.opening_fight_id",
            message="Opening fight still must park on land0_fight1 (Trail scrap)",
        )
    )
    findings.extend(
        require_substring(
            script,
            'STAGES="title,chart,fight"',
            code="contracts.capture_script_stages",
            message="capture_marble_voyage.sh default STAGES must match defaultMatrix",
        )
    )
    return findings


def check_title() -> list[Finding]:
    findings: list[Finding] = []
    art = read(ART_SWIFT)
    host = read(HOST_SWIFT)
    findings.extend(require_file(ART_SWIFT, "title.art_swift"))
    findings.extend(
        require_substring(
            art,
            'static let titleCatalogName = "world2_title_marbleVoyage"',
            code="title.catalog_name",
            message="Title plate catalog name must stay world2_title_marbleVoyage",
        )
    )
    happy = ASSETS / "world2_peglin_abbie_happy.imageset"
    if happy.is_dir():
        orphans = [
            p.name
            for p in happy.iterdir()
            if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
            and p.name not in {"abbie-regal-happy.jpeg", "abbie-regal-happy.png"}
            and "Contents" not in p.name
        ]
        # Only flag files not referenced in Contents.json
        contents = read(happy / "Contents.json")
        stray = [name for name in orphans if name not in contents]
        if stray:
            findings.append(
                Finding(
                    severity="anomaly",
                    code="title.abbie_imageset_orphan",
                    message=f"Unassigned files in abbie happy imageset: {', '.join(stray)}",
                    evidence=str(happy),
                )
            )
    if not imageset_exists("world2_title_marbleVoyage"):
        findings.append(
            Finding(
                severity="anomaly",
                code="title.imageset",
                message="Missing Assets.xcassets/world2_title_marbleVoyage.imageset",
            )
        )
    findings.extend(
        require_substring(
            host,
            'accessibilityIdentifier("world2.marbleVoyage.title")',
            code="title.a11y",
            message="Title chrome needs world2.marbleVoyage.title for capture / UI tests",
        )
    )
    return findings


def check_chart() -> list[Finding]:
    findings: list[Finding] = []
    host = read(HOST_SWIFT)
    findings.extend(require_file(HOST_SWIFT, "chart.host_swift"))
    for needle, code, msg in (
        (
            'accessibilityIdentifier("world2.marbleVoyage.chart")',
            "chart.a11y",
            "Chart needs world2.marbleVoyage.chart",
        ),
        (
            'accessibilityIdentifier("world2.marbleVoyage.climb.abbieCard")',
            "chart.abbie_card",
            "Overland must dock Abbie status card (climb.abbieCard)",
        ),
        (
            'accessibilityIdentifier("world2.marbleVoyage.climbReveal.name")',
            "chart.foe_card",
            "Overland foe/cast card must keep climbReveal.name",
        ),
        (
            "climbAbbieCard",
            "chart.abbie_card_view",
            "Host must define climbAbbieCard for the bottom player cast",
        ),
    ):
        findings.extend(require_substring(host, needle, code=code, message=msg))

    # Names moved off player tiles — overlays on Abbie/fighters were the waste.
    findings.extend(
        forbid_substring(
            host,
            'chartTileNameOverlay("ABBIE"',
            code="chart.no_abbie_tile_name",
            message="Abbie tile must not show name overlay (lives on bottom card)",
        )
    )
    findings.extend(
        forbid_substring(
            host,
            "fighter.shortName.uppercased()",
            code="chart.no_fighter_tile_name",
            message="Fighter tiles must not paint name overlays (foe card owns names)",
        )
    )
    findings.extend(
        require_substring(
            host,
            "VoyageTileLegibility.abbieTrayPlan",
            code="chart.abbie_legibility",
            message="Abbie tray must layout through VoyageTileLegibility (no ad-hoc squeeze)",
        )
    )
    findings.extend(
        require_substring(
            host,
            "VoyageTileLegibility.chartArtEdgeFraction()",
            code="chart.tile_fill",
            message="Chart tiles must use VoyageTileLegibility art inset so faces fill the square",
        )
    )
    findings.extend(
        require_substring(
            host,
            "PlinkAttackerBattlePortrait(",
            code="chart.fighter_face_tile",
            message="Fight chart tiles must use the face-cropped battle portrait, not a raw scaledToFit body",
        )
    )
    return findings


def check_fight() -> list[Finding]:
    """Opening fight is predictable: Trail scrap → porcupine lead + hench pack."""
    findings: list[Finding] = []
    findings.extend(require_file(BATTLE_SWIFT, "fight.battle_swift"))
    findings.extend(require_file(VERSUS_SWIFT, "fight.versus_swift"))
    findings.extend(require_file(FOE_SWIFT, "fight.foe_swift"))
    findings.extend(require_file(MODELS_SWIFT, "fight.models_swift"))

    battle = read(BATTLE_SWIFT)
    versus = read(VERSUS_SWIFT)
    foe = read(FOE_SWIFT)
    models = read(MODELS_SWIFT)

    findings.extend(
        require_substring(
            battle,
            'accessibilityIdentifier("world2.plink.battle")',
            code="fight.a11y",
            message="Battle host needs world2.plink.battle",
        )
    )
    findings.extend(
        require_substring(
            versus,
            'accessibilityIdentifier("world2.plink.battle.versus")',
            code="fight.versus_a11y",
            message="Versus splash needs world2.plink.battle.versus",
        )
    )

    # Exact cast — not the whole named gang.
    findings.extend(
        require_substring(
            battle,
            "badGuys: fightCastKinds",
            code="fight.versus_uses_roster",
            message="Versus splash must pass fightCastKinds (exact crew), not namedCrew",
        )
    )
    findings.extend(
        forbid_substring(
            battle,
            "badGuys: PlinkAttackerKind.namedCrew",
            code="fight.versus_no_full_gang",
            message="Versus must not hardcode the full named gang",
        )
    )
    findings.extend(
        require_substring(
            battle,
            "case .henchman:\n            return waveAttacker",
            code="fight.hench_lead_is_wave",
            message="Hench fights must lead with waveAttacker (not land mini-boss)",
        )
    )
    findings.extend(
        require_substring(
            foe,
            "static func rescueRosterSeed(",
            code="fight.stable_roster_seed",
            message="Rescue roster needs a stable seed so versus matches the board",
        )
    )
    findings.extend(
        require_substring(
            foe,
            "static func rescueCastKinds(",
            code="fight.cast_kinds_helper",
            message="rescueCastKinds helper must exist for versus / deck strip",
        )
    )

    # Opening tile prediction (campaign authoring): first POI of land 0 is porcupine.
    findings.extend(
        require_substring(
            models,
            "waveAttacker: step == 1 ? .porcupineBoxer",
            code="fight.opening_porcupine",
            message="First campaign fight (step==1 / land0_fight1) must be porcupineBoxer",
        )
    )
    findings.extend(
        require_substring(
            models,
            "// Opening campaign fight always introduces the approved boxer.",
            code="fight.opening_porcupine_comment",
            message="Keep the opening-boxer author comment so the prediction stays intentional",
            severity="issue",
        )
    )
    findings.extend(
        require_substring(
            foe,
            "static func previewLeadFoeStats(",
            code="fight.preview_lead_stats",
            message="Overland cards must preview lead-foe HP/ATK (not cage formula)",
        )
    )
    host = read(HOST_SWIFT)
    findings.extend(
        forbid_substring(
            host,
            "hp: run.enemyMaxHP(for: node)",
            code="fight.engage_no_cage_hp",
            message="Engage card must not use cage-era enemyMaxHP for fight tiles",
        )
    )
    findings.extend(
        require_substring(
            host,
            "PeglinBattleRules.previewLeadFoeStats(",
            code="fight.engage_uses_lead_stats",
            message="Engage card must call previewLeadFoeStats",
        )
    )
    findings.extend(
        require_substring(
            battle,
            'accessibilityIdentifier("world2.plink.battle.enemyCard")',
            code="fight.enemy_card",
            message="Side cast enemy card must stay wired (enemyCard)",
        )
    )
    return findings


def check_shop() -> list[Finding]:
    findings: list[Finding] = []
    findings.extend(require_file(SHOP_SWIFT, "shop.shop_swift"))
    shop = read(SHOP_SWIFT)
    art = read(ART_SWIFT)

    findings.extend(
        require_substring(
            shop,
            'accessibilityIdentifier("world2.marbleVoyage.shop")',
            code="shop.a11y",
            message="Bell Market needs world2.marbleVoyage.shop",
        )
    )
    for needle, code, msg in (
        (
            'accessibilityIdentifier("world2.marbleVoyage.shop.bag")',
            "shop.bag_drawer",
            "Bag must live in a drawer (shop.bag)",
        ),
        (
            'accessibilityIdentifier("world2.marbleVoyage.shop.bagToggle")',
            "shop.bag_toggle",
            "Bag toggle chip required for one-screen market",
        ),
        (
            'accessibilityIdentifier("world2.marbleVoyage.shop.leave")',
            "shop.leave",
            "Climb leave control required",
        ),
        (
            "showBagDrawer",
            "shop.bag_state",
            "Shop must track showBagDrawer (bag as drawer, not always-on strip)",
        ),
    ):
        findings.extend(require_substring(shop, needle, code=code, message=msg))

    # One-screen layout — primary chrome is a VStack, not a full ScrollView stack.
    if re.search(r"ScrollView\s*\{[\s\S]*?bagStrip", shop):
        findings.append(
            Finding(
                severity="anomaly",
                code="shop.no_scroll_bag_stack",
                message="Bag must not sit in a tall ScrollView stack (one-screen market)",
                evidence="ScrollView{…bagStrip",
            )
        )

    findings.extend(
        require_substring(
            art,
            "bellMarketInteriorCatalogName",
            code="shop.plate_constant",
            message="Bell Market interior catalog constant required",
        )
    )
    catalog = "world2_plate_marbleVoyage_shop_bellMarket_interior"
    if not imageset_exists(catalog):
        findings.append(
            Finding(
                severity="anomaly",
                code="shop.imageset",
                message=f"Missing Assets.xcassets/{catalog}.imageset",
            )
        )
    return findings


def check_event() -> list[Finding]:
    findings: list[Finding] = []
    capture = read(CAPTURE_SWIFT)
    host = read(HOST_SWIFT)
    findings.extend(
        require_substring(
            capture,
            'static let captureEventNodeID = "land0_gift1"',
            code="event.capture_node",
            message="Event still must park on land0_gift1",
        )
    )
    findings.extend(
        require_substring(
            host,
            'accessibilityIdentifier("world2.marbleVoyage.event")',
            code="event.a11y",
            message="Event chrome needs world2.marbleVoyage.event",
        )
    )
    return findings


# ---------------------------------------------------------------------------
# Screen catalog — append here for future stills
# ---------------------------------------------------------------------------


SCREEN_SPECS: list[ScreenSpec] = [
    ScreenSpec(
        screen_id="contracts",
        title="Capture / stage contracts",
        dependencies=(),
        predictions=(
            "Stages: title, chart, fight, shop, event",
            "defaultMatrix = title, chart, fight",
            "Opening fight node = land0_fight1",
        ),
        check=check_contracts,
        required_for_default_matrix=True,
    ),
    ScreenSpec(
        screen_id="title",
        title="Title opening",
        dependencies=("contracts",),
        predictions=(
            "Title plate imageset present",
            "world2.marbleVoyage.title a11y id",
        ),
        check=check_title,
        required_for_default_matrix=True,
    ),
    ScreenSpec(
        screen_id="chart",
        title="Overland climb chart",
        dependencies=("contracts",),
        predictions=(
            "Abbie bottom card present",
            "Foe cast card present",
            "No name overlays on Abbie/fighter tiles",
        ),
        check=check_chart,
        required_for_default_matrix=True,
    ),
    ScreenSpec(
        screen_id="fight",
        title="Opening fight / versus",
        dependencies=("contracts",),
        predictions=(
            "Versus shows exact fightCastKinds",
            "Hench lead = wave attacker",
            "land0_fight1 → porcupineBoxer",
            "Stable rescue roster seed",
        ),
        check=check_fight,
        required_for_default_matrix=True,
    ),
    ScreenSpec(
        screen_id="shop",
        title="Bell Market (post-fight)",
        dependencies=("contracts",),
        predictions=(
            "Bag is a drawer",
            "One-screen market chrome",
            "Bell Market plate bound",
        ),
        check=check_shop,
        required_for_default_matrix=False,
    ),
    ScreenSpec(
        screen_id="event",
        title="Event still",
        dependencies=("contracts",),
        predictions=(
            "Event parks on land0_gift1",
            "Event a11y id present",
        ),
        check=check_event,
        required_for_default_matrix=False,
    ),
]


def topological_order(nodes: list[DagNode]) -> list[DagNode]:
    by_id = {node.node_id: node for node in nodes}
    if len(by_id) != len(nodes):
        raise RuntimeError("DAG node IDs must be unique")
    resolved: set[str] = set()
    ordered: list[DagNode] = []
    while len(ordered) < len(nodes):
        ready = [
            node
            for node in nodes
            if node.node_id not in resolved
            and all(dep in resolved for dep in node.dependencies)
        ]
        if not ready:
            unresolved = sorted(set(by_id) - resolved)
            raise RuntimeError(f"DAG cycle or missing dependency: {unresolved}")
        for node in sorted(ready, key=lambda item: item.node_id):
            ordered.append(node)
            resolved.add(node.node_id)
    return ordered


def build_dag(specs: list[ScreenSpec]) -> list[DagNode]:
    nodes: list[DagNode] = []

    def make_runner(spec: ScreenSpec) -> Callable[[dict[str, ScreenResult]], ScreenResult]:
        def run(prior: dict[str, ScreenResult]) -> ScreenResult:
            for dep in spec.dependencies:
                parent = prior.get(dep)
                if parent is None or parent.status == "failed":
                    return ScreenResult(
                        screen_id=spec.screen_id,
                        status="skipped",
                        findings=[
                            Finding(
                                severity="issue",
                                code=f"{spec.screen_id}.skipped_upstream",
                                message=f"Skipped — dependency '{dep}' did not pass",
                            )
                        ],
                    )
            findings = list(spec.check())
            status = "failed" if any(f.severity == "anomaly" for f in findings) else "ok"
            return ScreenResult(
                screen_id=spec.screen_id,
                status=status,
                findings=findings,
                predictions_checked=len(spec.predictions),
            )

        return run

    for spec in specs:
        nodes.append(
            DagNode(
                node_id=spec.screen_id,
                dependencies=spec.dependencies,
                run=make_runner(spec),
            )
        )
    return nodes


def run_dag(
    specs: list[ScreenSpec] | None = None,
) -> dict[str, object]:
    specs = specs or SCREEN_SPECS
    nodes = topological_order(build_dag(specs))
    results: dict[str, ScreenResult] = {}
    for node in nodes:
        results[node.node_id] = node.run(results)

    anomalies = [
        {"screen": r.screen_id, **asdict(f)}
        for r in results.values()
        for f in r.anomalies
    ]
    issues = [
        {"screen": r.screen_id, **asdict(f)}
        for r in results.values()
        for f in r.issues
    ]
    failed = [r.screen_id for r in results.values() if r.status == "failed"]
    ok = [r.screen_id for r in results.values() if r.status == "ok"]

    return {
        "ok": len(anomalies) == 0,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "template": "voyage_opening_screen_dag.v1",
        "screens": {
            sid: {
                "status": res.status,
                "predictionsChecked": res.predictions_checked,
                "anomalyCount": len(res.anomalies),
                "issueCount": len(res.issues),
                "findings": [asdict(f) for f in res.findings],
            }
            for sid, res in results.items()
        },
        "anomalies": anomalies,
        "issues": issues,
        "failedScreens": failed,
        "okScreens": ok,
        "catalog": [
            {
                "screen_id": s.screen_id,
                "title": s.title,
                "dependencies": list(s.dependencies),
                "predictions": list(s.predictions),
                "required_for_default_matrix": s.required_for_default_matrix,
            }
            for s in specs
        ],
    }


def print_human(report: dict[str, object]) -> None:
    print("=== Voyage opening-screen DAG ===")
    screens = report["screens"]  # type: ignore[index]
    assert isinstance(screens, dict)
    for screen_id, payload in screens.items():
        assert isinstance(payload, dict)
        status = str(payload["status"]).upper()
        print(f"  [{status}] {screen_id}  (predictions={payload['predictionsChecked']})")
        for finding in payload.get("findings") or []:
            assert isinstance(finding, dict)
            mark = "!" if finding["severity"] == "anomaly" else "?"
            print(f"      {mark} {finding['code']}: {finding['message']}")
    print()
    anomalies = report.get("anomalies") or []
    issues = report.get("issues") or []
    assert isinstance(anomalies, list) and isinstance(issues, list)
    if anomalies:
        print(f"ANOMALIES ({len(anomalies)}):")
        for item in anomalies:
            assert isinstance(item, dict)
            print(f"  - [{item['screen']}] {item['code']}: {item['message']}")
    else:
        print("ANOMALIES: none")
    if issues:
        print(f"ISSUES ({len(issues)}):")
        for item in issues:
            assert isinstance(item, dict)
            print(f"  - [{item['screen']}] {item['code']}: {item['message']}")
    print()
    if report.get("ok"):
        print("OPENING-SCREEN DAG OK")
    else:
        failed = report.get("failedScreens") or []
        print(f"OPENING-SCREEN DAG FAILED — screens: {', '.join(map(str, failed))}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--json",
        type=Path,
        help="Write structured report JSON (also printed human summary)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List screen catalog / predictions and exit 0",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Only print the final OK/FAILED line",
    )
    parser.add_argument(
        "--multimodal",
        action="store_true",
        help="After static checks, run OpenAI multimodal reasoning on latest capture stills",
    )
    parser.add_argument(
        "--stills",
        type=Path,
        default=None,
        help="Capture stamp dir for --multimodal (default: latest artifacts/voyage-capture/*)",
    )
    args = parser.parse_args(argv)

    if args.list:
        for spec in SCREEN_SPECS:
            flag = "matrix" if spec.required_for_default_matrix else "extra"
            print(f"{spec.screen_id} ({flag}) — {spec.title}")
            print(f"  deps: {', '.join(spec.dependencies) or '—'}")
            for pred in spec.predictions:
                print(f"  • {pred}")
        return 0

    report = run_dag()
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        if not args.quiet:
            print(f"wrote {args.json}")

    if args.quiet:
        print("OPENING-SCREEN DAG OK" if report["ok"] else "OPENING-SCREEN DAG FAILED")
    else:
        print_human(report)

    exit_code = 0 if report["ok"] else 1
    if args.multimodal:
        if exit_code != 0:
            print("Skipping multimodal — static DAG failed.", file=sys.stderr)
            return exit_code
        # Chain: static contracts → OpenAI vision reasoning on stills.
        import subprocess

        multi = ROOT / "scripts" / "voyage_opening_multimodal_review.py"
        out = ROOT / "artifacts" / "voyage-opening-dag" / "multimodal.json"
        cmd = [sys.executable, str(multi), "--json", str(out)]
        if args.stills:
            cmd.extend(["--stills", str(args.stills)])
        print()
        print("→ multimodal reasoning chain (OpenAI)")
        proc = subprocess.run(cmd, cwd=str(ROOT))
        if proc.returncode != 0:
            exit_code = proc.returncode
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
