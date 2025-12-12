//
//  TileView.swift
//  SwiftCarousel
//
//  Created by Evan Robinson on 12/11/25.
//

import SwiftUI

struct TileView: View {
    let item: CarouselItem
    let config: CarouselConfig
    let isSelected: Bool
    
    @State private var pulseScale: CGFloat = 1.0
    @State private var loadedImage: UIImage? = nil
    @State private var isLoading: Bool = false
    @State private var loadError: Bool = false
    
    var body: some View {
        Group {
            if let image = loadedImage {
                // Successfully loaded image
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
            } else {
                // Loading state or placeholder
                RoundedRectangle(cornerRadius: config.cornerRadius)
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: config.tileWidth, height: config.tileHeight)
                    .overlay(
                        VStack(spacing: 8) {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                            } else {
                                Image(systemName: loadError ? "exclamationmark.triangle" : "photo")
                                    .font(.largeTitle)
                                    .foregroundColor(loadError ? .orange : .gray)
                            }
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
        .onAppear {
            loadImage()
            if isSelected {
                startPulse()
            }
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
                    let (data, _) = try await URLSession.shared.data(from: url)
                    if let image = UIImage(data: data) {
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
                    }
                } catch {
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

