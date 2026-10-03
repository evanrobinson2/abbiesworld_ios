import Foundation

/// Kid-readable fight personality — rock–paper–scissors for marbles vs foes.
/// Brawl beats Swift · Swift beats Craft · Craft beats Brawl.
enum PlinkTemper: String, CaseIterable, Identifiable, Codable, Sendable {
    case brawl
    case swift
    case craft

    var id: String { rawValue }

    var title: String {
        switch self {
        case .brawl: return "Brawl"
        case .swift: return "Swift"
        case .craft: return "Craft"
        }
    }

    /// One-word kid gloss for HUD chips.
    var shortLabel: String { title }

    /// Temper this one is Strong against.
    var beats: PlinkTemper {
        switch self {
        case .brawl: return .swift
        case .swift: return .craft
        case .craft: return .brawl
        }
    }

    /// Temper this one is Soft against.
    var beatenBy: PlinkTemper {
        switch self {
        case .brawl: return .craft
        case .swift: return .brawl
        case .craft: return .swift
        }
    }

    enum Matchup: String, Sendable {
        case strong
        case normal
        case soft

        var kidLabel: String {
            switch self {
            case .strong: return "Strong"
            case .normal: return "Okay"
            case .soft: return "Soft"
            }
        }
    }

    func matchup(against defender: PlinkTemper) -> Matchup {
        if beats == defender { return .strong }
        if beatenBy == defender { return .soft }
        return .normal
    }

    /// Cage-damage factor for this marble Temper vs the foe’s Temper.
    func damageFactor(against defender: PlinkTemper) -> Double {
        switch matchup(against: defender) {
        case .strong: return 1.35
        case .normal: return 1.0
        case .soft: return 0.75
        }
    }

    /// Kid cast-card line: “Strong vs Swift · Soft vs Craft”.
    var matchupLine: String {
        "Strong vs \(beats.title) · Soft vs \(beatenBy.title)"
    }
}

enum PlinkTemperRules {
    /// Dominant Temper in a bag (ties → mixed / nil).
    static func bagStance(in collection: [MarbleVoyageOwnedMarble]) -> PlinkTemper? {
        var counts: [PlinkTemper: Int] = [:]
        for marble in collection {
            let t = marble.orb.temper
            counts[t, default: 0] += 1
        }
        let sorted = PlinkTemper.allCases.sorted { (counts[$0] ?? 0) > (counts[$1] ?? 0) }
        guard let top = sorted.first, (counts[top] ?? 0) > 0 else { return nil }
        let topCount = counts[top] ?? 0
        let second = sorted.dropFirst().first.flatMap { counts[$0] } ?? 0
        if topCount == second { return nil } // Mixed Bag
        return top
    }

    static func bagStanceTitle(in collection: [MarbleVoyageOwnedMarble]) -> String {
        switch bagStance(in: collection) {
        case .brawl: return "Heavy Hands"
        case .swift: return "Quick Feet"
        case .craft: return "Clever Bag"
        case nil: return "Mixed Bag"
        }
    }

    /// Kid tip when the bag faces this foe.
    static func bagTip(collection: [MarbleVoyageOwnedMarble], foe: PlinkTemper) -> String {
        let stance = bagStance(in: collection)
        guard let stance else {
            return "Mixed bag — any marble is fine. Upgrade or buy for a Strong edge!"
        }
        switch stance.matchup(against: foe) {
        case .strong:
            return "Your \(bagStanceTitle(in: collection)) is Strong here — keep firing!"
        case .soft:
            return "Your bag is Soft here — buy or upgrade a \(foe.beatenBy.title) marble."
        case .normal:
            return "Even match — upgrades still help every shot."
        }
    }
}
