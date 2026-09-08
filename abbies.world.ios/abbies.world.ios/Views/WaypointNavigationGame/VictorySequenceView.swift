//
//  VictorySequenceView.swift
//  My First Swift
//
//  Created for Waypoint Navigation Minigame
//

import SwiftUI

struct VictorySequenceView: View {
    @ObservedObject var viewModel: WaypointGameViewModel
    @ObservedObject private var gameState: WaypointGameState // Direct observation of nested ObservableObject
    var onDismiss: (() -> Void)?
    
    @State private var currentPhase: VictoryPhase = .initialImage
    
    init(viewModel: WaypointGameViewModel, onDismiss: (() -> Void)? = nil) {
        self.viewModel = viewModel
        self.onDismiss = onDismiss
        // Observe gameState directly to detect changes to nested @Published properties
        _gameState = ObservedObject(wrappedValue: viewModel.gameState)
    }
    @State private var showBanner = true
    @State private var showCutscene = false
    @State private var showPolaroids = false
    @State private var showFinalCover = false
    @State private var bannerOpacity: Double = 1.0
    @State private var cutsceneOpacity: Double = 0.0
    @State private var polaroidEntranceStates: [Bool] = Array(repeating: false, count: 10)
    @State private var autoAdvanceTimer: Timer?
    @State private var gridViewTimer: Timer?
    @State private var showViewAllButton = false
    @State private var carouselHintOpacity: Double = 0.0
    
    // Track async operations for cleanup (using a class to allow mutation in struct)
    private class AsyncOperationTracker {
        var operations: [DispatchWorkItem] = []
    }
    private let asyncTracker = AsyncOperationTracker()
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.95)
                .ignoresSafeArea()
            
            // Initial victory image
            if currentPhase == .initialImage {
                initialVictoryView
            }
            
            // Cutscene (overlays on top when active)
            cutsceneView
                .opacity(cutsceneOpacity)
                .allowsHitTesting(cutsceneOpacity > 0)
            
            // Polaroid carousel
            if currentPhase == .polaroidEntrance || currentPhase == .carousel {
                polaroidCarouselView
            }
            
            // Grid view
            if currentPhase == .gridView {
                gridView
            }
            
            // Final cover
            if currentPhase == .finalCover {
                finalCoverView
            }
            
            // Dismiss button - always visible in top right
            // User can dismiss at any time (even during initial image if they want to skip)
            VStack {
                HStack {
                    Spacer()
                    CloseButton.white() {
                        print("❌ VictorySequenceView: User dismissed victory sequence")
                        onDismiss?()
                    }
                    .padding()
                }
                Spacer()
            }
        }
        .onAppear {
            startVictorySequence()
        }
        .onDisappear {
            // Cleanup all timers and async operations when view disappears
            cleanup()
        }
        .onChange(of: gameState.gameComplete) { oldValue, newValue in
            // If game completion is reset (shouldn't happen, but safety check)
            if !newValue && currentPhase != .finalCover {
                cleanup()
            }
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
                    .scaleEffect(1.05)
                    .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: showBanner)
                    .padding(.top, 50)
            }
            
            Spacer()
            
            if let victoryImage = gameState.victoryImage {
                Image(uiImage: victoryImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: 600, maxHeight: 500)
                    .border(Color(hex: "#00ffff") ?? .cyan, width: 5)
                    .cornerRadius(10)
                    .shadow(color: (Color(hex: "#00ffff") ?? .cyan).opacity(0.8), radius: 50)
            } else {
                // Show placeholder if image not loaded
                Text("Loading victory image...")
                    .foregroundColor(.gray)
                    .padding()
            }
            
            Spacer()
        }
    }
    
    private var cutsceneView: some View {
        ZStack {
            Color.black.opacity(0.95)
                .ignoresSafeArea()
            
            if let cutsceneImage = gameState.cutsceneImage {
                Image(uiImage: cutsceneImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                // Show placeholder if cutscene not loaded
                VStack {
                    Text("Loading cutscene...")
                        .foregroundColor(.gray)
                        .font(.title)
                }
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
    }
    
    private var polaroidCarouselView: some View {
        VStack(spacing: 0) {
            // Banner (fades out during cutscene, back in for carousel)
            if showBanner {
                Text("YOU SAVED STAR CHILD!")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundColor(Color(hex: "#00ff00") ?? .green)
                    .shadow(color: Color(hex: "#00ff00") ?? .green, radius: 20)
                    .scaleEffect(1.05)
                    .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: showBanner)
                    .padding(.top, 50)
                    .opacity(bannerOpacity)
            }
            
            // Polaroid Grid - Simple tile layout
            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 15), count: 3), spacing: 15) {
                    ForEach(0..<gameState.polaroidImages.count, id: \.self) { index in
                        if gameState.polaroidImages.indices.contains(index) {
                            Image(uiImage: gameState.polaroidImages[index])
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 180, height: 220)
                                .border(index == gameState.currentPolaroidIndex ? Color.yellow : Color.white, width: index == gameState.currentPolaroidIndex ? 4 : 2)
                                .background(Color.white)
                                .opacity(polaroidEntranceStates[index] ? 1.0 : 0.0)
                                .animation(.easeIn(duration: 0.3), value: polaroidEntranceStates[index])
                                .onTapGesture {
                                    print("🔍 [TAP] User tapped polaroid \(index), currentIndex: \(gameState.currentPolaroidIndex)")
                                    if index != gameState.currentPolaroidIndex {
                                        print("🔍 [TAP] Setting currentPolaroidIndex to \(index)")
                                        gameState.currentPolaroidIndex = index
                                    } else {
                                        print("🔍 [TAP] Tapped current polaroid, advancing")
                                        advancePolaroid()
                                    }
                                }
                    }
                }
            }
                .padding(.horizontal)
                .padding(.top, 20)
                .padding(.bottom, 60) // Extra bottom padding to prevent cutoff
            }
            .frame(maxWidth: 600)
            .onChange(of: gameState.currentPolaroidIndex) { oldValue, newValue in
                print("🔍 [GRID] currentPolaroidIndex changed from \(oldValue) to \(newValue)")
            }
            
            Spacer(minLength: 20)
            
            // Carousel hint and View All button
            VStack(spacing: 12) {
                if carouselHintOpacity > 0 {
                    Text("Click to rotate through memories or wait for auto-play")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#00ffff") ?? .cyan)
                        .opacity(0.8)
                        .opacity(carouselHintOpacity)
                }
                
                if showViewAllButton {
                    Button(action: {
                        showGridView()
                    }) {
                        Text("View All")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.black)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(Color(hex: "#00ffff") ?? .cyan)
                            .cornerRadius(8)
                    }
                }
            }
            .padding(.bottom, 50)
        }
    }
    
    private var gridView: some View {
        VStack {
            Text("All Memories from the Adventure ✨")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.white)
                .padding(.top, 50)
            
            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 20), count: 5), spacing: 20) {
                    ForEach(0..<gameState.polaroidImages.count, id: \.self) { index in
                        if gameState.polaroidImages.indices.contains(index) {
                            Image(uiImage: gameState.polaroidImages[index])
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 200, height: 250)
                                .border(Color.white, width: 8)
                                .background(Color.white)
                                .padding(.bottom, 40) // Polaroid frame effect
                        }
                    }
                }
                .padding()
            }
            
            Spacer()
        }
    }
    
    private var finalCoverView: some View {
        ZStack {
            if let coverImage = gameState.coverImage {
                Image(uiImage: coverImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding()
                    .opacity(showFinalCover ? 1 : 0)
                    .animation(.easeIn(duration: 3), value: showFinalCover)
            }
            // Note: Dismiss button is now always visible (handled in main body)
        }
    }
    
    
    // MARK: - Sequence Control
    
    private func startVictorySequence() {
        print("🎉 VictorySequenceView: Starting victory sequence")
        print("   Victory image loaded: \(viewModel.gameState.victoryImage != nil)")
        print("   Cutscene image loaded: \(viewModel.gameState.cutsceneImage != nil)")
        print("   Polaroid images loaded: \(viewModel.gameState.polaroidImages.count)")
        
        // Clear any existing operations
        cancelAllAsyncOperations()
        
        // Phase 1: Initial image (4 seconds)
        let initialWorkItem = DispatchWorkItem {
            // Check if view is still active before executing
            guard self.currentPhase == .initialImage else { return }
            print("🎉 VictorySequenceView: Transitioning to cutscene")
            self.transitionToCutscene()
        }
        asyncTracker.operations.append(initialWorkItem)
        DispatchQueue.main.asyncAfter(deadline: .now() + 4, execute: initialWorkItem)
    }
    
    private func transitionToCutscene() {
        print("🎬 [CUTSCENE] Transitioning to cutscene phase")
        print("🎬 [CUTSCENE] Cutscene image loaded: \(viewModel.gameState.cutsceneImage != nil)")
        
        // Set phase to cutscene FIRST so subsequent guards pass
        currentPhase = .cutscene
        showBanner = false
        
        // Small delay before showing cutscene (like HTML's 50ms)
        let fadeWorkItem = DispatchWorkItem {
            // Check if view is still active before executing
            guard self.currentPhase == .cutscene || self.currentPhase == .initialImage else { return }
            // Fade in cutscene
            withAnimation(.easeIn(duration: 1.5)) {
                self.cutsceneOpacity = 1.0
            }
            print("🎬 [CUTSCENE] Cutscene opacity set to 1.0")
        }
        asyncTracker.operations.append(fadeWorkItem)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05, execute: fadeWorkItem)
        
        // Phase 2: Cutscene (4 seconds)
        let transitionWorkItem = DispatchWorkItem {
            // Check if view is still active before executing
            guard self.currentPhase == .cutscene else { return }
            print("🎬 [CUTSCENE] Cutscene phase complete, transitioning to polaroids")
            self.transitionToPolaroids()
        }
        asyncTracker.operations.append(transitionWorkItem)
        DispatchQueue.main.asyncAfter(deadline: .now() + 4, execute: transitionWorkItem)
    }
    
    private func transitionToPolaroids() {
        print("🎉 VictorySequenceView: Transitioning to polaroids")
        
        // Fade out cutscene
        withAnimation(.easeOut(duration: 1.5)) {
            cutsceneOpacity = 0.0
        }
        
        // Set phase BEFORE scheduling work item so view can render correctly
        // The work item will still guard check, but phase is set for view rendering
        let polaroidWorkItem = DispatchWorkItem {
            // Check if view is still active before executing
            guard self.currentPhase == .cutscene || self.currentPhase == .polaroidEntrance else { return }
            self.showBanner = true
            self.bannerOpacity = 1.0
            
            // Start victory music
            self.viewModel.audioService.startVictoryMusic()
            
            // Start polaroid entrance sequence
            self.startPolaroidEntrance()
        }
        asyncTracker.operations.append(polaroidWorkItem)
        
        // Set phase immediately so view can start rendering polaroidCarouselView
        currentPhase = .polaroidEntrance
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5, execute: polaroidWorkItem)
    }
    
    private func startPolaroidEntrance() {
        let polaroidCount = gameState.polaroidImages.count
        print("🎉 VictorySequenceView: Starting polaroid entrance with \(polaroidCount) polaroids")
        
        if polaroidCount == 0 {
            print("⚠️ VictorySequenceView: No polaroid images loaded, skipping to carousel")
            currentPhase = .carousel
            showCarouselHint()
            return
        }
        
        // Clear any existing operations
        cancelAllAsyncOperations()
        
        // Each polaroid appears 6.2s after the previous (5s pause + 1.2s animation)
        for index in 0..<polaroidCount {
            let delay = Double(index) * 6.2
            let workItem = DispatchWorkItem {
                // Check if view is still active before executing
                guard self.currentPhase == .polaroidEntrance || self.currentPhase == .carousel else { return }
                print("🎉 VictorySequenceView: Showing polaroid \(index + 1)/\(polaroidCount)")
                withAnimation(.spring(response: 1.2, dampingFraction: 0.6)) {
                    self.polaroidEntranceStates[index] = true
                }
            }
            asyncTracker.operations.append(workItem)
            DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
        }
        
        // After all polaroids have entered, enable carousel
        let totalEntranceTime = Double(polaroidCount) * 6.2 + 1.2
        let carouselWorkItem = DispatchWorkItem {
            // Check if view is still active before executing
            guard self.currentPhase == .polaroidEntrance || self.currentPhase == .carousel else { return }
            print("🎉 VictorySequenceView: All polaroids entered, starting carousel")
            self.currentPhase = .carousel
            self.startAutoAdvance()
            self.showCarouselHint()
        }
        asyncTracker.operations.append(carouselWorkItem)
        DispatchQueue.main.asyncAfter(deadline: .now() + totalEntranceTime, execute: carouselWorkItem)
    }
    
    private func cancelAllAsyncOperations() {
        for workItem in asyncTracker.operations {
            workItem.cancel()
        }
        asyncTracker.operations.removeAll()
    }
    
    private func startAutoAdvance() {
        autoAdvanceTimer?.invalidate()
        autoAdvanceTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
            guard !self.gameState.isGridView else {
                self.autoAdvanceTimer?.invalidate()
                return
            }
            self.advancePolaroid()
        }
        
        // Auto-show grid view after 2 full cycles
        let cycleTime = Double(gameState.polaroidImages.count) * 5.0
        gridViewTimer = Timer.scheduledTimer(withTimeInterval: cycleTime * 2, repeats: false) { _ in
            guard !self.gameState.isGridView else { return }
            self.showGridView()
        }
    }
    
    private func showCarouselHint() {
        withAnimation(.easeIn(duration: 0.5)) {
            carouselHintOpacity = 1.0
        }
    }
    
    private func advancePolaroid() {
        let oldIndex = gameState.currentPolaroidIndex
        let newIndex = (gameState.currentPolaroidIndex + 1) % gameState.polaroidImages.count
        print("🔍 [ADVANCE] Advancing from \(oldIndex) to \(newIndex) (total: \(gameState.polaroidImages.count))")
        gameState.currentPolaroidIndex = newIndex
        print("🔍 [ADVANCE] currentPolaroidIndex is now: \(gameState.currentPolaroidIndex)")
        gameState.polaroidClicks += 1
        
        // Reset auto-advance timer
        autoAdvanceTimer?.invalidate()
        startAutoAdvance()
        
        // Show "View All" button after 3 clicks or after viewing all photos once
        if gameState.polaroidClicks >= 3 || (gameState.currentPolaroidIndex == 0 && gameState.polaroidClicks > 0) {
            if !showViewAllButton {
                withAnimation {
                    showViewAllButton = true
                }
            }
        }
    }
    
    private func showGridView() {
        autoAdvanceTimer?.invalidate()
        gridViewTimer?.invalidate()
        
        gameState.isGridView = true
        currentPhase = .gridView
        
        // Fade out banner and hint
        withAnimation(.easeOut(duration: 2)) {
            bannerOpacity = 0.0
            carouselHintOpacity = 0.0
        }
        
        // After 8 seconds, show final cover
        let finalCoverWorkItem = DispatchWorkItem {
            // Check if view is still active before executing
            guard self.currentPhase == .gridView else { return }
            self.transitionToFinalCover()
        }
        asyncTracker.operations.append(finalCoverWorkItem)
        DispatchQueue.main.asyncAfter(deadline: .now() + 8, execute: finalCoverWorkItem)
    }
    
    private func transitionToFinalCover() {
        currentPhase = .finalCover
        
        // Fade in cover
        withAnimation(.easeIn(duration: 3)) {
            showFinalCover = true
        }
    }
    
    private func cleanup() {
        // Cancel all timers
        autoAdvanceTimer?.invalidate()
        gridViewTimer?.invalidate()
        autoAdvanceTimer = nil
        gridViewTimer = nil
        
        // Cancel all pending async operations
        cancelAllAsyncOperations()
        
        // Stop victory music
        viewModel.audioService.stopAllAudio()
        
        print("🧹 VictorySequenceView: Cleanup complete")
    }
}

