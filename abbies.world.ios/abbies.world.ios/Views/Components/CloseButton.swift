//
//  CloseButton.swift
//  abbies.world.ios
//
//  Reusable close button component with consistent styling
//

import SwiftUI

struct CloseButton: View {
    let action: () -> Void
    var size: CGFloat = 30
    var backgroundColor: Color = .white
    var foregroundColor: Color = .black
    var shadowColor: Color = .black.opacity(0.3)
    
    var body: some View {
        Button(action: action) {
            ZStack {
                // Circular background
                Circle()
                    .fill(backgroundColor)
                    .frame(width: size, height: size)
                    .shadow(color: shadowColor, radius: 4, x: 0, y: 2)
                
                // X mark - properly centered and sized
                Image(systemName: "xmark")
                    .font(.system(size: size * 0.4, weight: .semibold))
                    .foregroundColor(foregroundColor)
            }
        }
    }
}

// MARK: - Preset Styles

extension CloseButton {
    /// White button with black X (for dark backgrounds)
    static func white(action: @escaping () -> Void, onDark: Bool = true) -> CloseButton {
        CloseButton(
            action: action,
            size: 30,
            backgroundColor: .white,
            foregroundColor: .black,
            shadowColor: onDark ? .black.opacity(0.8) : .black.opacity(0.3)
        )
    }
    
    /// Black button with white X (for light backgrounds)
    static func black(action: @escaping () -> Void, onLight: Bool = true) -> CloseButton {
        CloseButton(
            action: action,
            size: 30,
            backgroundColor: .black.opacity(0.6),
            foregroundColor: .white,
            shadowColor: .black.opacity(0.3)
        )
    }
    
    /// Custom size
    func size(_ size: CGFloat) -> CloseButton {
        CloseButton(
            action: action,
            size: size,
            backgroundColor: backgroundColor,
            foregroundColor: foregroundColor,
            shadowColor: shadowColor
        )
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        // Dark background preview
        Color.black
            .ignoresSafeArea()
        
        VStack(spacing: 40) {
            CloseButton.white(action: {
                print("Close tapped")
            })
            
            CloseButton.white(action: {
                print("Close tapped")
            }).size(40)
        }
    }
}

#Preview("Light Background") {
    ZStack {
        // Light background preview
        Color.white
            .ignoresSafeArea()
        
        VStack(spacing: 40) {
            CloseButton.black(action: {
                print("Close tapped")
            })
            
            CloseButton.black(action: {
                print("Close tapped")
            }).size(40)
        }
    }
}
