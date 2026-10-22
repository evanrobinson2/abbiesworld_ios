//
//  MarbleVoyageStandaloneApp.swift
//  abbies.world.ios
//
//  Dedicated App Store target entry. Household app defaults to World2RootView;
//  pass `-launchMarbleVoyage` for standalone voyage from the main target.
//

import SwiftUI

// @main — use abbies_world_iosApp (household Home by default).
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
