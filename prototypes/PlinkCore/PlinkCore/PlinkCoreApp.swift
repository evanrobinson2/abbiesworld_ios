import SwiftUI

@main
struct PlinkCoreApp: App {
    var body: some Scene {
        WindowGroup {
            GameRootView()
                .ignoresSafeArea()
                .statusBarHidden(true)
        }
    }
}
