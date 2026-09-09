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
                framedTile {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                }
            } else if item.imageURL == nil && item.imageName == nil {
                framedTile {
                    StylePlaceholderTile(
                        styleName: item.displayName,
                        shortDescription: item.shortDescription
                    )
                }
            } else if loadError {
                framedTile {
                    fallbackTile
                }
            } else {
                framedTile {
                    loadingTile
                }
            }
        }
        .frame(width: config.tileWidth, height: config.tileHeight)
        .scaleEffect(isSelected ? config.selectionScaleFactor * pulseScale : 1.0)
        .animation(.easeOut(duration: 0.15), value: isSelected)
        .onAppear {
            loadImage()
            if isSelected {
                startPulse()
            }
        }
        .onDisappear {
            loadedImage = nil
        }
        .onChange(of: isSelected) { oldValue, newValue in
            if newValue {
                startPulse()
            } else {
                stopPulse()
            }
        }
        .onChange(of: item.id) { _, _ in
            loadedImage = nil
            loadImage()
        }
    }
    
    @ViewBuilder
    private func framedTile<Inner: View>(@ViewBuilder inner: @escaping () -> Inner) -> some View {
        let size = CGSize(width: config.tileWidth, height: config.tileHeight)
        if config.tileChrome == .halloweenSticker {
            HalloweenTileChrome(
                title: item.displayName,
                isSelected: isSelected,
                size: size,
                cornerRadius: config.cornerRadius
            ) {
                inner()
            }
        } else {
            inner()
                .frame(width: config.tileWidth, height: config.tileHeight)
                .clipped()
                .cornerRadius(config.cornerRadius)
                .overlay(
                    RoundedRectangle(cornerRadius: config.cornerRadius)
                        .stroke(
                            config.selectionBorderColor,
                            lineWidth: isSelected ? config.selectionBorderWidth : 0
                        )
                )
                .overlay(alignment: .topTrailing) {
                    if let favorite = isFavorite, onFavoriteTap != nil {
                        Button(action: { onFavoriteTap?() }) {
                            Image(systemName: favorite ? "heart.fill" : "heart")
                                .font(.system(size: 16))
                                .foregroundColor(favorite ? .red : .white)
                                .padding(6)
                                .background(Circle().fill(Color.black.opacity(0.5)))
                        }
                        .padding(6)
                    }
                }
        }
    }
    
    private var loadingTile: some View {
        ZStack {
            if let loadingImage = UIImage(named: "under_construction") {
                Image(uiImage: loadingImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                Color.gray.opacity(0.3)
            }
            Color.black.opacity(0.3)
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
            }
            .padding()
        }
    }
    
    private var fallbackTile: some View {
        ZStack {
            if let fallbackImage = UIImage(named: "under_construction") {
                Image(uiImage: fallbackImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                Color.gray.opacity(0.3)
            }
            LinearGradient(
                gradient: Gradient(colors: [Color.clear, Color.black.opacity(0.7)]),
                startPoint: .center,
                endPoint: .bottom
            )
            VStack {
                Spacer()
                Text("UNDER CONSTRUCTION")
                    .font(.system(size: min(config.tileWidth * 0.12, 14), weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.9), radius: 3, x: 0, y: 2)
                    .padding(.bottom, 8)
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
        if let bundleImage = loadBundleImage() {
            loadedImage = bundleImage
            isLoading = false
            loadError = false
            return
        }
        
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
        guard let imageName = item.imageName, !imageName.isEmpty else { return nil }
        
        if imageName.contains("/"), let packed = MediaPackImageLoader.image(named: imageName) {
            return packed
        }
        
        if let packed = MediaPackImageLoader.image(subdirectory: "", stem: imageName) {
            return packed
        }
        
        // Try loading from SampleTiles folder in bundle
        if let imagePath = Bundle.main.path(forResource: imageName, ofType: "png", inDirectory: "SampleTiles"),
           let image = UIImage(contentsOfFile: imagePath) {
            return image
        }
        
        // Try loading directly from main bundle
        if let image = UIImage(named: imageName) {
            return image
        }
        
        return nil
    }
}

