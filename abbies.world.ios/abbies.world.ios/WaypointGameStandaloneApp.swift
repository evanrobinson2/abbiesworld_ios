//
//  WaypointGameStandaloneApp.swift
//  My First Swift
//
//  Standalone entry point for Waypoint Navigation Minigame
//  This allows the game to run independently without the main app
//
//  NOTE: To run as standalone app:
//  1. Temporarily comment out @main in AbbiesWorldApp.swift
//  2. Uncomment @main below
//  3. Or create a separate Xcode target for the standalone game
//

import SwiftUI

// Uncomment the @main attribute below to run as standalone app
// (and comment out @main in AbbiesWorldApp.swift)
// @main
struct WaypointGameStandaloneApp: App {
    var body: some Scene {
        WindowGroup {
            WaypointNavigationView()
                .ignoresSafeArea()
        }
    }
}

