//
//  Carousel.swift
//  SwiftCarousel
//
//  Created by Evan Robinson on 12/11/25.
//

import SwiftUI

struct Carousel: View {
    let items: [CarouselItem]
    @Binding var selectedIndex: Int?
    let config: CarouselConfig
    var onSelect: ((CarouselItem) -> Void)? = nil
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: config.tileSpacing) {
                // Leading padding
                Spacer()
                    .frame(width: config.horizontalPadding)
                
                // Tiles
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    Button(action: {
                        handleTap(at: index, item: item)
                    }) {
                        TileView(
                            item: item,
                            config: config,
                            isSelected: selectedIndex == index
                        )
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                
                // Trailing padding
                Spacer()
                    .frame(width: config.horizontalPadding)
            }
            .padding(.vertical, calculateVerticalPaddingForScale())
        }
    }
    
    private func handleTap(at index: Int, item: CarouselItem) {
        // If tapping the already selected item, deselect it
        if selectedIndex == index {
            selectedIndex = nil
            return
        }
        
        // Update selection
        selectedIndex = index
        onSelect?(item)
    }
    
    // Calculate vertical padding needed inside ScrollView to prevent clipping
    private func calculateVerticalPaddingForScale() -> CGFloat {
        // Scale grows from center, so growth in each direction = (scale - 1) * height / 2
        // But we need to account for the maximum scale (with pulse)
        let maxPulseScale = config.selectionScaleFactor * (1.0 + config.pulseAmplitude)
        let maxGrowth = (maxPulseScale - 1.0) * config.tileHeight / 2.0
        
        // Also need space for border (drawn outside)
        let borderSpace = config.selectionBorderWidth
        
        // Add existing vertical padding
        let existingPadding = config.verticalPadding
        
        // Total padding needed
        return maxGrowth + borderSpace + existingPadding
    }
}

