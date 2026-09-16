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
                isWalking: false
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
                isWalking: false
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
            next.isWalking = false
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
                        isWalking: false
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
                next.isWalking = false
                return next
            }
        }

        return World2PartyActorID.allCases.map { actor in
            let from = walkOrigin[actor]
                ?? settledPieces.first(where: { $0.id == actor })?.position
                ?? World2PartyLandingContract.bottomLeftStaging
            let to = walkDestination[actor] ?? from
            return World2PartyPieceState(
                id: actor,
                position: World2PartyPathfinding.interpolate(
                    from: from,
                    to: to,
                    progress: progress
                ),
                facingRight: walkFacingRight,
                isWalking: true
            )
        }
    }

    var leadPosition: World2NormalizedPoint {
        settledPieces.first(where: { $0.id == .abbie })?.position
            ?? World2PartyLandingContract.bottomLeftStaging
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
