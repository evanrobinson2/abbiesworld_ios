//
//  PlinkStandaloneApp.swift
//  abbies.world.ios
//
//  Standalone entry for Plink. Leave @main commented.
//

import SwiftUI

// @main
struct PlinkStandaloneApp: App {
    var body: some Scene {
        WindowGroup {
            PegBattleMinigameView()
                .ignoresSafeArea()
        }
    }
}
