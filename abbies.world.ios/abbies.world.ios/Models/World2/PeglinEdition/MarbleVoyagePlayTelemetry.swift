import Foundation

/// Per-run + aggregate telemetry for player-protocol Monte Carlo.
enum MarbleVoyagePlayTelemetry {

    // MARK: - Per-decision / per-fight records

    struct MapPick: Equatable, Codable, Sendable {
        var fromID: String
        var chosenID: String
        var chosenKind: String
        var choiceCount: Int
        var forced: Bool
        var reason: String
        var hpFrac: Double
        var scores: [String: Double]
    }

    struct ShopAction: Equatable, Codable, Sendable {
        var sku: String
        var ok: Bool
        var reason: String
        var coinsBefore: Int
        var hpFracBefore: Double
    }

    struct ShopVisit: Equatable, Codable, Sendable {
        var afterNodeID: String
        var actions: [ShopAction]
        var coinsSpent: Int
        var healed: Bool
        var upgraded: Bool
        var boughtMarble: Bool
        var boughtCharm: Bool
    }

    struct FightSample: Equatable, Codable, Sendable {
        var nodeID: String
        var role: String
        var foe: String
        var won: Bool
        var rounds: Int
        var fightsClearedBefore: Int
        var temperFactor: Double
        var meanShotDuration: Double
        var maxShotDuration: Double
        var meanPegHits: Double
        var zeroHitShots: Int
        var longHangFewPegShots: Int
        var damageDealt: Int
        var damageTaken: Int
        var hpAfter: Int
        var goldEarned: Int
    }

    struct RunLog: Equatable, Codable, Sendable {
        var schemaVersion: Int
        var seed: UInt64
        var player: String
        var mapMode: String
        var won: Bool
        var fightsCleared: Int
        var campaignTotalFights: Int
        var playerHPLeft: Int
        var coins: Int
        var ballLevel: Int
        var charmCount: Int
        var marbleMeanLevel: Double
        var meanTemperFactor: Double
        var shopsVisited: Int
        var healsBought: Int
        var upgradesBought: Int
        var marblesBought: Int
        var charmsBought: Int
        var mapPicks: [MapPick]
        var shopVisits: [ShopVisit]
        var fights: [FightSample]
        var smells: [String]
        var exploitFlags: [String]
    }

    // MARK: - Aggregates

    struct StatMean: Equatable, Codable, Sendable {
        var mean: Double
        var p10: Double
        var p50: Double
        var p90: Double
        var n: Int
    }

    struct FunnelStep: Equatable, Codable, Sendable {
        /// Stable key — `fights>=N` or a named beat (`land0_boss`, `summit`, …).
        var id: String
        var label: String
        var reached: Int
        var rate: Double
    }

    struct PlayerAggregate: Equatable, Codable, Sendable {
        var player: String
        var trials: Int
        var clearRate: Double
        var lateCollapseRate: Double
        var smellRates: [String: Double]
        var exploitRates: [String: Double]
        var stats: [String: StatMean]
        /// Win rate among runs that reached the final fight (hard-fought climb).
        var finalFightWinRate: Double
        var finalFightAttempts: Int
        /// Share of runs that cleared ≥ N fights (0…max).
        var survivalByFights: [FunnelStep]
        /// Named climb beats reached (land bosses + summit).
        var survivalByStage: [FunnelStep]
    }

    struct ProtocolReport: Equatable, Codable, Sendable {
        var schemaVersion: Int
        var generatedAtISO8601: String
        var trialsPerPlayer: Int
        var baseSeed: UInt64
        var mapMode: String
        var players: [PlayerAggregate]
        var crossPlayerNotes: [String]
    }

    static let schemaVersion = 1

    // MARK: - Smell / exploit detection on one finished run

    static func detectSmells(log: RunLog) -> (smells: [MarbleVoyageFunSmell], exploits: [MarbleVoyageFunSmell]) {
        var smells: [MarbleVoyageFunSmell] = []
        var exploits: [MarbleVoyageFunSmell] = []

        let hangShots = log.fights.reduce(0) { $0 + $1.longHangFewPegShots }
        if hangShots >= 3 { smells.append(.longHangFewPegs) }

        if log.fights.contains(where: { $0.zeroHitShots >= MarbleVoyageFunSmell.zeroHitSpamThreshold }) {
            smells.append(.zeroHitSpam)
        }
        if log.fights.contains(where: { $0.rounds >= MarbleVoyageFunSmell.fightSlogRounds }) {
            smells.append(.fightSlog)
        }

        if !log.won,
           log.fightsCleared >= MarbleVoyageFunSmell.lateCollapseMinFights {
            smells.append(.lateCollapse)
        }

        if !log.won, log.coins >= MarbleVoyageFunSmell.coinHoardThreshold {
            smells.append(.coinHoardDeath)
        }

        if log.upgradesBought == 0, log.fightsCleared >= 4 {
            smells.append(.upgradeStarve)
        }

        let ignoresTemper =
            log.player == MarbleVoyageCampaignSim.PlayerType.uninterested.rawValue
            || log.player == MarbleVoyageCampaignSim.PlayerType.hitPegs.rawValue
        if ignoresTemper, log.meanTemperFactor < 0.95, log.fightsCleared >= 3 {
            smells.append(.temperIgnored)
        }

        // Exploit: cleared without ever healing — economy may be too soft.
        if log.won, log.healsBought == 0, log.player == MarbleVoyageCampaignSim.PlayerType.hitPegs.rawValue {
            exploits.append(.noHealClearExploit)
        }

        return (smells, exploits)
    }

    // MARK: - Aggregation

    static func aggregate(
        player: MarbleVoyageCampaignSim.PlayerType,
        logs: [RunLog]
    ) -> PlayerAggregate {
        let n = max(1, logs.count)
        let clears = logs.filter(\.won).count
        let late = logs.filter { $0.smells.contains(MarbleVoyageFunSmell.lateCollapse.rawValue) }.count

        var smellRates: [String: Double] = [:]
        var exploitRates: [String: Double] = [:]
        for smell in MarbleVoyageFunSmell.allCases {
            let c = logs.filter { $0.smells.contains(smell.rawValue) }.count
            smellRates[smell.rawValue] = Double(c) / Double(n)
            let e = logs.filter { $0.exploitFlags.contains(smell.rawValue) }.count
            if e > 0 { exploitRates[smell.rawValue] = Double(e) / Double(n) }
        }

        func series(_ keyPath: (RunLog) -> Double) -> StatMean {
            let vals = logs.map(keyPath).sorted()
            return percentile(vals)
        }

        var stats: [String: StatMean] = [
            "fightsCleared": series { Double($0.fightsCleared) },
            "coins": series { Double($0.coins) },
            "ballLevel": series { Double($0.ballLevel) },
            "marbleMeanLevel": series(\.marbleMeanLevel),
            "meanTemperFactor": series(\.meanTemperFactor),
            "healsBought": series { Double($0.healsBought) },
            "upgradesBought": series { Double($0.upgradesBought) },
            "marblesBought": series { Double($0.marblesBought) },
            "charmsBought": series { Double($0.charmsBought) },
            "meanShotDuration": series { meanFight($0) { $0.meanShotDuration } },
            "maxShotDuration": series { meanFight($0) { $0.maxShotDuration } },
            "meanPegHits": series { meanFight($0) { $0.meanPegHits } },
            "longHangFewPegShots": series {
                Double($0.fights.reduce(0) { $0 + $1.longHangFewPegShots })
            },
            "zeroHitShots": series {
                Double($0.fights.reduce(0) { $0 + $1.zeroHitShots })
            },
            "fightRounds": series { meanFight($0) { Double($0.rounds) } },
            "mapChoiceCount": series {
                Double($0.mapPicks.map(\.choiceCount).max() ?? 1)
            },
            "branchedMapPicks": series {
                Double($0.mapPicks.filter { !$0.forced }.count)
            },
        ]

        // Final-fight collapse: last fight sample on runs that reached campaignTotal-1+.
        let finalists = logs.filter { $0.fightsCleared >= max(0, $0.campaignTotalFights - 1) || $0.won }
        let finalWins = finalists.filter(\.won).count

        let maxFights = logs.map(\.fightsCleared).max() ?? 0
        var survivalByFights: [FunnelStep] = []
        for f in 0...maxFights {
            let reached = logs.filter { $0.fightsCleared >= f }.count
            survivalByFights.append(
                FunnelStep(
                    id: "fights>=\(f)",
                    label: "Cleared ≥ \(f) fights",
                    reached: reached,
                    rate: Double(reached) / Double(n)
                )
            )
        }

        // Named protocol-map beats: each land mini-boss + summit.
        let stageDefs: [(id: String, label: String, pred: (RunLog) -> Bool)] = [
            ("land0_boss", "Land 1 mini-boss", { reachedNode($0, id: "land0_boss") }),
            ("land1_boss", "Land 2 mini-boss", { reachedNode($0, id: "land1_boss") }),
            ("land2_boss", "Land 3 mini-boss", { reachedNode($0, id: "land2_boss") }),
            ("summit", "Summit", { $0.won || reachedNode($0, id: "boss") }),
            ("clear", "Cleared climb", { $0.won }),
        ]
        var survivalByStage: [FunnelStep] = []
        for def in stageDefs {
            let reached = logs.filter(def.pred).count
            survivalByStage.append(
                FunnelStep(
                    id: def.id,
                    label: def.label,
                    reached: reached,
                    rate: Double(reached) / Double(n)
                )
            )
        }

        return PlayerAggregate(
            player: player.rawValue,
            trials: logs.count,
            clearRate: Double(clears) / Double(n),
            lateCollapseRate: Double(late) / Double(n),
            smellRates: smellRates,
            exploitRates: exploitRates,
            stats: stats,
            finalFightWinRate: finalists.isEmpty ? 0 : Double(finalWins) / Double(finalists.count),
            finalFightAttempts: finalists.count,
            survivalByFights: survivalByFights,
            survivalByStage: survivalByStage
        )
    }

    private static func reachedNode(_ log: RunLog, id: String) -> Bool {
        log.fights.contains { $0.nodeID == id }
            || log.mapPicks.contains { $0.chosenID == id }
    }

    static func report(
        byPlayer: [MarbleVoyageCampaignSim.PlayerType: [RunLog]],
        baseSeed: UInt64,
        mapMode: String
    ) -> ProtocolReport {
        let players = MarbleVoyageCampaignSim.PlayerType.allCases.compactMap { type -> PlayerAggregate? in
            guard let logs = byPlayer[type], !logs.isEmpty else { return nil }
            return aggregate(player: type, logs: logs)
        }
        var notes: [String] = []
        if let pegs = players.first(where: { $0.player == "hitPegs" }),
           (pegs.exploitRates[MarbleVoyageFunSmell.noHealClearExploit.rawValue] ?? 0) > 0.4 {
            notes.append("Hit-pegs no-heal clears are common — economy may be too soft.")
        }
        if let meta = players.first(where: { $0.player == "metaAware" }),
           let bored = players.first(where: { $0.player == "uninterested" }),
           meta.clearRate + 0.08 < bored.clearRate {
            notes.append("Meta-aware clears lag uninterested — heal/Temper protocol may be mis-tuned.")
        }
        if let pegs = players.first(where: { $0.player == "hitPegs" }),
           let bored = players.first(where: { $0.player == "uninterested" }),
           pegs.clearRate < bored.clearRate + 0.15 {
            notes.append("Hit-pegs barely beats uninterested — aim/peg skill ladder is flat.")
        }
        if players.contains(where: { ($0.smellRates[MarbleVoyageFunSmell.lateCollapse.rawValue] ?? 0) > 0.25 }) {
            notes.append("Late-collapse smell elevated — summit after long climb feels punishing.")
        }
        if players.contains(where: { ($0.smellRates[MarbleVoyageFunSmell.longHangFewPegs.rawValue] ?? 0) > 0.3 }) {
            notes.append("Long hang / few pegs is frequent — board density or stall rules need review.")
        }

        return ProtocolReport(
            schemaVersion: schemaVersion,
            generatedAtISO8601: ISO8601DateFormatter().string(from: Date()),
            trialsPerPlayer: byPlayer.values.map(\.count).max() ?? 0,
            baseSeed: baseSeed,
            mapMode: mapMode,
            players: players,
            crossPlayerNotes: notes
        )
    }

    /// Write aggregate report under `docs/minigames/evidence/` when the repo is findable.
    @discardableResult
    static func writeEvidence(
        _ report: ProtocolReport,
        filename: String = "player_protocol_summary.json",
        fileHint: StaticString = #filePath
    ) throws -> URL {
        let dir = try evidenceDirectory(fileHint: fileHint)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = dir.appendingPathComponent(filename)
        let data = try JSONEncoder.pretty.encode(report)
        try data.write(to: url, options: .atomic)
        return url
    }

    static func evidenceDirectory(fileHint: StaticString = #filePath) throws -> URL {
        var url = URL(fileURLWithPath: String(describing: fileHint))
        for _ in 0..<12 {
            let candidate = url.appendingPathComponent(MarbleVoyageEvidence.relativeDirectory)
            if FileManager.default.fileExists(atPath: candidate.path)
                || FileManager.default.fileExists(atPath: url.appendingPathComponent(".git").path) {
                let dir = url.appendingPathComponent(MarbleVoyageEvidence.relativeDirectory)
                return dir
            }
            url.deleteLastPathComponent()
        }
        throw NSError(
            domain: "MarbleVoyagePlayTelemetry",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Could not locate \(MarbleVoyageEvidence.relativeDirectory)"]
        )
    }

    // MARK: - Helpers

    private static func meanFight(_ log: RunLog, _ f: (FightSample) -> Double) -> Double {
        guard !log.fights.isEmpty else { return 0 }
        return log.fights.map(f).reduce(0, +) / Double(log.fights.count)
    }

    private static func percentile(_ sorted: [Double]) -> StatMean {
        guard !sorted.isEmpty else {
            return StatMean(mean: 0, p10: 0, p50: 0, p90: 0, n: 0)
        }
        func at(_ p: Double) -> Double {
            let idx = Int((p * Double(sorted.count - 1)).rounded())
            return sorted[max(0, min(sorted.count - 1, idx))]
        }
        let mean = sorted.reduce(0, +) / Double(sorted.count)
        return StatMean(mean: mean, p10: at(0.10), p50: at(0.50), p90: at(0.90), n: sorted.count)
    }
}

private extension JSONEncoder {
    static var pretty: JSONEncoder {
        let e = JSONEncoder()
        e.outputFormatting = [.prettyPrinted, .sortedKeys]
        return e
    }
}
