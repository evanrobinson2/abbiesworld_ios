import SwiftUI

/// Bottom-right Abbie's World brand mark for Marble Voyage chrome.
/// Crystal orb logo (`world2_logo_abbiesWorld`) with transparent background.
struct AbbiesWorldLogoWatermark: View {
    var size: CGFloat = 88
    var opacity: Double = 0.55

    var body: some View {
        Group {
            if UIImage(named: "world2_logo_abbiesWorld") != nil {
                Image("world2_logo_abbiesWorld")
                    .resizable()
                    .scaledToFit()
            } else {
                World2SemanticImage(
                    semanticName: MarbleVoyageArt.logoAsset,
                    fallbackIcon: "circle.hexagongrid.fill",
                    fallbackLabel: "Abbie's World"
                )
                .scaledToFit()
            }
        }
        .frame(width: size, height: size)
        .shadow(color: Color(red: 0.2, green: 0.7, blue: 1).opacity(0.55), radius: 14, y: 0)
        .opacity(opacity)
        .accessibilityHidden(true)
        .allowsHitTesting(false)
    }
}

extension View {
    /// Pins the Abbie's World logo watermark to the bottom-trailing corner.
    func abbiesWorldLogoWatermark(
        size: CGFloat = 88,
        opacity: Double = 0.55,
        padding: CGFloat = 18
    ) -> some View {
        overlay(alignment: .bottomTrailing) {
            AbbiesWorldLogoWatermark(size: size, opacity: opacity)
                .padding(.trailing, padding)
                .padding(.bottom, padding)
        }
    }
}
