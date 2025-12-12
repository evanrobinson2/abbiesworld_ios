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
    
    // Carousel indices
    @Published var friendIndex = -1
    @Published var outfitIndex = -1
    @Published var placeIndex = -1
    
    // Ingredients by category (filtered from API)
    @Published var friendItems: [Ingredient] = []
    @Published var outfitItems: [Ingredient] = []
    @Published var placeItems: [Ingredient] = []
    
    // Preview and history
    @Published var previewImage: UIImage?
    @Published var historyImages: [GeneratedImage] = []
    
    // Background image
    @Published var backgroundImage: UIImage?
    
    // Button state
    @Published var buttonState: GenerationButtonState = .notReady
    
    // Loading states
    @Published var isLoadingIngredients = false
    @Published var isLoadingHistory = false
    @Published var isCreatingImage = false
    @Published var errorMessage: String?
    
    // Toast notifications
    @Published var toastMessage: ToastMessage?
    
    // All ingredients from API
    // Removed allIngredients - carousels now load directly from Assets API
    
    init() {
        setupCategoryMapping()
        setupSSEConnection()
        setupButtonStateObserver()
    }
    
    // Computed property to check if all selections are ready
    var allSelectionsReady: Bool {
        friendIndex >= 0 && outfitIndex >= 0 && placeIndex >= 0 &&
        friendIndex < friendItems.count &&
        outfitIndex < outfitItems.count &&
        placeIndex < placeItems.count
    }
    
    // Observe carousel index changes to update button state
    private func setupButtonStateObserver() {
        Publishers.CombineLatest3(
            $friendIndex,
            $outfitIndex,
            $placeIndex
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] _, _, _ in
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
                print("📥 MainViewModel: Config updated notification received")
            }
            .store(in: &cancellables)
    }
    
    private func handleSSEEvent(_ event: SSEEvent) {
        switch event.type {
        case .connected:
            print("✅ MainViewModel: SSE connected")
            showToast("Connected to server", type: .success)
            
        case .reloadCache:
            print("🔄 MainViewModel: Cache reload requested")
            showToast("Cache cleared", type: .info)
            // Cache is already cleared by SSEService
            // Reload images that might be cached
            self.loadBackgroundImage()
            
        case .refreshIngredients:
            print("🔄 MainViewModel: Ingredients refresh requested")
            showToast("Refreshing ingredients...", type: .info)
            loadIngredients()
            
        case .backgroundChanged:
            if let backgroundURL = event.data["background_url"] as? String {
                print("🖼️ MainViewModel: Background changed to: \(backgroundURL)")
                showToast("Background updated", type: .success)
                loadBackgroundFromURL(backgroundURL)
            }
            
        case .maintenance:
            let enabled = event.data["enabled"] as? Bool ?? true
            let message = event.data["message"] as? String ?? "Maintenance mode"
            print("🔧 MainViewModel: Maintenance mode: \(enabled) - \(message)")
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
                print("🎨 MainViewModel: Attempting to parse color hex: '\(colorHex)'")
                customColor = Color(hex: colorHex)
                if customColor == nil {
                    print("⚠️ MainViewModel: Failed to parse color hex: '\(colorHex)' - Color(hex:) returned nil")
                } else {
                    print("✅ MainViewModel: Successfully parsed custom color: '\(colorHex)'")
                }
            } else {
                print("ℹ️ MainViewModel: No color provided in toast event")
            }
            
            // Parse custom icon (emoji string)
            let customIcon = event.data["icon"] as? String
            
            // Parse image URL (for asset notifications)
            let imageURL = event.data["image_url"] as? String
            
            // Parse position (top or bottom_right)
            let positionString = event.data["position"] as? String ?? "top"
            print("📍 MainViewModel: Parsing toast position: '\(positionString)'")
            let position: ToastView.ToastPosition = positionString.lowercased() == "bottom_right" || positionString.lowercased() == "bottomright" ? .bottomRight : .top
            print("📍 MainViewModel: Toast position set to: \(position == .bottomRight ? "bottomRight" : "top")")
            
            // Debug image URL
            if let imageURL = imageURL {
                print("🖼️ MainViewModel: Toast image URL: \(imageURL)")
            } else {
                print("ℹ️ MainViewModel: No image URL provided in toast")
            }
            
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
                        self.backgroundImage = image
                        print("✅ Background image updated from: \(fullURL)")
                    }
                }
            } catch {
                print("❌ MainViewModel: Error loading background from \(fullURL): \(error)")
            }
        }
    }
    
    func loadData() {
        print("🚀 MainViewModel: loadData() called")
        print("📱 App starting - loading all data...")
        loadBackgroundImage()
        loadIngredients()
        loadHistory()
        
        // Connect to SSE event stream
        sseService.connect()
    }
    
    private func loadBackgroundImage() {
        print("🖼️ MainViewModel: loadBackgroundImage() called")
        // Use Assets API to find and load background
        let baseURL = apiClient.baseURL
        print("   Base URL: \(baseURL)")
        
        // Use Combine to get backgrounds from Assets API
        assetsService.getAssets(type: "backgrounds")
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        print("❌ Error loading background from Assets API: \(error)")
                        if let nsError = error as NSError? {
                            print("   Error code: \(nsError.code)")
                            print("   Error domain: \(nsError.domain)")
                            print("   Error description: \(error.localizedDescription)")
                            if nsError.code == -1011 {
                                print("   ⚠️ Error -1011: Request timeout or connection refused")
                                print("   💡 Check if server is running on \(baseURL)")
                                print("   💡 Check mDNS resolution for abbiesworld.local")
                            }
                        }
                        // Fallback to bundled
                        self?.loadBundledBackground()
                    }
                },
                receiveValue: { [weak self] backgrounds in
                    guard let self = self else { return }
                    
                    if let firstBackground = backgrounds.first,
                       let assetURL = self.assetsService.assetURL(for: firstBackground) {
                        print("🌐 Attempting to load background from Assets API: \(assetURL.absoluteString)")
                        
                        Task {
                            do {
                                if let image = try await ImageCache.shared.loadImage(from: assetURL) {
                                    await MainActor.run {
                                        self.backgroundImage = image
                                        print("✅ Background image loaded successfully from Assets API")
                                    }
                                } else {
                                    print("⚠️ Background image download returned nil, using bundled fallback")
                                    await MainActor.run {
                                        self.loadBundledBackground()
                                    }
                                }
                            } catch {
                                print("❌ Error loading background image: \(error)")
                                await MainActor.run {
                                    self.loadBundledBackground()
                                }
                            }
                        }
                    } else {
                        print("⚠️ No backgrounds found in Assets API, using bundled fallback")
                        self.loadBundledBackground()
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    private func loadBundledBackground() {
        print("📦 Attempting to load bundled background image")
        // Try bundled images as fallback
        if let imagePath = Bundle.main.path(forResource: "background", ofType: "png") ??
                          Bundle.main.path(forResource: "background", ofType: "jpg") ??
                          Bundle.main.path(forResource: "1", ofType: "png") ??
                          Bundle.main.path(forResource: "2", ofType: "png"),
           let image = UIImage(contentsOfFile: imagePath) {
            self.backgroundImage = image
            print("✅ Background image loaded from bundle: \(imagePath)")
        } else {
            // Final fallback to white
            print("❌ Could not load background image from bundle")
            print("   Searched for: background.png, background.jpg, 1.png, 2.png in Resources/")
            self.backgroundImage = nil
        }
    }
    
    private func loadIngredients() {
        print("📦 MainViewModel: loadIngredients() called")
        // Load carousel items directly from Assets API
        isLoadingIngredients = true
        errorMessage = nil
        
        // Load all assets first
        assetsService.loadAllAssets()
        
        // Load carousel items from Assets API
        loadCarouselItems()
    }
    
    private func loadCarouselItems() {
        print("🎠 Loading carousel items from Assets API")
        
        var completed = 0
        let total = 3
        
        // Load friends
        assetsService.getAssets(type: "friends")
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        print("❌ Error loading friends assets: \(error)")
                    }
                    completed += 1
                    if completed == total {
                        self?.isLoadingIngredients = false
                        print("✅ All carousel items loaded")
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self else { return }
                    print("📥 Received \(assets.count) friends assets")
                    let ingredients = self.createIngredientsFromAssets(assets, category: "character_style", assetType: "friends")
                    self.friendItems = ingredients
                    print("👥 Friend items: \(ingredients.count)")
                }
            )
            .store(in: &cancellables)
        
        // Load outfits
        assetsService.getAssets(type: "outfits")
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        print("❌ Error loading outfits assets: \(error)")
                    }
                    completed += 1
                    if completed == total {
                        self?.isLoadingIngredients = false
                        print("✅ All carousel items loaded")
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self else { return }
                    print("📥 Received \(assets.count) outfits assets")
                    let ingredients = self.createIngredientsFromAssets(assets, category: "color_palette", assetType: "outfits")
                    self.outfitItems = ingredients
                    print("👗 Outfit items: \(ingredients.count)")
                }
            )
            .store(in: &cancellables)
        
        // Load places
        assetsService.getAssets(type: "places")
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        print("❌ Error loading places assets: \(error)")
                    }
                    completed += 1
                    if completed == total {
                        self?.isLoadingIngredients = false
                        print("✅ All carousel items loaded")
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self else { return }
                    print("📥 Received \(assets.count) places assets")
                    let ingredients = self.createIngredientsFromAssets(assets, category: "world_setting", assetType: "places")
                    self.placeItems = ingredients
                    print("📍 Place items: \(ingredients.count)")
                }
            )
            .store(in: &cancellables)
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
        print("📚 MainViewModel: loadHistory() called")
        print("   API URL: \(apiClient.baseURL)/api/generated-images")
        isLoadingHistory = true
        
        apiClient.getGeneratedImages()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoadingHistory = false
                    if case .failure(let error) = completion {
                        print("❌ Error loading history: \(error)")
                        if let nsError = error as NSError? {
                            print("   Error code: \(nsError.code)")
                            print("   Error domain: \(nsError.domain)")
                            print("   Error description: \(error.localizedDescription)")
                            if nsError.code == -1011 {
                                print("   ⚠️ Error -1011: Request timeout or connection refused")
                                print("   💡 Check if server is running on \(self?.apiClient.baseURL ?? "unknown")")
                            }
                        }
                        // Show error to user
                        self?.errorMessage = "Failed to load history: \(error.localizedDescription)"
                    } else {
                        print("✅ History loading completed successfully")
                    }
                },
                receiveValue: { [weak self] images in
                    guard let self = self else { return }
                    let filtered = images.filter { $0.deleted != true }
                    // Sort by createdAt descending (newest first) for LIFO
                    let sorted = filtered.sorted { $0.createdAt > $1.createdAt }
                    print("📥 Received \(images.count) total images, \(filtered.count) after filtering deleted, \(sorted.count) after sorting")
                    self.historyImages = sorted
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
        print("Friend selected: \(ingredient.name)")
    }
    
    func selectOutfit(_ ingredient: Ingredient) {
        // Selection tracking - can be used for future functionality
        print("Outfit selected: \(ingredient.name)")
    }
    
    func selectPlace(_ ingredient: Ingredient) {
        // Selection tracking - can be used for future functionality
        print("Place selected: \(ingredient.name)")
    }
    
    // MARK: - Image Generation
    
    func startImageGeneration() {
        guard allSelectionsReady && !isCreatingImage else {
            print("⚠️ Cannot start image generation: selections not ready or already generating")
            return
        }
        
        // Get selected ingredients
        let friend = friendItems[friendIndex]
        let outfit = outfitItems[outfitIndex]
        let place = placeItems[placeIndex]
        
        print("🎨 Starting image generation with:")
        print("   Friend: \(friend.name)")
        print("   Outfit: \(outfit.name)")
        print("   Place: \(place.name)")
        
        isCreatingImage = true
        buttonState = .generating
        
        // Create request
        let recipeItems = [
            RecipeItem(id: friend.id, slotIndex: 0),
            RecipeItem(id: outfit.id, slotIndex: 1),
            RecipeItem(id: place.id, slotIndex: 2)
        ]
        
        let request = CreateRequest(
            recipeItems: recipeItems,
            freeTextDescription: nil,
            referenceImageIds: nil
        )
        
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
        
        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
        } catch {
            await MainActor.run {
                self.isCreatingImage = false
                self.buttonState = .notReady
                self.errorMessage = "Failed to encode request: \(error.localizedDescription)"
            }
            return
        }
        
        do {
            let (asyncBytes, response) = try await URLSession.shared.bytes(for: urlRequest)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                await MainActor.run {
                    self.isCreatingImage = false
                    self.buttonState = .notReady
                    self.errorMessage = "Server error: \(response)"
                }
                return
            }
            
            var buffer = ""
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
            await MainActor.run {
                self.isCreatingImage = false
                self.buttonState = .notReady
                self.errorMessage = "Image generation error: \(error.localizedDescription)"
            }
            print("❌ Image generation stream error: \(error)")
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
        
        print("📥 Image generation event: status=\(status), type=\(type), isFinal=\(isFinal), imageURL=\(imageURL ?? "nil")")
        
        await MainActor.run {
            if let imageURL = imageURL {
                // Load and update preview image
                let baseURL = self.apiClient.baseURL
                let fullURL = imageURL.hasPrefix("http") ? imageURL : "\(baseURL)\(imageURL)"
                
                Task {
                    if let url = URL(string: fullURL),
                       let image = try? await ImageCache.shared.loadImage(from: url) {
                        await MainActor.run {
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
                self.errorMessage = "Image generation failed: \(message)"
                self.isCreatingImage = false
                self.buttonState = .notReady
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
            deleted: false
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
        
        // Deselect all carousels
        friendIndex = -1
        outfitIndex = -1
        placeIndex = -1
        
        print("🎉 Image generation complete, carousels reset")
    }
}
