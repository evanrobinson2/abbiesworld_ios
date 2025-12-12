//
//  GenerationButton.swift
//  My First Swift
//
//  Created by AI Assistant
//

import SwiftUI

struct GenerationButton: View {
    let state: GenerationButtonState
    let action: () -> Void
    
    @State private var pulseScale: CGFloat = 1.0
    @State private var generatingDots = ""
    @State private var generatingTimer: Timer?
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 0) {
                Spacer()
                HStack(spacing: 0) {
                    Text(baseButtonText)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                    
                    // Dots area - fixed width to prevent jitter
                    Text(state == .generating ? generatingDots : "")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                        .frame(width: 30, alignment: .leading)
                }
                Spacer()
            }
            .frame(height: 70)
            .background(buttonColor)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.black, lineWidth: 2)
            )
            .scaleEffect(shouldPulse ? pulseScale : 1.0)
            .animation(shouldPulse ? .easeInOut(duration: 1.0).repeatForever(autoreverses: true) : .default, value: pulseScale)
        }
        .disabled(!isReady)
        .onAppear {
            switch state {
            case .ready:
                startPulseAnimation()
                stopGeneratingAnimation()
            case .generating:
                stopPulseAnimation()
                startGeneratingAnimation()
            case .notReady:
                stopPulseAnimation()
                stopGeneratingAnimation()
            }
        }
        .onChange(of: state.id) { _, _ in
            switch state {
            case .ready:
                startPulseAnimation()
                stopGeneratingAnimation()
            case .generating:
                stopPulseAnimation()
                startGeneratingAnimation()
            case .notReady:
                stopPulseAnimation()
                stopGeneratingAnimation()
            }
        }
    }
    
    private var baseButtonText: String {
        switch state {
        case .notReady:
            return "NOT READY"
        case .ready:
            return "READY"
        case .generating:
            return "GENERATING"
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
    
    private var shouldPulse: Bool {
        switch state {
        case .ready:
            return true
        default:
            return false
        }
    }
    
    private var isReady: Bool {
        switch state {
        case .ready:
            return true
        default:
            return false
        }
    }
    
    private func startPulseAnimation() {
        withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
            pulseScale = 1.05
        }
    }
    
    private func stopPulseAnimation() {
        withAnimation(.easeOut(duration: 0.2)) {
            pulseScale = 1.0
        }
    }
    
    private func startGeneratingAnimation() {
        stopGeneratingAnimation() // Clear any existing timer
        generatingDots = ""
        
        generatingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [self] timer in
            switch self.state {
            case .generating:
                break // Continue animation
            default:
                timer.invalidate()
                self.generatingTimer = nil
                return
            }
            
            withAnimation(.easeInOut(duration: 0.3)) {
                switch self.generatingDots {
                case "":
                    self.generatingDots = "."
                case ".":
                    self.generatingDots = ".."
                case "..":
                    self.generatingDots = "..."
                default:
                    self.generatingDots = ""
                }
            }
        }
    }
    
    private func stopGeneratingAnimation() {
        generatingTimer?.invalidate()
        generatingTimer = nil
        generatingDots = ""
    }
}
