import Foundation

// MARK: - Post-fight shop

enum MarbleVoyageShopSKU: String, Codable, Sendable {
    case heal
    case ballUpgrade
    case buyMarble
    case destroyMarble
    case charm
}

struct MarbleVoyageShopState: Equatable, Sendable {
    var healPrice: Int
    var ballUpgradePrice: Int
    var buyMarblePrice: Int
    /// Coins returned when scrapping one bag marble.
    var destroyRefund: Int
    /// Rolled marble kinds for sale this visit (orb ids).
    var marbleOffers: [String]
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
        let charmPool = MarbleVoyageCharm.allCases
        var charmPicks: [MarbleVoyageCharm] = []
        var charmBag = charmPool
        for _ in 0..<2 {
            guard !charmBag.isEmpty else { break }
            let i = Int.random(in: 0..<charmBag.count, using: &rng)
            charmPicks.append(charmBag.remove(at: i))
        }
        var charmPrices: [MarbleVoyageCharm: Int] = [:]
        for c in charmPicks { charmPrices[c] = c.basePrice }

        let marblePool = MarbleVoyageMarbleRules.shopCatalog
        var marblePicks: [String] = []
        var marbleBag = marblePool
        for _ in 0..<2 {
            guard !marbleBag.isEmpty else { break }
            let i = Int.random(in: 0..<marbleBag.count, using: &rng)
            marblePicks.append(marbleBag.remove(at: i).id)
        }

        return MarbleVoyageShopState(
            healPrice: economy.healPrice,
            ballUpgradePrice: economy.ballUpgradePrice,
            buyMarblePrice: economy.buyMarblePrice,
            destroyRefund: economy.destroyRefund,
            marbleOffers: marblePicks,
            charmOffers: charmPicks,
            charmPrices: charmPrices,
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
    case buyMarble(orbID: String)
    case destroyMarble(instanceID: String)
    case buyCharm(MarbleVoyageCharm)
    case leave
}

enum MarbleVoyageShopResult: Equatable, Sendable {
    case ok(message: String)
    case cannotAfford
    case alreadyMaxed
    case left
}
