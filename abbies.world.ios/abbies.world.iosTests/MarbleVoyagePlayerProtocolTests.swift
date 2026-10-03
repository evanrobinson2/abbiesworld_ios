import XCTest
@testable import abbies_world_ios

final class MarbleVoyagePlayerProtocolTests: XCTestCase {

    func testProtocolMapHasBranches() {
        let fresh = MarbleVoyageRun.makeProtocolCampaign(seed: 42)
        XCTAssertEqual(fresh.currentNodeID, "start")
        let choices = fresh.reachableChoices()
        XCTAssertEqual(choices.count, 2, "protocol map should fork at start")
        XCTAssertTrue(choices.contains { $0.id.hasSuffix("_easy") })
        XCTAssertTrue(choices.contains { $0.id.hasSuffix("_hard") })
    }

    func testSoftmaxIsStochasticAcrossSeeds() {
        var picks = Set<String>()
        let scores = ["a": 2.0, "b": 2.0, "c": 1.0]
        for i in 0..<40 {
            var rng = SeededGenerator(seed: UInt64(i) &* 997)
            let id = MarbleVoyagePlayerProtocol.softmaxSample(
                ids: ["a", "b", "c"],
                scores: scores,
                temperature: 1.0,
                rng: &rng
            )
            picks.insert(id)
        }
        XCTAssertGreaterThan(picks.count, 1, "softmax should not collapse to one id")
    }

    func testMapScoresDifferByArchetype() {
        let fight = MarbleVoyageNode(
            id: "f", kind: .fight, column: 1, row: 0, title: "Fight", threat: 3
        )
        let shrine = MarbleVoyageNode(
            id: "s", kind: .shrine, column: 1, row: 2, title: "Shrine", threat: 3
        )
        let run = MarbleVoyageRun.makeProtocolCampaign(seed: 7)
        let pegFight = MarbleVoyagePlayerProtocol.mapScore(
            player: .hitPegs, node: fight, hpFrac: 0.4, run: run
        )
        let pegShrine = MarbleVoyagePlayerProtocol.mapScore(
            player: .hitPegs, node: shrine, hpFrac: 0.4, run: run
        )
        XCTAssertGreaterThan(pegFight, pegShrine)

        let metaShrineHurt = MarbleVoyagePlayerProtocol.mapScore(
            player: .metaAware, node: shrine, hpFrac: 0.3, run: run
        )
        let metaFightHurt = MarbleVoyagePlayerProtocol.mapScore(
            player: .metaAware, node: fight, hpFrac: 0.3, run: run
        )
        XCTAssertGreaterThan(metaShrineHurt, metaFightHurt)
    }

    func testProtocolAuditCollectsStatsAndWritesEvidence() throws {
        let report = MarbleVoyageCampaignSim.runProtocolAudit(
            trialsPerPlayer: 12,
            seed: 19,
            mapMode: .protocolAudit,
            writeEvidence: true
        )
        XCTAssertEqual(report.players.count, 3)
        for player in report.players {
            print(
                "PROTOCOL \(player.player): clear=\(String(format: "%.0f%%", player.clearRate * 100)) " +
                "fights=\(String(format: "%.1f", player.stats["fightsCleared"]?.mean ?? 0)) " +
                "hangSmell=\(String(format: "%.0f%%", (player.smellRates["longHangFewPegs"] ?? 0) * 100)) " +
                "lateCollapse=\(String(format: "%.0f%%", player.lateCollapseRate * 100)) " +
                "finalWR=\(String(format: "%.0f%%", player.finalFightWinRate * 100)) " +
                "ballLv=\(String(format: "%.1f", player.stats["ballLevel"]?.mean ?? 0)) " +
                "temper×=\(String(format: "%.2f", player.stats["meanTemperFactor"]?.mean ?? 0))"
            )
            let stageLine = player.survivalByStage.map {
                "\($0.id)=\(String(format: "%.0f%%", $0.rate * 100))"
            }.joined(separator: " → ")
            print("PROTOCOL_FUNNEL \(player.player): \(stageLine)")
            let fightLine = player.survivalByFights
                .filter { $0.id == "fights>=0" || $0.rate < 0.999 || $0.id.hasSuffix("0") || Int($0.id.split(separator: ">=").last ?? "0").map { $0 % 2 == 0 } ?? false }
                .prefix(20)
                .map { "\($0.id.replacingOccurrences(of: "fights>=", with: ""))=\(String(format: "%.0f%%", $0.rate * 100))" }
                .joined(separator: " ")
            print("PROTOCOL_SURVIVAL \(player.player): \(fightLine)")
            XCTAssertEqual(player.trials, 12)
            XCTAssertNotNil(player.stats["meanShotDuration"])
            XCTAssertNotNil(player.stats["branchedMapPicks"])
            XCTAssertFalse(player.survivalByStage.isEmpty)
            // Stochastic map: some branched picks on average.
            XCTAssertGreaterThan(player.stats["branchedMapPicks"]?.mean ?? 0, 0.5)
        }
        for note in report.crossPlayerNotes {
            print("PROTOCOL_NOTE \(note)")
        }
        let url = try MarbleVoyagePlayTelemetry.writeEvidence(report)
        XCTAssertTrue(FileManager.default.fileExists(atPath: url.path))
        print("PROTOCOL_EVIDENCE \(url.path)")
    }

    func testInstrumentedRunLogsMapAndShopDecisions() {
        let trial = MarbleVoyageCampaignSim.playCampaign(
            seed: 101,
            player: .metaAware,
            mapMode: .protocolAudit
        )
        let log = try! XCTUnwrap(trial.log)
        XCTAssertFalse(log.mapPicks.isEmpty)
        XCTAssertTrue(log.mapPicks.contains { $0.choiceCount >= 2 })
        // Shop may or may not occur if early death — but fights should log durations.
        if let fight = log.fights.first {
            XCTAssertGreaterThan(fight.meanShotDuration, 0)
        }
    }
}
