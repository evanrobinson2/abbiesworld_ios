//
//  DrawerHandle.swift
//  abbies.world.ios
//
//  Drawer handle component for right-side drawer
//

import SwiftUI

struct DrawerHandle: View {
    @Binding var isOpen: Bool
    var onTap: (() -> Void)? = nil
    
    @State private var isPulsing = false
    @State private var isPressed = false
    
    var body: some View {
        Button(action: {
            // Haptic feedback
            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
            impactFeedback.impactOccurred()
            
            // Toggle drawer with animation
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                isOpen.toggle()
            }
            
            onTap?()
        }) {
            ZStack {
                // Background - Match games button blue
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.blue.opacity(isOpen ? 0.8 : 0.6))
                    .frame(width: 60, height: 120)
                    .shadow(color: .black.opacity(0.3), radius: 6, x: -2, y: 0)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                    )
                
                // Chevron icon - White for visibility on blue
                Image(systemName: isOpen ? "chevron.right" : "chevron.left")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isPressed ? 0.95 : (isPulsing && !isOpen ? 1.1 : 1.0))
        .opacity(isPressed ? 0.7 : (isPulsing && !isOpen ? 0.8 : 1.0))
        .animation(.easeInOut(duration: 0.1), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    if !isPressed {
                        withAnimation(.easeInOut(duration: 0.1)) {
                            isPressed = true
                        }
                    }
                }
                .onEnded { _ in
                    withAnimation(.easeInOut(duration: 0.1)) {
                        isPressed = false
                    }
                }
        )
        .animation(
            isPulsing && !isOpen 
                ? Animation.easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                : .default,
            value: isPulsing
        )
        .onAppear {
            if !isOpen {
                // Start subtle pulse animation when closed
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    isPulsing = true
                }
            }
        }
        .onChange(of: isOpen) { oldValue, newValue in
            if newValue {
                isPulsing = false
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    isPulsing = true
                }
            }
        }
    }
}

#Preview {
    ZStack {
        Color.gray.opacity(0.2)
        HStack {
            Spacer()
            DrawerHandle(isOpen: .constant(false))
        }
    }
}
