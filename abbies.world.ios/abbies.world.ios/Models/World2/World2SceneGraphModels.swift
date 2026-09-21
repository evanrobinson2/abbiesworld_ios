//
//  World2SceneGraphModels.swift
//  abbies.world.ios
//
//  The scene graph vocabulary for Abbie's World 2: hardpoints (the painted pads
//  a place can sit on), transforms, and the POI instances that occupy them.
//
//  Everything here is plain Foundation so the snap math can be unit tested
//  without a simulator.
//

import Foundation

/// A point in image-normalized space: 0,0 is the top-left of the painted map and
/// 1,1 the bottom-right. Normalized points survive every screen size, rotation,
/// and letterbox, which is why the whole scene graph speaks in them.
struct World2NormalizedPoint: Codable, Equatable, Hashable, Sendable {
    var x: Double
    var y: Double

    init(x: Double, y: Double) {
        self.x = x
        self.y = y
    }

    static let center = World2NormalizedPoint(x: 0.5, y: 0.5)

    /// Distance corrected for the map's aspect ratio, expressed in units of map
    /// height. Without the correction a snap radius would read as an ellipse on
    /// any map that is not square.
    func distance(
        to other: World2NormalizedPoint,
        aspectRatio: Double
    ) -> Double {
        let safeAspect = aspectRatio > 0.01 ? aspectRatio : 1
        let dx = (x - other.x) * safeAspect
        let dy = y - other.y
        return (dx * dx + dy * dy).squareRoot()
    }

    func clamped(
        xRange: ClosedRange<Double> = 0.03...0.97,
        yRange: ClosedRange<Double> = 0.05...0.97
    ) -> World2NormalizedPoint {
        World2NormalizedPoint(
            x: min(max(x, xRange.lowerBound), xRange.upperBound),
            y: min(max(y, yRange.lowerBound), yRange.upperBound)
        )
    }

    func offset(dx: Double, dy: Double) -> World2NormalizedPoint {
        World2NormalizedPoint(x: x + dx, y: y + dy)
    }
}

/// How much painted ground a place covers. Hardpoints use size classes to say
/// what they can hold, so a large treehouse cannot be dropped onto a pad that
/// was painted for a mailbox.
enum World2POISizeClass: String, Codable, CaseIterable, Sendable, Comparable {
    case small
    case medium
    case large

    var displayName: String {
        switch self {
        case .small: return "Small"
        case .medium: return "Medium"
        case .large: return "Large"
        }
    }

    var sortOrder: Int {
        switch self {
        case .small: return 0
        case .medium: return 1
        case .large: return 2
        }
    }

    static func < (lhs: World2POISizeClass, rhs: World2POISizeClass) -> Bool {
        lhs.sortOrder < rhs.sortOrder
    }
}

// MARK: - Hardpoints

/// What a pad is for — place POIs, or plant portal / scene-kit exits.
enum World2HardpointPurpose: String, Codable, CaseIterable, Sendable {
    case place
    case portal

    var title: String {
        switch self {
        case .place: return "POI pad"
        case .portal: return "Portal pad"
        }
    }
}

/// A named, authored spot in a scene where a place belongs. The painted maps
/// already have dirt pads and sand circles; a hardpoint is the machine-readable
/// version of one of those pads.
struct World2SceneHardpoint: Codable, Identifiable, Equatable, Sendable {
    static let anySizeClass: Set<World2POISizeClass> = Set(World2POISizeClass.allCases)

    /// Magnetic pull distance, in units of map height.
    /// ≈20px on a ~900pt-tall plate — tight enough that pads don't grab
    /// from across the clearing.
    static let defaultSnapRadius = 0.022

    /// Allowed pull band (~11–27px on a ~900pt plate). Keeps authoring in the
    /// 15–25px feel and clamps older loose saved radii (~0.085) down.
    static let snapRadiusRange: ClosedRange<Double> = 0.012...0.030

    /// Breaking away is deliberately harder than snapping on. Without the
    /// hysteresis a snapped place chatters on and off its pad during one slow
    /// drag, which feels broken on a touch screen.
    static let breakawayMultiplier = 1.75

    let id: String
    var name: String
    var position: World2NormalizedPoint
    var acceptedSizeClasses: Set<World2POISizeClass>
    var snapRadius: Double
    /// Locked hardpoints still snap, but the hardpoint layer will not let a
    /// developer drag or delete them. Used for pads that art depends on.
    var isLocked: Bool
    var notes: String?
    /// Defaults to `.place` for older saved JSON.
    var purpose: World2HardpointPurpose

    init(
        id: String,
        name: String,
        position: World2NormalizedPoint,
        acceptedSizeClasses: Set<World2POISizeClass> = World2SceneHardpoint.anySizeClass,
        snapRadius: Double = World2SceneHardpoint.defaultSnapRadius,
        isLocked: Bool = false,
        notes: String? = nil,
        purpose: World2HardpointPurpose = .place
    ) {
        self.id = id
        self.name = name
        self.position = position
        self.acceptedSizeClasses = acceptedSizeClasses.isEmpty
            ? World2SceneHardpoint.anySizeClass
            : acceptedSizeClasses
        self.snapRadius = min(
            max(snapRadius, World2SceneHardpoint.snapRadiusRange.lowerBound),
            World2SceneHardpoint.snapRadiusRange.upperBound
        )
        self.isLocked = isLocked
        self.notes = notes
        self.purpose = purpose
    }

    /// Kept so existing call sites and saved JSON can keep speaking in flat x/y.
    var x: Double { position.x }
    var y: Double { position.y }

    var breakawayRadius: Double {
        snapRadius * World2SceneHardpoint.breakawayMultiplier
    }

    func accepts(_ sizeClass: World2POISizeClass) -> Bool {
        acceptedSizeClasses.contains(sizeClass)
    }

    var acceptedSizeSummary: String {
        if acceptedSizeClasses == World2SceneHardpoint.anySizeClass {
            return "any size"
        }
        return acceptedSizeClasses
            .sorted()
            .map { $0.displayName.lowercased() }
            .joined(separator: " / ")
    }

    // Saves written before hardpoints grew up stored a flat {id, name, x, y}.
    // Decode both shapes so a player's existing scenes still open.
    private enum CodingKeys: String, CodingKey {
        case id
        case name
        case position
        case acceptedSizeClasses
        case snapRadius
        case isLocked
        case notes
        case purpose
        case x
        case y
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let id = try container.decode(String.self, forKey: .id)
        let name = try container.decode(String.self, forKey: .name)
        let position: World2NormalizedPoint
        if let decoded = try container.decodeIfPresent(
            World2NormalizedPoint.self,
            forKey: .position
        ) {
            position = decoded
        } else {
            position = World2NormalizedPoint(
                x: try container.decodeIfPresent(Double.self, forKey: .x) ?? 0.5,
                y: try container.decodeIfPresent(Double.self, forKey: .y) ?? 0.5
            )
        }
        self.init(
            id: id,
            name: name,
            position: position,
            acceptedSizeClasses: try container.decodeIfPresent(
                Set<World2POISizeClass>.self,
                forKey: .acceptedSizeClasses
            ) ?? World2SceneHardpoint.anySizeClass,
            snapRadius: try container.decodeIfPresent(Double.self, forKey: .snapRadius)
                ?? World2SceneHardpoint.defaultSnapRadius,
            isLocked: try container.decodeIfPresent(Bool.self, forKey: .isLocked) ?? false,
            notes: try container.decodeIfPresent(String.self, forKey: .notes),
            purpose: try container.decodeIfPresent(
                World2HardpointPurpose.self,
                forKey: .purpose
            ) ?? .place
        )
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(position, forKey: .position)
        try container.encode(acceptedSizeClasses, forKey: .acceptedSizeClasses)
        try container.encode(snapRadius, forKey: .snapRadius)
        try container.encode(isLocked, forKey: .isLocked)
        try container.encodeIfPresent(notes, forKey: .notes)
        try container.encode(purpose, forKey: .purpose)
        // Flat mirrors keep exported JSON readable by hand and by older builds.
        try container.encode(position.x, forKey: .x)
        try container.encode(position.y, forKey: .y)
    }
}

extension World2SceneHardpoint {
    /// The starter pad layout offered when a developer births a placeholder scene.
    static let threePointLayout: [World2SceneHardpoint] = [
        World2SceneHardpoint(
            id: "hardpoint.left",
            name: "Left clearing",
            position: World2NormalizedPoint(x: 0.27, y: 0.58)
        ),
        World2SceneHardpoint(
            id: "hardpoint.center",
            name: "Center clearing",
            position: World2NormalizedPoint(x: 0.50, y: 0.48)
        ),
        World2SceneHardpoint(
            id: "hardpoint.right",
            name: "Right clearing",
            position: World2NormalizedPoint(x: 0.73, y: 0.58)
        ),
    ]
}

// MARK: - Transforms

/// Where a placed POI sits and how big it reads on the painted map.
struct World2POITransform: Codable, Equatable, Sendable {
    static let scaleRange: ClosedRange<Double> = 0.35...2.40
    static let rotationRange: ClosedRange<Double> = -180...180

    var position: World2NormalizedPoint
    var scale: Double
    var rotationDegrees: Double

    init(
        position: World2NormalizedPoint,
        scale: Double = 1.0,
        rotationDegrees: Double = 0
    ) {
        self.position = position
        self.scale = scale
        self.rotationDegrees = rotationDegrees
    }

    init(x: Double, y: Double, scale: Double = 1.0, rotationDegrees: Double = 0) {
        self.init(
            position: World2NormalizedPoint(x: x, y: y),
            scale: scale,
            rotationDegrees: rotationDegrees
        )
    }

    var x: Double { position.x }
    var y: Double { position.y }

    func clamped() -> World2POITransform {
        World2POITransform(
            position: position.clamped(),
            scale: min(max(scale, Self.scaleRange.lowerBound), Self.scaleRange.upperBound),
            rotationDegrees: rotationDegrees.truncatingRemainder(dividingBy: 360)
        )
    }

    func moved(to newPosition: World2NormalizedPoint) -> World2POITransform {
        World2POITransform(
            position: newPosition,
            scale: scale,
            rotationDegrees: rotationDegrees
        )
    }

    var debugSummary: String {
        String(
            format: "x %.3f  y %.3f  scale %.2f  rotation %.1f°",
            position.x,
            position.y,
            scale,
            rotationDegrees
        )
    }
}

// MARK: - POI instances

/// One placed appearance of a registered archetype inside one scene.
///
/// An archetype is the kind of place ("Furniture Store"); an instance is this
/// particular furniture store standing on this particular pad. Everything the
/// map draws is an instance.
struct World2POIInstance: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let archetypeID: String
    let sceneID: String
    var transform: World2POITransform
    /// The pad this instance is pinned to. `nil` means somebody unsnapped it and
    /// placed it freehand, which is allowed and preserved.
    var hardpointID: String?
    var zIndex: Int
    let createdAt: Date
    let createdByPlayerID: String?
    /// Instances authored in the shipped scene catalog cannot be deleted by the
    /// editor, only moved. Player-made instances can be removed.
    let isAuthored: Bool

    init(
        id: String? = nil,
        archetypeID: String,
        sceneID: String,
        transform: World2POITransform,
        hardpointID: String? = nil,
        zIndex: Int = 0,
        createdAt: Date = Date(),
        createdByPlayerID: String? = nil,
        isAuthored: Bool = false
    ) {
        self.id = id ?? "poiInstance.\(UUID().uuidString)"
        self.archetypeID = archetypeID
        self.sceneID = sceneID
        self.transform = transform
        self.hardpointID = hardpointID
        self.zIndex = zIndex
        self.createdAt = createdAt
        self.createdByPlayerID = createdByPlayerID
        self.isAuthored = isAuthored
    }

    var isSnapped: Bool { hardpointID != nil }

    private enum CodingKeys: String, CodingKey {
        case id
        case archetypeID
        case sceneID
        case transform
        case hardpointID
        case zIndex
        case createdAt
        case createdByPlayerID
        case isAuthored
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.init(
            id: try container.decode(String.self, forKey: .id),
            archetypeID: try container.decode(String.self, forKey: .archetypeID),
            sceneID: try container.decode(String.self, forKey: .sceneID),
            transform: try container.decode(World2POITransform.self, forKey: .transform),
            hardpointID: try container.decodeIfPresent(String.self, forKey: .hardpointID),
            zIndex: try container.decodeIfPresent(Int.self, forKey: .zIndex) ?? 0,
            createdAt: try container.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date(),
            createdByPlayerID: try container.decodeIfPresent(
                String.self,
                forKey: .createdByPlayerID
            ),
            isAuthored: try container.decodeIfPresent(Bool.self, forKey: .isAuthored) ?? false
        )
    }
}

// MARK: - Scenes

/// Hand-drawn fallback artwork for a scene whose painted map has not been
/// generated yet. A new scene should still look like somewhere, not like a
/// missing-asset placeholder.
enum World2SceneBackdropStyle: String, Codable, Sendable {
    case threeBearsWoods
    case peggleLand
}

/// One place the camera can sit: a painted backdrop, the pads on it, and the
/// places standing on those pads.
///
/// The same type covers shipped map scenes and scenes a developer births at
/// runtime, which is why the scene editor can work on either without caring
/// where the scene came from.
struct World2SceneDefinition: Codable, Identifiable, Equatable, Sendable {
    let id: String
    var name: String
    var summary: String
    /// Semantic asset name for the painted backdrop.
    var backgroundAsset: String
    /// Optional muted looping video semantic ID (e.g. map.artGarden.ambient).
    /// When resolved, the map plate prefers this over the still poster.
    var ambientVideoAsset: String?
    var backdropStyle: World2SceneBackdropStyle?
    var hardpoints: [World2SceneHardpoint]
    var poiInstances: [World2POIInstance]
    /// Players (not just developers) may place places from their inventory here.
    var isMutableByPlayer: Bool
    /// When true, empty pads shimmer for players as "something goes here".
    /// Developers always see every pad regardless.
    var showsOpenHardpointsToPlayers: Bool
    var isDeveloperPlaceholder: Bool
    let createdAt: Date
    let createdByPlayerID: String?

    init(
        id: String,
        name: String,
        summary: String,
        backgroundAsset: String = "",
        ambientVideoAsset: String? = nil,
        backdropStyle: World2SceneBackdropStyle? = nil,
        hardpoints: [World2SceneHardpoint] = [],
        poiInstances: [World2POIInstance] = [],
        isMutableByPlayer: Bool = false,
        showsOpenHardpointsToPlayers: Bool = false,
        isDeveloperPlaceholder: Bool = false,
        createdAt: Date = Date(),
        createdByPlayerID: String? = nil
    ) {
        self.id = id
        self.name = name
        self.summary = summary
        self.backgroundAsset = backgroundAsset
        self.ambientVideoAsset = ambientVideoAsset
        self.backdropStyle = backdropStyle
        self.hardpoints = hardpoints
        self.poiInstances = poiInstances
        self.isMutableByPlayer = isMutableByPlayer
        self.showsOpenHardpointsToPlayers = showsOpenHardpointsToPlayers
        self.isDeveloperPlaceholder = isDeveloperPlaceholder
        self.createdAt = createdAt
        self.createdByPlayerID = createdByPlayerID
    }

    static let blankSlateSceneID = "scene.blankSlate"

    static let blankSlate = World2SceneDefinition(
        id: blankSlateSceneID,
        name: "Blank Slate",
        summary: "A persistent scene for places you make",
        backgroundAsset: "map.blankSlate",
        isMutableByPlayer: true
    )

    func hardpoint(_ id: String) -> World2SceneHardpoint? {
        hardpoints.first { $0.id == id }
    }

    func instance(_ id: String) -> World2POIInstance? {
        poiInstances.first { $0.id == id }
    }

    var occupancy: [String: String] {
        World2HardpointSnapEngine.occupancy(of: poiInstances)
    }

    var openHardpoints: [World2SceneHardpoint] {
        World2HardpointSnapEngine.openHardpoints(
            in: hardpoints,
            occupancy: occupancy
        )
    }

    /// Instances in the order they should be drawn, back to front.
    var instancesInDrawOrder: [World2POIInstance] {
        poiInstances.sorted { lhs, rhs in
            lhs.zIndex == rhs.zIndex ? lhs.id < rhs.id : lhs.zIndex < rhs.zIndex
        }
    }

    // Scenes saved before the scene graph landed had no backdrop or instances.
    private enum CodingKeys: String, CodingKey {
        case id
        case name
        case summary
        case backgroundAsset
        case backdropStyle
        case hardpoints
        case poiInstances
        case isMutableByPlayer
        case showsOpenHardpointsToPlayers
        case isDeveloperPlaceholder
        case createdAt
        case createdByPlayerID
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.init(
            id: try container.decode(String.self, forKey: .id),
            name: try container.decode(String.self, forKey: .name),
            summary: try container.decodeIfPresent(String.self, forKey: .summary) ?? "",
            backgroundAsset: try container.decodeIfPresent(
                String.self,
                forKey: .backgroundAsset
            ) ?? "",
            backdropStyle: try container.decodeIfPresent(
                World2SceneBackdropStyle.self,
                forKey: .backdropStyle
            ),
            hardpoints: try container.decodeIfPresent(
                [World2SceneHardpoint].self,
                forKey: .hardpoints
            ) ?? [],
            poiInstances: try container.decodeIfPresent(
                [World2POIInstance].self,
                forKey: .poiInstances
            ) ?? [],
            isMutableByPlayer: try container.decodeIfPresent(
                Bool.self,
                forKey: .isMutableByPlayer
            ) ?? false,
            showsOpenHardpointsToPlayers: try container.decodeIfPresent(
                Bool.self,
                forKey: .showsOpenHardpointsToPlayers
            ) ?? false,
            isDeveloperPlaceholder: try container.decodeIfPresent(
                Bool.self,
                forKey: .isDeveloperPlaceholder
            ) ?? false,
            createdAt: try container.decodeIfPresent(Date.self, forKey: .createdAt)
                ?? Date.distantPast,
            createdByPlayerID: try container.decodeIfPresent(
                String.self,
                forKey: .createdByPlayerID
            )
        )
    }
}

/// The scene type used to be split between shipped maps and player-made scenes.
/// They are one type now; this keeps the older name working.
typealias World2MutableScene = World2SceneDefinition
