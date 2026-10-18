import SwiftUI
import UIKit

/// Cosmetic configuration cannot change level bodies, joints, goals or input geometry.
struct Presentation {
    static let vanilla = Presentation()
    // Touch tutorial removes obsolete desktop-key hints; source geometry is unchanged.
    var spriteImages: [String: String] = [
        "data/gfx/level_01_background.xml": "level_01_background_touch.png",
        "data/gfx/collectable.xml": "collectable-remaster.png"
    ] // source sprite definition ID -> replacement filename
    var paper = UIColor(red: 247 / 255, green: 241 / 255, blue: 227 / 255, alpha: 1)
    var ink = UIColor(red: 0.15, green: 0.27, blue: 0.55, alpha: 1)
    var brushWidth: CGFloat = 3
    var brushFilename = "crayon_brush_03.png"
    var displayFont: String? = nil
    // A/V's licensed paper-pluck integration candidate. Board audition is ongoing;
    // this is not an accepted final selection. Rejected procedural cues are excluded.
    var cueFilenames = ["draw": "oga-crayon.wav", "erase": "oga-paper-rub.wav",
                        "tap": "oga-click.wav", "star": "oga-pluck.wav"]
}
