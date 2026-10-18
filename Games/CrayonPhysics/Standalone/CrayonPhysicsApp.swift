import SwiftUI
import CrayonPhysicsKit

@main
struct CrayonPhysicsApp: App {
    var body: some Scene {
        WindowGroup { StandaloneLauncher() }
    }
}

struct StandaloneLauncher: View {
    @State private var showingGame = true
    var body: some View {
        if showingGame {
            CrayonPhysicsExperience(context: .standalone) { showingGame = false }
        } else {
            VStack(spacing: 24) {
                Text("Crayon Physics").font(.largeTitle)
                Button("Play") { showingGame = true }
                    .font(.title2).padding().buttonStyle(.borderedProminent)
            }
        }
    }
}
