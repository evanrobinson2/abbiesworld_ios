import Foundation
#if canImport(UIKit)
import UIKit
#endif

// MARK: - Framing
//
// **Hostage** (`PeglinEnemyKind`): Fox spirit / Burrow Jackal / Hare / Stag —
// cage meter to free. Never use a gang member as the hostage portrait.
//
// **Badguy gang** (primary rescue-battle antagonists — cycle in attacker chrome):
//   Raze (bruiser) → Vix (lieutenant) → Morrow (quartermaster) → Nib (hanger-on)
//
// **Forest fauna** (biome variants): cawScout (grove L1), thornbackBeetle /
// briarToad / thornhornMantis (heavier forest L2). Secondary until a biome flag
// selects them. Lineup-sheet leftovers (`coyoteBruiser` / `gangFox` / …) remain
// as optional alternate art ids, not the named crew.

/// Roster family for rescue-wave attackers (who hurt Abbie).
enum PlinkAttackerRoster: String, CaseIterable, Sendable {
    /// Punk/junkyard anthropomorphic gang — default rescue-battle foes.
    case badguyGang
    /// Forest critters — alternate biome waves.
    case forestFauna
}

/// Climb band for forest fauna only (gang cycles independently).
enum PlinkAttackerWaveLevel: Int, CaseIterable, Sendable {
    case one = 1
    case two = 2
}

/// Wave attackers that hurt Abbie while she frees a hostage.
/// Distinct from `PeglinEnemyKind` (cage / rescue target).
enum PlinkAttackerKind: String, CaseIterable, Identifiable, Sendable {
    // Named badguy gang (primary — kid-facing SoT)
    case raze
    case vix
    case morrow
    case nib
    // Lineup-sheet alternates (optional; not default cycle)
    case coyoteBruiser
    case gangFox
    case hyena
    case lizard
    case vulture
    // Forest fauna (biome variants)
    case cawScout
    case thornbackBeetle
    case briarToad
    case thornhornMantis

    var id: String { rawValue }

    var roster: PlinkAttackerRoster {
        switch self {
        case .raze, .vix, .morrow, .nib,
             .coyoteBruiser, .gangFox, .hyena, .lizard, .vulture:
            return .badguyGang
        case .cawScout, .thornbackBeetle, .briarToad, .thornhornMantis:
            return .forestFauna
        }
    }

    /// Named crew used for climb-stage cycling (not lineup leftovers).
    var isNamedCrew: Bool {
        switch self {
        case .raze, .vix, .morrow, .nib: return true
        default: return false
        }
    }

    var displayName: String {
        switch self {
        case .raze: return "Raze"
        case .vix: return "Vix"
        case .morrow: return "Morrow"
        case .nib: return "Nib"
        case .coyoteBruiser: return "Spike Coyote"
        case .gangFox: return "Gang Fox"
        case .hyena: return "Hyena"
        case .lizard: return "Lizard"
        case .vulture: return "Vulture"
        case .cawScout: return "Caw Scout"
        case .thornbackBeetle: return "Thornback Beetle"
        case .briarToad: return "Briar Toad"
        case .thornhornMantis: return "Thornhorn Mantis"
        }
    }

    var shortName: String {
        switch self {
        case .raze: return "Raze"
        case .vix: return "Vix"
        case .morrow: return "Morrow"
        case .nib: return "Nib"
        case .coyoteBruiser: return "Coyote"
        case .gangFox: return "Punk"
        case .hyena: return "Hyena"
        case .lizard: return "Liz"
        case .vulture: return "Vulture"
        case .cawScout: return "Caw"
        case .thornbackBeetle: return "Beetle"
        case .briarToad: return "Toad"
        case .thornhornMantis: return "Mantis"
        }
    }

    /// Flying foes skip the approach — they bite every turn from any lane.
    var isFlying: Bool {
        switch self {
        case .cawScout, .vulture: return true
        default: return false
        }
    }

    /// Kid-facing role blurb for chrome / feed.
    var roleBlurb: String {
        switch self {
        case .raze: return "Bruiser"
        case .vix: return "Lieutenant"
        case .morrow: return "Quartermaster"
        case .nib: return "Hanger-on"
        default: return "Wave"
        }
    }

    /// Forest climb band only; gang members return nil.
    var forestWaveLevel: PlinkAttackerWaveLevel? {
        switch self {
        case .cawScout: return .one
        case .thornbackBeetle, .briarToad, .thornhornMantis: return .two
        default: return nil
        }
    }

    /// Default attacker for rescue fights — Raze leads the crew.
    static let defaultWave: PlinkAttackerKind = .raze

    /// Named crew order for climb cycling / chrome.
    static let namedCrew: [PlinkAttackerKind] = [.raze, .vix, .morrow, .nib]

    static var badguyGang: [PlinkAttackerKind] { namedCrew }

    static var forestFauna: [PlinkAttackerKind] {
        allCases.filter { $0.roster == .forestFauna }
    }

    static func forestAttackers(for level: PlinkAttackerWaveLevel) -> [PlinkAttackerKind] {
        forestFauna.filter { $0.forestWaveLevel == level }
    }

    /// Cycle the named badguy gang for climb stages (primary). Forest biome override later.
    static func forClimbStage(_ stage: Int, roster: PlinkAttackerRoster = .badguyGang) -> PlinkAttackerKind {
        switch roster {
        case .badguyGang:
            let gang = namedCrew
            let idx = max(0, stage - 1) % gang.count
            return gang[idx]
        case .forestFauna:
            let level: PlinkAttackerWaveLevel = stage <= 1 ? .one : .two
            let pool = forestAttackers(for: level)
            guard !pool.isEmpty else { return .cawScout }
            if stage <= 1 { return .cawScout }
            let idx = (max(2, stage) - 2) % pool.count
            return pool[idx]
        }
    }
}

/// Poses for attacker chrome / tokens.
enum PlinkAttackerPose: String, CaseIterable, Identifiable, Sendable {
    case idle
    case attack
    case defeated

    var id: String { rawValue }
}

extension PlinkAttackerKind {
    /// Square / bust UI portrait when present (`world2_plink_gang_vix_portrait`).
    /// In-game portraits: GenerateImage with solid `#00FF66` BG, then
    /// `scripts/chroma_key_gang_portrait.py` (never cream/light flood).
    var portraitCatalogName: String {
        switch roster {
        case .badguyGang:
            return "world2_plink_gang_\(rawValue)_portrait"
        case .forestFauna:
            return "world2_plink_\(rawValue)_idle"
        }
    }

    /// Full/waist catalog when present (`world2_plink_gang_vix` or `…_idle`).
    var bodyCatalogName: String {
        switch roster {
        case .badguyGang:
            return "world2_plink_gang_\(rawValue)"
        case .forestFauna:
            return "world2_plink_\(rawValue)_idle"
        }
    }

    /// Catalog imageset for a pose.
    /// Named crew: prefer `world2_plink_gang_<id>` / `_portrait`; lineup leftovers use `_idle`.
    func catalogName(for pose: PlinkAttackerPose) -> String {
        switch roster {
        case .badguyGang:
            if isNamedCrew {
                // Portraits are square busts — use for idle chrome; attack falls back.
                if pose == .idle { return bodyCatalogName }
                return "world2_plink_gang_\(rawValue)_\(pose.rawValue)"
            }
            return "world2_plink_gang_\(rawValue)_\(pose.rawValue)"
        case .forestFauna:
            return "world2_plink_\(rawValue)_\(pose.rawValue)"
        }
    }

    /// Semantic SoT: `token.plink.gang.vix.portrait` / `token.plink.gang.vix` / forest tokens.
    func semanticID(for pose: PlinkAttackerPose) -> String {
        switch roster {
        case .badguyGang:
            if isNamedCrew && pose == .idle {
                return "token.plink.gang.\(rawValue)"
            }
            return "token.plink.gang.\(rawValue).\(pose.rawValue)"
        case .forestFauna:
            return "token.plink.\(rawValue).\(pose.rawValue)"
        }
    }

    var portraitSemanticID: String { "token.plink.gang.\(rawValue).portrait" }

    var stateSemanticIDs: [String] {
        if isNamedCrew {
            return [semanticID(for: .idle), portraitSemanticID]
        }
        let poses: [PlinkAttackerPose] = roster == .badguyGang ? [.idle] : PlinkAttackerPose.allCases
        return poses.map { semanticID(for: $0) }
    }

    /// Prefer square `_portrait` for fight chrome when bundled; else body / idle / pose.
    func catalogImage(for pose: PlinkAttackerPose) -> UIImage? {
        if pose == .idle || pose == .attack {
            if let portrait = UIImage(named: portraitCatalogName) { return portrait }
        }
        if let img = UIImage(named: catalogName(for: pose)) { return img }
        if let body = UIImage(named: bodyCatalogName) { return body }
        if pose != .idle {
            if let portrait = UIImage(named: portraitCatalogName) { return portrait }
            return UIImage(named: catalogName(for: .idle))
        }
        // Lineup leftover idle naming
        return UIImage(named: "world2_plink_gang_\(rawValue)_idle")
    }
}
