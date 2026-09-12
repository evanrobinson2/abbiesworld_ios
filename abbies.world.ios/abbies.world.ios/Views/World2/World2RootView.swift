//
//  World2RootView.swift
//  abbies.world.ios
//
//  Root view for Abbie's World 2 game shell.
//

import SwiftUI

struct World2RootView: View {
    @StateObject private var viewModel = World2ViewModel()
    
    var body: some View {
        ZStack {
            switch viewModel.currentScreen {
            case .loading:
                BootstrapLoadingView(progress: viewModel.bootstrapProgress)
                
            case .playerSelect:
                PlayerSelectView(onSelect: { playerId in
                    viewModel.selectPlayer(playerId)
                })
                
            case .worldMap:
                WorldMapView(viewModel: viewModel)
                
            case .poiInterior(let poiId):
                POIInteriorView(
                    poiId: poiId,
                    viewModel: viewModel,
                    onExit: { viewModel.exitPOI() }
                )
                
            case .cardFactory:
                World2CardFactoryView(
                    viewModel: viewModel,
                    onExit: { viewModel.exitPOI() }
                )
                
            case .cardVault:
                World2CardVaultView(
                    viewModel: viewModel,
                    onExit: { viewModel.exitPOI() }
                )
                
            case .playerHome:
                World2PlayerHomeView(
                    viewModel: viewModel,
                    onExit: { viewModel.exitPOI() }
                )
                
            case .minigame(let poiId, let minigameType):
                MinigameHostView(
                    poiId: poiId,
                    minigameType: minigameType,
                    viewModel: viewModel,
                    onComplete: { rewards, score in
                        viewModel.completeMinigame(poiId: poiId, rewards: rewards, score: score)
                    },
                    onExit: { viewModel.exitPOI() }
                )
            }
            
            if viewModel.isTransitioning {
                Color.black
                    .ignoresSafeArea()
                    .transition(.opacity)
            }
            
            if let toast = viewModel.toastMessage {
                VStack {
                    Spacer()
                    Text(toast)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(
                            Capsule()
                                .fill(Color.black.opacity(0.8))
                        )
                        .padding(.bottom, 100)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: viewModel.currentScreen)
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: viewModel.toastMessage)
        .task {
            await viewModel.startGame()
        }
    }
}

struct BootstrapLoadingView: View {
    let progress: Double
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#1a1a2e") ?? .black, Color(hex: "#16213e") ?? .black],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 40) {
                Text("✨ ABBIE'S WORLD ✨")
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                
                VStack(spacing: 16) {
                    ProgressView(value: progress)
                        .progressViewStyle(LinearProgressViewStyle(tint: .cyan))
                        .frame(width: 250)
                    
                    Text(loadingMessage)
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.7))
                }
                
                Image(systemName: "sparkles")
                    .font(.system(size: 48))
                    .foregroundColor(.yellow)
                    .symbolEffect(.pulse, options: .repeating)
            }
        }
    }
    
    private var loadingMessage: String {
        if progress < 0.2 {
            return "Waking up the magic..."
        } else if progress < 0.5 {
            return "Loading wonderful things..."
        } else if progress < 0.8 {
            return "Almost ready..."
        } else {
            return "Here we go!"
        }
    }
}

struct PlayerSelectView: View {
    let onSelect: (PlayerId) -> Void
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#667eea") ?? .purple, Color(hex: "#764ba2") ?? .purple],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 40) {
                Text("Who's Playing?")
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                
                HStack(spacing: 40) {
                    PlayerSelectButton(
                        playerId: .abbie,
                        color: Color(hex: "#FF69B4") ?? .pink,
                        onSelect: onSelect
                    )
                    
                    PlayerSelectButton(
                        playerId: .ani,
                        color: Color(hex: "#9370DB") ?? .purple,
                        onSelect: onSelect
                    )
                }
            }
        }
    }
}

struct PlayerSelectButton: View {
    let playerId: PlayerId
    let color: Color
    let onSelect: (PlayerId) -> Void
    
    @State private var isPressed = false
    
    var body: some View {
        Button(action: { onSelect(playerId) }) {
            VStack(spacing: 16) {
                Circle()
                    .fill(color.gradient)
                    .frame(width: 120, height: 120)
                    .overlay(
                        Text(playerId == .abbie ? "👧" : "👦")
                            .font(.system(size: 60))
                    )
                    .shadow(color: color.opacity(0.5), radius: 10, y: 5)
                
                Text(playerId.displayName)
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }
        }
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}

struct POIInteriorView: View {
    let poiId: String
    let viewModel: World2ViewModel
    let onExit: () -> Void
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.9)
                .ignoresSafeArea()
            
            VStack {
                HStack {
                    Button(action: onExit) {
                        Image(systemName: "arrow.left.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white)
                    }
                    Spacer()
                }
                .padding()
                
                Spacer()
                
                if let poi = viewModel.pois[poiId] {
                    VStack(spacing: 20) {
                        Image(systemName: poi.icon ?? "building.2.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.white)
                        
                        Text(poi.name)
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        
                        Text(poi.description)
                            .font(.system(size: 18, design: .rounded))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                
                Spacer()
            }
        }
    }
}

struct MinigameHostView: View {
    let poiId: String
    let minigameType: String
    let viewModel: World2ViewModel
    let onComplete: ([RewardConfiguration.Reward], Int) -> Void
    let onExit: () -> Void
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 30) {
                HStack {
                    Button(action: onExit) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white)
                    }
                    Spacer()
                }
                .padding()
                
                Spacer()
                
                VStack(spacing: 20) {
                    Image(systemName: "gamecontroller.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.cyan)
                    
                    Text("Minigame: \(minigameType.capitalized)")
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("Coming Soon!")
                        .font(.system(size: 16, design: .rounded))
                        .foregroundColor(.white.opacity(0.6))
                    
                    Button(action: {
                        if let poi = viewModel.pois[poiId],
                           let config = poi.rewardConfiguration {
                            onComplete(config.baseRewards, 100)
                        } else {
                            onComplete([], 0)
                        }
                    }) {
                        Text("Complete (Demo)")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.white)
                            .padding(.horizontal, 32)
                            .padding(.vertical, 16)
                            .background(Color.green.gradient)
                            .cornerRadius(25)
                    }
                    .padding(.top, 20)
                }
                
                Spacer()
            }
        }
    }
}




#Preview {
    World2RootView()
}
