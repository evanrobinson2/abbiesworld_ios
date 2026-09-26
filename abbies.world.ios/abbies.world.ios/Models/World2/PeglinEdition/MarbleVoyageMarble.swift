import Foundation
import CoreGraphics

// MARK: - Leveled marbles (Peglin orb-upgrade analogue)
//
// Peglin orbs level twice to a max of 3. Voyage marbles do the same:
// shop “Ball upgrade” raises one owned marble’s level. Levels rewrite
// physics knobs + cage damage — documented for sims in evidence JSON.

/// One marble the player owns for the run (kind + permanent level).
struct MarbleVoyageOwnedMarble: Equatable, Codable, Identifiable, Sendable {
    var orbID: String
    var level: Int

    var id: String { orbID }

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
            trail: base.trail
        )
    }

    static func starterCollection() -> [MarbleVoyageOwnedMarble] {
        OrbKind.all.map { MarbleVoyageOwnedMarble(orbID: $0.id, level: 1) }
    }
}

enum MarbleVoyageMarbleRules {
    /// Pick which marble a shop “Ball upgrade” raises — lowest level, then catalog order.
    static func upgradeTarget(in collection: [MarbleVoyageOwnedMarble]) -> Int? {
        guard !collection.isEmpty else { return nil }
        if collection.allSatisfy(\.isMaxed) { return nil }
        var best = 0
        for i in collection.indices where !collection[i].isMaxed {
            if collection[i].level < collection[best].level
                || (collection[i].level == collection[best].level
                    && catalogIndex(collection[i].orbID) < catalogIndex(collection[best].orbID)) {
                best = i
            }
        }
        return collection[best].isMaxed ? nil : best
    }

    static func catalogIndex(_ orbID: String) -> Int {
        OrbKind.all.firstIndex(where: { $0.id == orbID }) ?? 99
    }

    /// Mean damage mult across the collection (sim / HUD).
    static func meanDamageMultiplier(in collection: [MarbleVoyageOwnedMarble]) -> Double {
        guard !collection.isEmpty else { return 1 }
        return collection.map(\.damageMultiplier).reduce(0, +) / Double(collection.count)
    }

    /// Combined mult: marble mean × run ballLevel steps (legacy global +0.05/level).
    static func fightDamageMultiplier(
        collection: [MarbleVoyageOwnedMarble],
        ballLevel: Int
    ) -> Double {
        let marble = meanDamageMultiplier(in: collection)
        let global = 1.0 + 0.05 * Double(max(0, ballLevel - 1))
        return marble * global
    }
}
