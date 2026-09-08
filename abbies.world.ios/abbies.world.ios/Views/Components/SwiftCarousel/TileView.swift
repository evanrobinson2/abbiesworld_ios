//
//  TileView.swift
//  SwiftCarousel
//
//  Created by Evan Robinson on 12/11/25.
//

import SwiftUI
import UIKit

struct TileView: View {
    let item: CarouselItem
    let config: CarouselConfig
    let isSelected: Bool
    var isFavorite: Bool? = nil // Optional: for showing heart icon
    var onFavoriteTap: (() -> Void)? = nil // Optional: callback for heart tap
    
    @State private var pulseScale: CGFloat = 1.0
    @State private var loadedImage: UIImage? = nil
    @State private var isLoading: Bool = false
    @State private var loadError: Bool = false
    
    var body: some View {
        Group {
            if let image = loadedImage {
                // Successfully loaded image
                ZStack(alignment: .topTrailing) {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: config.tileWidth, height: config.tileHeight)
                    .clipped()
                    .cornerRadius(config.cornerRadius)
                    .overlay(
                        // Selection border
                        RoundedRectangle(cornerRadius: config.cornerRadius)
                            .stroke(
                                config.selectionBorderColor,
                                lineWidth: isSelected ? config.selectionBorderWidth : 0
                            )
                    )
                    .scaleEffect(isSelected ? config.selectionScaleFactor * pulseScale : 1.0)
                    .animation(.easeOut(duration: 0.15), value: isSelected)
                    
                    // Heart icon overlay (if isFavorite is provided)
                    if let favorite = isFavorite, onFavoriteTap != nil {
                        Button(action: {
                            onFavoriteTap?()
                        }) {
                            Image(systemName: favorite ? "heart.fill" : "heart")
                                .font(.system(size: 16))
                                .foregroundColor(favorite ? .red : .white)
                                .padding(6)
                                .background(
                                    Circle()
                                        .fill(Color.black.opacity(0.5))
                                )
                        }
                        .padding(6)
                    }
                }
            } else if item.imageURL == nil {
                // Style placeholder tile (no image URL) - use custom placeholder
                // TEMPORARY: Passing shortDescription for overlay until we have actual assets
                StylePlaceholderTile(
                    styleName: item.displayName,
                    shortDescription: item.shortDescription
                )
                    .frame(width: config.tileWidth, height: config.tileHeight)
                    .overlay(
                        RoundedRectangle(cornerRadius: config.cornerRadius)
                            .stroke(
                                config.selectionBorderColor,
                                lineWidth: isSelected ? config.selectionBorderWidth : 0
                            )
                    )
                    .scaleEffect(isSelected ? config.selectionScaleFactor * pulseScale : 1.0)
                    .animation(.easeOut(duration: 0.15), value: isSelected)
            } else {
                // Loading state or error state (has imageURL but not loaded yet)
                if loadError {
                    // Show "under construction" fallback image with overlay text
                    if let fallbackImage = UIImage(named: "under_construction") {
                        Image(uiImage: fallbackImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: config.tileWidth, height: config.tileHeight)
                            .clipped()
                            .cornerRadius(config.cornerRadius)
                            .overlay(
                                // Gradient overlay at bottom for text readability
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color.clear,
                                        Color.black.opacity(0.7)
                                    ]),
                                    startPoint: .center,
                                    endPoint: .bottom
                                )
                                .frame(height: config.tileHeight * 0.35)
                                .offset(y: config.tileHeight * 0.325)
                            )
                            .overlay(
                                // "UNDER CONSTRUCTION" text with better styling
                                VStack {
                                    Spacer()
                                    Text("UNDER CONSTRUCTION")
                                        .font(.system(size: min(config.tileWidth * 0.12, 14), weight: .bold, design: .rounded))
                                        .foregroundColor(.white)
                                        .shadow(color: .black.opacity(0.9), radius: 3, x: 0, y: 2)
                                        .padding(.horizontal, 4)
                                        .padding(.bottom, max(config.tileHeight * 0.08, 6))
                                }
                            )
                            .overlay(
                                // Selection border
                                RoundedRectangle(cornerRadius: config.cornerRadius)
                                    .stroke(
                                        config.selectionBorderColor,
                                        lineWidth: isSelected ? config.selectionBorderWidth : 0
                                    )
                            )
                            .scaleEffect(isSelected ? config.selectionScaleFactor * pulseScale : 1.0)
                            .animation(.easeOut(duration: 0.15), value: isSelected)
                    } else {
                        // Fallback if image asset not found
                        RoundedRectangle(cornerRadius: config.cornerRadius)
                            .fill(Color.gray.opacity(0.3))
                            .frame(width: config.tileWidth, height: config.tileHeight)
                            .overlay(
                                VStack(spacing: 8) {
                                    Image(systemName: "exclamationmark.triangle")
                                        .font(.largeTitle)
                                        .foregroundColor(.orange)
                                    Text("UNDER CONSTRUCTION")
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .foregroundColor(.orange)
                                }
                                .padding()
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: config.cornerRadius)
                                    .stroke(
                                        config.selectionBorderColor,
                                        lineWidth: isSelected ? config.selectionBorderWidth : 0
                                    )
                            )
                            .scaleEffect(isSelected ? config.selectionScaleFactor * pulseScale : 1.0)
                            .animation(.easeOut(duration: 0.15), value: isSelected)
                    }
                } else {
                    // Loading state - use under construction image as background with spinner
                    if let loadingImage = UIImage(named: "under_construction") {
                        Image(uiImage: loadingImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: config.tileWidth, height: config.tileHeight)
                            .clipped()
                            .cornerRadius(config.cornerRadius)
                            .overlay(
                                // Semi-transparent overlay to make spinner more visible
                                Color.black.opacity(0.3)
                            )
                            .overlay(
                                // Spinner and item name
                                VStack(spacing: 8) {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(1.2)
                                    Text(item.displayName)
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(.white)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.center)
                                        .shadow(color: .black.opacity(0.8), radius: 2, x: 0, y: 1)
                                }
                                .padding()
                            )
                            .overlay(
                                // Selection border
                                RoundedRectangle(cornerRadius: config.cornerRadius)
                                    .stroke(
                                        config.selectionBorderColor,
                                        lineWidth: isSelected ? config.selectionBorderWidth : 0
                                    )
                            )
                            .scaleEffect(isSelected ? config.selectionScaleFactor * pulseScale : 1.0)
                            .animation(.easeOut(duration: 0.15), value: isSelected)
                    } else {
                        // Fallback if image asset not found
                        RoundedRectangle(cornerRadius: config.cornerRadius)
                            .fill(Color.gray.opacity(0.3))
                            .frame(width: config.tileWidth, height: config.tileHeight)
                            .overlay(
                                VStack(spacing: 8) {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle())
                                    Text(item.displayName)
                                        .font(.caption)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.center)
                                }
                                .padding()
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: config.cornerRadius)
                                    .stroke(
                                        config.selectionBorderColor,
                                        lineWidth: isSelected ? config.selectionBorderWidth : 0
                                    )
                            )
                            .scaleEffect(isSelected ? config.selectionScaleFactor * pulseScale : 1.0)
                            .animation(.easeOut(duration: 0.15), value: isSelected)
                    }
                }
            }
        }
        .onAppear {
            loadImage()
            if isSelected {
                startPulse()
            }
        }
        .onDisappear {
            // Release image from memory when tile scrolls off-screen
            // Image will reload from disk cache if needed (fast SSD read)
            loadedImage = nil
        }
        .onChange(of: isSelected) { oldValue, newValue in
            if newValue {
                startPulse()
            } else {
                stopPulse()
            }
        }
    }
    
    private func startPulse() {
        withAnimation(
            Animation.easeInOut(duration: config.pulseDuration)
                .repeatForever(autoreverses: true)
        ) {
            pulseScale = 1.0 + config.pulseAmplitude
        }
    }
    
    private func stopPulse() {
        // Cancel any ongoing animation
        withAnimation(.easeOut(duration: 0.15)) {
            pulseScale = 1.0
        }
    }
    
    private func loadImage() {
        // Priority 1: Load from URL if provided
        if let imageURLString = item.imageURL, let url = URL(string: imageURLString) {
            isLoading = true
            loadError = false
            
            Task {
                do {
                    // Use ImageCache instead of direct URLSession - it handles API keys automatically
                    if let image = try await ImageCache.shared.loadImage(from: url) {
                        await MainActor.run {
                            self.loadedImage = image
                            self.isLoading = false
                            self.loadError = false
                        }
                    } else {
                        await MainActor.run {
                            self.isLoading = false
                            self.loadError = true
                        }
                        // Fall back to bundle loading if URL fails
                        if let bundleImage = loadBundleImage() {
                            await MainActor.run {
                                self.loadedImage = bundleImage
                                self.loadError = false
                            }
                        }
                    }
                } catch {
                    print("❌ TileView: Error loading '\(item.displayName)': \(error.localizedDescription)")
                    await MainActor.run {
                        self.isLoading = false
                        self.loadError = true
                    }
                    // Fall back to bundle loading if URL fails
                    if let bundleImage = loadBundleImage() {
                        await MainActor.run {
                            self.loadedImage = bundleImage
                            self.loadError = false
                        }
                    }
                }
            }
            return
        }
        
        // Priority 2: Load from bundle (backward compatible)
        if let bundleImage = loadBundleImage() {
            loadedImage = bundleImage
            isLoading = false
            loadError = false
        } else {
            loadError = true
        }
    }
    
    private func loadBundleImage() -> UIImage? {
        guard let imageName = item.imageName else { return nil }
        
        // Try loading from SampleTiles folder in bundle
        if let imagePath = Bundle.main.path(forResource: imageName, ofType: "png", inDirectory: "SampleTiles"),
           let image = UIImage(contentsOfFile: imagePath) {
            return image
        }
        
        // Try loading directly from main bundle
        if let image = UIImage(named: imageName) {
            return image
        }
        
        // Try with full path including directory
        if let imagePath = Bundle.main.path(forResource: "SampleTiles/\(imageName)", ofType: "png"),
           let image = UIImage(contentsOfFile: imagePath) {
            return image
        }
        
        return nil
    }
}

