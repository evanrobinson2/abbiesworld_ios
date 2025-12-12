//
//  CarouselView.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//  Updated to use SwiftCarousel library
//

import SwiftUI

struct CarouselView: View {
    let title: String
    let items: [Ingredient]
    @Binding var selectedIndex: Int
    let onItemSelected: (Ingredient) -> Void
    
    // Convert Ingredient to CarouselItem for SwiftCarousel
    private var carouselItems: [CarouselItem] {
        items.map { ingredient in
            CarouselItem(
                id: ingredient.id,
                imageURL: ingredient.imageURL,
                displayName: ingredient.name
            )
        }
    }
    
    // Binding for SwiftCarousel (uses Int? instead of Int)
    private var selectedIndexBinding: Binding<Int?> {
        Binding(
            get: { selectedIndex >= 0 && selectedIndex < items.count ? selectedIndex : nil },
            set: { newValue in
                if let newValue = newValue, newValue >= 0 && newValue < items.count {
                    selectedIndex = newValue
                } else {
                    selectedIndex = -1
                }
            }
        )
    }
    
    // Carousel configuration - larger tiles for expanded rows
    private var carouselConfig: CarouselConfig {
        var config = CarouselConfig.default()
        config.tileWidth = 280
        config.tileHeight = 280
        config.tileSpacing = 16
        config.horizontalPadding = 20
        return config
    }
    
    var body: some View {
            // Use SwiftCarousel for horizontal scrolling
            Carousel(
                items: carouselItems,
                selectedIndex: selectedIndexBinding,
                config: carouselConfig,
                onSelect: { carouselItem in
                    // Find the corresponding Ingredient and call the callback
                    if let index = items.firstIndex(where: { $0.id == carouselItem.id }) {
                        selectedIndex = index
                        onItemSelected(items[index])
                    }
                }
            )
    }
}

