//
//  MarbleVoyageStandaloneApp.swift
//  abbies.world.ios
//
//  Standalone entry is now the default via abbies_world_iosApp → MarbleVoyageRootView.
//  Keep this file for a future dedicated App Store target.
//

import SwiftUI

// @main — use abbies_world_iosApp (defaults to Marble Voyage).
struct MarbleVoyageStandaloneApp: App {
    @StateObject private var auth = AuthenticationService.shared

    var body: some Scene {
        WindowGroup {
            MarbleVoyageRootView()
                .environmentObject(auth)
                .ignoresSafeArea()
        }
    }
}
