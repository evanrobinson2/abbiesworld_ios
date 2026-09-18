//
//  World2PlaceEmbellishmentModels.swift
//  abbies.world.ios
//
//  Non-gameplay visual extras on a placed place — beams, auras, particles.
//  Embellishments never change contracts or inventory; they only dress the map.
//

import Foundation

/// A decorative effect that can ride on a place template or a single instance.
enum World2PlaceEmbellishment: String, Codable, CaseIterable, Identifiable, Sendable {
    /// Soft cone of light from the crown of the place up to the top of the screen.
    case skySpotlight

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .skySpotlight: return "Sky Spotlight"
        }
    }
}

extension World2PlaceTemplate {
    /// Default embellishments for every placement of this template.
    var embellishments: [World2PlaceEmbellishment] {
        switch id {
        case .worldSeed:
            return [.skySpotlight]
        case .selfReplicatingFactory, .sceneCreator, .sceneKit, .beacon:
            return []
        }
    }
}

extension World2PlacedPlaceInstance {
    /// Effective embellishments: instance override if set, otherwise the template defaults.
    var resolvedEmbellishments: [World2PlaceEmbellishment] {
        if let embellishments {
            return embellishments
        }
        return World2PlaceTemplate.template(for: templateID).embellishments
    }

    var hasSkySpotlight: Bool {
        // World Seeds only beam once they mature into a portal.
        if templateID == .worldSeed {
            return seedGrowth == .portal
                && resolvedEmbellishments.contains(.skySpotlight)
        }
        return resolvedEmbellishments.contains(.skySpotlight)
    }
}
