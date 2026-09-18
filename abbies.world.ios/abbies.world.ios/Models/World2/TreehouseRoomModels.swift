//
//  TreehouseRoomModels.swift
//  abbies.world.ios
//
//  Abbie's treehouse expands into themed rooms. Exterior stays one POI;
//  interiors are plates she can switch between and decorate separately.
//

import Foundation

enum TreehouseRoomID: String, CaseIterable, Identifiable, Codable, Sendable {
    case cozyNook
    case rooftopLookout
    case fitnessCenter

    var id: String { rawValue }

    var title: String {
        switch self {
        case .cozyNook: return "Cozy Nook"
        case .rooftopLookout: return "Rooftop Lookout"
        case .fitnessCenter: return "Fitness Center"
        }
    }

    var blurb: String {
        switch self {
        case .cozyNook: return "Heart pillows and a pink rug"
        case .rooftopLookout: return "Blossoms over the mountains"
        case .fitnessCenter: return "Stars, mats, and rings"
        }
    }

    /// SF Symbol used as an iconographic room chip (no text needed for Abbie).
    var symbolName: String {
        switch self {
        case .cozyNook: return "heart.fill"
        case .rooftopLookout: return "leaf.fill"
        case .fitnessCenter: return "figure.run"
        }
    }

    var semanticInteriorAsset: String {
        switch self {
        case .cozyNook: return "poi.abbieTreehouse.interior.cozyNook"
        case .rooftopLookout: return "poi.abbieTreehouse.interior.rooftopLookout"
        case .fitnessCenter: return "poi.abbieTreehouse.interior.fitnessCenter"
        }
    }

    var catalogImageName: String {
        switch self {
        case .cozyNook: return "abbie_treehouse_room_cozy_nook"
        case .rooftopLookout: return "abbie_treehouse_room_rooftop_lookout"
        case .fitnessCenter: return "abbie_treehouse_room_fitness_center"
        }
    }

    static let `default`: TreehouseRoomID = .cozyNook

    /// Multi-room layout only ships for Abbie's treehouse POI.
    static func supportsRooms(poiId: String) -> Bool {
        poiId == "poi.abbieTreehouse"
    }
}

/// Kid-facing decorate tray filters — icons only in the UI.
enum DecorateFilterID: String, CaseIterable, Identifiable, Sendable {
    case all
    case mine
    case furniture
    case soft
    case glow
    case magic
    case nature

    var id: String { rawValue }

    var symbolName: String {
        switch self {
        case .all: return "square.grid.2x2.fill"
        case .mine: return "shippingbox.fill"
        case .furniture: return "sofa.fill"
        case .soft: return "cloud.fill"
        case .glow: return "lightbulb.fill"
        case .magic: return "sparkles"
        case .nature: return "leaf.fill"
        }
    }

    var accessibilityLabel: String {
        switch self {
        case .all: return "All decorations"
        case .mine: return "My drawer"
        case .furniture: return "Furniture"
        case .soft: return "Soft and cozy"
        case .glow: return "Glow and jewels"
        case .magic: return "Magic"
        case .nature: return "Nature"
        }
    }

    func matches(item: FurnitureItem) -> Bool {
        let category = item.category.lowercased()
        let tags = Set(item.tags.map { $0.lowercased() })
        switch self {
        case .all, .mine:
            return true
        case .furniture:
            return [
                "beds", "seats", "canopy seats", "shelves", "storage",
                "tables", "carts", "crafting"
            ].contains(category)
                || tags.contains("bed") || tags.contains("chair") || tags.contains("shelf")
        case .soft:
            return [
                "rugs", "hanging seats", "canopy seats", "seats"
            ].contains(category)
                || tags.contains("cushion") || tags.contains("rug") || tags.contains("pillow")
        case .glow:
            return category == "lights" || category == "hanging"
                || tags.contains("lamp") || tags.contains("lantern") || tags.contains("glow")
        case .magic:
            return category == "play stages" || tags.contains("magic") || tags.contains("sparkle")
                || tags.contains("enchant")
        case .nature:
            return category == "plants" || tags.contains("plant") || tags.contains("flower")
                || tags.contains("mushroom") || tags.contains("tree")
        }
    }
}
