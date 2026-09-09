//
//  DinoPicnicModels.swift
//  abbies.world.ios
//

import Foundation

enum DinoPicnicSnack: String, CaseIterable, Identifiable, Codable {
    case berry
    case sandwich
    case cookie

    var id: String { rawValue }

    var title: String {
        switch self {
        case .berry: return "Berry"
        case .sandwich: return "Sandwich"
        case .cookie: return "Cookie"
        }
    }

    var symbol: String {
        switch self {
        case .berry: return "🍓"
        case .sandwich: return "🥪"
        case .cookie: return "🍪"
        }
    }
}

enum DinoPicnicPersonality: String, CaseIterable, Codable {
    case breezy
    case giggly

    var title: String {
        switch self {
        case .breezy: return "Breezy"
        case .giggly: return "Giggly"
        }
    }
}

enum DinoPicnicPhase: Equatable {
    case ready
    case playing
    case celebrating
}

struct DinoPicnicRoundPlan {
    let seed: UInt64
    let personalities: [DinoPicnicPersonality]
    let requests: [DinoPicnicSnack]

    static func make(seed: UInt64, feedGoal: Int) -> DinoPicnicRoundPlan {
        var generator = SeededGenerator(seed: seed)
        let personalities = DinoPicnicPersonality.allCases.shuffled(using: &generator)
        var requests: [DinoPicnicSnack] = []

        while requests.count < feedGoal {
            requests.append(contentsOf: DinoPicnicSnack.allCases.shuffled(using: &generator))
        }

        return DinoPicnicRoundPlan(
            seed: seed,
            personalities: personalities,
            requests: Array(requests.prefix(feedGoal))
        )
    }
}

struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    init(seed: UInt64) {
        state = seed == 0 ? 0x9E3779B97F4A7C15 : seed
    }

    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var value = state
        value = (value ^ (value >> 30)) &* 0xBF58476D1CE4E5B9
        value = (value ^ (value >> 27)) &* 0x94D049BB133111EB
        return value ^ (value >> 31)
    }
}
