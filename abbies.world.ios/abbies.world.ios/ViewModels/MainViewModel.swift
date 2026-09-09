//
//  MainViewModel.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//

import Foundation
import SwiftUI
import Combine

enum GenerationButtonState: Sendable {
    case notReady
    case ready
    case generating
    
    var id: Int {
        switch self {
        case .notReady: return 0
        case .ready: return 1
        case .generating: return 2
        }
    }
}

class MainViewModel: ObservableObject {
    private let apiClient = APIClient.shared
    private let sseService = SSEService.shared
    private let assetsService = AssetsService.shared
    private var cancellables = Set<AnyCancellable>()
    private var imageGenerationTask: Task<Void, Never>?
    
    // View mode - controls which layout is displayed
    @Published var viewMode: ViewMode = .default {
        didSet {
            UserDefaults.standard.set(viewMode.rawValue, forKey: "viewMode")
            if viewMode == .fourCarousel && mediaPack != .halloween {
                loadStyleItems()
            }
        }
    }
    
    @Published var mediaPack: MediaPack = .classic
    private var viewModeBeforeHalloween: ViewMode?
    
    // Carousel indices
    @Published var friendIndex = -1
    @Published var outfitIndex = -1
    @Published var placeIndex = -1
    @Published var styleIndex = -1 // For 4th carousel (style/medium)
    
    // Ingredients by category (filtered from API)
    @Published var friendItems: [Ingredient] = []
    @Published var outfitItems: [Ingredient] = []
    @Published var placeItems: [Ingredient] = []
    @Published var styleItems: [Ingredient] = [] // Placeholder style items
    
    // Preview and history
    @Published var previewImage: UIImage?
    @Published var historyImages: [GeneratedImage] = []
    @Published var showFavoritesOnly: Bool = false {
        didSet {
            // Reload history when filter state changes to ensure correct data is loaded
            loadHistory()
        }
    }
    
    // Background image
    @Published var backgroundImage: UIImage?
    
    // Button state
    @Published var buttonState: GenerationButtonState = .notReady
    
    // Track if generation just completed (to hide floating button animation)
    @Published var isGenerationComplete: Bool = false
    
    // Loading states
    @Published var isLoadingIngredients = false
    @Published var isLoadingHistory = false
    @Published var isCreatingImage = false
    @Published var errorMessage: String?
    
    // Image generation error state
    @Published var imageGenerationError: String? = nil
    
    // Toast notifications
    @Published var toastMessage: ToastMessage?
    
    // All ingredients from API
    // Removed allIngredients - carousels now load directly from Assets API
    
    init() {
        setupCategoryMapping()
        setupSSEConnection()
        setupButtonStateObserver()
        
        if ProcessInfo.processInfo.arguments.contains("-mediaPackHalloween") {
            mediaPack = .halloween
            UserDefaults.standard.set(MediaPack.halloween.rawValue, forKey: "mediaPack")
        } else if let savedPack = UserDefaults.standard.string(forKey: "mediaPack"),
                  let pack = MediaPack(rawValue: savedPack) {
            mediaPack = pack
        }

        // Resolve the pack before restoring view mode so a persisted four-row
        // layout cannot start an Everyday style request during Halloween launch.
        if let savedMode = UserDefaults.standard.string(forKey: "viewMode"),
           let mode = ViewMode(rawValue: savedMode) {
            viewMode = mode
        }
        
        if mediaPack == .halloween {
            viewMode = .fourCarousel
        } else if viewMode == .fourCarousel {
            loadStyleItems()
        }

        MusicService.shared.setMediaPack(mediaPack)
    }
    
    // Computed property to check if all selections are ready
    // NOTE: Different requirements based on view mode:
    // - Default mode: requires friend, outfit, place (3 selections)
    // - FourCarousel mode: requires friend, outfit, place, style (4 selections)
    var allSelectionsReady: Bool {
        let baseReady = friendIndex >= 0 && outfitIndex >= 0 && placeIndex >= 0 &&
            friendIndex < friendItems.count &&
            outfitIndex < outfitItems.count &&
            placeIndex < placeItems.count
        
        // In fourCarousel mode or the Halloween pack, also require style selection
        if viewMode == .fourCarousel || mediaPack == .halloween {
            return baseReady && styleIndex >= 0 && styleIndex < styleItems.count
        }
        
        return baseReady
    }
    
    // Observe carousel index changes to update button state
    private func setupButtonStateObserver() {
        Publishers.CombineLatest4(
            $friendIndex,
            $outfitIndex,
            $placeIndex,
            $styleIndex
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] _, _, _, _ in
            self?.updateButtonState()
        }
        .store(in: &cancellables)
    }
    
    private func updateButtonState() {
        if isCreatingImage {
            buttonState = .generating
        } else if allSelectionsReady {
            buttonState = .ready
        } else {
            buttonState = .notReady
        }
    }
    
    private func setupSSEConnection() {
        // Subscribe to SSE events
        sseService.eventPublisher()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                self?.handleSSEEvent(event)
            }
            .store(in: &cancellables)
        
        // Listen for notification-based events
        NotificationCenter.default.publisher(for: NSNotification.Name("RefreshIngredients"))
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.loadIngredients()
            }
            .store(in: &cancellables)
        
        NotificationCenter.default.publisher(for: NSNotification.Name("BackgroundChanged"))
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                if let backgroundURL = notification.object as? String {
                    self?.loadBackgroundFromURL(backgroundURL)
                }
            }
            .store(in: &cancellables)
        
        NotificationCenter.default.publisher(for: NSNotification.Name("ConfigUpdated"))
            .receive(on: DispatchQueue.main)
            .sink { _ in
                // Config updated - could reload relevant data if needed
            }
            .store(in: &cancellables)
    }
    
    private func handleSSEEvent(_ event: SSEEvent) {
        switch event.type {
        case .connected:
            showToast("Connected to server", type: .success)
            
        case .reloadCache:
            showToast("Cache cleared", type: .info)
            // Cache is already cleared by SSEService
            // Reload images that might be cached
            self.loadBackgroundImage()
            
        case .refreshIngredients:
            showToast("Refreshing ingredients...", type: .info)
            loadIngredients()
            
        case .backgroundChanged:
            if let backgroundURL = event.data["background_url"] as? String {
                showToast("Background updated", type: .success)
                loadBackgroundFromURL(backgroundURL)
            }
            
        case .maintenance:
            let enabled = event.data["enabled"] as? Bool ?? true
            let message = event.data["message"] as? String ?? "Maintenance mode"
            if enabled {
                showToast(message, type: .warning, duration: 5.0)
                errorMessage = "Maintenance mode: \(message)"
            } else {
                showToast("Maintenance complete", type: .success)
                errorMessage = nil
            }
            
        case .toast:
            // Custom toast message from server
            let message = event.data["message"] as? String ?? "Notification"
            let toastTypeString = event.data["type"] as? String ?? "info"
            let duration = event.data["duration"] as? Double ?? 3.0
            
            // Parse custom color (hex string like "#FF5733")
            var customColor: Color? = nil
            if let colorHex = event.data["color"] as? String {
                customColor = Color(hex: colorHex)
                if customColor == nil {
                    print("⚠️ MainViewModel: Failed to parse color hex: '\(colorHex)'")
                }
            }
            
            // Parse custom icon (emoji string)
            let customIcon = event.data["icon"] as? String
            
            // Parse image URL (for asset notifications)
            let imageURL = event.data["image_url"] as? String
            
            // Parse position (top or bottom_right)
            let positionString = event.data["position"] as? String ?? "top"
            let position: ToastView.ToastPosition = positionString.lowercased() == "bottom_right" || positionString.lowercased() == "bottomright" ? .bottomRight : .top
            
            let toastType: ToastView.ToastType
            switch toastTypeString.lowercased() {
            case "success": toastType = .success
            case "warning": toastType = .warning
            case "error": toastType = .error
            case "custom": toastType = .custom
            default: toastType = .info
            }
            
            showToast(message, type: toastType, duration: duration, customColor: customColor, customIcon: customIcon, imageURL: imageURL, position: position)
            
        case .fetchLogs, .configUpdate, .unknown:
            // Handled by SSEService or no action needed
            break
        }
    }
    
    private func showToast(
        _ message: String,
        type: ToastView.ToastType = .info,
        duration: TimeInterval = 3.0,
        customColor: Color? = nil,
        customIcon: String? = nil,
        imageURL: String? = nil,
        position: ToastView.ToastPosition = .top
    ) {
        toastMessage = ToastMessage(
            message: message,
            type: type,
            duration: duration,
            customColor: customColor,
            customIcon: customIcon,
            imageURL: imageURL,
            position: position
        )
    }
    
    private func loadBackgroundFromURL(_ urlString: String) {
        guard mediaPack == .classic else { return }

        let baseURL = apiClient.baseURL
        let fullURL: String
        
        if urlString.hasPrefix("http") {
            fullURL = urlString
        } else if urlString.hasPrefix("/") {
            fullURL = "\(baseURL)\(urlString)"
        } else {
            fullURL = "\(baseURL)/\(urlString)"
        }
        
        guard let url = URL(string: fullURL) else {
            print("⚠️ MainViewModel: Invalid background URL: \(fullURL)")
            return
        }
        
        Task {
            do {
                if let image = try await ImageCache.shared.loadImage(from: url) {
                    await MainActor.run {
                        if self.mediaPack == .classic {
                            self.backgroundImage = image
                        }
                    }
                }
            } catch {
                print("❌ MainViewModel: Error loading background from \(fullURL): \(error)")
            }
        }
    }
    
    func loadData() {
        if mediaPack == .halloween {
            applyHalloweenPack()
        } else {
            loadBackgroundImage()
            loadIngredients()
        }
        loadHistory()
        
        // Connect to SSE event stream
        sseService.connect()
    }
    
    private func loadBackgroundImage() {
        // Use Combine to get backgrounds from Assets API
        assetsService.getAssets(type: "backgrounds")
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        print("❌ Error loading background: \(error.localizedDescription)")
                        // Fallback to bundled
                        self?.loadBundledBackground()
                    }
                },
                receiveValue: { [weak self] backgrounds in
                    guard let self = self, self.mediaPack == .classic else { return }
                    
                    if let firstBackground = backgrounds.first,
                       let assetURL = self.assetsService.assetURL(for: firstBackground) {
                        Task {
                            do {
                                if let image = try await ImageCache.shared.loadImage(from: assetURL) {
                                    await MainActor.run {
                                        if self.mediaPack == .classic {
                                            self.backgroundImage = image
                                        }
                                    }
                                } else {
                                    await MainActor.run {
                                        self.loadBundledBackground()
                                    }
                                }
                            } catch {
                                print("❌ Error loading background image: \(error.localizedDescription)")
                                await MainActor.run {
                                    self.loadBundledBackground()
                                }
                            }
                        }
                    } else {
                        self.loadBundledBackground()
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    private func loadBundledBackground() {
        guard mediaPack == .classic else { return }

        // Try bundled images as fallback
        if let imagePath = Bundle.main.path(forResource: "background", ofType: "png") ??
                          Bundle.main.path(forResource: "background", ofType: "jpg") ??
                          Bundle.main.path(forResource: "1", ofType: "png") ??
                          Bundle.main.path(forResource: "2", ofType: "png"),
           let image = UIImage(contentsOfFile: imagePath) {
            self.backgroundImage = image
        } else {
            self.backgroundImage = nil
        }
    }
    
    private func loadIngredients() {
        // Load carousel items directly from Assets API
        isLoadingIngredients = true
        errorMessage = nil
        
        // Load all assets first
        assetsService.loadAllAssets()
        
        // Load carousel items from Assets API
        loadCarouselItems()
    }
    
    private func loadCarouselItems() {
        var completed = 0
        let total = 3
        
        // Load friends
        assetsService.getAssets(type: "friends")
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        print("❌ Error loading friends: \(error.localizedDescription)")
                        self?.handleMediaLoadFailure(error)
                    }
                    completed += 1
                    if completed == total {
                        self?.isLoadingIngredients = false
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self, self.mediaPack == .classic else { return }
                    let ingredients = self.createIngredientsFromAssets(assets, category: "character_style", assetType: "friends")
                    self.friendItems = ingredients
                }
            )
            .store(in: &cancellables)
        
        // Load outfits
        assetsService.getAssets(type: "outfits")
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        print("❌ Error loading outfits: \(error.localizedDescription)")
                        self?.handleMediaLoadFailure(error)
                    }
                    completed += 1
                    if completed == total {
                        self?.isLoadingIngredients = false
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self, self.mediaPack == .classic else { return }
                    let ingredients = self.createIngredientsFromAssets(assets, category: "color_palette", assetType: "outfits")
                    self.outfitItems = ingredients
                }
            )
            .store(in: &cancellables)
        
        // Load places
        assetsService.getAssets(type: "places")
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        print("❌ Error loading places: \(error.localizedDescription)")
                        self?.handleMediaLoadFailure(error)
                    }
                    completed += 1
                    if completed == total {
                        self?.isLoadingIngredients = false
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self, self.mediaPack == .classic else { return }
                    let ingredients = self.createIngredientsFromAssets(assets, category: "world_setting", assetType: "places")
                    self.placeItems = ingredients
                }
            )
            .store(in: &cancellables)
    }

    private func handleMediaLoadFailure(_ error: Error) {
        if error is APIClientError {
            errorMessage = error.localizedDescription
        } else {
            errorMessage = "Couldn’t load Abbie’s pictures. Ask a grown-up to check the connection."
        }
    }
    
    private func createIngredientsFromAssets(_ assets: [Asset], category: String, assetType: String) -> [Ingredient] {
        return assets.map { asset -> Ingredient in
            let assetURL = assetsService.assetURL(for: asset)?.absoluteString ?? ""
            let name = asset.name.replacingOccurrences(of: ".png", with: "").replacingOccurrences(of: "_", with: " ").capitalized
            
            return Ingredient(
                id: "\(assetType)_\(asset.name)",
                name: name,
                category: category,
                styleInjection: "", // Style injection not needed for carousel display
                imageURL: assetURL
            )
        }
    }
    
    private func loadHistory() {
        isLoadingHistory = true
        
        let endpoint = showFavoritesOnly 
            ? apiClient.getFavorites()
            : apiClient.getGeneratedImages()
        
        endpoint
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoadingHistory = false
                    if case .failure(let error) = completion {
                        print("❌ Error loading history: \(error.localizedDescription)")
                        self?.errorMessage = "Failed to load history: \(error.localizedDescription)"
                    }
                },
                receiveValue: { [weak self] images in
                    guard let self = self else { return }
                    // Filter out deleted images and partial images
                    let filtered = images.filter { 
                        $0.deleted != true && !$0.isPartial 
                    }
                    // Sort by createdAt descending (newest first) for LIFO
                    let sorted = filtered.sorted { $0.createdAt > $1.createdAt }
                    self.historyImages = sorted
                    print("📸 Loaded \(sorted.count) final images (filtered out \(images.count - sorted.count) partials/deleted)")
                }
            )
            .store(in: &cancellables)
    }
    
    // Computed property for filtered history (client-side filter if needed)
    var filteredHistoryImages: [GeneratedImage] {
        if showFavoritesOnly {
            return historyImages.filter { $0.isFavorite == true }
        }
        return historyImages
    }
    
    // Toggle favorite for an image
    func toggleFavorite(for image: GeneratedImage) {
        let newFavoriteStatus = !(image.isFavorite ?? false)
        
        apiClient.toggleFavorite(filename: image.filename, isFavorite: newFavoriteStatus)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        print("❌ Error toggling favorite: \(error.localizedDescription)")
                        self?.errorMessage = "Failed to update favorite: \(error.localizedDescription)"
                    }
                },
                receiveValue: { [weak self] response in
                    guard let self = self else { return }
                    print("✅ Favorite toggled: \(image.filename) -> \(response.favorite)")
                    
                    // Update the image in place to avoid reloading and resetting carousel index
                    if let index = self.historyImages.firstIndex(where: { $0.id == image.id }) {
                        // Create a new GeneratedImage with updated favorite status
                        let updatedImage = GeneratedImage(
                            url: self.historyImages[index].url,
                            filename: self.historyImages[index].filename,
                            createdAt: self.historyImages[index].createdAt,
                            prompt: self.historyImages[index].prompt,
                            recipeItems: self.historyImages[index].recipeItems,
                            deleted: self.historyImages[index].deleted,
                            isFavorite: response.favorite
                        )
                        self.historyImages[index] = updatedImage
                        print("✅ Updated favorite status locally (preserving carousel selection)")
                    } else {
                        // If image not found in current list, reload from server
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            self.loadHistory()
                        }
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    // Removed categorizeIngredients and enrichIngredientsWithAssets - carousels now load directly from Assets API
    
    private func setupCategoryMapping() {
        // Category mapping is done in categorizeIngredients()
        // You can extend this to support custom mappings
    }
    
    func selectFriend(_ ingredient: Ingredient) {
        // Selection tracking - can be used for future functionality
    }
    
    func selectOutfit(_ ingredient: Ingredient) {
        // Selection tracking - can be used for future functionality
    }
    
    func selectPlace(_ ingredient: Ingredient) {
        // Selection tracking - can be used for future functionality
    }
    
    func selectStyle(_ ingredient: Ingredient) {
        // Selection tracking for style/medium carousel
    }
    
    // MARK: - Style Items
    
    /// Load style items from API or fallback to hardcoded placeholders
    /// Styles use special ID format: "style_{idSuffix}" to match stylePrompts dictionary
    private func loadStyleItems() {
        // First, load the hardcoded style definitions (for prompts and display names)
        // These will be used to match against API assets
        let styles: [(String, String, String)] = [
            // Traditional Drawing Media
            ("Crayon", "crayon", "Crayon drawing with bold, vibrant colors, childlike simplicity, and visible texture from the waxy medium"),
            ("Charcoal", "charcoal", "Charcoal sketch with rich blacks, soft grays, smudged edges, and dramatic contrast"),
            ("Pencil", "pencil", "Pencil sketch with fine lines, cross-hatching, detailed shading, and graphite texture"),
            ("Ink Wash", "ink_wash", "Ink wash painting with flowing brushstrokes, varying opacity, and elegant simplicity"),
            ("Pen & Ink", "pen_ink", "Pen and ink illustration with precise lines, stippling, and intricate detail"),
            ("Pastel", "pastel", "Soft pastel drawing with velvety texture, vibrant colors, and delicate blending"),
            ("Chalk", "chalk", "Chalk drawing with powdery texture, vibrant colors, and soft, blendable strokes"),
            ("Marker", "marker", "Marker illustration with bold, saturated colors, clean lines, and graphic style"),
            
            // Traditional Painting Media
            ("Watercolor", "watercolor", "Watercolor painting with soft, flowing colors, translucent washes, and organic blending"),
            ("Oil Painting", "oil_painting", "Oil painting with rich, saturated colors, visible brushstrokes, and classical painting technique"),
            ("Acrylic", "acrylic", "Acrylic painting with bold, opaque colors, thick impasto texture, and modern vibrancy"),
            ("Gouache", "gouache", "Gouache painting with matte finish, opaque colors, and smooth, flat application"),
            ("Tempera", "tempera", "Tempera painting with egg-based medium, bright colors, and fine detail"),
            ("Fresco", "fresco", "Fresco painting with earthy tones, wall texture, and classical mural technique"),
            
            // Digital & Modern Media
            ("Pixel Art", "pixel_art", "Pixel art with blocky, retro aesthetic, limited color palette, and 8-bit charm"),
            ("Vector Art", "vector_art", "Vector illustration with clean lines, flat colors, and scalable graphic design"),
            ("3D Render", "3d_render", "3D rendered image with realistic lighting, depth, and computer-generated precision"),
            ("Digital Painting", "digital_painting", "Digital painting with smooth blending, vibrant colors, and modern artistic technique"),
            ("Glitch Art", "glitch_art", "Glitch art with digital artifacts, color shifts, and intentional data corruption aesthetic"),
            ("Holographic", "holographic", "Holographic effect with iridescent colors, rainbow shimmer, and futuristic appearance"),
            
            // Artistic Movements & Periods
            ("Impressionist", "impressionist", "Impressionist painting with loose brushstrokes, light effects, and visible texture"),
            ("Cubist", "cubist", "Cubist art with geometric shapes, fragmented forms, and multiple perspectives"),
            ("Surrealist", "surrealist", "Surrealist art with dreamlike imagery, impossible scenes, and symbolic elements"),
            ("Pop Art", "pop_art", "Pop art with bold colors, commercial aesthetic, and graphic design elements"),
            ("Art Nouveau", "art_nouveau", "Art Nouveau with flowing lines, organic forms, and decorative elegance"),
            ("Art Deco", "art_deco", "Art Deco with geometric patterns, luxurious materials, and 1920s glamour"),
            ("Expressionist", "expressionist", "Expressionist art with emotional intensity, distorted forms, and bold colors"),
            ("Minimalist", "minimalist", "Minimalist art with simple forms, limited palette, and essential elements only"),
            ("Abstract", "abstract", "Abstract art with non-representational forms, colors, and shapes"),
            ("Renaissance", "renaissance", "Renaissance painting with classical composition, realistic detail, and harmonious colors"),
            ("Baroque", "baroque", "Baroque art with dramatic lighting, rich colors, and dynamic movement"),
            
            // Cultural & Regional Styles
            ("Japanese Woodblock", "japanese_woodblock", "Japanese woodblock print with flat colors, bold outlines, and traditional ukiyo-e style"),
            ("Chinese Ink", "chinese_ink", "Chinese ink painting with flowing brushwork, monochrome elegance, and calligraphic strokes"),
            ("Aboriginal Dot", "aboriginal_dot", "Aboriginal dot painting with intricate patterns, earthy colors, and traditional symbolism"),
            ("Mexican Mural", "mexican_mural", "Mexican mural art with bold colors, social themes, and monumental scale"),
            ("African Textile", "african_textile", "African textile pattern with geometric designs, vibrant colors, and cultural motifs"),
            ("Scandinavian Folk", "scandinavian_folk", "Scandinavian folk art with floral patterns, bright colors, and traditional design"),
            ("Islamic Geometric", "islamic_geometric", "Islamic geometric art with intricate patterns, symmetry, and mathematical precision"),
            
            // Textures & Surfaces
            ("Mosaic", "mosaic", "Mosaic art with tiled pieces, vibrant colors, and textured surface"),
            ("Stained Glass", "stained_glass", "Stained glass with bold outlines, jewel tones, and luminous transparency"),
            ("Embroidery", "embroidery", "Embroidery with thread texture, decorative stitches, and textile artistry"),
            ("Collage", "collage", "Collage with layered paper, mixed media, and textured composition"),
            ("Wood Grain", "wood_grain", "Wood grain texture with natural patterns, warm tones, and organic lines"),
            ("Marble", "marble", "Marble texture with veined patterns, polished surface, and classical elegance"),
            ("Fabric", "fabric", "Fabric texture with woven patterns, soft folds, and textile quality"),
            ("Metal", "metal", "Metallic surface with reflective shine, industrial aesthetic, and cool tones"),
            
            // Moods & Atmospheres
            ("Dreamy", "dreamy", "Dreamy atmosphere with soft focus, pastel colors, and ethereal quality"),
            ("Dramatic", "dramatic", "Dramatic lighting with high contrast, shadows, and cinematic intensity"),
            ("Ethereal", "ethereal", "Ethereal quality with glowing light, translucent forms, and otherworldly beauty"),
            ("Nostalgic", "nostalgic", "Nostalgic mood with warm tones, vintage aesthetic, and sentimental atmosphere"),
            ("Whimsical", "whimsical", "Whimsical style with playful elements, bright colors, and lighthearted charm"),
            ("Mysterious", "mysterious", "Mysterious atmosphere with dark tones, shadows, and enigmatic mood"),
            ("Serene", "serene", "Serene mood with calm colors, peaceful composition, and tranquil atmosphere"),
            ("Energetic", "energetic", "Energetic style with dynamic movement, vibrant colors, and lively composition"),
            
            // Blended & Hybrid Styles
            ("Watercolor + Ink", "watercolor_ink", "Watercolor painting combined with ink outlines, creating both soft washes and precise definition"),
            ("Charcoal + Pastel", "charcoal_pastel", "Charcoal and pastel blend with rich blacks, vibrant colors, and mixed media texture"),
            ("Digital + Traditional", "digital_traditional", "Digital art with traditional painting techniques, combining modern tools with classical aesthetics"),
            ("Photorealistic", "photorealistic", "Photorealistic rendering with camera-like precision, lifelike detail, and photographic quality"),
            ("Painterly Photo", "painterly_photo", "Painterly photograph with artistic brushstrokes applied to photographic realism"),
            
            // Special Effects & Techniques
            ("Double Exposure", "double_exposure", "Double exposure effect with layered images, transparency, and dreamlike merging"),
            ("Silhouette", "silhouette", "Silhouette with dark forms against light background, dramatic contrast, and simple elegance"),
            ("High Contrast", "high_contrast", "High contrast image with stark blacks and whites, bold definition, and graphic impact"),
            ("Sepia Tone", "sepia_tone", "Sepia toned image with warm browns, vintage aesthetic, and nostalgic quality"),
            ("Black & White", "black_white", "Black and white photography with grayscale tones, timeless elegance, and classic composition"),
            ("Vintage", "vintage", "Vintage aesthetic with aged colors, film grain, and retro charm"),
            ("Neon", "neon", "Neon aesthetic with glowing colors, dark backgrounds, and electric vibrancy"),
            ("Grunge", "grunge", "Grunge style with distressed textures, muted colors, and raw, edgy aesthetic"),
            ("Vaporwave", "vaporwave", "Vaporwave aesthetic with retro-futuristic colors, geometric shapes, and nostalgic digital art"),
            ("Cyberpunk", "cyberpunk", "Cyberpunk style with neon lights, dark urban atmosphere, and futuristic technology"),
            
            // Nature-Inspired
            ("Botanical", "botanical", "Botanical illustration with scientific detail, natural colors, and precise rendering"),
            ("Underwater", "underwater", "Underwater scene with blue-green tones, light refraction, and aquatic atmosphere"),
            ("Forest", "forest", "Forest atmosphere with dappled light, green tones, and natural textures"),
            ("Ocean", "ocean", "Ocean scene with blues, movement, and vast horizon"),
            
            // Abstract Concepts
            ("Liquid", "liquid", "Liquid forms with flowing shapes, transparency, and organic movement"),
            ("Crystalline", "crystalline", "Crystalline structure with geometric facets, refraction, and prismatic colors"),
            ("Smoke", "smoke", "Smoke effect with wispy forms, ethereal quality, and atmospheric texture"),
            ("Fire", "fire", "Fire with warm colors, dynamic movement, and luminous intensity"),
            ("Ice", "ice", "Ice with cool tones, crystalline structure, and frozen translucency"),
            
            // Artistic Flair & Unique Styles
            ("Sketchy", "sketchy", "Sketchy style with loose lines, visible construction marks, and unfinished quality"),
            ("Polished", "polished", "Polished finish with smooth surfaces, refined detail, and professional quality"),
            ("Textured", "textured", "Textured surface with visible material quality, tactile appearance, and rich detail"),
            ("Flat Design", "flat_design", "Flat design with simple shapes, bold colors, and minimal depth"),
            ("Isometric", "isometric", "Isometric perspective with 3D forms, geometric precision, and technical illustration"),
            ("Low Poly", "low_poly", "Low poly art with geometric shapes, faceted surfaces, and modern minimalist aesthetic")
        ]
        
        // Store style prompts for use in generation (always needed, even with API assets)
        // Map style ID to detailed prompt
        stylePrompts = Dictionary(uniqueKeysWithValues: styles.map { (_, idSuffix, prompt) in
            ("style_\(idSuffix)", prompt)
        })
        
        // Create lookup dictionary: idSuffix -> (displayName, prompt)
        let styleLookup = Dictionary(uniqueKeysWithValues: styles.map { (displayName, idSuffix, prompt) in
            (idSuffix, (displayName, prompt))
        })
        
        // TEMPORARY: Store short descriptions (1-4 words) for placeholder tile overlays
        // Extract first 1-4 words from detailed prompt for display
        // Remove this when we have actual style assets
        styleShortDescriptions = Dictionary(uniqueKeysWithValues: styles.map { (_, idSuffix, prompt) in
            let words = prompt.components(separatedBy: " ").prefix(4)
            let shortDesc = words.joined(separator: " ")
            return ("style_\(idSuffix)", shortDesc)
        })
        
        // Try to load from API first, fallback to placeholders if API fails
        assetsService.getAssets(type: "styles")
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        print("⚠️ Error loading styles from API: \(error.localizedDescription)")
                        print("   Falling back to placeholder styles")
                        // Fallback to placeholders
                        if self?.mediaPack == .classic {
                            self?.loadStylePlaceholders(styles: styles)
                        }
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self, self.mediaPack == .classic else { return }
                    // Create ingredients from API assets, matching to hardcoded style definitions
                    let ingredients = self.createStyleIngredientsFromAssets(assets, styleLookup: styleLookup)
                    self.styleItems = ingredients
                    print("✅ MainViewModel: Loaded \(ingredients.count) style items from API")
                }
            )
            .store(in: &cancellables)
    }
    
    /// Create style ingredients from API assets, matching to hardcoded style definitions
    /// Uses special ID format: "style_{idSuffix}" to match stylePrompts dictionary
    /// Server provides `id` field (filename without extension) for easier matching
    private func createStyleIngredientsFromAssets(_ assets: [Asset], styleLookup: [String: (String, String)]) -> [Ingredient] {
        return assets.compactMap { asset -> Ingredient? in
            // Use server-provided assetId field if available, otherwise extract from filename
            let idSuffix: String
            if let serverId = asset.assetId, !serverId.isEmpty {
                // Server provides id field (filename without extension)
                idSuffix = serverId
            } else {
                // Fallback: extract from filename (e.g., "crayon.png" -> "crayon")
                let filename = asset.name
                guard filename.hasSuffix(".png") else { return nil }
                idSuffix = String(filename.dropLast(4)) // Remove ".png"
            }
            
            // Look up display name and prompt from hardcoded definitions
            guard let (displayName, _) = styleLookup[idSuffix] else {
                print("⚠️ Style asset '\(asset.name)' (id: '\(idSuffix)') not found in style definitions, skipping")
                return nil
            }
            
            // Build image URL
            let assetURL = assetsService.assetURL(for: asset)?.absoluteString ?? ""
            
            // Create ingredient with special ID format: "style_{idSuffix}"
            return Ingredient(
                id: "style_\(idSuffix)",
                name: displayName,
                category: "art_style",
                styleInjection: "", // Not used for styles
                imageURL: assetURL.isEmpty ? nil : assetURL
            )
        }
    }
    
    /// Load placeholder style items (fallback when API is unavailable)
    private func loadStylePlaceholders(styles: [(String, String, String)]) {
        styleItems = styles.map { (displayName, idSuffix, _) in
            Ingredient(
                id: "style_\(idSuffix)",
                name: displayName,
                category: "art_style",
                styleInjection: "", // Not used for styles
                imageURL: nil // No image - will use placeholder tile
            )
        }
        print("✅ MainViewModel: Loaded \(styleItems.count) placeholder style items")
    }
    
    // Style prompt mapping: style ID -> detailed prompt for GPT
    private var stylePrompts: [String: String] = [:]
    
    // TEMPORARY: Style short description mapping for placeholder tile overlays
    // Remove this when we have actual style assets
    // Made internal (not private) so views can access it
    var styleShortDescriptions: [String: String] = [:]
    
    /// Set view mode (public method for Settings)
    func setViewMode(_ mode: ViewMode) {
        if mediaPack == .halloween && mode != .fourCarousel {
            return
        }
        viewMode = mode
    }
    
    func toggleMediaPack() {
        setMediaPack(mediaPack == .classic ? .halloween : .classic)
    }
    
    func setMediaPack(_ pack: MediaPack) {
        guard pack != mediaPack else { return }
        
        if pack == .halloween {
            if viewMode != .fourCarousel {
                viewModeBeforeHalloween = viewMode
            }
            mediaPack = pack
            UserDefaults.standard.set(pack.rawValue, forKey: "mediaPack")
            MusicService.shared.setMediaPack(pack)
            viewMode = .fourCarousel
            resetCarouselSelections()
            applyHalloweenPack()
            showToast("Spooky world on!", type: .success)
            return
        }
        
        mediaPack = pack
        UserDefaults.standard.set(pack.rawValue, forKey: "mediaPack")
        MusicService.shared.setMediaPack(pack)
        if let previous = viewModeBeforeHalloween {
            viewMode = previous
            viewModeBeforeHalloween = nil
        }
        resetCarouselSelections()
        loadBackgroundImage()
        loadIngredients()
        if viewMode == .fourCarousel {
            loadStyleItems()
        }
        showToast("Everyday world on!", type: .info)
    }
    
    private func resetCarouselSelections() {
        friendIndex = -1
        outfitIndex = -1
        placeIndex = -1
        styleIndex = -1
        updateButtonState()
    }
    
    private func applyHalloweenPack() {
        isLoadingIngredients = false
        friendItems = HalloweenCatalog.monsters.map { $0.asIngredient() }
        outfitItems = HalloweenCatalog.outfits.map { $0.asIngredient() }
        placeItems = HalloweenCatalog.places.map { $0.asIngredient() }
        styleItems = HalloweenCatalog.styles.map { $0.asIngredient() }
        stylePrompts = Dictionary(uniqueKeysWithValues: HalloweenCatalog.styles.map {
            ($0.id, $0.styleInjection)
        })
        styleShortDescriptions = Dictionary(uniqueKeysWithValues: HalloweenCatalog.styles.map { item in
            let words = item.styleInjection.split(separator: " ").prefix(4).joined(separator: " ")
            return (item.id, String(words))
        })
        backgroundImage = HalloweenCatalog.loadBackground()
        print("🎃 MainViewModel: Loaded Halloween pack (\(friendItems.count) monsters, \(outfitItems.count) costumes, \(placeItems.count) haunts, \(styleItems.count) styles)")
    }
    
    // MARK: - Image Generation
    
    func startImageGeneration() {
        guard allSelectionsReady && !isCreatingImage else {
            print("⚠️ Cannot start image generation: selections not ready or already generating")
            return
        }
        
        // Clear any previous error state
        clearImageGenerationError()
        
        // Reset generation complete flag when starting new generation
        isGenerationComplete = false
        
        // Get selected ingredients
        let friend = friendItems[friendIndex]
        let outfit = outfitItems[outfitIndex]
        let place = placeItems[placeIndex]
        
        // Get style ingredient if in fourCarousel mode
        // NOTE: Style uses TEXT DESCRIPTION modality (not reference image)
        // This is different from friend/outfit/place which use REFERENCE IMAGE modality
        var styleIngredient: Ingredient? = nil
        var styleDescription: String? = nil
        if viewMode == .fourCarousel {
            guard styleIndex >= 0 && styleIndex < styleItems.count else {
                print("⚠️ Cannot start image generation: style not selected in fourCarousel mode")
                return
            }
            styleIngredient = styleItems[styleIndex]
            // Style is passed as text description, not reference image
            // Use detailed prompt if available, otherwise fall back to simple name
            if let detailedPrompt = stylePrompts[styleIngredient!.id] {
                styleDescription = "Style: \(detailedPrompt)"
            } else {
                // Fallback to simple name if prompt not found
                styleDescription = "Style: \(styleIngredient!.name)"
            }
        }
        
        isCreatingImage = true
        buttonState = .generating
        
        // Extract reference image URLs from selected ingredients
        // Server expects asset paths like /static/assets/friends/01_star_puppy.png
        // The imageURL in ingredients is a full URL, so we need to extract the path
        // MODALITY 1: REFERENCE IMAGES (friend, outfit, place)
        var referenceImageIds: [String] = []
        
        func extractAssetPath(from urlString: String?) -> String? {
            guard let urlString = urlString, !urlString.isEmpty else { return nil }
            
            // If it's already a path starting with /static/assets/, use it as-is
            if urlString.hasPrefix("/static/assets/") {
                return urlString
            }
            
            // If it's a full URL (http://...), extract the path
            if urlString.hasPrefix("http://") || urlString.hasPrefix("https://") {
                if let url = URL(string: urlString) {
                    return url.path
                }
            }
            
            // If it doesn't start with /, it's probably a relative path - add prefix
            if !urlString.hasPrefix("/") {
                return "/static/assets/\(urlString)"
            }
            
            return urlString
        }
        
        // Extract asset paths from each selected ingredient unless this is a bundled pack
        if mediaPack != .halloween {
            if let friendPath = extractAssetPath(from: friend.imageURL) {
                referenceImageIds.append(friendPath)
            } else {
                print("⚠️ WARNING: Could not extract asset path from friend imageURL: \(friend.imageURL ?? "nil")")
            }
            
            if let outfitPath = extractAssetPath(from: outfit.imageURL) {
                referenceImageIds.append(outfitPath)
            } else {
                print("⚠️ WARNING: Could not extract asset path from outfit imageURL: \(outfit.imageURL ?? "nil")")
            }
            
            if let placePath = extractAssetPath(from: place.imageURL) {
                referenceImageIds.append(placePath)
            } else {
                print("⚠️ WARNING: Could not extract asset path from place imageURL: \(place.imageURL ?? "nil")")
            }
        }
        
        // Create request
        let selectedRecipeItems = [
            RecipeItem(id: friend.id, slotIndex: 0),
            RecipeItem(id: outfit.id, slotIndex: 1),
            RecipeItem(id: place.id, slotIndex: 2)
        ]
        // Bundled pack IDs do not exist in the server ingredient catalog.
        // Keep the required array in the request, but make Halloween text-only.
        let recipeItems = mediaPack == .halloween ? [] : selectedRecipeItems
        
        // MODALITY 2: TEXT DESCRIPTION (style)
        // Style is passed via freeTextDescription, not as a reference image
        // This is a different modality - we're being cautious here as this is new
        let freeTextDescription: String?
        if mediaPack == .halloween {
            var sentences = [
                "Silly kid-friendly Halloween picture, cute and funny, not scary.",
                "Character: \(friend.styleInjection).",
                "Outfit: \(outfit.styleInjection).",
                "Place: \(place.styleInjection)."
            ]
            if let styleIngredient {
                let styleText = stylePrompts[styleIngredient.id] ?? styleIngredient.styleInjection
                sentences.append("Art style: \(styleText).")
            }
            freeTextDescription = sentences.joined(separator: " ")
        } else if let styleDesc = styleDescription {
            freeTextDescription = styleDesc
        } else {
            freeTextDescription = nil
        }
        
        let request = CreateRequest(
            recipeItems: recipeItems,
            freeTextDescription: freeTextDescription,
            referenceImageIds: referenceImageIds.isEmpty ? nil : referenceImageIds
        )
        
        // DEBUG: Log condensed API request summary
        print("\n🎨 Image Generation Request:")
        print("   Friend: \(friend.name) | Outfit: \(outfit.name) | Place: \(place.name)")
        if let style = styleIngredient {
            print("   Style: \(style.name) (text description)")
        }
        if let prompt = request.freeTextDescription {
            print("   Prompt: \(prompt)")
        }
        print("   Reference Images: \(request.referenceImageIds?.count ?? 0) | Recipe Items: \(recipeItems.count)")
        
        // Start SSE stream for image generation
        imageGenerationTask = Task { [weak self] in
            await self?.streamImageGeneration(request: request)
        }
    }
    
    private func streamImageGeneration(request: CreateRequest) async {
        guard let url = URL(string: "\(apiClient.baseURL)/api/create") else {
            await MainActor.run {
                self.isCreatingImage = false
                self.buttonState = .notReady
                self.errorMessage = "Invalid API URL"
            }
            return
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        
        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
            
            // DEBUG: Log condensed HTTP request
            print("   → POST \(url.absoluteString)")
            
        } catch {
            print("❌ Failed to encode request: \(error)")
            await MainActor.run {
                self.handleImageGenerationError(error)
            }
            return
        }
        
        do {
            let (asyncBytes, response) = try await URLSession.shared.bytes(for: urlRequest)
            
            // DEBUG: Log server response
            if let httpResponse = response as? HTTPURLResponse {
                print("   ← \(httpResponse.statusCode)")
                
                guard httpResponse.statusCode == 200 else {
                    print("❌ Server returned error status: \(httpResponse.statusCode)")
                    await MainActor.run {
                        let error = NSError(domain: "ImageGeneration", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Server error: HTTP \(httpResponse.statusCode)"])
                        self.handleImageGenerationError(error)
                    }
                    return
                }
            } else {
                print("❌ Invalid response type: \(type(of: response))")
                await MainActor.run {
                    let error = NSError(domain: "ImageGeneration", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response type"])
                    self.handleImageGenerationError(error)
                }
                return
            }
            
            var buffer = ""
            do {
                for try await byte in asyncBytes {
                    if let char = String(data: Data([byte]), encoding: .utf8) {
                        buffer += char
                        
                        // Process complete lines
                        while let newlineIndex = buffer.firstIndex(of: "\n") {
                            let line = String(buffer[..<newlineIndex])
                            buffer = String(buffer[buffer.index(after: newlineIndex)...])
                            
                            if line.hasPrefix("data: ") {
                                let jsonString = String(line.dropFirst(6))
                                await processImageGenerationEvent(jsonString: jsonString)
                            }
                        }
                    }
                }
            } catch {
                // Stream reading error (timeout, connection lost, etc.)
                print("❌ Image generation stream reading error: \(error)")
                await MainActor.run {
                    self.handleImageGenerationError(error)
                }
                return
            }
        } catch {
            // Request/connection error
            print("❌ Image generation request error: \(error)")
            await MainActor.run {
                self.handleImageGenerationError(error)
            }
        }
    }
    
    private func processImageGenerationEvent(jsonString: String) async {
        guard let data = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            print("⚠️ Failed to parse image generation event: \(jsonString)")
            return
        }
        
        let status = json["status"] as? String ?? ""
        let imageURL = json["image_url"] as? String
        let isFinal = json["is_final"] as? Bool ?? false
        let type = json["type"] as? String ?? ""
        
        // Only log significant events (not every generating_prompt update)
        if status == "complete" || status == "error" || (imageURL != nil) {
            print("   📥 \(status)\(imageURL != nil ? " → image ready" : "")")
        }
        
        await MainActor.run {
            if let imageURL = imageURL {
                // Load and update preview image
                let baseURL = self.apiClient.baseURL
                let fullURL = imageURL.hasPrefix("http") ? imageURL : "\(baseURL)\(imageURL)"
                
                Task {
                    if let url = URL(string: fullURL),
                       let image = try? await ImageCache.shared.loadImage(from: url) {
                        await MainActor.run {
                            // Clear any error state when we get a successful image
                            self.imageGenerationError = nil
                            self.previewImage = image
                            print("✅ Preview image updated: \(status)")
                            
                            // If this is a final image (status "done" or type "final"), add to history and complete
                            if status == "done" || type == "final" || isFinal {
                                print("✅ Final image received, adding to history and completing generation")
                                self.addImageToHistory(imageURL: imageURL, prompt: json["prompt_used"] as? String)
                                self.finishImageGeneration()
                            }
                        }
                    }
                }
            }
            
            // Check for completion status (even if no image URL yet)
            if status == "done" || status == "completed" || type == "final" || isFinal {
                // Generation complete
                print("✅ Image generation completed (status: \(status), type: \(type))")
                
                // If we have an image URL but haven't added it yet, add it now
                if let imageURL = imageURL, !self.historyImages.contains(where: { $0.url == imageURL }) {
                    self.addImageToHistory(imageURL: imageURL, prompt: json["prompt_used"] as? String)
                }
                
                self.finishImageGeneration()
            } else if status == "error" {
                let message = json["message"] as? String ?? "Unknown error"
                print("❌ Image generation error from server: \(message)")
                self.handleImageGenerationError(NSError(domain: "ImageGeneration", code: -1, userInfo: [NSLocalizedDescriptionKey: message]))
            }
        }
    }
    
    private func addImageToHistory(imageURL: String, prompt: String?) {
        // Extract filename from URL (e.g., "/static/generated/image_id.png" -> "image_id.png")
        let filename = imageURL.split(separator: "/").last ?? "unknown.png"
        
        // Create new GeneratedImage (prepend to history for LIFO)
        let newImage = GeneratedImage(
            url: imageURL,
            filename: String(filename),
            createdAt: Date().timeIntervalSince1970,
            prompt: prompt,
            recipeItems: nil,
            deleted: false,
            isFavorite: nil // Will be set by server when we reload history
        )
        
        // Prepend to history (LIFO - newest first)
        historyImages.insert(newImage, at: 0)
        print("📸 Added new image to history: \(filename) (total: \(historyImages.count))")
        
        // Also reload from server after a short delay to ensure we have the latest data
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.loadHistory()
        }
    }
    
    private func finishImageGeneration() {
        // Reset state
        isCreatingImage = false
        buttonState = .notReady
        isGenerationComplete = true // Mark generation as complete to hide floating button animation
        
        // Deselect all carousels
        friendIndex = -1
        outfitIndex = -1
        placeIndex = -1
        
        print("🎉 Image generation complete, carousels reset")
    }
    
    // MARK: - Error Handling
    
    private func handleImageGenerationError(_ error: Error) {
        // Reset generation state
        isCreatingImage = false
        buttonState = .notReady
        isGenerationComplete = false // Reset flag on error
        
        // Log error details
        if let nsError = error as NSError? {
            print("❌ Image generation error:")
            print("   Domain: \(nsError.domain)")
            print("   Code: \(nsError.code)")
            print("   Description: \(nsError.localizedDescription)")
            
            // Check for specific error types
            if nsError.domain == NSURLErrorDomain {
                switch nsError.code {
                case NSURLErrorTimedOut:
                    print("   Type: Request timeout")
                case NSURLErrorNotConnectedToInternet:
                    print("   Type: No internet connection")
                case NSURLErrorNetworkConnectionLost:
                    print("   Type: Network connection lost")
                default:
                    print("   Type: Network error")
                }
            }
        } else {
            print("   Error: \(error.localizedDescription)")
        }
        
        // Show error in preview panel
        imageGenerationError = error.localizedDescription
        
        // Load broken.png as preview image
        if let brokenImage = UIImage(named: "broken") {
            previewImage = brokenImage
        }
    }
    
    func clearImageGenerationError() {
        imageGenerationError = nil
        previewImage = nil
    }
}
