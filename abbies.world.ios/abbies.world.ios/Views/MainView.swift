//
//  MainView.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//

import SwiftUI

struct MainView: View {
    @StateObject private var viewModel = MainViewModel()
    @State private var showGamesDialog = false
    @State private var showWaypointGame = false
    @State private var showSettings = false
    
    var body: some View {
        GeometryReader { geometry in
            let _ = print("MainView rendering - size: \(geometry.size)")
            ZStack {
                // Background Image - loads from Flask server with caching, fallback to bundled
                Group {
                    if let backgroundImage = viewModel.backgroundImage {
                        Image(uiImage: backgroundImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else {
                        Color.white
                    }
                }
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
                
                // Main Content - Two Column Layout (header removed, UI re-centered)
                HStack(spacing: 0) {
                    // Column 1 (~55%) - Expanded carousel rows
                    CombinedColumnView(
                        friendIndex: $viewModel.friendIndex,
                        outfitIndex: $viewModel.outfitIndex,
                        placeIndex: $viewModel.placeIndex,
                        friendItems: viewModel.friendItems,
                        outfitItems: viewModel.outfitItems,
                        placeItems: viewModel.placeItems,
                        onFriendSelected: { viewModel.selectFriend($0) },
                        onOutfitSelected: { viewModel.selectOutfit($0) },
                        onPlaceSelected: { viewModel.selectPlace($0) }
                    )
                    .frame(width: geometry.size.width * 0.55)
                    
                    // Column 2 (~45%) - Preview & History
                    RightColumnView(
                        viewModel: viewModel,
                        historyImages: viewModel.historyImages,
                        isLoading: viewModel.isLoadingHistory
                    )
                    .frame(width: geometry.size.width * 0.45)
                }
            }
            .overlay {
                // Error message
                if let errorMessage = viewModel.errorMessage {
                    VStack {
                        Text(errorMessage)
                            .padding()
                            .background(Color.red.opacity(0.9))
                            .foregroundColor(.white)
                            .cornerRadius(8)
                            .padding()
                        
                        Button("Dismiss") {
                            viewModel.errorMessage = nil
                        }
                        .padding()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.black.opacity(0.3))
                }
                
                // Top right buttons (Settings and Games)
                VStack {
                    HStack {
                        Spacer()
                        // Settings button
                        Button(action: {
                            showSettings = true
                        }) {
                            Image(systemName: "gearshape.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.white)
                                .padding(12)
                                .background(Color.gray.opacity(0.8))
                                .clipShape(Circle())
                                .shadow(radius: 5)
                        }
                        .padding(.top, 16)
                        .padding(.trailing, 8)
                        
                        // Games button
                        Button(action: {
                            showGamesDialog = true
                        }) {
                            Image(systemName: "gamecontroller.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.white)
                                .padding(12)
                                .background(Color.blue.opacity(0.8))
                                .clipShape(Circle())
                                .shadow(radius: 5)
                        }
                        .padding(.top, 16)
                        .padding(.trailing, 16)
                    }
                    Spacer()
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(onDismiss: {
                    showSettings = false
                })
            }
            .sheet(isPresented: $showGamesDialog) {
                GamesDialogView(showWaypointGame: $showWaypointGame, onDismiss: {
                    showGamesDialog = false
                })
            }
            .fullScreenCover(isPresented: $showWaypointGame) {
                WaypointNavigationView(
                    onDismiss: {
                        showWaypointGame = false
                    },
                    onComplete: {
                        showWaypointGame = false
                    }
                )
            }
        }
        .ignoresSafeArea()
        .toast($viewModel.toastMessage)
        .onAppear {
            print("MainView: onAppear called")
            viewModel.loadData()
        }
    }
}

struct HeaderView: View {
    var body: some View {
        // Header content removed - labels and settings button hidden
        Color.clear
    }
}

// Helper struct for left column height calculations
struct LeftColumnCalculations {
        let totalHeight: CGFloat
        let outerTopPadding: CGFloat
        let outerBottomPadding: CGFloat
        let outerPaddingTotal: CGFloat
        let spacingBetweenCarousels: CGFloat
        let numberOfSpacings: CGFloat
        let totalSpacing: CGFloat
        let carouselPadding: CGFloat
        let numberOfCarousels: CGFloat
        let totalCarouselPadding: CGFloat
        let totalReserved: CGFloat
        let availableForFrames: CGFloat
        let carouselFrameHeight: CGFloat
        let carouselTotalHeight: CGFloat
        let calculatedTotalHeight: CGFloat
        
        static func calculate(for geometryHeight: CGFloat) -> LeftColumnCalculations {
            let outerTopPadding: CGFloat = 16
            let outerBottomPadding: CGFloat = 16
            let outerPaddingTotal = outerTopPadding + outerBottomPadding
            let spacingBetweenCarousels: CGFloat = 16
            let numberOfSpacings: CGFloat = 2 // between 3 carousels
            let totalSpacing = spacingBetweenCarousels * numberOfSpacings
            let carouselPadding: CGFloat = 16 // 8 top + 8 bottom
            let numberOfCarousels: CGFloat = 3
            let totalCarouselPadding = carouselPadding * numberOfCarousels
            let totalReserved = outerPaddingTotal + totalSpacing + totalCarouselPadding
            let availableForFrames = geometryHeight - totalReserved
            let carouselFrameHeight = availableForFrames / numberOfCarousels
            let carouselTotalHeight = carouselFrameHeight + carouselPadding
            let calculatedTotalHeight = outerTopPadding + (carouselTotalHeight * numberOfCarousels) + totalSpacing + outerBottomPadding
            
            return LeftColumnCalculations(
                totalHeight: geometryHeight,
                outerTopPadding: outerTopPadding,
                outerBottomPadding: outerBottomPadding,
                outerPaddingTotal: outerPaddingTotal,
                spacingBetweenCarousels: spacingBetweenCarousels,
                numberOfSpacings: numberOfSpacings,
                totalSpacing: totalSpacing,
                carouselPadding: carouselPadding,
                numberOfCarousels: numberOfCarousels,
                totalCarouselPadding: totalCarouselPadding,
                totalReserved: totalReserved,
                availableForFrames: availableForFrames,
                carouselFrameHeight: carouselFrameHeight,
                carouselTotalHeight: carouselTotalHeight,
                calculatedTotalHeight: calculatedTotalHeight
            )
        }
        
        func printDebug() {
            print("=== LEFT COLUMN CALCULATIONS ===")
            print("Total Height: \(totalHeight)")
            print("Outer Top Padding: \(outerTopPadding)")
            print("Outer Bottom Padding: \(outerBottomPadding)")
            print("Outer Padding Total: \(outerPaddingTotal)")
            print("Spacing Between Carousels: \(spacingBetweenCarousels)")
            print("Number of Spacings: \(numberOfSpacings)")
            print("Total Spacing: \(totalSpacing)")
            print("Carousel Padding (per carousel): \(carouselPadding)")
            print("Number of Carousels: \(numberOfCarousels)")
            print("Total Carousel Padding: \(totalCarouselPadding)")
            print("Total Reserved: \(totalReserved)")
            print("Available for Frames: \(availableForFrames)")
            print("Carousel Frame Height: \(carouselFrameHeight)")
            print("Carousel Total Height (frame + padding): \(carouselTotalHeight)")
            print("Calculated Total Height: \(calculatedTotalHeight)")
            print("================================")
    }
}

struct CombinedColumnView: View {
    @Binding var friendIndex: Int
    @Binding var outfitIndex: Int
    @Binding var placeIndex: Int
    let friendItems: [Ingredient]
    let outfitItems: [Ingredient]
    let placeItems: [Ingredient]
    let onFriendSelected: (Ingredient) -> Void
    let onOutfitSelected: (Ingredient) -> Void
    let onPlaceSelected: (Ingredient) -> Void
    
    var body: some View {
        GeometryReader { geometry in
            let calculations = LeftColumnCalculations.calculate(for: geometry.size.height)
            let carouselFrameHeight = calculations.carouselFrameHeight
            
            VStack(spacing: 16) {
                // Row 1: Friends carousel (expanded) with rounded container
                CarouselView(
                    title: "Friend",
                    items: friendItems,
                    selectedIndex: $friendIndex,
                    onItemSelected: onFriendSelected
                )
                .frame(height: carouselFrameHeight)
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.3))
                )
                
                // Row 2: Outfits carousel (expanded) with rounded container
                CarouselView(
                    title: "Outfit",
                    items: outfitItems,
                    selectedIndex: $outfitIndex,
                    onItemSelected: onOutfitSelected
                )
                .frame(height: carouselFrameHeight)
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.3))
                )
                
                // Row 3: Places carousel (expanded) with rounded container
                CarouselView(
                    title: "Place",
                    items: placeItems,
                    selectedIndex: $placeIndex,
                    onItemSelected: onPlaceSelected
                )
                .frame(height: carouselFrameHeight)
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.3))
                )
            }
            .padding(.leading, 16)
            .padding(.top, 16)
            .padding(.bottom, 16)
            .onAppear {
                calculations.printDebug()
            }
        }
    }
}

struct RightColumnView: View {
    @ObservedObject var viewModel: MainViewModel
    let historyImages: [GeneratedImage]
    let isLoading: Bool
    
    @State private var selectedHistoryIndex: Int? = nil
    
    // Convert GeneratedImage to CarouselItem for SwiftCarousel
    private var historyCarouselItems: [CarouselItem] {
        historyImages.prefix(20).map { image in
            // Construct full URL from relative URL
            let baseURL = APIClient.shared.baseURL
            let imageURLString = image.url.hasPrefix("http") ? image.url : "\(baseURL)\(image.url)"
            
            return CarouselItem(
                id: image.id,
                imageURL: imageURLString,
                displayName: image.filename.replacingOccurrences(of: ".png", with: "").replacingOccurrences(of: "_", with: " ").capitalized
            )
        }
    }
    
    // Carousel configuration for history
    private var historyCarouselConfig: CarouselConfig {
        var config = CarouselConfig.default()
        config.tileWidth = 120
        config.tileHeight = 120
        config.tileSpacing = 12
        config.horizontalPadding = 16
        return config
    }
    
// Helper struct for right column height calculations
struct RightColumnCalculations {
        let totalHeight: CGFloat
        let outerPadding: CGFloat
        let spacingBetweenSections: CGFloat
        let sectionPadding: CGFloat
        let numberOfSections: CGFloat
        let totalSectionPadding: CGFloat
        let totalReserved: CGFloat
        let carouselFrameHeight: CGFloat
        let historyFrameHeight: CGFloat
        let historyTotalHeight: CGFloat
        let availableForPreview: CGFloat
        let previewFrameHeight: CGFloat
        let previewTotalHeight: CGFloat
        let calculatedTotalHeight: CGFloat
        
        static func calculate(for geometryHeight: CGFloat, carouselFrameHeight: CGFloat) -> RightColumnCalculations {
            let outerPadding: CGFloat = 16
            let spacingBetweenSections: CGFloat = 16
            let sectionPadding: CGFloat = 16 // 8 top + 8 bottom
            let numberOfSections: CGFloat = 2 // preview and history
            let totalSectionPadding = sectionPadding * numberOfSections
            
            // History should match one carousel TOTAL height (frame + padding) = 320.0
            // Left carousel total = carouselFrameHeight (304) + padding (16) = 320
            let leftCarouselTotalHeight = carouselFrameHeight + 16
            let historyTotalHeight = leftCarouselTotalHeight
            let historyFrameHeight = historyTotalHeight - sectionPadding // 320 - 16 = 304
            
            // Calculate what we need: outer top + preview + spacing + history + outer bottom = total height
            // So: preview total = total height - outer top - spacing - history total - outer bottom
            // preview total = geometryHeight - outerPadding - spacingBetweenSections - historyTotalHeight - outerPadding
            let previewTotalHeight = geometryHeight - (outerPadding * 2) - spacingBetweenSections - historyTotalHeight
            let previewFrameHeight = previewTotalHeight - sectionPadding
            let availableForPreview = previewFrameHeight
            
            // Total reserved for verification
            let totalReserved = (outerPadding * 2) + spacingBetweenSections + totalSectionPadding
            
            // Verify calculation
            let calculatedTotalHeight = outerPadding + previewTotalHeight + spacingBetweenSections + historyTotalHeight + outerPadding
            
            return RightColumnCalculations(
                totalHeight: geometryHeight,
                outerPadding: outerPadding,
                spacingBetweenSections: spacingBetweenSections,
                sectionPadding: sectionPadding,
                numberOfSections: numberOfSections,
                totalSectionPadding: totalSectionPadding,
                totalReserved: totalReserved,
                carouselFrameHeight: carouselFrameHeight,
                historyFrameHeight: historyFrameHeight,
                historyTotalHeight: historyTotalHeight,
                availableForPreview: availableForPreview,
                previewFrameHeight: previewFrameHeight,
                previewTotalHeight: previewTotalHeight,
                calculatedTotalHeight: calculatedTotalHeight
            )
        }
        
        func printDebug() {
            print("=== RIGHT COLUMN CALCULATIONS ===")
            print("Total Height: \(totalHeight)")
            print("Outer Padding (top + bottom): \(outerPadding * 2)")
            print("Spacing Between Sections: \(spacingBetweenSections)")
            print("Section Padding (per section): \(sectionPadding)")
            print("Number of Sections: \(numberOfSections)")
            print("Total Section Padding: \(totalSectionPadding)")
            print("Total Reserved: \(totalReserved)")
            print("Carousel Frame Height (from left): \(carouselFrameHeight)")
            print("History Frame Height: \(historyFrameHeight)")
            print("History Total Height (frame + padding): \(historyTotalHeight)")
            print("Available for Preview: \(availableForPreview)")
            print("Preview Frame Height: \(previewFrameHeight)")
            print("Preview Total Height (frame + padding): \(previewTotalHeight)")
            print("Calculated Total Height: \(calculatedTotalHeight)")
            print("=================================")
        }
    }
    
    var body: some View {
        GeometryReader { geometry in
            // Get carousel frame height from left column calculation
            let leftCalculations = LeftColumnCalculations.calculate(for: geometry.size.height)
            let carouselFrameHeight = leftCalculations.carouselFrameHeight
            let rightCalculations = RightColumnCalculations.calculate(for: geometry.size.height, carouselFrameHeight: carouselFrameHeight)
            let historyFrameHeight = rightCalculations.historyFrameHeight
            let previewFrameHeight = rightCalculations.previewFrameHeight
            
            VStack(spacing: 16) {
                // Preview Image and Generation Button with rounded container
                VStack(spacing: 16) {
                    ZStack {
                        if let image = viewModel.previewImage {
                            Image(uiImage: image)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                        } else {
                            Text("Preview Image")
                                .foregroundColor(.gray)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    
                    // Generation Button
                    GenerationButton(
                        state: viewModel.buttonState,
                        action: {
                            viewModel.startImageGeneration()
                        }
                    )
                }
                .frame(height: previewFrameHeight)
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.3))
                )
                
                // History with rounded container
                VStack(alignment: .leading, spacing: 8) {
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else if historyImages.isEmpty {
                        Text("No images yet")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        Carousel(
                            items: historyCarouselItems,
                            selectedIndex: $selectedHistoryIndex,
                            config: historyCarouselConfig,
                            onSelect: { carouselItem in
                                // Handle history item selection if needed
                                print("History item selected: \(carouselItem.displayName)")
                            }
                        )
                    }
                }
                .frame(height: historyFrameHeight)
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.3))
                )
            }
            .padding(16)
            .onAppear {
                print("🔍 RightColumnView appeared - printing right column calculations...")
                rightCalculations.printDebug()
            }
        }
    }
}


