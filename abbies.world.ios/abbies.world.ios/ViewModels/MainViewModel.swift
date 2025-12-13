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
    
    // Image generation error state
    @Published var showImageGenerationError = false
    
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
                    }
                }
            } catch {
                print("❌ MainViewModel: Error loading background from \(fullURL): \(error)")
            }
        }
    }
    
    func loadData() {
        loadBackgroundImage()
        loadIngredients()
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
                    guard let self = self else { return }
                    
                    if let firstBackground = backgrounds.first,
                       let assetURL = self.assetsService.assetURL(for: firstBackground) {
                        Task {
                            do {
                                if let image = try await ImageCache.shared.loadImage(from: assetURL) {
                                    await MainActor.run {
                                        self.backgroundImage = image
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
                    }
                    completed += 1
                    if completed == total {
                        self?.isLoadingIngredients = false
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self else { return }
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
                    }
                    completed += 1
                    if completed == total {
                        self?.isLoadingIngredients = false
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self else { return }
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
                    }
                    completed += 1
                    if completed == total {
                        self?.isLoadingIngredients = false
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self else { return }
                    let ingredients = self.createIngredientsFromAssets(assets, category: "world_setting", assetType: "places")
                    self.placeItems = ingredients
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
        isLoadingHistory = true
        
        apiClient.getGeneratedImages()
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
                    let filtered = images.filter { $0.deleted != true }
                    // Sort by createdAt descending (newest first) for LIFO
                    let sorted = filtered.sorted { $0.createdAt > $1.createdAt }
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
    }
    
    func selectOutfit(_ ingredient: Ingredient) {
        // Selection tracking - can be used for future functionality
    }
    
    func selectPlace(_ ingredient: Ingredient) {
        // Selection tracking - can be used for future functionality
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
        
        isCreatingImage = true
        buttonState = .generating
        
        // Extract reference image URLs from selected ingredients
        // Server expects asset paths like /static/assets/friends/01_star_puppy.png
        // The imageURL in ingredients is a full URL, so we need to extract the path
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
        
        // Extract asset paths from each selected ingredient
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
        
        // Create request
        let recipeItems = [
            RecipeItem(id: friend.id, slotIndex: 0),
            RecipeItem(id: outfit.id, slotIndex: 1),
            RecipeItem(id: place.id, slotIndex: 2)
        ]
        
        let request = CreateRequest(
            recipeItems: recipeItems,
            freeTextDescription: nil,
            referenceImageIds: referenceImageIds.isEmpty ? nil : referenceImageIds
        )
        
        // DEBUG: Log full API request details
        let separator = String(repeating: "=", count: 80)
        print(separator)
        print("🚀 API REQUEST DEBUG - Image Generation")
        print(separator)
        print("📍 Endpoint: \(apiClient.baseURL)/api/create")
        print("📋 Request Method: POST")
        
        // Log selected ingredients
        print("\n📝 Selected Ingredients:")
        print("   Friend: '\(friend.name)' (id: \(friend.id))")
        print("      Image URL: \(friend.imageURL ?? "nil")")
        print("   Outfit: '\(outfit.name)' (id: \(outfit.id))")
        print("      Image URL: \(outfit.imageURL ?? "nil")")
        print("   Place: '\(place.name)' (id: \(place.id))")
        print("      Image URL: \(place.imageURL ?? "nil")")
        
        // Log request components
        print("\n📦 Request Components:")
        print("   Recipe Items (\(recipeItems.count)):")
        for (index, item) in recipeItems.enumerated() {
            print("      [\(index)] id: '\(item.id)', slotIndex: \(item.slotIndex?.description ?? "nil")")
        }
        print("   Free Text Description: \(request.freeTextDescription ?? "nil")")
        print("   Reference Image IDs: \(request.referenceImageIds?.count ?? 0) images")
        if let refImages = request.referenceImageIds, !refImages.isEmpty {
            print("      Reference Images (\(refImages.count)):")
            for (index, refId) in refImages.enumerated() {
                print("         [\(index)] \(refId)")
            }
        } else {
            print("      ⚠️ WARNING: No reference images provided!")
        }
        
        // Log full JSON body
        print("\n📄 Full JSON Request Body:")
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let jsonData = try encoder.encode(request)
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print(jsonString)
            } else {
                print("   ⚠️ Failed to convert request to JSON string")
            }
        } catch {
            print("   ❌ Failed to encode request: \(error)")
        }
        
        print(separator)
        
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
            
            // DEBUG: Log actual HTTP request being sent
            print("\n📤 SENDING HTTP REQUEST:")
            print("   URL: \(url.absoluteString)")
            print("   Method: \(urlRequest.httpMethod ?? "unknown")")
            print("   Headers:")
            if let headers = urlRequest.allHTTPHeaderFields {
                for (key, value) in headers.sorted(by: { $0.key < $1.key }) {
                    if key == "Authorization" {
                        let preview = String(value.prefix(20)) + "..."
                        print("      \(key): \(preview)")
                    } else {
                        print("      \(key): \(value)")
                    }
                }
            }
            if let body = urlRequest.httpBody {
                print("   Body Size: \(body.count) bytes")
                if let bodyString = String(data: body, encoding: .utf8) {
                    print("   Body Preview (first 500 chars):")
                    let preview = bodyString.count > 500 ? String(bodyString.prefix(500)) + "..." : bodyString
                    print("      \(preview.replacingOccurrences(of: "\n", with: "\\n"))")
                }
            }
            print("")
            
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
                print("📥 SERVER RESPONSE:")
                print("   Status Code: \(httpResponse.statusCode)")
                print("   Headers:")
                for (key, value) in httpResponse.allHeaderFields.sorted(by: { "\($0.key)" < "\($1.key)" }) {
                    print("      \(key): \(value)")
                }
                print("")
                
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
    
    // MARK: - Error Handling
    
    private func handleImageGenerationError(_ error: Error) {
        // Reset generation state
        isCreatingImage = false
        buttonState = .notReady
        
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
        
        // Show error dialog (non-blocking)
        showImageGenerationError = true
    }
    
    func dismissImageGenerationError() {
        showImageGenerationError = false
    }
}
