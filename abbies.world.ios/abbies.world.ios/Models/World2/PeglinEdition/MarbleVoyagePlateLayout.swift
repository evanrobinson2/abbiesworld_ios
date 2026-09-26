import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Hard layout contract for Marble Voyage plates — **never crop the painting**.
///
/// Plates are authored at **4:3 landscape** and always shown with `.scaledToFit`
/// (letterbox / pillarbox). `scaledToFill` + `.clipped()` is forbidden for these surfaces.
enum MarbleVoyagePlateLayout {
    /// Width ÷ height. Matches shipped plates (1024×771 ≈ 4:3).
    static let aspectWidthOverHeight: CGFloat = 4.0 / 3.0
    /// Relative tolerance for bundled / inbox plate pixel ratios.
    static let aspectTolerance: CGFloat = 0.03
    /// Preferred export size when generating new art.
    static let preferredPixelSize = CGSize(width: 2048, height: 1536)
    /// Catalog imagesets that must obey this contract (offline SoT).
    static let catalogPlateNames: [String] = [
        "world2_title_marbleVoyage",
        "world2_title_coralCliffs",
        "world2_title_pinkGrove",
        "world2_title_skyMeadow",
        "world2_map_peglin_crashLand",
        "world2_map_peglin_foxLand",
        "world2_map_peglin_bramble",
        "world2_map_peglin_stagLand",
    ]

    static func aspectRatio(of image: UIImage) -> CGFloat {
        let s = image.size
        guard s.height > 0 else { return 0 }
        return s.width / s.height
    }

    static func isAcceptableAspect(_ ratio: CGFloat) -> Bool {
        abs(ratio - aspectWidthOverHeight) <= aspectTolerance
    }

    static func isAcceptablePlate(_ image: UIImage) -> Bool {
        isAcceptableAspect(aspectRatio(of: image))
    }

    /// Largest 4:3 rectangle that fits inside `bounds` (letterbox / pillarbox).
    static func fitSize(in bounds: CGSize) -> CGSize {
        guard bounds.width > 1, bounds.height > 1 else { return bounds }
        let target = aspectWidthOverHeight
        let bound = bounds.width / bounds.height
        if bound > target {
            let h = bounds.height
            return CGSize(width: h * target, height: h)
        } else {
            let w = bounds.width
            return CGSize(width: w, height: w / target)
        }
    }
}

/// Full plate visible — fit inside the frame, atmospheric fill in the empty bands.
/// Use this for title / chart / fight backdrops. Do **not** reach for `scaledToFill`.
struct MarbleVoyageUnclippedPlate: View {
    var catalogName: String? = nil
    var semanticName: String = ""
    var fallbackIcon: String = "photo.artframe"
    var fallbackLabel: String = "Plate"
    var letterbox: Color = Color(red: 0.04, green: 0.07, blue: 0.14)

    var body: some View {
        GeometryReader { geo in
            ZStack {
                letterbox
                plateContent
                    .frame(width: geo.size.width, height: geo.size.height)
            }
        }
        .accessibilityHidden(true)
    }

    @ViewBuilder
    private var plateContent: some View {
        if let catalogName, UIImage(named: catalogName) != nil {
            Image(catalogName)
                .resizable()
                .scaledToFit()
        } else if !semanticName.isEmpty {
            World2SemanticImage(
                semanticName: semanticName,
                fallbackIcon: fallbackIcon,
                fallbackLabel: fallbackLabel
            )
            .scaledToFit()
        } else {
            Image(systemName: fallbackIcon)
                .resizable()
                .scaledToFit()
                .foregroundStyle(.white.opacity(0.45))
                .padding(80)
        }
    }
}
