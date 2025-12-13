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
                    Image(systemName: "sparkles")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 64, height: 64)
                        .background(buttonColor)
                        .clipShape(Circle())
                        .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
                        .overlay(
                            Circle()
                                .stroke(Color.black, lineWidth: 2)
                        )
                }
                .disabled(!isReady)
                .opacity(isReady ? 1.0 : 0.6)
                .padding(.trailing, 24)
                .padding(.bottom, 24)
            }
        }
    }
    
    private var buttonColor: Color {
        switch state {
        case .notReady:
            return Color(red: 1.0, green: 0.7, blue: 0.2) // Orange
        case .ready:
            return Color(red: 0.2, green: 0.8, blue: 0.3) // Green
        case .generating:
            return Color(red: 0.4, green: 0.5, blue: 0.9) // Blue
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

