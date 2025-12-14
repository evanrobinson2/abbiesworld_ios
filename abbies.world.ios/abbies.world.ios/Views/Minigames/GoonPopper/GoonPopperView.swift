//
//  GoonPopperView.swift
//  abbies.world.ios
//
//  Created for Goon Popper Minigame
//

import SwiftUI

struct GoonPopperView: View {
    @StateObject private var viewModel = GoonPopperViewModel()
    
    // Optional callbacks for integration
    var onDismiss: (() -> Void)? = nil
    var onComplete: (() -> Void)? = nil
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(hex: "#1a0033") ?? Color(red: 0.1, green: 0, blue: 0.2),
                    Color(hex: "#000000") ?? .black
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Timer display
                if viewModel.gameState.gameStarted {
                    HStack {
                        Text("Time: \(viewModel.gameState.formattedTime)")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.black.opacity(0.6))
                            )
                        
                        Spacer()
                    }
                    .padding()
                }
                
                // Game canvas
                GoonPopperCanvas(viewModel: viewModel)
                    .frame(width: 1232, height: 928)
                    .border(Color.gray, width: 2)
                    .background(Color(hex: "#f0f0f0") ?? .gray)
                    .cornerRadius(5)
                
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
        }
        .onAppear {
            Task {
                await viewModel.loadAssets()
            }
        }
        .onDisappear {
            viewModel.cleanup()
        }
    }
}

// MARK: - Preview

#Preview {
    GoonPopperView()
}
