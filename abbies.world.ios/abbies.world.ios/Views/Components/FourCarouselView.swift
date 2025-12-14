//
//  FourCarouselView.swift
//  abbies.world.ios
//
//  Four-carousel layout with style selection (4th carousel)
//

import SwiftUI

struct FourCarouselView: View {
    @Binding var friendIndex: Int
    @Binding var outfitIndex: Int
    @Binding var placeIndex: Int
    @Binding var styleIndex: Int
    let friendItems: [Ingredient]
    let outfitItems: [Ingredient]
    let placeItems: [Ingredient]
    let styleItems: [Ingredient]
    let onFriendSelected: (Ingredient) -> Void
    let onOutfitSelected: (Ingredient) -> Void
    let onPlaceSelected: (Ingredient) -> Void
    let onStyleSelected: (Ingredient) -> Void
    
    // TEMPORARY: Style short descriptions for placeholder tile overlays
    // Remove this parameter when we have actual style assets
    var styleShortDescriptions: [String: String]? = nil
    
    var body: some View {
        GeometryReader { geometry in
            // Calculate heights - need to fit 4 carousels + spacing
            // Reduced spacing/padding to maximize available space for tiles
            let totalHeight = geometry.size.height
            let padding: CGFloat = 8  // Reduced from 16 to maximize space
            let spacing: CGFloat = 8  // Reduced from 12 to maximize space
            let totalSpacing = padding * 2 + spacing * 3 // Top/bottom padding + 3 gaps between 4 carousels
            
            // Calculate carousel frame height to fit 4 rows
            let carouselFrameHeight = (totalHeight - totalSpacing) / 4
            
            // Calculate optimal tile size to fit 4 carousels on screen
            // Based on calculations: 180pt fits with reduced spacing
            // Accounts for: tile size + selection scale (1.05x) + pulse (0.05) + border (3pt)
            let tileSize: CGFloat = 180
            
            VStack(spacing: spacing) {
                // Row 1: Friends carousel (smaller tiles)
                CarouselView(
                    title: "Friend",
                    items: friendItems,
                    selectedIndex: $friendIndex,
                    onItemSelected: onFriendSelected,
                    customTileSize: tileSize
                )
                .frame(height: carouselFrameHeight)
                .padding(4)  // Reduced from 8 to maximize tile space
                .background(
                    RoundedRectangle(cornerRadius: 12)  // Slightly smaller radius
                        .fill(Color.white.opacity(0.3))
                )
                
                // Row 2: Outfits carousel (smaller tiles)
                CarouselView(
                    title: "Outfit",
                    items: outfitItems,
                    selectedIndex: $outfitIndex,
                    onItemSelected: onOutfitSelected,
                    customTileSize: tileSize
                )
                .frame(height: carouselFrameHeight)
                .padding(4)  // Reduced from 8 to maximize tile space
                .background(
                    RoundedRectangle(cornerRadius: 12)  // Slightly smaller radius
                        .fill(Color.white.opacity(0.3))
                )
                
                // Row 3: Places carousel (smaller tiles)
                CarouselView(
                    title: "Place",
                    items: placeItems,
                    selectedIndex: $placeIndex,
                    onItemSelected: onPlaceSelected,
                    customTileSize: tileSize
                )
                .frame(height: carouselFrameHeight)
                .padding(4)  // Reduced from 8 to maximize tile space
                .background(
                    RoundedRectangle(cornerRadius: 12)  // Slightly smaller radius
                        .fill(Color.white.opacity(0.3))
                )
                
                // Row 4: Style carousel (bottom-aligned with preview drawer, smaller tiles)
                // TEMPORARY: Pass styleShortDescriptions for placeholder overlays
                // Remove this parameter when we have actual style assets
                CarouselView(
                    title: "Style",
                    items: styleItems,
                    selectedIndex: $styleIndex,
                    onItemSelected: onStyleSelected,
                    styleShortDescriptions: styleShortDescriptions,
                    customTileSize: tileSize
                )
                .frame(height: carouselFrameHeight)
                .padding(4)  // Reduced from 8 to maximize tile space
                .background(
                    RoundedRectangle(cornerRadius: 12)  // Slightly smaller radius
                        .fill(Color.white.opacity(0.3))
                )
            }
            .padding(.leading, 16)
            .padding(.trailing, 16)
            .padding(.top, padding)
            .padding(.bottom, padding)
        }
    }
}

