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
    var mediaPack: MediaPack = .classic
    
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
            
            // Fit each tile inside its row after accounting for the selected
            // tile's 1.05 scale, 5% pulse, border padding, and carveout insets.
            // This keeps the 180pt portrait size while reducing landscape
            // tiles to about 140pt on an 11-inch iPad.
            let maximumSelectedScale: CGFloat = 1.05 * 1.05
            let borderPadding: CGFloat = 6
            let carveoutInsets: CGFloat = mediaPack == .classic ? 16 : 12
            let availableTileHeight = max(0, carouselFrameHeight - borderPadding - carveoutInsets)
            let tileSize = min(180, max(72, availableTileHeight / maximumSelectedScale))
            
            VStack(spacing: spacing) {
                carouselRow(
                    title: mediaPack.friendRowTitle,
                    items: friendItems,
                    selectedIndex: $friendIndex,
                    onItemSelected: onFriendSelected,
                    tileSize: tileSize,
                    height: carouselFrameHeight
                )
                
                carouselRow(
                    title: mediaPack.outfitRowTitle,
                    items: outfitItems,
                    selectedIndex: $outfitIndex,
                    onItemSelected: onOutfitSelected,
                    tileSize: tileSize,
                    height: carouselFrameHeight
                )
                
                carouselRow(
                    title: mediaPack.placeRowTitle,
                    items: placeItems,
                    selectedIndex: $placeIndex,
                    onItemSelected: onPlaceSelected,
                    tileSize: tileSize,
                    height: carouselFrameHeight
                )
                
                carouselRow(
                    title: mediaPack.styleRowTitle,
                    items: styleItems,
                    selectedIndex: $styleIndex,
                    onItemSelected: onStyleSelected,
                    tileSize: tileSize,
                    height: carouselFrameHeight,
                    styleShortDescriptions: styleShortDescriptions
                )
            }
            .padding(.leading, 16)
            .padding(.trailing, 16)
            .padding(.top, padding)
            .padding(.bottom, padding)
        }
    }
    
    private func carouselRow(
        title: String,
        items: [Ingredient],
        selectedIndex: Binding<Int>,
        onItemSelected: @escaping (Ingredient) -> Void,
        tileSize: CGFloat,
        height: CGFloat,
        styleShortDescriptions: [String: String]? = nil
    ) -> some View {
        CarouselCarveout(mediaPack: mediaPack) {
            CarouselView(
                title: title,
                items: items,
                selectedIndex: selectedIndex,
                onItemSelected: onItemSelected,
                styleShortDescriptions: styleShortDescriptions,
                customTileSize: tileSize,
                mediaPack: mediaPack
            )
        }
        .frame(height: height)
        .accessibilityLabel(title)
    }
}

