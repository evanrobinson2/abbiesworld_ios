//
//  GamesDialogView.swift
//  My First Swift
//
//  Dialog showing available games/minigames
//

import SwiftUI

struct GamesDialogView: View {
    @Binding var showWaypointGame: Bool
    // Memory Game and Goon Popper temporarily disabled
    // @Binding var showMemoryGame: Bool
    // @Binding var showGoonPopper: Bool
    var onDismiss: () -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Games & Minigames")
                    .font(.title)
                    .fontWeight(.bold)
                    .padding(.top)
                
                // Grid of game icons - 1 column for the 1 active game
                LazyVGrid(columns: [
                    GridItem(.flexible())
                ], spacing: 20) {
                    // Waypoint Navigation Game
                    GameIconButton(
                        icon: "location.fill",
                        title: "Waypoint Navigation",
                        color: .cyan
                    ) {
                        showWaypointGame = true
                        onDismiss()
                    }
                    
                    // Memory Game - temporarily disabled
                    // GameIconButton(
                    //     icon: "square.grid.2x2.fill",
                    //     title: "Memory Game",
                    //     color: .purple
                    // ) {
                    //     showMemoryGame = true
                    //     onDismiss()
                    // }
                    
                    // Goon Popper Game - temporarily disabled
                    // GameIconButton(
                    //     icon: "hand.tap.fill",
                    //     title: "Goon Popper",
                    //     color: .orange
                    // ) {
                    //     showGoonPopper = true
                    //     onDismiss()
                    // }
                }
                .padding()
                
                Spacer()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        onDismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white.opacity(0.8))
                    }
                }
            }
        }
    }
}

struct GameIconButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 40))
                    .foregroundColor(.white)
                    .frame(width: 80, height: 80)
                    .background(
                        LinearGradient(
                            colors: [color, color.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: color.opacity(0.5), radius: 8, x: 0, y: 4)
                
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(width: 100)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    GamesDialogView(
        showWaypointGame: .constant(false),
        // showMemoryGame: .constant(false),
        // showGoonPopper: .constant(false),
        onDismiss: {}
    )
}

