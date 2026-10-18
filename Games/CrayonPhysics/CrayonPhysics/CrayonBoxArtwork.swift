import SwiftUI

/// Shared bundle-backed artwork; the host supplies its button, label and action.
public struct CrayonBoxArtwork: View {
    public init() {}

    public var body: some View {
        Image("crayon-box-closed", bundle: GameResources.bundle)
            .resizable()
            .scaledToFit()
            .accessibilityHidden(true)
    }
}
