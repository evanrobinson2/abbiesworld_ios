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
    case worldTeleporter
    case propertyDeed
    case daddyCandy
    case daddyHug
    case foxTrophy
    case wreckPowerUp
}

/// What tapping Use does for a story item that is not only décor.
enum World2StoryInventoryAction: String, Codable, Sendable {
    case none
    case openWorldTeleporter
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
    /// back to a contract. Seeded system items use `system.seed`.
    let awardedByArchetypeID: String
    /// Inventory Use action. `.none` means place-only décor.
    let inventoryAction: World2StoryInventoryAction

    static let perfectPorridge = World2StoryDecoration(
        id: "decoration.story.perfectPorridge",
        name: "Bowl of Perfect Porridge",
        shortDescription: "Never too hot, never too cold. Rainbow steam curls up from it all day and the sparkles never run out.",
        category: "Story Treasure",
        defaultScale: 0.58,
        placementLayer: .floor,
        artStyle: .perfectPorridge,
        badges: [.new, .oneOfAKind, .storyTreasure, .questReward],
        awardedByArchetypeID: "poi.threeBearsHouse",
        inventoryAction: .none
    )

    /// Pocket portal. Opens a travel screen to every scene, including unconnected ones.
    static let worldTeleporter = World2StoryDecoration(
        id: "decoration.story.worldTeleporter",
        name: "World Teleporter",
        shortDescription: "A brass pocket portal. Use it to peek at every scene and travel there — even places with no path on the map.",
        category: "Travel Gear",
        defaultScale: 0.62,
        placementLayer: .floor,
        artStyle: .worldTeleporter,
        badges: [.new, .oneOfAKind, .starter],
        awardedByArchetypeID: "system.seed",
        inventoryAction: .openWorldTeleporter
    )

    /// Magical property deed from The Imagination Atelier after a scene cooks.
    static let propertyDeed = World2StoryDecoration(
        id: "decoration.story.propertyDeed",
        name: "Property Deed",
        shortDescription: "A sealed parchment claim to a freshly cooked land. Map lines shimmer under the wax seal.",
        category: "Story Treasure",
        defaultScale: 0.55,
        placementLayer: .floor,
        artStyle: .propertyDeed,
        badges: [.new, .oneOfAKind, .storyTreasure, .questReward],
        awardedByArchetypeID: "poi.sceneBuilder",
        inventoryAction: .none
    )

    /// Daddy's Citadel always-on gift — a piece of candy for the drawer.
    static let daddyCandy = World2StoryDecoration(
        id: "decoration.story.daddyCandy",
        name: "Daddy Candy",
        shortDescription: "A shiny wrapped candy from Daddy's Citadel. Sweet enough to keep forever.",
        category: "Daddy Gift",
        defaultScale: 0.48,
        placementLayer: .floor,
        artStyle: .daddyCandy,
        badges: [.new, .questReward],
        awardedByArchetypeID: "poi.evanHome",
        inventoryAction: .none
    )

    /// Daddy's Citadel always-on gift — a pocket hug.
    static let daddyHug = World2StoryDecoration(
        id: "decoration.story.daddyHug",
        name: "Pocket Hug",
        shortDescription: "A warm little hug you can carry in your inventory. It still feels like Daddy.",
        category: "Daddy Gift",
        defaultScale: 0.52,
        placementLayer: .floor,
        artStyle: .daddyHug,
        badges: [.new, .questReward],
        awardedByArchetypeID: "poi.evanHome",
        inventoryAction: .none
    )

    /// Fox Land clear — MVP Peglin trophy for the inventory drawer.
    static let foxTrophy = World2StoryDecoration(
        id: "decoration.story.foxTrophy",
        name: "Fox Trophy",
        shortDescription: "A shiny gold cup from beating the Fox Spirit. Keep it in your inventory forever.",
        category: "Story Treasure",
        defaultScale: 0.55,
        placementLayer: .floor,
        artStyle: .foxTrophy,
        badges: [.new, .oneOfAKind, .storyTreasure, .questReward],
        awardedByArchetypeID: PeglinEdition.foxGuardianID,
        inventoryAction: .none
    )

    /// Retired salvage power-up orb — kept only so old inventories still decode.
    static let wreckPowerUp = World2StoryDecoration(
        id: "decoration.story.wreckPowerUp",
        name: "Salvage Orb",
        shortDescription: "An old humming core from the wreck. No longer awarded — monastery blessings replaced it.",
        category: "Story Treasure",
        defaultScale: 0.52,
        placementLayer: .floor,
        artStyle: .wreckPowerUp,
        badges: [.oneOfAKind, .storyTreasure],
        awardedByArchetypeID: PeglinEdition.wreckPowerUpID,
        inventoryAction: .none
    )

    static let all: [World2StoryDecoration] = [
        perfectPorridge,
        worldTeleporter,
        propertyDeed,
        daddyCandy,
        daddyHug,
        foxTrophy,
        // wreckPowerUp intentionally omitted — not awarded; decode via decoration(id:)
    ]

    static func decoration(id: String) -> World2StoryDecoration? {
        if id == wreckPowerUp.id { return wreckPowerUp }
        return all.first { $0.id == id }
    }

    static func isStoryDecoration(_ id: String) -> Bool {
        decoration(id: id) != nil
    }

    var isUsableFromInventory: Bool {
        inventoryAction != .none
    }

    /// Badges minus the one-time NEW! ribbon, used once the player has seen it.
    var settledBadges: [World2InventoryBadge] {
        badges.filter { $0 != .new }
    }
}
