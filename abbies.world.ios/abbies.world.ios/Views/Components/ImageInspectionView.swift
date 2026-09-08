//
//  ImageInspectionView.swift
//  abbies.world.ios
//
//  Created on 12/14/25.
//

import SwiftUI

struct ImageInspectionView: View {
    let startImageId: String // ID of the image to start at
    @ObservedObject var viewModel: MainViewModel
    @Environment(\.dismiss) var dismiss
    
    @State private var currentIndex: Int = 0
    @State private var loadedImages: [String: UIImage] = [:]
    @State private var isLoading: Bool = false
    
    // Use filtered images from viewModel (updates when filter changes)
    private var images: [GeneratedImage] {
        viewModel.filteredHistoryImages
    }
    
    private var currentImage: GeneratedImage? {
        guard currentIndex >= 0 && currentIndex < images.count else { return nil }
        return images[currentIndex]
    }
    
    private var currentUIImage: UIImage? {
        guard let image = currentImage else { return nil }
        return loadedImages[image.id]
    }
    
    var body: some View {
        ZStack {
            // Background
            Color.black.ignoresSafeArea()
            
            if images.isEmpty {
                VStack {
                    Text("No images")
                        .foregroundColor(.white)
                        .font(.title2)
                }
            } else {
                ZStack {
                    // Image carousel - full screen with minimal padding
                    TabView(selection: $currentIndex) {
                        ForEach(Array(images.enumerated()), id: \.element.id) { index, image in
                            ZStack {
                                if let uiImage = loadedImages[image.id] {
                                    Image(uiImage: uiImage)
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                                        .padding(.top, 8)
                                        .padding(.bottom, 8)
                                } else {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .onAppear {
                                            loadImage(for: image)
                                        }
                                }
                            }
                            .tag(index)
                        }
                    }
                    .tabViewStyle(.page)
                    .indexViewStyle(.page(backgroundDisplayMode: .always))
                    
                    // Top bar overlay with close button and filter
                    VStack {
                        HStack {
                            Spacer()
                            
                            // Filter toggle
                            Button(action: {
                                viewModel.showFavoritesOnly.toggle()
                                // Update current index to stay on same image if possible
                                if let currentImage = currentImage,
                                   let newIndex = viewModel.filteredHistoryImages.firstIndex(where: { $0.id == currentImage.id }) {
                                    currentIndex = newIndex
                                } else {
                                    // If current image not in filtered list, go to first
                                    currentIndex = 0
                                }
                            }) {
                                Image(systemName: viewModel.showFavoritesOnly ? "heart.fill" : "heart")
                                    .font(.system(size: 20))
                                    .foregroundColor(viewModel.showFavoritesOnly ? .red : .white)
                                    .padding(8)
                                    .background(
                                        Circle()
                                            .fill(Color.black.opacity(0.5))
                                    )
                            }
                            .padding(.trailing, 8)
                            
                            // Close button (top right) - high contrast white on black
                            CloseButton.white() {
                                dismiss()
                            }
                            .padding()
                        }
                        .padding(.top, 8)
                        
                        Spacer()
                    }
                    
                    // Bottom bar with favorite button
                    VStack {
                        Spacer()
                        
                        HStack {
                            Spacer()
                            
                            if let image = currentImage {
                                Button(action: {
                                    viewModel.toggleFavorite(for: image)
                                }) {
                                    Image(systemName: (image.isFavorite ?? false) ? "heart.fill" : "heart")
                                        .font(.system(size: 32))
                                        .foregroundColor((image.isFavorite ?? false) ? .red : .white)
                                        .padding()
                                        .background(
                                            Circle()
                                                .fill(Color.black.opacity(0.5))
                                        )
                                }
                            }
                            
                            Spacer()
                        }
                        .padding(.bottom, 8)
                    }
                }
            }
        }
        .onAppear {
            // Find start index based on startImageId
            if let startIdx = images.firstIndex(where: { $0.id == startImageId }) {
                currentIndex = startIdx
            }
            // Load initial image
            if let image = currentImage {
                loadImage(for: image)
            }
        }
        .onChange(of: images) { oldValue, newValue in
            // When images change (filter toggle), try to maintain current position
            if let currentImage = currentImage,
               let newIndex = newValue.firstIndex(where: { $0.id == currentImage.id }) {
                currentIndex = newIndex
            } else if !newValue.isEmpty {
                currentIndex = 0
            }
        }
        .onChange(of: currentIndex) { oldValue, newValue in
            // Load adjacent images for smooth scrolling
            if newValue > 0 {
                loadImage(for: images[newValue - 1])
            }
            if newValue < images.count - 1 {
                loadImage(for: images[newValue + 1])
            }
            loadImage(for: images[newValue])
            
            // Cleanup: Keep only current + adjacent images (max 5 images)
            cleanupImages(keepIndex: newValue)
        }
    }
    
    private func loadImage(for image: GeneratedImage) {
        // Skip if already loaded
        guard loadedImages[image.id] == nil else { return }
        
        let baseURL = APIClient.shared.baseURL
        let imageURLString = image.url.hasPrefix("http") ? image.url : "\(baseURL)\(image.url)"
        
        guard let url = URL(string: imageURLString) else { return }
        
        Task {
            do {
                if let uiImage = try await ImageCache.shared.loadImage(from: url) {
                    await MainActor.run {
                        loadedImages[image.id] = uiImage
                    }
                }
            } catch {
                print("❌ Error loading image for inspection: \(error.localizedDescription)")
            }
        }
    }
    
    /// Cleanup loaded images dictionary - keep only current + adjacent images
    /// This prevents unbounded memory growth when scrolling through many images
    private func cleanupImages(keepIndex: Int) {
        guard !images.isEmpty else { return }
        
        // Keep current image + 2 adjacent on each side (max 5 images)
        let bufferSize = 2
        let startIndex = max(0, keepIndex - bufferSize)
        let endIndex = min(images.count - 1, keepIndex + bufferSize)
        
        // Collect IDs to keep
        var keepIds = Set<String>()
        for i in startIndex...endIndex {
            keepIds.insert(images[i].id)
        }
        
        // Remove images outside the buffer zone
        let beforeCount = loadedImages.count
        loadedImages = loadedImages.filter { keepIds.contains($0.key) }
        let removedCount = beforeCount - loadedImages.count
        
        if removedCount > 0 {
            print("🧹 ImageInspectionView: Cleaned up \(removedCount) images (kept \(loadedImages.count) in buffer)")
        }
    }
}
