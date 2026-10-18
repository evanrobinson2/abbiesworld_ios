import SwiftUI
import UIKit

/// Cosmetic configuration cannot change level bodies, joints, goals or input geometry.
struct Presentation {
    static let vanilla = Presentation()
    // The catalog maps every surface to our custom production assets.
    var spriteImages: [String: String] = [:]
    var paper = UIColor(red: 247 / 255, green: 241 / 255, blue: 227 / 255, alpha: 1)
    var ink = UIColor(red: 0.15, green: 0.27, blue: 0.55, alpha: 1)
    var brushWidth: CGFloat = 3
    var brushFilename = "custom-brush.png"
    var displayFont: String? = nil
    // A/V's licensed paper-pluck integration candidate. Board audition is ongoing;
    // this is not an accepted final selection. Rejected procedural cues are excluded.
    var cueFilenames = ["draw": "oga-crayon.wav", "erase": "oga-paper-rub.wav",
                        "tap": "oga-click.wav", "star": "oga-pluck.wav"]
}
