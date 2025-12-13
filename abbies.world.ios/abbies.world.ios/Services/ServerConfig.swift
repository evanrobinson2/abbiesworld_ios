//
//  ServerConfig.swift
//  My First Swift
//
//  Centralized server configuration following iOS best practices
//  Priority: UserDefaults override > Info.plist > Default value
//

import Foundation

/// Centralized server configuration
/// Follows iOS best practices: Info.plist for build-time config, UserDefaults for runtime override
class ServerConfig {
    static let shared = ServerConfig()
    
    /// Server base URL
    /// Priority: UserDefaults > Info.plist > Default
    var baseURL: String {
        // 1. Check UserDefaults first (runtime override)
        if let userDefaultsURL = UserDefaults.standard.string(forKey: "ServerBaseURL"), !userDefaultsURL.isEmpty {
            return userDefaultsURL
        }
        
        // 2. Check Info.plist (build-time configuration)
        if let infoPlistURL = Bundle.main.object(forInfoDictionaryKey: "ServerBaseURL") as? String, !infoPlistURL.isEmpty {
            return infoPlistURL
        }
        
        // 3. Default fallback
        return "http://abbies.world:8000"
    }
    
    /// Server hostname (extracted from baseURL)
    var hostname: String {
        guard let url = URL(string: baseURL) else {
            return "abbies.world"
        }
        return url.host ?? "abbies.world"
    }
    
    /// Server port (extracted from baseURL)
    var port: Int {
        guard let url = URL(string: baseURL),
              let port = url.port else {
            return 8000
        }
        return port
    }
    
    /// Set server URL at runtime (stores in UserDefaults)
    func setBaseURL(_ url: String) {
        UserDefaults.standard.set(url, forKey: "ServerBaseURL")
        UserDefaults.standard.synchronize()
    }
    
    /// Reset to default (removes UserDefaults override)
    func resetToDefault() {
        UserDefaults.standard.removeObject(forKey: "ServerBaseURL")
        UserDefaults.standard.synchronize()
    }
    
    /// API Key for server authentication
    /// Priority: UserDefaults > Info.plist > Environment variable > nil
    var apiKey: String? {
        // 1. Check UserDefaults first (runtime override)
        if let userDefaultsKey = UserDefaults.standard.string(forKey: "ServerAPIKey"), !userDefaultsKey.isEmpty {
            return userDefaultsKey
        }
        
        // 2. Check Info.plist (build-time configuration)
        if let infoPlistKey = Bundle.main.object(forInfoDictionaryKey: "ServerAPIKey") as? String, !infoPlistKey.isEmpty {
            return infoPlistKey
        }
        
        // 3. Check environment variable (for development)
        if let envKey = ProcessInfo.processInfo.environment["ABBIES_WORLD_SERVER_API_KEY"], !envKey.isEmpty {
            return envKey
        }
        
        // 4. No API key found
        print("⚠️ ServerConfig: No API key found")
        return nil
    }
    
    /// Set API key at runtime (stores in UserDefaults)
    func setAPIKey(_ key: String) {
        UserDefaults.standard.set(key, forKey: "ServerAPIKey")
        UserDefaults.standard.synchronize()
    }
    
    /// Reset API key to default (removes UserDefaults override)
    func resetAPIKey() {
        UserDefaults.standard.removeObject(forKey: "ServerAPIKey")
        UserDefaults.standard.synchronize()
    }
    
    /// Add API key header to a URLRequest if available
    /// Uses Authorization header with Bearer format: "Bearer {key}"
    func addAPIKeyHeader(to request: inout URLRequest) {
        if let apiKey = apiKey {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        } else {
            print("⚠️ ServerConfig: No API key available")
        }
    }
    
    private init() {
        // Private initializer for singleton
    }
}

