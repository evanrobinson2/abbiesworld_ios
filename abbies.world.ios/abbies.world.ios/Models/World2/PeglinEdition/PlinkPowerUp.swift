import Foundation

/// Battle power-ups earned at the Peg Monastery (and starting kit).
enum PlinkPowerUp: String, CaseIterable, Identifiable, Codable, Sendable {
    case split
    case fire
    case refresh
    case tilt

    var id: String { rawValue }

    var title: String {
        switch self {
        case .split: return "Split"
        case .fire: return "Fire"
        case .refresh: return "Refresh"
        case .tilt: return "Tilt"
        }
    }

    var blurb: String {
        switch self {
        case .split: return "One ball becomes three in the air!"
        case .fire: return "Ball turns to fire and burns every peg it touches!"
        case .refresh: return "Make new pegs appear!"
        case .tilt: return "Freeze, then tip the iPad — labyrinth for this marble!"
        }
    }

    /// SF Symbol fallback only — prefer circular `chipAssetID` art.
    var systemImage: String {
        switch self {
        case .split: return "circle.grid.3x3.fill"
        case .fire: return "flame.fill"
        case .refresh: return "arrow.triangle.2.circlepath"
        case .tilt: return "gyroscope"
        }
    }

    /// Semantic Game Asset id — circular kid icons (`ui.plink.power.icon.*`).
    var chipAssetID: String {
        "ui.plink.power.icon.\(rawValue)"
    }

    /// Bundled catalog imageset for the circular icon.
    var catalogIconName: String {
        "world2_plink_power_icon_\(rawValue)"
    }

    /// Max copies of one kind waiting in the bag (slots pull FIFO from the front).
    static let maxOwnedPerKind = 2
    /// Alias kept for monastery / tests.
    static let maxOwned = maxOwnedPerKind

    /// Default battle tray size — extra slots can become a shop / market item later.
    static let defaultSlotCapacity = 2

    /// Hard ceiling so slot upgrades stay bounded.
    static let maxSlotCapacity = 4
}

/// Durable bag for one player: ordered queue + how many battle slots they own.
struct PlinkPowerUpInventory: Equatable, Sendable {
    /// Front of queue fills battle slots; extras wait FIFO behind.
    var queue: [PlinkPowerUp]
    /// Always-visible battle wells. Marketable later (buy a 3rd/4th slot).
    var slotCapacity: Int

    /// Front `slotCapacity` entries — `nil` when that well is empty.
    var slots: [PlinkPowerUp?] {
        let cap = max(1, min(PlinkPowerUp.maxSlotCapacity, slotCapacity))
        return (0..<cap).map { i in i < queue.count ? queue[i] : nil }
    }

    /// Charges waiting behind the visible slots.
    var waitingCount: Int {
        max(0, queue.count - max(1, min(PlinkPowerUp.maxSlotCapacity, slotCapacity)))
    }

    /// FIFO backlog behind the battle wells (ghost inventory strip).
    var waitingQueue: [PlinkPowerUp] {
        let cap = max(1, min(PlinkPowerUp.maxSlotCapacity, slotCapacity))
        guard queue.count > cap else { return [] }
        return Array(queue.dropFirst(cap))
    }

    func count(of kind: PlinkPowerUp) -> Int {
        queue.filter { $0 == kind }.count
    }

    var countsByKind: [PlinkPowerUp: Int] {
        Dictionary(uniqueKeysWithValues: PlinkPowerUp.allCases.map { ($0, count(of: $0)) })
    }
}

/// Ordered power-up bag — battle shows `slotCapacity` wells filled FIFO from the front.
enum PlinkPowerUpStore {
    private static let prefixV3 = "world2.plink.powerUps.v3."
    private static let prefixV2 = "world2.plink.powerUps.v2."

    private struct Payload: Codable {
        var queue: [String]
        var slotCapacity: Int
    }

    static func inventory(for playerID: String?) -> PlinkPowerUpInventory {
        let key = storageKeyV3(playerID)
        if let data = UserDefaults.standard.data(forKey: key),
           let payload = try? JSONDecoder().decode(Payload.self, from: data) {
            let queue = payload.queue.compactMap(PlinkPowerUp.init(rawValue:))
            let cap = clampCapacity(payload.slotCapacity)
            var inv = PlinkPowerUpInventory(queue: clampPerKind(queue), slotCapacity: cap)
            // Soft migrate: older bags predate Tilt — grant one starter charge once.
            if !queue.contains(.tilt),
               UserDefaults.standard.object(forKey: tiltGrantKey(playerID)) == nil {
                inv.queue = clampPerKind(inv.queue + [.tilt])
                UserDefaults.standard.set(true, forKey: tiltGrantKey(playerID))
                save(inv, for: playerID)
            }
            return inv
        }

        // Migrate v2 count bags → ordered queue (stable kind order).
        if let migrated = migrateV2(playerID) {
            save(migrated, for: playerID)
            return migrated
        }

        // First open — seed one of each into the queue.
        let seeded = PlinkPowerUpInventory(
            queue: Array(PlinkPowerUp.allCases),
            slotCapacity: PlinkPowerUp.defaultSlotCapacity
        )
        save(seeded, for: playerID)
        return seeded
    }

    static func counts(for playerID: String?) -> [PlinkPowerUp: Int] {
        inventory(for: playerID).countsByKind
    }

    static func count(_ kind: PlinkPowerUp, for playerID: String?) -> Int {
        inventory(for: playerID).count(of: kind)
    }

    static func slotCapacity(for playerID: String?) -> Int {
        inventory(for: playerID).slotCapacity
    }

    /// Future shop hook — unlock extra battle wells (clamped).
    @discardableResult
    static func setSlotCapacity(_ capacity: Int, for playerID: String?) -> Int {
        var inv = inventory(for: playerID)
        inv.slotCapacity = clampCapacity(capacity)
        save(inv, for: playerID)
        return inv.slotCapacity
    }

    @discardableResult
    static func award(_ kind: PlinkPowerUp, for playerID: String?) -> Bool {
        var inv = inventory(for: playerID)
        guard inv.count(of: kind) < PlinkPowerUp.maxOwnedPerKind else { return false }
        inv.queue.append(kind)
        save(inv, for: playerID)
        return true
    }

    /// Remove the first matching charge (monastery refunds / legacy callers).
    @discardableResult
    static func spend(_ kind: PlinkPowerUp, for playerID: String?) -> Bool {
        var inv = inventory(for: playerID)
        guard let idx = inv.queue.firstIndex(of: kind) else { return false }
        inv.queue.remove(at: idx)
        save(inv, for: playerID)
        return true
    }

    /// Battle tray tap — spend the charge sitting in that slot (FIFO refill behind).
    @discardableResult
    static func spendSlot(_ index: Int, for playerID: String?) -> PlinkPowerUp? {
        var inv = inventory(for: playerID)
        guard index >= 0, index < inv.slotCapacity, index < inv.queue.count else { return nil }
        let kind = inv.queue.remove(at: index)
        save(inv, for: playerID)
        return kind
    }

    /// Put a charge back into a slot index (failed board apply refund).
    static func refund(_ kind: PlinkPowerUp, toSlot index: Int, for playerID: String?) {
        var inv = inventory(for: playerID)
        guard inv.count(of: kind) < PlinkPowerUp.maxOwnedPerKind else { return }
        let i = min(max(0, index), inv.queue.count)
        inv.queue.insert(kind, at: i)
        save(inv, for: playerID)
    }

    /// Power-ups that still have room under the per-kind cap.
    static func awardableKinds(for playerID: String?) -> [PlinkPowerUp] {
        let inv = inventory(for: playerID)
        return PlinkPowerUp.allCases.filter { inv.count(of: $0) < PlinkPowerUp.maxOwnedPerKind }
    }

    // MARK: - Private

    private static func clampCapacity(_ value: Int) -> Int {
        max(PlinkPowerUp.defaultSlotCapacity, min(PlinkPowerUp.maxSlotCapacity, value))
    }

    private static func clampPerKind(_ queue: [PlinkPowerUp]) -> [PlinkPowerUp] {
        var seen: [PlinkPowerUp: Int] = [:]
        var out: [PlinkPowerUp] = []
        for kind in queue {
            let n = seen[kind] ?? 0
            guard n < PlinkPowerUp.maxOwnedPerKind else { continue }
            seen[kind] = n + 1
            out.append(kind)
        }
        return out
    }

    private static func migrateV2(_ playerID: String?) -> PlinkPowerUpInventory? {
        let key = prefixV2 + (playerID ?? "guest")
        guard let data = UserDefaults.standard.data(forKey: key),
              let decoded = try? JSONDecoder().decode([String: Int].self, from: data)
        else { return nil }
        var queue: [PlinkPowerUp] = []
        for kind in PlinkPowerUp.allCases {
            let n = min(PlinkPowerUp.maxOwnedPerKind, max(0, decoded[kind.rawValue] ?? 0))
            queue.append(contentsOf: Array(repeating: kind, count: n))
        }
        if decoded[PlinkPowerUp.tilt.rawValue] == nil {
            queue.append(.tilt)
            UserDefaults.standard.set(true, forKey: tiltGrantKey(playerID))
        }
        return PlinkPowerUpInventory(
            queue: clampPerKind(queue),
            slotCapacity: PlinkPowerUp.defaultSlotCapacity
        )
    }

    private static func save(_ inv: PlinkPowerUpInventory, for playerID: String?) {
        let payload = Payload(
            queue: inv.queue.map(\.rawValue),
            slotCapacity: clampCapacity(inv.slotCapacity)
        )
        if let data = try? JSONEncoder().encode(payload) {
            UserDefaults.standard.set(data, forKey: storageKeyV3(playerID))
        }
    }

    private static func storageKeyV3(_ playerID: String?) -> String {
        prefixV3 + (playerID ?? "guest")
    }

    private static func tiltGrantKey(_ playerID: String?) -> String {
        "world2.plink.powerUps.tiltGrant." + (playerID ?? "guest")
    }
}

/// Simple multiple-choice math prompts for the Peg Monastery.
struct PegMonasteryMathChallenge: Identifiable, Equatable {
    let id: String
    let left: Int
    let op: String
    let right: Int
    let choices: [Int]
    let answer: Int

    /// Spoken / accessibility form, e.g. "What is 3 plus 5?"
    var questionSpoken: String {
        let word: String
        switch op {
        case "+": word = "plus"
        case "−", "-": word = "minus"
        case "×", "x", "*": word = "times"
        default: word = op
        }
        return "What is \(left) \(word) \(right)?"
    }

    /// Compact equation, e.g. "3 + 5"
    var equation: String { "\(left) \(op) \(right)" }

    static func random() -> PegMonasteryMathChallenge {
        let bank: [PegMonasteryMathChallenge] = [
            PegMonasteryMathChallenge(id: "a", left: 3, op: "+", right: 5, choices: [6, 8, 9, 7], answer: 8),
            PegMonasteryMathChallenge(id: "b", left: 12, op: "−", right: 4, choices: [6, 8, 9, 10], answer: 8),
            PegMonasteryMathChallenge(id: "c", left: 6, op: "×", right: 2, choices: [10, 12, 14, 8], answer: 12),
            PegMonasteryMathChallenge(id: "d", left: 9, op: "+", right: 7, choices: [15, 16, 17, 14], answer: 16),
            PegMonasteryMathChallenge(id: "e", left: 20, op: "−", right: 8, choices: [10, 11, 12, 14], answer: 12),
            PegMonasteryMathChallenge(id: "f", left: 4, op: "×", right: 4, choices: [12, 14, 16, 18], answer: 16),
            PegMonasteryMathChallenge(id: "g", left: 15, op: "−", right: 6, choices: [7, 8, 9, 10], answer: 9),
            PegMonasteryMathChallenge(id: "h", left: 5, op: "+", right: 9, choices: [13, 14, 15, 12], answer: 14),
        ]
        return bank.randomElement() ?? bank[0]
    }
}
