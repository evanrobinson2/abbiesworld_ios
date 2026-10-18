import SwiftUI
import UIKit

/// Shared bundle-backed artwork; the host supplies its button, label and action.
public struct CrayonBoxArtwork: View {
    public init() {}

    static func loadImage() -> UIImage? {
        guard let url = GameResources.bundle.url(forResource: "crayon-box-closed.png", withExtension: nil) else { return nil }
        return UIImage(contentsOfFile: url.path)
    }

    public var body: some View {
        Group {
            if let image = Self.loadImage() {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "shippingbox.fill")
                    .resizable()
                    .scaledToFit()
                    .foregroundStyle(.orange)
            }
        }
        .accessibilityHidden(true)
    }
}
