//
//  World2InventoryBadgeModels.swift
//  abbies.world.ios
//
//  Little ribbons on inventory items. A badge answers "why is this one
//  special?" at a glance, which matters most right after a reward lands: the
//  new thing needs to be findable in a drawer full of furniture.
//
//  Pure Foundation on purpose. The tint is a token rather than a SwiftUI Color
//  so the model stays testable.
//

import Foundation

enum World2BadgeTint: String, Codable, Sendable {
    case gold
    case pink
    case teal
    case indigo
    case rainbow
}

enum World2InventoryBadge: String, Codable, CaseIterable, Sendable, Comparable {
    /// Cleared the first time the player opens the drawer after the award.
    case new
    /// Earned by finishing a minigame rather than bought or granted.
    case questReward
    /// Only one will ever exist in this player's world.
    case oneOfAKind
    /// Came out of a generator the player drove themselves.
    case handmade
    /// Arrived with the treehouse.
    case starter
    /// Came from a story place, like the Three Bears' house.
    case storyTreasure

    var label: String {
        switch self {
        case .new: return "NEW!"
        case .questReward: return "EARNED"
        case .oneOfAKind: return "ONE OF A KIND"
        case .handmade: return "HANDMADE"
        case .starter: return "STARTER"
        case .storyTreasure: return "STORY TREASURE"
        }
    }

    var symbolName: String {
        switch self {
        case .new: return "sparkles"
        case .questReward: return "rosette"
        case .oneOfAKind: return "crown.fill"
        case .handmade: return "hand.raised.fill"
        case .starter: return "gift.fill"
        case .storyTreasure: return "book.closed.fill"
        }
    }

    var tint: World2BadgeTint {
        switch self {
        case .new: return .rainbow
        case .questReward: return .gold
        case .oneOfAKind: return .pink
        case .handmade: return .teal
        case .starter: return .indigo
        case .storyTreasure: return .gold
        }
    }

    /// Lower sorts first, so NEW! always reads before the quieter ribbons.
    var displayPriority: Int {
        switch self {
        case .new: return 0
        case .oneOfAKind: return 1
        case .storyTreasure: return 2
        case .questReward: return 3
        case .handmade: return 4
        case .starter: return 5
        }
    }

    static func < (lhs: World2InventoryBadge, rhs: World2InventoryBadge) -> Bool {
        lhs.displayPriority < rhs.displayPriority
    }

    /// Display order, de-duplicated. The drawer shows at most two ribbons so a
    /// card does not turn into a wall of text.
    static func forDisplay(
        _ badges: [World2InventoryBadge],
        limit: Int = 2
    ) -> [World2InventoryBadge] {
        var seen: Set<World2InventoryBadge> = []
        var unique: [World2InventoryBadge] = []
        for badge in badges.sorted() where seen.insert(badge).inserted {
            unique.append(badge)
        }
        return Array(unique.prefix(limit))
    }
}
