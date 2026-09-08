//
//  FloatingGenerationButton.swift
//  abbies.world.ios
//
//  Floating action button for generation when drawer is closed
//

import SwiftUI

struct FloatingGenerationButton: View {
    let state: GenerationButtonState
    let hasPreviewImage: Bool
    let isGenerationComplete: Bool
    let action: () -> Void
    
    var body: some View {
        // Hide button when not ready and no preview image (suppress waving robot)
        if shouldShowButton {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Button(action: action) {
                    ZStack {
                        // White circle background
                        Circle()
                            .fill(Color.white)
                            .frame(width: 128, height: 128)
                        
                        // Video player
                        VideoPlayerView(videoName: videoName, isLooping: true)
                            .frame(width: 128, height: 128)
                            .clipShape(Circle())
                        
                        // Thick black outline
                        Circle()
                            .stroke(Color.black, lineWidth: 4)
                            .frame(width: 128, height: 128)
                    }
                    .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .disabled(!isReady)
                .opacity(isReady ? 1.0 : 0.6)
                .frame(width: 128, height: 128, alignment: .bottomTrailing)
                .padding(.trailing, 24)
                .padding(.bottom, 24)
                }
            }
        }
    }
    
    // Show button if: generating, ready, or has preview image (but not if generation just completed)
    // Hide button if: not ready AND (no preview image OR generation just completed)
    private var shouldShowButton: Bool {
        switch state {
        case .generating, .ready:
            return true
        case .notReady:
            // Hide button if generation just completed (even if preview image exists)
            // This stops the painter animation while keeping preview in drawer
            if isGenerationComplete {
                return false
            }
            return hasPreviewImage // Only show if we have a preview image and generation hasn't completed
        }
    }
    
    private var videoName: String {
        // Priority: generating > preview image (if not complete) > ready state
        if state == .generating {
            return "robot_running_treadmill"
        } else if hasPreviewImage && !isGenerationComplete {
            // Show paintbrush robot when image is ready but generation not complete
            return "robot_paint_brush_waving"
        } else {
            // Ready state (shouldn't happen if we hide notReady, but fallback)
            return "robot_paint_brush_waving"
        }
    }
    
    private var isReady: Bool {
        switch state {
        case .ready, .generating:
            return true
        case .notReady:
            return hasPreviewImage // Allow interaction if preview image exists
        }
    }
}

#Preview {
    ZStack {
        Color.gray.opacity(0.2)
        FloatingGenerationButton(
            state: .ready,
            hasPreviewImage: false,
            isGenerationComplete: false,
            action: {}
        )
    }
}

