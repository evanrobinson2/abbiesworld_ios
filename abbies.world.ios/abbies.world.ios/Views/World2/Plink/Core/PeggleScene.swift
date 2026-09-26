import SpriteKit
import UIKit

/// Abbie Plink: Peglin-inspired physics + Peggle clear-oranges loop.
/// Deck injects orbs into a shared continuum (laser ≡ live ball).
final class PeggleScene: SKScene, SKPhysicsContactDelegate {
    enum Phase: Equatable {
        case aim
        case flying
        case settling
        case won
        case lost
    }

    struct HudSnapshot {
        var levelName: String
        var status: String
        var ballsLeft: Int
        var orangeLeft: Int
        var plink: Int
        var shotScore: Int
        var enemyHP: Int
        var enemyMaxHP: Int
        var playerHP: Int
        var playerMaxHP: Int
        var critActive: Bool
        var orbName: String
        var phase: Phase
        var showBanner: Bool
        var bannerTitle: String
        var bannerBody: String
        var canAdvance: Bool
    }

    /// When true: win by reducing enemyHP; lose on 0 balls or 0 player HP.
    var spiritBattleMode = true
    var enemyMaxHP = 36
    var playerMaxHP = 30
    /// Damage the foe deals back after a scoring shot (0 = no counter).
    var enemyCounterDamage = 16
    private(set) var enemyHP = 36
    private(set) var playerHP = 30

    /// Optional land plate (same as the World 2 scene background).
    var sceneBackdropImage: UIImage?

    /// Ordered orb ids for the current run (length = balls). Empty → default sparkle.
    var deckOrbIDs: [String] = []
    private var deckCursor = 0

    var onHud: ((HudSnapshot) -> Void)?
    var onDamageDealt: ((Int) -> Void)?
    var onPlayerHurt: ((Int) -> Void)?
    /// One callback per finished drop — damage + cool specials for the right-side tally.
    var onRoundResolved: ((ShotRoundSummary) -> Void)?

    struct ShotRoundSummary {
        var damageToEnemy: Int
        var damageToPlayer: Int
        var highlights: [String]
    }

    private enum Category {
        static let ball: UInt32 = 1 << 0
        static let peg: UInt32 = 1 << 1
        static let wall: UInt32 = 1 << 2
        static let floor: UInt32 = 1 << 3
    }

    private var levelIndex = 0
    private var levels: [BoardLevel] = BoardLevel.catalog
    private var pegs: [PegNode] = []
    private var ball: SKNode?
    private var ballVel: CGVector = .zero
    private var ballLastKickAt: TimeInterval = -1
    /// Extra split orbs (same continuum rules as the primary ball).
    private var splitBalls: [(node: SKNode, vel: CGVector, lastKick: TimeInterval, isFire: Bool, done: Bool)] = []
    /// Next / live ball burns through pegs (no bounce).
    private var ballIsFire = false
    private var pendingFire = false
    private var pendingSplit = false
    private var aimGuide: SKNode?
    private var shooter: SKNode?
    private var phase: Phase = .aim
    private var ballsLeft = 10
    private var aimOffset: CGFloat = 0
    private let maxAim: CGFloat = 1.05
    private var aimDragging = false
    private var dragStartX: CGFloat = 0
    private var dragStartAim: CGFloat = 0
    private var settleFrames = 0
    private var shotAge: TimeInterval = 0
    private var lastUpdateTime: TimeInterval = 0
    private var statusText = "Clear the orange pegs"
    private var shotPlink = 0
    private var critActive = false
    private var runPlink = 0
    private var bombSplashing = false
    /// Cool specials this drop (crit / refresh / bomb / …) for the battle feed.
    private var shotHighlights: [String] = []
    /// Spirit mode: hit a refresh peg → rebuild the peg field mid-shot.
    private var pendingBoardRefresh = false

    /// Leave empty sky under the shooter before the first peg (ny 0 maps here).
    private let pegFieldTopClearance: CGFloat = 0.22
    /// Keep a little floor margin so buckets/rails still read.
    private let pegFieldBottomClearance: CGFloat = 0.06

    private(set) var tuning = PhysicsTuning.default
    private var pegRadius: CGFloat = PeggleFeel.pegRadius
    /// Scale orb with the board's peg size so dense caverns stay readable.
    private var ballRadius: CGFloat {
        tuning.ballRadiusCG * (pegRadius / max(1, PeggleFeel.pegRadius))
    }
    private var trailNode: SKNode?
    private var trailPoints: [CGPoint] = []
    private var didBuild = false
    private var wallNodes: [SKNode] = []
    private var continuumRails: [ContinuumRail] = []
    private var continuumPegScratch: [ContinuumPeg] = []
    private var railVisualRoot: SKNode?
    private var bucketVisualRoot: SKNode?

    private struct FlightSample {
        var t: CGFloat
        var pos: CGPoint
        var vel: CGVector
    }

    private let simSpeed: CGFloat = 1.12

    var levelCount: Int { levels.count }
    var currentLevelIndex: Int { levelIndex }

    func applyTuning(_ next: PhysicsTuning) {
        let orbChanged = tuning.orbID != next.orbID
        tuning = next
        physicsWorld.gravity = tuning.gravityVector
        for wall in wallNodes {
            wall.physicsBody?.restitution = 1
        }
        if phase == .aim {
            if orbChanged || shooter != nil {
                refreshShooterLook()
            }
            redrawAim()
        }
        publish()
    }

    func selectOrb(_ orb: OrbKind) {
        var next = tuning
        next.orbID = orb.id
        applyTuning(next)
    }

    /// Configure HP battle + optional deck before `loadLevel`.
    /// `startingPlayerHP` carries voyage HP in (no free heal at fight start).
    func configureSpiritBattle(
        enemyMax: Int,
        playerMax: Int,
        deck: [String],
        counterDamage: Int = PeglinBattleRules.enemyCounterAttack(for: nil),
        startingPlayerHP: Int? = nil
    ) {
        spiritBattleMode = true
        enemyMaxHP = max(1, enemyMax)
        playerMaxHP = max(1, playerMax)
        enemyHP = enemyMaxHP
        if let startingPlayerHP {
            playerHP = max(1, min(playerMaxHP, startingPlayerHP))
        } else {
            playerHP = playerMaxHP
        }
        enemyCounterDamage = max(0, counterDamage)
        deckOrbIDs = deck
        deckCursor = 0
        if let first = deck.first,
           let orb = OrbKind.all.first(where: { $0.id == first }) {
            selectOrb(orb)
        }
    }

    private func advanceDeckOrb() {
        guard !deckOrbIDs.isEmpty else { return }
        let idx = min(deckCursor, deckOrbIDs.count - 1)
        let id = deckOrbIDs[idx]
        if let orb = OrbKind.all.first(where: { $0.id == id }) {
            selectOrb(orb)
        }
    }

    override func didMove(to view: SKView) {
        backgroundColor = .clear
        isPaused = false
        view.isPaused = false
        view.isMultipleTouchEnabled = false
        view.ignoresSiblingOrder = true
        view.allowsTransparency = true
        physicsWorld.gravity = tuning.gravityVector
        physicsWorld.contactDelegate = self
        physicsWorld.speed = simSpeed
        if size.width > 40 { rebuildWorld() }
    }

    override func didChangeSize(_ oldSize: CGSize) {
        guard size.width > 40, size.height > 40 else { return }
        if !didBuild || abs(size.width - oldSize.width) > 2 || abs(size.height - oldSize.height) > 2 {
            if phase == .aim || phase == .won || phase == .lost || !didBuild {
                rebuildWorld()
            }
        }
    }

    func loadLevel(index: Int) {
        levelIndex = max(0, min(index, levels.count - 1))
        if !deckOrbIDs.isEmpty {
            ballsLeft = deckOrbIDs.count
        } else {
            ballsLeft = levels[levelIndex].balls
        }
        deckCursor = 0
        advanceDeckOrb()
        phase = .aim
        aimOffset = 0
        shotPlink = 0
        critActive = false
        runPlink = 0
        enemyHP = enemyMaxHP
        // Spirit / voyage battles keep HP set by `configureSpiritBattle` (no free heal).
        if !spiritBattleMode {
            playerHP = playerMaxHP
        }
        statusText = spiritBattleMode
            ? "Hit pegs · points = HP · bomb = AOE"
            : "Clear every orange · yellow=crit · green=refresh"
        rebuildWorld()
        publish()
    }

    func restartLevel() { loadLevel(index: levelIndex) }

    func nextLevel() {
        loadLevel(index: levelIndex + 1 < levels.count ? levelIndex + 1 : 0)
    }

    // MARK: - World

    private func rebuildWorld() {
        removeAllChildren()
        physicsBody = nil
        pegs.removeAll()
        ball = nil
        aimGuide = nil
        shooter = nil
        settleFrames = 0
        shotAge = 0
        lastUpdateTime = 0
        trailPoints = []
        trailNode = nil
        isPaused = false
        didBuild = true
        wallNodes.removeAll()
        continuumRails = []
        continuumPegScratch = []
        railVisualRoot = nil
        bucketVisualRoot = nil
        shotPlink = 0
        critActive = false

        let w = size.width
        let h = size.height
        guard w > 40, h > 40 else { return }

        let level = levels[levelIndex]
        pegRadius = level.pegRadius * (w / level.referenceWidth)

        physicsWorld.gravity = tuning.gravityVector
        drawBackdrop(w: w, h: h)
        installBounds(w: w, h: h)
        installRailsAndBuckets(level: level, w: w, h: h)

        for (i, spec) in level.pegs.enumerated() {
            let peg = PegNode(
                kind: rolledPegKind(from: spec.kind),
                radius: pegRadius,
                categories: Category.peg
            )
            peg.position = CGPoint(x: spec.nx * w, y: pegSceneY(ny: spec.ny, height: h))
            peg.name = "peg-\(i)"
            peg.zPosition = 5
            addChild(peg)
            pegs.append(peg)
        }

        refreshShooterLook()

        let guide = SKNode()
        guide.zPosition = 15
        addChild(guide)
        aimGuide = guide

        let trail = SKNode()
        trail.zPosition = 25
        addChild(trail)
        trailNode = trail

        if phase != .won && phase != .lost {
            phase = .aim
        }
        redrawAim()
        publish()
    }

    /// Spirit battles: hitting a refresh peg rebuilds the full peg layout (HP / orbs stay).
    private func respawnPegBoard() {
        spawnPegsFromLevel(animated: true)
        PlinkSFX.play(.ui)
        let refreshCount = pegs.filter { $0.kind == .refresh }.count
        statusText = "Board refreshed · \(refreshCount) refresh"
        publish()
    }

    // MARK: - Power-ups

    /// Immediate refresh — rebuild the peg field under the live ball / between shots.
    @discardableResult
    func applyRefreshPowerUp() -> Bool {
        guard spiritBattleMode, phase == .aim || phase == .flying else { return false }
        spawnPegsFromLevel(animated: true)
        PlinkSFX.play(.crit)
        statusText = "POWER · Refresh!"
        publish()
        return true
    }

    /// Fire — live / next ball burns through pegs (no bounce).
    @discardableResult
    func applyFirePowerUp() -> Bool {
        guard spiritBattleMode, phase == .aim || phase == .flying else { return false }
        if phase == .flying {
            ballIsFire = true
            for i in splitBalls.indices where !splitBalls[i].done {
                splitBalls[i].isFire = true
            }
            tintBallsForFire()
            statusText = "POWER · Fire ball!"
        } else {
            pendingFire = true
            statusText = "POWER · Next ball is fire!"
        }
        PlinkSFX.play(.crit)
        publish()
        return true
    }

    /// Split — one flying ball becomes three (or arm next shot).
    @discardableResult
    func applySplitPowerUp() -> Bool {
        guard spiritBattleMode, phase == .aim || phase == .flying else { return false }
        if phase == .flying, ball != nil {
            spawnSplitSiblings()
            statusText = "POWER · Split ×3!"
        } else {
            pendingSplit = true
            statusText = "POWER · Next ball splits!"
        }
        PlinkSFX.play(.hit)
        publish()
        return true
    }

    private func tintBallsForFire() {
        let tint = SKAction.colorize(with: SKColor(red: 1, green: 0.45, blue: 0.1, alpha: 1), colorBlendFactor: 0.65, duration: 0.12)
        ball?.run(tint)
        for entry in splitBalls where !entry.done {
            entry.node.run(tint)
        }
    }

    private func spawnSplitSiblings() {
        guard let primary = ball else { return }
        // Already split this shot.
        guard splitBalls.isEmpty else { return }
        let angles: [CGFloat] = [-0.42, 0.42] // ~±24°
        let speed = max(220, hypot(ballVel.dx, ballVel.dy))
        let baseAngle = atan2(ballVel.dy, ballVel.dx)
        for (i, delta) in angles.enumerated() {
            let a = baseAngle + delta
            let vel = CGVector(dx: cos(a) * speed, dy: sin(a) * speed)
            let node = makeOrbVisual(radius: ballRadius * 0.92)
            node.position = primary.position
            node.zPosition = 30
            node.name = "ball-split-\(i)"
            let body = SKPhysicsBody(circleOfRadius: ballRadius * 0.92)
            body.isDynamic = false
            body.affectedByGravity = false
            body.allowsRotation = false
            body.categoryBitMask = Category.ball
            body.contactTestBitMask = 0
            body.collisionBitMask = 0
            node.physicsBody = body
            addChild(node)
            if ballIsFire {
                node.run(SKAction.colorize(with: SKColor(red: 1, green: 0.45, blue: 0.1, alpha: 1), colorBlendFactor: 0.65, duration: 0.01))
            }
            splitBalls.append((node: node, vel: vel, lastKick: ballLastKickAt, isFire: ballIsFire, done: false))
        }
    }

    private func spawnPegsFromLevel(animated: Bool) {
        for peg in pegs {
            peg.removeFromParent()
        }
        pegs.removeAll()
        let w = size.width
        let h = size.height
        guard w > 40, h > 40 else { return }
        let level = levels[levelIndex]
        pegRadius = level.pegRadius * (w / level.referenceWidth)
        for (i, spec) in level.pegs.enumerated() {
            let peg = PegNode(
                kind: rolledPegKind(from: spec.kind),
                radius: pegRadius,
                categories: Category.peg
            )
            peg.position = CGPoint(x: spec.nx * w, y: pegSceneY(ny: spec.ny, height: h))
            peg.name = "peg-\(i)"
            peg.zPosition = 5
            if animated {
                peg.setScale(0.35)
                peg.alpha = 0
            }
            addChild(peg)
            pegs.append(peg)
            if animated {
                peg.run(.group([
                    .fadeIn(withDuration: 0.18),
                    .scale(to: 1.0, duration: 0.22),
                ]))
            }
        }
    }

    /// Map board ny (0 top → 1 bottom) into scene Y with extra empty air under the shooter.
    private func pegSceneY(ny: CGFloat, height h: CGFloat) -> CGFloat {
        let span = max(0.35, 1 - pegFieldTopClearance - pegFieldBottomClearance)
        let mappedNy = pegFieldTopClearance + max(0, min(1, ny)) * span
        return (1 - mappedNy) * h
    }

    /// Explicit specials stay; blue/orange may roll into refresh.
    private func rolledPegKind(from base: PegKind) -> PegKind {
        switch base {
        case .crit, .bomb, .refresh, .stone:
            return base
        case .blue, .orange:
            if Double.random(in: 0..<1) < PeglinBattleRules.refreshPegChance {
                return .refresh
            }
            return base
        }
    }

    private func installRailsAndBuckets(level: BoardLevel, w: CGFloat, h: CGFloat) {
        continuumRails = level.rails.map { rail in
            ContinuumRail(
                points: rail.points.map { CGPoint(x: $0.x * w, y: (1 - $0.y) * h) },
                halfWidth: rail.halfWidth * w
            )
        }

        let railRoot = SKNode()
        railRoot.zPosition = 2
        railRoot.name = "rails"
        for rail in continuumRails {
            guard rail.points.count >= 2 else { continue }
            let path = CGMutablePath()
            path.move(to: rail.points[0])
            for p in rail.points.dropFirst() { path.addLine(to: p) }
            let stroke = SKShapeNode(path: path)
            stroke.strokeColor = SKColor(red: 0.55, green: 0.60, blue: 0.68, alpha: 0.95)
            stroke.lineWidth = max(4, rail.halfWidth * 2)
            stroke.lineCap = .round
            stroke.lineJoin = .round
            stroke.glowWidth = 1.5
            stroke.fillColor = .clear
            railRoot.addChild(stroke)

            // Segment “ladder” ticks for Peglin track read.
            for i in 0..<(rail.points.count - 1) where i % 2 == 0 {
                let a = rail.points[i]
                let b = rail.points[i + 1]
                let mx = (a.x + b.x) * 0.5
                let my = (a.y + b.y) * 0.5
                let dx = b.x - a.x
                let dy = b.y - a.y
                let len = hypot(dx, dy)
                guard len > 1 else { continue }
                let nx = -dy / len * rail.halfWidth * 1.1
                let ny = dx / len * rail.halfWidth * 1.1
                let tick = CGMutablePath()
                tick.move(to: CGPoint(x: mx - nx, y: my - ny))
                tick.addLine(to: CGPoint(x: mx + nx, y: my + ny))
                let tickNode = SKShapeNode(path: tick)
                tickNode.strokeColor = SKColor(red: 0.85, green: 0.88, blue: 0.92, alpha: 0.55)
                tickNode.lineWidth = 1.5
                railRoot.addChild(tickNode)
            }
        }
        addChild(railRoot)
        railVisualRoot = railRoot
        // Buckets were decorative only and read as broken empty slots — omit until they score.
        bucketVisualRoot = nil
    }

    private func refreshShooterLook() {
        let pos = shooter?.position ?? CGPoint(x: size.width * 0.5, y: size.height * 0.94)
        shooter?.removeFromParent()
        let node = makeOrbVisual(radius: ballRadius)
        node.position = pos
        node.zPosition = 20
        node.isHidden = phase == .flying || phase == .settling
        addChild(node)
        shooter = node
    }

    private func drawBackdrop(w: CGFloat, h: CGFloat) {
        if let image = sceneBackdropImage {
            let texture = SKTexture(image: image)
            texture.filteringMode = .linear
            let imgW = max(1, image.size.width)
            let imgH = max(1, image.size.height)
            let scale = min(w / imgW, h / imgH) // aspect-fit — never stretch the plate
            let drawW = imgW * scale
            let drawH = imgH * scale
            let letterbox = SKSpriteNode(
                color: SKColor(red: 0.04, green: 0.06, blue: 0.10, alpha: 1),
                size: CGSize(width: w, height: h)
            )
            letterbox.position = CGPoint(x: w / 2, y: h / 2)
            letterbox.zPosition = -21
            addChild(letterbox)

            let sky = SKSpriteNode(texture: texture, size: CGSize(width: drawW, height: drawH))
            sky.position = CGPoint(x: w / 2, y: h / 2)
            sky.zPosition = -20
            sky.name = "sceneBackdrop"
            addChild(sky)

            let wash = SKSpriteNode(
                color: SKColor(red: 0.04, green: 0.06, blue: 0.10, alpha: 0.18),
                size: CGSize(width: w, height: h)
            )
            wash.position = CGPoint(x: w / 2, y: h / 2)
            wash.zPosition = -18
            addChild(wash)
        } else {
            let sky = SKSpriteNode(
                color: SKColor(red: 0.04, green: 0.06, blue: 0.12, alpha: 1),
                size: CGSize(width: w, height: h)
            )
            sky.position = CGPoint(x: w / 2, y: h / 2)
            sky.zPosition = -20
            addChild(sky)
        }

        // Playfield frame matches physics walls (full board, small inset).
        let panel = SKShapeNode(
            rectOf: CGSize(width: w * 0.94, height: h * 0.92),
            cornerRadius: 22
        )
        panel.fillColor = SKColor(red: 0.08, green: 0.12, blue: 0.18, alpha: 0.12)
        panel.strokeColor = SKColor(red: 0.55, green: 0.9, blue: 0.7, alpha: 0.7)
        panel.lineWidth = 3
        panel.position = CGPoint(x: w / 2, y: h / 2)
        panel.zPosition = -10
        panel.name = "playfieldFrame"
        addChild(panel)
    }

    private func installBounds(w: CGFloat, h: CGFloat) {
        let left = w * 0.03
        let right = w * 0.97
        let top = h * 0.98
        let bottom = h * 0.04

        func edge(from a: CGPoint, to b: CGPoint, name: String) {
            let node = SKNode()
            node.name = name
            let body = SKPhysicsBody(edgeFrom: a, to: b)
            body.friction = 0
            // Playfield walls never bleed speed.
            body.restitution = 1
            body.categoryBitMask = Category.wall
            body.contactTestBitMask = Category.ball
            body.collisionBitMask = Category.ball
            node.physicsBody = body
            addChild(node)
            wallNodes.append(node)
        }

        edge(from: CGPoint(x: left, y: bottom), to: CGPoint(x: left, y: top), name: "wallL")
        edge(from: CGPoint(x: right, y: bottom), to: CGPoint(x: right, y: top), name: "wallR")
        edge(from: CGPoint(x: left, y: top), to: CGPoint(x: right, y: top), name: "wallT")

        let floor = SKNode()
        floor.name = "killFloor"
        let floorBody = SKPhysicsBody(
            edgeFrom: CGPoint(x: left, y: bottom),
            to: CGPoint(x: right, y: bottom)
        )
        floorBody.categoryBitMask = Category.floor
        floorBody.contactTestBitMask = Category.ball
        floorBody.collisionBitMask = 0
        floor.physicsBody = floorBody
        addChild(floor)
    }

    // MARK: - Aim

    private var shooterPoint: CGPoint {
        shooter?.position ?? CGPoint(x: size.width * 0.5, y: size.height * 0.94)
    }

    private var aimRadians: CGFloat {
        (-.pi / 2) + aimOffset * 1.25
    }

    private func launchState() -> (origin: CGPoint, velocity: CGVector) {
        let dir = CGVector(dx: cos(aimRadians), dy: sin(aimRadians))
        let origin = CGPoint(
            x: shooterPoint.x + dir.dx * (ballRadius + 10),
            y: shooterPoint.y + dir.dy * (ballRadius + 4)
        )
        let force = tuning.fireForceCG
        return (origin, CGVector(dx: dir.dx * force, dy: dir.dy * force))
    }

    private func redrawAim() {
        guard let aimGuide else { return }
        aimGuide.removeAllChildren()
        aimGuide.removeAllActions()
        aimGuide.isHidden = phase != .aim
        // Never leave a prior shot trail on the aim board.
        trailPoints = []
        trailNode?.removeAllChildren()

        // Preview stops at the first peg intersection (classic Peggle feel).
        let points = simulateFreeFlight(stopAtFirstPeg: true).map(\.pos)
        guard points.count > 1 else { return }

        var on = true
        let spacing: CGFloat = 16
        var traveled: CGFloat = 0
        let total = polylineLength(points)
        // 300% longer aim preview trail (was height×2.8).
        let drawBudget: CGFloat = min(total, size.height * 2.8 * 3)
        for i in 1..<points.count {
            let a = points[i - 1]
            let b = points[i]
            let seg = hypot(b.x - a.x, b.y - a.y)
            var t: CGFloat = 0
            while t < seg {
                if traveled > drawBudget { return }
                if on {
                    let u = t / max(seg, 0.001)
                    let p = CGPoint(x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u)
                    let fade = max(0.45, 1.0 - traveled / max(drawBudget, 1) * 0.55)
                    let dash = SKShapeNode(circleOfRadius: 2.8)
                    dash.fillColor = SKColor(white: 1, alpha: fade)
                    dash.strokeColor = .clear
                    dash.glowWidth = 1.2
                    dash.position = p
                    aimGuide.addChild(dash)
                }
                on.toggle()
                t += spacing * 0.5
                traveled += spacing * 0.5
            }
        }
    }

    /// Shared continuum: gravity×scale, damping, walls, rails, Peglin-style restitution + force pegs.
    private func stepFlight(
        pos: inout CGPoint,
        vel: inout CGVector,
        dt: CGFloat,
        t: CGFloat,
        lastKickT: inout CGFloat,
        passThroughPegs: Bool = false,
        onPeg: ((PegNode) -> Void)? = nil
    ) -> Bool {
        syncContinuumPegs()
        let config = ContinuumConfig(
            size: size,
            pegRadius: pegRadius,
            ballRadius: ballRadius,
            tuning: tuning
        )
        let hit = PlinkContinuum.step(
            pos: &pos,
            vel: &vel,
            dt: dt,
            t: t,
            lastKickT: &lastKickT,
            pegs: &continuumPegScratch,
            rails: continuumRails,
            config: config,
            onPeg: { [weak self] id in
                guard let self, id >= 0, id < self.pegs.count else { return }
                onPeg?(self.pegs[id])
            },
            passThroughPegs: passThroughPegs
        )
        return hit == .floor
    }

    private func syncContinuumPegs() {
        if continuumPegScratch.count != pegs.count {
            continuumPegScratch = pegs.enumerated().map { i, peg in
                ContinuumPeg(
                    id: i,
                    position: peg.position,
                    kind: peg.kind,
                    isLit: peg.isLit,
                    isCleared: peg.isCleared
                )
            }
            return
        }
        for i in pegs.indices {
            continuumPegScratch[i].position = pegs[i].position
            continuumPegScratch[i].isLit = pegs[i].isLit
            continuumPegScratch[i].isCleared = pegs[i].isCleared
            // kind stable
        }
    }

    private func simulateFreeFlight(stopAtFirstPeg: Bool = false) -> [FlightSample] {
        let launch = launchState()
        var pos = launch.origin
        var vel = launch.velocity
        let dt: CGFloat = 1 / 120
        var lastKickT: CGFloat = -1

        var samples: [FlightSample] = [FlightSample(t: 0, pos: pos, vel: vel)]
        var t: CGFloat = 0
        var pegHits = 0
        var wallHits = 0
        var prevX = pos.x
        for _ in 0..<2400 {
            let before = pos
            let kickBefore = lastKickT
            let hitFloor = stepFlight(
                pos: &pos, vel: &vel, dt: dt, t: t,
                lastKickT: &lastKickT
            )
            t += dt
            if (before.x <= size.width * 0.03 + ballRadius + 0.5 && pos.x <= before.x + 0.01)
                || (before.x >= size.width * 0.97 - ballRadius - 0.5 && pos.x >= before.x - 0.01) {
                if abs(pos.x - prevX) < 0.5 { wallHits += 1 } else { wallHits = 0 }
            } else {
                wallHits = 0
            }
            prevX = pos.x
            let justHitPeg = lastKickT != kickBefore
            if justHitPeg { pegHits += 1 }

            samples.append(FlightSample(t: t, pos: pos, vel: vel))
            if stopAtFirstPeg, justHitPeg { break }
            if hitFloor { break }
            if hypot(vel.dx, vel.dy) < 12 && t > 0.8 { break }
            if pegHits > 48 { break }
            if wallHits > 30 { break }
            if t > 10 { break }
        }
        return samples
    }

    private func polylineLength(_ pts: [CGPoint]) -> CGFloat {
        guard pts.count > 1 else { return 0 }
        var len: CGFloat = 0
        for i in 1..<pts.count {
            len += hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
        }
        return len
    }

    // MARK: - Shoot

    private func shoot() {
        guard phase == .aim, ball == nil else { return }
        if spiritBattleMode {
            refillSpiritOrbsIfNeeded()
        } else {
            guard ballsLeft > 0 else { return }
        }
        isPaused = false
        view?.isPaused = false

        let launch = launchState()
        if spiritBattleMode {
            if ballsLeft > 0 { ballsLeft -= 1 }
            if !deckOrbIDs.isEmpty {
                deckCursor = (deckCursor + 1) % deckOrbIDs.count
            }
        } else {
            ballsLeft -= 1
            if !deckOrbIDs.isEmpty {
                deckCursor = min(deckCursor + 1, deckOrbIDs.count)
            }
        }
        shotPlink = 0
        critActive = false
        shotHighlights = []
        splitBalls.removeAll()
        ballIsFire = pendingFire
        pendingFire = false
        let willSplit = pendingSplit
        pendingSplit = false
        phase = .flying
        shotAge = 0
        statusText = "…"
        aimGuide?.isHidden = true
        shooter?.isHidden = true
        PlinkSFX.play(.launch)
        publish()

        let node = makeOrbVisual(radius: ballRadius)
        node.position = launch.origin
        node.zPosition = 30
        node.name = "ball"
        if ballIsFire {
            node.run(SKAction.colorize(with: SKColor(red: 1, green: 0.45, blue: 0.1, alpha: 1), colorBlendFactor: 0.65, duration: 0.01))
        }

        let body = SKPhysicsBody(circleOfRadius: ballRadius)
        body.isDynamic = false
        body.affectedByGravity = false
        body.allowsRotation = false
        body.restitution = 0
        body.friction = 0
        body.linearDamping = 0
        body.angularDamping = 0
        body.categoryBitMask = Category.ball
        body.contactTestBitMask = 0
        body.collisionBitMask = 0
        node.physicsBody = body
        addChild(node)
        ball = node
        ballVel = launch.velocity
        ballLastKickAt = -1
        trailPoints = [launch.origin]
        redrawTrail()

        if willSplit {
            // Split shortly after leaving the shooter so aim still reads as one shot.
            run(SKAction.sequence([
                .wait(forDuration: 0.18),
                .run { [weak self] in self?.spawnSplitSiblings() },
            ]))
        }
    }

    /// Spirit battles recycle the deck forever — fight ends only on HP.
    private func refillSpiritOrbsIfNeeded() {
        guard spiritBattleMode else { return }
        guard ballsLeft <= 0 else { return }
        if !deckOrbIDs.isEmpty {
            ballsLeft = deckOrbIDs.count
            deckCursor = 0
            advanceDeckOrb()
        } else {
            ballsLeft = 1
        }
    }

    private func endShot() {
        // Pegs already pop on hit in spirit mode; clear any leftovers (classic mode).
        let leftover = pegs.filter { $0.isLit && !$0.isCleared }
        for peg in leftover {
            spark(at: peg.position, color: .orange)
            peg.popAway()
        }
        pegs.removeAll { $0.isCleared }

        let scored = shotPlink
        runPlink += scored
        ball?.removeFromParent()
        ball = nil
        for entry in splitBalls {
            entry.node.removeFromParent()
        }
        splitBalls.removeAll()
        ballIsFire = false
        trailPoints = []
        trailNode?.removeAllChildren()
        shooter?.isHidden = false
        critActive = false

        if spiritBattleMode {
            var hurt = 0
            if scored > 0 {
                // HP already applied per-peg; keep foe clamp + feed callback with round total.
                enemyHP = max(0, min(enemyHP, enemyMaxHP))
                onDamageDealt?(scored)
            }

            // Foe always swings for constant ATK if still standing (hit or miss).
            if enemyHP > 0, enemyCounterDamage > 0 {
                let atk = enemyCounterDamage
                hurt = atk
                playerHP = max(0, playerHP - atk)
                if scored > 0 {
                    PlinkSFX.play(.hurt)
                    statusText = "Cage −\(scored) · rattle −\(atk) · Abbie \(playerHP)"
                } else {
                    PlinkSFX.play(.miss)
                    statusText = "Miss · cage rattle −\(atk) · Abbie \(playerHP)"
                }
                onPlayerHurt?(atk)
            } else if scored <= 0 {
                PlinkSFX.play(.miss)
                statusText = "Miss!"
            } else {
                statusText = "Cage −\(scored) · \(enemyHP)/\(enemyMaxHP)"
            }

            onRoundResolved?(ShotRoundSummary(
                damageToEnemy: scored,
                damageToPlayer: hurt,
                highlights: shotHighlights
            ))
            shotHighlights = []

            if enemyHP <= 0 {
                PlinkSFX.play(.win)
                phase = .won
                statusText = "Rescued! +\(runPlink) pts"
                publish()
                return
            }
            if playerHP <= 0 {
                phase = .lost
                statusText = "Abbie down · \(runPlink) pts"
                publish()
                return
            }
            // Spirit fights never end for empty orbs — recycle and keep going.
            refillSpiritOrbsIfNeeded()
            phase = .aim
            advanceDeckOrb()
            shotPlink = 0
            redrawAim()
            publish()
            return
        }

        let orange = pegs.filter(\.isOrangeTarget).count
        if orange == 0 {
            phase = .won
            statusText = "Fever! +\(scored) plink"
            publish()
            return
        }
        if ballsLeft <= 0 {
            phase = .lost
            statusText = "Out of balls · \(runPlink) plink"
            publish()
            return
        }

        phase = .aim
        statusText = "\(orange) orange · shot +\(scored) · run \(runPlink)"
        shotPlink = 0
        redrawAim()
        publish()
    }

    func didBegin(_ contact: SKPhysicsContact) {
        _ = contact
    }

    private func noteHighlight(_ label: String) {
        // Keep unique tags in order; collapse duplicate bare Crit after CRIT ×2.
        if label == "Crit", shotHighlights.contains("CRIT ×2") { return }
        if !shotHighlights.contains(label) {
            shotHighlights.append(label)
        }
    }

    private func lightPegFromFlight(_ peg: PegNode) {
        let newly = peg.light(at: lastUpdateTime)
        guard newly else { return }

        var points = 0
        switch peg.kind {
        case .crit:
            if !critActive {
                critActive = true
                noteHighlight("CRIT ×2")
                let before = shotPlink
                shotPlink = max(1, shotPlink) * 2
                let bonus = shotPlink - before
                if bonus > 0, spiritBattleMode {
                    enemyHP = max(0, enemyHP - bonus)
                    emitHPContribution(bonus, at: peg.position)
                }
            } else {
                noteHighlight("Crit")
            }
            points = PeglinBattleRules.points(for: .crit, critActive: critActive)
            shotPlink += points
            PlinkSFX.play(.crit)
            spark(at: peg.position, color: SKColor(red: 1, green: 0.9, blue: 0.2, alpha: 1))
            statusText = "CRIT! +\(points)"

        case .refresh:
            noteHighlight("Refresh")
            points = PeglinBattleRules.points(for: .refresh, critActive: critActive)
            shotPlink += points
            PlinkSFX.play(.crit)
            spark(at: peg.position, color: SKColor(red: 0.4, green: 1, blue: 0.6, alpha: 1))
            if spiritBattleMode {
                // Full board rebuild mid-shot (new random refresh rolls).
                pendingBoardRefresh = true
                statusText = "REFRESH!"
            } else {
                var restored = 0
                for other in pegs where other !== peg {
                    if other.isLit && other.kind != .orange && other.kind != .bomb && !other.isCleared {
                        other.refreshReset()
                        restored += 1
                    }
                }
                statusText = "Refresh ×\(restored) · +\(points)"
            }

        case .bomb:
            spark(at: peg.position, color: SKColor(red: 1, green: 0.45, blue: 0.15, alpha: 1))
            if !bombSplashing {
                bombSplashing = true
                let aoe = size.width * PeglinBattleRules.bombAOENormalized
                var splash = 0
                for other in pegs where other !== peg && !other.isCleared && !other.isLit {
                    let dx = other.position.x - peg.position.x
                    let dy = other.position.y - peg.position.y
                    if hypot(dx, dy) <= aoe {
                        lightPegFromFlight(other)
                        splash += 1
                    }
                }
                bombSplashing = false
                noteHighlight(splash > 0 ? "Bomb ×\(splash)" : "Bomb")
                statusText = "BOMB AOE ×\(splash)"
            } else {
                statusText = "BOMB!"
            }
            points = 0

        case .blue, .orange, .stone:
            points = PeglinBattleRules.points(for: peg.kind, critActive: critActive)
            shotPlink += points
            PlinkSFX.play(.hit)
            spark(at: peg.position, color: peg.kind == .stone
                  ? SKColor(white: 0.75, alpha: 1)
                  : .white)
            statusText = spiritBattleMode
                ? "Cage +\(points) · \(max(0, enemyHP - points))/\(enemyMaxHP)"
                : "plink \(shotPlink)"
        }

        if peg.kind == .bomb {
            PlinkSFX.play(.hit)
        }

        // Destroy immediately — don't wait for end of round.
        destroyPegNow(peg, contribution: points)
        if pendingBoardRefresh {
            pendingBoardRefresh = false
            // Pop already removed this peg; rebuild the field under the live ball.
            respawnPegBoard()
        }
        publish()
    }

    /// Pop peg on hit and float the HP contribution above it.
    private func destroyPegNow(_ peg: PegNode, contribution: Int) {
        guard !peg.isCleared else { return }
        let origin = peg.position
        if contribution > 0 {
            emitHPContribution(contribution, at: origin)
            if spiritBattleMode {
                enemyHP = max(0, enemyHP - contribution)
            }
        }
        PlinkSFX.play(.pop)
        peg.popAway()
        pegs.removeAll { $0 === peg || $0.isCleared }

        if spiritBattleMode, enemyHP <= 0 {
            // Finish the shot quickly once the spirit is down.
            phase = .settling
            settleFrames = 8
        }
    }

    private func emitHPContribution(_ points: Int, at point: CGPoint) {
        let label = SKLabelNode(text: "+\(points)")
        label.fontName = "AvenirNext-Heavy"
        label.fontSize = 28
        label.fontColor = SKColor(red: 0.45, green: 1.0, blue: 0.55, alpha: 1)
        label.verticalAlignmentMode = .center
        label.horizontalAlignmentMode = .center
        label.position = point
        label.zPosition = 50
        label.setScale(0.4)
        addChild(label)

        let outline = SKLabelNode(text: "+\(points)")
        outline.fontName = "AvenirNext-Heavy"
        outline.fontSize = 28
        outline.fontColor = SKColor(white: 0, alpha: 0.55)
        outline.verticalAlignmentMode = .center
        outline.horizontalAlignmentMode = .center
        outline.position = CGPoint(x: 1.5, y: -1.5)
        outline.zPosition = -1
        label.addChild(outline)

        label.run(.sequence([
            .group([
                .moveBy(x: 0, y: 56, duration: 0.55),
                .sequence([
                    .scale(to: 1.15, duration: 0.12),
                    .scale(to: 1.0, duration: 0.1),
                ]),
                .sequence([
                    .wait(forDuration: 0.28),
                    .fadeOut(withDuration: 0.3),
                ]),
            ]),
            .removeFromParent(),
        ]))
    }

    private func spark(at point: CGPoint, color: SKColor) {
        let burst = SKShapeNode(circleOfRadius: 5)
        burst.fillColor = color
        burst.strokeColor = .clear
        burst.glowWidth = 4
        burst.position = point
        burst.zPosition = 40
        addChild(burst)
        burst.run(.sequence([
            .group([.scale(to: 3.5, duration: 0.16), .fadeOut(withDuration: 0.16)]),
            .removeFromParent(),
        ]))
    }

    /// Peglin never invents speed — minBallSpeed is 0; hook kept for call-site clarity.
    private func enforceMinBallSpeed() {
        let minSpeed = PeggleFeel.minBallSpeed
        guard minSpeed > 0 else { return }
        let speed = hypot(ballVel.dx, ballVel.dy)
        if speed >= minSpeed || speed <= 8 { return }
        let scale = minSpeed / speed
        ballVel.dx *= scale
        ballVel.dy *= scale
    }

    private func redrawTrail() {
        guard let trailNode else { return }
        trailNode.removeAllChildren()
        let style = tuning.orb.trail
        let n = trailPoints.count
        guard n > 0 else { return }

        // Base motion-blur echo — always on, owned/tinted by the active marble.
        for (i, p) in trailPoints.enumerated() {
            let age = CGFloat(i + 1) / CGFloat(max(n, 1)) // 0…1 oldest→newest
            let alpha = style.peakAlpha * (0.12 + 0.88 * age * age)
            let radius = ballRadius * style.echoScale * (0.28 + 0.72 * age)
            let ghost = SKShapeNode(circleOfRadius: radius)
            ghost.fillColor = SKColor(
                red: style.tintR,
                green: style.tintG,
                blue: style.tintB,
                alpha: alpha
            )
            ghost.strokeColor = SKColor(
                red: style.tintR,
                green: style.tintG,
                blue: style.tintB,
                alpha: alpha * 0.55
            )
            ghost.lineWidth = max(1.0, radius * 0.12)
            ghost.glowWidth = radius * 0.35
            ghost.position = p
            ghost.zPosition = -1
            trailNode.addChild(ghost)
        }

        // Elemental accents ride the same samples (fire embers, ice frost, …).
        appendTrailAccents(style: style, into: trailNode)
    }

    private func appendTrailAccents(style: OrbTrailStyle, into trailNode: SKNode) {
        guard style.accent != .none, trailPoints.count >= 2 else { return }
        let step = max(1, trailPoints.count / 10)
        for i in stride(from: 0, to: trailPoints.count, by: step) {
            let p = trailPoints[i]
            let age = CGFloat(i + 1) / CGFloat(trailPoints.count)
            switch style.accent {
            case .none:
                break
            case .sparks:
                addTrailMote(
                    at: p, into: trailNode,
                    radius: 2.2 + age * 2.0,
                    color: SKColor(red: 1, green: 0.95, blue: 0.55, alpha: 0.55 + age * 0.35)
                )
            case .petals:
                addTrailMote(
                    at: jitter(p, 4), into: trailNode,
                    radius: 2.5 + age * 2.5,
                    color: SKColor(red: 1, green: 0.55, blue: 0.8, alpha: 0.45 + age * 0.35)
                )
            case .dust:
                addTrailMote(
                    at: jitter(p, 5), into: trailNode,
                    radius: 1.8 + age * 1.5,
                    color: SKColor(red: 0.65, green: 0.58, blue: 0.45, alpha: 0.35 + age * 0.25)
                )
            case .bolts:
                let streak = SKShapeNode(rectOf: CGSize(width: 10 + age * 14, height: 2.2), cornerRadius: 1)
                streak.fillColor = SKColor(red: 0.55, green: 0.95, blue: 1, alpha: 0.55 + age * 0.35)
                streak.strokeColor = .clear
                streak.position = p
                streak.zRotation = CGFloat.random(in: -0.4...0.4)
                trailNode.addChild(streak)
            case .mist:
                addTrailMote(
                    at: jitter(p, 6), into: trailNode,
                    radius: 4 + age * 5,
                    color: SKColor(white: 1, alpha: 0.12 + age * 0.18)
                )
            case .embers:
                addTrailMote(
                    at: jitter(p, 3), into: trailNode,
                    radius: 2 + age * 2.5,
                    color: SKColor(red: 1, green: 0.35 + age * 0.4, blue: 0.08, alpha: 0.6 + age * 0.3)
                )
            case .frost:
                addTrailMote(
                    at: jitter(p, 4), into: trailNode,
                    radius: 2.2 + age * 2.2,
                    color: SKColor(red: 0.7, green: 0.92, blue: 1, alpha: 0.5 + age * 0.35)
                )
            }
        }
    }

    private func addTrailMote(at point: CGPoint, into parent: SKNode, radius: CGFloat, color: SKColor) {
        let mote = SKShapeNode(circleOfRadius: radius)
        mote.fillColor = color
        mote.strokeColor = .clear
        mote.glowWidth = radius * 0.8
        mote.position = point
        parent.addChild(mote)
    }

    private func jitter(_ point: CGPoint, _ amount: CGFloat) -> CGPoint {
        CGPoint(
            x: point.x + CGFloat.random(in: -amount...amount),
            y: point.y + CGFloat.random(in: -amount...amount)
        )
    }

    override func update(_ currentTime: TimeInterval) {
        let dt: TimeInterval
        if lastUpdateTime > 0 {
            dt = min(1 / 30, currentTime - lastUpdateTime)
        } else {
            dt = 1 / 60
        }
        lastUpdateTime = currentTime

        if isPaused { isPaused = false }
        if view?.isPaused == true { view?.isPaused = false }

        if phase == .flying, let live = ball {
            let frameDt = CGFloat(dt) * simSpeed
            let h: CGFloat = 1 / 120
            var primaryDone = live.isHidden
            if !primaryDone {
                var pos = live.position
                var kickT = CGFloat(ballLastKickAt)
                var remaining = frameDt
                var primaryFloor = false
                while remaining > 1e-6 {
                    let step = min(h, remaining)
                    shotAge += TimeInterval(step)
                    primaryFloor = stepFlight(
                        pos: &pos,
                        vel: &ballVel,
                        dt: step,
                        t: CGFloat(shotAge),
                        lastKickT: &kickT,
                        passThroughPegs: ballIsFire,
                        onPeg: { [weak self] peg in self?.lightPegFromFlight(peg) }
                    ) || primaryFloor
                    remaining -= step
                    if primaryFloor { break }
                }
                ballLastKickAt = TimeInterval(kickT)
                enforceMinBallSpeed()
                live.position = pos
                primaryDone = primaryFloor
                    || pos.y < -60 || pos.x < -60 || pos.x > size.width + 60
                if primaryDone {
                    live.isHidden = true
                }
                if trailPoints.last.map({
                    hypot(pos.x - $0.x, pos.y - $0.y) > tuning.orb.trail.sampleDistance
                }) ?? true {
                    trailPoints.append(pos)
                    let cap = tuning.orb.trail.maxPoints
                    if trailPoints.count > cap {
                        trailPoints.removeFirst(trailPoints.count - cap)
                    }
                    redrawTrail()
                }
            } else {
                shotAge += TimeInterval(frameDt)
            }

            // Step split siblings on the same continuum.
            var anySplitAlive = false
            for i in splitBalls.indices where !splitBalls[i].done {
                var sPos = splitBalls[i].node.position
                var sVel = splitBalls[i].vel
                var sKick = CGFloat(splitBalls[i].lastKick)
                var sRemaining = frameDt
                var sFloor = false
                while sRemaining > 1e-6 {
                    let step = min(h, sRemaining)
                    sFloor = stepFlight(
                        pos: &sPos,
                        vel: &sVel,
                        dt: step,
                        t: CGFloat(shotAge),
                        lastKickT: &sKick,
                        passThroughPegs: splitBalls[i].isFire,
                        onPeg: { [weak self] peg in self?.lightPegFromFlight(peg) }
                    ) || sFloor
                    sRemaining -= step
                    if sFloor { break }
                }
                splitBalls[i].vel = sVel
                splitBalls[i].lastKick = TimeInterval(sKick)
                splitBalls[i].node.position = sPos
                if sFloor || sPos.y < -60 || sPos.x < -60 || sPos.x > size.width + 60 {
                    splitBalls[i].done = true
                    splitBalls[i].node.removeFromParent()
                } else {
                    anySplitAlive = true
                }
            }

            // Only settle when every orb has left the playfield.
            if primaryDone, !anySplitAlive, shotAge > 0.35 {
                phase = .settling
                settleFrames = 0
            }
        }

        if phase == .settling {
            settleFrames += 1
            if settleFrames > 10 { endShot() }
        }
    }

    // MARK: - Touch

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard phase == .aim, let t = touches.first else { return }
        aimDragging = true
        dragStartX = t.location(in: self).x
        dragStartAim = aimOffset
        aimToward(t.location(in: self))
        redrawAim()
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard phase == .aim, aimDragging, let t = touches.first else { return }
        aimToward(t.location(in: self))
        redrawAim()
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard phase == .aim, aimDragging else { return }
        aimDragging = false
        if let t = touches.first {
            aimToward(t.location(in: self))
            redrawAim()
        }
        shoot()
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        aimDragging = false
    }

    private func aimToward(_ point: CGPoint) {
        let origin = shooterPoint
        let dx = point.x - origin.x
        let dy = point.y - origin.y
        let angle = atan2(dy, dx)
        let clamped = max(-.pi + 0.25, min(-0.25, angle))
        aimOffset = (clamped + .pi / 2) / 1.25
        aimOffset = max(-maxAim, min(maxAim, aimOffset))
    }

    /// Accessibility / on-screen stick: `normalizedX` −1…1 maps to full aim sweep.
    func applyAimJoystick(normalizedX: CGFloat) {
        guard phase == .aim else { return }
        let x = max(-1, min(1, normalizedX))
        aimOffset = x * maxAim
        redrawAim()
        publish()
    }

    var isAimingPhase: Bool { phase == .aim }

    /// Fire from the on-screen stick (same as releasing a board drag).
    func fireFromJoystick() {
        guard phase == .aim, ball == nil else { return }
        shoot()
    }

    private func publish() {
        let orange = pegs.filter(\.isOrangeTarget).count
        let show = phase == .won || phase == .lost
        onHud?(HudSnapshot(
            levelName: levels[levelIndex].name,
            status: statusText,
            ballsLeft: ballsLeft,
            orangeLeft: orange,
            plink: phase == .flying || phase == .settling ? shotPlink : runPlink,
            shotScore: shotPlink,
            enemyHP: enemyHP,
            enemyMaxHP: enemyMaxHP,
            playerHP: playerHP,
            playerMaxHP: playerMaxHP,
            critActive: critActive,
            orbName: tuning.orb.name,
            phase: phase,
            showBanner: show,
            bannerTitle: phase == .won ? "Victory!" : (phase == .lost ? "Try again" : ""),
            bannerBody: phase == .won
                ? (spiritBattleMode
                    ? "Cage broken · \(runPlink) damage"
                    : "Oranges cleared · \(runPlink + shotPlink) plink")
                : (phase == .lost
                    ? (spiritBattleMode
                        ? "Cage \(enemyHP) left · \(runPlink) dealt"
                        : "Orange pegs remain · \(runPlink) plink")
                    : ""),
            canAdvance: phase == .won && levelIndex + 1 < levels.count
        ))
    }

    /// Skin for the active orb. Physics stays a circle; texture is visual only.
    private func makeOrbVisual(radius: CGFloat) -> SKNode {
        let diameter = radius * 2.35
        let name = tuning.orb.catalogImageName
        if let image = UIImage(named: name) {
            let texture = SKTexture(image: image)
            texture.filteringMode = .linear
            return SKSpriteNode(texture: texture, size: CGSize(width: diameter, height: diameter))
        }
        let fallback = SKShapeNode(circleOfRadius: radius)
        fallback.fillColor = SKColor(red: 1, green: 0.95, blue: 0.85, alpha: 1)
        fallback.strokeColor = SKColor(red: 1, green: 0.75, blue: 0.35, alpha: 1)
        fallback.lineWidth = 2
        fallback.glowWidth = 4
        return fallback
    }
}
