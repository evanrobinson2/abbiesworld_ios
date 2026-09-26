import Foundation
import CoreGraphics

/// Full-campaign Monte Carlo — fights + shops + events under shop policies.
/// Uses continuum shot samples (`PlinkBattleBalance`) so marble upgrades and
/// win-rate bands share one statistical spine with live play.
enum MarbleVoyageCampaignSim {

    enum ShopPolicy: String, CaseIterable, Sendable {
        /// Heal when hurt, one upgrade, then charms if flush.
        case greedySustain
        /// Heal only when desperate; bank coins.
        case banker
        /// Spend on everything available.
        case spender
        /// Coin flip between heal / upgrade / charm / leave.
        case random
    }

    struct TrialResult: Equatable, Sendable {
        var won: Bool
        var fightsCleared: Int
        var playerHPLeft: Int
        var coins: Int
        var ballLevel: Int
        var charmCount: Int
        var marbleMeanLevel: Double
        var shopsVisited: Int
    }

    struct PolicyReport: Equatable, Sendable {
        var policy: ShopPolicy
        var trials: Int
        var clearRate: Double
        var meanFightsCleared: Double
        var meanHPLeftWhenWon: Double
        var meanCoins: Double
        var meanBallLevel: Double
        var meanCharms: Double
        var meanMarbleLevel: Double
    }

    /// One seeded campaign under a shop policy.
    static func playCampaign(
        seed: UInt64,
        policy: ShopPolicy,
        damageScale: Double = 1.0
    ) -> TrialResult {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: seed)
        var rng = SeededGenerator(seed: seed &+ 9_001)
        var shops = 0

        while true {
            switch run.phase {
            case .victory:
                return summarize(run, won: true, shops: shops)
            case .defeat:
                return summarize(run, won: false, shops: shops)

            case .map:
                let choices = run.reachableChoices()
                guard let next = choices.randomElement(using: &rng) ?? choices.first else {
                    return summarize(run, won: false, shops: shops)
                }
                run.choose(next.id)

            case .fight(let nodeID), .event(let nodeID):
                if case .event = run.phase {
                    let nodeSalt = UInt64(bitPattern: Int64(nodeID.hashValue))
                    var local = SeededGenerator(seed: seed &+ nodeSalt &* 13)
                    let kind = run.node(nodeID)?.kind ?? .mystery
                    let outcome = MarbleVoyageEvents.resolve(
                        kind: kind,
                        title: run.node(nodeID)?.title ?? "Event",
                        rng: &local
                    )
                    run.applyEvent(outcome)
                    continue
                }
                guard let node = run.node(nodeID) else {
                    return summarize(run, won: false, shops: shops)
                }
                let role = node.gangRole ?? .henchman
                let wave = node.waveAttacker ?? .porcupineBoxer
                var fight = PlinkBattleBalance.simulateFight(
                    role: role,
                    wave: wave,
                    focus: wave,
                    playerMaxHP: run.playerMaxHP,
                    seed: seed &+ UInt64(run.fightsCleared) &* 97
                )
                // Marble power nudges clear odds and leftover HP.
                let power = run.fightDamageMultiplier * damageScale
                if power > 1.02 {
                    if !fight.won, Double.random(in: 0...1, using: &rng) < min(0.55, (power - 1) * 0.85) {
                        fight.won = true
                        fight.playerHPLeft = max(1, Int((Double(run.playerHP) * 0.55).rounded()))
                    } else if fight.won {
                        let boostedHP = Int((Double(fight.playerHPLeft) * min(1.25, power)).rounded())
                        fight.playerHPLeft = min(run.playerMaxHP, max(fight.playerHPLeft, boostedHP))
                    }
                }
                let purr = MarbleVoyageCharm.biteDamageReduction(
                    softPurrStacks: run.charmStack(.softPurr)
                )
                if purr > 0, fight.damageTaken > 0 {
                    let reduced = max(0, fight.damageTaken - purr * max(1, fight.rounds / 2))
                    let saved = fight.damageTaken - reduced
                    fight.damageTaken = reduced
                    fight.playerHPLeft = min(run.playerMaxHP, fight.playerHPLeft + saved)
                }

                let gold = estimateFightGold(run: run, rng: &rng)
                let drained = Int((Double(max(0, fight.damageTaken)) * 0.35).rounded())
                let remaining = fight.won
                    ? max(1, min(run.playerMaxHP, run.playerHP - drained))
                    : 0
                run.finishFight(won: fight.won, remainingHP: remaining, goldEarned: gold)

            case .shop:
                shops += 1
                applyShopPolicy(&run, policy: policy, rng: &rng)
                run.applyShop(.leave)
            }
        }
    }

    static func report(
        policy: ShopPolicy,
        trials: Int = 80,
        seed: UInt64 = 42
    ) -> PolicyReport {
        var wins = 0
        var fights = 0.0
        var hpWon = 0.0
        var coins = 0.0
        var ball = 0.0
        var charms = 0.0
        var marbleLv = 0.0
        var wonCount = 0
        for i in 0..<trials {
            let trial = playCampaign(seed: seed &+ UInt64(i) &* 1_009, policy: policy)
            if trial.won {
                wins += 1
                wonCount += 1
                hpWon += Double(trial.playerHPLeft)
            }
            fights += Double(trial.fightsCleared)
            coins += Double(trial.coins)
            ball += Double(trial.ballLevel)
            charms += Double(trial.charmCount)
            marbleLv += trial.marbleMeanLevel
        }
        let n = Double(trials)
        return PolicyReport(
            policy: policy,
            trials: trials,
            clearRate: Double(wins) / n,
            meanFightsCleared: fights / n,
            meanHPLeftWhenWon: wonCount > 0 ? hpWon / Double(wonCount) : 0,
            meanCoins: coins / n,
            meanBallLevel: ball / n,
            meanCharms: charms / n,
            meanMarbleLevel: marbleLv / n
        )
    }

    static func reportAllPolicies(trials: Int = 60, seed: UInt64 = 7) -> [PolicyReport] {
        ShopPolicy.allCases.map { report(policy: $0, trials: trials, seed: seed) }
    }

    // MARK: - Internals

    private static func summarize(
        _ run: MarbleVoyageRun,
        won: Bool,
        shops: Int
    ) -> TrialResult {
        let levels = run.marbleCollection.map { Double($0.clampedLevel) }
        let meanLv = levels.isEmpty ? 1 : levels.reduce(0, +) / Double(levels.count)
        let charms = run.charmStacks.values.reduce(0, +)
        return TrialResult(
            won: won,
            fightsCleared: run.fightsCleared,
            playerHPLeft: run.playerHP,
            coins: run.coins,
            ballLevel: run.ballLevel,
            charmCount: charms,
            marbleMeanLevel: meanLv,
            shopsVisited: shops
        )
    }

    private static func estimateFightGold(
        run: MarbleVoyageRun,
        rng: inout SeededGenerator
    ) -> Int {
        let hits = Int.random(in: 3...8, using: &rng)
        let goldHits = max(1, Int((Double(hits) * run.economy.goldPegPrevalence).rounded()))
        // ~24–30 mean with recommended economy.
        return max(0, goldHits * run.effectiveGoldPegValue + Int.random(in: 12...22, using: &rng))
    }

    private static func applyShopPolicy(
        _ run: inout MarbleVoyageRun,
        policy: ShopPolicy,
        rng: inout SeededGenerator
    ) {
        switch policy {
        case .greedySustain:
            for _ in 0..<10 {
                let hpFrac = Double(run.playerHP) / Double(max(1, run.playerMaxHP))
                if hpFrac < 0.70, case .ok = run.applyShop(.heal) { continue }
                if case .ok = run.applyShop(.ballUpgrade) { continue }
                if let charm = cheapestAffordableCharm(run), case .ok = run.applyShop(.buyCharm(charm)) {
                    continue
                }
                if hpFrac < 0.90, case .ok = run.applyShop(.heal) { continue }
                break
            }
        case .banker:
            let hpFrac = Double(run.playerHP) / Double(max(1, run.playerMaxHP))
            if hpFrac < 0.55 {
                _ = run.applyShop(.heal)
            }
        case .spender:
            for _ in 0..<14 {
                var acted = false
                if case .ok = run.applyShop(.heal) { acted = true }
                if case .ok = run.applyShop(.ballUpgrade) { acted = true }
                if let charm = cheapestAffordableCharm(run), case .ok = run.applyShop(.buyCharm(charm)) {
                    acted = true
                }
                if let orbID = run.shop?.marbleOffers.randomElement(using: &rng),
                   case .ok = run.applyShop(.buyMarble(orbID: orbID)) {
                    acted = true
                }
                if !acted { break }
            }
        case .random:
            for _ in 0..<6 {
                let roll = Int.random(in: 0..<4, using: &rng)
                switch roll {
                case 0: _ = run.applyShop(.heal)
                case 1: _ = run.applyShop(.ballUpgrade)
                case 2:
                    if let charm = run.shop?.charmOffers.randomElement(using: &rng) {
                        _ = run.applyShop(.buyCharm(charm))
                    }
                default:
                    break
                }
            }
        }
    }

    private static func cheapestAffordableCharm(_ run: MarbleVoyageRun) -> MarbleVoyageCharm? {
        guard let shop = run.shop else { return nil }
        return shop.charmOffers
            .compactMap { charm -> (MarbleVoyageCharm, Int)? in
                let price = shop.charmPrices[charm] ?? charm.basePrice
                return run.coins >= price ? (charm, price) : nil
            }
            .sorted { $0.1 < $1.1 }
            .first?
            .0
    }
}
