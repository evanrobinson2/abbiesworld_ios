//
//  MemoryGameView.swift
//  abbies.world.ios
//
//  Created for Memory/Concentration Minigame
//

import SwiftUI

struct MemoryGameView: View {
    @StateObject private var viewModel = MemoryGameViewModel()
    
    // Optional callbacks for integration
    var onDismiss: (() -> Void)? = nil
    var onComplete: (() -> Void)? = nil
    
    @State private var showDifficultySelector = true
    @State private var showVictory = false
    
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
            
            if showDifficultySelector && !viewModel.gameState.isLoading {
                // Difficulty selection screen
                difficultySelectionView
            } else if viewModel.gameState.isLoading {
                // Loading screen
                loadingView
            } else if viewModel.gameState.errorMessage != nil {
                // Error screen
                errorView
            } else if showVictory {
                // Victory screen
                victoryView
            } else {
                // Game board
                gameBoardView
            }
        }
        .onAppear {
            // Game will start when difficulty is selected
        }
    }
    
    // MARK: - Difficulty Selection
    
    private var difficultySelectionView: some View {
        VStack(spacing: 30) {
            Text("Memory Game")
                .font(.system(size: 48, weight: .bold))
                .foregroundColor(.white)
            
            Text("Match pairs of your created images!")
                .font(.system(size: 18))
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            VStack(spacing: 20) {
                ForEach(GameDifficulty.allCases, id: \.self) { difficulty in
                    Button(action: {
                        Task {
                            await viewModel.startNewGame(difficulty: difficulty)
                            showDifficultySelector = false
                        }
                    }) {
                        VStack(spacing: 8) {
                            Text(difficulty.rawValue)
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundColor(.white)
                            
                            Text("\(difficulty.pairCount) pairs")
                                .font(.system(size: 14))
                                .foregroundColor(.gray)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(hex: "#2a1a3d") ?? Color(red: 0.16, green: 0.1, blue: 0.24))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color(hex: "#00ffff") ?? .cyan, lineWidth: 2)
                                )
                        )
                    }
                }
            }
            .padding(.horizontal, 40)
            
            Button(action: {
                onDismiss?()
            }) {
                Text("Back")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 30)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.gray.opacity(0.3))
                    )
            }
            .padding(.top, 20)
        }
    }
    
    // MARK: - Loading View
    
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.cyan)
            
            Text("Loading your images...")
                .font(.system(size: 18))
                .foregroundColor(.gray)
        }
    }
    
    // MARK: - Error View
    
    private var errorView: some View {
        VStack(spacing: 30) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 60))
                .foregroundColor(.yellow)
            
            Text("Oops!")
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(.white)
            
            if let errorMessage = viewModel.gameState.errorMessage {
                Text(errorMessage)
                    .font(.system(size: 16))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            
            VStack(spacing: 15) {
                Button(action: {
                    showDifficultySelector = true
                    viewModel.resetGame()
                }) {
                    Text("Try Again")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color(hex: "#00ffff") ?? .cyan)
                        )
                }
                
                Button(action: {
                    onDismiss?()
                }) {
                    Text("Back")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color.gray.opacity(0.3))
                        )
                }
            }
            .padding(.horizontal, 40)
            .padding(.top, 20)
        }
    }
    
    // MARK: - Game Board
    
    private var gameBoardView: some View {
        VStack(spacing: 20) {
            // Header with stats
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Moves: \(viewModel.gameState.moves)")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                    
                    Text("Pairs: \(viewModel.gameState.matchedPairs)/\(viewModel.gameState.totalPairs)")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Score")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                    
                    Text("\(viewModel.gameState.score)")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(Color(hex: "#00ff00") ?? .green)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 10)
            
            // Card grid
            let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: viewModel.gameState.difficulty.gridColumns)
            
            ScrollView {
                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(viewModel.gameState.cards) { card in
                        MemoryCardView(card: card) {
                            viewModel.flipCard(cardId: card.id)
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
            
            // Action buttons
            HStack(spacing: 15) {
                Button(action: {
                    showDifficultySelector = true
                    viewModel.resetGame()
                }) {
                    Text("New Game")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.gray.opacity(0.3))
                        )
                }
                
                Button(action: {
                    onDismiss?()
                }) {
                    Text("Exit")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.gray.opacity(0.3))
                        )
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 10)
        }
        .onChange(of: viewModel.gameState.gameComplete) { oldValue, newValue in
            if newValue {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    showVictory = true
                }
            }
        }
    }
    
    // MARK: - Victory View
    
    private var victoryView: some View {
        VStack(spacing: 30) {
            Image(systemName: "star.fill")
                .font(.system(size: 80))
                .foregroundColor(Color(hex: "#ffff00") ?? .yellow)
            
            Text("Congratulations!")
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(.white)
            
            Text("You matched all pairs!")
                .font(.system(size: 18))
                .foregroundColor(.gray)
            
            VStack(spacing: 15) {
                StatRow(label: "Moves", value: "\(viewModel.gameState.moves)")
                StatRow(label: "Score", value: "\(viewModel.gameState.score)")
                StatRow(label: "Difficulty", value: viewModel.gameState.difficulty.rawValue)
            }
            .padding(.vertical, 20)
            .padding(.horizontal, 40)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(hex: "#2a1a3d") ?? Color(red: 0.16, green: 0.1, blue: 0.24))
            )
            
            VStack(spacing: 15) {
                Button(action: {
                    showVictory = false
                    showDifficultySelector = true
                    viewModel.resetGame()
                }) {
                    Text("Play Again")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color(hex: "#00ffff") ?? .cyan)
                        )
                }
                
                Button(action: {
                    onComplete?()
                    onDismiss?()
                }) {
                    Text("Done")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color.gray.opacity(0.3))
                        )
                }
            }
            .padding(.horizontal, 40)
        }
    }
}

// MARK: - Memory Card View

struct MemoryCardView: View {
    let card: MemoryCard
    let onTap: () -> Void
    
    @State private var isFlipped = false
    
    var body: some View {
        Button(action: {
            onTap()
        }) {
            ZStack {
                // Card back (hidden state)
                if card.state == .hidden {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(hex: "#2a1a3d") ?? Color(red: 0.16, green: 0.1, blue: 0.24),
                                    Color(hex: "#1a0033") ?? Color(red: 0.1, green: 0, blue: 0.2)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color(hex: "#00ffff") ?? .cyan, lineWidth: 2)
                        )
                        .overlay(
                            Image(systemName: "questionmark")
                                .font(.system(size: 30))
                                .foregroundColor(Color(hex: "#00ffff") ?? .cyan)
                        )
                }
                
                // Card front (revealed or matched)
                if card.state == .revealed || card.state == .matched {
                    if let image = card.image {
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 120, height: 120)
                            .clipped()
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(
                                        card.state == .matched
                                            ? (Color(hex: "#00ff00") ?? .green)
                                            : (Color(hex: "#ffff00") ?? .yellow),
                                        lineWidth: 3
                                    )
                            )
                    } else {
                        // Placeholder while image loads
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.gray.opacity(0.3))
                            .overlay(
                                ProgressView()
                                    .tint(.cyan)
                            )
                    }
                }
            }
            .frame(width: 120, height: 120)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: card.state)
        }
        .disabled(card.state == .matched || card.state == .revealed)
    }
}

// MARK: - Stat Row

struct StatRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 16))
                .foregroundColor(.gray)
            
            Spacer()
            
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Preview

#Preview {
    MemoryGameView()
}
