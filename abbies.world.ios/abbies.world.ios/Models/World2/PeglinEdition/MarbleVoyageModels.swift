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
    var enemyKind: PeglinEnemyKind?
    /// 1…N — scales foe HP / pressure.
    var threat: Int
    /// Campaign spirit-fight index 1…3 (0 = non-fight / boss column).
    var stage: Int

    init(
        id: String,
        kind: MarbleVoyageNodeKind,
        column: Int,
        row: Int,
        title: String,
        enemyKind: PeglinEnemyKind? = nil,
        threat: Int = 0,
        stage: Int = 0
    ) {
        self.id = id
        self.kind = kind
        self.column = column
        self.row = row
        self.title = title
        self.enemyKind = enemyKind
        self.threat = threat
        self.stage = stage
    }
}

struct MarbleVoyageEdge: Equatable, Sendable {
    let from: String
    let to: String
}

enum MarbleVoyagePhase: Equatable, Sendable {
    case map
    case fight(nodeID: String)
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

    static let defaultMaxHP = 120
    /// Regular spirit fights before the Bizarro Abbie boss (not counting the boss).
    static let campaignFightStages = 3

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

    mutating func finishFight(won: Bool, remainingHP: Int) {
        playerHP = max(0, min(playerMaxHP, remainingHP))
        if !won || playerHP <= 0 {
            playerHP = 0
            phase = .defeat
            lastEventLine = defeatCopy()
            persistEndlessBestIfNeeded()
            return
        }
        fightsCleared += 1
        if currentNode?.kind == .boss {
            phase = .victory
            lastEventLine = mode == .campaign
                ? "Bizarro Abbie is free — the climb is yours!"
                : "Boss cage broken — keep climbing?"
            persistEndlessBestIfNeeded()
            if mode == .endless {
                // Endless treats a boss clear as a checkpoint, then extends the chart.
                phase = .map
                lastEventLine = "Wave \(fightsCleared) clear · HP \(playerHP). The grid grows…"
                appendEndlessFrontier()
            }
            return
        }
        phase = .map
        lastEventLine = "Won with \(playerHP)/\(playerMaxHP) HP. Heal only from blessings."
        if mode == .endless {
            appendEndlessFrontier()
        }
    }

    mutating func applyEvent(_ outcome: MarbleVoyageEventOutcome) {
        playerHP = max(0, min(playerMaxHP, playerHP + outcome.hpDelta))
        lastEventLine = outcome.message
        if playerHP <= 0 {
            phase = .defeat
            persistEndlessBestIfNeeded()
            return
        }
        phase = .map
        if mode == .endless {
            appendEndlessFrontier()
        }
    }

    func enemyMaxHP(for node: MarbleVoyageNode) -> Int {
        switch node.kind {
        case .boss:
            return 220 + node.threat * 40
        case .fight:
            return 55 + node.threat * 32 + (mode == .endless ? fightsCleared * 8 : 0)
        default:
            return 100
        }
    }

    /// Foe bite per round — climbs in endless / late campaign.
    func enemyAttack(for node: MarbleVoyageNode) -> Int {
        let base = 14 + node.threat * 2 + (node.kind == .boss ? 10 : 0)
        if mode == .endless {
            return min(42, base + fightsCleared / 2)
        }
        return min(36, base)
    }

    private func defeatCopy() -> String {
        switch mode {
        case .campaign:
            return "Campaign ends at stage \(max(1, fightsCleared)). HP only returns with a blessing."
        case .endless:
            return "Endless run over — cleared \(fightsCleared) fights. Best \(max(endlessBest, fightsCleared))."
        }
    }

    private mutating func persistEndlessBestIfNeeded() {
        guard mode == .endless else { return }
        let best = max(endlessBest, fightsCleared)
        endlessBest = best
        UserDefaults.standard.set(best, forKey: Self.endlessBestKey)
    }

    static let endlessBestKey = "marbleVoyage.endlessBest"

    static func storedEndlessBest() -> Int {
        UserDefaults.standard.integer(forKey: endlessBestKey)
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

    /// Short voyage: fight → blessing → fight → blessing → mix → Bizarro Abbie.
    static func makeCampaign(seed: UInt64) -> MarbleVoyageRun {
        var rng = SeededGenerator(seed: seed)
        var nodes: [MarbleVoyageNode] = [
            .init(id: "start", kind: .start, column: 0, row: 1, title: "Sky Dock", threat: 0, stage: 0)
        ]
        var edges: [MarbleVoyageEdge] = []
        var previousIDs = ["start"]
        var column = 1

        func link(_ toIDs: [String]) {
            for from in previousIDs {
                for to in toIDs {
                    edges.append(.init(from: from, to: to))
                }
            }
            previousIDs = toIDs
        }

        // Fight 1 → event → Fight 2 → event
        for stage in 1...2 {
            let left = "s\(stage)a"
            let right = "s\(stage)b"
            nodes.append(
                .init(
                    id: left,
                    kind: .fight,
                    column: column,
                    row: 0,
                    title: campaignFightTitle(stage: stage, branch: 0, rng: &rng),
                    enemyKind: enemyForStage(stage, branch: 0),
                    threat: stage + 1,
                    stage: stage
                )
            )
            nodes.append(
                .init(
                    id: right,
                    kind: .fight,
                    column: column,
                    row: 2,
                    title: campaignFightTitle(stage: stage, branch: 1, rng: &rng),
                    enemyKind: enemyForStage(stage, branch: 1),
                    threat: stage + 1,
                    stage: stage
                )
            )
            link([left, right])
            column += 1

            let eventIDs = appendEventColumn(into: &nodes, column: column, stage: stage, rng: &rng)
            link(eventIDs)
            column += 1
        }

        // Mixed column: fight / treasure / question
        let mixFight = "s3fight"
        let mixTreasure = "s3treasure"
        let mixMystery = "s3mystery"
        nodes.append(
            .init(
                id: mixFight,
                kind: .fight,
                column: column,
                row: 0,
                title: campaignFightTitle(stage: 3, branch: 0, rng: &rng),
                enemyKind: enemyForStage(3, branch: 0),
                threat: 4,
                stage: 3
            )
        )
        nodes.append(
            .init(
                id: mixTreasure,
                kind: .treasure,
                column: column,
                row: 1,
                title: eventTitle(.treasure, stage: 3, rng: &rng),
                threat: 0,
                stage: 0
            )
        )
        nodes.append(
            .init(
                id: mixMystery,
                kind: .mystery,
                column: column,
                row: 2,
                title: eventTitle(.mystery, stage: 3, rng: &rng),
                threat: 0,
                stage: 0
            )
        )
        link([mixFight, mixTreasure, mixMystery])
        column += 1

        // Boss — Bizarro Abbie
        let bossID = "boss"
        nodes.append(
            .init(
                id: bossID,
                kind: .boss,
                column: column,
                row: 1,
                title: "Bizarro Abbie",
                enemyKind: .bizarroAbbie,
                threat: 7,
                stage: 4
            )
        )
        link([bossID])

        return MarbleVoyageRun(
            mode: .campaign,
            nodes: nodes,
            edges: edges,
            currentNodeID: "start",
            visited: ["start"],
            pathTaken: [],
            playerHP: defaultMaxHP,
            playerMaxHP: defaultMaxHP,
            phase: .map,
            lastEventLine: "Tap a glowing landing above. Climb to free them!",
            seed: seed,
            fightsCleared: 0,
            endlessBest: storedEndlessBest()
        )
    }

    static func makeEndless(seed: UInt64) -> MarbleVoyageRun {
        var run = MarbleVoyageRun(
            mode: .endless,
            nodes: [
                .init(id: "start", kind: .start, column: 0, row: 1, title: "Sky Dock", threat: 0, stage: 0)
            ],
            edges: [],
            currentNodeID: "start",
            visited: ["start"],
            pathTaken: [],
            playerHP: defaultMaxHP,
            playerMaxHP: defaultMaxHP,
            phase: .map,
            lastEventLine: "Endless voyage — the grid grows as you clear fights. Best \(storedEndlessBest()).",
            seed: seed,
            fightsCleared: 0,
            endlessBest: storedEndlessBest()
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
            let id = "e\(wave)_boss"
            nodes.append(
                .init(
                    id: id,
                    kind: .boss,
                    column: nextColumn,
                    row: 1,
                    title: "Wave \(wave) Sovereign",
                    enemyKind: .stagSpirit,
                    threat: 6 + wave / 2,
                    stage: wave
                )
            )
            newIDs = [id]
        } else if isEventColumn {
            newIDs = Self.appendEventColumn(into: &nodes, column: nextColumn, stage: wave, rng: &rng)
        } else {
            let left = "e\(wave)a"
            let right = "e\(wave)b"
            let threat = max(1, 1 + wave / 2)
            nodes.append(
                .init(
                    id: left,
                    kind: .fight,
                    column: nextColumn,
                    row: 0,
                    title: "Wave \(wave) · Port",
                    enemyKind: Self.enemyForStage(wave, branch: 0),
                    threat: threat,
                    stage: wave
                )
            )
            nodes.append(
                .init(
                    id: right,
                    kind: .fight,
                    column: nextColumn,
                    row: 2,
                    title: "Wave \(wave) · Starboard",
                    enemyKind: Self.enemyForStage(wave, branch: 1),
                    threat: threat,
                    stage: wave
                )
            )
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

    private static func campaignFightTitle(stage: Int, branch: Int, rng: inout SeededGenerator) -> String {
        let left = ["Clover", "Lantern", "Ridge", "Moss", "Ember", "Pearl"]
        let right = ["Skirmish", "Duel", "Ambush", "Trial", "Clash", "Hunt"]
        let a = left[(stage + branch) % left.count]
        let b = right[Int.random(in: 0..<right.count, using: &rng)]
        return "\(a) \(b)"
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
                title: eventTitle(top, stage: stage, rng: &rng),
                threat: 0,
                stage: 0
            )
        )
        nodes.append(
            .init(
                id: idB,
                kind: bottom,
                column: column,
                row: 2,
                title: eventTitle(bottom, stage: stage, rng: &rng),
                threat: 0,
                stage: 0
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
