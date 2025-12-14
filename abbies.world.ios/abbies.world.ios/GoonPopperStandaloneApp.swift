//
//  GoonPopperStandaloneApp.swift
//  abbies.world.ios
//
//  Standalone entry point for Goon Popper Minigame
//  This allows the game to run independently without the main app
//
//  NOTE: To run as standalone app:
//  1. Temporarily comment out @main in abbies_world_iosApp.swift
//  2. Uncomment @main below
//  3. Or create a separate Xcode target for the standalone game
//

import SwiftUI

// Uncomment the @main attribute below to run as standalone app
// (and comment out @main in abbies_world_iosApp.swift)
// @main
struct GoonPopperStandaloneApp: App {
    var body: some Scene {
        WindowGroup {
            GoonPopperView()
                .ignoresSafeArea()
        }
    }
}
