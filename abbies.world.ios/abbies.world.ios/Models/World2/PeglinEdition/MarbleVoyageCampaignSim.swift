import Foundation
import CoreGraphics

/// Full-campaign Monte Carlo — player-protocol decisions (map / shop / Temper)
/// with per-run telemetry, fun smells, and legacy shop policies.
enum MarbleVoyageCampaignSim {

    // MARK: - Player archetypes (skill ladder)

    /// Three skill bands used to tune Normal vs Hard.
    /// - `uninterested`: random aim / whim shops → should lose almost always
    /// - `hitPegs`: aims for pegs + basic heal/upgrade, ignores Temper → clears Normal
    /// - `metaAware`: peg skill + Temper / map / shop → needed to clear Hard
    enum PlayerType: String, CaseIterable, Sendable {
        case uninterested
        case hitPegs
        case metaAware

        var title: String {
            switch self {
            case .uninterested: return "Uninterested"
            case .hitPegs: return "Hit the pegs"
            case .metaAware: return "Meta-aware"
            }
        }

        var blurb: String {
            switch self {
            case .uninterested:
                return "Wild aim, whim map/shop, ignores pegs and Temper — expected loss."
            case .hitPegs:
                return "Aims for pegs; heals/upgrades; does not pick Strong Temper or rest smart."
            case .metaAware:
                return "Peg aim plus Temper matchups, rest when hurt, Temper-aware shop buys."
            }
        }

        /// Launch aim offsets sampled each fight shot (tighter = more peg hits).
        var aimSpread: ClosedRange<CGFloat> {
            switch self {
            case .uninterested: return -1.15...1.15
            case .hitPegs: return -0.38...0.38
            case .metaAware: return -0.34...0.34
            }
        }

        /// Chance to fire a Strong-Temper marble when one is in the bag.
        var temperStrongPickRate: Double {
            switch self {
            case .uninterested: return 0.0
            case .hitPegs: return 0.05
            case .metaAware: return 0.95
            }
        }

        /// Continuum outbound damage after aim (wild aim alone still lucks pegs).
        var continuumDamageScale: Double {
            switch self {
            case .uninterested: return 0.26
            case .hitPegs: return 1.45
            case .metaAware: return 1.35
            }
        }

        /// Whether bag power can salvage a lost continuum fight.
        var allowsPowerSalvage: Bool {
            switch self {
            case .uninterested: return false
            case .hitPegs, .metaAware: return true
            }
        }
    }

    /// Campaign difficulty for Monte Carlo + future live modes.
    /// Normal: peg skill carries. Hard: Soft Temper and bites punish ignoring meta.
    enum CampaignDifficulty: String, CaseIterable, Sendable {
        case normal
        case hard

        var title: String {
            switch self {
            case .normal: return "Normal"
            case .hard: return "Hard"
            }
        }

        /// Rescale live Temper factors for this difficulty × player skill band.
        /// Hard Soft wrecks ignore-meta play; meta-aware gets Strong rewards and a milder Soft while building the bag.
        func temperFactor(_ live: Double, player: PlayerType) -> Double {
            switch self {
            case .normal:
                // Soft barely hurts — “hit the pegs” is enough.
                if live < 0.99 { return 0.97 }
                if live > 1.01 { return 1.08 }
                return 1.0
            case .hard:
                switch player {
                case .metaAware:
                    if live > 1.01 { return 2.10 }
                    if live < 0.99 { return 0.85 }
                    return 1.0
                case .hitPegs, .uninterested:
                    if live > 1.01 { return 1.05 }
                    if live < 0.99 { return 0.22 }
                    return 0.92
                }
            }
        }

        /// Multiplier on foe bite damage after each shot (early Hard is gentler).
        func biteScale(fightsCleared: Int, player: PlayerType) -> Double {
            switch self {
            case .normal:
                return 0.60
            case .hard:
                switch player {
                case .metaAware:
                    // Meta who covers Temper is not chewed apart by raw bite.
                    return 0.68
                case .hitPegs, .uninterested:
                    return fightsCleared < 2 ? 1.12 : 1.48
                }
            }
        }

        /// Player outbound damage scale (higher = easier). Snowballs a little so summit isn't a soft-lock.
        func playerDamageScale(fightsCleared: Int, player: PlayerType) -> Double {
            let ramp = 0.055 * Double(min(8, fightsCleared))
            switch self {
            case .normal:
                return 1.62 + ramp
            case .hard:
                // Peg skill alone is taxed; Temper/meta play is rewarded.
                switch player {
                case .metaAware:
                    // Late-climb bonus so summit isn't a Soft soft-lock after good Temper play.
                    let late = fightsCleared >= 5 ? 0.55 : 0
                    return 2.45 + ramp + late
                case .hitPegs: return 0.62 + ramp * 0.25
                case .uninterested: return 0.52 + ramp * 0.2
                }
            }
        }

        /// Fraction of simulated fight damage that drains run HP after a win.
        var hpDrainFraction: Double {
            switch self {
            case .normal: return 0.12
            case .hard: return 0.18
            }
        }

        /// Chance the bag power multiplier salvages a lost continuum fight.
        var powerSalvageChanceScale: Double {
            switch self {
            case .normal: return 1.55
            case .hard: return 1.35
            }
        }
    }

    /// Which chart the protocol Monte Carlo walks.
    enum MapMode: String, CaseIterable, Sendable {
        /// Live kid chart (mostly linear).
        case production
        /// Branched audit map so map decisions have teeth.
        case protocolAudit
    }

    enum ShopPolicy: String, CaseIterable, Sendable {
        case greedySustain
        case banker
        case spender
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
        var meanTemperFactor: Double
        var log: MarbleVoyagePlayTelemetry.RunLog?
    }

    struct PlayerTypeReport: Equatable, Sendable {
        var player: PlayerType
        var trials: Int
        var clearRate: Double
        var meanFightsCleared: Double
        var meanHPLeftWhenWon: Double
        var meanCoins: Double
        var meanBallLevel: Double
        var meanCharms: Double
        var meanMarbleLevel: Double
        var meanTemperFactor: Double
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

    // MARK: - Public API

    static func playCampaign(
        seed: UInt64,
        player: PlayerType,
        mapMode: MapMode = .protocolAudit,
        difficulty: CampaignDifficulty = .normal,
        damageScale: Double = 1.0
    ) -> TrialResult {
        playInstrumented(
            seed: seed,
            player: player,
            mapMode: mapMode,
            difficulty: difficulty,
            damageScale: damageScale
        )
    }

    static func playCampaign(
        seed: UInt64,
        policy: ShopPolicy,
        damageScale: Double = 1.0
    ) -> TrialResult {
        playLegacy(seed: seed, policy: policy, damageScale: damageScale)
    }

    /// Full protocol Monte Carlo → aggregate means + smell / exploit rates.
    static func runProtocolAudit(
        trialsPerPlayer: Int = 48,
        seed: UInt64 = 11,
        mapMode: MapMode = .protocolAudit,
        difficulty: CampaignDifficulty = .normal,
        writeEvidence: Bool = true
    ) -> MarbleVoyagePlayTelemetry.ProtocolReport {
        var byPlayer: [PlayerType: [MarbleVoyagePlayTelemetry.RunLog]] = [:]
        for (pIndex, player) in PlayerType.allCases.enumerated() {
            var logs: [MarbleVoyagePlayTelemetry.RunLog] = []
            for i in 0..<trialsPerPlayer {
                let trial = playCampaign(
                    seed: seed &+ UInt64(i) &* 1_009 &+ UInt64(pIndex) &* 50_021,
                    player: player,
                    mapMode: mapMode,
                    difficulty: difficulty
                )
                if let log = trial.log {
                    logs.append(log)
                }
            }
            byPlayer[player] = logs
        }
        let report = MarbleVoyagePlayTelemetry.report(
            byPlayer: byPlayer,
            baseSeed: seed,
            mapMode: mapMode.rawValue + "/" + difficulty.rawValue
        )
        if writeEvidence {
            _ = try? MarbleVoyagePlayTelemetry.writeEvidence(report)
        }
        return report
    }

    /// Skill-ladder matrix: each player × Normal/Hard on the production chart.
    static func skillLadderMatrix(
        trials: Int = 48,
        seed: UInt64 = 31,
        mapMode: MapMode = .production
    ) -> [(difficulty: CampaignDifficulty, player: PlayerType, report: PlayerTypeReport)] {
        var rows: [(CampaignDifficulty, PlayerType, PlayerTypeReport)] = []
        for difficulty in CampaignDifficulty.allCases {
            for player in PlayerType.allCases {
                rows.append(
                    (
                        difficulty,
                        player,
                        report(
                            player: player,
                            trials: trials,
                            seed: seed,
                            mapMode: mapMode,
                            difficulty: difficulty
                        )
                    )
                )
            }
        }
        return rows
    }

    static func report(
        player: PlayerType,
        trials: Int = 80,
        seed: UInt64 = 42,
        mapMode: MapMode = .protocolAudit,
        difficulty: CampaignDifficulty = .normal
    ) -> PlayerTypeReport {
        var wins = 0
        var fights = 0.0
        var hpWon = 0.0
        var coins = 0.0
        var ball = 0.0
        var charms = 0.0
        var marbleLv = 0.0
        var temper = 0.0
        var wonCount = 0
        for i in 0..<trials {
            let trial = playCampaign(
                seed: seed &+ UInt64(i) &* 1_009,
                player: player,
                mapMode: mapMode,
                difficulty: difficulty
            )
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
            temper += trial.meanTemperFactor
        }
        let n = Double(trials)
        return PlayerTypeReport(
            player: player,
            trials: trials,
            clearRate: Double(wins) / n,
            meanFightsCleared: fights / n,
            meanHPLeftWhenWon: wonCount > 0 ? hpWon / Double(wonCount) : 0,
            meanCoins: coins / n,
            meanBallLevel: ball / n,
            meanCharms: charms / n,
            meanMarbleLevel: marbleLv / n,
            meanTemperFactor: temper / n
        )
    }

    static func reportAllPlayerTypes(
        trials: Int = 60,
        seed: UInt64 = 7,
        mapMode: MapMode = .protocolAudit,
        difficulty: CampaignDifficulty = .normal
    ) -> [PlayerTypeReport] {
        PlayerType.allCases.map {
            report(player: $0, trials: trials, seed: seed, mapMode: mapMode, difficulty: difficulty)
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

    /// Pick which marble "fires" for Temper / level mult this fight.
    static func pickFightMarble(
        collection: [MarbleVoyageOwnedMarble],
        foeTemper: PlinkTemper,
        strongPickRate: Double,
        rng: inout SeededGenerator
    ) -> MarbleVoyageOwnedMarble {
        guard let first = collection.first else {
            return MarbleVoyageOwnedMarble.make(orbID: OrbKind.plainStarterID)
        }
        let strong = collection.filter {
            $0.orb.temper.matchup(against: foeTemper) == .strong
        }
        if !strong.isEmpty, Double.random(in: 0...1, using: &rng) < strongPickRate {
            return strong.randomElement(using: &rng) ?? first
        }
        return collection.randomElement(using: &rng) ?? first
    }

    // MARK: - Instrumented protocol play

    private static func makeRun(seed: UInt64, mapMode: MapMode) -> MarbleVoyageRun {
        switch mapMode {
        case .production:
            return MarbleVoyageRun.make(mode: .campaign, seed: seed)
        case .protocolAudit:
            return MarbleVoyageRun.makeProtocolCampaign(seed: seed)
        }
    }

    private static func playInstrumented(
        seed: UInt64,
        player: PlayerType,
        mapMode: MapMode,
        difficulty: CampaignDifficulty,
        damageScale: Double
    ) -> TrialResult {
        var run = makeRun(seed: seed, mapMode: mapMode)
        // Hard meta starts Temper-aware: a second Temper in the bag so Strong picks exist before shop 1.
        if difficulty == .hard, player == .metaAware {
            let tempers = Set(run.marbleCollection.map(\.orb.temper))
            if tempers.count < 2,
               let craft = OrbKind.all.first(where: { $0.temper == .craft }) {
                run.marbleCollection.append(MarbleVoyageOwnedMarble.make(orbID: craft.id))
            }
        }
        var rng = SeededGenerator(seed: seed &+ 9_001)
        var mapPicks: [MarbleVoyagePlayTelemetry.MapPick] = []
        var shopVisits: [MarbleVoyagePlayTelemetry.ShopVisit] = []
        var fights: [MarbleVoyagePlayTelemetry.FightSample] = []
        var temperSum = 0.0
        var temperSamples = 0
        var heals = 0
        var upgrades = 0
        var marbles = 0
        var charms = 0
        var shops = 0
        var steps = 0
        let maxSteps = 200
        while steps < maxSteps {
            steps += 1
            switch run.phase {
            case .victory, .defeat:
                return finishLog(
                    run: run,
                    won: run.phase == .victory,
                    player: player,
                    mapMode: mapMode,
                    seed: seed,
                    mapPicks: mapPicks,
                    shopVisits: shopVisits,
                    fights: fights,
                    temperSum: temperSum,
                    temperSamples: temperSamples,
                    heals: heals,
                    upgrades: upgrades,
                    marbles: marbles,
                    charms: charms,
                    shops: shops
                )

            case .map:
                let choices = run.reachableChoices()
                guard !choices.isEmpty else {
                    return finishLog(
                        run: run, won: false, player: player, mapMode: mapMode, seed: seed,
                        mapPicks: mapPicks, shopVisits: shopVisits, fights: fights,
                        temperSum: temperSum, temperSamples: temperSamples,
                        heals: heals, upgrades: upgrades, marbles: marbles, charms: charms, shops: shops
                    )
                }
                let fromID = run.currentNodeID
                let decision = MarbleVoyagePlayerProtocol.chooseMapNode(
                    player: player,
                    choices: choices,
                    run: run,
                    rng: &rng
                )
                let hpFrac = Double(run.playerHP) / Double(max(1, run.playerMaxHP))
                mapPicks.append(
                    .init(
                        fromID: fromID,
                        chosenID: decision.node.id,
                        chosenKind: decision.node.kind.rawValue,
                        choiceCount: choices.count,
                        forced: decision.forced,
                        reason: decision.reason,
                        hpFrac: hpFrac,
                        scores: decision.scores
                    )
                )
                run.choose(decision.node.id)

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
                    return finishLog(
                        run: run, won: false, player: player, mapMode: mapMode, seed: seed,
                        mapPicks: mapPicks, shopVisits: shopVisits, fights: fights,
                        temperSum: temperSum, temperSamples: temperSamples,
                        heals: heals, upgrades: upgrades, marbles: marbles, charms: charms, shops: shops
                    )
                }
                let role = node.gangRole ?? .henchman
                let wave = node.waveAttacker ?? .porcupineBoxer
                let foeTemper = wave.temper
                let marble = pickFightMarble(
                    collection: run.marbleCollection,
                    foeTemper: foeTemper,
                    strongPickRate: player.temperStrongPickRate,
                    rng: &rng
                )
                let liveTemper = marble.orb.temper.damageFactor(against: foeTemper)
                let temperFactor = difficulty.temperFactor(liveTemper, player: player)
                temperSum += temperFactor
                temperSamples += 1
                let effDamage =
                    damageScale
                    * difficulty.playerDamageScale(fightsCleared: run.fightsCleared, player: player)
                    * player.continuumDamageScale
                // Apply difficulty Temper via explicit factor (not live Soft/Strong).
                let shotMult = MarbleVoyageMarbleRules.shotDamageMultiplier(
                    marble: marble,
                    ballLevel: run.ballLevel,
                    foeTemper: nil
                ) * temperFactor * effDamage
                let board = PeglinBattleRules.boardID(forAttacker: wave, role: role)
                let clearedBefore = run.fightsCleared

                var fight = PlinkBattleBalance.simulateFight(
                    role: role,
                    wave: wave,
                    focus: wave,
                    playerMaxHP: run.playerMaxHP,
                    boardID: board,
                    seed: seed &+ UInt64(run.fightsCleared) &* 97 &+ UInt64(rng.next() % 9_973),
                    aimSpread: player.aimSpread,
                    shotDamageMultiplier: shotMult,
                    biteScale: difficulty.biteScale(fightsCleared: run.fightsCleared, player: player)
                )

                let power = run.fightDamageMultiplier * effDamage
                if player.allowsPowerSalvage, power > 1.02 {
                    let salvage =
                        min(0.72, (power - 1) * 0.85 * difficulty.powerSalvageChanceScale)
                    if !fight.won, Double.random(in: 0...1, using: &rng) < salvage {
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
                let drained = Int(
                    (Double(max(0, fight.damageTaken)) * difficulty.hpDrainFraction).rounded()
                )
                let remaining = fight.won
                    ? max(1, min(run.playerMaxHP, run.playerHP - drained))
                    : 0
                fights.append(
                    .init(
                        nodeID: node.id,
                        role: role.rawValue,
                        foe: wave.rawValue,
                        won: fight.won,
                        rounds: fight.rounds,
                        fightsClearedBefore: clearedBefore,
                        temperFactor: temperFactor,
                        meanShotDuration: fight.meanShotDuration,
                        maxShotDuration: fight.maxShotDuration,
                        meanPegHits: fight.meanPegHits,
                        zeroHitShots: fight.zeroHitShots,
                        longHangFewPegShots: fight.longHangFewPegShots,
                        damageDealt: fight.damageDealt,
                        damageTaken: fight.damageTaken,
                        hpAfter: remaining,
                        goldEarned: gold
                    )
                )
                run.finishFight(won: fight.won, remainingHP: remaining, goldEarned: gold)

            case .shop(let afterID):
                shops += 1
                let visit = applyProtocolShop(
                    &run,
                    player: player,
                    afterNodeID: afterID,
                    rng: &rng
                )
                if visit.healed { heals += 1 }
                if visit.upgraded { upgrades += 1 }
                if visit.boughtMarble { marbles += 1 }
                if visit.boughtCharm { charms += 1 }
                shopVisits.append(visit)
            }
        }

        return finishLog(
            run: run, won: false, player: player, mapMode: mapMode, seed: seed,
            mapPicks: mapPicks, shopVisits: shopVisits, fights: fights,
            temperSum: temperSum, temperSamples: temperSamples,
            heals: heals, upgrades: upgrades, marbles: marbles, charms: charms, shops: shops
        )
    }

    private static func applyProtocolShop(
        _ run: inout MarbleVoyageRun,
        player: PlayerType,
        afterNodeID: String,
        rng: inout SeededGenerator
    ) -> MarbleVoyagePlayTelemetry.ShopVisit {
        var actions: [MarbleVoyagePlayTelemetry.ShopAction] = []
        let coinsStart = run.coins
        var healed = false
        var upgraded = false
        var boughtMarble = false
        var boughtCharm = false

        for _ in 0..<14 {
            let hpFrac = Double(run.playerHP) / Double(max(1, run.playerMaxHP))
            let coinsBefore = run.coins
            let pick = MarbleVoyagePlayerProtocol.chooseShopAction(
                player: player,
                run: run,
                rng: &rng
            )
            if pick.intent == .leave {
                actions.append(
                    .init(
                        sku: "leave",
                        ok: true,
                        reason: pick.reason,
                        coinsBefore: coinsBefore,
                        hpFracBefore: hpFrac
                    )
                )
                break
            }
            let result = run.applyShop(pick.action)
            let ok: Bool
            switch result {
            case .ok: ok = true
            case .left: ok = true
            default: ok = false
            }
            let sku: String
            switch pick.action {
            case .heal: sku = "heal"; if ok { healed = true }
            case .ballUpgrade: sku = "ballUpgrade"; if ok { upgraded = true }
            case .buyMarble(let id): sku = "buyMarble.\(id)"; if ok { boughtMarble = true }
            case .buyCharm(let c): sku = "buyCharm.\(c.rawValue)"; if ok { boughtCharm = true }
            case .leave: sku = "leave"
            case .destroyMarble: sku = "destroyMarble"
            }
            actions.append(
                .init(
                    sku: sku,
                    ok: ok,
                    reason: pick.reason,
                    coinsBefore: coinsBefore,
                    hpFracBefore: hpFrac
                )
            )
            if case .leave = pick.action { break }
            if !ok, pick.intent != .leave {
                // Failed spend — try again with fresh weights (affordability zeros out).
                continue
            }
        }
        _ = run.applyShop(.leave)
        return .init(
            afterNodeID: afterNodeID,
            actions: actions,
            coinsSpent: max(0, coinsStart - run.coins),
            healed: healed,
            upgraded: upgraded,
            boughtMarble: boughtMarble,
            boughtCharm: boughtCharm
        )
    }

    private static func finishLog(
        run: MarbleVoyageRun,
        won: Bool,
        player: PlayerType,
        mapMode: MapMode,
        seed: UInt64,
        mapPicks: [MarbleVoyagePlayTelemetry.MapPick],
        shopVisits: [MarbleVoyagePlayTelemetry.ShopVisit],
        fights: [MarbleVoyagePlayTelemetry.FightSample],
        temperSum: Double,
        temperSamples: Int,
        heals: Int,
        upgrades: Int,
        marbles: Int,
        charms: Int,
        shops: Int
    ) -> TrialResult {
        let levels = run.marbleCollection.map { Double($0.clampedLevel) }
        let meanLv = levels.isEmpty ? 1 : levels.reduce(0, +) / Double(levels.count)
        let charmStacks = run.charmStacks.values.reduce(0, +)
        let meanTemper = temperSamples > 0 ? temperSum / Double(temperSamples) : 1.0

        // Prefer visit flags for purchase counts (more accurate than SKU parse).
        let healsBought = shopVisits.filter(\.healed).count
        let upgradesBought = max(upgrades, shopVisits.filter(\.upgraded).count)
        let marblesBought = max(marbles, shopVisits.filter(\.boughtMarble).count)
        let charmsBought = max(charms, shopVisits.filter(\.boughtCharm).count)

        var log = MarbleVoyagePlayTelemetry.RunLog(
            schemaVersion: MarbleVoyagePlayTelemetry.schemaVersion,
            seed: seed,
            player: player.rawValue,
            mapMode: mapMode.rawValue,
            won: won,
            fightsCleared: run.fightsCleared,
            campaignTotalFights: MarbleVoyageRun.campaignTotalFights,
            playerHPLeft: run.playerHP,
            coins: run.coins,
            ballLevel: run.ballLevel,
            charmCount: charmStacks,
            marbleMeanLevel: meanLv,
            meanTemperFactor: meanTemper,
            shopsVisited: shops,
            healsBought: healsBought,
            upgradesBought: upgradesBought,
            marblesBought: marblesBought,
            charmsBought: charmsBought,
            mapPicks: mapPicks,
            shopVisits: shopVisits,
            fights: fights,
            smells: [],
            exploitFlags: []
        )
        let detected = MarbleVoyagePlayTelemetry.detectSmells(log: log)
        log.smells = detected.smells.map(\.rawValue)
        log.exploitFlags = detected.exploits.map(\.rawValue)

        return TrialResult(
            won: won,
            fightsCleared: run.fightsCleared,
            playerHPLeft: run.playerHP,
            coins: run.coins,
            ballLevel: run.ballLevel,
            charmCount: charmStacks,
            marbleMeanLevel: meanLv,
            shopsVisited: shops,
            meanTemperFactor: meanTemper,
            log: log
        )
    }

    // MARK: - Legacy shop-policy play (production linear map)

    private static func playLegacy(
        seed: UInt64,
        policy: ShopPolicy,
        damageScale: Double
    ) -> TrialResult {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: seed)
        var rng = SeededGenerator(seed: seed &+ 9_001)
        var shops = 0
        var temperSum = 0.0
        var temperSamples = 0
        var steps = 0

        while steps < 200 {
            steps += 1
            switch run.phase {
            case .victory:
                return summarizeLegacy(run, won: true, shops: shops, temperSum: temperSum, temperSamples: temperSamples)
            case .defeat:
                return summarizeLegacy(run, won: false, shops: shops, temperSum: temperSum, temperSamples: temperSamples)
            case .map:
                let choices = run.reachableChoices()
                guard let next = choices.randomElement(using: &rng) ?? choices.first else {
                    return summarizeLegacy(run, won: false, shops: shops, temperSum: temperSum, temperSamples: temperSamples)
                }
                run.choose(next.id)
            case .fight(let nodeID), .event(let nodeID):
                if case .event = run.phase {
                    let nodeSalt = UInt64(bitPattern: Int64(nodeID.hashValue))
                    var local = SeededGenerator(seed: seed &+ nodeSalt &* 13)
                    let outcome = MarbleVoyageEvents.resolve(
                        kind: run.node(nodeID)?.kind ?? .mystery,
                        title: run.node(nodeID)?.title ?? "Event",
                        rng: &local
                    )
                    run.applyEvent(outcome)
                    continue
                }
                guard let node = run.node(nodeID) else {
                    return summarizeLegacy(run, won: false, shops: shops, temperSum: temperSum, temperSamples: temperSamples)
                }
                let role = node.gangRole ?? .henchman
                let wave = node.waveAttacker ?? .porcupineBoxer
                temperSum += 1
                temperSamples += 1
                var fight = PlinkBattleBalance.simulateFight(
                    role: role,
                    wave: wave,
                    focus: wave,
                    playerMaxHP: run.playerMaxHP,
                    seed: seed &+ UInt64(run.fightsCleared) &* 97,
                    shotDamageMultiplier: run.fightDamageMultiplier * damageScale
                )
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
        return summarizeLegacy(run, won: false, shops: shops, temperSum: temperSum, temperSamples: temperSamples)
    }

    private static func summarizeLegacy(
        _ run: MarbleVoyageRun,
        won: Bool,
        shops: Int,
        temperSum: Double,
        temperSamples: Int
    ) -> TrialResult {
        let levels = run.marbleCollection.map { Double($0.clampedLevel) }
        let meanLv = levels.isEmpty ? 1 : levels.reduce(0, +) / Double(levels.count)
        return TrialResult(
            won: won,
            fightsCleared: run.fightsCleared,
            playerHPLeft: run.playerHP,
            coins: run.coins,
            ballLevel: run.ballLevel,
            charmCount: run.charmStacks.values.reduce(0, +),
            marbleMeanLevel: meanLv,
            shopsVisited: shops,
            meanTemperFactor: temperSamples > 0 ? temperSum / Double(temperSamples) : 1.0,
            log: nil
        )
    }

    private static func estimateFightGold(
        run: MarbleVoyageRun,
        rng: inout SeededGenerator
    ) -> Int {
        let hits = Int.random(in: 3...8, using: &rng)
        let goldHits = max(1, Int((Double(hits) * run.economy.goldPegPrevalence).rounded()))
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
                if let charm = MarbleVoyagePlayerProtocol.cheapestAffordableCharm(run),
                   case .ok = run.applyShop(.buyCharm(charm)) {
                    continue
                }
                if hpFrac < 0.90, case .ok = run.applyShop(.heal) { continue }
                break
            }
        case .banker:
            let hpFrac = Double(run.playerHP) / Double(max(1, run.playerMaxHP))
            if hpFrac < 0.55 { _ = run.applyShop(.heal) }
        case .spender:
            for _ in 0..<14 {
                var acted = false
                if case .ok = run.applyShop(.heal) { acted = true }
                if case .ok = run.applyShop(.ballUpgrade) { acted = true }
                if let charm = MarbleVoyagePlayerProtocol.cheapestAffordableCharm(run),
                   case .ok = run.applyShop(.buyCharm(charm)) {
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
                default: break
                }
            }
        }
    }
}
