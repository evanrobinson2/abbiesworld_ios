//
//  World2POIPresentation.swift
//  abbies.world.ios
//
//  Sandbox visual knobs on a POI instance: glow, sway, tint, optional reskin.
//

import Foundation

struct World2POIPresentation: Codable, Equatable, Sendable {
    var glowEnabled: Bool
    var swayEnabled: Bool
    /// 0...1 hue shift; nil keeps archetype default glow color.
    var tintHue: Double?
    /// Optional semantic asset override for exterior art.
    var skinAssetOverride: String?

    static let `default` = World2POIPresentation(
        glowEnabled: true,
        swayEnabled: true,
        tintHue: nil,
        skinAssetOverride: nil
    )

    func clamped() -> World2POIPresentation {
        World2POIPresentation(
            glowEnabled: glowEnabled,
            swayEnabled: swayEnabled,
            tintHue: tintHue.map { min(max($0, 0), 1) },
            skinAssetOverride: skinAssetOverride
        )
    }
}

enum World2POISkinPreset: String, CaseIterable, Identifiable, Sendable {
    case `default`
    case candy
    case crystal
    case woodland
    case neon

    var id: String { rawValue }

    var title: String {
        switch self {
        case .default: return "Default"
        case .candy: return "Candy"
        case .crystal: return "Crystal"
        case .woodland: return "Woodland"
        case .neon: return "Neon"
        }
    }

    /// Soft hue wash when the preset can't swap a real asset.
    var tintHue: Double? {
        switch self {
        case .default: return nil
        case .candy: return 0.92
        case .crystal: return 0.55
        case .woodland: return 0.28
        case .neon: return 0.78
        }
    }
}
