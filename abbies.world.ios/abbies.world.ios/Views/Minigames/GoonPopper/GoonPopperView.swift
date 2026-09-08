//
//  GoonPopperView.swift
//  abbies.world.ios
//
//  Created for Goon Popper Minigame
//

import SwiftUI
import Combine

struct GoonPopperView: View {
    @StateObject private var viewModel = GoonPopperViewModel()
    
    // Optional callbacks for integration
    var onDismiss: (() -> Void)? = nil
    var onComplete: (() -> Void)? = nil
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(hex: "#1a0033") ?? Color(red: 0.1, green: 0, blue: 0.2),
                    Color(hex: "#000000") ?? .black
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            GeometryReader { geometry in
                VStack(spacing: 10) {
                    HStack(spacing: 12) {
                        Text("Balloon Pop")
                            .font(.system(size: min(32, geometry.size.height * 0.05), weight: .heavy, design: .rounded))
                        
                        Spacer()
                        
                        Text("Score \(viewModel.gameState.score)")
                        Text("\(viewModel.gameState.goonsPopped) / \(viewModel.gameState.totalGoons)")
                        Text(viewModel.gameState.formattedTime)
                    }
                    .font(.system(size: min(24, geometry.size.height * 0.035), weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.55))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    
                    GoonPopperCanvas(viewModel: viewModel)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color(hex: "#f0f0f0") ?? .gray)
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .stroke(Color.white.opacity(0.75), lineWidth: 3)
                        )
                    
                    Text(viewModel.gameState.statusMessage)
                        .font(.system(size: min(22, geometry.size.height * 0.032), weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(maxWidth: .infinity)
                    }
                .padding(.horizontal, max(12, geometry.size.width * 0.02))
                .padding(.vertical, max(8, geometry.size.height * 0.015))
            }
            
            VStack {
                HStack {
                    Spacer()
                    CloseButton.white() {
                        onDismiss?()
                    }
                    .padding(18)
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
        .onReceive(viewModel.gameState.$gameOver.dropFirst()) { gameOver in
            if gameOver {
                onComplete?()
            }
        }
    }
}

// MARK: - Preview

#Preview {
    GoonPopperView()
}
