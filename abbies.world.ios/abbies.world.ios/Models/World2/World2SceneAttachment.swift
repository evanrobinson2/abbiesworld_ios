import Foundation

/// A compass socket on a connected scene that does not yet lead anywhere.
/// New scenes hang here as the last step of invention.
struct World2OpenNode: Equatable, Identifiable, Sendable {
    let hostSceneID: String
    let hostName: String
    let compass: World2Compass

    var id: String { "\(hostSceneID).\(compass.rawValue)" }

    var label: String { "\(hostName) \(compass.label)" }
}

/// Hang an orphan scene onto an empty compass socket. Duals are written in both
/// directions in one shot so the graph never has a one-way door.
enum World2SceneAttachment {
    static func socketKey(for sceneID: String) -> String {
        var key = sceneID
        if key.hasPrefix("world.") {
            key.removeFirst("world.".count)
        } else if key.hasPrefix("scene.") {
            key.removeFirst("scene.".count)
        }
        return key
    }

    /// Compass directions on connected (non-orphan) scenes with no destination.
    /// Missing portal instances count as open, same as the player-facing arrows.
    static func openNodes(in scenes: [World2SceneDefinition]) -> [World2OpenNode] {
        scenes.flatMap { scene -> [World2OpenNode] in
            guard !scene.isOrphan else { return [] }
            return World2Compass.allCases.compactMap { compass in
                if scene.compassPortal(compass)?.portal?.hasDestination == true {
                    return nil
                }
                return World2OpenNode(
                    hostSceneID: scene.id,
                    hostName: scene.name,
                    compass: compass
                )
            }
        }
    }

    /// Write dual compass portals between `orphan` and `host`. Returns false if
    /// that host socket already leads somewhere, or if the orphan is already hung.
    @discardableResult
    static func attach(
        orphan: inout World2SceneDefinition,
        host: inout World2SceneDefinition,
        compass: World2Compass
    ) -> Bool {
        guard orphan.isOrphan, orphan.id != host.id else { return false }
        if host.compassPortal(compass)?.portal?.hasDestination == true {
            return false
        }
        if orphan.compassPortal(compass.dual)?.portal?.hasDestination == true {
            return false
        }

        let hostKey = socketKey(for: host.id)
        let orphanKey = socketKey(for: orphan.id)
        let hostInstanceID = host.compassPortal(compass)?.id
            ?? "instance.\(hostKey).portal.\(compass.rawValue)"
        let orphanInstanceID = orphan.compassPortal(compass.dual)?.id
            ?? "instance.\(orphanKey).portal.\(compass.dual.rawValue)"

        ensureCompassSocket(
            on: &host,
            compass: compass,
            instanceID: hostInstanceID,
            destinationSceneID: orphan.id,
            reverseInstanceID: orphanInstanceID,
            displayName: orphan.name
        )
        ensureCompassSocket(
            on: &orphan,
            compass: compass.dual,
            instanceID: orphanInstanceID,
            destinationSceneID: host.id,
            reverseInstanceID: hostInstanceID,
            displayName: host.name
        )
        orphan.isOrphan = false
        return true
    }

    private static func ensureCompassSocket(
        on scene: inout World2SceneDefinition,
        compass: World2Compass,
        instanceID: String,
        destinationSceneID: String,
        reverseInstanceID: String,
        displayName: String
    ) {
        let key = socketKey(for: scene.id)
        let padID = "hardpoint.\(key).\(compass.rawValue)"
        let existingHardpointID = scene.compassPortal(compass)?.hardpointID
        if existingHardpointID == nil, scene.hardpoint(padID) == nil {
            scene.hardpoints.append(
                World2SceneHardpoint(
                    id: padID,
                    name: "\(compass.label) edge",
                    position: compass.edgeAnchor,
                    acceptedSizeClasses: [.small],
                    isLocked: true,
                    notes: "Compass socket"
                )
            )
        }

        let hardpointID = existingHardpointID ?? padID
        let portal = World2PortalLink(
            destinationSceneID: destinationSceneID,
            reverseInstanceID: reverseInstanceID,
            transition: .slide(compass),
            activation: .swipe(compass),
            compass: compass,
            name: displayName
        )

        if let index = scene.poiInstances.firstIndex(where: { $0.portal?.compass == compass }) {
            scene.poiInstances[index].portal = portal
            if scene.poiInstances[index].hardpointID == nil {
                scene.poiInstances[index].hardpointID = hardpointID
            }
            return
        }

        scene.poiInstances.append(
            World2POIInstance(
                id: instanceID,
                archetypeID: World2POIRegistry.scenePortalID,
                sceneID: scene.id,
                transform: World2POITransform(position: compass.edgeAnchor, scale: 0.55),
                hardpointID: hardpointID,
                zIndex: 8,
                portal: portal
            )
        )
    }
}
