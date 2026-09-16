//
//  World2SceneBuilderModels.swift
//  abbies.world.ios
//
//  Ingredient vocabulary for The Imagination Atelier (Scene Builder).
//

import Foundation

enum World2SceneBuilderSlot: String, CaseIterable, Identifiable, Sendable {
    case place
    case theme
    case atmosphere
    case specialFeature
    case vibe
    case hardpoints

    var id: String { rawValue }

    var title: String {
        switch self {
        case .place: return "Place"
        case .theme: return "Theme"
        case .atmosphere: return "Atmosphere"
        case .specialFeature: return "Landmark"
        case .vibe: return "Vibe"
        case .hardpoints: return "Hardpoints"
        }
    }

    var promptHint: String {
        switch self {
        case .place: return "Where does it happen?"
        case .theme: return "What kind of magic?"
        case .atmosphere: return "Weather & time"
        case .specialFeature: return "One big wow"
        case .vibe: return "How should it feel?"
        case .hardpoints: return "How many pads?"
        }
    }

    var assetCatalogName: String {
        switch self {
        case .place: return "world2_scene_place_selector"
        case .theme: return "world2_scene_theme_selector"
        case .atmosphere: return "world2_scene_atmosphere_selector"
        case .specialFeature: return "world2_scene_special_feature_selector"
        case .vibe: return "world2_scene_vibe_selector"
        case .hardpoints: return "world2_hardpoint_selector"
        }
    }

    var options: [World2SceneBuilderOption] {
        switch self {
        case .place:
            return [
                .init(id: "meadow", label: "Meadow"),
                .init(id: "coast", label: "Coast"),
                .init(id: "forest", label: "Forest"),
                .init(id: "town", label: "Town square"),
            ]
        case .theme:
            return [
                .init(id: "fairy", label: "Fairy"),
                .init(id: "pirate", label: "Pirate"),
                .init(id: "spooky", label: "Spooky"),
                .init(id: "festive", label: "Festive"),
            ]
        case .atmosphere:
            return [
                .init(id: "sunny", label: "Sunny day"),
                .init(id: "dusk", label: "Golden dusk"),
                .init(id: "rain", label: "Soft rain"),
                .init(id: "snow", label: "First snow"),
            ]
        case .specialFeature:
            return [
                .init(id: "tower", label: "Tall tower"),
                .init(id: "bridge", label: "River bridge"),
                .init(id: "portal", label: "Glow portal"),
                .init(id: "tree", label: "Giant tree"),
            ]
        case .vibe:
            return [
                .init(id: "cozy", label: "Cozy"),
                .init(id: "adventure", label: "Adventurous"),
                .init(id: "mystery", label: "Mysterious"),
                .init(id: "silly", label: "Silly"),
            ]
        case .hardpoints:
            return (0...5).map {
                .init(id: "hp_\($0)", label: $0 == 0 ? "No pads" : "\($0) pad\($0 == 1 ? "" : "s")")
            }
        }
    }
}

struct World2SceneBuilderOption: Identifiable, Equatable, Hashable, Sendable {
    let id: String
    let label: String
}

struct World2SceneBuilderRecipe: Equatable, Sendable {
    var placeID: String?
    var themeID: String?
    var atmosphereID: String?
    var specialFeatureID: String?
    var vibeID: String?
    var hardpointCount: Int = 2

    var isComplete: Bool {
        placeID != nil
            && themeID != nil
            && atmosphereID != nil
            && specialFeatureID != nil
            && vibeID != nil
    }

    var summaryLine: String {
        let parts = [
            label(for: .place, id: placeID),
            label(for: .theme, id: themeID),
            label(for: .atmosphere, id: atmosphereID),
            label(for: .specialFeature, id: specialFeatureID),
            label(for: .vibe, id: vibeID),
            "\(hardpointCount) pads",
        ].compactMap { $0 }
        return parts.joined(separator: " · ")
    }

    private func label(for slot: World2SceneBuilderSlot, id: String?) -> String? {
        guard let id else { return nil }
        return slot.options.first(where: { $0.id == id })?.label
    }
}

enum World2SceneCookPhase: String, Equatable, Sendable {
    case idle
    case cooking
    case ready
    case failed
}

struct World2SceneCookJob: Identifiable, Equatable, Sendable {
    let id: String
    let recipe: World2SceneBuilderRecipe
    var phase: World2SceneCookPhase
    /// Catalog name of the finished landscape (bundled sample for now).
    var previewCatalogName: String?
    var startedAt: Date
    var finishedAt: Date?
}
