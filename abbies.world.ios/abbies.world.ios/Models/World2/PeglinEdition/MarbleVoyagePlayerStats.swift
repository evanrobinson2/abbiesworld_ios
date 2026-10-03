import Foundation

/// Durable Marble Voyage stats — **game** (device-wide) and **player** (Auth0 profile / guest).
///
/// Gallery unlocks stay in `MarbleVoyageGallery`. This store is the status board:
/// fights, heals, clears, boss kills, sessions. Keyed by player when signed in.
struct MarbleVoyagePlayerStats: Equatable, Codable, Sendable {
    var fightsWon: Int = 0
    var healsFound: Int = 0
    var campaignClears: Int = 0
    var endlessBest: Int = 0
    var miniBossesBeaten: Int = 0
    var bigBossesBeaten: Int = 0
    var sessionsStarted: Int = 0
    var lastPlayedAt: Date?

    static let guestPlayerKey = "guest"
    static let gameKey = "game"
    private static let rootKey = "marbleVoyage.stats.v1"

    static var empty: MarbleVoyagePlayerStats { .init() }

    // MARK: - Load / save

    static func load(playerKey: String) -> MarbleVoyagePlayerStats {
        let bag = loadBag()
        return bag[normalized(playerKey)] ?? .empty
    }

    static func loadGame() -> MarbleVoyagePlayerStats {
        load(playerKey: gameKey)
    }

    mutating func save(playerKey: String) {
        var bag = Self.loadBag()
        bag[Self.normalized(playerKey)] = self
        Self.saveBag(bag)
    }

    /// Merge a fight / voyage outcome into both **this player** and **game** totals.
    static func recordFightWin(
        playerKey: String,
        isMiniBoss: Bool,
        isBigBoss: Bool,
        fightsClearedAfter: Int,
        mode: MarbleVoyageMode
    ) {
        mutate(playerKey: playerKey) { stats in
            stats.fightsWon += 1
            stats.lastPlayedAt = Date()
            if isMiniBoss { stats.miniBossesBeaten += 1 }
            if isBigBoss {
                stats.bigBossesBeaten += 1
                if mode == .campaign { stats.campaignClears += 1 }
            }
        }
        if mode == .endless {
            recordEndlessBest(playerKey: playerKey, best: fightsClearedAfter)
        }
    }

    static func recordHeal(playerKey: String) {
        mutate(playerKey: playerKey) { stats in
            stats.healsFound += 1
            stats.lastPlayedAt = Date()
        }
    }

    static func recordSessionStart(playerKey: String) {
        mutate(playerKey: playerKey) { stats in
            stats.sessionsStarted += 1
            stats.lastPlayedAt = Date()
        }
    }

    static func recordEndlessBest(playerKey: String, best: Int) {
        mutate(playerKey: playerKey) { stats in
            if best > stats.endlessBest {
                stats.endlessBest = best
                stats.lastPlayedAt = Date()
            }
        }
        // Keep legacy endless best key in sync for older chrome.
        MarbleVoyageRun.noteEndlessBest(best)
    }

    /// Prefer Auth0 profile id; fall back to guest.
    static func playerKey(auth: AuthenticationService) -> String {
        if let id = auth.activeProfile?.id, !id.isEmpty { return id }
        if let email = auth.accountEmail, !email.isEmpty { return "email:\(email.lowercased())" }
        return guestPlayerKey
    }

    // MARK: - Private

    private static func mutate(playerKey: String, _ body: (inout MarbleVoyagePlayerStats) -> Void) {
        var player = load(playerKey: playerKey)
        body(&player)
        player.save(playerKey: playerKey)

        var game = loadGame()
        body(&game)
        game.save(playerKey: gameKey)
    }

    private static func normalized(_ key: String) -> String {
        let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? guestPlayerKey : trimmed
    }

    private static func loadBag() -> [String: MarbleVoyagePlayerStats] {
        guard let data = UserDefaults.standard.data(forKey: rootKey),
              let decoded = try? JSONDecoder().decode([String: MarbleVoyagePlayerStats].self, from: data)
        else { return [:] }
        return decoded
    }

    private static func saveBag(_ bag: [String: MarbleVoyagePlayerStats]) {
        if let data = try? JSONEncoder().encode(bag) {
            UserDefaults.standard.set(data, forKey: rootKey)
        }
    }
}
