import Foundation

/// Creep-wave sizing + bomb/peg combo payoffs (Dota lane fantasy).
/// One fight = one creep *type* (clones), not a zoo of different icons.
enum PlinkCreepWave {
    /// Hench scrap pack — long enough for “last 5 / next 15” chrome.
    static let henchmanCount = 22
    /// Adds behind a land mini-boss (one uniform creep type).
    static let miniBossAddCount = 14
    /// Honor-guard creeps at the summit (boss still leads; guards match).
    static let bigBossGuardCount = 12

    /// Soft hench HP — peg damage is dialed down for bounce mayhem, so packs stay poppable.
    static let henchGroundHP = 12
    static let henchFlyingHP = 10
    /// Bomb lob should still clear a stock creep.
    static let bombAOEDamage = 14

    /// How many defeated creeps the fight header remembers.
    static let headerHistoryCount = 5
    /// How many upcoming creeps (including the front) the fight header shows.
    static let headerUpcomingCount = 15

    /// Bonus hero XP when a bomb (or settle punch) multi-kills.
    static func comboBonusXP(kills: Int) -> Int {
        switch kills {
        case ...1: return 0
        case 2: return 6
        case 3: return 12
        case 4: return 20
        default: return 28
        }
    }

    /// Kid-facing combo callout.
    static func comboLabel(kills: Int) -> String {
        switch kills {
        case ...1: return ""
        case 2: return "DOUBLE! ×2"
        case 3: return "TRIPLE! ×3"
        case 4: return "QUAD! ×4"
        default: return "CREEP WAVE! ×\(kills)"
        }
    }

    /// Extra cage damage next shot after a big bomb clear (stacks lightly).
    static func comboDamageBonus(kills: Int) -> Int {
        switch kills {
        case ...2: return 0
        case 3: return 4
        case 4: return 8
        default: return 12
        }
    }
}
