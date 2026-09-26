import Foundation

/// Peglin Edition character / enemy presentation states.
/// Abbie portraits ship now; enemy sheets fill in as art drops.
enum PeglinCharacterState: String, CaseIterable, Identifiable, Sendable {
    case idle
    case happy
    case sneakyWink = "sneaky_wink"
    case hurt
    case defeated

    var id: String { rawValue }

    /// Catalog imageset for Abbie's elbow-height battle / HUD portrait.
    var abbiePortraitCatalogName: String {
        switch self {
        case .idle, .happy: return "world2_peglin_abbie_happy"
        case .sneakyWink: return "world2_peglin_abbie_sneaky_wink"
        case .hurt: return "world2_peglin_abbie_hurt"
        case .defeated: return "world2_peglin_abbie_hurt_angry"
        }
    }
}

enum PeglinAbbieArt {
    /// Full-body pixel Abbie for map walk + fight zones.
    static let mapCatalogName = "world2_peglin_abbie_map"

    /// Extra hurt variants kept for future beat scripting.
    static let hurtGrimCatalogName = "world2_peglin_abbie_hurt_grim"
    static let hurtAngryCatalogName = "world2_peglin_abbie_hurt_angry"
}

/// Hostage / rescue spirits (cage meter) — **not** wave attackers.
/// Wave foes that hurt Abbie live on `PlinkAttackerKind` (Caw Scout, beetle, toad, mantis).
enum PeglinEnemyKind: String, CaseIterable, Identifiable, Sendable {
    case brambleSpirit
    case foxSpirit
    case stagSpirit
    /// Colorful burrow fox — optional Fox alternate for later climb nodes.
    case burrowJackal
    /// Campaign finale — warped mirror of Abbie.
    case bizarroAbbie

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .brambleSpirit: return "Bramble Spirit"
        case .foxSpirit: return "Fox Spirit"
        case .stagSpirit: return "Stag Spirit"
        case .burrowJackal: return "Burrow Jackal"
        case .bizarroAbbie: return "Bizarro Abbie"
        }
    }

    /// Short kid-facing name.
    var shortName: String {
        switch self {
        case .brambleSpirit: return "Hare"
        case .foxSpirit: return "Fox"
        case .stagSpirit: return "Stag"
        case .burrowJackal: return "Jackal"
        case .bizarroAbbie: return "Bizarro"
        }
    }

    /// Semantic IDs for the Game Asset registry.
    var stateSemanticIDs: [String] {
        switch self {
        case .burrowJackal:
            // Hostage art ships as plink tokens (idle / happy / burrow / pounce).
            return [
                "token.plink.burrowJackal.idle",
                "token.plink.burrowJackal.happy",
                "token.plink.burrowJackal.burrow",
                "token.plink.burrowJackal.pounce",
            ]
        default:
            return PeglinCharacterState.allCases.map { "enemy.peglin.\(rawValue).\($0.rawValue)" }
        }
    }

    /// Bundled catalog imageset for a portrait state (nil if art not shipped).
    func portraitCatalogName(for state: PeglinCharacterState) -> String? {
        switch self {
        case .brambleSpirit:
            return "world2_peglin_bramble_\(state.rawValue)"
        case .foxSpirit:
            return "world2_peglin_fox_\(state.rawValue)"
        case .stagSpirit:
            return "world2_peglin_stag_\(state.rawValue)"
        case .burrowJackal:
            switch state {
            case .idle: return "world2_plink_burrowJackal_idle"
            case .happy: return "world2_plink_burrowJackal_happy"
            case .sneakyWink: return "world2_plink_burrowJackal_burrow"
            case .hurt: return "world2_plink_burrowJackal_pounce"
            case .defeated: return "world2_plink_burrowJackal_idle"
            }
        case .bizarroAbbie:
            // Reuses Abbie portraits; SwiftUI applies a distortion filter.
            return state.abbiePortraitCatalogName
        }
    }

    /// Kid-facing comic blurb for the versus splash.
    var versusBlurb: String {
        switch self {
        case .brambleSpirit: return "Caged clover-hare · crack the bars!"
        case .foxSpirit: return "Lantern-fox trapped · free the grove!"
        case .stagSpirit: return "Crystal stag caged · break the lock!"
        case .burrowJackal: return "Rainbow jackal boxed in · dig them free!"
        case .bizarroAbbie: return "Mirror Abbie locked in · don't trust the smile!"
        }
    }

    var isDistortedAbbie: Bool { self == .bizarroAbbie }

    /// Full-body figurine for the fight floor (in-game presence).
    var figurineCatalogName: String {
        switch self {
        case .brambleSpirit: return "world2_peglin_bramble_figurine"
        case .foxSpirit: return "world2_peglin_fox_figurine"
        case .stagSpirit: return "world2_peglin_stag_figurine"
        case .burrowJackal: return "world2_plink_burrowJackal_idle"
        case .bizarroAbbie: return PeglinAbbieArt.mapCatalogName
        }
    }

    /// Resolve guardian from Peglin scene / place ids.
    static func fromPeglin(sceneID: String?, placeID: String?) -> PeglinEnemyKind? {
        if placeID == PeglinEdition.brambleGuardianID { return .brambleSpirit }
        if placeID == PeglinEdition.foxGuardianID { return .foxSpirit }
        if placeID == PeglinEdition.stagGuardianID { return .stagSpirit }
        switch sceneID {
        case PeglinEdition.Land.bramble.sceneID: return .brambleSpirit
        case PeglinEdition.Land.foxLand.sceneID: return .foxSpirit
        case PeglinEdition.Land.stagLand.sceneID: return .stagSpirit
        default: return nil
        }
    }
}
