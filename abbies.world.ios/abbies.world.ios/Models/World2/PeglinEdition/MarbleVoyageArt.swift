import Foundation
import CoreGraphics

/// Semantic plates + SF Symbol accents for Marble Voyage (registry-backed).
/// Plate pixel contract: `MarbleVoyagePlateLayout` (4:3, Fit only — never Fill/crop).
enum MarbleVoyageArt {
    /// Title menu plate (not intro). Bundled catalog: `world2_title_marbleVoyage` (+ unlockable alternates).
    static let titleBackdrop = "title.marbleVoyage"
    static let titleCatalogName = "world2_title_marbleVoyage"
    /// Concept title alternates (also Trophy Center unlocks).
    static let alternateTitleCatalogNames = [
        "world2_title_coralCliffs",
        "world2_title_pinkGrove",
        "world2_title_skyMeadow",
    ]
    static let chartBackdrop = "map.marbleVoyage.climb"
    /// Catalog fallback for the tall climb poster (scrolls with the chart).
    static let climbChartCatalogName = MarbleVoyageClimbMap.catalogName
    /// Brand wordmark / tile — swap when new media lands.
    static let logoAsset = "logo.abbiesWorld"
    static let productTitle = "Marble Voyage"
    static let brandLine = "Abbie's World"
    static let fullTitle = "Abbie's World · Marble Voyage"

    static func fightPlate(enemy: PeglinEnemyKind?) -> String {
        switch enemy {
        case .brambleSpirit: return "map.peglin.bramble"
        case .foxSpirit, .burrowJackal: return "map.peglin.foxLand"
        case .stagSpirit: return "map.peglin.stagLand"
        case .bizarroAbbie: return "map.peglin.crashLand"
        case nil: return "map.peglin.crashLand"
        }
    }

    // MARK: - Rescue framing (hostage ≠ wave attacker)

    /// Hostage / cage target on a fight node (Fox, Jackal, Hare, Stag…).
    /// Wave attackers that rattle Abbie are `PlinkAttackerKind`.
    ///
    /// Rosters (see `PlinkAttackerKind` header):
    /// - **Badguy gang** (primary): Raze → Vix → Morrow → Nib
    /// - **Forest fauna** (biome variants): L1 cawScout; L2 beetle / toad / mantis
    /// - Hostage is never a gang member — use `foxSpirit` / `burrowJackal`
    static func waveAttackers(forClimbStage stage: Int) -> [PlinkAttackerKind] {
        // Primary path: cycle the gang. Forest biome override can swap roster later.
        _ = stage
        return PlinkAttackerKind.badguyGang
    }

    static func defaultWaveAttacker(forClimbStage stage: Int) -> PlinkAttackerKind {
        PlinkAttackerKind.forClimbStage(stage, roster: .badguyGang)
    }

    static func eventAccentIcon(_ kind: MarbleVoyageNodeKind) -> String {
        kind.systemIcon
    }

    /// Shared chart tile fill — dark rose, thematic for every node.
    static let chartTileRose: (r: Double, g: Double, b: Double) = (0.58, 0.22, 0.38)

    /// @available(*, deprecated, message: "Chart tiles share chartTileRose; icons carry meaning.")
    static func chipTint(_ kind: MarbleVoyageNodeKind) -> (r: Double, g: Double, b: Double) {
        _ = kind
        return chartTileRose
    }

    /// Base map tile edge (pt). Next-level tiles pulse in place (same size).
    static let chartTileSize: CGFloat = 130
    static let chartTileIconSize: CGFloat = 54
    static let chartTileCorner: CGFloat = 22
    static let chartTileLabelWidth: CGFloat = 140
}
