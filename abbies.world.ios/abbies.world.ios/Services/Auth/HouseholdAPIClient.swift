import Foundation

enum HouseholdAPIError: Error, LocalizedError {
    case badURL
    case http(Int, String)
    case decode

    var errorDescription: String? {
        switch self {
        case .badURL: return "Server URL is invalid."
        case .http(let code, let body): return "Server error \(code): \(body)"
        case .decode: return "Could not read household response."
        }
    }
}

final class HouseholdAPIClient {
    static let shared = HouseholdAPIClient()

    private let session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 20
        return URLSession(configuration: config)
    }()

    func fetchMe(accessToken: String) async throws -> HouseholdSnapshot {
        let request = try authorizedRequest(path: "/api/v1/me", method: "GET", accessToken: accessToken)
        let (data, response) = try await session.data(for: request)
        try throwIfNeeded(data: data, response: response)
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        do {
            return try decoder.decode(HouseholdSnapshot.self, from: data)
        } catch {
            throw HouseholdAPIError.decode
        }
    }

    func setActiveProfile(profileId: String, accessToken: String) async throws {
        var request = try authorizedRequest(
            path: "/api/v1/session/active-profile",
            method: "POST",
            accessToken: accessToken
        )
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["profile_id": profileId])
        let (data, response) = try await session.data(for: request)
        try throwIfNeeded(data: data, response: response)
    }

    func syncPlayerState(_ state: PlayerState, accessToken: String, profileId: String) async throws -> PlayerState {
        var request = try authorizedRequest(
            path: "/api/v1/player/state",
            method: "PUT",
            accessToken: accessToken
        )
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(profileId, forHTTPHeaderField: "X-Active-Profile-Id")
        request.httpBody = try JSONEncoder().encode(state)
        let (data, response) = try await session.data(for: request)
        try throwIfNeeded(data: data, response: response)
        return try JSONDecoder().decode(PlayerState.self, from: data)
    }

    func fetchPlayerState(accessToken: String, profileId: String) async throws -> PlayerState? {
        var request = try authorizedRequest(
            path: "/api/v1/player/state",
            method: "GET",
            accessToken: accessToken
        )
        request.setValue(profileId, forHTTPHeaderField: "X-Active-Profile-Id")
        let (data, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 404 {
            return nil
        }
        try throwIfNeeded(data: data, response: response)
        return try JSONDecoder().decode(PlayerState.self, from: data)
    }

    private func authorizedRequest(path: String, method: String, accessToken: String) throws -> URLRequest {
        let base = ServerConfig.shared.baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: base + path) else { throw HouseholdAPIError.badURL }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        return request
    }

    private func throwIfNeeded(data: Data, response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw HouseholdAPIError.http(http.statusCode, body)
        }
    }
}
