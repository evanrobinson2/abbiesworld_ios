import Foundation
import CoreGraphics

/// Stochastic decision protocol for map / shop / fight under kid archetypes.
/// Softmax over scored options + temperature noise — every pick can vary.
enum MarbleVoyagePlayerProtocol {

    // MARK: - Map

    struct MapDecision: Equatable, Sendable {
        var node: MarbleVoyageNode
        var reason: String
        var scores: [String: Double]
        var forced: Bool
    }

    /// Score reachable nodes, then sample with temperature (not argmax).
    static func chooseMapNode(
        player: MarbleVoyageCampaignSim.PlayerType,
        choices: [MarbleVoyageNode],
        run: MarbleVoyageRun,
        rng: inout SeededGenerator
    ) -> MapDecision {
        guard let only = choices.first, choices.count == 1 else {
            // fall through
            return chooseAmong(player: player, choices: choices, run: run, rng: &rng)
        }
        return MapDecision(
            node: only,
            reason: "only path",
            scores: [only.id: 1],
            forced: true
        )
    }

    private static func chooseAmong(
        player: MarbleVoyageCampaignSim.PlayerType,
        choices: [MarbleVoyageNode],
        run: MarbleVoyageRun,
        rng: inout SeededGenerator
    ) -> MapDecision {
        guard !choices.isEmpty else {
            preconditionFailure("chooseMapNode requires ≥1 choice")
        }
        let hpFrac = Double(run.playerHP) / Double(max(1, run.playerMaxHP))
        var scores: [String: Double] = [:]
        for node in choices {
            scores[node.id] = mapScore(player: player, node: node, hpFrac: hpFrac, run: run)
        }
        let temperature: Double
        switch player {
        case .aggressive: temperature = 0.85
        case .motivated: temperature = 0.55
        case .casual: temperature = 1.35
        }
        let picked = softmaxSample(ids: choices.map(\.id), scores: scores, temperature: temperature, rng: &rng)
        let node = choices.first(where: { $0.id == picked }) ?? choices[0]
        return MapDecision(
            node: node,
            reason: mapReason(player: player, node: node, hpFrac: hpFrac),
            scores: scores,
            forced: false
        )
    }

    /// Aggressive: fights / bosses. Motivated: heal-ish events when hurt, else fair fights. Casual: noisy.
    static func mapScore(
        player: MarbleVoyageCampaignSim.PlayerType,
        node: MarbleVoyageNode,
        hpFrac: Double,
        run: MarbleVoyageRun
    ) -> Double {
        var s = 1.0
        switch player {
        case .aggressive:
            switch node.kind {
            case .fight: s = 3.0 + Double(node.threat) * 0.05
            case .boss: s = 4.0
            case .treasure: s = 1.2
            case .mystery: s = 0.9
            case .shrine: s = hpFrac < 0.35 ? 2.0 : 0.4
            case .start: s = 0.1
            }
            if node.gangRole == .miniBoss || node.gangRole == .bigBoss { s += 1.5 }

        case .motivated:
            switch node.kind {
            case .shrine: s = hpFrac < 0.65 ? 3.5 : 1.2
            case .treasure: s = 2.0
            case .mystery: s = 1.5
            case .fight:
                s = 2.2
                // Prefer Strong Temper matchups when known.
                if let foe = node.waveAttacker?.temper {
                    let hasStrong = run.marbleCollection.contains {
                        $0.orb.temper.matchup(against: foe) == .strong
                    }
                    s += hasStrong ? 1.2 : -0.6
                }
                if node.threat >= 6, hpFrac < 0.45 { s -= 1.0 }
            case .boss: s = hpFrac < 0.5 ? 0.8 : 2.5
            case .start: s = 0.1
            }

        case .casual:
            // Nearly flat — slight shiny bias.
            switch node.kind {
            case .treasure: s = 1.4
            case .mystery: s = 1.3
            case .shrine: s = 1.2
            case .fight, .boss: s = 1.0
            case .start: s = 0.1
            }
            s += Double(node.column % 3) * 0.05
        }
        return max(0.05, s)
    }

    private static func mapReason(
        player: MarbleVoyageCampaignSim.PlayerType,
        node: MarbleVoyageNode,
        hpFrac: Double
    ) -> String {
        switch player {
        case .aggressive:
            return node.kind == .fight || node.kind == .boss ? "push fight" : "side beat"
        case .motivated:
            if node.kind == .shrine, hpFrac < 0.65 { return "rest when hurt" }
            if let foe = node.waveAttacker?.temper {
                return "temper-aware \(foe.title)"
            }
            return "balanced pick"
        case .casual:
            return "whim"
        }
    }

    // MARK: - Shop

    enum ShopIntent: String, CaseIterable, Sendable {
        case heal
        case ballUpgrade
        case buyMarble
        case buyCharm
        case leave
    }

    struct ShopPick: Equatable, Sendable {
        var intent: ShopIntent
        var reason: String
        var action: MarbleVoyageShopAction
    }

    /// One stochastic shop action (caller loops until leave / no spend).
    static func chooseShopAction(
        player: MarbleVoyageCampaignSim.PlayerType,
        run: MarbleVoyageRun,
        rng: inout SeededGenerator
    ) -> ShopPick {
        let hpFrac = Double(run.playerHP) / Double(max(1, run.playerMaxHP))
        var weights: [ShopIntent: Double] = [:]

        switch player {
        case .aggressive:
            weights[.ballUpgrade] = 3.5
            weights[.buyMarble] = shouldBuyTemperMarble(run) ? 3.0 : 1.2
            weights[.buyCharm] = 1.8
            weights[.heal] = hpFrac < 0.40 ? 2.5 : 0.15
            weights[.leave] = hpFrac > 0.35 && run.coins < 20 ? 1.5 : 0.4

        case .motivated:
            weights[.ballUpgrade] = hpFrac >= 0.50 ? 3.2 : 1.4
            weights[.heal] = hpFrac < 0.55 ? 3.5 : (hpFrac < 0.80 ? 1.2 : 0.2)
            weights[.buyMarble] = shouldBuyTemperMarble(run) ? 2.8 : 0.6
            weights[.buyCharm] = 1.3
            weights[.leave] = hpFrac > 0.70 && run.coins < 25 ? 1.2 : 0.35

        case .casual:
            weights[.heal] = 1.0
            weights[.ballUpgrade] = 1.0
            weights[.buyMarble] = 1.0
            weights[.buyCharm] = 1.0
            weights[.leave] = 1.4
        }

        // Zero out unaffordable / invalid.
        if run.shop == nil || run.playerHP >= run.playerMaxHP || (run.shop.map { run.coins < $0.healPrice } ?? true) {
            weights[.heal] = 0
        }
        if run.shop.map({ run.coins < $0.ballUpgradePrice }) ?? true
            || MarbleVoyageMarbleRules.upgradeTarget(in: run.marbleCollection) == nil {
            weights[.ballUpgrade] = 0
        }
        if run.shop == nil
            || run.marbleCollection.count >= MarbleVoyageMarbleRules.maxBagCount
            || (run.shop.map { run.coins < $0.buyMarblePrice || $0.marbleOffers.isEmpty } ?? true) {
            weights[.buyMarble] = 0
        }
        if cheapestAffordableCharm(run) == nil {
            weights[.buyCharm] = 0
        }

        let temperature: Double
        switch player {
        case .aggressive: temperature = 0.7
        case .motivated: temperature = 0.5
        case .casual: temperature = 1.4
        }

        let intents = ShopIntent.allCases
        let ids = intents.map(\.rawValue)
        var scoreMap: [String: Double] = [:]
        for intent in intents {
            scoreMap[intent.rawValue] = weights[intent] ?? 0
        }
        // If everything but leave is zero, leave.
        if intents.filter({ $0 != .leave }).allSatisfy({ (weights[$0] ?? 0) <= 0 }) {
            return ShopPick(intent: .leave, reason: "nothing affordable", action: .leave)
        }

        let pickedID = softmaxSample(ids: ids, scores: scoreMap, temperature: temperature, rng: &rng)
        let intent = ShopIntent(rawValue: pickedID) ?? .leave
        return materializeShop(intent: intent, run: run, player: player, rng: &rng)
    }

    private static func materializeShop(
        intent: ShopIntent,
        run: MarbleVoyageRun,
        player: MarbleVoyageCampaignSim.PlayerType,
        rng: inout SeededGenerator
    ) -> ShopPick {
        switch intent {
        case .leave:
            return ShopPick(intent: .leave, reason: "leave shop", action: .leave)
        case .heal:
            return ShopPick(intent: .heal, reason: "patch HP", action: .heal)
        case .ballUpgrade:
            return ShopPick(intent: .ballUpgrade, reason: "power up marble", action: .ballUpgrade)
        case .buyMarble:
            let orbID = strongestAffordableMarbleOffer(run)
                ?? run.shop?.marbleOffers.randomElement(using: &rng)
            if let orbID {
                return ShopPick(
                    intent: .buyMarble,
                    reason: player == .casual ? "shiny marble" : "temper / bag patch",
                    action: .buyMarble(orbID: orbID)
                )
            }
            return ShopPick(intent: .leave, reason: "no marble offer", action: .leave)
        case .buyCharm:
            let charm: MarbleVoyageCharm?
            switch player {
            case .aggressive:
                charm = offenseCharm(run) ?? cheapestAffordableCharm(run)
            case .motivated, .casual:
                charm = cheapestAffordableCharm(run)
                    ?? run.shop?.charmOffers.randomElement(using: &rng)
            }
            if let charm {
                return ShopPick(intent: .buyCharm, reason: "charm \(charm.title)", action: .buyCharm(charm))
            }
            return ShopPick(intent: .leave, reason: "no charm", action: .leave)
        }
    }

    // MARK: - Fight helpers (Temper + aim)

    static func sampleAim(
        player: MarbleVoyageCampaignSim.PlayerType,
        rng: inout SeededGenerator
    ) -> CGFloat {
        CGFloat.random(in: player.aimSpread, using: &rng)
    }

    static func shouldBuyTemperMarble(_ run: MarbleVoyageRun) -> Bool {
        guard run.marbleCollection.count < MarbleVoyageMarbleRules.maxBagCount else { return false }
        let nextFoe = run.reachableChoices().compactMap(\.waveAttacker).first?.temper
        guard let foeTemper = nextFoe else {
            return PlinkTemperRules.bagStance(in: run.marbleCollection) == nil
        }
        let hasStrong = run.marbleCollection.contains {
            $0.orb.temper.matchup(against: foeTemper) == .strong
        }
        return !hasStrong
    }

    static func strongestAffordableMarbleOffer(_ run: MarbleVoyageRun) -> String? {
        guard let shop = run.shop else { return nil }
        guard run.coins >= shop.buyMarblePrice else { return nil }
        let nextFoe = run.reachableChoices().compactMap(\.waveAttacker).first?.temper
        let stance = PlinkTemperRules.bagStance(in: run.marbleCollection)
        let scored = shop.marbleOffers.compactMap { orbID -> (String, Int)? in
            guard let orb = OrbKind.all.first(where: { $0.id == orbID }) else {
                return (orbID, 0)
            }
            var score = 1
            if let nextFoe, orb.temper.matchup(against: nextFoe) == .strong { score += 5 }
            if let stance, orb.temper != stance { score += 2 }
            if orb.temper != .brawl { score += 1 }
            return (orbID, score)
        }
        return scored.max(by: { $0.1 < $1.1 })?.0
    }

    static func cheapestAffordableCharm(_ run: MarbleVoyageRun) -> MarbleVoyageCharm? {
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

    static func offenseCharm(_ run: MarbleVoyageRun) -> MarbleVoyageCharm? {
        guard let shop = run.shop else { return nil }
        let prefer: [MarbleVoyageCharm] = [.prismBurst, .moonGleam, .sockSnatch, .cycle]
        for charm in prefer where shop.charmOffers.contains(charm) {
            let price = shop.charmPrices[charm] ?? charm.basePrice
            if run.coins >= price { return charm }
        }
        return cheapestAffordableCharm(run)
    }

    // MARK: - Softmax

    /// Sample an id with P ∝ exp(score / T). Zero scores are skipped.
    static func softmaxSample(
        ids: [String],
        scores: [String: Double],
        temperature: Double,
        rng: inout SeededGenerator
    ) -> String {
        let t = max(0.05, temperature)
        var weighted: [(String, Double)] = []
        var total = 0.0
        for id in ids {
            let s = scores[id] ?? 0
            guard s > 0 else { continue }
            let w = exp(s / t)
            weighted.append((id, w))
            total += w
        }
        guard total > 0, let first = weighted.first else {
            return ids.first ?? ""
        }
        var r = Double.random(in: 0..<total, using: &rng)
        for (id, w) in weighted {
            r -= w
            if r <= 0 { return id }
        }
        return first.0
    }
}
