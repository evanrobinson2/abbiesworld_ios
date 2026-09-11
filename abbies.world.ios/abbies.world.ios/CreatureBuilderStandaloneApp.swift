//
//  CreatureBuilderStandaloneApp.swift
//  abbies.world.ios
//
//  Standalone entry point for testing Creature Card Builder.
//
//  Launch args:
//    -launchCreatureBuilder    Launch directly into Creature Builder
//    -autoPlayCreatureBuilder  Auto-create a creature on launch (for testing)
//

import SwiftUI

@main
struct CreatureBuilderStandaloneApp: App {
    @State private var showCreatureBuilder = false
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(red: 0.1, green: 0.1, blue: 0.15)
                    .ignoresSafeArea()
                
                if shouldLaunchDirectly {
                    CreatureBuilderView()
                } else {
                    launchScreen
                }
            }
            .onAppear {
                if shouldLaunchDirectly {
                    showCreatureBuilder = true
                }
            }
        }
    }
    
    private var shouldLaunchDirectly: Bool {
        ProcessInfo.processInfo.arguments.contains("-launchCreatureBuilder")
    }
    
    private var launchScreen: some View {
        VStack(spacing: 32) {
            Text("✨🔮✨")
                .font(.system(size: 80))
            
            Text("Creature Card Builder")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("Standalone Test App")
                .font(.headline)
                .foregroundColor(.white.opacity(0.6))
            
            Button {
                showCreatureBuilder = true
            } label: {
                Text("Enter Creature Lab")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 40)
                    .padding(.vertical, 16)
                    .background(
                        LinearGradient(
                            colors: [.purple, .pink],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(Capsule())
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Launch Arguments:")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
                
                Text("-launchCreatureBuilder")
                    .font(.caption)
                    .foregroundColor(.green.opacity(0.7))
                
                Text("-autoPlayCreatureBuilder")
                    .font(.caption)
                    .foregroundColor(.green.opacity(0.7))
            }
            .padding()
            .background(Color.white.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .fullScreenCover(isPresented: $showCreatureBuilder) {
            CreatureBuilderView()
        }
    }
}
