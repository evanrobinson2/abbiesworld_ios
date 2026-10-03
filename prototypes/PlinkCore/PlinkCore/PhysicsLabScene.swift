import SpriteKit

/// Instrumented physics lab — measure g, |vx|/|v|, restitution against Peglin trailer targets.
final class PhysicsLabScene: SKScene, SKPhysicsContactDelegate {
    private enum Category {
        static let ball: UInt32 = 1 << 0
        static let peg: UInt32 = 1 << 1
        static let wall: UInt32 = 1 << 2
        static let floor: UInt32 = 1 << 3
    }

    var onMeter: ((LabMeterSnapshot) -> Void)?

    private(set) var scenario: LabScenario = .dropStraight
    private var phaseLabel = "ready"
    private var statusText = ""
    private var ball: SKShapeNode?
    private var pegs: [PegNode] = []
    private var trailNode: SKNode?
    private var trailPoints: [CGPoint] = []
    private var lastUpdateTime: TimeInterval = 0
    private var shotAge: TimeInterval = 0
    private var settleFrames = 0
    private var isFlying = false

    // Sampling for fits
    private struct Sample {
        var t: TimeInterval
        var x: CGFloat
        var y: CGFloat
        var vx: CGFloat
        var vy: CGFloat
    }
    private var samples: [Sample] = []
    private var speedBeforeContact: CGFloat?
    private var lastRestitution: CGFloat?
    private var fittedG: CGFloat?
    private var fittedGBoard: CGFloat?
    private var fittedVxDrift: CGFloat?
    private var fitNote = "Tap / release to fire"
    private var contactArmed = false

    private let ballRadius = PeglinCandidates.ballRadius
    private let pegRadius = PeglinCandidates.pegRadius
    private var gravityStrength = PeglinCandidates.gravity
    private let launchSpeed = PeglinCandidates.launchSpeed
    private let wallRestitution = PeglinCandidates.wallRestitution
    private let maxBallSpeed: CGFloat = 1400

    private var boardTop: CGFloat { size.height * 0.92 }
    private var boardBottom: CGFloat { size.height * 0.08 }
    private var boardLeft: CGFloat { size.width * 0.06 }
    private var boardRight: CGFloat { size.width * 0.94 }
    private var boardHeight: CGFloat { max(boardTop - boardBottom, 1) }

    override func didMove(to view: SKView) {
        backgroundColor = SKColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1)
        isPaused = false
        view.isPaused = false
        view.isMultipleTouchEnabled = false
        view.ignoresSiblingOrder = true
        physicsWorld.contactDelegate = self
        physicsWorld.speed = 1
        applyGravity()
        loadScenario(.dropStraight)
    }

    func loadScenario(_ next: LabScenario) {
        scenario = next
        clearBall()
        removeAllChildren()
        pegs.removeAll()
        samples.removeAll()
        speedBeforeContact = nil
        lastRestitution = nil
        fittedG = nil
        fittedGBoard = nil
        fittedVxDrift = nil
        shotAge = 0
        settleFrames = 0
        isFlying = false
        phaseLabel = "ready"
        statusText = next.blurb
        fitNote = "Tap / release to fire"
        contactArmed = false
        lastUpdateTime = 0
        trailPoints = []

        applyGravity()
        drawBackdrop()
        installBounds()
        placeScenarioGeometry()
        placeShooterMarker()

        let trail = SKNode()
        trail.zPosition = 20
        addChild(trail)
        trailNode = trail

        publish()
    }

    func fire() {
        guard !isFlying else { return }
        clearBall()
        samples.removeAll()
        speedBeforeContact = nil
        // Keep last restitution across shots for comparison unless B/C need fresh.
        if scenario == .singlePeg || scenario == .wallBounce {
            lastRestitution = nil
        }
        fittedG = nil
        fittedGBoard = nil
        fittedVxDrift = nil
        fitNote = "sampling…"
        shotAge = 0
        settleFrames = 0
        contactArmed = false
        trailPoints = []
        trailNode?.removeAllChildren()

        let launch = launchState()
        let node = SKShapeNode(circleOfRadius: ballRadius)
        node.fillColor = SKColor(red: 1, green: 0.95, blue: 0.85, alpha: 1)
        node.strokeColor = SKColor(red: 1, green: 0.7, blue: 0.3, alpha: 1)
        node.lineWidth = 1.5
        node.glowWidth = 4
        node.position = launch.origin
        node.zPosition = 30
        node.name = "ball"

        let body = SKPhysicsBody(circleOfRadius: ballRadius)
        body.isDynamic = true
        body.affectedByGravity = true
        body.allowsRotation = true
        body.restitution = 0.75
        body.friction = 0
        body.linearDamping = 0
        body.angularDamping = 0
        body.mass = 0.16
        body.categoryBitMask = Category.ball
        body.contactTestBitMask = Category.peg | Category.floor | Category.wall
        body.collisionBitMask = Category.peg | Category.wall
        body.usesPreciseCollisionDetection = true
        node.physicsBody = body
        addChild(node)
        ball = node
        body.velocity = launch.velocity

        isFlying = true
        phaseLabel = "flying"
        statusText = "…"
        publish()
    }

    func nextScenario() {
        let all = LabScenario.allCases
        guard let idx = all.firstIndex(of: scenario) else { return }
        loadScenario(all[(idx + 1) % all.count])
    }

    func prevScenario() {
        let all = LabScenario.allCases
        guard let idx = all.firstIndex(of: scenario) else { return }
        loadScenario(all[(idx - 1 + all.count) % all.count])
    }

    // MARK: - Geometry

    private func applyGravity() {
        physicsWorld.gravity = CGVector(dx: 0, dy: -gravityStrength)
    }

    private func drawBackdrop() {
        let sky = SKSpriteNode(
            color: SKColor(red: 0.07, green: 0.11, blue: 0.2, alpha: 1),
            size: size
        )
        sky.position = CGPoint(x: size.width / 2, y: size.height / 2)
        sky.zPosition = -20
        addChild(sky)

        let panel = SKShapeNode(
            rectOf: CGSize(width: boardRight - boardLeft, height: boardTop - boardBottom),
            cornerRadius: 18
        )
        panel.fillColor = SKColor(red: 0.12, green: 0.18, blue: 0.3, alpha: 0.95)
        panel.strokeColor = SKColor(red: 0.35, green: 0.55, blue: 0.85, alpha: 0.5)
        panel.lineWidth = 2
        panel.position = CGPoint(x: (boardLeft + boardRight) / 2, y: (boardTop + boardBottom) / 2)
        panel.zPosition = -10
        addChild(panel)

        // Grid for visual board-height reference (10%).
        let grid = SKNode()
        grid.zPosition = -5
        for i in 1..<10 {
            let y = boardBottom + boardHeight * CGFloat(i) / 10
            let line = SKShapeNode(rectOf: CGSize(width: boardRight - boardLeft - 8, height: 1))
            line.fillColor = SKColor.white.withAlphaComponent(i == 5 ? 0.18 : 0.06)
            line.strokeColor = .clear
            line.position = CGPoint(x: (boardLeft + boardRight) / 2, y: y)
            grid.addChild(line)
        }
        addChild(grid)
    }

    private func installBounds() {
        func edge(from a: CGPoint, to b: CGPoint, name: String) {
            let node = SKNode()
            node.name = name
            let body = SKPhysicsBody(edgeFrom: a, to: b)
            body.friction = 0
            body.restitution = wallRestitution
            body.categoryBitMask = Category.wall
            body.contactTestBitMask = Category.ball
            body.collisionBitMask = Category.ball
            node.physicsBody = body
            addChild(node)
        }

        edge(from: CGPoint(x: boardLeft, y: boardBottom), to: CGPoint(x: boardLeft, y: boardTop), name: "wallL")
        edge(from: CGPoint(x: boardRight, y: boardBottom), to: CGPoint(x: boardRight, y: boardTop), name: "wallR")
        edge(from: CGPoint(x: boardLeft, y: boardTop), to: CGPoint(x: boardRight, y: boardTop), name: "wallT")

        let floor = SKNode()
        floor.name = "killFloor"
        let floorBody = SKPhysicsBody(
            edgeFrom: CGPoint(x: boardLeft, y: boardBottom),
            to: CGPoint(x: boardRight, y: boardBottom)
        )
        floorBody.categoryBitMask = Category.floor
        floorBody.contactTestBitMask = Category.ball
        floorBody.collisionBitMask = 0
        floor.physicsBody = floorBody
        addChild(floor)
    }

    private func placeScenarioGeometry() {
        switch scenario {
        case .dropStraight, .angledFlight:
            break
        case .singlePeg:
            addPeg(at: CGPoint(x: size.width * 0.5, y: size.height * 0.45), kind: .orange)
        case .wallBounce:
            // No pegs — wall is the instrument.
            break
        case .pegField:
            let spots: [(CGFloat, CGFloat)] = [
                (0.35, 0.55), (0.50, 0.58), (0.65, 0.55),
                (0.28, 0.40), (0.42, 0.38), (0.58, 0.38), (0.72, 0.40),
                (0.35, 0.25), (0.50, 0.28), (0.65, 0.25),
            ]
            for (i, s) in spots.enumerated() {
                addPeg(
                    at: CGPoint(x: size.width * s.0, y: size.height * s.1),
                    kind: i % 3 == 0 ? .orange : .blue
                )
            }
        }
    }

    private func addPeg(at point: CGPoint, kind: PegKind) {
        let peg = PegNode(kind: kind, radius: pegRadius, categories: Category.peg)
        peg.position = point
        peg.zPosition = 5
        // Lab pegs should not disintegrate — we need repeatable e measurements.
        if let body = peg.physicsBody {
            body.restitution = PeglinCandidates.pegRestitution
        }
        addChild(peg)
        pegs.append(peg)
    }

    private func placeShooterMarker() {
        let marker = SKShapeNode(circleOfRadius: ballRadius * 0.7)
        marker.fillColor = SKColor.white.withAlphaComponent(0.25)
        marker.strokeColor = SKColor.white.withAlphaComponent(0.5)
        marker.lineWidth = 1
        marker.position = shooterPoint
        marker.zPosition = 8
        marker.name = "shooter"
        addChild(marker)

        let tip = launchState()
        let arrow = SKShapeNode()
        let path = CGMutablePath()
        path.move(to: tip.origin)
        path.addLine(to: CGPoint(
            x: tip.origin.x + tip.velocity.dx * 0.08,
            y: tip.origin.y + tip.velocity.dy * 0.08
        ))
        arrow.path = path
        arrow.strokeColor = SKColor(red: 0.45, green: 1, blue: 0.55, alpha: 0.9)
        arrow.lineWidth = 3
        arrow.glowWidth = 2
        arrow.zPosition = 9
        arrow.name = "aimArrow"
        addChild(arrow)
    }

    private var shooterPoint: CGPoint {
        CGPoint(x: size.width * 0.5, y: boardTop - 20)
    }

    private func launchState() -> (origin: CGPoint, velocity: CGVector) {
        let origin = CGPoint(x: shooterPoint.x, y: shooterPoint.y - 18)
        switch scenario {
        case .dropStraight:
            return (origin, CGVector(dx: 0, dy: -40))
        case .angledFlight:
            // ~35° from vertical toward the right.
            let ang = -(.pi / 2) + 0.55
            return (origin, CGVector(dx: cos(ang) * launchSpeed, dy: sin(ang) * launchSpeed))
        case .singlePeg:
            return (origin, CGVector(dx: 0, dy: -launchSpeed * 0.55))
        case .wallBounce:
            let ang = -(.pi / 2) + 0.95
            return (origin, CGVector(dx: cos(ang) * launchSpeed, dy: sin(ang) * launchSpeed))
        case .pegField:
            let ang = -(.pi / 2) + 0.35
            return (origin, CGVector(dx: cos(ang) * launchSpeed * 0.85, dy: sin(ang) * launchSpeed * 0.85))
        }
    }

    // MARK: - Contacts

    func didBegin(_ contact: SKPhysicsContact) {
        let mask = contact.bodyA.categoryBitMask | contact.bodyB.categoryBitMask

        if mask & Category.floor != 0 && mask & Category.ball != 0 {
            guard isFlying, shotAge > 0.2 else { return }
            beginSettle()
            return
        }

        if mask & Category.ball != 0 && (mask & Category.peg != 0 || mask & Category.wall != 0) {
            // `speedBeforeContact` is latched each frame in update() before the solver runs.
            pendingRestitutionBefore = speedBeforeContact
            pendingRestitutionFrames = 2
            contactArmed = false

            if mask & Category.peg != 0 {
                let pegBody = contact.bodyA.categoryBitMask == Category.peg ? contact.bodyA : contact.bodyB
                if let peg = pegBody.node {
                    flashPeg(peg)
                }
            }
        }
    }

    private var pendingRestitutionBefore: CGFloat?
    private var pendingRestitutionFrames = 0

    private func flashPeg(_ node: SKNode) {
        node.run(.sequence([
            .group([
                .scale(to: 1.25, duration: 0.05),
                .run {
                    if let shape = node as? SKShapeNode {
                        shape.glowWidth = 8
                    }
                },
            ]),
            .group([
                .scale(to: 1.0, duration: 0.1),
                .run {
                    if let shape = node as? SKShapeNode {
                        shape.glowWidth = 2
                    }
                },
            ]),
        ]))
    }

    private func beginSettle() {
        isFlying = false
        phaseLabel = "fit"
        ball?.physicsBody?.velocity = .zero
        ball?.physicsBody?.isDynamic = false
        settleFrames = 0
        runFit()
        publish()
    }

    // MARK: - Fit

    private func runFit() {
        // Prefer samples before first big velocity kink (free flight).
        let free = freeFlightSamples(from: samples)
        guard free.count >= 8 else {
            fitNote = "need ≥8 free-flight samples (got \(free.count))"
            samplePublishCount = samples.count
            return
        }

        let t0 = free[0].t
        let ts = free.map { $0.t - t0 }
        let ys = free.map { boardNormY($0.y) } // +down in board units from top
        // yn board: 0 at top, +down
        // Fit yn = a + b t + 0.5 g t^2  → g_board = 2 * c2

        // Also fit in pixel space: y_down = boardTop - y
        let yDown = free.map { boardTop - $0.y }
        let gPix = quadraticAccel(t: ts, values: yDown)
        let gBoard = quadraticAccel(t: ts, values: ys)

        fittedG = gPix
        fittedGBoard = gBoard

        let vxs = free.map { $0.vx }
        let vxMean = vxs.reduce(0, +) / CGFloat(vxs.count)
        let vxVar = vxs.map { ($0 - vxMean) * ($0 - vxMean) }.reduce(0, +) / CGFloat(vxs.count)
        fittedVxDrift = sqrt(vxVar) / boardHeight // boardH/s stddev of vx

        let gTarget = PeglinCandidates.gravity
        let err = abs((gPix ?? 0) - gTarget) / gTarget
        fitNote = String(
            format: "fit g=%.0f pt/s² (%.2f bh/s²) · cmd %.0f · err %.0f%% · vxσ=%.3f bh/s · n=%d",
            gPix ?? 0,
            gBoard ?? 0,
            gTarget,
            err * 100,
            fittedVxDrift ?? 0,
            free.count
        )
        samplePublishCount = free.count
    }

    private var samplePublishCount = 0

    private func freeFlightSamples(from all: [Sample]) -> [Sample] {
        guard all.count >= 2 else { return all }
        // Cut at first large Δv (collision / wall).
        var out: [Sample] = [all[0]]
        for i in 1..<all.count {
            let a = all[i - 1]
            let b = all[i]
            let dv = hypot(b.vx - a.vx, b.vy - a.vy)
            if dv > 180 { break } // pt/s jump
            out.append(b)
        }
        // For drop/angle, also stop if we leave upper 70% without collision (long arc ok).
        return out
    }

    private func quadraticAccel(t: [TimeInterval], values: [CGFloat]) -> CGFloat? {
        let n = t.count
        guard n >= 3 else { return nil }
        // Solve least squares for [1, t, t²]
        var ata = [[Double]](repeating: [0, 0, 0], count: 3)
        var atb = [Double](repeating: 0, count: 3)
        for i in 0..<n {
            let ti = Double(t[i])
            let yi = Double(values[i])
            let row = [1.0, ti, ti * ti]
            for r in 0..<3 {
                atb[r] += row[r] * yi
                for c in 0..<3 {
                    ata[r][c] += row[r] * row[c]
                }
            }
        }
        guard let coef = solve3(ata, atb) else { return nil }
        // coef[2] = 0.5 g  → g = 2 * coef[2]
        return CGFloat(2 * coef[2])
    }

    private func solve3(_ a: [[Double]], _ b: [Double]) -> [Double]? {
        var m = a
        var v = b
        for col in 0..<3 {
            var pivot = col
            for r in col..<3 where abs(m[r][col]) > abs(m[pivot][col]) { pivot = r }
            if abs(m[pivot][col]) < 1e-12 { return nil }
            m.swapAt(col, pivot)
            v.swapAt(col, pivot)
            let div = m[col][col]
            for c in col..<3 { m[col][c] /= div }
            v[col] /= div
            for r in 0..<3 where r != col {
                let f = m[r][col]
                for c in col..<3 { m[r][c] -= f * m[col][c] }
                v[r] -= f * v[col]
            }
        }
        return v
    }

    private func boardNormY(_ y: CGFloat) -> CGFloat {
        (boardTop - y) / boardHeight
    }

    // MARK: - Update

    override func update(_ currentTime: TimeInterval) {
        let dt: TimeInterval
        if lastUpdateTime > 0 {
            dt = min(1 / 20, currentTime - lastUpdateTime)
        } else {
            dt = 1 / 60
        }
        lastUpdateTime = currentTime

        if isPaused { isPaused = false }
        if view?.isPaused == true { view?.isPaused = false }

        if isFlying, let live = ball, let body = live.physicsBody {
            shotAge += dt
            let speed = hypot(body.velocity.dx, body.velocity.dy)
            if speed > maxBallSpeed {
                let s = maxBallSpeed / speed
                body.velocity = CGVector(dx: body.velocity.dx * s, dy: body.velocity.dy * s)
            }

            // Latch pre-solver speed for restitution (contact uses previous frame).
            if pendingRestitutionFrames > 0 {
                pendingRestitutionFrames -= 1
                if pendingRestitutionFrames == 0, let before = pendingRestitutionBefore, before > 40 {
                    let e = speed / before
                    if e.isFinite, e > 0.05, e < 2.5 {
                        lastRestitution = e
                        fitNote = String(
                            format: "e_last=%.2f (target %.2f)",
                            e,
                            PeglinCandidates.pegRestitution
                        )
                    }
                    pendingRestitutionBefore = nil
                }
            } else {
                speedBeforeContact = speed
            }

            samples.append(Sample(
                t: shotAge,
                x: live.position.x,
                y: live.position.y,
                vx: body.velocity.dx,
                vy: body.velocity.dy
            ))

            if trailPoints.last.map({ hypot(live.position.x - $0.x, live.position.y - $0.y) > 10 }) ?? true {
                trailPoints.append(live.position)
                if trailPoints.count > 40 { trailPoints.removeFirst(trailPoints.count - 40) }
                redrawTrail()
            }

            if live.position.y < boardBottom - 40
                || live.position.x < boardLeft - 40
                || live.position.x > boardRight + 40 {
                beginSettle()
            }

            // Publish meters ~15 Hz
            if Int(shotAge * 15) != Int((shotAge - dt) * 15) {
                publish()
            }
        }

        if phaseLabel == "fit" {
            settleFrames += 1
            if settleFrames > 20 {
                phaseLabel = "ready"
                statusText = scenario.blurb
                clearBall()
                publish()
            }
        }
    }

    private func redrawTrail() {
        guard let trailNode else { return }
        trailNode.removeAllChildren()
        let n = trailPoints.count
        for (i, p) in trailPoints.enumerated() {
            let t = CGFloat(i + 1) / CGFloat(max(n, 1))
            let ghost = SKShapeNode(circleOfRadius: ballRadius * (0.35 + t * 0.5))
            ghost.fillColor = SKColor(red: 1, green: 0.9, blue: 0.6, alpha: 0.05 + t * 0.3)
            ghost.strokeColor = .clear
            ghost.position = p
            trailNode.addChild(ghost)
        }
    }

    private func clearBall() {
        ball?.removeFromParent()
        ball = nil
        trailPoints = []
        trailNode?.removeAllChildren()
    }

    // MARK: - Touch

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        if phaseLabel == "ready" || phaseLabel == "fit" {
            if phaseLabel == "fit" {
                clearBall()
                phaseLabel = "ready"
            }
            fire()
        }
    }

    // MARK: - Publish

    private func publish() {
        var vx: CGFloat = 0
        var vy: CGFloat = 0
        var speed: CGFloat = 0
        var horiz: CGFloat = 0
        var boardY: CGFloat = 0
        if let body = ball?.physicsBody, let pos = ball?.position {
            vx = body.velocity.dx
            vy = body.velocity.dy
            speed = hypot(vx, vy)
            horiz = abs(vx) / max(speed, 0.001)
            boardY = boardNormY(pos.y)
        }

        onMeter?(LabMeterSnapshot(
            scenario: scenario,
            phaseLabel: phaseLabel,
            status: statusText,
            vx: vx,
            vy: vy,
            speed: speed,
            horizFrac: horiz,
            boardY: boardY,
            shotAge: shotAge,
            commandedG: gravityStrength,
            commandedGBoard: gravityStrength / boardHeight,
            fittedG: fittedG,
            fittedGBoard: fittedGBoard,
            fittedVxDrift: fittedVxDrift,
            lastRestitution: lastRestitution,
            sampleCount: samplePublishCount > 0 ? samplePublishCount : samples.count,
            fitNote: fitNote,
            targetGBoard: 1.5,
            targetHoriz: 0.44,
            targetE: PeglinCandidates.pegRestitution
        ))
    }
}
