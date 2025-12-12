//
//  APIClient.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//

import Foundation
import Combine

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
    
    // MARK: - Create Image
    
    func createImage(request: CreateRequest) -> AnyPublisher<URLSession.DataTaskPublisher.Output, Error> {
        guard let url = URL(string: "\(baseURL)/api/create") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
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
    
    private func request<T: Decodable>(url: String, method: String) -> AnyPublisher<T, Error> {
        guard let url = URL(string: url) else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = method
        
        return URLSession.shared.dataTaskPublisher(for: urlRequest)
            .map(\.data)
            .decode(type: T.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
}
