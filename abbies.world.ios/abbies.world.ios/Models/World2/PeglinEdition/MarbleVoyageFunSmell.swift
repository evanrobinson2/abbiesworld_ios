import Foundation

/// Detectable “not fun” / exploit signals from protocol Monte Carlo runs.
enum MarbleVoyageFunSmell: String, CaseIterable, Codable, Sendable {
    /// Long marble hang with almost no peg contact.
    case longHangFewPegs
    /// Many zero-hit shots in one fight (aim / board dead zones).
    case zeroHitSpam
    /// Lost the summit (or last boss) after clearing most of the climb.
    case lateCollapse
    /// Died with a fat wallet — heal/upgrade UI or AI refused useful spends.
    case coinHoardDeath
    /// Cleared many fights without ever upgrading a marble / ball.
    case upgradeStarve
    /// Soft Temper most of the run while Strong options existed in shops.
    case temperIgnored
    /// Hit-pegs never-heal path still clears — economy too forgiving.
    case noHealClearExploit
    /// Fight dragged past a round budget (slog).
    case fightSlog

    static let hangDurationThreshold: Double = 6.5
    static let lateCollapseMinFights: Int = 7
    static let zeroHitSpamThreshold: Int = 4
    static let fightSlogRounds: Int = 40
    static let coinHoardThreshold: Int = 40

    var kidLabel: String {
        switch self {
        case .longHangFewPegs: return "Long hang, few pegs"
        case .zeroHitSpam: return "Lots of empty shots"
        case .lateCollapse: return "Lost after a long climb"
        case .coinHoardDeath: return "Died with coins unspent"
        case .upgradeStarve: return "Never upgraded"
        case .temperIgnored: return "Ignored Strong / Soft"
        case .noHealClearExploit: return "Won without healing"
        case .fightSlog: return "Fight dragged on"
        }
    }
}
