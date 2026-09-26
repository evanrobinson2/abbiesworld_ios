import SwiftUI

/// Standalone Marble Voyage: Auth0 → (optional profile) → intro → voyage chart.
struct MarbleVoyageRootView: View {
    private enum Gate: Equatable {
        case auth
        case profile
        case intro
        case voyage
        case debugFight
    }

    private static let debugFightLaunchArgument = "-marbleVoyageDebugFight"

    @EnvironmentObject private var auth: AuthenticationService
    @State private var gate: Gate = .auth
    @State private var bootstrapReady = false
    @State private var fadeOpacity: Double = 1
    @State private var selectedPlayerID: String?

    private var wantsDebugFight: Bool {
        ProcessInfo.processInfo.arguments.contains(Self.debugFightLaunchArgument)
    }

    var body: some View {
        ZStack {
            switch gate {
            case .auth:
                AuthLoginView(auth: auth, voyageStyle: true)
                    .transition(.opacity)

            case .profile:
                HouseholdProfileSelectView(auth: auth) { playerId in
                    selectedPlayerID = playerId.rawValue
                    withAnimation(.easeInOut(duration: 0.35)) {
                        gate = .intro
                    }
                }
                .transition(.opacity)

            case .intro:
                BootstrapLoadingView(
                    progress: bootstrapReady ? 1 : 0.35,
                    isBootstrapReady: bootstrapReady,
                    onContinue: enterVoyage
                )
                .opacity(fadeOpacity)
                .transition(.opacity)

            case .voyage:
                MarbleVoyageHostView(
                    playerID: selectedPlayerID ?? auth.activeProfile?.playerId.rawValue,
                    isStandalone: true,
                    onExit: {}
                )
                .transition(.opacity)

            case .debugFight:
                PlinkBattleHostView(
                    title: "Debug Rescue",
                    enemyKind: .foxSpirit,
                    waveAttackerOverride: .raze,
                    focusCrewMember: .raze,
                    gangFightRole: .henchman,
                    sceneBackgroundAsset: "map.peglin.bramble",
                    playerID: selectedPlayerID ?? "automation",
                    onExit: {
                        gate = .voyage
                    },
                    autoStartFight: true
                )
                .transition(.opacity)
            }
        }
        .ignoresSafeArea()
        .accessibilityIdentifier("marbleVoyage.root")
        .task {
            await AssetBootstrapService.shared.bootstrap()
            bootstrapReady = true
        }
        .onAppear {
            resolveGate(animated: false)
        }
        .onChange(of: auth.isAuthenticated) { _, authed in
            if !authed {
                withAnimation(.easeInOut(duration: 0.35)) {
                    gate = .auth
                    selectedPlayerID = nil
                    fadeOpacity = 1
                }
            } else {
                resolveGate(animated: true)
            }
        }
        .onChange(of: auth.activeProfile?.id) { _, _ in
            if auth.isAuthenticated, auth.activeProfile != nil, gate == .profile {
                selectedPlayerID = auth.activeProfile?.playerId.rawValue
                withAnimation(.easeInOut(duration: 0.35)) {
                    gate = wantsDebugFight ? .debugFight : .intro
                }
            }
        }
    }

    private func resolveGate(animated: Bool) {
        let next: Gate
        if wantsDebugFight, auth.shouldSkipAuthForAutomation || auth.isAuthenticated {
            next = .debugFight
            selectedPlayerID = auth.activeProfile?.playerId.rawValue ?? "automation"
        } else if auth.shouldSkipAuthForAutomation {
            next = bootstrapReady ? (gate == .voyage ? .voyage : .intro) : .intro
            selectedPlayerID = auth.activeProfile?.playerId.rawValue ?? "automation"
        } else if !auth.isAuthenticated {
            next = .auth
        } else if auth.activeProfile == nil, !(auth.household?.profiles.isEmpty ?? true) {
            next = .profile
        } else if gate == .voyage {
            next = .voyage
        } else if gate == .debugFight {
            next = .debugFight
        } else {
            selectedPlayerID = auth.activeProfile?.playerId.rawValue ?? selectedPlayerID
            next = .intro
        }
        guard next != gate else { return }
        if animated {
            withAnimation(.easeInOut(duration: 0.35)) { gate = next }
        } else {
            gate = next
        }
    }

    private func enterVoyage() {
        MarbleVoyageAudio.modeSelect()
        MarbleVoyagePlayerStats.recordSessionStart(
            playerKey: MarbleVoyagePlayerStats.playerKey(auth: auth)
        )
        withAnimation(.easeInOut(duration: 0.85)) {
            fadeOpacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.75) {
            withAnimation(.easeInOut(duration: 0.55)) {
                gate = .voyage
                fadeOpacity = 1
            }
        }
    }
}
