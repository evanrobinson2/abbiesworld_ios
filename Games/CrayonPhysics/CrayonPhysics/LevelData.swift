import Foundation
import CoreGraphics

struct SourceVector: Codable {
    var x: Double
    var y: Double
}

struct SourceBody: Codable {
    let id: Int
    let shape: Int
    let isStatic: Bool
    let sprite: String?
    let special: String
    let position: SourceVector
    let radius: SourceVector
    let velocity: SourceVector
    let force: SourceVector
    let rotation: Double
    let angularVelocity: Double
    let torque: Double
    let friction: Double
    let mass: Double
}

struct SourceJoint: Codable {
    let body1: Int
    let body2: Int
    let anchor1: SourceVector
    let anchor2: SourceVector
    let relaxation: Double
    let accumulatedImpulse: SourceVector
}

struct SourceStar: Codable {
    let position: SourceVector
    let radius: Double
    let sprite: String?
}

struct SourceLevel: Codable, Identifiable {
    let id: String
    let background: String
    let gravity: SourceVector
    let iterations: Int
    let bodies: [SourceBody]
    let joints: [SourceJoint]
    let stars: [SourceStar]
    var isEnding: Bool { id == "the_end" }
}

struct SpriteRect: Codable { let x, y, w, h: Double }
struct SpriteFrame: Codable { let rect: SpriteRect; let duration: Double }
struct SourceSprite: Codable { let image: String; let rect: SpriteRect?; let frames: [SpriteFrame] }
struct LevelCatalog: Codable {
    let levels: [SourceLevel]
    let sprites: [String: SourceSprite]

    static func load(bundle: Bundle = GameResources.bundle) throws -> LevelCatalog {
        guard let url = bundle.url(forResource: "levels", withExtension: "json") else {
            throw CatalogError.missing
        }
        let catalog = try JSONDecoder().decode(Self.self, from: Data(contentsOf: url))
        guard catalog.levels.map(\.id) == ["level_01", "level_02", "level_07", "level_05", "level_06", "level_04", "level_03", "the_end"] else {
            throw CatalogError.invalidOrder
        }
        for level in catalog.levels {
            let ids = Set(level.bodies.map(\.id))
            guard ids.count == level.bodies.count,
                  level.bodies.allSatisfy({ [0, 1].contains($0.shape) && $0.radius.x > 0 && $0.radius.y > 0 }),
                  level.joints.allSatisfy({ ids.contains($0.body1) && ids.contains($0.body2) }),
                  level.isEnding || level.bodies.filter({ $0.special == "da_ball" }).count == 1 else {
                throw CatalogError.invalidGeometry(level.id)
            }
        }
        return catalog
    }

    enum CatalogError: LocalizedError {
        case missing, invalidOrder, invalidGeometry(String)
        var errorDescription: String? {
            switch self {
            case .missing: return "The level resources are missing from this build."
            case .invalidOrder: return "The original puzzle sequence could not be loaded."
            case .invalidGeometry(let id): return "The geometry for \(id) is invalid."
            }
        }
    }
}

/// Source world has downward-positive Y. Presentation keeps an 800×600 canvas.
/// FUN_004d6ec2 initializes scale (32,32), screen origin (400,500).
/// SpriteKit flips screen Y, so the origin is (400,100) here.
enum WorldCoordinates {
    static let scale: CGFloat = 32
    static func point(_ value: SourceVector) -> CGPoint {
        CGPoint(x: 400 + CGFloat(value.x) * scale, y: 100 - CGFloat(value.y) * scale)
    }
    static func vector(_ value: SourceVector) -> CGVector {
        CGVector(dx: CGFloat(value.x) * scale, dy: -CGFloat(value.y) * scale)
    }
}
