//
//  World2PlaceholderPack.swift
//  abbies.world.ios
//
//  Bundled stand-in plates. Shown immediately, then replaced when /api/create
//  and carving finish. Picks are in Resources/Placeholders/world2-placeholder-catalog.json.
//

import UIKit

enum World2PlaceholderKind: String, CaseIterable, Sendable {
    case decoration
    case scene
    case poi

    /// Style that reads correctly for this kind. The pack still ships every style.
    var preferredStyle: World2PlaceholderStyle {
        switch self {
        case .decoration: return .storybook
        case .scene: return .watercolor
        case .poi: return .clay
        }
    }
}

enum World2PlaceholderStyle: String, CaseIterable, Sendable {
    case storybook
    case watercolor
    case clay
    case crayon
    case papercut
    case pixel
}

enum World2PlaceholderPack {
    static func image(
        for kind: World2PlaceholderKind,
        style: World2PlaceholderStyle? = nil
    ) -> UIImage? {
        let name = "\(kind.rawValue)_\((style ?? kind.preferredStyle).rawValue)"
        let subdirectories = [
            "Resources/Placeholders",
            "Placeholders",
            nil as String?,
        ]
        for subdirectory in subdirectories {
            let url = Bundle.main.url(
                forResource: name,
                withExtension: "png",
                subdirectory: subdirectory
            )
            if let url, let image = UIImage(contentsOfFile: url.path) {
                return image
            }
        }
        return nil
    }

    static func pngData(
        for kind: World2PlaceholderKind,
        style: World2PlaceholderStyle? = nil
    ) -> Data? {
        image(for: kind, style: style)?.pngData()
    }
}
