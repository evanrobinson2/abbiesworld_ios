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

    var body: some Scene {
        WindowGroup {
            World2RootView()
                .environmentObject(auth)
        }
    }
}
