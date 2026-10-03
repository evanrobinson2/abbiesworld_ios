//
//  World2PartyController.swift
//  abbies.world.ios
//
//  Owns Abbie + Daddy poses for the open scene. Scene opens land them; POI
//  selection sends them walking on a straight line.
//

import Combine
import Foundation

@MainActor
final class World2PartyController: ObservableObject {
    /// Settled poses. While walking, prefer `pieces(at:)`.
    @Published private(set) var settledPieces: [World2PartyPieceState]
    @Published private(set) var isWalking = false
    /// Bumps when the party enters a new scene — views can reset local chrome.
    @Published private(set) var sceneVisitID = 0

    private var walkOrigin: [World2PartyActorID: World2NormalizedPoint] = [:]
    private var walkDestination: [World2PartyActorID: World2NormalizedPoint] = [:]
    private var walkStartedAt: Date?
    private var walkDuration: TimeInterval = 0
    private var walkFacingRight = true
    private var aspectRatio: Double = 4.0 / 3.0
    private var didFinishWalk = false
    private var moveStick = World2StickVector.zero
    private var faceStick = World2StickVector.zero
    private var stickDriving = false
    private var lastStickTick: Date?
    private var loggedStickGait: World2PartyGait?

    init() {
        let spawn = World2PartyLandingContract.defaultSpawn
        let formation = World2PartyPathfinding.formation(
            around: spawn.landing,
            facingRight: true
        )
        settledPieces = World2PartyActorID.allCases.map { actor in
            World2PartyPieceState(
                id: actor,
                position: formation[actor] ?? spawn.landing,
                facingRight: true,
                gait: .idle
            )
        }
    }

    /// Drop the party into a scene. Optional approach makes them walk after
    /// spawning — used by scene-exit contracts.
    func enterScene(
        _ contract: World2PartyLandingContract = .defaultSpawn,
        aspectRatio: Double = 4.0 / 3.0
    ) {
        self.aspectRatio = aspectRatio > 0.01 ? aspectRatio : 4.0 / 3.0
        cancelWalk()
        stickDriving = false
        lastStickTick = nil
        loggedStickGait = nil
        sceneVisitID += 1

        let formation = World2PartyPathfinding.formation(
            around: contract.landing,
            facingRight: true
        )
        settledPieces = World2PartyActorID.allCases.map { actor in
            World2PartyPieceState(
                id: actor,
                position: formation[actor] ?? contract.landing,
                facingRight: true,
                gait: .idle
            )
        }

        World2Diagnostics.log(
            "party_entered_scene",
            [
                "landing_x": String(format: "%.3f", contract.landing.x),
                "landing_y": String(format: "%.3f", contract.landing.y),
                "has_approach": contract.approach == nil ? "false" : "true",
            ]
        )

        if let approach = contract.approach {
            walkToward(approach)
        }
    }

    /// Walk the party toward a selected POI (or any normalized target).
    func walkToward(_ leadTarget: World2NormalizedPoint) {
        let current = pieces(at: Date())
        let currentLead = current.first(where: { $0.id == .abbie })?.position
            ?? leadPosition
        let facing = World2PartyPathfinding.facingRight(
            from: currentLead,
            to: leadTarget
        )
        let destinations = World2PartyPathfinding.formation(
            around: leadTarget,
            facingRight: facing
        )

        // Freeze the live pose as the new settled origin so a re-target mid-walk
        // does not snap back to the previous landing.
        settledPieces = current.map { piece in
            var next = piece
            next.gait = .idle
            return next
        }

        walkOrigin = Dictionary(
            uniqueKeysWithValues: settledPieces.map { ($0.id, $0.position) }
        )
        walkDestination = destinations
        walkStartedAt = Date()
        walkDuration = World2PartyPathfinding.duration(
            from: currentLead,
            to: leadTarget,
            aspectRatio: aspectRatio
        )
        walkFacingRight = facing
        didFinishWalk = false
        isWalking = true

        World2Diagnostics.log(
            "party_walk_started",
            [
                "to_x": String(format: "%.3f", leadTarget.x),
                "to_y": String(format: "%.3f", leadTarget.y),
                "duration_s": String(format: "%.2f", walkDuration),
            ]
        )
    }

    /// Convenience: walk to stand just south of a POI instance.
    func walkToPOI(at position: World2NormalizedPoint) {
        walkToward(World2PartyPathfinding.approachPoint(forPOI: position))
    }

    /// Rendered poses for the current clock. Pure while in flight; settles once.
    func pieces(at date: Date) -> [World2PartyPieceState] {
        guard isWalking,
              let started = walkStartedAt,
              !walkDestination.isEmpty else {
            return settledPieces
        }

        let elapsed = date.timeIntervalSince(started)
        let progress = walkDuration > 0 ? elapsed / walkDuration : 1

        if progress >= 1 {
            if !didFinishWalk {
                didFinishWalk = true
                let finalPieces = World2PartyActorID.allCases.map { actor in
                    World2PartyPieceState(
                        id: actor,
                        position: walkDestination[actor]
                            ?? settledPieces.first(where: { $0.id == actor })?.position
                            ?? World2PartyLandingContract.bottomLeftStaging,
                        facingRight: walkFacingRight,
                        gait: .idle
                    )
                }
                // Defer publish so TimelineView body stays pure.
                Task { @MainActor in
                    self.settle(finalPieces)
                }
            }
            return settledPieces.map { piece in
                var next = piece
                next.position = walkDestination[piece.id] ?? piece.position
                next.facingRight = walkFacingRight
                next.gait = .idle
                return next
            }
        }

        return World2PartyActorID.allCases.map { actor in
            let from = walkOrigin[actor]
                ?? settledPieces.first(where: { $0.id == actor })?.position
                ?? World2PartyLandingContract.bottomLeftStaging
            let to = walkDestination[actor] ?? from
            let position = World2PartyPathfinding.interpolate(
                from: from,
                to: to,
                progress: progress
            )
            return World2PartyPieceState(
                id: actor,
                position: position,
                facingRight: walkFacingRight,
                gait: .walk,
                heading: World2PartyPathfinding.headingForTravel(
                    dx: to.x - from.x,
                    dy: to.y - from.y
                ),
                stride: 1
            )
        }
    }

    var leadPosition: World2NormalizedPoint {
        settledPieces.first(where: { $0.id == .abbie })?.position
            ?? World2PartyLandingContract.bottomLeftStaging
    }

    func setMoveStick(_ vector: World2StickVector) {
        moveStick = vector
    }

    func setFaceStick(_ vector: World2StickVector) {
        faceStick = vector
    }

    /// Advance stick motion once per frame. Safe to call from a TimelineView
    /// body: a second call with the same timestamp is a no-op.
    func tickSticks(at date: Date) {
        let magnitude = moveStick.magnitude
        if magnitude < World2PartyPathfinding.stickDeadzone {
            guard stickDriving else { return }
            let live = pieces(at: date)
            stickDriving = false
            lastStickTick = nil
            loggedStickGait = .idle
            cancelWalk()
            settledPieces = live.map { piece in
                var next = piece
                next.gait = .idle
                return next
            }
            World2Diagnostics.log(
                "party_stick",
                [
                    "gait": World2PartyGait.idle.rawValue,
                    "x": String(format: "%.3f", leadPosition.x),
                    "y": String(format: "%.3f", leadPosition.y),
                ]
            )
            return
        }

        if !stickDriving {
            let live = pieces(at: date)
            cancelWalk()
            settledPieces = live.map { piece in
                var next = piece
                next.gait = .idle
                return next
            }
            stickDriving = true
            lastStickTick = date
            return
        }

        guard let last = lastStickTick else {
            lastStickTick = date
            return
        }
        var dt = date.timeIntervalSince(last)
        if dt < 0.0008 { return }
        if dt > 0.05 { dt = 0.05 }
        lastStickTick = date

        let step = World2PartyPathfinding.stickStep(
            lead: leadPosition,
            facingRight: settledPieces.first(where: { $0.id == .abbie })?.facingRight ?? true,
            heading: settledPieces.first(where: { $0.id == .abbie })?.heading ?? 0.72,
            move: moveStick,
            face: faceStick,
            dt: dt
        )
        let formation = World2PartyPathfinding.formation(
            around: step.lead,
            facingRight: step.facingRight
        )
        settledPieces = World2PartyActorID.allCases.map { actor in
            World2PartyPieceState(
                id: actor,
                position: formation[actor] ?? step.lead,
                facingRight: step.facingRight,
                gait: step.gait,
                heading: step.heading,
                stride: step.stride
            )
        }

        if loggedStickGait != step.gait {
            loggedStickGait = step.gait
            World2Diagnostics.log(
                "party_stick",
                [
                    "gait": step.gait.rawValue,
                    "x": String(format: "%.3f", step.lead.x),
                    "y": String(format: "%.3f", step.lead.y),
                    "facing_right": step.facingRight ? "true" : "false",
                ]
            )
        }
    }

    private func settle(_ pieces: [World2PartyPieceState]) {
        settledPieces = pieces
        cancelWalk()
        World2Diagnostics.log("party_walk_finished")
    }

    private func cancelWalk() {
        isWalking = false
        walkStartedAt = nil
        walkDuration = 0
        walkOrigin = [:]
        walkDestination = [:]
        didFinishWalk = false
    }
}
