//
//  DrawerView.swift
//  abbies.world.ios
//
//  Right-side overlay drawer component
//

import SwiftUI

struct DrawerView<Content: View>: View {
    @Binding var isOpen: Bool
    let width: CGFloat
    let content: Content
    
    @State private var dragOffset: CGFloat = 0
    @State private var isDragging = false
    
    init(isOpen: Binding<Bool>, width: CGFloat, @ViewBuilder content: () -> Content) {
        self._isOpen = isOpen
        self.width = width
        self.content = content()
    }
    
    private var currentOffset: CGFloat {
        let baseOffset = isOpen ? 0 : width
        return baseOffset + dragOffset
    }
    
    var body: some View {
        HStack(spacing: 0) {
            Spacer()
            
            // Drawer content
            content
                .frame(width: width)
                .background(
                    ZStack {
                        // Background with blur
                        Color.white.opacity(0.85)
                        
                        // Backdrop blur effect
                        VisualEffectView(effect: UIBlurEffect(style: .systemMaterial))
                    }
                )
                .cornerRadius(12, corners: [.topLeft, .bottomLeft])
                .shadow(color: .black.opacity(0.2), radius: 12, x: -4, y: 0)
                .offset(x: currentOffset)
                .animation(.spring(response: 0.3, dampingFraction: 0.8), value: isOpen)
                .animation(.spring(response: 0.3, dampingFraction: 0.8), value: dragOffset)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            if !isDragging {
                                isDragging = true
                            }
                            
                            // Only allow dragging left (closing) when open
                            // Or dragging right (opening) when closed
                            if isOpen {
                                // Dragging left to close
                                dragOffset = min(0, value.translation.width)
                            } else {
                                // Dragging right to open
                                dragOffset = max(0, value.translation.width - width)
                            }
                        }
                        .onEnded { value in
                            isDragging = false
                            
                            let threshold: CGFloat = 50
                            let velocity = value.predictedEndTranslation.width - value.translation.width
                            
                            if isOpen {
                                // Closing gesture
                                if value.translation.width < -threshold || velocity < -500 {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                        isOpen = false
                                        dragOffset = 0
                                    }
                                } else {
                                    // Spring back open
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                        dragOffset = 0
                                    }
                                }
                            } else {
                                // Opening gesture
                                if value.translation.width > threshold || velocity > 500 {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                        isOpen = true
                                        dragOffset = 0
                                    }
                                } else {
                                    // Spring back closed
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                        dragOffset = 0
                                    }
                                }
                            }
                        }
                )
        }
        .onChange(of: isOpen) { oldValue, newValue in
            if !isDragging {
                dragOffset = 0
            }
        }
    }
}

// Helper extension for rounded corners on specific sides
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// Visual effect view for blur
struct VisualEffectView: UIViewRepresentable {
    var effect: UIVisualEffect?
    
    func makeUIView(context: UIViewRepresentableContext<Self>) -> UIVisualEffectView {
        UIVisualEffectView()
    }
    
    func updateUIView(_ uiView: UIVisualEffectView, context: UIViewRepresentableContext<Self>) {
        uiView.effect = effect
    }
}

#Preview {
    ZStack {
        Color.blue.opacity(0.3)
        
        DrawerView(isOpen: .constant(true), width: 400) {
            VStack {
                Text("Drawer Content")
                    .font(.title)
                Spacer()
            }
            .padding()
        }
    }
}

