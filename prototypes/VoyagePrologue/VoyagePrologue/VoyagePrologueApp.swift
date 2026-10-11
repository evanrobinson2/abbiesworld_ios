import SwiftUI

@main
struct VoyagePrologueApp: App {
    @State private var finished = false
    var body: some Scene {
        WindowGroup {
            if finished {
                ZStack {
                    Color(red: 0.04, green: 0.12, blue: 0.15).ignoresSafeArea()
                    VStack(spacing: 24) {
                        Text("THE ADVENTURE STARTS HERE").font(.largeTitle.bold())
                        Text("Prologue complete • game handoff preview")
                        Button("Replay the prologue") { finished = false }.buttonStyle(.borderedProminent)
                    }.foregroundStyle(.white)
                }
            } else {
                PrologueView { finished = true }
            }
        }
    }
}
