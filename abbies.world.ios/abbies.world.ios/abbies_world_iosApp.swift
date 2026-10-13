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
    @State private var rooftopPreviewClosed = false

    /// Product default is household Abbie's World (Home + treehouses).
    /// Standalone Marble Voyage is opt-in for capture / store-demo launches.
    private var wantsStandaloneMarbleVoyage: Bool {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-launchMarbleVoyage") { return true }
        if args.contains("-launchWorld2MarbleVoyage") { return true }
        if MarbleVoyageCapture.isActive { return true }
        return false
    }

    private var wantsFairPuzzlePreview: Bool {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("-launchFairMarbles")
        #else
        false
        #endif
    }

    private var wantsRooftopPreview: Bool {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("-launchRooftop3D")
        #else
        false
        #endif
    }

    var body: some Scene {
        WindowGroup {
            if wantsRooftopPreview && !rooftopPreviewClosed {
                RooftopLookout3DView(onClose: { rooftopPreviewClosed = true })
            } else if wantsFairPuzzlePreview {
                FairMarblePuzzleView(onWin: {}, onClose: {})
            } else if wantsStandaloneMarbleVoyage {
                MarbleVoyageRootView()
                    .environmentObject(auth)
            } else {
                World2RootView()
                    .environmentObject(auth)
            }
        }
    }
}
