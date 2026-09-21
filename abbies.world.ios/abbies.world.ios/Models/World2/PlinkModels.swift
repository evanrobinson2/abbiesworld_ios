import Foundation

struct PlinkCampaign: Codable, Equatable, Sendable {
    let schemaVersion: Int
    let gameKey: String
    let kidName: String
    let land: Identity
    let poi: POI
    let physics: Physics
    let rules: Rules
    let bowls: [Bowl]
    let beds: [Bed]
    let music: [MusicTrack]

    struct MusicTrack: Codable, Equatable, Identifiable, Sendable {
        let id: String
        let title: String
        let sourceTitle: String?
        let catalogName: String
        let file: String?
        let role: String
        let durationSeconds: Int?
    }

    struct Identity: Codable, Equatable, Sendable {
        let id: String
        let name: String
        let summary: String
        let backgroundAsset: String?
    }

    struct POI: Codable, Equatable, Sendable {
        let id: String
        let name: String
        let summary: String
        let exteriorAsset: String?
        let interiorAsset: String?
        let callToAction: String
    }

    struct Physics: Codable, Equatable, Sendable {
        let ballRadius: Double
        let pegRadius: Double
        let gravity: Double
        let restitution: Double
        let airDrag: Double
        let maxSpeed: Double
        let launchSpeed: Double
        let fountain: Fountain
        let floorY: Double
    }

    struct Fountain: Codable, Equatable, Sendable {
        let x: Double
        let y: Double
    }

    struct Rules: Codable, Equatable, Sendable {
        let startingDrops: Int
        let gardenGiftDrop: Bool
        let gardenGlowHits: Int
        let alwaysFinishable: Bool
    }

    struct Bowl: Codable, Equatable, Identifiable, Sendable {
        let id: String
        let label: String
        let x: Double
        let width: Double
        let effect: String
    }

    struct Bed: Codable, Equatable, Identifiable, Sendable {
        let id: String
        let name: String
        let summary: String
        let unlockedByDefault: Bool
        let drops: Int
        let rewardGems: Int
        let awardsDecoration: String?
        let pegs: [Peg]
    }

    struct Peg: Codable, Equatable, Identifiable, Sendable {
        var id: String
        var x: Double
        var y: Double
        var kind: String
        var alive: Bool
        var hit: Bool

        init(id: String, x: Double, y: Double, kind: String, alive: Bool = true, hit: Bool = false) {
            self.id = id
            self.x = x
            self.y = y
            self.kind = kind
            self.alive = alive
            self.hit = hit
        }

        enum CodingKeys: String, CodingKey {
            case id, x, y, kind, alive, hit
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            x = try container.decode(Double.self, forKey: .x)
            y = try container.decode(Double.self, forKey: .y)
            kind = try container.decodeIfPresent(String.self, forKey: .kind) ?? "seed"
            alive = try container.decodeIfPresent(Bool.self, forKey: .alive) ?? true
            hit = try container.decodeIfPresent(Bool.self, forKey: .hit) ?? false
            id = try container.decodeIfPresent(String.self, forKey: .id) ?? "peg-\(x)-\(y)"
        }
    }
}

enum PlinkCampaignLoader {
    static func load(bundle: Bundle = .main) throws -> PlinkCampaign {
        let candidates = [
            bundle.url(forResource: "plink_campaign", withExtension: "json", subdirectory: "World2"),
            bundle.url(forResource: "plink_campaign", withExtension: "json"),
        ]
        guard let url = candidates.compactMap({ $0 }).first else {
            throw Error.missing
        }
        let campaign = try JSONDecoder().decode(PlinkCampaign.self, from: Data(contentsOf: url))
        guard campaign.gameKey == "peggle",
              campaign.schemaVersion == 1,
              !campaign.beds.isEmpty else {
            throw Error.invalid
        }
        return campaign
    }

    enum Error: LocalizedError {
        case missing
        case invalid

        var errorDescription: String? {
            switch self {
            case .missing: return "Missing bundled Plink campaign"
            case .invalid: return "Invalid Plink campaign"
            }
        }
    }
}

struct PlinkProgress: Equatable, Sendable {
    var unlockedBedIds: [String]
    var clearedBedIds: [String]
    var gems: Int
    var awardedDecoration: Bool

    static func fresh(from campaign: PlinkCampaign) -> PlinkProgress {
        PlinkProgress(
            unlockedBedIds: campaign.beds.filter(\.unlockedByDefault).map(\.id),
            clearedBedIds: [],
            gems: 0,
            awardedDecoration: false
        )
    }
}

enum PlinkPhase: Equatable, Sendable {
    case aim
    case falling
    case cleared
    case retry
}

struct PlinkRound {
    let campaign: PlinkCampaign
    let bed: PlinkCampaign.Bed
    var pegs: [PlinkCampaign.Peg]
    var dropsLeft: Int
    var giftUsed: Bool
    var gemsThisRound: Int
    var phase: PlinkPhase
    var status: String
    var progress: PlinkProgress

    var glowRemaining: Int {
        pegs.filter { $0.kind == "glow" && $0.alive }.count
    }

    static func start(campaign: PlinkCampaign, bed: PlinkCampaign.Bed, progress: PlinkProgress) -> PlinkRound {
        let pegs = bed.pegs.enumerated().map { index, peg in
            var copy = peg
            copy.id = peg.id.isEmpty ? "peg-\(index)" : peg.id
            copy.alive = true
            copy.hit = false
            return copy
        }
        return PlinkRound(
            campaign: campaign,
            bed: bed,
            pegs: pegs,
            dropsLeft: bed.drops,
            giftUsed: false,
            gemsThisRound: 0,
            phase: .aim,
            status: "Aim the dewdrop. Light \(pegs.filter { $0.kind == "glow" }.count) glow seeds.",
            progress: progress
        )
    }
}
