import CoreGraphics
import Foundation
import UIKit

/// Tall floating-island overland poster for Marble Voyage climb chart.
/// **Art leads** — chart canvas keeps the poster’s tall aspect (never stretch to landscape width).
enum MarbleVoyageClimbMap {
    static let semanticID = "map.marbleVoyage.climb"
    static let catalogName = "world2_map_marbleVoyage_climb"

    /// Width ÷ height of the authored poster (~344∶1024 ≈ 1∶3).
    static var aspectWidthOverHeight: CGFloat {
        guard let image = UIImage(named: catalogName), image.size.height > 0 else {
            return 344.0 / 1024.0
        }
        return image.size.width / image.size.height
    }

    static var aspectHeightOverWidth: CGFloat {
        let r = aspectWidthOverHeight
        return r > 0 ? 1 / r : 1024.0 / 344.0
    }

    /// ~3 landscape screens tall, width derived from poster aspect and capped to the viewport
    /// so the island doesn’t get fattened across a wide iPad.
    static func contentSize(in viewport: CGSize) -> CGSize {
        let targetHeight = max(viewport.height * 2.9, 1400)
        var width = targetHeight * aspectWidthOverHeight
        var height = targetHeight
        let maxWidth = max(viewport.width * 0.58, 320) // portrait-poster column on landscape
        if width > maxWidth {
            width = maxWidth
            height = width * aspectHeightOverWidth
        }
        // Still taller than one screen so the climb can pan.
        height = max(height, viewport.height * 2.35)
        width = height * aspectWidthOverHeight
        if width > viewport.width * 0.92 {
            width = viewport.width * 0.92
            height = width * aspectHeightOverWidth
        }
        return CGSize(width: width, height: height)
    }
}
