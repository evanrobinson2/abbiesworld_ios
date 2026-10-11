import SwiftUI

/// A quiet, one-tap shortcut alongside any world map.
struct World2MicroscopeWidget: View {
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            VStack(spacing: 6) {
                World2POIDrawnArtwork(style: .microscope)
                    .frame(width: 66, height: 74)
                    .accessibilityHidden(true)
                Text("Little\nWorld")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .multilineTextAlignment(.center)
                    .fixedSize()
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 10, weight: .bold))
                    .opacity(0.75)
            }
            .foregroundStyle(Color(red: 1, green: 0.95, blue: 0.79))
            .padding(.horizontal, 10)
            .padding(.vertical, 12)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
            .background(Color(red: 0.19, green: 0.25, blue: 0.15).opacity(0.72), in: RoundedRectangle(cornerRadius: 24))
            .overlay {
                RoundedRectangle(cornerRadius: 24)
                    .stroke(Color.yellow.opacity(0.32), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.18), radius: 12, y: 5)
            .contentShape(RoundedRectangle(cornerRadius: 24))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Open the microscope")
        .accessibilityHint("Visit the water bears in the little world")
        .accessibilityIdentifier("world2.microscope.widget")
    }
}
