//
//  AssetsService.swift
//  My First Swift
//
//  Service for discovering and accessing static assets via the Assets API
//

import Foundation
import Combine

/// Asset metadata structure matching the API response
struct Asset: Codable, Identifiable {
    let name: String
    let type: String
    let url: String
    let size: Int
    let mimeType: String
    let modified: String
    
    var id: String { "\(type)/\(name)" }
    
    enum CodingKeys: String, CodingKey {
        case name
        case type
        case url
        case size
        case mimeType = "mime_type"
        case modified
    }
}

/// Asset types response
struct AssetTypesResponse: Codable {
    let types: [String]
    let count: Int
}

/// Assets by type response
struct AssetsByTypeResponse: Codable {
    let type: String
    let assets: [Asset]
    let count: Int
}

/// All assets response
struct AllAssetsResponse: Codable {
    let assets: [String: [Asset]]
    let summary: AssetSummary
}

struct AssetSummary: Codable {
    let totalTypes: Int
    let totalAssets: Int
    
    enum CodingKeys: String, CodingKey {
        case totalTypes = "total_types"
        case totalAssets = "total_assets"
    }
}

/// Service for accessing the Assets API
class AssetsService: ObservableObject {
    static let shared = AssetsService()
    
    private let apiClient = APIClient.shared
    private var cancellables = Set<AnyCancellable>()
    
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Cached assets by type
    @Published var assetsByType: [String: [Asset]] = [:]
    
    init() {
        // Load assets on initialization
        loadAllAssets()
    }
    
    // MARK: - Public Methods
    
    /// Get all available asset types
    func getAssetTypes() -> AnyPublisher<[String], Error> {
        guard let url = URL(string: "\(apiClient.baseURL)/api/assets/types") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: AssetTypesResponse.self, decoder: JSONDecoder())
            .map { $0.types }
            .eraseToAnyPublisher()
    }
    
    /// Get all assets organized by type
    func getAllAssets() -> AnyPublisher<[String: [Asset]], Error> {
        guard let url = URL(string: "\(apiClient.baseURL)/api/assets") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: AllAssetsResponse.self, decoder: JSONDecoder())
            .map { $0.assets }
            .eraseToAnyPublisher()
    }
    
    /// Get assets of a specific type
    func getAssets(type: String) -> AnyPublisher<[Asset], Error> {
        // URL encode the type (handles nested types like "ui/icons")
        guard let encodedType = type.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "\(apiClient.baseURL)/api/assets/\(encodedType)") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: AssetsByTypeResponse.self, decoder: JSONDecoder())
            .map { $0.assets }
            .eraseToAnyPublisher()
    }
    
    /// Get metadata for a specific asset
    func getAssetMetadata(type: String, name: String) -> AnyPublisher<Asset, Error> {
        guard let encodedType = type.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let encodedName = name.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "\(apiClient.baseURL)/api/assets/\(encodedType)/\(encodedName)") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: Asset.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
    
    /// Build full URL for an asset
    func assetURL(for asset: Asset) -> URL? {
        // Asset.url is already a path like "/static/assets/friends/01_star_puppy.png"
        return URL(string: "\(apiClient.baseURL)\(asset.url)")
    }
    
    /// Build full URL from type and name
    func assetURL(type: String, name: String) -> URL? {
        return URL(string: "\(apiClient.baseURL)/static/assets/\(type.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? type)/\(name.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? name)")
    }
    
    // MARK: - Convenience Methods
    
    /// Load all assets and cache them
    func loadAllAssets() {
        isLoading = true
        errorMessage = nil
        
        getAllAssets()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    if case .failure(let error) = completion {
                        self?.errorMessage = "Failed to load assets: \(error.localizedDescription)"
                        print("❌ AssetsService: Error loading assets: \(error)")
                    }
                },
                receiveValue: { [weak self] assets in
                    self?.assetsByType = assets
                    print("✅ AssetsService: Loaded \(assets.values.reduce(0) { $0 + $1.count }) assets across \(assets.count) types")
                    for (type, typeAssets) in assets {
                        print("   \(type): \(typeAssets.count) assets")
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    /// Get cached assets for a type, or load if not cached
    func getAssetsForType(_ type: String) -> [Asset] {
        return assetsByType[type] ?? []
    }
}




