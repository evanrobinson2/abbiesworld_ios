import Foundation

// MARK: - Complete run documentation (live + sims)
//
// Every voyage — player or headless — should be reconstructible from a
// `MarbleVoyageRunRecord`. Sims write the same schema under
// `docs/minigames/evidence/` so balance claims cite gameplay evidence.

/// One reconstructible voyage (campaign land line, endless streak, or Monte Carlo trial).
struct MarbleVoyageRunRecord: Equatable, Codable, Sendable {
    var schemaVersion: Int
    var kind: Kind
    var seed: UInt64
    var startedAtISO8601: String
    var finishedAtISO8601: String?
    var mode: MarbleVoyageMode
    var economy: MarbleVoyageEconomyTuning
    var gang: GangSnapshot?
    var coins: Int
    var playerHP: Int
    var playerMaxHP: Int
    var ballLevel: Int
    /// Charm id → stack count (permanent for the run).
    var charmStacks: [String: Int]
    var path: [PathStep]
    var fights: [FightRecord]
    var shops: [ShopRecord]
    var events: [EventRecord]
    var outcome: Outcome?
    var notes: String

    enum Kind: String, Codable, Sendable {
        case live
        case simulation
    }

    enum Outcome: String, Codable, Sendable {
        case ongoing
        case victory
        case defeat
        case abandoned
    }

    struct GangSnapshot: Equatable, Codable, Sendable {
        var bigBoss: String
        var miniBossOrder: [String]
    }

    struct PathStep: Equatable, Codable, Sendable {
        var from: String
        var to: String
        var title: String
        var kind: String
    }

    struct FightRecord: Equatable, Codable, Sendable {
        var nodeID: String
        var title: String
        var role: String
        var waveAttacker: String?
        var foes: [String]
        var won: Bool
        var rounds: Int
        var damageDealt: Int
        var damageTaken: Int
        var hpBefore: Int
        var hpAfter: Int
        var goldEarned: Int
        var goldPegHits: Int
        var pegsLit: Int
        var boardPegs: Int
        var fightSeed: UInt64
    }

    struct ShopRecord: Equatable, Codable, Sendable {
        var afterNodeID: String
        var walletBefore: Int
        var walletAfter: Int
        var hpBefore: Int
        var hpAfter: Int
        var charmOffers: [String]
        var purchases: [Purchase]
        struct Purchase: Equatable, Codable, Sendable {
            var sku: String
            var pricePaid: Int
            var detail: String
        }
    }

    struct EventRecord: Equatable, Codable, Sendable {
        var nodeID: String
        var kind: String
        var message: String
        var hpDelta: Int
        var coinDelta: Int
    }

    static let currentSchemaVersion = 1

    static func fresh(
        kind: Kind,
        seed: UInt64,
        mode: MarbleVoyageMode,
        economy: MarbleVoyageEconomyTuning = .recommended,
        playerMaxHP: Int = MarbleVoyageRun.defaultMaxHP,
        gang: MarbleVoyageGangRun? = nil,
        notes: String = ""
    ) -> MarbleVoyageRunRecord {
        let iso = ISO8601DateFormatter().string(from: Date())
        let gangSnap: GangSnapshot? = gang.map {
            GangSnapshot(
                bigBoss: $0.bigBoss.rawValue,
                miniBossOrder: $0.miniBossOrder.map(\.rawValue)
            )
        }
        return MarbleVoyageRunRecord(
            schemaVersion: currentSchemaVersion,
            kind: kind,
            seed: seed,
            startedAtISO8601: iso,
            finishedAtISO8601: nil,
            mode: mode,
            economy: economy,
            gang: gangSnap,
            coins: 0,
            playerHP: playerMaxHP,
            playerMaxHP: playerMaxHP,
            ballLevel: 1,
            charmStacks: [:],
            path: [],
            fights: [],
            shops: [],
            events: [],
            outcome: .ongoing,
            notes: notes
        )
    }

    var bloomStacks: Int { charmStacks[MarbleVoyageCharm.bloom.rawValue] ?? 0 }
    var moonGleamStacks: Int { charmStacks[MarbleVoyageCharm.moonGleam.rawValue] ?? 0 }
    var softPurrStacks: Int { charmStacks[MarbleVoyageCharm.softPurr.rawValue] ?? 0 }
    var lullabyStacks: Int { charmStacks[MarbleVoyageCharm.lullaby.rawValue] ?? 0 }
    var sockSnatchStacks: Int { charmStacks[MarbleVoyageCharm.sockSnatch.rawValue] ?? 0 }
    var prismStacks: Int { charmStacks[MarbleVoyageCharm.prismBurst.rawValue] ?? 0 }
    var cycleStacks: Int { charmStacks[MarbleVoyageCharm.cycle.rawValue] ?? 0 }
    var hoverStacks: Int { charmStacks[MarbleVoyageCharm.hover.rawValue] ?? 0 }

    mutating func addCharmStack(_ charm: MarbleVoyageCharm, count: Int = 1) {
        let key = charm.rawValue
        charmStacks[key] = (charmStacks[key] ?? 0) + count
    }

    func jsonData(pretty: Bool = true) throws -> Data {
        let enc = JSONEncoder()
        if pretty {
            enc.outputFormatting = [.prettyPrinted, .sortedKeys]
        }
        enc.dateEncodingStrategy = .iso8601
        return try enc.encode(self)
    }

    static func load(from data: Data) throws -> MarbleVoyageRunRecord {
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        return try dec.decode(MarbleVoyageRunRecord.self, from: data)
    }
}

/// Append-only evidence store for sims + optional live export.
enum MarbleVoyageEvidence {
    /// Repo-relative evidence root (also used by `scripts/plink_gold_economy_sim.py`).
    static let relativeDirectory = "docs/minigames/evidence"

    static func write(_ record: MarbleVoyageRunRecord, to directory: URL, fileName: String) throws -> URL {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent(fileName)
        try record.jsonData().write(to: url, options: .atomic)
        return url
    }
}
