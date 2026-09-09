//
//  IncredimachineStandaloneApp.swift
//  abbies.world.ios
//
//  Standalone entry for Whizbang / Incredimachine.
//  Uncomment @main here and comment @main in abbies_world_iosApp.swift to run alone.
//

import SwiftUI

// @main
struct IncredimachineStandaloneApp: App {
    var body: some Scene {
        WindowGroup {
            IncredimachineView()
                .ignoresSafeArea()
        }
    }
}
