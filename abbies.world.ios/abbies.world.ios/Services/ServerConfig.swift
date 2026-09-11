//
//  ServerConfig.swift
//  My First Swift
//
//  Centralized server configuration following iOS best practices
//  Priority: UserDefaults override > Info.plist > Default value
//

import Foundation
import Security

/// Centralized server configuration
/// Follows iOS best practices: Info.plist for build-time config, UserDefaults for runtime override
class ServerConfig {
    static let shared = ServerConfig()

    private let keychainService = "evan-personal.abbies-world-ios.server"
    private let keychainAccount = "api-key"
    
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
    
    /// API key provisioned locally into this device's Keychain.
    /// Never place the shared server key in source control or an app bundle.
    var apiKey: String? {
        // A local developer may deliberately provision a connected device once.
        // The launch flag prevents arbitrary environment injection from persisting.
        if ProcessInfo.processInfo.arguments.contains("-provisionServerCredential"),
           let envKey = ProcessInfo.processInfo.environment["ABBIES_WORLD_SERVER_API_KEY"],
           !envKey.isEmpty {
            storeAPIKeyInKeychain(envKey)
            print("server_auth.credential_provisioned storage=keychain")
            return envKey
        }

        if let keychainKey = loadAPIKeyFromKeychain() {
            return keychainKey
        }

        // Migrate old local installs, then remove the less-protected copy.
        if let legacyKey = UserDefaults.standard.string(forKey: "ServerAPIKey"),
           !legacyKey.isEmpty {
            storeAPIKeyInKeychain(legacyKey)
            UserDefaults.standard.removeObject(forKey: "ServerAPIKey")
            print("server_auth.credential_migrated storage=keychain")
            return legacyKey
        }

        print("⚠️ ServerConfig: No API key found")
        return nil
    }
    
    /// Set API key at runtime (stores only in this device's Keychain).
    func setAPIKey(_ key: String) {
        storeAPIKeyInKeychain(key)
        UserDefaults.standard.removeObject(forKey: "ServerAPIKey")
    }
    
    /// Remove local server authentication.
    func resetAPIKey() {
        UserDefaults.standard.removeObject(forKey: "ServerAPIKey")
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount
        ]
        SecItemDelete(query as CFDictionary)
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

    private func loadAPIKeyFromKeychain() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8),
              !value.isEmpty else {
            return nil
        }
        return value
    }

    private func storeAPIKeyInKeychain(_ key: String) {
        let value = Data(key.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount
        ]
        let attributes: [String: Any] = [
            kSecValueData as String: value,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var addQuery = query
            attributes.forEach { addQuery[$0.key] = $0.value }
            SecItemAdd(addQuery as CFDictionary, nil)
        }
    }
}

