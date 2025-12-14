//
//  SettingsView.swift
//  My First Swift
//
//  Settings dialog view
//

import SwiftUI

struct SettingsView: View {
    var onDismiss: () -> Void
    @ObservedObject var viewModel: MainViewModel
    
    @StateObject private var musicService = MusicService.shared
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    Text("Settings")
                        .font(.title)
                        .fontWeight(.bold)
                        .padding(.top)
                    
                    // View Mode Section
                    ViewModeSection(viewModel: viewModel)
                    
                    // Music Controls Section
                    MusicControlsSection(musicService: musicService)
                    
                    // Other settings sections can go here
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Other Settings")
                            .font(.headline)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                        
                        SettingsRow(icon: "info.circle.fill", title: "About", action: {})
                    }
                    
                    Spacer()
                }
                .padding()
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

struct MusicControlsSection: View {
    @ObservedObject var musicService: MusicService
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Music Controls")
                .font(.headline)
                .padding(.horizontal)
            
            VStack(spacing: 12) {
                // Music On/Off Toggle
                HStack {
                    Image(systemName: "music.note")
                        .font(.system(size: 20))
                        .foregroundColor(.blue)
                        .frame(width: 30)
                    
                    Text("Music")
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    Toggle("", isOn: Binding(
                        get: { musicService.isMusicEnabled },
                        set: { _ in musicService.toggleMusic() }
                    ))
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
                
                // Shuffle Toggle
                HStack {
                    Image(systemName: "shuffle")
                        .font(.system(size: 20))
                        .foregroundColor(.blue)
                        .frame(width: 30)
                    
                    Text("Shuffle")
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    Toggle("", isOn: Binding(
                        get: { musicService.isShuffleEnabled },
                        set: { _ in musicService.toggleShuffle() }
                    ))
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
            }
            .padding(.horizontal)
            
            // Song Selector
            if !musicService.playlist.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Select Song")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.horizontal)
                    
                    ForEach(musicService.playlist) { track in
                        SongRow(
                            track: track,
                            isCurrentlyPlaying: musicService.currentSong?.id == track.id,
                            isPlaying: musicService.isPlaying && musicService.currentSong?.id == track.id,
                            onSelect: {
                                musicService.playSong(track)
                            }
                        )
                    }
                }
            } else if musicService.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                        .padding()
                    Spacer()
                }
            } else {
                Text("No songs available")
                    .foregroundColor(.secondary)
                    .padding()
            }
        }
    }
}

struct SongRow: View {
    let track: MusicTrack
    let isCurrentlyPlaying: Bool
    let isPlaying: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack {
                // Play indicator
                if isCurrentlyPlaying {
                    Image(systemName: isPlaying ? "play.circle.fill" : "pause.circle.fill")
                        .foregroundColor(.blue)
                        .font(.system(size: 20))
                } else {
                    Image(systemName: "music.note")
                        .foregroundColor(.gray)
                        .font(.system(size: 16))
                }
                
                Text(track.displayName)
                    .foregroundColor(isCurrentlyPlaying ? .blue : .primary)
                    .fontWeight(isCurrentlyPlaying ? .semibold : .regular)
                
                Spacer()
            }
            .padding()
            .background(isCurrentlyPlaying ? Color.blue.opacity(0.1) : Color.gray.opacity(0.05))
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
        .padding(.horizontal)
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(.blue)
                    .frame(width: 30)
                
                Text(title)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct ViewModeSection: View {
    @ObservedObject var viewModel: MainViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("View Mode")
                .font(.headline)
                .padding(.horizontal)
            
            VStack(spacing: 12) {
                // View mode picker
                Picker("View Mode", selection: Binding(
                    get: { viewModel.viewMode },
                    set: { viewModel.setViewMode($0) }
                )) {
                    Text("Default").tag(ViewMode.default)
                    Text("4 Carousels").tag(ViewMode.fourCarousel)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal)
                
                // Description text
                Text(viewModel.viewMode == .default 
                     ? "Standard 3-carousel layout"
                     : "Extended layout with style selection")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
            }
        }
    }
}

#Preview {
    // Note: Preview needs a MainViewModel instance
    SettingsView(onDismiss: {}, viewModel: MainViewModel())
}

