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
        case .endless: return "How high can you climb? Difficulty never stops."
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
        case .mystery: return "Mystery"
        case .shrine: return "Shrine"
        case .boss: return "Boss"
        }
    }

    var systemIcon: String {
        switch self {
        case .start: return "airplane.departure"
        case .fight: return "flame.fill"
        case .treasure: return "gift.fill"
        case .mystery: return "questionmark.circle.fill"
        case .shrine: return "cross.circle.fill"
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
    /// Every campaign fight: 3 lands × (3 POIs + land boss) + the summit.
    static let campaignTotalFights = gangMiniArcCount * (gangZonesPerArc + 1) + 1

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
        lastEventLine = outcome.message
        record.events.append(
            .init(
                nodeID: currentNodeID,
                kind: kind.rawValue,
                message: outcome.message,
                hpDelta: outcome.hpDelta,
                coinDelta: 0
            )
        )
        syncRecordTotals()
        if playerHP <= 0 {
            phase = .defeat
            record.outcome = .defeat
            persistEndlessBest()
            return
        }
        phase = .map
        if mode == .endless {
            appendEndlessFrontier()
        }
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
        var base = 14 + node.threat * 2 + (node.kind == .boss ? 10 : 0)
        if node.gangRole == .miniBoss { base += 4 }
        let capped = mode == .endless
            ? min(42, base + fightsCleared / 2)
            : min(36, base)
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

    /// Linear climb: 3 lands × (POI1 warmup → POI2 battle → POI3 hard → land boss), then the summit.
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

        let poiLabels = ["POI1 Warmup", "POI2 Battle", "POI3 Hard"]
        let poiRows = [0, 2, 0]

        for land in 0..<gangMiniArcCount {
            let hostage = gang.hostage(forArc: land)
            for poi in 0..<gangZonesPerArc {
                step += 1
                let id = "land\(land)_poi\(poi + 1)"
                nodes.append(
                    .init(
                        id: id,
                        kind: .fight,
                        column: column,
                        row: poiRows[poi % poiRows.count],
                        title: "L\(land + 1) \(poiLabels[poi])",
                        enemyKind: hostage,
                        threat: step,
                        stage: step,
                        waveAttacker: gang.randomHenchman(
                            seedSalt: seed &+ UInt64(step) &* 104_729
                        ),
                        gangRole: .henchman,
                        miniArcIndex: land
                    )
                )
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
                    title: "L\(land + 1) Boss · \(head.shortName)",
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
        }

        step += 2 // the summit is a real step up from the last land boss
        nodes.append(
            .init(
                id: "boss",
                kind: .boss,
                column: column,
                row: 1,
                title: "Summit · \(gang.bigBoss.shortName)",
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
            lastEventLine: "Three lands, then the summit. \(gang.bigBoss.displayName) is waiting."
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
            lastEventLine: "Endless voyage — the grid grows as you clear fights. Best \(storedEndlessBest())."
        )
        run.appendEndlessFrontier()
        return run
    }

    /// Grow the endless chart one column ahead of the player (idempotent).
    mutating func appendEndlessFrontier() {
        guard mode == .endless else { return }
        if !reachableChoices().isEmpty { return }

        let nextColumn = (nodes.map(\.column).max() ?? 0) + 1
        var rng = SeededGenerator(seed: seed &+ UInt64(nextColumn) &* 1_000_003)
        // Col 1 fight, 2 event, 3 fight, 4 event, 5 boss, 6 fight…
        let isBossWave = nextColumn % 5 == 0
        let isEventColumn = !isBossWave && nextColumn % 2 == 0
        let wave = nextColumn

        let newIDs: [String]
        if isBossWave {
            // Every 5th wave is a named crew member; every 3rd of those is the big boss.
            let bossIndex = max(1, wave / 5)
            let isBigBoss = bossIndex % 3 == 0
            let arc = (bossIndex - 1) % Self.gangMiniArcCount
            let crew = isBigBoss ? gang.bigBoss : gang.miniBoss(arcIndex: arc)
            let id = "e\(wave)_boss"
            nodes.append(
                .init(
                    id: id,
                    kind: .boss,
                    column: nextColumn,
                    row: 1,
                    title: "Wave \(wave) · \(crew.shortName)",
                    enemyKind: gang.hostage(forArc: bossIndex),
                    threat: 6 + wave / 2,
                    stage: wave,
                    waveAttacker: crew,
                    gangRole: isBigBoss ? .bigBoss : .miniBoss,
                    miniArcIndex: isBigBoss ? -1 : arc
                )
            )
            newIDs = [id]
        } else if isEventColumn {
            newIDs = Self.appendEventColumn(into: &nodes, column: nextColumn, stage: wave, rng: &rng)
        } else {
            let left = "e\(wave)a"
            let right = "e\(wave)b"
            let threat = max(1, 1 + wave / 2)
            let arc = (wave / 2) % Self.gangMiniArcCount
            for (index, id) in [left, right].enumerated() {
                nodes.append(
                    .init(
                        id: id,
                        kind: .fight,
                        column: nextColumn,
                        row: index == 0 ? 0 : 2,
                        title: "Wave \(wave) · \(index == 0 ? "Port" : "Starboard")",
                        enemyKind: Self.enemyForStage(wave, branch: index),
                        threat: threat,
                        stage: wave,
                        waveAttacker: gang.randomHenchman(
                            seedSalt: seed &+ UInt64(wave) &* 7919 &+ UInt64(index)
                        ),
                        gangRole: .henchman,
                        miniArcIndex: arc
                    )
                )
            }
            newIDs = [left, right]
        }

        for to in newIDs {
            edges.append(.init(from: currentNodeID, to: to))
        }
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
        let kinds: [MarbleVoyageNodeKind] = [.treasure, .mystery, .shrine]
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
                title: eventTitle(top, stage: stage, rng: &rng)
            )
        )
        nodes.append(
            .init(
                id: idB,
                kind: bottom,
                column: column,
                row: 2,
                title: eventTitle(bottom, stage: stage, rng: &rng)
            )
        )
        return [idA, idB]
    }

    private static func eventTitle(_ kind: MarbleVoyageNodeKind, stage: Int, rng: inout SeededGenerator) -> String {
        switch kind {
        case .treasure:
            return ["Salvage Cache", "Orb Chest", "Glow Crate", "Bell Trunk"].randomElement(using: &rng)!
        case .mystery:
            return ["Fog Beacon", "Whisper Gate", "Drift Signal", "Echo Well"].randomElement(using: &rng)!
        case .shrine:
            return ["Bell Shrine", "Heal Choir", "Light Altar", "Mercy Bell"].randomElement(using: &rng)!
        default:
            return "Landing \(stage)"
        }
    }
}

struct MarbleVoyageEventOutcome: Equatable, Sendable {
    let message: String
    let hpDelta: Int
}

enum MarbleVoyageEvents {
    static func resolve(
        kind: MarbleVoyageNodeKind,
        title: String,
        rng: inout some RandomNumberGenerator
    ) -> MarbleVoyageEventOutcome {
        switch kind {
        case .treasure:
            let heal = [18, 24, 30, 34].randomElement(using: &rng) ?? 24
            return .init(
                message: "\(title): Bell Balm! +\(heal) HP.",
                hpDelta: heal
            )
        case .shrine:
            let heal = [32, 36, 42].randomElement(using: &rng) ?? 36
            return .init(
                message: "\(title): A heal spell wraps you in warm light. +\(heal) HP.",
                hpDelta: heal
            )
        case .mystery:
            let roll = Int.random(in: 0..<100, using: &rng)
            if roll < 38 {
                let heal = 40
                return .init(message: "\(title): A floating bell kisses you. +\(heal) HP!", hpDelta: heal)
            }
            if roll < 68 {
                return .init(message: "\(title): Empty fog… no hurt, no heal.", hpDelta: 0)
            }
            let hurt = [12, 16, 20].randomElement(using: &rng) ?? 16
            return .init(message: "\(title): A trick! Sparks sting for −\(hurt) HP.", hpDelta: -hurt)
        default:
            return .init(message: "Nothing happens.", hpDelta: 0)
        }
    }
}
