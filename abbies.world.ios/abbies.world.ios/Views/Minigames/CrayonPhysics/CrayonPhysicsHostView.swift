import SwiftUI
import CrayonPhysicsKit

/// Presented from the existing Abbie treehouse room. The presenting room retains
/// its state/camera and owns shared music pause/resume through the cover lifecycle.
struct CrayonPhysicsHostView: View {
    let onDismiss: () -> Void

    var body: some View {
        CrayonPhysicsExperience(context: .playroom, onExit: onDismiss)
            .interactiveDismissDisabled()
            .accessibilityIdentifier("world2.crayonPhysics.game")
    }
}

/// Functional native entry control pending final box artwork. It is an actual
/// room action, not a replacement room scene or an invented game location.
struct World2CrayonBoxButton: View {
    let onOpen: () -> Void
    var body: some View {
        Button(action: onOpen) {
            VStack(spacing: 4) {
                ZStack {
                    Image(systemName: "shippingbox.fill")
                        .font(.system(size: 52)).foregroundStyle(.orange)
                    Image(systemName: "pencil.tip.crop.circle.fill")
                        .font(.system(size: 28)).foregroundStyle(.blue, .white)
                        .offset(y: -6)
                }
                Text("Crayon box").font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(.primary)
            }
            .padding(12)
            .frame(minWidth: 100, minHeight: 100)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Open Crayon Physics")
        .accessibilityHint("Draw with crayons and guide the red ball to the stars")
        .accessibilityIdentifier("world2.crayonPhysics.box")
    }
}
