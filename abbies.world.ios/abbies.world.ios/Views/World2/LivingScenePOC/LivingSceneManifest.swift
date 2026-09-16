//
//  LivingSceneManifest.swift
//  abbies.world.ios
//
//  Tiny JSON config for LivingScenePOC. Not a full authoring system.
//

import Foundation

struct LivingSceneManifest: Codable, Equatable, Sendable {
    struct Camera: Codable, Equatable, Sendable {
        var parallax: Double
        var zoom: Double
        var period: Double
        var nearParallaxScale: Double
        var farParallaxScale: Double
    }

    struct Effect: Codable, Equatable, Sendable {
        var mask: String?
        var effect: String
        var strength: Double?
        var speed: Double?
        var density: Double?
        var regions: [Region]?
    }

    struct Region: Codable, Equatable, Sendable {
        var x: Double
        var y: Double
        var radius: Double
    }

    struct Hardpoint: Codable, Equatable, Sendable, Identifiable {
        var id: String
        var x: Double
        var y: Double
        var radius: Double
    }

    var id: String
    var version: Int
    var scene: String
    var depth: String?
    var camera: Camera
    var effects: [Effect]
    var hardpoints: [Hardpoint]
}

enum LivingSceneBundle {
    static let resourceSubdirectory = "LivingScenePOC"

    static func url(named fileName: String) -> URL? {
        Bundle.main.url(
            forResource: fileName,
            withExtension: nil,
            subdirectory: resourceSubdirectory
        )
        ?? Bundle.main.url(
            forResource: (fileName as NSString).deletingPathExtension,
            withExtension: (fileName as NSString).pathExtension,
            subdirectory: resourceSubdirectory
        )
        ?? Bundle.main.url(
            forResource: (fileName as NSString).deletingPathExtension,
            withExtension: (fileName as NSString).pathExtension,
            subdirectory: "Resources/\(resourceSubdirectory)"
        )
    }

    static func loadManifest() throws -> LivingSceneManifest {
        guard let url = url(named: "scene.json") else {
            throw LivingSceneError.missingResource("scene.json")
        }
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode(LivingSceneManifest.self, from: data)
    }
}

enum LivingSceneError: Error, LocalizedError {
    case missingResource(String)

    var errorDescription: String? {
        switch self {
        case .missingResource(let name):
            return "LivingScenePOC missing resource: \(name)"
        }
    }
}
