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
    // Text-friendly test hook: pass -launchBalloonPop to open the game directly.
    @State private var showGoonPopper =
        ProcessInfo.processInfo.arguments.contains("-launchBalloonPop") ||
        ProcessInfo.processInfo.arguments.contains("-autoPlayBalloonPop")
    // Text-friendly test hook: pass -launchPictureCarver to open it directly.
    @State private var showPictureCarver =
        ProcessInfo.processInfo.arguments.contains("-launchPictureCarver") ||
        ProcessInfo.processInfo.arguments.contains("-autoCarvePicture")
    // Text-friendly test hooks for the Dino Picnic vertical slice.
    @State private var showDinoPicnic =
        ProcessInfo.processInfo.arguments.contains("-launchDinoPicnic") ||
        ProcessInfo.processInfo.arguments.contains("-autoPlayDinoPicnic")
    // Memory Game temporarily disabled
    // @State private var showMemoryGame = false
    @State private var showSettings = false
    @State private var showMusicPlayer = false
    @State private var isDrawerOpen = false
    
    private var creationStatusSteps: [CreationStatusStep] {
        var steps = [
            CreationStatusStep(
                id: "friend",
                title: viewModel.mediaPack.friendRowTitle,
                systemImage: "person.2.fill",
                isComplete: viewModel.friendIndex >= 0
            ),
            CreationStatusStep(
                id: "outfit",
                title: viewModel.mediaPack.outfitRowTitle,
                systemImage: "tshirt.fill",
                isComplete: viewModel.outfitIndex >= 0
            ),
            CreationStatusStep(
                id: "place",
                title: viewModel.mediaPack.placeRowTitle,
                systemImage: "map.fill",
                isComplete: viewModel.placeIndex >= 0
            )
        ]

        if viewModel.mediaPack == .halloween || viewModel.viewMode == .fourCarousel {
            steps.append(
                CreationStatusStep(
                    id: "style",
                    title: viewModel.mediaPack.styleRowTitle,
                    systemImage: "paintpalette.fill",
                    isComplete: viewModel.styleIndex >= 0
                )
            )
        }

        return steps
    }

    private var creationStatus: MainCreationStatusBar.Status {
        if viewModel.isCreatingImage {
            return .creating
        }
        if let generationError = viewModel.imageGenerationError, !generationError.isEmpty {
            return .error
        }
        if viewModel.isGenerationComplete {
            return .complete
        }
        if viewModel.isLoadingIngredients {
            return .loading
        }
        if viewModel.allSelectionsReady {
            return .ready
        }
        return .choosing
    }
    
    var body: some View {
        GeometryReader { geometry in
            let topSafeArea = max(geometry.safeAreaInsets.top, 24)
            let topChromeHeight = topSafeArea + 60

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
                
                // Main Content - Full-width carousels with overlay drawer
                ZStack(alignment: .trailing) {
                    // Carousels - Full width (conditional based on view mode)
                    Group {
                        if viewModel.mediaPack == .halloween || viewModel.viewMode == .fourCarousel {
                            FourCarouselView(
                                friendIndex: $viewModel.friendIndex,
                                outfitIndex: $viewModel.outfitIndex,
                                placeIndex: $viewModel.placeIndex,
                                styleIndex: $viewModel.styleIndex,
                                friendItems: viewModel.friendItems,
                                outfitItems: viewModel.outfitItems,
                                placeItems: viewModel.placeItems,
                                styleItems: viewModel.styleItems,
                                onFriendSelected: { viewModel.selectFriend($0) },
                                onOutfitSelected: { viewModel.selectOutfit($0) },
                                onPlaceSelected: { viewModel.selectPlace($0) },
                                onStyleSelected: { viewModel.selectStyle($0) },
                                styleShortDescriptions: viewModel.styleShortDescriptions.isEmpty ? nil : viewModel.styleShortDescriptions,
                                mediaPack: viewModel.mediaPack
                            )
                        } else {
                            CombinedColumnView(
                                friendIndex: $viewModel.friendIndex,
                                outfitIndex: $viewModel.outfitIndex,
                                placeIndex: $viewModel.placeIndex,
                                friendItems: viewModel.friendItems,
                                outfitItems: viewModel.outfitItems,
                                placeItems: viewModel.placeItems,
                                onFriendSelected: { viewModel.selectFriend($0) },
                                onOutfitSelected: { viewModel.selectOutfit($0) },
                                onPlaceSelected: { viewModel.selectPlace($0) },
                                mediaPack: viewModel.mediaPack
                            )
                        }
                    }
                    .frame(
                        width: geometry.size.width,
                        height: max(0, geometry.size.height - topChromeHeight)
                    )
                    .offset(y: topChromeHeight / 2)
                    .opacity(isDrawerOpen ? 0.7 : 1.0)
                    .blur(radius: isDrawerOpen ? 2 : 0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.8), value: isDrawerOpen)
                    
                    // Backdrop dimming overlay
                    if isDrawerOpen {
                        Color.black.opacity(0.2)
                            .ignoresSafeArea()
                            .onTapGesture {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                    isDrawerOpen = false
                                }
                            }
                    }
                    
                    // Drawer - Overlay from right
                    DrawerView(
                        isOpen: $isDrawerOpen,
                        width: geometry.size.width * 0.45
                    ) {
                        RightColumnView(
                            viewModel: viewModel,
                            historyImages: viewModel.historyImages,
                            isLoading: viewModel.isLoadingHistory
                        )
                    }
                    
                    // Drawer handle - Always visible
                    DrawerHandle(isOpen: $isDrawerOpen)
                        .position(
                            x: geometry.size.width - 20,
                            y: geometry.size.height / 2
                        )
                        .zIndex(isDrawerOpen ? 1 : 2)
                    
                    // Floating generation button - Visible when drawer closed
                    if !isDrawerOpen {
                        FloatingGenerationButton(
                            state: viewModel.buttonState,
                            hasPreviewImage: viewModel.previewImage != nil,
                            isGenerationComplete: viewModel.isGenerationComplete,
                            action: {
                                viewModel.startImageGeneration()
                                // Auto-open drawer when generation starts
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                    isDrawerOpen = true
                                }
                            }
                        )
                        .zIndex(1)
                    }
                }
            }
            .overlay {
                // Other error messages (for non-image-generation errors)
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
            }
            .overlay(alignment: .top) {
                HStack(spacing: 10) {
                    Button(action: {
                        viewModel.toggleMediaPack()
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: viewModel.mediaPack.symbolName)
                                .font(.system(size: 20, weight: .bold))
                            Text(viewModel.mediaPack.kidLabel)
                                .font(.system(size: 16, weight: .heavy, design: .rounded))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(
                            Capsule()
                                .fill(viewModel.mediaPack == .halloween
                                      ? Color(red: 0.72, green: 0.28, blue: 0.12).opacity(0.92)
                                      : Color.gray.opacity(0.82))
                        )
                        .shadow(radius: 5)
                    }
                    .accessibilityLabel("Switch world skin")
                    .accessibilityValue(viewModel.mediaPack.kidLabel)

                    MainCreationStatusBar(
                        steps: creationStatusSteps,
                        status: creationStatus
                    )
                    .allowsHitTesting(false)

                    Spacer(minLength: 4)

                    Button(action: {
                        showSettings = true
                    }) {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Color.gray.opacity(0.82))
                            .clipShape(Circle())
                            .shadow(radius: 5)
                    }
                    .accessibilityLabel("Settings")

                    Button(action: {
                        showMusicPlayer = true
                    }) {
                        Image(systemName: "music.note")
                            .font(.system(size: 24))
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Color.purple.opacity(0.82))
                            .clipShape(Circle())
                            .shadow(radius: 5)
                    }
                    .accessibilityLabel("Music")

                    Button(action: {
                        showGamesDialog = true
                    }) {
                        Image(systemName: "gamecontroller.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Color.blue.opacity(0.82))
                            .clipShape(Circle())
                            .shadow(radius: 5)
                    }
                    .accessibilityLabel("Games")
                }
                .padding(.top, topSafeArea + 4)
                .padding(.horizontal, 16)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(onDismiss: {
                    showSettings = false
                }, viewModel: viewModel)
            }
            .sheet(isPresented: $showMusicPlayer) {
                MusicPlayerView(onDismiss: {
                    showMusicPlayer = false
                })
            }
            .sheet(isPresented: $showGamesDialog) {
                GamesDialogView(
                    showWaypointGame: $showWaypointGame,
                    showGoonPopper: $showGoonPopper,
                    showPictureCarver: $showPictureCarver,
                    showDinoPicnic: $showDinoPicnic,
                    // showMemoryGame: $showMemoryGame,
                    onDismiss: {
                        showGamesDialog = false
                    }
                )
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
            .fullScreenCover(isPresented: $showGoonPopper) {
                GoonPopperView(
                    onDismiss: {
                        showGoonPopper = false
                    },
                    onComplete: {
                        // Keep the game open so Abbie can celebrate or replay.
                    }
                )
            }
            .fullScreenCover(isPresented: $showPictureCarver) {
                PictureCarverView(
                    onDismiss: {
                        showPictureCarver = false
                    }
                )
            }
            .fullScreenCover(isPresented: $showDinoPicnic) {
                DinoPicnicView()
            }
            // Memory Game temporarily disabled
            // .fullScreenCover(isPresented: $showMemoryGame) {
            //     MemoryGameView(
            //         onDismiss: {
            //             showMemoryGame = false
            //         },
            //         onComplete: {
            //             showMemoryGame = false
            //         }
            //     )
            // }
            .onChange(of: showWaypointGame) { oldValue, newValue in
                // Coordinate music with game lifecycle
                MusicService.shared.setGameActive(newValue)
            }
            .onChange(of: showGoonPopper) { oldValue, newValue in
                MusicService.shared.setGameActive(newValue)
            }
            .onChange(of: showPictureCarver) { oldValue, newValue in
                MusicService.shared.setGameActive(newValue)
            }
            .onChange(of: showDinoPicnic) { oldValue, newValue in
                MusicService.shared.setGameActive(newValue)
            }
        }
        .ignoresSafeArea()
        .toast($viewModel.toastMessage)
        .onAppear {
            viewModel.loadData()
        }
        .gesture(
            // Right-edge swipe to open drawer
            DragGesture(minimumDistance: 20)
                .onEnded { value in
                    // Only trigger if swiping from right edge (within 30px)
                    let startX = value.startLocation.x
                    let screenWidth = UIScreen.main.bounds.width
                    
                    if startX > screenWidth - 30 && value.translation.width < -50 {
                        // Swipe from right edge leftward - open drawer
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            isDrawerOpen = true
                        }
                    }
                }
        )
        .onChange(of: viewModel.buttonState) { oldValue, newValue in
            // Auto-open drawer when generation completes (transitions from generating to ready)
            if case .generating = oldValue, case .ready = newValue {
                // Check if we have a new preview image
                if viewModel.previewImage != nil {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        isDrawerOpen = true
                    }
                }
            }
        }
    }
}

private struct CreationStatusStep: Identifiable {
    let id: String
    let title: String
    let systemImage: String
    let isComplete: Bool
}

private struct MainCreationStatusBar: View {
    enum Status: Equatable {
        case loading
        case choosing
        case ready
        case creating
        case complete
        case error

        var summary: String {
            switch self {
            case .loading: return "LOADING CHOICES"
            case .choosing: return "BUILD YOUR RECIPE"
            case .ready: return "READY TO CREATE"
            case .creating: return "MAKING YOUR PICTURE"
            case .complete: return "PICTURE READY"
            case .error: return "READY TO TRY AGAIN"
            }
        }

        var accentColor: Color {
            switch self {
            case .loading: return .blue
            case .choosing: return .purple
            case .ready: return .green
            case .creating: return .orange
            case .complete: return .cyan
            case .error: return .red
            }
        }
    }

    let steps: [CreationStatusStep]
    let status: Status

    private var completedCount: Int {
        steps.filter(\.isComplete).count
    }
    
    var body: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 0) {
                Text("ABBIE'S PICTURE QUEST")
                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                    .shadow(color: .black.opacity(0.5), radius: 2, y: 1)

                Text(status == .choosing
                     ? "\(completedCount) OF \(steps.count) READY"
                     : status.summary)
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundColor(.white.opacity(0.9))
                    .contentTransition(.numericText())
                    .shadow(color: .black.opacity(0.5), radius: 2, y: 1)
            }
            .frame(width: 225, alignment: .leading)

            HStack(spacing: 8) {
                ForEach(steps) { step in
                    let isFilled = step.isComplete || status == .complete

                    Image(systemName: isFilled ? "checkmark" : step.systemImage)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 48, height: 48)
                        .background(
                            isFilled
                                ? status.accentColor.opacity(0.82)
                                : Color.gray.opacity(0.8)
                        )
                        .clipShape(Circle())
                        .shadow(radius: 5)
                        .accessibilityLabel(
                            "\(step.title): \(isFilled ? "ready" : "not selected")"
                        )
                }
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.8), value: completedCount)
        .animation(.easeInOut(duration: 0.25), value: status)
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
            // Debug calculations removed - uncomment if needed for debugging
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
    var mediaPack: MediaPack = .classic
    
    var body: some View {
        GeometryReader { geometry in
            let calculations = LeftColumnCalculations.calculate(for: geometry.size.height)
            let carouselFrameHeight = calculations.carouselFrameHeight
            
            VStack(spacing: 16) {
                CarouselCarveout(mediaPack: mediaPack) {
                    CarouselView(
                        title: mediaPack.friendRowTitle,
                        items: friendItems,
                        selectedIndex: $friendIndex,
                        onItemSelected: onFriendSelected,
                        mediaPack: mediaPack
                    )
                }
                .frame(height: carouselFrameHeight)
                
                CarouselCarveout(mediaPack: mediaPack) {
                    CarouselView(
                        title: mediaPack.outfitRowTitle,
                        items: outfitItems,
                        selectedIndex: $outfitIndex,
                        onItemSelected: onOutfitSelected,
                        mediaPack: mediaPack
                    )
                }
                .frame(height: carouselFrameHeight)
                
                CarouselCarveout(mediaPack: mediaPack) {
                    CarouselView(
                        title: mediaPack.placeRowTitle,
                        items: placeItems,
                        selectedIndex: $placeIndex,
                        onItemSelected: onPlaceSelected,
                        mediaPack: mediaPack
                    )
                }
                .frame(height: carouselFrameHeight)
            }
            .padding(.leading, 16)
            .padding(.trailing, 16)
            .padding(.top, 16)
            .padding(.bottom, 16)
        }
    }
}

struct RightColumnView: View {
    @ObservedObject var viewModel: MainViewModel
    let historyImages: [GeneratedImage]
    let isLoading: Bool
    
    @State private var selectedHistoryIndex: Int? = nil
    @State private var selectedHistoryId: String? = nil // Track by ID to preserve selection
    @State private var showInspectionView: Bool = false
    @State private var inspectionStartIndex: Int = 0
    
    // Use filtered images from viewModel
    private var filteredImages: [GeneratedImage] {
        viewModel.filteredHistoryImages
    }
    
    // Displayed images (just filtered images, no shuffle)
    private var displayedImages: [GeneratedImage] {
        return filteredImages
    }
    
    // Mapping from image ID to GeneratedImage for heart icon handling
    // Uses reduce to handle duplicate IDs gracefully (keeps first occurrence)
    private var imageLookup: [String: GeneratedImage] {
        displayedImages.reduce(into: [String: GeneratedImage]()) { dict, image in
            // Only add if not already present (handles duplicates gracefully)
            if dict[image.id] == nil {
                dict[image.id] = image
            } else {
                // Log duplicate for debugging
                print("⚠️ Duplicate image ID detected: \(image.id) - keeping first occurrence")
            }
        }
    }
    
    // Convert GeneratedImage to CarouselItem for SwiftCarousel
    private var historyCarouselItems: [CarouselItem] {
        displayedImages.prefix(20).map { image in
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
            // Debug calculations removed - uncomment if needed for debugging
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
                    ZStack(alignment: .topTrailing) {
                        if let image = viewModel.previewImage {
                            // Show image or error state
                            if viewModel.imageGenerationError != nil {
                                // Error state: show broken image with message
                                VStack(spacing: 16) {
                                    Image(uiImage: image)
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(maxWidth: 200, maxHeight: 200)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.black, lineWidth: 4)
                                        )
                                        .cornerRadius(12)
                                    
                                    VStack(spacing: 8) {
                                        Text("Something went wrong.")
                                            .font(.system(size: 18, weight: .bold))
                                            .foregroundColor(.primary)
                                        
                                        Text("Try again later")
                                            .font(.system(size: 14))
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                
                                // Red X in top right corner
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(.red)
                                    .background(
                                        Circle()
                                            .fill(Color.white)
                                            .frame(width: 32, height: 32)
                                    )
                                    .padding(8)
                            } else {
                                // Normal preview image - make it tappable to open inspection view
                                Image(uiImage: image)
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .contentShape(Rectangle()) // Make entire image area tappable
                                    .onTapGesture {
                                    // Find the preview image in history (should be the most recent)
                                    // The preview image is added to history when generation completes
                                    if displayedImages.first != nil {
                                        inspectionStartIndex = 0
                                        showInspectionView = true
                                    }
                                    }
                            }
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
                    // Filter toggle button and shuffle toggle
                    HStack {
                        Text("History")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        // Favorites filter button
                        Button(action: {
                            viewModel.showFavoritesOnly.toggle()
                        }) {
                            Image(systemName: viewModel.showFavoritesOnly ? "heart.fill" : "heart")
                                .font(.system(size: 18))
                                .foregroundColor(viewModel.showFavoritesOnly ? .red : .gray)
                        }
                    }
                    .padding(.horizontal, 8)
                    
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else if displayedImages.isEmpty {
                        Text(viewModel.showFavoritesOnly ? "No favorites yet" : "No images yet")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        Carousel(
                            items: historyCarouselItems,
                            selectedIndex: Binding(
                                get: {
                                    // Find index by ID to preserve selection when array changes
                                    if let selectedId = selectedHistoryId,
                                       let index = historyCarouselItems.firstIndex(where: { $0.id == selectedId }) {
                                        return index
                                    }
                                    return selectedHistoryIndex
                                },
                                set: { newIndex in
                                    selectedHistoryIndex = newIndex
                                    if let index = newIndex, index < historyCarouselItems.count {
                                        selectedHistoryId = historyCarouselItems[index].id
                                    } else {
                                        selectedHistoryId = nil
                                    }
                                }
                            ),
                            config: historyCarouselConfig,
                            onSelect: { carouselItem in
                                // Find the index of the tapped image in displayed images
                                if let index = displayedImages.firstIndex(where: { $0.id == carouselItem.id }) {
                                    inspectionStartIndex = index
                                    showInspectionView = true
                                }
                                // Update selected ID
                                selectedHistoryId = carouselItem.id
                            },
                            itemExtras: { carouselItem in
                                // Provide favorite status and tap handler for heart icon
                                if let image = imageLookup[carouselItem.id] {
                                    return (
                                        isFavorite: image.isFavorite,
                                        onFavoriteTap: {
                                            viewModel.toggleFavorite(for: image)
                                        }
                                    )
                                }
                                return (isFavorite: nil, onFavoriteTap: nil)
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
                .sheet(isPresented: $showInspectionView) {
                    ImageInspectionView(
                        startImageId: inspectionStartIndex < displayedImages.count ? displayedImages[inspectionStartIndex].id : "",
                        viewModel: viewModel
                    )
                }
            }
            .padding(16)
        }
    }
}


