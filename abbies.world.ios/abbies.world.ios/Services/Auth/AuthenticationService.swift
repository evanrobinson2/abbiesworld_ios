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

    private let credentialsManager = CredentialsManager(authentication: Auth0.authentication())
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
        isAuthenticated = credentialsManager.canRenew()
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
            isAuthenticated = false
            lastError = "Please sign in again."
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
