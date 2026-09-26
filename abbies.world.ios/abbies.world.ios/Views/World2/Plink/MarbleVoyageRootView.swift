import SwiftUI

/// Standalone Marble Voyage: same Abbie's World intro, then fade into the voyage chart.
struct MarbleVoyageRootView: View {
    private enum Phase: Equatable {
        case intro
        case voyage
    }

    @State private var phase: Phase = .intro
    @State private var bootstrapReady = false
    @State private var fadeOpacity: Double = 1

    var body: some View {
        ZStack {
            MarbleVoyageHostView(isStandalone: true, onExit: {})
                .opacity(phase == .voyage ? 1 : 0)
                .allowsHitTesting(phase == .voyage)

            if phase == .intro {
                BootstrapLoadingView(
                    progress: bootstrapReady ? 1 : 0.35,
                    isBootstrapReady: bootstrapReady,
                    onContinue: enterVoyage
                )
                .opacity(fadeOpacity)
                .transition(.opacity)
                .zIndex(1)
            }
        }
        .ignoresSafeArea()
        .accessibilityIdentifier("marbleVoyage.root")
        .task {
            await AssetBootstrapService.shared.bootstrap()
            bootstrapReady = true
        }
    }

    private func enterVoyage() {
        MarbleVoyageAudio.modeSelect()
        withAnimation(.easeInOut(duration: 0.85)) {
            fadeOpacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.75) {
            withAnimation(.easeInOut(duration: 0.55)) {
                phase = .voyage
            }
        }
    }
}
