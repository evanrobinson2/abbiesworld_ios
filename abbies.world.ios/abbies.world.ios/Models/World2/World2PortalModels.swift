//
//  World2PortalModels.swift
//  abbies.world.ios
//
//  A portal is a placed POI that teleports into another scene. NESW map exits
//  are the same type: edge placement, a compass, a slide, and swipe to commit.
//  A microwave is the same type with a point placement, a name, and a tap.
//

import Foundation

enum World2Compass: String, Codable, CaseIterable, Identifiable, Sendable {
    case north
    case south
    case east
    case west

    var id: String { rawValue }

    var dual: World2Compass {
        switch self {
        case .north: return .south
        case .south: return .north
        case .east: return .west
        case .west: return .east
        }
    }

    var label: String { rawValue.uppercased() }

    var systemImage: String {
        switch self {
        case .north: return "arrow.up"
        case .south: return "arrow.down"
        case .east: return "arrow.right"
        case .west: return "arrow.left"
        }
    }

    /// Image-normalized anchor for a compass socket on a painted map.
    var edgeAnchor: World2NormalizedPoint {
        switch self {
        case .north: return World2NormalizedPoint(x: 0.50, y: 0.07)
        case .south: return World2NormalizedPoint(x: 0.50, y: 0.93)
        case .east: return World2NormalizedPoint(x: 0.93, y: 0.50)
        case .west: return World2NormalizedPoint(x: 0.07, y: 0.50)
        }
    }

    /// Pick the axis the finger actually moved along, once the drag has a
    /// direction. Used so a diagonal swipe still binds to one NESW socket.
    static func dominant(
        translationX: Double,
        translationY: Double,
        threshold: Double = 12
    ) -> World2Compass? {
        let ax = abs(translationX)
        let ay = abs(translationY)
        guard max(ax, ay) >= threshold else { return nil }
        if ax > ay {
            return translationX > 0 ? .east : .west
        }
        return translationY > 0 ? .south : .north
    }
}

/// How the camera leaves this scene and arrives in the next one.
enum World2SceneTransition: Equatable, Sendable {
    case fade
    case slide(World2Compass)
    case portal
    case dream

    var diagnosticName: String {
        switch self {
        case .fade: return "fade"
        case .slide(let compass): return "slide.\(compass.rawValue)"
        case .portal: return "portal"
        case .dream: return "dream"
        }
    }

    /// Interactive percent-driven travel only makes sense for a slide. Portal
    /// and dream plays are scripted so a six-year-old cannot get stuck halfway.
    var isInteractive: Bool {
        if case .slide = self { return true }
        return false
    }
}

extension World2SceneTransition: Codable {
    private enum CodingKeys: String, CodingKey {
        case kind
        case compass
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(String.self, forKey: .kind) {
        case "slide":
            self = .slide(try container.decode(World2Compass.self, forKey: .compass))
        case "portal":
            self = .portal
        case "dream":
            self = .dream
        default:
            self = .fade
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .fade:
            try container.encode("fade", forKey: .kind)
        case .slide(let compass):
            try container.encode("slide", forKey: .kind)
            try container.encode(compass, forKey: .compass)
        case .portal:
            try container.encode("portal", forKey: .kind)
        case .dream:
            try container.encode("dream", forKey: .kind)
        }
    }
}

/// How the player asks this portal to fire.
enum World2PortalActivation: Equatable, Sendable {
    case tap
    case swipe(World2Compass)

    var diagnosticName: String {
        switch self {
        case .tap: return "tap"
        case .swipe(let compass): return "swipe.\(compass.rawValue)"
        }
    }

    static func `default`(compass: World2Compass?) -> World2PortalActivation {
        if let compass {
            return .swipe(compass)
        }
        return .tap
    }
}

extension World2PortalActivation: Codable {
    private enum CodingKeys: String, CodingKey {
        case kind
        case compass
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(String.self, forKey: .kind) {
        case "swipe":
            self = .swipe(try container.decode(World2Compass.self, forKey: .compass))
        default:
            self = .tap
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .tap:
            try container.encode("tap", forKey: .kind)
        case .swipe(let compass):
            try container.encode("swipe", forKey: .kind)
            try container.encode(compass, forKey: .compass)
        }
    }
}

/// One directed hop from this instance into another scene.
struct World2PortalLink: Codable, Equatable, Sendable {
    /// Nil means a compass socket with no path yet — swipe rubber-bands.
    var destinationSceneID: String?
    /// The matching portal in the destination scene. Duals are two directed
    /// rows that point at each other, Sierra-style.
    var reverseInstanceID: String?
    var transition: World2SceneTransition
    var activation: World2PortalActivation
    /// Set for NESW edge exits. Nil for a point teleporter (microwave, sky gate).
    var compass: World2Compass?
    /// Optional label on the arrow or marker. Falls back to the destination name.
    var name: String?

    var isCompassExit: Bool { compass != nil }

    var hasDestination: Bool {
        guard let destinationSceneID else { return false }
        return !destinationSceneID.isEmpty
    }

    var destinationWorldID: WorldId? {
        destinationSceneID.flatMap(WorldId.init(sceneID:))
    }

    var displayName: String {
        if let name, !name.isEmpty { return name }
        if let destinationWorldID { return destinationWorldID.displayName }
        if let destinationSceneID, !destinationSceneID.isEmpty { return destinationSceneID }
        return "Nowhere yet"
    }
}

extension World2POIInstance {
    /// Compass sockets are chrome (arrows + swipe), not buildings.
    var hidesOnPlayerMap: Bool {
        portal?.isCompassExit == true
    }

    var isPointPortal: Bool {
        guard let portal else { return false }
        return !portal.isCompassExit
    }
}

extension World2SceneDefinition {
    func compassPortal(_ compass: World2Compass) -> World2POIInstance? {
        poiInstances.first { $0.portal?.compass == compass }
    }

    var pointPortals: [World2POIInstance] {
        poiInstances.filter(\.isPointPortal)
    }
}

/// Cross-scene checks the per-scene registry validator cannot see: duals have
/// to point at each other, and a scene may only have one socket per compass.
enum World2PortalGraph {
    static func validate(scenes: [World2SceneDefinition]) -> [World2POIRegistryIssue] {
        let byID = Dictionary(uniqueKeysWithValues: scenes.map { ($0.id, $0) })
        var issues: [World2POIRegistryIssue] = []

        for scene in scenes {
            var seenCompass: [World2Compass: String] = [:]
            for instance in scene.poiInstances {
                guard let portal = instance.portal else { continue }

                if let compass = portal.compass {
                    if let existing = seenCompass[compass] {
                        issues.append(
                            .portalDuplicateCompass(
                                sceneID: scene.id,
                                compass: compass.rawValue,
                                instanceIDs: [existing, instance.id]
                            )
                        )
                    } else {
                        seenCompass[compass] = instance.id
                    }
                }

                guard let destinationID = portal.destinationSceneID,
                      !destinationID.isEmpty else {
                    continue
                }

                guard let destination = byID[destinationID] else {
                    issues.append(
                        .portalUnknownDestination(
                            instanceID: instance.id,
                            sceneID: scene.id,
                            destinationSceneID: destinationID
                        )
                    )
                    continue
                }

                guard let reverseID = portal.reverseInstanceID else { continue }
                guard let reverse = destination.instance(reverseID),
                      let reversePortal = reverse.portal else {
                    issues.append(
                        .portalBrokenDual(
                            instanceID: instance.id,
                            sceneID: scene.id,
                            reverseInstanceID: reverseID,
                            destinationSceneID: destinationID
                        )
                    )
                    continue
                }

                let reversePointsHome = reversePortal.destinationSceneID == scene.id
                    && reversePortal.reverseInstanceID == instance.id
                let dualCompassMatches: Bool = {
                    switch (portal.compass, reversePortal.compass) {
                    case (nil, nil):
                        return true
                    case let (lhs?, rhs?):
                        return lhs.dual == rhs
                    default:
                        return false
                    }
                }()
                if !reversePointsHome || !dualCompassMatches {
                    issues.append(
                        .portalBrokenDual(
                            instanceID: instance.id,
                            sceneID: scene.id,
                            reverseInstanceID: reverseID,
                            destinationSceneID: destinationID
                        )
                    )
                }
            }
        }

        return issues.sorted { $0.description < $1.description }
    }
}
