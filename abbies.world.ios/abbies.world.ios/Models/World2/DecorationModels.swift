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
    /// Horizontal shear (affine `c`). 0 = upright. Clamped in the decorator.
    var skewX: Double
    /// Vertical shear (affine `b`). 0 = upright.
    var skewY: Double
    var zIndex: Int
    var state: DecorationState?
    /// Ribbons shown on this item's card in the drawer. Optional so saves
    /// written before badges existed still decode.
    var badges: [World2InventoryBadge]?
    let acquiredAt: Date

    /// Finger-friendly shear limits for decorate handles.
    static let skewRange: ClosedRange<Double> = -0.72...0.72

    struct DecorationState: Codable {
        var isActive: Bool
        var customData: [String: String]?
    }

    enum CodingKeys: String, CodingKey {
        case id, decorationId, x, y, scale, rotation, skewX, skewY, zIndex, state, badges, acquiredAt
    }

    init(
        id: String? = nil,
        decorationId: String,
        x: Double,
        y: Double,
        scale: Double = 1.0,
        rotation: Double = 0,
        skewX: Double = 0,
        skewY: Double = 0,
        zIndex: Int = 0,
        state: DecorationState? = nil,
        badges: [World2InventoryBadge]? = nil
    ) {
        self.id = id ?? UUID().uuidString
        self.decorationId = decorationId
        self.x = x
        self.y = y
        self.scale = scale
        self.rotation = rotation
        self.skewX = skewX
        self.skewY = skewY
        self.zIndex = zIndex
        self.state = state
        self.badges = badges
        self.acquiredAt = Date()
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        decorationId = try c.decode(String.self, forKey: .decorationId)
        x = try c.decode(Double.self, forKey: .x)
        y = try c.decode(Double.self, forKey: .y)
        scale = try c.decode(Double.self, forKey: .scale)
        rotation = try c.decode(Double.self, forKey: .rotation)
        skewX = try c.decodeIfPresent(Double.self, forKey: .skewX) ?? 0
        skewY = try c.decodeIfPresent(Double.self, forKey: .skewY) ?? 0
        zIndex = try c.decode(Int.self, forKey: .zIndex)
        state = try c.decodeIfPresent(DecorationState.self, forKey: .state)
        badges = try c.decodeIfPresent([World2InventoryBadge].self, forKey: .badges)
        acquiredAt = try c.decodeIfPresent(Date.self, forKey: .acquiredAt) ?? Date()
    }

    var displayBadges: [World2InventoryBadge] {
        World2InventoryBadge.forDisplay(badges ?? [])
    }

    /// True while the item still wears its NEW! ribbon.
    var isUnseen: Bool {
        badges?.contains(.new) ?? false
    }

    mutating func markSeen() {
        guard var badges else { return }
        badges.removeAll { $0 == .new }
        self.badges = badges
    }
    
    static let starterJukeboxID = "decoration.jukebox.starter"
    static let marbleVoyageWorldBookID = FurnitureItem.marbleVoyageWorldBook.id

    static func starterJukebox(for playerId: PlayerId) -> DecorationInstance {
        DecorationInstance(
            id: "jukebox_\(playerId.rawValue)",
            decorationId: starterJukeboxID,
            x: 0.8,
            y: 0.7,
            scale: 1.0,
            rotation: 0,
            zIndex: 10,
            state: DecorationState(isActive: true, customData: ["currentTrack": "music.home.light"])
        )
    }

    /// Seeded on the Cozy Nook coffee table — already placed, not an inventory gift.
    static func marbleVoyageWorldBookInstanceID(for playerId: PlayerId) -> String {
        "marble_voyage_book_\(playerId.rawValue)"
    }

    static func marbleVoyageWorldBook(for playerId: PlayerId) -> DecorationInstance {
        let item = FurnitureItem.marbleVoyageWorldBook
        return DecorationInstance(
            id: marbleVoyageWorldBookInstanceID(for: playerId),
            decorationId: marbleVoyageWorldBookID,
            x: 0.50,
            // Coffee-table surface in Cozy Nook (was 0.56 — floated mid-air).
            y: 0.73,
            scale: item.defaultScale,
            rotation: 0,
            zIndex: 20
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
        /// Which treehouse room this piece lives in. Nil means the default
        /// Cozy Nook (legacy saves before multi-room).
        var roomId: String?

        struct Position: Codable {
            var x: Double
            var y: Double
        }
        
        enum PlacementLayer: String, Codable {
            case floor
            case wall
            case foreground
        }

        var resolvedRoomId: String {
            roomId ?? TreehouseRoomID.default.rawValue
        }

        init(
            id: String,
            decorationInstanceId: String,
            position: Position,
            layer: PlacementLayer,
            roomId: String? = nil
        ) {
            self.id = id
            self.decorationInstanceId = decorationInstanceId
            self.position = position
            self.layer = layer
            self.roomId = roomId
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
            placedDecorations: [],
            floorBounds: LayoutBounds(minX: 0.1, maxX: 0.9, minY: 0.5, maxY: 0.9),
            wallBounds: LayoutBounds(minX: 0.1, maxX: 0.9, minY: 0.1, maxY: 0.5)
        )
    }
}
