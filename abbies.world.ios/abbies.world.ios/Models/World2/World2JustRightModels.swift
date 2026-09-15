//
//  World2JustRightModels.swift
//  abbies.world.ios
//
//  "Just Right" — the tasting game in the Three Bears' house.
//
//  Three bowls sit on the table. One is too much, one is too little, one is just
//  right, and the bowls are not labelled: the player judges by looking at the
//  steam, the size, or the honey. Getting it wrong costs nothing and says
//  something kind, because a six year old should never be able to lose this.
//  Finishing three rounds earns the Bowl of Perfect Porridge.
//
//  The whole game is a value type with no view or service dependencies, so every
//  rule below is unit tested.
//

import Foundation

/// What the player is judging this round.
enum World2JustRightAttribute: String, Codable, CaseIterable, Sendable {
    case temperature
    case size
    case sweetness

    var prompt: String {
        switch self {
        case .temperature: return "Which porridge is just right to eat?"
        case .size: return "Which bowl is just the right size?"
        case .sweetness: return "Which one has just enough honey?"
        }
    }

    var hint: String {
        switch self {
        case .temperature: return "Look at the steam."
        case .size: return "Look at the bowls."
        case .sweetness: return "Look at the honey drizzle."
        }
    }

    var symbolName: String {
        switch self {
        case .temperature: return "thermometer.medium"
        case .size: return "circle.grid.cross.fill"
        case .sweetness: return "drop.fill"
        }
    }
}

/// How much of the thing a bowl has. The renderer turns this into steam, bowl
/// width, or honey.
enum World2JustRightLevel: String, Codable, CaseIterable, Sendable {
    case tooLittle
    case justRight
    case tooMuch
}

/// Whose bowl it turned out to be, revealed only after a taste.
enum World2Bear: String, Codable, CaseIterable, Sendable {
    case papa
    case mama
    case baby

    var displayName: String {
        switch self {
        case .papa: return "Papa Bear"
        case .mama: return "Mama Bear"
        case .baby: return "Baby Bear"
        }
    }

    var symbolName: String {
        switch self {
        case .papa: return "pawprint.fill"
        case .mama: return "pawprint.fill"
        case .baby: return "pawprint"
        }
    }

    /// Papa always has too much and Mama too little, so the story stays the
    /// story. The player still has to look, because the bowls are unlabelled and
    /// shuffled.
    static func bear(for level: World2JustRightLevel) -> World2Bear {
        switch level {
        case .tooMuch: return .papa
        case .tooLittle: return .mama
        case .justRight: return .baby
        }
    }
}

struct World2JustRightBowl: Identifiable, Equatable, Sendable {
    let id: String
    let level: World2JustRightLevel

    var bear: World2Bear { World2Bear.bear(for: level) }
    var isJustRight: Bool { level == .justRight }
}

struct World2JustRightRound: Identifiable, Equatable, Sendable {
    let id: String
    let attribute: World2JustRightAttribute
    /// Left to right on the table, already shuffled.
    let bowls: [World2JustRightBowl]

    var justRightBowlID: String? {
        bowls.first { $0.isJustRight }?.id
    }

    func bowl(_ id: String) -> World2JustRightBowl? {
        bowls.first { $0.id == id }
    }
}

/// What tasting a bowl did.
enum World2JustRightOutcome: Equatable, Sendable {
    /// Wrong bowl. Friendly, and the round stays open.
    case tryAgain(bear: World2Bear, message: String)
    /// Right bowl, and there are more rounds to play.
    case correct(bear: World2Bear, message: String)
    /// Right bowl on the last round. The porridge is earned.
    case finished(bear: World2Bear, message: String, tastedPerfectly: Bool)
    /// The bowl id was not on this table, or the game is already over.
    case ignored

    var isProgress: Bool {
        switch self {
        case .correct, .finished: return true
        case .tryAgain, .ignored: return false
        }
    }
}

struct World2JustRightGame: Equatable, Sendable {
    static let roundCount = 3
    static let attributeOrder: [World2JustRightAttribute] = [
        .temperature,
        .size,
        .sweetness,
    ]

    let rounds: [World2JustRightRound]
    private(set) var roundIndex: Int
    /// Wrong tastes across the whole game. Never blocks progress; only decides
    /// whether the bears call it a perfect tasting.
    private(set) var wrongTastes: Int
    private(set) var isComplete: Bool
    /// The bowl most recently tasted, so the view can animate the right one.
    private(set) var lastTastedBowlID: String?

    var currentRound: World2JustRightRound? {
        guard !isComplete, rounds.indices.contains(roundIndex) else { return nil }
        return rounds[roundIndex]
    }

    var roundNumber: Int { min(roundIndex + 1, rounds.count) }

    var tastedPerfectly: Bool { wrongTastes == 0 }

    /// 0 through 1, for the spoon-shaped progress meter.
    var progress: Double {
        guard !rounds.isEmpty else { return 0 }
        return Double(isComplete ? rounds.count : roundIndex) / Double(rounds.count)
    }

    init(rounds: [World2JustRightRound]) {
        self.rounds = rounds
        roundIndex = 0
        wrongTastes = 0
        isComplete = rounds.isEmpty
        lastTastedBowlID = nil
    }

    /// Build a game. The seed shuffles bowl positions so repeat visits differ,
    /// while tests can pin it down.
    static func make(seed: UInt64 = UInt64.random(in: 0..<UInt64.max)) -> World2JustRightGame {
        var generator = World2SeededGenerator(seed: seed)
        var rounds: [World2JustRightRound] = []
        for attribute in attributeOrder {
            var bowls: [World2JustRightBowl] = World2JustRightLevel.allCases.map { level in
                World2JustRightBowl(
                    id: "bowl.\(attribute.rawValue).\(level.rawValue)",
                    level: level
                )
            }
            bowls.shuffle(using: &generator)
            rounds.append(
                World2JustRightRound(
                    id: "round.\(attribute.rawValue)",
                    attribute: attribute,
                    bowls: bowls
                )
            )
        }
        return World2JustRightGame(rounds: rounds)
    }

    @discardableResult
    mutating func taste(bowlID: String) -> World2JustRightOutcome {
        guard let round = currentRound, let bowl = round.bowl(bowlID) else {
            return .ignored
        }
        lastTastedBowlID = bowlID

        guard bowl.isJustRight else {
            wrongTastes += 1
            return .tryAgain(
                bear: bowl.bear,
                message: Self.tryAgainMessage(
                    attribute: round.attribute,
                    level: bowl.level,
                    bear: bowl.bear
                )
            )
        }

        let wasFinalRound = roundIndex >= rounds.count - 1
        if wasFinalRound {
            isComplete = true
            return .finished(
                bear: bowl.bear,
                message: tastedPerfectly
                    ? "Perfect tasting! The bears are amazed."
                    : "Just right! The bears say you can keep the magic bowl.",
                tastedPerfectly: tastedPerfectly
            )
        }

        roundIndex += 1
        return .correct(
            bear: bowl.bear,
            message: "Just right! That was \(bowl.bear.displayName)'s bowl."
        )
    }

    static func tryAgainMessage(
        attribute: World2JustRightAttribute,
        level: World2JustRightLevel,
        bear: World2Bear
    ) -> String {
        let complaint: String
        switch (attribute, level) {
        case (.temperature, .tooMuch): complaint = "Too hot!"
        case (.temperature, .tooLittle): complaint = "Too cold!"
        case (.size, .tooMuch): complaint = "Too big!"
        case (.size, .tooLittle): complaint = "Too small!"
        case (.sweetness, .tooMuch): complaint = "Too sweet!"
        case (.sweetness, .tooLittle): complaint = "Not sweet enough!"
        case (_, .justRight): complaint = "Just right!"
        }
        return "\(complaint) That one is \(bear.displayName)'s. Try another."
    }
}

/// A tiny deterministic generator so bowl shuffling can be pinned in tests.
/// SplitMix64: small, well distributed, and reproducible across platforms.
struct World2SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    init(seed: UInt64) {
        state = seed == 0 ? 0x9E3779B97F4A7C15 : seed
    }

    mutating func next() -> UInt64 {
        state = state &+ 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}
