import Foundation

/// Battle power-ups earned at the Peg Monastery (and starting kit).
enum PlinkPowerUp: String, CaseIterable, Identifiable, Codable, Sendable {
    case split
    case fire
    case refresh

    var id: String { rawValue }

    var title: String {
        switch self {
        case .split: return "Split"
        case .fire: return "Fire"
        case .refresh: return "Refresh"
        }
    }

    var blurb: String {
        switch self {
        case .split: return "One ball becomes three in the air!"
        case .fire: return "Ball turns to fire and burns every peg it touches!"
        case .refresh: return "Make new pegs appear!"
        }
    }

    /// SF Symbol fallback only — prefer circular `chipAssetID` art.
    var systemImage: String {
        switch self {
        case .split: return "circle.grid.3x3.fill"
        case .fire: return "flame.fill"
        case .refresh: return "arrow.triangle.2.circlepath"
        }
    }

    /// Semantic Game Asset id — circular kid icons (`ui.plink.power.icon.*`).
    var chipAssetID: String {
        "ui.plink.power.icon.\(rawValue)"
    }

    /// Bundled catalog imageset for the circular icon.
    var catalogIconName: String {
        "world2_plink_power_icon_\(rawValue)"
    }

    static let maxOwned = 2
}

/// Durable counts per player — max 2 of each; new players start with 1 of each.
enum PlinkPowerUpStore {
    private static let prefix = "world2.plink.powerUps.v2."

    static func counts(for playerID: String?) -> [PlinkPowerUp: Int] {
        var out: [PlinkPowerUp: Int] = [:]
        let key = storageKey(playerID)
        if let data = UserDefaults.standard.data(forKey: key),
           let decoded = try? JSONDecoder().decode([String: Int].self, from: data) {
            for kind in PlinkPowerUp.allCases {
                out[kind] = min(PlinkPowerUp.maxOwned, max(0, decoded[kind.rawValue] ?? 0))
            }
            return out
        }
        // First open — seed one of each.
        let seeded = Dictionary(uniqueKeysWithValues: PlinkPowerUp.allCases.map { ($0, 1) })
        save(seeded, for: playerID)
        return seeded
    }

    static func count(_ kind: PlinkPowerUp, for playerID: String?) -> Int {
        counts(for: playerID)[kind] ?? 0
    }

    @discardableResult
    static func award(_ kind: PlinkPowerUp, for playerID: String?) -> Bool {
        var bag = counts(for: playerID)
        let current = bag[kind] ?? 0
        guard current < PlinkPowerUp.maxOwned else { return false }
        bag[kind] = current + 1
        save(bag, for: playerID)
        return true
    }

    @discardableResult
    static func spend(_ kind: PlinkPowerUp, for playerID: String?) -> Bool {
        var bag = counts(for: playerID)
        let current = bag[kind] ?? 0
        guard current > 0 else { return false }
        bag[kind] = current - 1
        save(bag, for: playerID)
        return true
    }

    /// Power-ups that still have room under the cap of 2.
    static func awardableKinds(for playerID: String?) -> [PlinkPowerUp] {
        PlinkPowerUp.allCases.filter { count($0, for: playerID) < PlinkPowerUp.maxOwned }
    }

    private static func save(_ bag: [PlinkPowerUp: Int], for playerID: String?) {
        let encoded = Dictionary(uniqueKeysWithValues: bag.map { ($0.key.rawValue, $0.value) })
        if let data = try? JSONEncoder().encode(encoded) {
            UserDefaults.standard.set(data, forKey: storageKey(playerID))
        }
    }

    private static func storageKey(_ playerID: String?) -> String {
        prefix + (playerID ?? "guest")
    }
}

/// Simple multiple-choice math prompts for the Peg Monastery.
struct PegMonasteryMathChallenge: Identifiable, Equatable {
    let id: String
    let left: Int
    let op: String
    let right: Int
    let choices: [Int]
    let answer: Int

    /// Spoken / accessibility form, e.g. "What is 3 plus 5?"
    var questionSpoken: String {
        let word: String
        switch op {
        case "+": word = "plus"
        case "−", "-": word = "minus"
        case "×", "x", "*": word = "times"
        default: word = op
        }
        return "What is \(left) \(word) \(right)?"
    }

    /// Compact equation, e.g. "3 + 5"
    var equation: String { "\(left) \(op) \(right)" }

    static func random() -> PegMonasteryMathChallenge {
        let bank: [PegMonasteryMathChallenge] = [
            PegMonasteryMathChallenge(id: "a", left: 3, op: "+", right: 5, choices: [6, 8, 9, 7], answer: 8),
            PegMonasteryMathChallenge(id: "b", left: 12, op: "−", right: 4, choices: [6, 8, 9, 10], answer: 8),
            PegMonasteryMathChallenge(id: "c", left: 6, op: "×", right: 2, choices: [10, 12, 14, 8], answer: 12),
            PegMonasteryMathChallenge(id: "d", left: 9, op: "+", right: 7, choices: [15, 16, 17, 14], answer: 16),
            PegMonasteryMathChallenge(id: "e", left: 20, op: "−", right: 8, choices: [10, 11, 12, 14], answer: 12),
            PegMonasteryMathChallenge(id: "f", left: 4, op: "×", right: 4, choices: [12, 14, 16, 18], answer: 16),
            PegMonasteryMathChallenge(id: "g", left: 15, op: "−", right: 6, choices: [7, 8, 9, 10], answer: 9),
            PegMonasteryMathChallenge(id: "h", left: 5, op: "+", right: 9, choices: [13, 14, 15, 12], answer: 14),
        ]
        return bank.randomElement() ?? bank[0]
    }
}
