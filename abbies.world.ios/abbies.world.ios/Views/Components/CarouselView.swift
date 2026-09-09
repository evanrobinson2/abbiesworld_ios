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
    
    // TEMPORARY: Optional mapping for style short descriptions
    // Remove this parameter when we have actual style assets
    var styleShortDescriptions: [String: String]? = nil
    
    // Optional custom tile size (for 4-carousel view to fit on screen)
    var customTileSize: CGFloat? = nil
    var mediaPack: MediaPack = .classic
    
    // Convert Ingredient to CarouselItem for SwiftCarousel
    private var carouselItems: [CarouselItem] {
        return items.map { ingredient in
            // TEMPORARY: For style items (art_style category), include short description
            // This is for placeholder tile overlays until we have actual assets
            // Remove the shortDescription parameter when assets are available
            let shortDesc: String? = (ingredient.category == "art_style") 
                ? styleShortDescriptions?[ingredient.id] 
                : nil
            
            return CarouselItem(
                id: ingredient.id,
                imageName: ingredient.imageName,
                imageURL: ingredient.imageURL,
                displayName: ingredient.name,
                shortDescription: shortDesc
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
    // Use custom size if provided (for 4-carousel view), otherwise default to 280
    private var carouselConfig: CarouselConfig {
        var config = CarouselConfig.default()
        let tileSize = customTileSize ?? 280 // Default 280, smaller for 4-carousel view
        config.tileWidth = tileSize
        config.tileHeight = tileSize
        config.tileSpacing = mediaPack == .halloween ? 18 : 16
        config.horizontalPadding = 20
        config.cornerRadius = mediaPack == .halloween ? 22 : 8
        config.selectionBorderColor = mediaPack == .halloween
            ? Color(red: 0.98, green: 0.52, blue: 0.16)
            : .blue
        config.tileChrome = mediaPack == .halloween ? .halloweenSticker : .plain
        return config
    }
    
    var body: some View {
            // Use SwiftCarousel for horizontal scrolling
            Carousel(
                items: carouselItems,
                selectedIndex: selectedIndexBinding,
                config: carouselConfig,
                onSelect: { carouselItem in
                    // Find the corresponding Ingredient in items and call the callback
                    if let index = items.firstIndex(where: { $0.id == carouselItem.id }) {
                        selectedIndex = index
                        onItemSelected(items[index])
                    }
                }
            )
    }
}

