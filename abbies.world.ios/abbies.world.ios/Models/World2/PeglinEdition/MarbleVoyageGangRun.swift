import CoreGraphics
import Foundation

// MARK: - Evan’s gang run (Marble Voyage / Plink)
//
// **4 named crew:** Raze, Vix, Morrow, Nib.
//
// **Run setup (random from seed):**
// - Pick **1 of 4** as the **Big Boss** → fight chrome **3× portrait**, cage HP **×10**.
// - The **other 3** are each a **mini-boss arc**.
//
// **Per mini-boss arc (in the world / chart):** **3 fight zones** + a treasure/box:
// 1. Zone 1 — simple enemies / henchmen
// 2. Zone 2 — simple enemies / henchmen
// 3. Zone 3 — that named gang member as **mini-boss**
// 4. Box / treasure beat (“3 fights + box 3 times”)
//
// Do **three** mini-arcs (3×3 = 9 fights + 3 boxes), then the **Big Boss** fight.
//
// Henchmen = forest fauna / lineup leftovers — NEVER the named crew.
// Named crew only as mini-boss (zone 3) or big boss.
// Hostage cage meter stays PeglinEnemyKind (Fox / Jackal / Hare / Stag) — not the gang.

/// Who is rattling Abbie this fight within the gang-run structure.
enum MarbleVoyageGangFightRole: String, Codable, Equatable, Sendable {
    /// Random wind-up foe (forest / lineup stand-in).
    case henchman
    /// Named crew member — zone 3 of a mini-arc.
    case miniBoss
    /// The randomly chosen big boss — end of the climb.
    case bigBoss
}

/// Durable roll for one Marble Voyage climb: who is big boss, who runs each mini-arc.
struct MarbleVoyageGangRun: Equatable, Sendable {
    /// The one named crew member fought last — 3× portrait, 10× cage HP.
    var bigBoss: PlinkAttackerKind
    /// Exactly three named crew members, each heading one mini-arc (order = climb order).
    var miniBossOrder: [PlinkAttackerKind]

    /// Big-boss portrait scale vs normal attacker chrome.
    static let bigBossPortraitScale: CGFloat = 3
    /// Cage HP multiplier for the big-boss fight (hostage meter length).
    static let bigBossCageHPMultiplier: Int = 10
    /// Mini-boss cage HP bump (still named crew, not 10×).
    static let miniBossCageHPMultiplier: Int = 2

    /// Lightweight stand-ins for zone 1–2 / wind-up. Never named crew.
    static let henchmenPool: [PlinkAttackerKind] = [
        .cawScout, .thornbackBeetle, .briarToad, .thornhornMantis,
        .coyoteBruiser, .gangFox, .hyena, .lizard, .vulture,
    ]

    /// Hostages freed across the climb (cage art) — not gang members.
    static let hostageCycle: [PeglinEnemyKind] = [
        .foxSpirit, .brambleSpirit, .stagSpirit, .burrowJackal,
    ]

    /// Roll big boss + mini-arc order from a run seed (deterministic).
    static func make(seed: UInt64) -> MarbleVoyageGangRun {
        var rng = SeededGenerator(seed: seed &+ 0x6A_46_45_52) // "gAFR" tag
        var crew = PlinkAttackerKind.namedCrew
        // Fisher–Yates via seeded RNG
        for i in stride(from: crew.count - 1, through: 1, by: -1) {
            let j = Int.random(in: 0...i, using: &rng)
            crew.swapAt(i, j)
        }
        let boss = crew[0]
        let minis = Array(crew.dropFirst().prefix(3))
        assert(minis.count == 3, "named crew must be 4 (1 boss + 3 minis)")
        return MarbleVoyageGangRun(bigBoss: boss, miniBossOrder: minis)
    }

    func miniBoss(arcIndex: Int) -> PlinkAttackerKind {
        let i = max(0, min(miniBossOrder.count - 1, arcIndex))
        return miniBossOrder[i]
    }

    func randomHenchman(seedSalt: UInt64) -> PlinkAttackerKind {
        var rng = SeededGenerator(seed: seedSalt)
        return Self.henchmenPool.randomElement(using: &rng) ?? .cawScout
    }

    func hostage(forArc arcIndex: Int) -> PeglinEnemyKind {
        Self.hostageCycle[abs(arcIndex) % Self.hostageCycle.count]
    }

    func cageHPMultiplier(for role: MarbleVoyageGangFightRole?) -> Int {
        switch role {
        case .bigBoss: return Self.bigBossCageHPMultiplier
        case .miniBoss: return Self.miniBossCageHPMultiplier
        case .henchman, .none: return 1
        }
    }

    func portraitScale(for role: MarbleVoyageGangFightRole?) -> CGFloat {
        switch role {
        case .bigBoss: return Self.bigBossPortraitScale
        case .miniBoss: return 1.25
        case .henchman, .none: return 1
        }
    }
}
