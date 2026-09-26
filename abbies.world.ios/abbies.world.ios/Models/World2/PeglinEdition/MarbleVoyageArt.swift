import Foundation

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
        case .foxSpirit: return "map.peglin.foxLand"
        case .stagSpirit: return "map.peglin.stagLand"
        case .bizarroAbbie: return "map.peglin.crashLand"
        case nil: return "map.peglin.crashLand"
        }
    }

    static func eventAccentIcon(_ kind: MarbleVoyageNodeKind) -> String {
        kind.systemIcon
    }

    /// Tint tokens for chart chips (UI only — plates stay semantic).
    static func chipTint(_ kind: MarbleVoyageNodeKind) -> (r: Double, g: Double, b: Double) {
        switch kind {
        case .start: return (0.35, 0.65, 0.95)
        case .fight: return (0.95, 0.45, 0.28)
        case .treasure: return (0.95, 0.75, 0.25)
        case .mystery: return (0.65, 0.45, 0.95)
        case .shrine: return (0.35, 0.85, 0.65)
        case .boss: return (0.95, 0.25, 0.45)
        }
    }
}
