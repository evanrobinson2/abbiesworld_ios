import CoreGraphics
import Foundation

/// Product modes for Marble Voyage (App Store game).
enum MarbleVoyageMode: String, Codable, CaseIterable, Identifiable, Sendable {
    case campaign
    case endless

    var id: String { rawValue }

    var title: String {
        switch self {
        case .campaign: return "Campaign"
        case .endless: return "Endless"
        }
    }

    var blurb: String {
        switch self {
        case .campaign: return "Climb · rescue spirits · free Bizarro"
        case .endless: return "Wave after wave · no map · how far can you go?"
        }
    }

    var systemIcon: String {
        switch self {
        case .campaign: return "flag.checkered"
        case .endless: return "infinity"
        }
    }
}

/// Chart node kinds — FTL + Peglin flavor.
enum MarbleVoyageNodeKind: String, Codable, CaseIterable, Sendable {
    case start
    case fight
    case treasure
    case mystery
    case shrine
    case boss

    var displayName: String {
        switch self {
        case .start: return "Launch"
        case .fight: return "Fight"
        case .treasure: return "Treasure"
        case .mystery, .shrine: return "?"
        case .boss: return "Boss"
        }
    }

    /// Chart pill / tile caption — no invented colloquial names.
    var chartLabel: String {
        switch self {
        case .start: return "DOCK"
        case .fight, .boss: return "FIGHT"
        case .treasure: return "TREASURE"
        case .mystery, .shrine: return "?"
        }
    }

    var systemIcon: String {
        switch self {
        case .start: return "airplane.departure"
        case .fight: return "flame.fill"
        case .treasure: return "gift.fill"
        case .mystery, .shrine: return "questionmark.circle.fill"
        case .boss: return "crown.fill"
        }
    }
}

struct MarbleVoyageNode: Identifiable, Equatable, Sendable {
    let id: String
    let kind: MarbleVoyageNodeKind
    let column: Int
    let row: Int
    let title: String
    /// Hostage in the cage (never a gang member).
    var enemyKind: PeglinEnemyKind?
    /// 1…N — scales foe HP / pressure.
    var threat: Int
    /// Climb stage 1…N (drives gang cycling in battle chrome).
    var stage: Int
    /// Who actually rattles Abbie here — henchman, mini-boss, or the big boss.
    var waveAttacker: PlinkAttackerKind?
    /// Gang-run role for cage multipliers / portrait scale / chrome copy.
    var gangRole: MarbleVoyageGangFightRole?
    /// Which land (mini-arc) this node belongs to; -1 for the summit and non-arc nodes.
    var miniArcIndex: Int

    init(
        id: String,
        kind: MarbleVoyageNodeKind,
        column: Int,
        row: Int,
        title: String,
        enemyKind: PeglinEnemyKind? = nil,
        threat: Int = 0,
        stage: Int = 0,
        waveAttacker: PlinkAttackerKind? = nil,
        gangRole: MarbleVoyageGangFightRole? = nil,
        miniArcIndex: Int = -1
    ) {
        self.id = id
        self.kind = kind
        self.column = column
        self.row = row
        self.title = title
        self.enemyKind = enemyKind
        self.threat = threat
        self.stage = stage
        self.waveAttacker = waveAttacker
        self.gangRole = gangRole
        self.miniArcIndex = miniArcIndex
    }
}

struct MarbleVoyageEdge: Equatable, Sendable {
    let from: String
    let to: String
}

enum MarbleVoyagePhase: Equatable, Sendable {
    case map
    case fight(nodeID: String)
    /// Post-fight shop — spend the coins the gold pegs paid out.
    case shop(afterNodeID: String)
    case event(nodeID: String)
    case victory
    case defeat
}

struct MarbleVoyageRun: Equatable, Sendable {
    var mode: MarbleVoyageMode
    var nodes: [MarbleVoyageNode]
    var edges: [MarbleVoyageEdge]
    var currentNodeID: String
    var visited: Set<String>
    /// Edges Abbie actually walked, in order — drives the obvious gold trail on the chart.
    var pathTaken: [MarbleVoyageEdge]
    var playerHP: Int
    var playerMaxHP: Int
    var phase: MarbleVoyagePhase
    var lastEventLine: String
    var seed: UInt64
    /// Fights cleared (campaign stage progress / endless streak).
    var fightsCleared: Int
    /// Best endless depth this device (updated on defeat/victory).
    var endlessBest: Int
    /// Who is big boss and who heads each land — rolled once per run.
    var gang: MarbleVoyageGangRun
    var coins: Int
    var charmStacks: [MarbleVoyageCharm: Int]
    var ballLevel: Int
    var marbleCollection: [MarbleVoyageOwnedMarble]
    var economy: MarbleVoyageEconomyTuning
    var shop: MarbleVoyageShopState?
    /// Summit cleared but the shop is still open — leaving it rolls the credits.
    var pendingVictoryAfterShop: Bool
    var shopVisitCount: Int
    /// Full reconstructible documentation of this voyage.
    var record: MarbleVoyageRunRecord

    static let defaultMaxHP = 120
    /// Lands in a campaign climb — each headed by one named crew mini-boss.
    static let gangMiniArcCount = 3
    /// POI fights inside one land before that land's boss.
    static let gangZonesPerArc = 3
    /// Combat nodes: per land 2 scraps + land boss, plus summit.
    static let campaignTotalFights = gangMiniArcCount * 3 + 1
    /// Mid-land encounter + post-boss rest, per land.
    static let campaignEventBeats = gangMiniArcCount * 2

    var currentNode: MarbleVoyageNode? {
        nodes.first { $0.id == currentNodeID }
    }

    func node(_ id: String) -> MarbleVoyageNode? {
        nodes.first { $0.id == id }
    }

    func reachableChoices() -> [MarbleVoyageNode] {
        edges
            .filter { $0.from == currentNodeID }
            .compactMap { edge in node(edge.to) }
            .sorted { ($0.column, $0.row) < ($1.column, $1.row) }
    }

    func didTraverse(from: String, to: String) -> Bool {
        pathTaken.contains { $0.from == from && $0.to == to }
    }

    mutating func choose(_ destinationID: String) {
        guard reachableChoices().contains(where: { $0.id == destinationID }),
              let dest = node(destinationID)
        else { return }
        pathTaken.append(.init(from: currentNodeID, to: destinationID))
        record.path.append(
            .init(
                from: currentNodeID,
                to: destinationID,
                title: dest.title,
                kind: dest.kind.rawValue
            )
        )
        visited.insert(destinationID)
        currentNodeID = destinationID
        lastEventLine = ""
        switch dest.kind {
        case .start:
            phase = .map
        case .fight, .boss:
            phase = .fight(nodeID: destinationID)
        case .treasure, .mystery, .shrine:
            phase = .event(nodeID: destinationID)
        }
    }

    // MARK: - Fight resolution

    mutating func finishFight(won: Bool, remainingHP: Int, goldEarned: Int = 0) {
        let fought = currentNode
        let hpBefore = playerHP
        playerHP = max(0, min(playerMaxHP, remainingHP))

        if !won || playerHP <= 0 {
            playerHP = 0
            phase = .defeat
            lastEventLine = defeatCopy()
            appendFightRecord(fought, won: false, hpBefore: hpBefore, goldEarned: 0)
            record.outcome = .defeat
            record.finishedAtISO8601 = ISO8601DateFormatter().string(from: Date())
            syncRecordTotals()
            persistEndlessBest()
            return
        }

        fightsCleared += 1
        coins += max(0, goldEarned)
        appendFightRecord(fought, won: true, hpBefore: hpBefore, goldEarned: max(0, goldEarned))

        if fought?.kind == .boss, mode == .campaign {
            phase = .victory
            pendingVictoryAfterShop = false
            lastEventLine = "\(gang.bigBoss.displayName) is beaten — the summit is yours!"
            record.outcome = .victory
            record.finishedAtISO8601 = ISO8601DateFormatter().string(from: Date())
            syncRecordTotals()
            persistEndlessBest()
            return
        }

        lastEventLine = goldEarned > 0
            ? "Won with \(playerHP)/\(playerMaxHP) HP · +\(goldEarned) coins."
            : "Won with \(playerHP)/\(playerMaxHP) HP. Heal only at the shop."
        openShop(after: currentNodeID)
    }

    // MARK: - Shop

    mutating func openShop(after nodeID: String) {
        shopVisitCount += 1
        shop = MarbleVoyageShopState.open(
            economy: economy,
            seed: seed,
            visitIndex: shopVisitCount
        )
        // Nothing beyond this node means the shop is the last beat of the run.
        pendingVictoryAfterShop = mode == .campaign
            && !edges.contains { $0.from == nodeID }
        record.shops.append(
            .init(
                afterNodeID: nodeID,
                walletBefore: coins,
                walletAfter: coins,
                hpBefore: playerHP,
                hpAfter: playerHP,
                charmOffers: shop?.charmOffers.map(\.rawValue) ?? [],
                purchases: []
            )
        )
        phase = .shop(afterNodeID: nodeID)
    }

    @discardableResult
    mutating func applyShop(_ action: MarbleVoyageShopAction) -> MarbleVoyageShopResult {
        guard var open = shop else {
            if case .leave = action { leaveShop() ; return .left }
            return .cannotAfford
        }

        switch action {
        case .leave:
            leaveShop()
            return .left

        case .heal:
            guard playerHP < playerMaxHP else { return .alreadyMaxed }
            guard coins >= open.healPrice else { return .cannotAfford }
            let price = open.healPrice
            let healed = min(shopHealAmount(), playerMaxHP - playerHP)
            coins -= price
            playerHP += healed
            open.healPrice = open.inflate(price, economy: economy)
            open.purchasesThisVisit += 1
            shop = open
            notePurchase(sku: MarbleVoyageShopSKU.heal.rawValue, price: price, detail: "+\(healed) HP")
            return .ok(message: "Bell balm · +\(healed) HP")

        case .ballUpgrade:
            guard let target = MarbleVoyageMarbleRules.upgradeTarget(in: marbleCollection) else {
                return .alreadyMaxed
            }
            guard coins >= open.ballUpgradePrice else { return .cannotAfford }
            let price = open.ballUpgradePrice
            coins -= price
            marbleCollection[target].level = min(
                MarbleVoyageOwnedMarble.maxLevel,
                marbleCollection[target].level + 1
            )
            ballLevel += 1
            let name = marbleCollection[target].orb.name
            let level = marbleCollection[target].clampedLevel
            open.ballUpgradePrice = open.inflate(price, economy: economy)
            open.purchasesThisVisit += 1
            shop = open
            notePurchase(
                sku: MarbleVoyageShopSKU.ballUpgrade.rawValue,
                price: price,
                detail: "\(name) → Lv\(level)"
            )
            return .ok(message: "\(name) is now Lv\(level)")

        case .buyMarble(let orbID):
            guard marbleCollection.count < MarbleVoyageMarbleRules.maxBagCount else {
                return .alreadyMaxed
            }
            guard open.marbleOffers.contains(orbID) else { return .alreadyMaxed }
            guard coins >= open.buyMarblePrice else { return .cannotAfford }
            let price = open.buyMarblePrice
            coins -= price
            let marble = MarbleVoyageOwnedMarble.make(orbID: orbID)
            marbleCollection.append(marble)
            open.marbleOffers.removeAll { $0 == orbID }
            open.buyMarblePrice = open.inflate(price, economy: economy)
            open.purchasesThisVisit += 1
            shop = open
            notePurchase(
                sku: "\(MarbleVoyageShopSKU.buyMarble.rawValue).\(orbID)",
                price: price,
                detail: "bag→\(marbleCollection.count)"
            )
            return .ok(message: "\(marble.orb.name) joined the bag")

        case .destroyMarble(let instanceID):
            guard marbleCollection.count > MarbleVoyageMarbleRules.minBagCount else {
                return .alreadyMaxed
            }
            guard let idx = MarbleVoyageMarbleRules.index(
                ofInstanceID: instanceID,
                in: marbleCollection
            ) else {
                return .alreadyMaxed
            }
            let refund = open.destroyRefund
            let name = marbleCollection[idx].orb.name
            marbleCollection.remove(at: idx)
            coins += refund
            open.purchasesThisVisit += 1
            shop = open
            notePurchase(
                sku: MarbleVoyageShopSKU.destroyMarble.rawValue,
                price: -refund,
                detail: "scrapped \(name) · bag→\(marbleCollection.count)"
            )
            return .ok(message: "Scrapped \(name) · +\(refund) coins")

        case .buyCharm(let charm):
            guard let price = open.charmPrices[charm],
                  open.charmOffers.contains(charm)
            else { return .alreadyMaxed }
            guard coins >= price else { return .cannotAfford }
            coins -= price
            addCharm(charm)
            open.charmOffers.removeAll { $0 == charm }
            open.charmPrices[charm] = open.inflate(price, economy: economy)
            open.purchasesThisVisit += 1
            shop = open
            notePurchase(
                sku: "\(MarbleVoyageShopSKU.charm.rawValue).\(charm.rawValue)",
                price: price,
                detail: "stack→\(charmStack(charm))"
            )
            return .ok(message: "\(charm.title) · \(charm.blurb)")
        }
    }

    mutating func leaveShop() {
        shop = nil
        closeShopRecord()
        if pendingVictoryAfterShop {
            pendingVictoryAfterShop = false
            phase = .victory
            lastEventLine = "\(gang.bigBoss.displayName) is beaten — the summit is yours!"
            record.outcome = .victory
            record.finishedAtISO8601 = ISO8601DateFormatter().string(from: Date())
            syncRecordTotals()
            persistEndlessBest()
            return
        }
        phase = .map
        if mode == .endless {
            appendEndlessFrontier()
        }
    }

    // MARK: - Events

    mutating func applyEvent(_ outcome: MarbleVoyageEventOutcome) {
        let kind = currentNode?.kind ?? .mystery
        playerHP = max(0, min(playerMaxHP, playerHP + outcome.hpDelta))
        coins = max(0, coins + outcome.coinDelta)
        if let charm = outcome.charmGrant {
            addCharm(charm)
        }
        if outcome.ballUpgrade,
           let idx = MarbleVoyageMarbleRules.upgradeTarget(in: marbleCollection) {
            marbleCollection[idx].level = min(
                MarbleVoyageOwnedMarble.maxLevel,
                marbleCollection[idx].level + 1
            )
        }
        lastEventLine = outcome.message
        record.events.append(
            .init(
                nodeID: currentNodeID,
                kind: kind.rawValue,
                message: outcome.message,
                hpDelta: outcome.hpDelta,
                coinDelta: outcome.coinDelta
            )
        )
        syncRecordTotals()
        if playerHP <= 0 {
            phase = .defeat
            record.outcome = .defeat
            persistEndlessBest()
            return
        }
        // Same beat as fights — Bell Market, then back to the climb.
        openShop(after: currentNodeID)
    }

    // MARK: - Difficulty

    func enemyMaxHP(for node: MarbleVoyageNode) -> Int {
        let base: Int
        switch node.kind {
        case .boss:
            base = 220 + node.threat * 40
        case .fight:
            base = 55 + node.threat * 32 + (mode == .endless ? fightsCleared * 8 : 0)
        default:
            base = 100
        }
        return base * gang.cageHPMultiplier(for: node.gangRole)
    }

    /// Foe bite per round — climbs in endless / late campaign, softened by Lullaby.
    func enemyAttack(for node: MarbleVoyageNode) -> Int {
        var base = 12 + node.threat * 2 + (node.kind == .boss ? 8 : 0)
        if node.gangRole == .miniBoss { base += 3 }
        if node.gangRole == .bigBoss { base += 5 }
        let capped = mode == .endless
            ? min(38, base + fightsCleared / 2)
            : min(32, base)
        let softened = MarbleVoyageCharm.foeAttackReduction(lullabyStacks: charmStack(.lullaby))
        return max(1, capped - softened)
    }

    /// 3× chrome for the big boss, 1.25× for a land boss, 1× for henchmen.
    func attackerPortraitScale(for node: MarbleVoyageNode) -> CGFloat {
        gang.portraitScale(for: node.gangRole)
    }

    // MARK: - Charms / economy

    func charmStack(_ charm: MarbleVoyageCharm) -> Int {
        charmStacks[charm] ?? 0
    }

    mutating func addCharm(_ charm: MarbleVoyageCharm, count: Int = 1) {
        guard count > 0 else { return }
        charmStacks[charm] = charmStack(charm) + count
        record.addCharmStack(charm, count: count)
    }

    /// Coins per gold peg after Moon Gleam.
    var effectiveGoldPegValue: Int {
        let multiplier = MarbleVoyageCharm.goldValueMultiplier(
            moonGleamStacks: charmStack(.moonGleam)
        )
        return max(1, Int((Double(economy.goldPegValue) * multiplier).rounded()))
    }

    /// HP restored by one shop heal (base fraction + Bloom stacks).
    func shopHealAmount() -> Int {
        let fraction = economy.healFraction
            + MarbleVoyageCharm.shopHealBonusFraction(stacks: charmStack(.bloom))
        return max(1, Int((Double(playerMaxHP) * fraction).rounded()))
    }

    /// Ordered orb ids handed to the fight board (bag order — no lobby picker).
    var fightDeckOrbIDs: [String] {
        MarbleVoyageMarbleRules.fightDeckOrbIDs(in: marbleCollection)
    }

    /// Cage damage multiplier from marble levels × the legacy global ball level.
    var fightDamageMultiplier: Double {
        MarbleVoyageMarbleRules.fightDamageMultiplier(
            collection: marbleCollection,
            ballLevel: ballLevel
        )
    }

    func defeatCopy() -> String {
        switch mode {
        case .campaign:
            return "Climb ends after \(fightsCleared) fights. HP only returns at the shop."
        case .endless:
            return "Endless run over — cleared \(fightsCleared) fights. Best \(max(endlessBest, fightsCleared))."
        }
    }

    mutating func persistEndlessBest() {
        guard mode == .endless else { return }
        let best = max(endlessBest, fightsCleared)
        endlessBest = best
        UserDefaults.standard.set(best, forKey: Self.endlessBestKey)
    }

    static let endlessBestKey = "marbleVoyage.endlessBest"

    static func storedEndlessBest() -> Int {
        UserDefaults.standard.integer(forKey: endlessBestKey)
    }

    /// Keep the legacy endless-best key in sync when stats are written elsewhere.
    static func noteEndlessBest(_ best: Int) {
        guard best > storedEndlessBest() else { return }
        UserDefaults.standard.set(best, forKey: endlessBestKey)
    }

    // MARK: - Record bookkeeping

    private mutating func syncRecordTotals() {
        record.coins = coins
        record.playerHP = playerHP
        record.playerMaxHP = playerMaxHP
        record.ballLevel = ballLevel
    }

    private mutating func appendFightRecord(
        _ node: MarbleVoyageNode?,
        won: Bool,
        hpBefore: Int,
        goldEarned: Int
    ) {
        guard let node else { return }
        record.fights.append(
            .init(
                nodeID: node.id,
                title: node.title,
                role: node.gangRole?.rawValue ?? "none",
                waveAttacker: node.waveAttacker?.rawValue,
                foes: [node.waveAttacker?.rawValue].compactMap { $0 },
                won: won,
                rounds: 0,
                damageDealt: 0,
                damageTaken: max(0, hpBefore - playerHP),
                hpBefore: hpBefore,
                hpAfter: playerHP,
                goldEarned: goldEarned,
                goldPegHits: 0,
                pegsLit: 0,
                boardPegs: 0,
                fightSeed: seed &+ UInt64(record.fights.count &+ 1) &* 7919
            )
        )
        syncRecordTotals()
    }

    private mutating func notePurchase(sku: String, price: Int, detail: String) {
        guard !record.shops.isEmpty else { return }
        record.shops[record.shops.count - 1].purchases.append(
            .init(sku: sku, pricePaid: price, detail: detail)
        )
        closeShopRecord()
    }

    private mutating func closeShopRecord() {
        guard !record.shops.isEmpty else { return }
        record.shops[record.shops.count - 1].walletAfter = coins
        record.shops[record.shops.count - 1].hpAfter = playerHP
        syncRecordTotals()
    }

    // MARK: - Generators

    static func make(
        mode: MarbleVoyageMode,
        seed: UInt64 = UInt64.random(in: 0...UInt64.max)
    ) -> MarbleVoyageRun {
        switch mode {
        case .campaign: return makeCampaign(seed: seed)
        case .endless: return makeEndless(seed: seed)
        }
    }

    /// Blank run around a freshly generated chart — every generator goes through here.
    private static func makeRunShell(
        mode: MarbleVoyageMode,
        seed: UInt64,
        gang: MarbleVoyageGangRun,
        nodes: [MarbleVoyageNode],
        edges: [MarbleVoyageEdge],
        lastEventLine: String
    ) -> MarbleVoyageRun {
        let economy = MarbleVoyageEconomyTuning.recommended
        return MarbleVoyageRun(
            mode: mode,
            nodes: nodes,
            edges: edges,
            currentNodeID: "start",
            visited: ["start"],
            pathTaken: [],
            playerHP: defaultMaxHP,
            playerMaxHP: defaultMaxHP,
            phase: .map,
            lastEventLine: lastEventLine,
            seed: seed,
            fightsCleared: 0,
            endlessBest: storedEndlessBest(),
            gang: gang,
            coins: 0,
            charmStacks: [:],
            ballLevel: 1,
            marbleCollection: MarbleVoyageOwnedMarble.starterCollection(),
            economy: economy,
            shop: nil,
            pendingVictoryAfterShop: false,
            shopVisitCount: 0,
            record: MarbleVoyageRunRecord.fresh(
                kind: .live,
                seed: seed,
                mode: mode,
                economy: economy,
                playerMaxHP: defaultMaxHP,
                gang: gang
            )
        )
    }

    /// Linear climb: 3 lands × (trail → bridge → cliff scrap → land boss), then the summit.
    static func makeCampaign(seed: UInt64) -> MarbleVoyageRun {
        let gang = MarbleVoyageGangRun.make(seed: seed)
        var nodes: [MarbleVoyageNode] = [
            .init(id: "start", kind: .start, column: 0, row: 1, title: "Sky Dock")
        ]
        var edges: [MarbleVoyageEdge] = []
        var previousID = "start"
        var column = 1
        var step = 0

        func link(_ to: String) {
            edges.append(.init(from: previousID, to: to))
            previousID = to
        }

        // Kid-facing scrap names — never leak L# / POI scaffolding into the chart.
        let scrapByLand: [[String]] = [
            ["Trail scrap", "Bridge scrap", "Cliff scrap"],
            ["Canal scrap", "Market scrap", "Rooftop scrap"],
            ["Fog scrap", "Ruin scrap", "Spire scrap"],
        ]
        let poiRows = [0, 2, 0]

        for land in 0..<gangMiniArcCount {
            let hostage = gang.hostage(forArc: land)
            let scraps = scrapByLand[land % scrapByLand.count]
            for poi in 0..<gangZonesPerArc {
                step += 1
                let id = "land\(land)_poi\(poi + 1)"
                // Middle scrap → encounter / treasure instead of a fight.
                if poi == 1 {
                    var rng = SeededGenerator(seed: seed &+ UInt64(step) &* 9_911)
                    let kinds: [MarbleVoyageNodeKind] = [.treasure, .mystery, .shrine]
                    let kind = kinds[Int.random(in: 0..<kinds.count, using: &rng)]
                    nodes.append(
                        .init(
                            id: id,
                            kind: kind,
                            column: column,
                            row: poiRows[poi % poiRows.count],
                            title: Self.eventTitle(kind, stage: step, rng: &rng),
                            threat: step,
                            stage: step,
                            miniArcIndex: land
                        )
                    )
                } else {
                    nodes.append(
                        .init(
                            id: id,
                            kind: .fight,
                            column: column,
                            row: poiRows[poi % poiRows.count],
                            title: scraps[poi % scraps.count],
                            enemyKind: hostage,
                            threat: step,
                            stage: step,
                            // Opening campaign fight always introduces the approved boxer.
                            waveAttacker: step == 1 ? .porcupineBoxer : gang.randomHenchman(
                                seedSalt: seed &+ UInt64(step) &* 104_729
                            ),
                            gangRole: .henchman,
                            miniArcIndex: land
                        )
                    )
                }
                link(id)
                column += 1
            }

            step += 1
            let bossID = "land\(land)_boss"
            let head = gang.miniBoss(arcIndex: land)
            nodes.append(
                .init(
                    id: bossID,
                    kind: .fight,
                    column: column,
                    row: 1,
                    title: "\(head.displayName)’s gate",
                    enemyKind: hostage,
                    threat: step,
                    stage: step,
                    waveAttacker: head,
                    gangRole: .miniBoss,
                    miniArcIndex: land
                )
            )
            link(bossID)
            column += 1

            // Rest beat after each land boss — shrine or treasure.
            step += 1
            let restID = "land\(land)_rest"
            var restRng = SeededGenerator(seed: seed &+ UInt64(land) &* 77_777)
            let restKind: MarbleVoyageNodeKind = land % 2 == 0 ? .shrine : .treasure
            nodes.append(
                .init(
                    id: restID,
                    kind: restKind,
                    column: column,
                    row: 1,
                    title: Self.eventTitle(restKind, stage: step, rng: &restRng),
                    threat: step,
                    stage: step,
                    miniArcIndex: land
                )
            )
            link(restID)
            column += 1
        }

        step += 2 // the summit is a real step up from the last land rest
        nodes.append(
            .init(
                id: "boss",
                kind: .boss,
                column: column,
                row: 1,
                title: "Summit · \(gang.bigBoss.displayName)",
                enemyKind: .bizarroAbbie,
                threat: step,
                stage: step,
                waveAttacker: gang.bigBoss,
                gangRole: .bigBoss,
                miniArcIndex: -1
            )
        )
        link("boss")

        return makeRunShell(
            mode: .campaign,
            seed: seed,
            gang: gang,
            nodes: nodes,
            edges: edges,
            lastEventLine: ""
        )
    }

    static func makeEndless(seed: UInt64) -> MarbleVoyageRun {
        let gang = MarbleVoyageGangRun.make(seed: seed)
        var run = makeRunShell(
            mode: .endless,
            seed: seed,
            gang: gang,
            nodes: [.init(id: "start", kind: .start, column: 0, row: 1, title: "Sky Dock")],
            edges: [],
            lastEventLine: ""
        )
        run.appendEndlessFrontier()
        return run
    }

    /// Grow endless by one linear beat ahead of the player (no branching chart).
    /// Pattern: fight → shop → fight → … ; every 4th wave a rest event; every 5th a boss wave.
    mutating func appendEndlessFrontier() {
        guard mode == .endless else { return }
        if !reachableChoices().isEmpty { return }

        let wave = (nodes.map(\.column).max() ?? 0) + 1
        var rng = SeededGenerator(seed: seed &+ UInt64(wave) &* 1_000_003)
        let isBossWave = wave % 5 == 0
        let isRestWave = !isBossWave && wave % 4 == 0

        let node: MarbleVoyageNode
        if isBossWave {
            let bossIndex = max(1, wave / 5)
            let isBigBoss = bossIndex % 3 == 0
            let arc = (bossIndex - 1) % Self.gangMiniArcCount
            let crew = isBigBoss ? gang.bigBoss : gang.miniBoss(arcIndex: arc)
            node = .init(
                id: "e\(wave)_boss",
                kind: .boss,
                column: wave,
                row: 1,
                title: isBigBoss
                    ? "Wave \(wave) · Summit · \(crew.displayName)"
                    : "Wave \(wave) · \(crew.displayName)",
                enemyKind: gang.hostage(forArc: bossIndex),
                threat: 6 + wave / 2,
                stage: wave,
                waveAttacker: crew,
                gangRole: isBigBoss ? .bigBoss : .miniBoss,
                miniArcIndex: isBigBoss ? -1 : arc
            )
        } else if isRestWave {
            let kinds: [MarbleVoyageNodeKind] = [.treasure, .mystery, .shrine]
            let kind = kinds.randomElement(using: &rng) ?? .treasure
            node = .init(
                id: "e\(wave)_rest",
                kind: kind,
                column: wave,
                row: 1,
                title: "Wave \(wave) · \(Self.eventTitle(kind, stage: wave, rng: &rng))",
                threat: wave,
                stage: wave,
                miniArcIndex: (wave / 2) % Self.gangMiniArcCount
            )
        } else {
            let arc = (wave / 2) % Self.gangMiniArcCount
            node = .init(
                id: "e\(wave)",
                kind: .fight,
                column: wave,
                row: 1,
                title: "Wave \(wave)",
                enemyKind: Self.enemyForStage(wave, branch: 0),
                threat: max(1, 1 + wave / 2),
                stage: wave,
                waveAttacker: gang.randomHenchman(
                    seedSalt: seed &+ UInt64(wave) &* 7919
                ),
                gangRole: .henchman,
                miniArcIndex: arc
            )
        }

        nodes.append(node)
        edges.append(.init(from: currentNodeID, to: node.id))
    }

    /// Next endless beat waiting on the progress hub (nil if frontier empty).
    var endlessNextBeat: MarbleVoyageNode? {
        guard mode == .endless else { return nil }
        return reachableChoices().first
    }

    /// 1-based wave index for chrome (cleared fights + 1, or next beat stage).
    var endlessDisplayWave: Int {
        if let next = endlessNextBeat, next.stage > 0 { return next.stage }
        return max(1, fightsCleared + 1)
    }

    // MARK: - Naming / enemies

    private static func enemyForStage(_ stage: Int, branch: Int) -> PeglinEnemyKind {
        let cycle: [PeglinEnemyKind] = [.brambleSpirit, .foxSpirit, .stagSpirit]
        return cycle[(stage + branch) % cycle.count]
    }

    private static func appendEventColumn(
        into nodes: inout [MarbleVoyageNode],
        column: Int,
        stage: Int,
        rng: inout SeededGenerator
    ) -> [String] {
        let kinds: [MarbleVoyageNodeKind] = [.treasure, .mystery]
        let top = kinds.randomElement(using: &rng) ?? .treasure
        var bottomPool = kinds.filter { $0 != top }
        if bottomPool.isEmpty { bottomPool = [MarbleVoyageNodeKind.mystery] }
        let bottom = bottomPool.randomElement(using: &rng) ?? .mystery
        let idA = "ev\(column)a"
        let idB = "ev\(column)b"
        nodes.append(
            .init(
                id: idA,
                kind: top,
                column: column,
                row: 0,
                title: eventTitle(top, rng: &rng)
            )
        )
        nodes.append(
            .init(
                id: idB,
                kind: bottom,
                column: column,
                row: 2,
                title: eventTitle(bottom, rng: &rng)
            )
        )
        return [idA, idB]
    }

    /// Fixed labels only — Treasure or ? (no invented place names).
    private static func eventTitle(_ kind: MarbleVoyageNodeKind, stage: Int = 0, rng: inout SeededGenerator) -> String {
        _ = stage
        _ = rng
        switch kind {
        case .treasure:
            return "Treasure"
        case .mystery, .shrine:
            return "?"
        default:
            return kind.displayName
        }
    }
}

struct MarbleVoyageEventOutcome: Equatable, Sendable {
    let message: String
    let hpDelta: Int
    var coinDelta: Int = 0
    var charmGrant: MarbleVoyageCharm? = nil
    var ballUpgrade: Bool = false
}

enum MarbleVoyageEvents {
    static func resolve(
        kind: MarbleVoyageNodeKind,
        title: String,
        rng: inout some RandomNumberGenerator
    ) -> MarbleVoyageEventOutcome {
        switch kind {
        case .treasure:
            return resolveTreasure(title: title, rng: &rng)
        case .shrine:
            return resolveShrine(title: title, rng: &rng)
        case .mystery:
            return resolveMystery(title: title, rng: &rng)
        default:
            return .init(message: "Nothing happens.", hpDelta: 0)
        }
    }

    private static func resolveTreasure(
        title: String,
        rng: inout some RandomNumberGenerator
    ) -> MarbleVoyageEventOutcome {
        let roll = Int.random(in: 0..<100, using: &rng)
        if roll < 35 {
            let coins = [18, 24, 30, 36].randomElement(using: &rng) ?? 24
            return .init(
                message: "\(title): +\(coins) coins.",
                hpDelta: 0,
                coinDelta: coins
            )
        }
        if roll < 60 {
            let heal = [18, 24, 30].randomElement(using: &rng) ?? 24
            return .init(
                message: "\(title): +\(heal) HP.",
                hpDelta: heal
            )
        }
        if roll < 82 {
            let charm = MarbleVoyageCharm.allCases.randomElement(using: &rng) ?? .moonGleam
            return .init(
                message: "\(title): Charm — \(charm.title)!",
                hpDelta: 0,
                charmGrant: charm
            )
        }
        return .init(
            message: "\(title): One marble levels up.",
            hpDelta: 0,
            ballUpgrade: true
        )
    }

    private static func resolveShrine(
        title: String,
        rng: inout some RandomNumberGenerator
    ) -> MarbleVoyageEventOutcome {
        let heal = [32, 36, 42, 48].randomElement(using: &rng) ?? 36
        let roll = Int.random(in: 0..<100, using: &rng)
        if roll < 55 {
            return .init(
                message: "\(title): +\(heal) HP.",
                hpDelta: heal
            )
        }
        if roll < 80 {
            let charm: MarbleVoyageCharm = [.bloom, .softPurr, .lullaby].randomElement(using: &rng) ?? .bloom
            return .init(
                message: "\(title): \(charm.title) · +\(heal / 2) HP.",
                hpDelta: heal / 2,
                charmGrant: charm
            )
        }
        return .init(
            message: "\(title): One marble levels up · +\(heal / 2) HP.",
            hpDelta: heal / 2,
            ballUpgrade: true
        )
    }

    private static func resolveMystery(
        title: String,
        rng: inout some RandomNumberGenerator
    ) -> MarbleVoyageEventOutcome {
        let roll = Int.random(in: 0..<100, using: &rng)
        if roll < 28 {
            let heal = 40
            return .init(message: "\(title): +\(heal) HP!", hpDelta: heal)
        }
        if roll < 48 {
            let coins = [12, 16, 22].randomElement(using: &rng) ?? 16
            return .init(
                message: "\(title): +\(coins) coins.",
                hpDelta: 0,
                coinDelta: coins
            )
        }
        if roll < 62 {
            let charm = MarbleVoyageCharm.allCases.randomElement(using: &rng) ?? .cycle
            return .init(
                message: "\(title): Charm — \(charm.title)!",
                hpDelta: 0,
                charmGrant: charm
            )
        }
        if roll < 78 {
            return .init(message: "\(title): Nothing this time.", hpDelta: 0)
        }
        let hurt = [12, 16, 20].randomElement(using: &rng) ?? 16
        return .init(message: "\(title): Trap! −\(hurt) HP.", hpDelta: -hurt)
    }
}
