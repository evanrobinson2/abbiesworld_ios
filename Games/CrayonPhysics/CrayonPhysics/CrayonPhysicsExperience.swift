import SwiftUI
import Foundation

private final class CrayonResourceAnchor: NSObject {}
enum GameResources {
    static let bundle = Bundle(for: CrayonResourceAnchor.self)
}

public enum CrayonPhysicsLaunchContext: Equatable {
    case standalone
    case playroom
}

/// Shared game surface for standalone delivery and the real host crayon-box route.
/// The host owns presentation/dismissal and restores its camera/input/audio in onExit.
@MainActor
public struct CrayonPhysicsExperience: View {
    @StateObject private var session: GameSession
    @Environment(\.scenePhase) private var phase

    public init(context: CrayonPhysicsLaunchContext, onExit: @escaping () -> Void) {
        _session = StateObject(wrappedValue: GameSession(
            exitLabel: context == .playroom ? "Back to Playroom" : "Close Game",
            managesAudioSession: context == .standalone,
            onExit: onExit
        ))
    }

    public var body: some View {
        GameView(session: session)
            .onAppear { session.openBox() }
            .onDisappear { session.suspendForHostDismissal() }
            .onChange(of: phase) { _, value in
                if value != .active { session.backgrounded() } else { session.foregrounded() }
            }
    }
}
