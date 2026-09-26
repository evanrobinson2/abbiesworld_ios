import SwiftUI

/// Circular kid-obvious power icon (not a poker chip).
struct PlinkPowerUpChip: View {
    let kind: PlinkPowerUp
    var size: CGFloat = 64

    var body: some View {
        Group {
            if UIImage(named: kind.catalogIconName) != nil {
                Image(kind.catalogIconName)
                    .resizable()
                    .scaledToFit()
            } else {
                World2SemanticImage(
                    semanticName: kind.chipAssetID,
                    fallbackIcon: kind.systemImage,
                    fallbackLabel: kind.title
                )
                .scaledToFit()
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .accessibilityHidden(true)
    }
}
