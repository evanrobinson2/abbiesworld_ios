//
//  ImageGenerationErrorView.swift
//  abbies.world.ios
//
//  Error dialog for image generation failures
//

import SwiftUI

struct ImageGenerationErrorView: View {
    let onDismiss: () -> Void
    
    var body: some View {
        ZStack {
            // Semi-transparent background
            Color.black.opacity(0.6)
                .ignoresSafeArea()
            
            // Error dialog
            ZStack(alignment: .topTrailing) {
                VStack(spacing: 24) {
                    // Broken image with black stroke
                    if let brokenImage = loadBrokenImage() {
                        Image(uiImage: brokenImage)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 200, height: 200)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.black, lineWidth: 4)
                            )
                            .cornerRadius(12)
                    } else {
                        // Fallback if image not found
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.red)
                            .frame(width: 200, height: 200)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.black, lineWidth: 4)
                            )
                            .cornerRadius(12)
                    }
                    
                    // Error messages
                    VStack(spacing: 12) {
                        Text("Something went wrong.")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.primary)
                        
                        Text("Try again later")
                            .font(.system(size: 18))
                            .foregroundColor(.secondary)
                    }
                    
                    // Dismiss button
                    Button(action: onDismiss) {
                        Text("OK")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.blue)
                            .cornerRadius(10)
                    }
                    .padding(.horizontal, 40)
                }
                .padding(32)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.white)
                        .shadow(color: Color.black.opacity(0.3), radius: 20, x: 0, y: 10)
                )
                
                // Red X in top right corner of dialog
                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.red)
                        .background(
                            Circle()
                                .fill(Color.white)
                                .frame(width: 32, height: 32)
                        )
                }
                .padding(8)
                .offset(x: 8, y: -8)
            }
            .padding(40)
        }
    }
    
    private func loadBrokenImage() -> UIImage? {
        // Try to load from Assets.xcassets (primary method)
        if let image = UIImage(named: "broken") {
            return image
        }
        
        // Fallback: Try to load from bundle resources
        if let imagePath = Bundle.main.path(forResource: "broken", ofType: "png"),
           let image = UIImage(contentsOfFile: imagePath) {
            return image
        }
        
        return nil
    }
}

