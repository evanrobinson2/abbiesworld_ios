import Foundation
import CoreGraphics

/// Sandbox Peglin battle rules — MVP is easy (dense pegs + soft HP).
enum PeglinBattleRules {
    /// No practical deck cap — marbles recycle forever in spirit fights.
    static let maxDeckCount = 99
    /// Quick-fill size for Random / Even mix.
    static let mixFillCount = 10
    /// Fight button gets its “you’re ready” spark once the deck hits this.
    static let readyDeckCount = 3
    /// Peg→HP scale (<1) so shots bounce longer before the cage melts.
    static let pegDamageScale: Double = 0.48

    /// @available(*, deprecated, renamed: "mixFillCount")
    static let deckSize = mixFillCount

    static func enemyMaxHP(for kind: PeglinEnemyKind?) -> Int {
        switch kind {
        case .brambleSpirit: return 180
        case .foxSpirit, .burrowJackal: return 200
        case .stagSpirit: return 240
        case .bizarroAbbie: return 280
        case nil: return 160
        }
    }

    /// Abbie HP for sandbox counter-pressure (enemy "bite" on empty shots).
    static func playerMaxHP(for kind: PeglinEnemyKind?) -> Int {
        switch kind {
        case .brambleSpirit: return 400
        case .foxSpirit, .burrowJackal: return 400
        case .stagSpirit: return 360
        case .bizarroAbbie: return 320
        case nil: return 400
        }
    }

    /// Peg → raw points before `pegDamageScale` (bomb is AOE-only).
    static func points(for kind: PegKind, critActive: Bool) -> Int {
        let mult = critActive ? 2 : 1
        switch kind {
        case .blue: return 1 * mult
        case .orange: return 1 * mult // was 2 — softer so boards can stay denser
        case .crit: return 2 * mult // was 3
        case .refresh: return 1 * mult
        case .stone: return 1 * mult
        case .bomb: return 0 // splash lights neighbors; they score normally
        case .gold: return 1 * mult // coins handled separately; still ticks the cage a little
        }
    }

    /// Apply spirit damage scale (keeps bomb/0 intact).
    static func scaledPoints(_ raw: Int) -> Int {
        guard raw > 0 else { return 0 }
        return max(1, Int((Double(raw) * pegDamageScale).rounded()))
    }

    /// Bomb splash radius as fraction of board width.
    static let bombAOENormalized: CGFloat = 0.18

    /// Chance each blue/orange peg becomes a refresh peg when a board is laid out.
    static let refreshPegChance: Double = 0.08

    /// Flat foe ATK each round the spirit is still alive **and in melee**
    /// (flying foes bite every turn — see `PlinkBattleFoe.canMeleeThisRound`).
    static let enemyAttackDamage = 12

    /// @available(*, deprecated, message: "Use enemyAttackDamage")
    static let emptyShotPenalty = enemyAttackDamage

    /// Fallback when no per-foe attack is wired.
    static func enemyCounterAttack(for kind: PeglinEnemyKind?) -> Int {
        _ = kind
        return enemyAttackDamage
    }

    /// Peglin-style cavern is the default fight board (dense force pegs + rails).
    static func boardID(for kind: PeglinEnemyKind?) -> String {
        switch kind {
        case .foxSpirit, .burrowJackal: return "fox.pawPrint"
        case .brambleSpirit: return "fox.pawPrint"
        case .stagSpirit: return "fox.lanternRings"
        case .bizarroAbbie: return "fox.lanternRings"
        case nil: return "peglin.cavernArcs"
        }
    }

    /// Voyage fight boards — Temper / role pick denser or more open layouts.
    static func boardID(
        forAttacker attacker: PlinkAttackerKind?,
        role: MarbleVoyageGangFightRole?
    ) -> String {
        switch role {
        case .bigBoss:
            // Summit: densest readable board — reward careful aim + Strong Temper.
            return "peglin.cavernArcs"
        case .miniBoss:
            switch attacker?.temper {
            case .swift: return "fox.lanternRings"
            case .craft: return "fox.trailChevrons"
            case .brawl, .none: return "fox.nineTails"
            }
        case .henchman, .none:
            // Prefer denser boards by default — mayhem over open lanes.
            switch attacker?.temper {
            case .swift: return "fox.trailChevrons"
            case .craft: return "fox.nineTails"
            case .brawl, .none: return "peglin.cavernArcs"
            }
        }
    }

    static func boardIndex(for kind: PeglinEnemyKind?) -> Int {
        BoardLevel.index(ofID: boardID(for: kind))
    }

    static func boardIndex(
        forAttacker attacker: PlinkAttackerKind?,
        role: MarbleVoyageGangFightRole?
    ) -> Int {
        BoardLevel.index(ofID: boardID(forAttacker: attacker, role: role))
    }
}
