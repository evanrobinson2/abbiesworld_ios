import Foundation

/// Peglin Edition product config — default destination without wiping other worlds.
enum PeglinEdition {
    /// Compiled / teleporter world id. Prior worlds stay in `WorldId` and on the server doc.
    static let worldID: WorldId = .peglinEdition

    /// Crash Land scene id (compiled catalog + seed for household document).
    static let crashLandSceneID = "scene.peglin.crashLand"

    /// When true, login lands here instead of Home / server activeScene.
    static var isDefaultDestination: Bool {
        if ProcessInfo.processInfo.arguments.contains("-peglinEditionOff") { return false }
        if ProcessInfo.processInfo.arguments.contains("-peglinEditionOn") { return true }
        // Product default for this release.
        return true
    }

    static let displayName = "Peglin Edition"

    // MARK: - Lands (progression)

    enum Land: String, CaseIterable, Identifiable, Sendable {
        case crashWorld
        case bramble
        case foxLand
        case stagLand
        case forgottenRealm

        var id: String { rawValue }

        var sceneID: String {
            switch self {
            case .crashWorld: return PeglinEdition.crashLandSceneID
            case .bramble: return "scene.peglin.bramble"
            case .foxLand: return "scene.peglin.foxLand"
            case .stagLand: return "scene.peglin.stagLand"
            case .forgottenRealm: return "scene.peglin.forgottenRealm"
            }
        }

        var mapAsset: String {
            switch self {
            case .crashWorld: return "map.peglin.crashLand"
            case .bramble: return "map.peglin.bramble"
            case .foxLand: return "map.peglin.foxLand"
            case .stagLand: return "map.peglin.stagLand"
            case .forgottenRealm: return "map.peglin.forgottenRealm"
            }
        }

        var displayName: String {
            switch self {
            case .crashWorld: return "Crash World"
            case .bramble: return "Bramble"
            case .foxLand: return "Fox Land"
            case .stagLand: return "Stag Land"
            case .forgottenRealm: return "Forgotten Realm"
            }
        }

        var summary: String {
            switch self {
            case .crashWorld:
                return "Wreck clearing — Peg Monastery blessings, then north to Fox Land"
            case .bramble:
                return "Clover bowl clearing — rabbit-fawn spirit and burrow pockets"
            case .foxLand:
                return "Kitsune grove — pink trees, lanterns, glowing mushrooms"
            case .stagLand:
                return "Crystal-antler stag on a ley-line floating isle"
            case .forgottenRealm:
                return "Ruined sanctuary — quiet pedestal, path’s end"

            }
        }

        /// Next land along the Broken Path chain (nil at the end).
        var next: Land? {
            switch self {
            case .crashWorld: return .bramble
            case .bramble: return .foxLand
            case .foxLand: return .stagLand
            case .stagLand: return .forgottenRealm
            case .forgottenRealm: return nil
            }
        }

        var previous: Land? {
            switch self {
            case .crashWorld: return nil
            case .bramble: return .crashWorld
            case .foxLand: return .bramble
            case .stagLand: return .foxLand
            case .forgottenRealm: return .stagLand
            }
        }
    }

    static let allSceneIDs: [String] = Land.allCases.map(\.sceneID)

    // MARK: - Crash Land POIs

    static let wreckPlaceID = "poi.peglin.wreck"
    /// Retired — stripped from scenes; monastery blessings replaced map salvage orbs.
    static let wreckPowerUpID = "poi.peglin.wreck.powerUp"
    static let battlePlaceID = "poi.peglin.battleClearing"
    static let workshopPlaceID = "poi.peglin.salvageWorkshop"
    static let brokenPathPlaceID = "poi.peglin.brokenPath"
    /// Peg Monastery — math blessings for battle power-ups (Crash World home land).
    static let pegMonasteryID = "poi.peglin.pegMonastery"

    // MARK: - Land guardians / power-up

    static let brambleGuardianID = "poi.peglin.bramble.guardian"
    static let foxGuardianID = "poi.peglin.foxLand.guardian"
    static let stagGuardianID = "poi.peglin.stagLand.guardian"
    static let forgottenOrbID = "poi.peglin.forgottenRealm.orb"

    // MARK: - Path markers (travel)

    static let pathToBrambleID = "poi.peglin.path.toBramble"
    static let pathToFoxID = "poi.peglin.path.toFoxLand"
    static let pathToStagID = "poi.peglin.path.toStagLand"
    static let pathToForgottenID = "poi.peglin.path.toForgottenRealm"
    static let pathBackToCrashID = "poi.peglin.path.toCrashLand"
    static let pathBackToBrambleID = "poi.peglin.path.backBramble"
    static let pathBackToFoxID = "poi.peglin.path.backFoxLand"
    static let pathBackToStagID = "poi.peglin.path.backStagLand"
    /// MVP: Home north → Fox Land, Fox south → Home.
    static let pathHomeToFoxID = "poi.peglin.path.homeToFox"
    static let pathFoxToHomeID = "poi.peglin.path.foxToHome"

    /// Where the party appears when a Peglin scene opens. No auto-walk to POIs —
    /// Abbie only walks when the player taps a landmark or picks it in the thumb menu.
    enum ArrivalGate: String, Sendable {
        /// Came from the previous land — stand at the south path, facing the creature.
        case southPortal
        /// Came back from the next land — stand at the north path.
        case northPortal
        /// First spawn / login on Crash World crater rim.
        case crater
    }

    /// Set just before `travelToDocumentScene` so the destination spawns at the gate.
    static var pendingArrival: (sceneID: String, gate: ArrivalGate)?

    static func noteTravel(from fromSceneID: String, to toSceneID: String) {
        guard let toLand = Land.allCases.first(where: { $0.sceneID == toSceneID }) else {
            pendingArrival = (toSceneID, .southPortal)
            return
        }
        let fromLand = Land.allCases.first(where: { $0.sceneID == fromSceneID })
        let gate: ArrivalGate
        if toLand == .crashWorld {
            gate = .northPortal // return via Broken Path
        } else if fromLand?.next == toLand {
            gate = .southPortal // stepped forward along the chain
        } else if toLand.next == fromLand {
            gate = .northPortal // stepped back along the chain
        } else if fromLand == nil || fromLand == .crashWorld {
            gate = .southPortal
        } else {
            gate = .southPortal
        }
        pendingArrival = (toSceneID, gate)
        log(
            "arrival_queued",
            ["from": fromSceneID, "to": toSceneID, "gate": gate.rawValue]
        )
    }

    static func partyLanding(for sceneID: String) -> World2PartyLandingContract {
        let gate: ArrivalGate
        if let pending = pendingArrival, pending.sceneID == sceneID {
            gate = pending.gate
            pendingArrival = nil
        } else if sceneID == crashLandSceneID {
            gate = .crater
        } else {
            gate = .southPortal
        }
        return landingContract(sceneID: sceneID, gate: gate)
    }

    private static func landingContract(
        sceneID: String,
        gate: ArrivalGate
    ) -> World2PartyLandingContract {
        // Spawn only — no `approach` walk. POI taps / thumb picks move Abbie.
        switch gate {
        case .crater:
            return World2PartyLandingContract(
                landing: World2NormalizedPoint(x: 0.50, y: 0.58),
                approach: nil
            )
        case .southPortal:
            // Back-path pad on land scenes; south of crater path on Crash.
            let y = sceneID == crashLandSceneID ? 0.78 : 0.80
            return World2PartyLandingContract(
                landing: World2NormalizedPoint(x: 0.50, y: y),
                approach: nil
            )
        case .northPortal:
            let y = sceneID == crashLandSceneID ? 0.28 : 0.22
            return World2PartyLandingContract(
                landing: World2NormalizedPoint(x: 0.50, y: y),
                approach: nil
            )
        }
    }

    static func log(_ event: String, _ fields: [String: String] = [:]) {
        var payload = fields
        payload["edition"] = "peglin"
        World2Diagnostics.log("peglin.\(event)", payload)
    }
}
