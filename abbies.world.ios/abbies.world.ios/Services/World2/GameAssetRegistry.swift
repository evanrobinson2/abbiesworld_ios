//
//  GameAssetRegistry.swift
//  abbies.world.ios
//
//  Read-only Game Asset API v1 client used by the shipped World 2 app.
//

import CryptoKit
import Foundation

enum GameAssetRegistryAvailability: Equatable {
    case unchecked
    case unavailable
    case available
    case failed
}

struct GameAssetRecord: Decodable {
    struct Source: Decodable {
        enum SourceType: String, Decodable {
            case hosted
            case external
            case bundled
        }

        let type: SourceType
        let bundleName: String?
        let filename: String?
        let url: String?
    }

    let schemaVersion: Int
    let gameKey: String
    let key: String
    let revision: Int
    let source: Source
    let deliveryURL: String?
    let mimeType: String?
    let sha256: String?
}

enum GameAssetLocation: Equatable {
    case bundled(name: String)
    case remote(url: URL, requiresReadCredential: Bool)
}

enum GameAssetRegistryError: Error, LocalizedError {
    case invalidServerURL
    case invalidResponse
    case httpStatus(Int)
    case invalidAssetRecord
    case insecureExternalURL
    case missingContentHash
    case mimeTypeMismatch(expected: String, received: String?)
    case hashMismatch(expected: String, received: String)

    var errorDescription: String? {
        switch self {
        case .invalidServerURL:
            return "The configured asset-registry server URL is invalid."
        case .invalidResponse:
            return "The asset registry returned an invalid response."
        case .httpStatus(let status):
            return "The asset registry returned HTTP \(status)."
        case .invalidAssetRecord:
            return "The asset-registry record does not describe a usable source."
        case .insecureExternalURL:
            return "External asset URLs must use HTTPS."
        case .missingContentHash:
            return "Remote asset records must include a SHA-256 hash."
        case .mimeTypeMismatch(let expected, let received):
            return "Asset MIME mismatch. Expected \(expected), received \(received ?? "none")."
        case .hashMismatch(let expected, let received):
            return "Asset hash mismatch. Expected \(expected), received \(received)."
        }
    }
}

struct GameAssetRegistryClient {
    static let world2GameKey = "abbies-world-2"

    let gameKey: String
    let baseURL: URL
    let session: URLSession

    init(
        gameKey: String = Self.world2GameKey,
        baseURL: URL? = URL(string: ServerConfig.shared.baseURL),
        session: URLSession = .shared
    ) throws {
        guard let baseURL else {
            throw GameAssetRegistryError.invalidServerURL
        }
        self.gameKey = gameKey
        self.baseURL = baseURL
        self.session = session
    }

    func availability() async throws -> GameAssetRegistryAvailability {
        let url = endpoint(["api", "v1", "asset-schema"])
        var request = URLRequest(url: url)
        request.timeoutInterval = 5
        ServerConfig.shared.addAPIKeyHeader(to: &request)

        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw GameAssetRegistryError.invalidResponse
        }
        if http.statusCode == 404 {
            return .unavailable
        }
        guard (200..<300).contains(http.statusCode) else {
            throw GameAssetRegistryError.httpStatus(http.statusCode)
        }
        return .available
    }

    func current(_ assetKey: String) async throws -> GameAssetRecord {
        var components = ["api", "v1", "games", gameKey, "assets"]
        components.append(contentsOf: assetKey.split(separator: "/").map(String.init))
        return try await record(assetKey: assetKey, components: components)
    }

    func revision(_ revision: Int, of assetKey: String) async throws -> GameAssetRecord {
        guard revision > 0 else {
            throw GameAssetRegistryError.invalidAssetRecord
        }
        var components = ["api", "v1", "games", gameKey, "assets"]
        components.append(contentsOf: assetKey.split(separator: "/").map(String.init))
        components.append(contentsOf: ["revisions", String(revision)])
        let record = try await record(assetKey: assetKey, components: components)
        guard record.revision == revision else {
            throw GameAssetRegistryError.invalidAssetRecord
        }
        return record
    }

    private func record(
        assetKey: String,
        components: [String]
    ) async throws -> GameAssetRecord {
        var request = URLRequest(url: endpoint(components))
        request.timeoutInterval = 8
        ServerConfig.shared.addAPIKeyHeader(to: &request)

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw GameAssetRegistryError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw GameAssetRegistryError.httpStatus(http.statusCode)
        }

        let record = try JSONDecoder().decode(GameAssetRecord.self, from: data)
        guard record.schemaVersion == 1,
              record.gameKey == gameKey,
              record.key == assetKey,
              record.revision > 0 else {
            throw GameAssetRegistryError.invalidAssetRecord
        }
        return record
    }

    func location(for record: GameAssetRecord) throws -> GameAssetLocation {
        if record.source.type == .bundled {
            guard let name = record.source.bundleName, !name.isEmpty else {
                throw GameAssetRegistryError.invalidAssetRecord
            }
            return .bundled(name: name)
        }

        let value = record.deliveryURL ?? record.source.url
        guard let value,
              let resolvedURL = URL(string: value, relativeTo: baseURL)?.absoluteURL else {
            throw GameAssetRegistryError.invalidAssetRecord
        }

        if record.source.type == .external,
           resolvedURL.scheme?.lowercased() != "https" {
            throw GameAssetRegistryError.insecureExternalURL
        }

        let requiresReadCredential =
            record.source.type != .external && isSameOrigin(resolvedURL, baseURL)
        return .remote(
            url: resolvedURL,
            requiresReadCredential: requiresReadCredential
        )
    }

    func data(for record: GameAssetRecord) async throws -> Data {
        let location = try location(for: record)
        guard case .remote(let url, let requiresReadCredential) = location else {
            throw GameAssetRegistryError.invalidAssetRecord
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 15
        if requiresReadCredential {
            ServerConfig.shared.addAPIKeyHeader(to: &request)
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw GameAssetRegistryError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw GameAssetRegistryError.httpStatus(http.statusCode)
        }

        if let expectedMime = record.mimeType?.lowercased() {
            let receivedMime = http.mimeType?.lowercased()
            guard receivedMime == expectedMime else {
                throw GameAssetRegistryError.mimeTypeMismatch(
                    expected: expectedMime,
                    received: receivedMime
                )
            }
        }

        guard let expectedHash = record.sha256?.lowercased(), !expectedHash.isEmpty else {
            throw GameAssetRegistryError.missingContentHash
        }
        let receivedHash = SHA256.hash(data: data)
            .map { String(format: "%02x", $0) }
            .joined()
        guard receivedHash == expectedHash else {
            throw GameAssetRegistryError.hashMismatch(
                expected: expectedHash,
                received: receivedHash
            )
        }
        return data
    }

    private func endpoint(_ components: [String]) -> URL {
        var url = baseURL
        for component in components {
            url.appendPathComponent(component)
        }
        return url
    }

    private func isSameOrigin(_ lhs: URL, _ rhs: URL) -> Bool {
        lhs.scheme?.lowercased() == rhs.scheme?.lowercased()
            && lhs.host?.lowercased() == rhs.host?.lowercased()
            && lhs.port == rhs.port
    }
}
