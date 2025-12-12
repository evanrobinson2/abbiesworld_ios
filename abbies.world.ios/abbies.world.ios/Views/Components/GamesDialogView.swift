//
//  GamesDialogView.swift
//  My First Swift
//
//  Dialog showing available games/minigames
//

import SwiftUI

struct GamesDialogView: View {
    @Binding var showWaypointGame: Bool
    var onDismiss: () -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Games & Minigames")
                    .font(.title)
                    .fontWeight(.bold)
                    .padding(.top)
                
                // Grid of game icons
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
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
                    
                    // Placeholder game 1
                    GameIconButton(
                        icon: "puzzlepiece.fill",
                        title: "Coming Soon",
                        color: .purple
                    ) {
                        // Placeholder action
                    }
                    
                    // Placeholder game 2
                    GameIconButton(
                        icon: "star.fill",
                        title: "Coming Soon",
                        color: .orange
                    ) {
                        // Placeholder action
                    }
                    
                    // Placeholder game 3
                    GameIconButton(
                        icon: "sparkles",
                        title: "Coming Soon",
                        color: .pink
                    ) {
                        // Placeholder action
                    }
                    
                    // Placeholder game 4
                    GameIconButton(
                        icon: "heart.fill",
                        title: "Coming Soon",
                        color: .red
                    ) {
                        // Placeholder action
                    }
                    
                    // Placeholder game 5
                    GameIconButton(
                        icon: "moon.fill",
                        title: "Coming Soon",
                        color: .indigo
                    ) {
                        // Placeholder action
                    }
                }
                .padding()
                
                Spacer()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        onDismiss()
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
    GamesDialogView(showWaypointGame: .constant(false), onDismiss: {})
}

