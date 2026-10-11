import Auth0
import Combine
import Foundation

/// Auth0 session + household profile selection for Abbie's World.
@MainActor
final class AuthenticationService: ObservableObject {
    static let shared = AuthenticationService()

    static let audience = "https://api.abbies.world"
    static let skipAuthLaunchArgument = "-world2SkipAuth"

    @Published private(set) var isAuthenticated = false
    @Published private(set) var isBusy = false
    @Published private(set) var lastError: String?
    @Published private(set) var accountEmail: String?
    @Published private(set) var accountName: String?
    @Published private(set) var household: HouseholdSnapshot?
    @Published private(set) var activeProfile: HouseholdProfile?

    private let credentialsManager: CredentialsManager = {
        #if targetEnvironment(simulator)
        // Simulator Keychain often rejects Auth0's NSKeyedArchiver blob (entitlements /
        // accessibility churn), which surfaces as "Could not save the pasted token".
        // UserDefaults storage is fine for the Studio paste-token escape hatch.
        return CredentialsManager(
            authentication: Auth0.authentication(),
            storage: SimulatorCredentialsStorage()
        )
        #else
        return CredentialsManager(authentication: Auth0.authentication())
        #endif
    }()
    private let defaults = UserDefaults.standard
    private let activeProfileKey = "abbies.world.activeProfileId"

    var shouldSkipAuthForAutomation: Bool {
        ProcessInfo.processInfo.arguments.contains(Self.skipAuthLaunchArgument)
    }

    var canManageProfiles: Bool {
        guard let role = activeProfile?.role else {
            return household?.accountRole == .parent || household?.accountRole == .developer
        }
        return role == .parent || role == .developer
    }

    init() {
        if shouldSkipAuthForAutomation {
            isAuthenticated = true
            accountEmail = "automation@local"
            accountName = "Automation"
            household = .automationFixture
            if let saved = defaults.string(forKey: activeProfileKey),
               let profile = household?.profiles.first(where: { $0.id == saved }) {
                activeProfile = profile
            }
            return
        }
        // hasValid covers Simulator paste-token sessions (access token, no refresh).
        isAuthenticated = credentialsManager.canRenew() || credentialsManager.hasValid()
        if isAuthenticated {
            Task { await refreshSession(reason: "launch") }
        }
    }

    func login() async {
        guard !shouldSkipAuthForAutomation else { return }
        isBusy = true
        lastError = nil
        defer { isBusy = false }
        do {
            // Ephemeral keeps Google/Auth0 inside the system auth sheet so the
            // callback returns to this process. On Simulator, finishing Google in
            // Safari on a paired iPhone leaves the sheet hanging forever.
            var webAuth = Auth0
                .webAuth()
                .scope("openid profile email offline_access")
                .audience(Self.audience)
                .useEphemeralSession()
            #if targetEnvironment(simulator)
            // Prefer the custom-scheme callback Auth0 registered for this bundle.
            // The https://…/ios/…/callback bridge page is what phones show as
            // "Connecting…" when Continuity steals the login from the simulator.
            if let redirect = Self.customSchemeCallbackURL {
                webAuth = webAuth.redirectURL(redirect)
            }
            #endif
            let credentials = try await webAuth.start()
            guard credentialsManager.store(credentials: credentials) else {
                lastError = "Could not save login on this device."
                return
            }
            isAuthenticated = true
            await refreshSession(reason: "login")
        } catch {
            if let webError = error as? WebAuthError, webError == .userCancelled {
                lastError = nil
                return
            }
            lastError = Self.friendlyLoginError(error)
            World2Diagnostics.log("auth_login_failed", ["error": "\(error)"])
        }
    }

    /// Simulator escape hatch: paste the Auth0 access token from Studio → Copy MCP token.
    /// Continuity QR / phone "Connecting…" cannot return the OAuth callback to the Simulator.
    func loginWithPastedAccessToken(_ raw: String) async {
        guard !shouldSkipAuthForAutomation else { return }
        isBusy = true
        lastError = nil
        defer { isBusy = false }

        var token = Self.extractAccessToken(from: raw)
        #if targetEnvironment(simulator)
        // Clipboard often gets overwritten (chat, Studio UI). Prefer the file-backed
        // token Cursor / agents write for MCP when pasteboard is empty or garbage.
        // Also used after the user denies the Simulator paste permission alert.
        if token == nil {
            token = Self.loadSimulatorSavedToken()
        }
        #endif
        guard let token, token.split(separator: ".").count >= 2, token.count > 40 else {
            let hint: String
            #if targetEnvironment(simulator)
            hint = " Clipboard empty or not a JWT. Re-copy from Studio → Copy MCP token, or keep ~/.abbies_world_token updated."
            #else
            hint = " In Studio, sign in and tap Copy MCP token."
            #endif
            lastError = "That does not look like an Auth0 access token.\(hint)"
            return
        }
        await storePastedAccessToken(token)
    }

    #if targetEnvironment(simulator)
    /// Auto-login without touching UIPasteboard (avoids the CoreSimulator paste permission alert).
    func loginWithSimulatorSavedTokenIfNeeded() async {
        guard !shouldSkipAuthForAutomation else { return }
        guard !isAuthenticated, !isBusy else { return }
        guard let token = Self.loadSimulatorSavedToken() else { return }
        isBusy = true
        lastError = nil
        defer { isBusy = false }
        await storePastedAccessToken(token)
    }
    #endif

    private func storePastedAccessToken(_ token: String) async {
        let expiresIn = Self.expiryDate(fromJWT: token) ?? Date().addingTimeInterval(60 * 60)
        if expiresIn.timeIntervalSinceNow < 30 {
            lastError = "That token is already expired. Copy a fresh one from Studio."
            return
        }
        // Auth0 docs: clear before storing a different session so pinned session_expiry
        // / DPoP thumbprints from a prior login cannot poison the paste path.
        _ = credentialsManager.clear()
        let credentials = Credentials(
            accessToken: token,
            tokenType: "Bearer",
            idToken: Self.minimalIDToken(forAccessToken: token),
            refreshToken: nil,
            expiresIn: expiresIn,
            scope: "openid profile email offline_access"
        )
        guard credentialsManager.store(credentials: credentials) else {
            lastError = "Could not save the pasted token on this device."
            World2Diagnostics.log("auth_paste_store_failed", ["expires_in": "\(Int(expiresIn.timeIntervalSinceNow))"])
            return
        }
        #if targetEnvironment(simulator)
        // Keep the Mac-side file in sync so relaunch can skip the pasteboard alert.
        Self.writeSimulatorHostToken(token)
        #endif
        isAuthenticated = true
        lastError = nil
        await refreshSession(reason: "paste_token")
        if household == nil, lastError == nil {
            lastError = "Token saved, but the world server did not answer yet."
        }
    }

    /// Auth0's CredentialsManager may decode `idToken`; an empty string can fail archive/
    /// pin paths. Mint a tiny unsigned JWT so store + hasValid stay happy for paste login.
    private static func minimalIDToken(forAccessToken accessToken: String) -> String {
        func b64(_ data: Data) -> String {
            data.base64EncodedString()
                .replacingOccurrences(of: "+", with: "-")
                .replacingOccurrences(of: "/", with: "_")
                .replacingOccurrences(of: "=", with: "")
        }
        let header = b64(Data(#"{"alg":"none","typ":"JWT"}"#.utf8))
        var payload: [String: Any] = ["sub": "paste-token"]
        if let exp = expiryDate(fromJWT: accessToken)?.timeIntervalSince1970 {
            payload["exp"] = Int(exp)
        }
        guard
            let payloadData = try? JSONSerialization.data(withJSONObject: payload),
            !payloadData.isEmpty
        else {
            return "\(header).e30." // {"alg":"none"} . {} .
        }
        return "\(header).\(b64(payloadData))."
    }

    #if targetEnvironment(simulator)
    private static func writeSimulatorHostToken(_ token: String) {
        guard let hostHome = ProcessInfo.processInfo.environment["SIMULATOR_HOST_HOME"], !hostHome.isEmpty else {
            return
        }
        let url = URL(fileURLWithPath: hostHome).appendingPathComponent(".abbies_world_token")
        try? token.write(to: url, atomically: true, encoding: .utf8)
    }
    #endif

    /// Pull a JWT out of raw clipboard / JSON wrappers Studio sometimes copies.
    private static func extractAccessToken(from raw: String) -> String? {
        var text = raw
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "Bearer ", with: "", options: .caseInsensitive)
            .trimmingCharacters(in: CharacterSet(charactersIn: "\"'"))
        if text.isEmpty { return nil }

        if text.hasPrefix("{"),
           let data = text.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            for key in ["accessToken", "access_token", "token", "mcpToken"] {
                if let value = json[key] as? String, !value.isEmpty {
                    text = value.trimmingCharacters(in: .whitespacesAndNewlines)
                    break
                }
            }
        }

        // If the clipboard has prose + a JWT, take the eyJ… segment.
        if !text.hasPrefix("eyJ"), let range = text.range(of: "eyJ") {
            text = String(text[range.lowerBound...])
                .split(whereSeparator: { $0.isWhitespace || $0 == "\"" || $0 == "'" })
                .first
                .map(String.init) ?? text
        }

        let parts = text.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        return text
    }

    #if targetEnvironment(simulator)
    private static func loadSimulatorSavedToken() -> String? {
        var candidates: [URL] = []
        // Mac home is not NSHomeDirectory() inside the Simulator sandbox.
        if let hostHome = ProcessInfo.processInfo.environment["SIMULATOR_HOST_HOME"], !hostHome.isEmpty {
            candidates.append(URL(fileURLWithPath: hostHome).appendingPathComponent(".abbies_world_token"))
        }
        if let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            candidates.append(docs.appendingPathComponent("abbies_world_token.txt"))
        }
        for url in candidates {
            guard let raw = try? String(contentsOf: url, encoding: .utf8) else { continue }
            if let token = extractAccessToken(from: raw) { return token }
        }
        return nil
    }
    #endif

    private static func expiryDate(fromJWT token: String) -> Date? {
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        var payload = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while payload.count % 4 != 0 { payload.append("=") }
        guard
            let data = Data(base64Encoded: payload),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return nil
        }
        if let exp = json["exp"] as? TimeInterval {
            return Date(timeIntervalSince1970: exp)
        }
        if let exp = json["exp"] as? Int {
            return Date(timeIntervalSince1970: TimeInterval(exp))
        }
        return nil
    }

    /// `evan-personal.abbies-world-ios://<domain>/ios/<bundle>/callback`
    private static var customSchemeCallbackURL: URL? {
        guard
            let domain = Bundle.main.object(forInfoDictionaryKey: "Auth0Domain") as? String
                ?? plistString("Domain"),
            let bundleId = Bundle.main.bundleIdentifier
        else {
            return nil
        }
        return URL(string: "\(bundleId)://\(domain)/ios/\(bundleId)/callback")
    }

    private static func plistString(_ key: String) -> String? {
        guard
            let url = Bundle.main.url(forResource: "Auth0", withExtension: "plist"),
            let dict = NSDictionary(contentsOf: url) as? [String: Any],
            let value = dict[key] as? String,
            !value.isEmpty
        else {
            return nil
        }
        return value
    }

    private static func friendlyLoginError(_ error: Error) -> String {
        let text = error.localizedDescription
        #if targetEnvironment(simulator)
        if text.localizedCaseInsensitiveContains("cancel")
            || text.localizedCaseInsensitiveContains("timed out")
            || text.localizedCaseInsensitiveContains("session") {
            return "Sign-in did not finish in the Simulator. Keep Google inside the Simulator sheet — if it opens on your iPhone and says Connecting…, cancel there and try again here (or use a username/password Auth0 user)."
        }
        #endif
        return text
    }

    func logout() async {
        if shouldSkipAuthForAutomation {
            activeProfile = nil
            return
        }
        isBusy = true
        defer { isBusy = false }
        do {
            try await Auth0.webAuth().clearSession()
        } catch {
            World2Diagnostics.log("auth_logout_session_failed", ["error": "\(error)"])
        }
        _ = credentialsManager.clear()
        isAuthenticated = false
        accountEmail = nil
        accountName = nil
        household = nil
        activeProfile = nil
        defaults.removeObject(forKey: activeProfileKey)
    }

    func clearActiveProfile() {
        activeProfile = nil
        defaults.removeObject(forKey: activeProfileKey)
    }

    func selectProfile(_ profile: HouseholdProfile) async {
        guard isAuthenticated else { return }
        guard let household, household.profiles.contains(where: { $0.id == profile.id }) else {
            lastError = "That profile is not available."
            return
        }
        if profile.role == .child && !canManageProfiles && activeProfile?.id != profile.id {
            // Children may only continue as themselves once chosen on a locked device later.
        }
        activeProfile = profile
        defaults.set(profile.id, forKey: activeProfileKey)
        World2Diagnostics.log(
            "auth_profile_selected",
            ["profile_id": profile.id, "player_id": profile.playerId.rawValue, "role": profile.role.rawValue]
        )
        await pushActiveProfileToServer(profile)
    }

    func accessToken() async -> String? {
        if shouldSkipAuthForAutomation { return nil }
        do {
            let credentials = try await credentialsManager.credentials()
            return credentials.accessToken
        } catch {
            // Paste-token sessions have no refresh token — surface a clearer recovery path.
            isAuthenticated = false
            #if targetEnvironment(simulator)
            lastError = "Please paste a fresh Studio token (Copy MCP token)."
            #else
            lastError = "Please sign in again."
            #endif
            World2Diagnostics.log("auth_access_token_failed", ["error": "\(error)"])
            return nil
        }
    }

    func refreshSession(reason: String) async {
        if shouldSkipAuthForAutomation { return }
        guard let token = await accessToken() else { return }
        do {
            let snapshot = try await HouseholdAPIClient.shared.fetchMe(accessToken: token)
            household = snapshot
            accountEmail = snapshot.email
            accountName = snapshot.displayName
            if let saved = defaults.string(forKey: activeProfileKey),
               let match = snapshot.profiles.first(where: { $0.id == saved }) {
                activeProfile = match
            } else if let match = snapshot.profiles.first(where: { $0.id == snapshot.activeProfileId }) {
                activeProfile = match
                defaults.set(match.id, forKey: activeProfileKey)
            } else {
                activeProfile = nil
            }
            World2Diagnostics.log("auth_session_refreshed", ["reason": reason, "profiles": "\(snapshot.profiles.count)"])
        } catch {
            // Offline / server not ready: still allow local profile picker with seeded household.
            if household == nil {
                household = .localBootstrap(email: accountEmail)
            }
            lastError = "Signed in, but the world server could not load your household yet."
            World2Diagnostics.log("auth_me_failed", ["reason": reason, "error": "\(error)"])
        }
    }

    private func pushActiveProfileToServer(_ profile: HouseholdProfile) async {
        guard let token = await accessToken() else { return }
        do {
            try await HouseholdAPIClient.shared.setActiveProfile(profileId: profile.id, accessToken: token)
        } catch {
            World2Diagnostics.log("auth_active_profile_push_failed", ["error": "\(error)"])
        }
    }
}

#if targetEnvironment(simulator)
/// Keychain-free Auth0 credential store for the iOS Simulator paste-token path.
private final class SimulatorCredentialsStorage: CredentialsStorage {
    private let defaults = UserDefaults.standard
    private func defaultsKey(for key: String) -> String { "abbies.world.sim.credentials.\(key)" }

    func getEntry(forKey key: String) -> Data? {
        defaults.data(forKey: defaultsKey(for: key))
    }

    func setEntry(_ data: Data, forKey key: String) -> Bool {
        defaults.set(data, forKey: defaultsKey(for: key))
        return true
    }

    func deleteEntry(forKey key: String) -> Bool {
        defaults.removeObject(forKey: defaultsKey(for: key))
        return true
    }
}
#endif

enum HouseholdRole: String, Codable, Equatable {
    case parent
    case developer
    case child
}

struct HouseholdProfile: Codable, Identifiable, Equatable, Hashable {
    let id: String
    let displayName: String
    let role: HouseholdRole
    let playerId: PlayerId
    let isProxy: Bool
}

struct HouseholdSnapshot: Codable, Equatable {
    let householdId: String
    let email: String?
    let displayName: String?
    let accountRole: HouseholdRole
    let activeProfileId: String?
    let profiles: [HouseholdProfile]

    static let automationFixture = HouseholdSnapshot(
        householdId: "household.automation",
        email: "automation@local",
        displayName: "Automation",
        accountRole: .developer,
        activeProfileId: "profile.abbie",
        profiles: [
            HouseholdProfile(id: "profile.evan", displayName: "Evan", role: .developer, playerId: .evan, isProxy: false),
            HouseholdProfile(id: "profile.abbie", displayName: "Abbie", role: .child, playerId: .abbie, isProxy: true),
            HouseholdProfile(id: "profile.ani", displayName: "Ani", role: .child, playerId: .ani, isProxy: true)
        ]
    )

    static func localBootstrap(email: String?) -> HouseholdSnapshot {
        HouseholdSnapshot(
            householdId: "household.local",
            email: email,
            displayName: email,
            accountRole: .developer,
            activeProfileId: nil,
            profiles: [
                HouseholdProfile(id: "profile.evan", displayName: "Evan", role: .developer, playerId: .evan, isProxy: false),
                HouseholdProfile(id: "profile.abbie", displayName: "Abbie", role: .child, playerId: .abbie, isProxy: true),
                HouseholdProfile(id: "profile.ani", displayName: "Ani", role: .child, playerId: .ani, isProxy: true)
            ]
        )
    }
}
