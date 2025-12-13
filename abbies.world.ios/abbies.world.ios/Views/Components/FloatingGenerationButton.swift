//
//  FloatingGenerationButton.swift
//  abbies.world.ios
//
//  Floating action button for generation when drawer is closed
//

import SwiftUI

struct FloatingGenerationButton: View {
    let state: GenerationButtonState
    let action: () -> Void
    
    var body: some View {
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
    
    private var videoName: String {
        switch state {
        case .notReady:
            return "robot_waving_white_background"
        case .ready:
            return "robot_paint_brush_waving"
        case .generating:
            return "robot_running_treadmill"
        }
    }
    
    private var isReady: Bool {
        switch state {
        case .ready, .generating:
            return true
        default:
            return false
        }
    }
}

#Preview {
    ZStack {
        Color.gray.opacity(0.2)
        FloatingGenerationButton(
            state: .ready,
            action: {}
        )
    }
}

