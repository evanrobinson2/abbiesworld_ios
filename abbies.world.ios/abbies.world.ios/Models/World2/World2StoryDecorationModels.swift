//
//  World2StoryDecorationModels.swift
//  abbies.world.ios
//
//  Decorations that come from story places rather than from a generator or the
//  furniture catalog.
//
//  These are drawn in SwiftUI rather than loaded from the asset registry, so a
//  story reward always looks finished even before its art is generated. That
//  keeps a reward from ever landing in a child's drawer as a purple placeholder.
//

import Foundation

enum World2StoryPlacementLayer: String, Codable, Sendable {
    case floor
    case wall

    var homeLayer: HomeLayout.PlacedDecoration.PlacementLayer {
        switch self {
        case .floor: return .floor
        case .wall: return .wall
        }
    }
}

/// Which hand-drawn renderer the view layer should use for this decoration.
enum World2StoryArtStyle: String, Codable, Sendable {
    case perfectPorridge
}

struct World2StoryDecoration: Identifiable, Equatable, Sendable {
    let id: String
    let name: String
    let shortDescription: String
    let category: String
    let defaultScale: Double
    let placementLayer: World2StoryPlacementLayer
    let artStyle: World2StoryArtStyle
    let badges: [World2InventoryBadge]
    /// The registered archetype that hands this out. Keeps the reward traceable
    /// back to a contract.
    let awardedByArchetypeID: String

    static let perfectPorridge = World2StoryDecoration(
        id: "decoration.story.perfectPorridge",
        name: "Bowl of Perfect Porridge",
        shortDescription: "Never too hot, never too cold. Rainbow steam curls up from it all day and the sparkles never run out.",
        category: "Story Treasure",
        defaultScale: 0.58,
        placementLayer: .floor,
        artStyle: .perfectPorridge,
        badges: [.new, .oneOfAKind, .storyTreasure, .questReward],
        awardedByArchetypeID: "poi.threeBearsHouse"
    )

    static let all: [World2StoryDecoration] = [perfectPorridge]

    static func decoration(id: String) -> World2StoryDecoration? {
        all.first { $0.id == id }
    }

    static func isStoryDecoration(_ id: String) -> Bool {
        decoration(id: id) != nil
    }

    /// Badges minus the one-time NEW! ribbon, used once the player has seen it.
    var settledBadges: [World2InventoryBadge] {
        badges.filter { $0 != .new }
    }
}
