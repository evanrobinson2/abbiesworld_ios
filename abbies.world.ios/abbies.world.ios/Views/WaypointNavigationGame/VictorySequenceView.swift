//
//  VictorySequenceView.swift
//  My First Swift
//
//  Created for Waypoint Navigation Minigame
//

import SwiftUI

struct VictorySequenceView: View {
    @ObservedObject var viewModel: WaypointGameViewModel
    var onDismiss: (() -> Void)?
    
    @State private var currentPhase: VictoryPhase = .initialImage
    @State private var showBanner = true
    @State private var showCutscene = false
    @State private var showPolaroids = false
    @State private var showGridView = false
    @State private var showFinalCover = false
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.95)
                .ignoresSafeArea()
            
            switch currentPhase {
            case .initialImage:
                initialVictoryView
            case .cutscene:
                cutsceneView
            case .polaroidEntrance, .carousel:
                polaroidCarouselView
            case .gridView:
                gridView
            case .finalCover:
                finalCoverView
            }
        }
        .onAppear {
            startVictorySequence()
        }
    }
    
    // MARK: - Phase Views
    
    private var initialVictoryView: some View {
        VStack {
            if showBanner {
                Text("YOU SAVED STAR CHILD!")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundColor(Color(hex: "#00ff00") ?? .green)
                    .shadow(color: Color(hex: "#00ff00") ?? .green, radius: 20)
                    .scaleEffect(showBanner ? 1.05 : 1.0)
                    .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: showBanner)
                    .padding(.top, 50)
            }
            
            Spacer()
            
            if let victoryImage = viewModel.gameState.victoryImage {
                Image(uiImage: victoryImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: 600, maxHeight: 500)
                    .border(Color(hex: "#00ffff") ?? .cyan, width: 5)
                    .cornerRadius(10)
                    .shadow(color: (Color(hex: "#00ffff") ?? .cyan).opacity(0.8), radius: 50)
            }
            
            Spacer()
        }
    }
    
    private var cutsceneView: some View {
        ZStack {
            if let cutsceneImage = viewModel.gameState.cutsceneImage {
                Image(uiImage: cutsceneImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            
            VStack {
                Spacer()
                Text("Back at base...")
                    .font(.system(size: 36, weight: .bold))
                    .italic()
                    .foregroundColor(Color(hex: "#00ffff") ?? .cyan)
                    .shadow(color: Color(hex: "#00ffff") ?? .cyan, radius: 20)
                    .padding(.bottom, 100)
            }
        }
        .opacity(showCutscene ? 1 : 0)
    }
    
    private var polaroidCarouselView: some View {
        VStack {
            if showBanner {
                Text("YOU SAVED STAR CHILD!")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundColor(Color(hex: "#00ff00") ?? .green)
                    .padding(.top, 50)
            }
            
            Spacer()
            
            // Polaroid carousel will be implemented here
            Text("Polaroid Carousel (Coming Soon)")
                .foregroundColor(.white)
            
            Spacer()
            
            Button("Close") {
                onDismiss?()
            }
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(8)
            .padding(.bottom, 50)
        }
    }
    
    private var gridView: some View {
        VStack {
            Text("All Memories from the Adventure ✨")
                .font(.title)
                .foregroundColor(.white)
                .padding()
            
            // Grid will be implemented here
            Text("Grid View (Coming Soon)")
                .foregroundColor(.white)
            
            Spacer()
        }
    }
    
    private var finalCoverView: some View {
        VStack {
            if let coverImage = viewModel.gameState.coverImage {
                Image(uiImage: coverImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding()
            }
            
            Button("Close") {
                onDismiss?()
            }
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(8)
            .padding(.bottom, 50)
        }
    }
    
    // MARK: - Sequence Control
    
    private func startVictorySequence() {
        // Phase 1: Initial image (4 seconds)
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
            currentPhase = .cutscene
            showBanner = false
            showCutscene = true
            
            // Phase 2: Cutscene (4 seconds)
            DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
                showCutscene = false
                currentPhase = .polaroidEntrance
                showPolaroids = true
                
                // Phase 3: Polaroid entrance and carousel
                // This will be implemented later
                
                // For now, show final cover after a delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                    currentPhase = .finalCover
                    showFinalCover = true
                }
            }
        }
    }
}

