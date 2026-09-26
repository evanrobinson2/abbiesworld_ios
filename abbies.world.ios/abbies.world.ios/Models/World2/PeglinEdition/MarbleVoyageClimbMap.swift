import CoreGraphics
import Foundation

/// Tall climb-chart canvas for Marble Voyage.
/// **Blueprint schematic** (procedural grid) — painted island poster is retired for play.
enum MarbleVoyageClimbMap {
    static let semanticID = "map.marbleVoyage.climb"
    /// Legacy catalog id (unused while blueprint mode is on).
    static let catalogName = "world2_map_marbleVoyage_climb"
    /// Prefer procedural blueprint over missing/broken poster art.
    static let usesBlueprintPaper = true

    /// Fixed tall aspect for blueprint chart (~1∶2.8).
    static var aspectWidthOverHeight: CGFloat { 1.0 / 2.8 }

    static var aspectHeightOverWidth: CGFloat { 2.8 }

    /// Preferred chart width as a fraction of the viewport (small side letterbox only).
    static let targetWidthFraction: CGFloat = 0.88
    /// Hard cap so a tiny bit of sky can still frame the island.
    static let hardWidthCapFraction: CGFloat = 0.92
    /// Minimum scroll height in viewport-heights so the intro pan has room.
    static let minScrollScreens: CGFloat = 2.6

    /// Wide tall canvas: fill most landscape width; grow height so big fight tiles don't overlap.
    static func contentSize(in viewport: CGSize, columnCount: Int = 14) -> CGSize {
        guard viewport.width > 1, viewport.height > 1 else {
            return CGSize(width: 700, height: 2100)
        }

        var width = min(
            viewport.width * targetWidthFraction,
            viewport.width * hardWidthCapFraction
        )
        var height = width * aspectHeightOverWidth

        let tile = MarbleVoyageArt.chartTileSize(forViewportWidth: viewport.width)
        let step = tile * MarbleVoyageArt.chartTileVerticalSpacingFactor
        let tileFitHeight = step * CGFloat(max(columnCount, 1)) + tile * 2.2
        let minHeight = max(viewport.height * minScrollScreens, tileFitHeight, 1600)
        if height < minHeight {
            height = minHeight
            width = height * aspectWidthOverHeight
            let cap = viewport.width * hardWidthCapFraction
            if width > cap {
                width = cap
                height = max(width * aspectHeightOverWidth, tileFitHeight)
            }
        }

        return CGSize(width: width, height: height)
    }
}
