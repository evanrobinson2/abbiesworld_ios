//
//  MusicPlayerView.swift
//  abbies.world.ios
//
//  Music player controls view
//

import SwiftUI

struct MusicPlayerView: View {
    @ObservedObject var musicService = MusicService.shared
    var onDismiss: () -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Current song artwork and name
                if let currentSong = musicService.currentSong {
                    VStack(spacing: 12) {
                        // Album artwork (if available)
                        if let artwork = musicService.currentSongArtwork {
                            Image(uiImage: artwork)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 180, height: 180)
                                .cornerRadius(12)
                                .shadow(radius: 8)
                        } else {
                            // Placeholder when no artwork
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.gray.opacity(0.3))
                                .frame(width: 180, height: 180)
                                .overlay(
                                    Image(systemName: "music.note")
                                        .font(.system(size: 48))
                                        .foregroundColor(.gray)
                                )
                        }
                        
                        Text(currentSong.displayName)
                            .font(.title3)
                            .fontWeight(.semibold)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                            .padding(.horizontal)
                    }
                    .padding(.top, 16)
                    .padding(.bottom, 12)
                }
                
                Divider()
                
                // Song list
                if !musicService.playlist.isEmpty {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(musicService.playlist) { track in
                                Button(action: {
                                    musicService.playSong(track)
                                }) {
                                    HStack {
                                        // Current song indicator
                                        if track.id == musicService.currentSong?.id {
                                            Image(systemName: musicService.isPlaying ? "waveform" : "pause.circle.fill")
                                                .foregroundColor(.blue)
                                                .font(.system(size: 20))
                                                .frame(width: 24)
                                        } else {
                                            Spacer()
                                                .frame(width: 24)
                                        }
                                        
                                        Text(track.displayName)
                                            .font(.body)
                                            .foregroundColor(.primary)
                                            .multilineTextAlignment(.leading)
                                        
                                        Spacer()
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 12)
                                    .background(
                                        track.id == musicService.currentSong?.id
                                            ? Color.blue.opacity(0.1)
                                            : Color.clear
                                    )
                                }
                                .buttonStyle(PlainButtonStyle())
                                
                                Divider()
                                    .padding(.leading, 40)
                            }
                        }
                    }
                } else {
                    Spacer()
                }
                
                Divider()
                
                // Control buttons (icon-only)
                VStack(spacing: 16) {
                    // Top row: Shuffle and Mute
                    HStack(spacing: 40) {
                        // Shuffle toggle
                        Button(action: {
                            musicService.toggleShuffle()
                        }) {
                            Image(systemName: "shuffle")
                                .font(.system(size: 28))
                                .foregroundColor(musicService.isShuffleEnabled ? .blue : .gray)
                                .overlay(
                                    Circle()
                                        .stroke(musicService.isShuffleEnabled ? Color.blue : Color.clear, lineWidth: 2)
                                        .frame(width: 36, height: 36)
                                )
                        }
                        
                        // Mute toggle
                        Button(action: {
                            musicService.toggleMute()
                        }) {
                            Image(systemName: musicService.isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                                .font(.system(size: 28))
                                .foregroundColor(musicService.isMuted ? .red : .primary)
                        }
                    }
                    .padding(.top, 12)
                    
                    // Bottom row: Previous, Play/Pause, Next
                    HStack(spacing: 40) {
                        // Previous track
                        Button(action: {
                            musicService.playPrevious()
                        }) {
                            Image(systemName: "backward.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.primary)
                        }
                        .disabled(musicService.playlist.isEmpty)
                        
                        // Play/Pause
                        Button(action: {
                            if musicService.isPlaying {
                                musicService.pause()
                            } else {
                                musicService.play()
                            }
                        }) {
                            Image(systemName: musicService.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                                .font(.system(size: 64))
                                .foregroundColor(.blue)
                        }
                        .disabled(musicService.playlist.isEmpty)
                        
                        // Next track
                        Button(action: {
                            musicService.playNext()
                        }) {
                            Image(systemName: "forward.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.primary)
                        }
                        .disabled(musicService.playlist.isEmpty)
                    }
                    .padding(.bottom, 20)
                }
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

