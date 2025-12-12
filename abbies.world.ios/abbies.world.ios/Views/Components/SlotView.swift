//
//  SlotView.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//

import SwiftUI

struct SlotView: View {
    let slotType: String
    let slotIndex: Int
    @Binding var selectedIngredient: Ingredient?
    let onDrop: (Ingredient) -> Void
    @State private var slotImage: UIImage?
    @State private var isLoadingImage = false
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [5]))
                .foregroundColor(.black)
            
            if let ingredient = selectedIngredient {
                VStack(spacing: 8) {
                    // Image or placeholder
                    if let image = slotImage {
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .padding(8)
                    } else if isLoadingImage {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        // Fallback to text
                        Text(ingredient.name)
                            .font(.system(size: 12))
                            .multilineTextAlignment(.center)
                            .padding()
                    }
                }
            } else {
                Text("Slot \(slotIndex + 1) — \(slotType)")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .contentShape(Rectangle())
        .onTapGesture {
            // Clear the slot when tapped
            if selectedIngredient != nil {
                selectedIngredient = nil
            }
        }
        .onChange(of: selectedIngredient) { oldValue, newValue in
            loadImage(for: newValue)
        }
    }
    
    private func loadImage(for ingredient: Ingredient?) {
        guard let ingredient = ingredient,
              let imageURLString = ingredient.imageURL,
              let url = URL(string: imageURLString) else {
            slotImage = nil
            return
        }
        
        // Check cache first
        if let cachedImage = ImageCache.shared.getCachedImage(for: url) {
            self.slotImage = cachedImage
            return
        }
        
        // Load from network
        isLoadingImage = true
        Task {
            do {
                if let loadedImage = try await ImageCache.shared.loadImage(from: url) {
                    await MainActor.run {
                        self.slotImage = loadedImage
                        self.isLoadingImage = false
                    }
                } else {
                    await MainActor.run {
                        self.isLoadingImage = false
                    }
                }
            } catch {
                await MainActor.run {
                    self.isLoadingImage = false
                }
                print("Error loading slot image for \(ingredient.name): \(error)")
            }
        }
    }
}
