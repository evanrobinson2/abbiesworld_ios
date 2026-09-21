import Foundation

struct PegBattlePack: Codable, Equatable, Sendable {
    let id: String
    let kidName: String
    let title: String
    let poiId: String
    let landId: String
    let defaultLevel: String
}

struct PegBattleEnemy: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let name: String
    let maxHealth: Int
    let assets: [String: String]
    let hurtBelowRatio: Double
    let signatureBoardAction: BoardAction
    let attackPattern: [String]
    let moves: [String: Move]
    let victoryLine: String
    let defeatLine: String

    struct BoardAction: Codable, Equatable, Sendable {
        let id: String
        let name: String
        let pegCount: Int
        let when: String
    }

    struct Move: Codable, Equatable, Sendable {
        let id: String
        let name: String
        let damage: Int
        let telegraph: String
        let sequence: String
    }
}

struct PegBattleCard: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let name: String
    let shortName: String
    let glyph: String
    let asset: String
    let behavior: String
    let level: Int
    let summary: String
    let starPower: String
}

struct PegBattleBoard: Decodable, Equatable, Identifiable, Sendable {
    let id: String
    let name: String
    let pegs: [Peg]

    struct Peg: Decodable, Equatable, Identifiable, Sendable {
        var id: String
        var x: Double
        var y: Double
        var kind: String
        var charged: Bool = false
        var painted: Bool = false
        var muddy: Bool = false
        var hitThisShot: Bool = false
        var pendingCharge: Bool = false

        enum CodingKeys: String, CodingKey { case id, x, y, kind }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            x = try container.decode(Double.self, forKey: .x)
            y = try container.decode(Double.self, forKey: .y)
            kind = try container.decodeIfPresent(String.self, forKey: .kind) ?? "normal"
            id = try container.decodeIfPresent(String.self, forKey: .id) ?? "peg-\(x)-\(y)"
        }
    }
}

struct PegBattleLevel: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let name: String
    let enemy: String
    let board: String
    let deck: [String]
    let handSize: Int
    let playerHearts: Int
    let powerPerDamage: Int
    let arenaAsset: String
    let introLine: String
}

struct PegBattleCatalog: Equatable, Sendable {
    var pack: PegBattlePack
    var enemies: [PegBattleEnemy]
    var cards: [PegBattleCard]
    var boards: [PegBattleBoard]
    var levels: [PegBattleLevel]
}

enum PegBattleCatalogLoader {
    static func load(bundle: Bundle = .main) throws -> PegBattleCatalog {
        let roots = [
            "minigames/peg-battle",
            "World2/minigames/peg-battle",
            "peg-battle",
        ]
        func data(_ name: String) throws -> Data {
            for root in roots {
                if let url = bundle.url(forResource: name, withExtension: "json", subdirectory: root)
                    ?? bundle.url(forResource: name, withExtension: "json") {
                    return try Data(contentsOf: url)
                }
            }
            // Nested content files
            for root in roots {
                if let url = bundle.url(
                    forResource: name,
                    withExtension: "json",
                    subdirectory: "\(root)/content"
                ) {
                    return try Data(contentsOf: url)
                }
            }
            throw NSError(
                domain: "PegBattle",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Missing \(name).json in peg-battle pack"]
            )
        }
        let decoder = JSONDecoder()
        let pack = try decoder.decode(PegBattlePack.self, from: data("pack"))
        let enemies = try decoder.decode(Wrapper<PegBattleEnemy>.self, from: data("enemies")).enemies
        let cards = try decoder.decode(CardWrapper.self, from: data("cards")).cards
        let boards = try decoder.decode(BoardWrapper.self, from: data("boards")).boards
        let levels = try decoder.decode(LevelWrapper.self, from: data("levels")).levels
        return PegBattleCatalog(pack: pack, enemies: enemies, cards: cards, boards: boards, levels: levels)
    }

    private struct Wrapper<T: Codable>: Codable { let enemies: [T] }
    private struct CardWrapper: Codable { let cards: [PegBattleCard] }
    private struct BoardWrapper: Codable { let boards: [PegBattleBoard] }
    private struct LevelWrapper: Codable { let levels: [PegBattleLevel] }
}
