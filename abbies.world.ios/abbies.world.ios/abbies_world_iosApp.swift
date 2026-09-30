//
//  abbies_world_iosApp.swift
//  abbies.world.ios
//
//  Created by Evan Robinson on 12/12/25.
//

import SwiftUI

@main
struct abbies_world_iosApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var auth = AuthenticationService.shared

    /// Household Abbie's World — pass `-launchWorld2` to restore full world boot.
    /// Default is Marble Voyage standalone (intro → voyage chart → battles).
    private var wantsHouseholdWorld: Bool {
        ProcessInfo.processInfo.arguments.contains("-launchWorld2")
            || ProcessInfo.processInfo.arguments.contains("-launchWorld2Home")
    }

    var body: some Scene {
        WindowGroup {
            if wantsHouseholdWorld {
                World2RootView()
                    .environmentObject(auth)
            } else {
                MarbleVoyageRootView()
                    .environmentObject(auth)
            }
        }
    }
}
