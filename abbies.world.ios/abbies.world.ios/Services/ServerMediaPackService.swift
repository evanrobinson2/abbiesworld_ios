//
//  ServerMediaPackService.swift
//  abbies.world.ios
//
//  Fetches server-managed media packs per CLIENT_MEDIA_PACK_CONTRACT_V1.
//

import Foundation
import Combine

enum ServerMediaPackError: LocalizedError {
    case invalidResponse
    case httpStatus(Int)
    case checksumMismatch(expected: String, actual: String)
    case packNotFound(String)
    case manifestNotFound(packId: String, version: Int)
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpStatus(let code):
            return "Server returned HTTP \(code)"
        case .checksumMismatch(let expected, let actual):
            return "Checksum mismatch: expected \(expected.prefix(8))..., got \(actual.prefix(8))..."
        case .packNotFound(let packId):
            return "Pack not found: \(packId)"
        case .manifestNotFound(let packId, let version):
            return "Manifest not found: \(packId) v\(version)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

class ServerMediaPackService {
    static let shared = ServerMediaPackService()
    
    private let baseURL: String
    private let decoder: JSONDecoder
    
    init(baseURL: String? = nil) {
        self.baseURL = baseURL ?? ServerConfig.shared.baseURL
        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601
    }
    
    // MARK: - Fetch Pack Index
    
    func fetchPackIndex() -> AnyPublisher<PackIndexResponse, Error> {
        let urlString = "\(baseURL)/api/media-packs"
        guard let url = URL(string: urlString) else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .tryMap { output in
                guard let response = output.response as? HTTPURLResponse else {
                    throw ServerMediaPackError.invalidResponse
                }
                guard (200..<300).contains(response.statusCode) else {
                    throw ServerMediaPackError.httpStatus(response.statusCode)
                }
                return output.data
            }
            .decode(type: PackIndexResponse.self, decoder: decoder)
            .eraseToAnyPublisher()
    }
    
    // MARK: - Fetch Pack Manifest
    
    func fetchManifest(packId: String, version: Int) -> AnyPublisher<PackManifest, Error> {
        let urlString = "\(baseURL)/api/media-packs/\(packId)/versions/\(version)/manifest"
        guard let url = URL(string: urlString) else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .tryMap { output in
                guard let response = output.response as? HTTPURLResponse else {
                    throw ServerMediaPackError.invalidResponse
                }
                guard (200..<300).contains(response.statusCode) else {
                    if response.statusCode == 404 {
                        throw ServerMediaPackError.manifestNotFound(packId: packId, version: version)
                    }
                    throw ServerMediaPackError.httpStatus(response.statusCode)
                }
                return output.data
            }
            .decode(type: PackManifest.self, decoder: decoder)
            .eraseToAnyPublisher()
    }
    
    // MARK: - Download Asset with Checksum Verification
    
    func downloadAsset(url assetURL: String, expectedChecksum: String) async throws -> Data {
        let fullURL: String
        if assetURL.hasPrefix("http") {
            fullURL = assetURL
        } else if assetURL.hasPrefix("/") {
            fullURL = "\(baseURL)\(assetURL)"
        } else {
            fullURL = "\(baseURL)/\(assetURL)"
        }
        
        guard let url = URL(string: fullURL) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw ServerMediaPackError.httpStatus((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        
        let actualChecksum = sha256(data: data)
        guard actualChecksum == expectedChecksum else {
            throw ServerMediaPackError.checksumMismatch(expected: expectedChecksum, actual: actualChecksum)
        }
        
        return data
    }
    
    // MARK: - Download Asset (no checksum verification, for optional assets)
    
    func downloadAsset(url assetURL: String) async throws -> Data {
        let fullURL: String
        if assetURL.hasPrefix("http") {
            fullURL = assetURL
        } else if assetURL.hasPrefix("/") {
            fullURL = "\(baseURL)\(assetURL)"
        } else {
            fullURL = "\(baseURL)/\(assetURL)"
        }
        
        guard let url = URL(string: fullURL) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw ServerMediaPackError.httpStatus((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        
        return data
    }
    
    // MARK: - SHA-256 Checksum
    
    func sha256(data: Data) -> String {
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes {
            _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash)
        }
        return hash.map { String(format: "%02x", $0) }.joined()
    }
    
    func verifyChecksum(_ data: Data, expected: String) -> Bool {
        sha256(data: data) == expected
    }
}

// CommonCrypto import for SHA-256
import CommonCrypto
