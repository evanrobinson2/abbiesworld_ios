import Foundation

// MARK: - Post-fight shop

enum MarbleVoyageShopSKU: String, Codable, Sendable {
    case heal
    case ballUpgrade
    case charm
}

struct MarbleVoyageShopState: Equatable, Sendable {
    var healPrice: Int
    var ballUpgradePrice: Int
    /// Two rolled charm offers for this visit.
    var charmOffers: [MarbleVoyageCharm]
    var charmPrices: [MarbleVoyageCharm: Int]
    var purchasesThisVisit: Int

    static func open(
        economy: MarbleVoyageEconomyTuning,
        seed: UInt64,
        visitIndex: Int
    ) -> MarbleVoyageShopState {
        var rng = SeededGenerator(seed: seed &+ UInt64(visitIndex) &* 9973)
        let pool = MarbleVoyageCharm.allCases
        var picks: [MarbleVoyageCharm] = []
        var bag = pool
        for _ in 0..<2 {
            guard !bag.isEmpty else { break }
            let i = Int.random(in: 0..<bag.count, using: &rng)
            picks.append(bag.remove(at: i))
        }
        var prices: [MarbleVoyageCharm: Int] = [:]
        for c in picks { prices[c] = c.basePrice }
        return MarbleVoyageShopState(
            healPrice: economy.healPrice,
            ballUpgradePrice: economy.ballUpgradePrice,
            charmOffers: picks,
            charmPrices: prices,
            purchasesThisVisit: 0
        )
    }

    mutating func inflate(_ price: Int, economy: MarbleVoyageEconomyTuning) -> Int {
        max(1, Int((Double(price) * economy.shopInflation).rounded()))
    }
}

enum MarbleVoyageShopAction: Equatable, Sendable {
    case heal
    case ballUpgrade
    case buyCharm(MarbleVoyageCharm)
    case leave
}

enum MarbleVoyageShopResult: Equatable, Sendable {
    case ok(message: String)
    case cannotAfford
    case alreadyMaxed
    case left
}
