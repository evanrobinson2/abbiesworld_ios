//
//  WaypointNavigationView.swift
//  My First Swift
//
//  Created for Waypoint Navigation Minigame
//

import SwiftUI

struct WaypointNavigationView: View {
    @StateObject private var viewModel = WaypointGameViewModel()
    
    // Optional callbacks for integration
    var onDismiss: (() -> Void)? = nil
    var onComplete: (() -> Void)? = nil
    
    @State private var showVictory = false
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color(hex: "#000000") ?? .black, Color(hex: "#1a0033") ?? Color(red: 0.1, green: 0, blue: 0.2)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Destination Banner
                if let bannerImage = viewModel.gameState.destinationBannerImage {
                    ZStack {
                        Image(uiImage: bannerImage)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(height: 150)
                            .overlay(
                                RoundedRectangle(cornerRadius: 5)
                                    .stroke(Color(hex: "#00ff00") ?? .green, lineWidth: 2)
                            )
                        
                        Text("DESTINATION: MOONBASE")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.black)
                            .padding(.horizontal, 15)
                            .padding(.vertical, 5)
                            .background((Color(hex: "#00ff00") ?? .green).opacity(0.8))
                            .cornerRadius(5)
                            .offset(y: -60)
                    }
                    .frame(height: 150)
                    .padding(.bottom, 20)
                } else {
                    // Placeholder while loading
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 150)
                        .overlay(
                            Text("Loading destination...")
                                .foregroundColor(.gray)
                        )
                        .padding(.bottom, 20)
                }
                
                // Instructions
                Text("Discover the safe waypoints to chart the path home!\nSafe waypoints must be found IN ORDER. Bad waypoints can be clicked anytime.")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#00ffff") ?? .cyan)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                    .padding(.bottom, 15)
                
                // Game Canvas
                WaypointGameCanvas(viewModel: viewModel)
                    .frame(width: 860, height: 500)
                    .border(Color.gray, width: 2)
                    .background(
                        LinearGradient(
                            colors: [Color(hex: "#2a2a2a") ?? Color(red: 0.16, green: 0.16, blue: 0.16), Color(hex: "#1a1a1a") ?? Color(red: 0.1, green: 0.1, blue: 0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(5)
                    .shake(offset: viewModel.gameState.screenShake ? 5 : 0)
                
                // Status Text
                Text(viewModel.gameState.statusMessage)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color(hex: "#ffff00") ?? .yellow)
                    .frame(minHeight: 25)
                    .padding(.top, 10)
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.black.opacity(0.8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color(hex: "#00ffff") ?? .cyan, lineWidth: 3)
                    )
                    .shadow(color: (Color(hex: "#00ffff") ?? .cyan).opacity(0.5), radius: 30)
            )
            .padding()
            
            // Dismiss button (top right)
            VStack {
                HStack {
                    Spacer()
                    Button(action: {
                        onDismiss?()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .padding()
                }
                Spacer()
            }
        }
        .onAppear {
            Task {
                await viewModel.loadAssets()
            }
        }
        .onDisappear {
            viewModel.cleanup()
        }
        .onChange(of: viewModel.gameState.gameComplete) { oldValue, newValue in
            if newValue {
                showVictory = true
                onComplete?()
            }
        }
        .fullScreenCover(isPresented: $showVictory) {
            VictorySequenceView(viewModel: viewModel, onDismiss: {
                showVictory = false
                onDismiss?()
            })
        }
    }
}

// MARK: - Screen Shake Modifier

struct ShakeEffect: GeometryEffect {
    var offset: CGFloat
    
    var animatableData: CGFloat {
        get { offset }
        set { offset = newValue }
    }
    
    func effectValue(size: CGSize) -> ProjectionTransform {
        let translation = CGPoint(
            x: offset * (offset > 0 ? -1 : 1),
            y: 0
        )
        return ProjectionTransform(CGAffineTransform(translationX: translation.x, y: translation.y))
    }
}

extension View {
    func shake(offset: CGFloat) -> some View {
        modifier(ShakeEffect(offset: offset))
    }
}

// MARK: - Preview

#Preview {
    WaypointNavigationView()
}

