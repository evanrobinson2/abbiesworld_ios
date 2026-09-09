//
//  APIClient.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//

import Foundation
import Combine

enum APIClientError: LocalizedError {
    case invalidResponse
    case unauthorized
    case httpStatus(Int)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "The server sent an invalid response."
        case .unauthorized:
            return "Couldn’t load Abbie’s pictures because server access is not configured."
        case .httpStatus(let statusCode):
            return "The server returned HTTP \(statusCode)."
        }
    }
}

class APIClient: ObservableObject {
    static let shared = APIClient()
    
    /// Base URL from centralized ServerConfig
    /// Can be overridden via UserDefaults or Info.plist
    var baseURL: String {
        return ServerConfig.shared.baseURL
    }
    
    init() {
        // Base URL is now managed by ServerConfig
        // Override via: ServerConfig.shared.setBaseURL("http://your-server:8000")
        // Or set in Info.plist with key "ServerBaseURL"
    }
    
    // MARK: - Health Check
    
    func checkHealth() -> AnyPublisher<HealthResponse, Error> {
        return request(url: "\(baseURL)/api/health", method: "GET")
    }
    
    // MARK: - Ingredients
    
    func getIngredients() -> AnyPublisher<[Ingredient], Error> {
        return request(url: "\(baseURL)/api/ingredients", method: "GET")
    }
    
    // MARK: - Generated Images
    
    func getGeneratedImages() -> AnyPublisher<[GeneratedImage], Error> {
        return request(url: "\(baseURL)/api/generated-images", method: "GET")
    }
    
    func getFavorites() -> AnyPublisher<[GeneratedImage], Error> {
        return request(url: "\(baseURL)/api/generated-images?favorites_only=true", method: "GET")
    }
    
    // MARK: - Favorites
    
    func toggleFavorite(filename: String, isFavorite: Bool) -> AnyPublisher<FavoriteResponse, Error> {
        guard let url = URL(string: "\(baseURL)/api/favorite-image") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add API key header if available
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        
        let body: [String: Any] = [
            "filename": filename,
            "favorite": isFavorite
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            return Fail(error: error)
                .eraseToAnyPublisher()
        }
        
        return validatedDataPublisher(for: request)
            .decode(type: FavoriteResponse.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
    
    // MARK: - Create Image
    
    func createImage(request: CreateRequest) -> AnyPublisher<URLSession.DataTaskPublisher.Output, Error> {
        guard let url = URL(string: "\(baseURL)/api/create") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add API key header if available
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        
        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
        } catch {
            return Fail(error: error)
                .eraseToAnyPublisher()
        }
        
        return URLSession.shared.dataTaskPublisher(for: urlRequest)
            .mapError { $0 as Error }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Helper

    func validatedDataPublisher(for request: URLRequest) -> AnyPublisher<Data, Error> {
        URLSession.shared.dataTaskPublisher(for: request)
            .tryMap { output in
                guard let response = output.response as? HTTPURLResponse else {
                    throw APIClientError.invalidResponse
                }

                guard (200..<300).contains(response.statusCode) else {
                    if response.statusCode == 401 || response.statusCode == 403 {
                        throw APIClientError.unauthorized
                    }
                    throw APIClientError.httpStatus(response.statusCode)
                }

                return output.data
            }
            .eraseToAnyPublisher()
    }
    
    private func request<T: Decodable>(url: String, method: String) -> AnyPublisher<T, Error> {
        guard let url = URL(string: url) else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = method
        
        // Add API key header if available
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        
        return validatedDataPublisher(for: urlRequest)
            .decode(type: T.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
}

struct FavoriteResponse: Codable {
    let success: Bool
    let favorite: Bool
    let message: String?
}
