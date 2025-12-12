//
//  ToastView.swift
//  My First Swift
//
//  Created by AI Assistant
//

import SwiftUI

struct ToastView: View {
    let message: String
    let type: ToastType
    let customColor: Color?
    let customIcon: String?
    let imageURL: String?
    let position: ToastPosition
    @Binding var isShowing: Bool
    @State private var toastImage: UIImage?
    
    enum ToastPosition {
        case top
        case bottomRight
    }
    
    enum ToastType {
        case info
        case success
        case warning
        case error
        case custom
        
        var defaultColor: Color {
            switch self {
            case .info: return .blue
            case .success: return .green
            case .warning: return .orange
            case .error: return .red
            case .custom: return .blue
            }
        }
        
        var defaultIcon: String {
            switch self {
            case .info: return "ℹ️"
            case .success: return "✅"
            case .warning: return "⚠️"
            case .error: return "❌"
            case .custom: return "💬"
            }
        }
    }
    
    var displayColor: Color {
        if let customColor = customColor {
            return customColor
        }
        return type.defaultColor
    }
    
    var displayIcon: String? {
        // Only show icon if explicitly provided - no default emojis
        return customIcon
    }
    
    var body: some View {
        if isShowing {
            HStack(spacing: 12) {
                // Show image if available (for asset notifications)
                if let image = toastImage {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                } else if let icon = displayIcon {
                    Text(icon)
                        .font(.system(size: 20))
                }
                
                Text(message)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.leading)
                
                if position == .top {
                    Spacer()
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(displayColor.opacity(0.9))
            .foregroundColor(.white)
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
            .frame(maxWidth: position == .bottomRight ? 280 : nil)
            .padding(.horizontal, position == .top ? 20 : 0)
            .padding(.top, position == .top ? 60 : 0)
            .transition(position == .top ? .move(edge: .top).combined(with: .opacity) : .move(edge: .bottom).combined(with: .opacity))
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isShowing)
            .onAppear {
                // Load image if URL provided
                if let imageURLString = imageURL, let url = URL(string: imageURLString) {
                    Task {
                        do {
                            if let image = try await ImageCache.shared.loadImage(from: url) {
                                await MainActor.run {
                                    self.toastImage = image
                                }
                            }
                        } catch {
                            print("⚠️ ToastView: Failed to load image from \(imageURLString): \(error)")
                        }
                    }
                }
            }
        }
    }
}

struct ToastModifier: ViewModifier {
    @Binding var toast: ToastMessage?
    
    func body(content: Content) -> some View {
        ZStack {
            content
            
            if let toast = toast {
                Group {
                    if toast.position == .top {
                        VStack {
                            ToastView(
                                message: toast.message,
                                type: toast.type,
                                customColor: toast.customColor,
                                customIcon: toast.customIcon,
                                imageURL: toast.imageURL,
                                position: toast.position,
                                isShowing: .constant(true)
                            )
                            Spacer()
                        }
                    } else {
                        VStack {
                            Spacer()
                            HStack {
                                Spacer()
                                ToastView(
                                    message: toast.message,
                                    type: toast.type,
                                    customColor: toast.customColor,
                                    customIcon: toast.customIcon,
                                    imageURL: toast.imageURL,
                                    position: toast.position,
                                    isShowing: .constant(true)
                                )
                                .padding(.trailing, 16)
                                .padding(.bottom, 60)
                            }
                        }
                    }
                }
                .onAppear {
                    // Auto-dismiss
                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(toast.duration)) {
                        self.toast = nil
                    }
                }
            }
        }
    }
}

extension View {
    func toast(_ toast: Binding<ToastMessage?>) -> some View {
        modifier(ToastModifier(toast: toast))
    }
}

// Toast message model
struct ToastMessage: Identifiable {
    let id = UUID()
    let message: String
    let type: ToastView.ToastType
    let duration: TimeInterval
    let customColor: Color?
    let customIcon: String?
    let imageURL: String?
    let position: ToastView.ToastPosition
    
    init(
        message: String,
        type: ToastView.ToastType = .info,
        duration: TimeInterval = 3.0,
        customColor: Color? = nil,
        customIcon: String? = nil,
        imageURL: String? = nil,
        position: ToastView.ToastPosition = .top
    ) {
        self.message = message
        self.type = type
        self.duration = duration
        self.customColor = customColor
        self.customIcon = customIcon
        self.imageURL = imageURL
        self.position = position
    }
}

