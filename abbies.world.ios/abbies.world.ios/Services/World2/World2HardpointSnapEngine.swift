//
//  World2HardpointSnapEngine.swift
//  abbies.world.ios
//
//  Magnetic snapping for the scene graph.
//
//  The interaction copies what RTS and ship-builder games settled on years ago:
//  drag freely, feel a magnetic pull when a compatible pad is close, see the pad
//  light up before committing, and break away by dragging past a wider radius
//  than the one that captured you. Snapping can also be switched off outright so
//  a place can be positioned freehand.
//
//  This file is deliberately pure Foundation with no view or service
//  dependencies so every rule below is unit testable.
//

import Foundation

enum World2HardpointSnapEngine {
    /// Everything the engine needs to answer "where does this place land?".
    struct Request {
        /// Where the finger has dragged the place, in image-normalized space.
        let proposedPosition: World2NormalizedPoint
        let sizeClass: World2POISizeClass
        let hardpoints: [World2SceneHardpoint]
        /// hardpoint id -> id of the instance already standing on it.
        let occupancy: [String: String]
        /// The instance being dragged. It never blocks itself.
        let movingInstanceID: String?
        /// The pad the instance was pinned to before this drag started.
        let currentHardpointID: String?
        let snappingEnabled: Bool
        /// Map width / map height, so the pull radius reads as a circle.
        let aspectRatio: Double

        init(
            proposedPosition: World2NormalizedPoint,
            sizeClass: World2POISizeClass,
            hardpoints: [World2SceneHardpoint],
            occupancy: [String: String] = [:],
            movingInstanceID: String? = nil,
            currentHardpointID: String? = nil,
            snappingEnabled: Bool = true,
            aspectRatio: Double = 4.0 / 3.0
        ) {
            self.proposedPosition = proposedPosition
            self.sizeClass = sizeClass
            self.hardpoints = hardpoints
            self.occupancy = occupancy
            self.movingInstanceID = movingInstanceID
            self.currentHardpointID = currentHardpointID
            self.snappingEnabled = snappingEnabled
            self.aspectRatio = aspectRatio
        }
    }

    /// Why a pad the finger is hovering cannot take this place. Surfaced to the
    /// editor so a developer is told the reason instead of watching a snap
    /// silently fail.
    enum Rejection: Equatable {
        case occupied(hardpointID: String, byInstanceID: String)
        case wrongSize(hardpointID: String, accepts: String)

        var hardpointID: String {
            switch self {
            case .occupied(let hardpointID, _): return hardpointID
            case .wrongSize(let hardpointID, _): return hardpointID
            }
        }

        var explanation: String {
            switch self {
            case .occupied:
                return "That spot is already taken."
            case .wrongSize(_, let accepts):
                return "That spot only fits \(accepts) places."
            }
        }
    }

    struct Resolution: Equatable {
        /// Where the place should actually be drawn.
        let position: World2NormalizedPoint
        /// The pad it is pinned to, or nil when it is floating freehand.
        let hardpointID: String?
        /// The pad to light up while the drag is live. Includes pads that would
        /// reject the place, so the editor can explain itself.
        let highlightedHardpointID: String?
        let rejection: Rejection?

        var isSnapped: Bool { hardpointID != nil }
    }

    /// Resolve a drag into a final position and snap state.
    static func resolve(_ request: Request) -> Resolution {
        let free = request.proposedPosition.clamped()

        guard request.snappingEnabled else {
            return Resolution(
                position: free,
                hardpointID: nil,
                highlightedHardpointID: nil,
                rejection: nil
            )
        }

        let measured = measure(request)

        // Hysteresis: a place already sitting on a pad keeps it until the drag
        // travels past the wider breakaway radius.
        if let currentHardpointID = request.currentHardpointID,
           let held = measured.first(where: { $0.hardpoint.id == currentHardpointID }),
           held.distance <= held.hardpoint.breakawayRadius {
            return Resolution(
                position: held.hardpoint.position,
                hardpointID: held.hardpoint.id,
                highlightedHardpointID: held.hardpoint.id,
                rejection: nil
            )
        }

        let inPullRange = measured.filter { $0.distance <= $0.hardpoint.snapRadius }

        guard let nearest = inPullRange.first else {
            return Resolution(
                position: free,
                hardpointID: nil,
                highlightedHardpointID: nil,
                rejection: nil
            )
        }

        if let eligible = inPullRange.first(where: { isEligible($0.hardpoint, for: request) }) {
            return Resolution(
                position: eligible.hardpoint.position,
                hardpointID: eligible.hardpoint.id,
                highlightedHardpointID: eligible.hardpoint.id,
                rejection: nil
            )
        }

        // Nothing nearby will take it. Stay freehand but name the obstacle.
        return Resolution(
            position: free,
            hardpointID: nil,
            highlightedHardpointID: nearest.hardpoint.id,
            rejection: rejection(for: nearest.hardpoint, request: request)
        )
    }

    /// Pads with nothing standing on them.
    static func openHardpoints(
        in hardpoints: [World2SceneHardpoint],
        occupancy: [String: String]
    ) -> [World2SceneHardpoint] {
        hardpoints.filter { occupancy[$0.id] == nil }
    }

    /// Build the occupancy map the engine expects from the instances in a scene.
    static func occupancy(of instances: [World2POIInstance]) -> [String: String] {
        var map: [String: String] = [:]
        for instance in instances {
            guard let hardpointID = instance.hardpointID else { continue }
            // First writer wins so a duplicate binding cannot hide the original.
            if map[hardpointID] == nil {
                map[hardpointID] = instance.id
            }
        }
        return map
    }

    /// The pad a newly registered place should take: the nearest open, compatible
    /// one. Used when dropping an archetype into a scene from the editor.
    static func suggestedHardpoint(
        for sizeClass: World2POISizeClass,
        near position: World2NormalizedPoint,
        hardpoints: [World2SceneHardpoint],
        occupancy: [String: String],
        aspectRatio: Double = 4.0 / 3.0
    ) -> World2SceneHardpoint? {
        let available: [World2SceneHardpoint] = hardpoints.filter { hardpoint in
            occupancy[hardpoint.id] == nil && hardpoint.accepts(sizeClass)
        }
        var measured: [Measured] = []
        for hardpoint in available {
            let distance = hardpoint.position.distance(
                to: position,
                aspectRatio: aspectRatio
            )
            measured.append(Measured(hardpoint: hardpoint, distance: distance))
        }
        return sortedNearestFirst(measured).first?.hardpoint
    }

    // MARK: - Internals

    private struct Measured {
        let hardpoint: World2SceneHardpoint
        let distance: Double
    }

    /// Hardpoints sorted nearest first. Ties break on id so the result is stable
    /// and testable rather than dependent on authoring order.
    private static func measure(_ request: Request) -> [Measured] {
        var measured: [Measured] = []
        for hardpoint in request.hardpoints {
            let distance = hardpoint.position.distance(
                to: request.proposedPosition,
                aspectRatio: request.aspectRatio
            )
            measured.append(Measured(hardpoint: hardpoint, distance: distance))
        }
        return sortedNearestFirst(measured)
    }

    private static func sortedNearestFirst(_ measured: [Measured]) -> [Measured] {
        measured.sorted { lhs, rhs in
            if lhs.distance == rhs.distance {
                return lhs.hardpoint.id < rhs.hardpoint.id
            }
            return lhs.distance < rhs.distance
        }
    }

    private static func isEligible(
        _ hardpoint: World2SceneHardpoint,
        for request: Request
    ) -> Bool {
        guard hardpoint.accepts(request.sizeClass) else { return false }
        guard let occupant = request.occupancy[hardpoint.id] else { return true }
        return occupant == request.movingInstanceID
    }

    private static func rejection(
        for hardpoint: World2SceneHardpoint,
        request: Request
    ) -> Rejection {
        if !hardpoint.accepts(request.sizeClass) {
            return .wrongSize(
                hardpointID: hardpoint.id,
                accepts: hardpoint.acceptedSizeSummary
            )
        }
        return .occupied(
            hardpointID: hardpoint.id,
            byInstanceID: request.occupancy[hardpoint.id] ?? "unknown"
        )
    }
}
