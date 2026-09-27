import Foundation
import CoreGraphics

// MARK: - Run bag (owned marble instances)
//
// Voyage fights fire this bag in order — no per-fight deck picker.
// Shop buys / upgrades / destroys instances. Merge/synthesize can consume
// instances later without changing the fight loop.

/// One marble the player owns for the run (unique instance + kind + permanent level).
struct MarbleVoyageOwnedMarble: Equatable, Codable, Identifiable, Sendable {
    /// Stable per-ball id so duplicates and destroy/merge target the right marble.
    var instanceID: String
    var orbID: String
    var level: Int

    var id: String { instanceID }

    static let minLevel = 1
    static let maxLevel = 3

    var clampedLevel: Int {
        min(Self.maxLevel, max(Self.minLevel, level))
    }

    var isMaxed: Bool { clampedLevel >= Self.maxLevel }

    var orb: OrbKind {
        OrbKind.all.first(where: { $0.id == orbID }) ?? .sparkle
    }

    /// Cage-damage multiplier from marble level (stacks with global ballLevel run field).
    var damageMultiplier: Double {
        switch clampedLevel {
        case 1: return 1.0
        case 2: return 1.12
        default: return 1.25
        }
    }

    /// Physics rewrite at this level (Peglin-style upgrade feel).
    func tunedOrb() -> OrbKind {
        let base = orb
        let lv = clampedLevel
        guard lv > 1 else { return base }
        let forceBoost = lv == 2 ? 1.10 : 1.22
        let bounceBoost = lv == 2 ? 0.04 : 0.08
        let gEase = lv == 2 ? 0.97 : 0.93
        return OrbKind(
            id: base.id,
            name: base.name,
            blurb: "\(base.blurb) · Lv\(lv)",
            fireForce: base.fireForce * forceBoost,
            gravityScale: base.gravityScale * gEase,
            bounciness: min(1.15, base.bounciness + bounceBoost),
            mass: base.mass,
            radius: base.radius,
            trail: base.trail,
            temper: base.temper
        )
    }

    static func make(orbID: String, level: Int = minLevel) -> MarbleVoyageOwnedMarble {
        MarbleVoyageOwnedMarble(
            instanceID: UUID().uuidString,
            orbID: orbID,
            level: level
        )
    }

    /// Four plain Sparkles — specialty kinds come from the shop (and later merge).
    static func starterCollection(
        count: Int = MarbleVoyageMarbleRules.starterBagCount
    ) -> [MarbleVoyageOwnedMarble] {
        (0..<count).map { _ in make(orbID: OrbKind.plainStarterID, level: minLevel) }
    }

    enum CodingKeys: String, CodingKey {
        case instanceID, orbID, level
    }

    init(instanceID: String, orbID: String, level: Int) {
        self.instanceID = instanceID
        self.orbID = orbID
        self.level = level
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        instanceID = try c.decodeIfPresent(String.self, forKey: .instanceID) ?? UUID().uuidString
        orbID = try c.decode(String.self, forKey: .orbID)
        level = try c.decode(Int.self, forKey: .level)
    }
}

enum MarbleVoyageMarbleRules {
    /// Opening bag size — four plain marbles.
    static let starterBagCount = 4
    /// Cannot scrap below this (still enough to fight).
    static let minBagCount = 3
    /// Hard cap — matches fight deck cap.
    static let maxBagCount = PeglinBattleRules.maxDeckCount

    /// Kinds the Bell Market can sell (specialties + another plain).
    static var shopCatalog: [OrbKind] { OrbKind.all }

    /// Pick which marble a shop “Ball upgrade” raises — lowest level, then catalog order, then bag order.
    static func upgradeTarget(in collection: [MarbleVoyageOwnedMarble]) -> Int? {
        guard !collection.isEmpty else { return nil }
        if collection.allSatisfy(\.isMaxed) { return nil }
        var best: Int?
        for i in collection.indices where !collection[i].isMaxed {
            guard let current = best else {
                best = i
                continue
            }
            let a = collection[i]
            let b = collection[current]
            if a.level < b.level
                || (a.level == b.level && catalogIndex(a.orbID) < catalogIndex(b.orbID))
                || (a.level == b.level
                    && catalogIndex(a.orbID) == catalogIndex(b.orbID)
                    && i < current) {
                best = i
            }
        }
        guard let best, !collection[best].isMaxed else { return nil }
        return best
    }

    static func catalogIndex(_ orbID: String) -> Int {
        OrbKind.all.firstIndex(where: { $0.id == orbID }) ?? 99
    }

    static func index(ofInstanceID instanceID: String, in collection: [MarbleVoyageOwnedMarble]) -> Int? {
        collection.firstIndex { $0.instanceID == instanceID }
    }

    /// Mean damage mult across the collection (sim / HUD).
    static func meanDamageMultiplier(in collection: [MarbleVoyageOwnedMarble]) -> Double {
        guard !collection.isEmpty else { return 1 }
        return collection.map(\.damageMultiplier).reduce(0, +) / Double(collection.count)
    }

    /// Combined mult: hero × marble mean × run ballLevel steps.
    static func fightDamageMultiplier(
        collection: [MarbleVoyageOwnedMarble],
        ballLevel: Int,
        heroLevel: Int = MarbleVoyageHeroLevel.minLevel
    ) -> Double {
        let marble = meanDamageMultiplier(in: collection)
        let global = 1.0 + 0.05 * Double(max(0, ballLevel - 1))
        let hero = MarbleVoyageHeroLevel.damageMultiplier(level: heroLevel)
        return marble * global * hero
    }

    /// Per-shot mult for the marble about to fire (hero × level × Temper matchup).
    static func shotDamageMultiplier(
        marble: MarbleVoyageOwnedMarble,
        ballLevel: Int,
        foeTemper: PlinkTemper? = nil,
        heroLevel: Int = MarbleVoyageHeroLevel.minLevel
    ) -> Double {
        let global = 1.0 + 0.05 * Double(max(0, ballLevel - 1))
        let hero = MarbleVoyageHeroLevel.damageMultiplier(level: heroLevel)
        let base = marble.damageMultiplier * global * hero
        guard let foeTemper else { return base }
        return base * marble.orb.temper.damageFactor(against: foeTemper)
    }

    /// Ordered orb ids the fight board fires (bag order).
    static func fightDeckOrbIDs(in collection: [MarbleVoyageOwnedMarble]) -> [String] {
        collection.map(\.orbID)
    }
}

extension OrbKind {
    /// Starter / “plain” marble kind id (Sparkle — Peglin default SO).
    static let plainStarterID = OrbKind.sparkle.id
}
