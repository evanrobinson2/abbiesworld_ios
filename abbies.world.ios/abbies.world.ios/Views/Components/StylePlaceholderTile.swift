//
//  StylePlaceholderTile.swift
//  abbies.world.ios
//
//  Placeholder tile for style carousel items (no image available)
//

import SwiftUI

struct StylePlaceholderTile: View {
    let styleName: String
    let shortDescription: String? // Optional: 1-4 word description overlay
    
    // MARK: - TEMPORARY FEATURE
    // This description overlay is TEMPORARY until we have actual style assets.
    // To remove: Delete the shortDescription parameter and the description overlay VStack below.
    // The styleName at the bottom should remain.
    
    var body: some View {
        ZStack {
            // Dark blue background
            Color(red: 0.1, green: 0.2, blue: 0.4)
                .cornerRadius(12)
            
            // Light blue architectural/geometric lines
            GeometryReader { geometry in
                Path { path in
                    let width = geometry.size.width
                    let height = geometry.size.height
                    
                    // Horizontal lines
                    for i in 1..<4 {
                        let y = height * CGFloat(i) / 4
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: width, y: y))
                    }
                    
                    // Vertical lines
                    for i in 1..<4 {
                        let x = width * CGFloat(i) / 4
                        path.move(to: CGPoint(x: x, y: 0))
                        path.addLine(to: CGPoint(x: x, y: height))
                    }
                    
                    // Diagonal lines (architectural feel)
                    path.move(to: CGPoint(x: 0, y: 0))
                    path.addLine(to: CGPoint(x: width, y: height))
                    path.move(to: CGPoint(x: width, y: 0))
                    path.addLine(to: CGPoint(x: 0, y: height))
                }
                .stroke(Color(red: 0.4, green: 0.6, blue: 0.9), lineWidth: 1.5)
            }
            
            // TEMPORARY: Short description overlay (top center)
            // Remove this entire VStack when we have actual style assets
            if let description = shortDescription {
                VStack {
                    Text(description)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(
                            Color.black.opacity(0.7)
                                .cornerRadius(4)
                        )
                        .padding(.top, 8)
                    Spacer()
                }
            }
            
            // Style name text overlay (bottom - keep this)
            VStack {
                Spacer()
                Text(styleName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        Color.black.opacity(0.6)
                            .cornerRadius(6)
                    )
                    .padding(.bottom, 8)
            }
        }
        .aspectRatio(1.0, contentMode: .fit)
    }
}

#Preview {
    HStack {
        StylePlaceholderTile(
            styleName: "Crayon",
            shortDescription: "Bold vibrant colors"
        )
        .frame(width: 100, height: 100)
        StylePlaceholderTile(
            styleName: "Watercolor",
            shortDescription: "Soft flowing colors"
        )
        .frame(width: 100, height: 100)
    }
    .padding()
}

