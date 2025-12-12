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
    
    private init() {
        // Private initializer for singleton
    }
}

