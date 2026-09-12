//
//  DecorationModels.swift
//  abbies.world.ios
//
//  Data models for home decoration in Abbie's World 2.
//

import Foundation

enum DecorationType: String, Codable, CaseIterable {
    case furniture
    case poster
    case plant
    case trophy
    case toy
    case lamp
    case magical
    case seasonal
    case jukebox
    
    var displayName: String {
        switch self {
        case .furniture: return "Furniture"
        case .poster: return "Poster"
        case .plant: return "Plant"
        case .trophy: return "Trophy"
        case .toy: return "Toy"
        case .lamp: return "Lamp"
        case .magical: return "Magical"
        case .seasonal: return "Seasonal"
        case .jukebox: return "Jukebox"
        }
    }
    
    var iconName: String {
        switch self {
        case .furniture: return "chair.fill"
        case .poster: return "photo.fill"
        case .plant: return "leaf.fill"
        case .trophy: return "trophy.fill"
        case .toy: return "teddybear.fill"
        case .lamp: return "lamp.desk.fill"
        case .magical: return "sparkles"
        case .seasonal: return "gift.fill"
        case .jukebox: return "music.note.house.fill"
        }
    }
}

struct Decoration: Codable, Identifiable {
    let id: String
    let name: String
    let type: DecorationType
    let assetId: String
    let description: String?
    let isInteractive: Bool
    let interactionType: InteractionType?
    let dimensions: Dimensions
    let anchorPoint: AnchorPoint
    let rarity: CardRarity
    let source: String?
    
    struct Dimensions: Codable {
        let width: Double
        let height: Double
    }
    
    struct AnchorPoint: Codable {
        let x: Double
        let y: Double
    }
    
    enum InteractionType: String, Codable {
        case tap
        case drag
        case hold
        case jukebox
    }
}

struct DecorationInstance: Codable, Identifiable {
    let id: String
    let decorationId: String
    var x: Double
    var y: Double
    var scale: Double
    var rotation: Double
    var zIndex: Int
    var state: DecorationState?
    let acquiredAt: Date
    
    struct DecorationState: Codable {
        var isActive: Bool
        var customData: [String: String]?
    }
    
    init(id: String? = nil, decorationId: String, x: Double, y: Double, scale: Double = 1.0, rotation: Double = 0, zIndex: Int = 0, state: DecorationState? = nil) {
        self.id = id ?? UUID().uuidString
        self.decorationId = decorationId
        self.x = x
        self.y = y
        self.scale = scale
        self.rotation = rotation
        self.zIndex = zIndex
        self.state = state
        self.acquiredAt = Date()
    }
    
    static func starterJukebox(for playerId: PlayerId) -> DecorationInstance {
        DecorationInstance(
            id: "jukebox_\(playerId.rawValue)",
            decorationId: "decoration.jukebox.starter",
            x: 0.8,
            y: 0.7,
            scale: 1.0,
            rotation: 0,
            zIndex: 10,
            state: DecorationState(isActive: true, customData: ["currentTrack": "music.home.light"])
        )
    }
}

struct HomeLayout: Codable {
    let playerId: String
    let poiId: String
    var placedDecorations: [PlacedDecoration]
    var floorBounds: LayoutBounds
    var wallBounds: LayoutBounds
    
    struct PlacedDecoration: Codable, Identifiable {
        let id: String
        let decorationInstanceId: String
        var position: Position
        var layer: PlacementLayer
        
        struct Position: Codable {
            var x: Double
            var y: Double
        }
        
        enum PlacementLayer: String, Codable {
            case floor
            case wall
            case foreground
        }
    }
    
    struct LayoutBounds: Codable {
        let minX: Double
        let maxX: Double
        let minY: Double
        let maxY: Double
    }
    
    static func `default`(for playerId: PlayerId) -> HomeLayout {
        HomeLayout(
            playerId: playerId.rawValue,
            poiId: playerId.homePoiId,
            placedDecorations: [
                PlacedDecoration(
                    id: "placed_jukebox_\(playerId.rawValue)",
                    decorationInstanceId: "jukebox_\(playerId.rawValue)",
                    position: PlacedDecoration.Position(x: 0.8, y: 0.7),
                    layer: .floor
                )
            ],
            floorBounds: LayoutBounds(minX: 0.1, maxX: 0.9, minY: 0.5, maxY: 0.9),
            wallBounds: LayoutBounds(minX: 0.1, maxX: 0.9, minY: 0.1, maxY: 0.5)
        )
    }
}
