//
//  PlayerHomeView.swift
//  abbies.world.ios
//
//  Player Home for Abbie's World 2 - decorate your treehouse and manage music.
//

import SwiftUI

struct World2PlayerHomeView: View {
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void
    
    @State private var isEditMode = false
    @State private var selectedDecoration: DecorationInstance?
    @State private var showingDecorationPicker = false
    @State private var showingJukebox = false
    
    private var playerService: PlayerStateService { PlayerStateService.shared }
    private var musicService: World2MusicService { World2MusicService.shared }
    
    private var homeLayout: HomeLayout? {
        playerService.currentPlayer?.homeLayout
    }
    
    private var placedDecorations: [DecorationInstance] {
        playerService.currentPlayer?.decorations ?? []
    }
    
    private var playerColor: Color {
        viewModel.currentPlayerId == .abbie ? .pink : .purple
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                homeBackground(playerId: viewModel.currentPlayerId)
                    .ignoresSafeArea()
                
                ForEach(placedDecorations) { decoration in
                    PlacedDecorationView(
                        decoration: decoration,
                        isEditMode: isEditMode,
                        isSelected: selectedDecoration?.id == decoration.id,
                        geometry: geometry,
                        onTap: {
                            if isEditMode {
                                selectedDecoration = decoration
                            } else if decoration.decorationId.contains("jukebox") {
                                showingJukebox = true
                            }
                        },
                        onDrag: { newPosition in
                            updateDecorationPosition(decoration, to: newPosition, in: geometry)
                        }
                    )
                }
                
                VStack {
                    homeHeader
                    
                    Spacer()
                    
                    bottomToolbar
                }
            }
        }
        .sheet(isPresented: $showingDecorationPicker) {
            DecorationPickerSheet(
                availableDecorations: playerService.currentPlayer?.decorations ?? [],
                onSelect: { decoration in
                    placeDecoration(decoration)
                    showingDecorationPicker = false
                },
                onDismiss: {
                    showingDecorationPicker = false
                }
            )
            .presentationDetents([.medium])
        }
        .sheet(isPresented: $showingJukebox) {
            JukeboxSheet(
                musicService: musicService,
                unlockedTracks: playerService.currentPlayer?.unlockedMusic ?? [],
                onDismiss: {
                    showingJukebox = false
                }
            )
            .presentationDetents([.medium, .large])
        }
    }
    
    @ViewBuilder
    private func homeBackground(playerId: PlayerId?) -> some View {
        let colors: [Color] = playerId == .abbie
            ? [Color(hex: "#ff9a9e") ?? .pink, Color(hex: "#fecfef") ?? .pink]
            : [Color(hex: "#a18cd1") ?? .purple, Color(hex: "#fbc2eb") ?? .pink]
        
        LinearGradient(
            colors: colors,
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    private var homeHeader: some View {
        HStack {
            Button(action: onExit) {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.left.circle.fill")
                        .font(.system(size: 28))
                    Text("Back to Map")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }
                .foregroundColor(.white)
            }
            
            Spacer()
            
            VStack(spacing: 4) {
                Text("🏠 \(viewModel.currentPlayerId?.displayName ?? "Your")'s Home 🏠")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                
                Text(isEditMode ? "Drag decorations to move them" : "Tap the jukebox for music!")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.8))
            }
            
            Spacer()
            
            editModeToggle
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(Color.black.opacity(0.2))
    }
    
    private var editModeToggle: some View {
        Button(action: {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                isEditMode.toggle()
                if !isEditMode {
                    selectedDecoration = nil
                }
            }
        }) {
            HStack(spacing: 8) {
                Image(systemName: isEditMode ? "checkmark.circle.fill" : "pencil.circle.fill")
                    .font(.system(size: 20))
                Text(isEditMode ? "Done" : "Edit")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
            }
            .foregroundColor(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                Capsule()
                    .fill(isEditMode ? Color.green : Color.white.opacity(0.2))
            )
        }
    }
    
    private var bottomToolbar: some View {
        HStack(spacing: 20) {
            toolbarButton(
                icon: "music.note.house.fill",
                label: "Jukebox",
                color: .orange
            ) {
                showingJukebox = true
            }
            
            if isEditMode {
                toolbarButton(
                    icon: "plus.circle.fill",
                    label: "Add",
                    color: .green
                ) {
                    showingDecorationPicker = true
                }
                
                if selectedDecoration != nil {
                    toolbarButton(
                        icon: "trash.fill",
                        label: "Remove",
                        color: .red
                    ) {
                        if let decoration = selectedDecoration {
                            removeDecoration(decoration)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(.ultraThinMaterial)
        )
        .padding(.horizontal, 20)
        .padding(.bottom, 30)
    }
    
    private func toolbarButton(
        icon: String,
        label: String,
        color: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(color)
                
                Text(label)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundColor(.primary)
            }
            .frame(width: 70)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(color.opacity(0.15))
            )
        }
    }
    
    private func updateDecorationPosition(_ decoration: DecorationInstance, to newPosition: CGPoint, in geometry: GeometryProxy) {
        guard var decorations = playerService.currentPlayer?.decorations,
              let index = decorations.firstIndex(where: { $0.id == decoration.id }) else {
            return
        }
        
        let normalizedX = max(0.1, min(0.9, newPosition.x / geometry.size.width))
        let normalizedY = max(0.1, min(0.9, newPosition.y / geometry.size.height))
        
        decorations[index].x = normalizedX
        decorations[index].y = normalizedY
    }
    
    private func placeDecoration(_ decoration: DecorationInstance) {
        var newDecoration = decoration
        newDecoration.x = 0.5
        newDecoration.y = 0.5
        playerService.addDecoration(newDecoration)
    }
    
    private func removeDecoration(_ decoration: DecorationInstance) {
        selectedDecoration = nil
    }
}

struct PlacedDecorationView: View {
    let decoration: DecorationInstance
    let isEditMode: Bool
    let isSelected: Bool
    let geometry: GeometryProxy
    let onTap: () -> Void
    let onDrag: (CGPoint) -> Void
    
    @State private var dragOffset: CGSize = .zero
    
    private var isJukebox: Bool {
        decoration.decorationId.contains("jukebox")
    }
    
    var body: some View {
        ZStack {
            decorationContent
                .scaleEffect(decoration.scale)
                .rotationEffect(.degrees(decoration.rotation))
                .shadow(
                    color: isSelected ? .yellow.opacity(0.5) : .black.opacity(0.3),
                    radius: isSelected ? 15 : 8,
                    y: 5
                )
            
            if isEditMode {
                Circle()
                    .stroke(isSelected ? Color.yellow : Color.white.opacity(0.5), lineWidth: 2)
                    .frame(width: 90, height: 90)
                
                if isSelected {
                    Image(systemName: "arrow.up.and.down.and.arrow.left.and.right")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.yellow)
                        .offset(y: 55)
                }
            }
        }
        .position(
            x: geometry.size.width * decoration.x + dragOffset.width,
            y: geometry.size.height * decoration.y + dragOffset.height
        )
        .zIndex(Double(decoration.zIndex) + (isSelected ? 100 : 0))
        .gesture(
            isEditMode
                ? DragGesture()
                    .onChanged { value in
                        dragOffset = value.translation
                    }
                    .onEnded { value in
                        let finalPosition = CGPoint(
                            x: geometry.size.width * decoration.x + value.translation.width,
                            y: geometry.size.height * decoration.y + value.translation.height
                        )
                        onDrag(finalPosition)
                        dragOffset = .zero
                    }
                : nil
        )
        .onTapGesture(perform: onTap)
    }
    
    @ViewBuilder
    private var decorationContent: some View {
        if isJukebox {
            jukeboxView
        } else {
            genericDecorationView
        }
    }
    
    private var jukeboxView: some View {
        VStack(spacing: 4) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(
                        LinearGradient(
                            colors: [.orange, .red],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: 70, height: 80)
                
                VStack(spacing: 8) {
                    Image(systemName: "music.note.list")
                        .font(.system(size: 24))
                        .foregroundColor(.white)
                    
                    HStack(spacing: 4) {
                        ForEach(0..<3) { i in
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color.yellow)
                                .frame(width: 8, height: CGFloat.random(in: 10...20))
                        }
                    }
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.yellow.opacity(0.5), lineWidth: 2)
            )
            
            Text("JUKEBOX")
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Capsule().fill(Color.orange))
        }
    }
    
    private var genericDecorationView: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.white.opacity(0.3))
                .frame(width: 60, height: 60)
            
            Image(systemName: "star.fill")
                .font(.system(size: 28))
                .foregroundColor(.yellow)
        }
    }
}

struct DecorationPickerSheet: View {
    let availableDecorations: [DecorationInstance]
    let onSelect: (DecorationInstance) -> Void
    let onDismiss: () -> Void
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if availableDecorations.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "gift")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        
                        Text("No Decorations Yet!")
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                        
                        Text("Complete minigames to earn decorations!")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                    .padding()
                } else {
                    ScrollView {
                        LazyVGrid(
                            columns: [GridItem(.adaptive(minimum: 100))],
                            spacing: 16
                        ) {
                            ForEach(availableDecorations) { decoration in
                                Button(action: { onSelect(decoration) }) {
                                    DecorationTile(decoration: decoration)
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Add Decoration")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        onDismiss()
                    }
                }
            }
        }
    }
}

struct DecorationTile: View {
    let decoration: DecorationInstance
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.purple.opacity(0.2))
                    .frame(width: 80, height: 80)
                
                Image(systemName: iconFor(decoration))
                    .font(.system(size: 32))
                    .foregroundColor(.purple)
            }
            
            Text(nameFor(decoration))
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.primary)
                .lineLimit(1)
        }
    }
    
    private func iconFor(_ decoration: DecorationInstance) -> String {
        if decoration.decorationId.contains("jukebox") {
            return "music.note.house.fill"
        } else if decoration.decorationId.contains("plant") {
            return "leaf.fill"
        } else if decoration.decorationId.contains("poster") {
            return "photo.fill"
        } else {
            return "star.fill"
        }
    }
    
    private func nameFor(_ decoration: DecorationInstance) -> String {
        decoration.decorationId
            .replacingOccurrences(of: "decoration.", with: "")
            .replacingOccurrences(of: ".", with: " ")
            .capitalized
    }
}

struct JukeboxSheet: View {
    @ObservedObject var musicService: World2MusicService
    let unlockedTracks: [String]
    let onDismiss: () -> Void
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                jukeboxHeader
                
                trackList
                
                playbackControls
            }
            .padding()
            .navigationTitle("🎵 Jukebox")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        onDismiss()
                    }
                }
            }
        }
    }
    
    private var jukeboxHeader: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.orange, .red, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 100, height: 100)
                
                Image(systemName: musicService.isPlaying ? "waveform" : "music.note")
                    .font(.system(size: 40))
                    .foregroundColor(.white)
                    .symbolEffect(.bounce, value: musicService.isPlaying)
            }
            .shadow(color: .purple.opacity(0.5), radius: 15)
            
            Text(musicService.isPlaying ? "Now Playing" : "Paused")
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundColor(.secondary)
        }
    }
    
    private var trackList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("UNLOCKED TRACKS")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.secondary)
            
            if unlockedTracks.isEmpty {
                Text("Play minigames to unlock more music!")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(unlockedTracks, id: \.self) { track in
                            trackRow(track)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private func trackRow(_ trackId: String) -> some View {
        HStack {
            Image(systemName: "music.note")
                .foregroundColor(.purple)
            
            Text(trackId.replacingOccurrences(of: "music.", with: "").replacingOccurrences(of: ".", with: " ").capitalized)
                .font(.system(size: 14, weight: .medium))
            
            Spacer()
            
            Button(action: {
                musicService.enterLocation(trackId)
            }) {
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.purple)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.purple.opacity(0.1))
        )
    }
    
    private var playbackControls: some View {
        HStack(spacing: 30) {
            Button(action: {
                musicService.toggleMusic()
            }) {
                Image(systemName: musicService.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.purple)
            }
        }
    }
}

#Preview {
    World2PlayerHomeView(
        viewModel: World2ViewModel(),
        onExit: {}
    )
}
