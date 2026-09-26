import Foundation

// MARK: - Permanent charms (Peglin *relic roles*, not Peglin content)
//
// Peglin’s run machine: **orbs act · relics rewrite rules** (see
// `prototypes/PlinkCore/PEGLIN_KNOWLEDGE_MAP.md` + peglin.wiki.gg Relics).
// Marble Voyage charms are kid-facing permanent rule stacks bought in shops.
// Effects map to Peglin relic *categories* (gold / healing / peg / bomb /
// defense / status). Names + art are original (IngredientKit enamel set);
// we do **not** copy Peglin relic titles or sprites.

/// Stackable permanent run modifiers — Peglin relic-role analogues.
enum MarbleVoyageCharm: String, CaseIterable, Identifiable, Codable, Sendable {
    /// Healing relics — shop/end heal potency (Peglin: healing category).
    case bloom
    /// Bounce / flight retention (Peglin: utility · high-bounce orb feel).
    case hover
    /// Peg damage / first-hit power (Peglin peg relics e.g. Adventurine role).
    case prismBurst
    /// Gold relics — gold-peg payout (Peglin: gold category).
    case moonGleam
    /// Board peg mix — more crit/refresh presence (Peglin: Lucky Penny / refresh).
    case cycle
    /// Defensive relics — less damage when bitten.
    case softPurr
    /// Status / debuff lane — soften foe ATK (Peglin: Roundrel status space).
    case lullaby
    /// Bomb / clear payout — coins when bombs resolve (Peglin: bomb relics).
    case sockSnatch

    var id: String { rawValue }

    var title: String {
        switch self {
        case .bloom: return "Bloom"
        case .hover: return "Hover"
        case .prismBurst: return "Prism Burst"
        case .moonGleam: return "Moon Gleam"
        case .cycle: return "Cycle"
        case .softPurr: return "Soft Purr"
        case .lullaby: return "Lullaby"
        case .sockSnatch: return "Sock Snatch"
        }
    }

    var blurb: String {
        switch self {
        case .bloom: return "Shop heals restore more."
        case .hover: return "Ball keeps speed between pegs."
        case .prismBurst: return "Long orange streaks hit harder."
        case .moonGleam: return "Gold pegs pay more."
        case .cycle: return "Board leans toward crit / refresh."
        case .softPurr: return "Bites hurt a little less."
        case .lullaby: return "Foes swing softer."
        case .sockSnatch: return "Bombs drop spare coins."
        }
    }

    /// Peglin relic *role* this charm stands in for (inspiration only — not a clone).
    var peglinRole: String {
        switch self {
        case .bloom: return "healing"
        case .hover: return "utility_bounce"
        case .prismBurst: return "peg_damage"
        case .moonGleam: return "gold"
        case .cycle: return "crit_refresh_board"
        case .softPurr: return "defensive"
        case .lullaby: return "status_debuff"
        case .sockSnatch: return "bomb_payout"
        }
    }

    /// Public Peglin exemplars that motivated the *role* (wiki names for designers).
    var peglinExemplars: [String] {
        switch self {
        case .bloom: return ["An Apple A Day", "Gardener's Gloves"]
        case .hover: return ["Super Boots", "Rubborb (orb verb)"]
        case .prismBurst: return ["Adventurine"]
        case .moonGleam: return ["Molten Gold"]
        case .cycle: return ["Lucky Penny", "Strange Brew"]
        case .softPurr: return ["Round Guard", "Refreshield"]
        case .lullaby: return ["Roundrel status pool"]
        case .sockSnatch: return ["Short Fuse", "bomb relic category"]
        }
    }

    /// Dev-asset-library / IngredientKit enamel id (DAG status: shipped).
    var assetSemanticID: String {
        switch self {
        case .bloom: return "ench_grows_flowers"
        case .hover: return "ench_floats_an_inch"
        case .prismBurst: return "ench_burps_rainbows"
        case .moonGleam: return "ench_glows_at_night"
        case .cycle: return "ench_changes_colour"
        case .softPurr: return "ench_purrs_when_you_sit"
        case .lullaby: return "ench_sings_lullabies"
        case .sockSnatch: return "ench_hides_your_socks"
        }
    }

    /// Bundled carved PNG under IngredientKit (install path for xcassets later).
    var carvedSourceName: String { assetSemanticID }

    /// Bundled enamel art in `Assets.xcassets` (shop tiles / HUD chips).
    var catalogImageName: String { "world2_plink_charm_\(rawValue)" }

    /// Base shop price (coins). Inflates ×1.25 per buy within one shop visit.
    var basePrice: Int {
        switch self {
        case .bloom, .hover, .cycle: return 35
        case .moonGleam, .prismBurst, .softPurr, .lullaby: return 40
        case .sockSnatch: return 30
        }
    }

    // MARK: Stack math (documented for sims)

    /// Extra heal fraction of max HP per stack when buying shop heal.
    static func shopHealBonusFraction(stacks: Int) -> Double {
        0.05 * Double(max(0, stacks))
    }

    /// Multiplier on gold-peg coin value.
    static func goldValueMultiplier(moonGleamStacks: Int) -> Double {
        1.0 + 0.10 * Double(max(0, moonGleamStacks))
    }

    /// Flat bite damage reduction (min 0).
    static func biteDamageReduction(softPurrStacks: Int) -> Int {
        max(0, softPurrStacks)
    }

    /// Flat foe ATK reduction (floor 1).
    static func foeAttackReduction(lullabyStacks: Int) -> Int {
        max(0, lullabyStacks)
    }

    /// Bonus cage damage when orange streak length ≥ threshold.
    static func prismCageBonus(stacks: Int) -> Int {
        max(0, stacks)
    }

    static let prismStreakThreshold = 5

    /// Coins granted when a bomb clears, per stack.
    static func bombClearCoins(sockSnatchStacks: Int) -> Int {
        3 * max(0, sockSnatchStacks)
    }

    /// Extra crit/refresh pegs seeded on the board per Cycle stack.
    static func extraSpecialPegs(cycleStacks: Int) -> Int {
        max(0, cycleStacks)
    }
}

/// Economy tunables — gold peg prevalence/value (from gold sims).
struct MarbleVoyageEconomyTuning: Equatable, Codable, Sendable {
    /// Fraction of board pegs that are gold (recommended 0.15).
    var goldPegPrevalence: Double
    /// Coins per gold peg lit (recommended 6).
    var goldPegValue: Int
    /// Shop heal base price.
    var healPrice: Int
    /// Shop ball-upgrade base price.
    var ballUpgradePrice: Int
    /// Heal restores this fraction of max HP (before Bloom).
    var healFraction: Double
    /// Per-purchase price multiplier within one shop visit.
    var shopInflation: Double

    static let recommended = MarbleVoyageEconomyTuning(
        goldPegPrevalence: 0.15,
        goldPegValue: 6,
        healPrice: 25,
        ballUpgradePrice: 25,
        healFraction: 0.20,
        shopInflation: 1.25
    )
}
