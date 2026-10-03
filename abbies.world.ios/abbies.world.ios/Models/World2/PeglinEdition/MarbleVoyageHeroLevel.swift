import Foundation

/// Dota-transparent hero XP for Marble Voyage — levels from play, not map tiles.
enum MarbleVoyageHeroLevel {
    static let minLevel = 1
    static let maxLevel = 10

    /// XP needed to leave `level` toward `level + 1` (index 0 unused).
    /// Soft early curve so fight 1 often reaches Lv2; summit targets Lv8–10.
    private static let xpToNext: [Int] = [
        0,   // unused
        40,  // 1 → 2
        50,  // 2 → 3
        60,  // 3 → 4
        70,  // 4 → 5
        80,  // 5 → 6
        90,  // 6 → 7
        100, // 7 → 8
        110, // 8 → 9
        120, // 9 → 10
    ]

    // MARK: - Awards (kid-visible, fixed like Dota creep bounties)

    static let fightParticipationXP = 20
    static let groundHenchKillXP = 8
    static let flyingHenchKillXP = 10
    static let miniBossKillXP = 40
    static let bigBossKillXP = 80
    static let shrineXP = 10
    static let treasureXP = 8
    static let mysteryXP = 6
    /// Extra XP from bomb multi-kill combos during the fight.
    static let comboXPCapPerFight = 40

    // MARK: - Table

    static func xpToReachNext(from level: Int) -> Int {
        let lv = clamped(level)
        guard lv < maxLevel else { return 0 }
        return xpToNext[lv]
    }

    /// 0…1 fill of the current level bar.
    static func progress(level: Int, xpIntoLevel: Int) -> Double {
        let need = xpToReachNext(from: level)
        guard need > 0 else { return 1 }
        return min(1, max(0, Double(xpIntoLevel) / Double(need)))
    }

    /// Cage damage mult from hero level alone (Lv1 = 1.0, Lv10 = 1.45).
    static func damageMultiplier(level: Int) -> Double {
        1.0 + 0.05 * Double(max(0, clamped(level) - 1))
    }

    /// Max-HP bonus granted when arriving at `level` (0 for Lv1–2).
    static func maxHPBonusOnReach(level: Int) -> Int {
        let lv = clamped(level)
        // +8 at 3, 5, 7, 9
        guard lv >= 3, lv % 2 == 1 else { return 0 }
        return 8
    }

    static func eventXP(for kind: MarbleVoyageNodeKind) -> Int {
        switch kind {
        case .shrine: return shrineXP
        case .treasure: return treasureXP
        case .mystery: return mysteryXP
        default: return 0
        }
    }

    /// XP for winning a fight — participation + kill bounties for the full roster.
    static func fightWinXP(
        role: MarbleVoyageGangFightRole?,
        wave: PlinkAttackerKind,
        focus: PlinkAttackerKind,
        seed: UInt64
    ) -> Int {
        var total = fightParticipationXP
        switch role {
        case .bigBoss:
            total += bigBossKillXP
        case .miniBoss:
            total += miniBossKillXP
            let roster = PeglinBattleRules.makeRescueRoster(
                wave: wave,
                focus: focus,
                role: role,
                seed: seed
            )
            for foe in roster.dropFirst() {
                total += killXP(kind: foe.kind, role: .henchman)
            }
        case .henchman, .none:
            let roster = PeglinBattleRules.makeRescueRoster(
                wave: wave,
                focus: focus,
                role: role ?? .henchman,
                seed: seed
            )
            for foe in roster {
                total += killXP(kind: foe.kind, role: .henchman)
            }
        }
        return total
    }

    static func killXP(kind: PlinkAttackerKind, role: MarbleVoyageGangFightRole?) -> Int {
        switch role {
        case .bigBoss:
            return bigBossKillXP
        case .miniBoss:
            // Lead is the mini; hanger-on is hench bounty.
            if kind.isNamedCrew { return miniBossKillXP }
            return kind.isFlying ? flyingHenchKillXP : groundHenchKillXP
        case .henchman, .none:
            return kind.isFlying ? flyingHenchKillXP : groundHenchKillXP
        }
    }

    struct GrantResult: Equatable, Sendable {
        var xpGained: Int
        var levelsGained: Int
        var newLevel: Int
        var newXPIntoLevel: Int
        var maxHPGained: Int
    }

    /// Apply XP into `(level, xpIntoLevel)`. Caps at max level.
    static func apply(
        xp: Int,
        level: Int,
        xpIntoLevel: Int
    ) -> GrantResult {
        guard xp > 0 else {
            return GrantResult(
                xpGained: 0,
                levelsGained: 0,
                newLevel: clamped(level),
                newXPIntoLevel: max(0, xpIntoLevel),
                maxHPGained: 0
            )
        }
        var lv = clamped(level)
        var into = max(0, xpIntoLevel)
        var gainedLevels = 0
        var hp = 0
        var remaining = xp
        while remaining > 0, lv < maxLevel {
            let need = xpToReachNext(from: lv)
            let room = need - into
            if remaining < room {
                into += remaining
                remaining = 0
            } else {
                remaining -= room
                lv += 1
                gainedLevels += 1
                into = 0
                hp += maxHPBonusOnReach(level: lv)
            }
        }
        if lv >= maxLevel {
            into = 0
        }
        return GrantResult(
            xpGained: xp,
            levelsGained: gainedLevels,
            newLevel: lv,
            newXPIntoLevel: into,
            maxHPGained: hp
        )
    }

    private static func clamped(_ level: Int) -> Int {
        min(maxLevel, max(minLevel, level))
    }
}
