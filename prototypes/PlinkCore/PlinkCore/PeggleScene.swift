import SpriteKit

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
        var critActive: Bool
        var orbName: String
        var phase: Phase
        var showBanner: Bool
        var bannerTitle: String
        var bannerBody: String
        var canAdvance: Bool
    }

    var onHud: ((HudSnapshot) -> Void)?

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
    private var aimGuide: SKNode?
    private var shooter: SKShapeNode?
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

    private(set) var tuning = PhysicsTuning.default
    private var pegRadius: CGFloat { PeggleFeel.pegRadius }
    private var ballRadius: CGFloat { tuning.ballRadiusCG }
    private var trailNode: SKNode?
    private var trailPoints: [CGPoint] = []
    private var didBuild = false
    private var wallNodes: [SKNode] = []

    private struct FlightSample {
        var t: CGFloat
        var pos: CGPoint
        var vel: CGVector
    }

    private let simSpeed: CGFloat = 0.8

    var levelCount: Int { levels.count }
    var currentLevelIndex: Int { levelIndex }

    func applyTuning(_ next: PhysicsTuning) {
        let orbChanged = tuning.orbID != next.orbID
        tuning = next
        physicsWorld.gravity = tuning.gravityVector
        for wall in wallNodes {
            wall.physicsBody?.restitution = tuning.wallRestitutionCG
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

    override func didMove(to view: SKView) {
        backgroundColor = SKColor(red: 0.05, green: 0.08, blue: 0.18, alpha: 1)
        isPaused = false
        view.isPaused = false
        view.isMultipleTouchEnabled = false
        view.ignoresSiblingOrder = true
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
        ballsLeft = levels[levelIndex].balls
        phase = .aim
        aimOffset = 0
        shotPlink = 0
        critActive = false
        statusText = "Clear every orange · yellow=crit · green=refresh"
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
        shotPlink = 0
        critActive = false

        let w = size.width
        let h = size.height
        guard w > 40, h > 40 else { return }

        physicsWorld.gravity = tuning.gravityVector
        drawBackdrop(w: w, h: h)
        installBounds(w: w, h: h)

        for (i, spec) in levels[levelIndex].pegs.enumerated() {
            let peg = PegNode(kind: spec.kind, radius: pegRadius, categories: Category.peg)
            peg.position = CGPoint(x: spec.nx * w, y: (1 - spec.ny) * h)
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

    private func refreshShooterLook() {
        let pos = shooter?.position ?? CGPoint(x: size.width * 0.5, y: size.height * 0.94)
        shooter?.removeFromParent()
        let node = SKShapeNode(circleOfRadius: ballRadius)
        node.fillColor = SKColor(red: 1, green: 0.95, blue: 0.85, alpha: 1)
        node.strokeColor = SKColor(red: 1, green: 0.75, blue: 0.35, alpha: 1)
        node.lineWidth = 2
        node.glowWidth = 4
        node.position = pos
        node.zPosition = 20
        node.isHidden = phase == .flying || phase == .settling
        addChild(node)
        shooter = node
    }

    private func drawBackdrop(w: CGFloat, h: CGFloat) {
        let sky = SKSpriteNode(
            color: SKColor(red: 0.08, green: 0.12, blue: 0.26, alpha: 1),
            size: CGSize(width: w, height: h)
        )
        sky.position = CGPoint(x: w / 2, y: h / 2)
        sky.zPosition = -20
        addChild(sky)

        let panel = SKShapeNode(rectOf: CGSize(width: w * 0.94, height: h * 0.9), cornerRadius: 24)
        panel.fillColor = SKColor(red: 0.12, green: 0.2, blue: 0.38, alpha: 0.98)
        panel.strokeColor = SKColor(red: 0.4, green: 0.65, blue: 1.0, alpha: 0.45)
        panel.lineWidth = 3
        panel.position = CGPoint(x: w / 2, y: h / 2)
        panel.zPosition = -10
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
            body.restitution = tuning.wallRestitutionCG
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

        let points = simulateFreeFlight().map(\.pos)
        guard points.count > 1 else { return }

        var on = true
        let spacing: CGFloat = 16
        var traveled: CGFloat = 0
        let total = polylineLength(points)
        // Cap drawn length so a long path stays readable.
        let drawBudget: CGFloat = min(total, size.height * 2.8)
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

    /// Shared continuum: gravity×scale, damping, wall e, Peglin-style restitution bounce.
    private func stepFlight(
        pos: inout CGPoint,
        vel: inout CGVector,
        dt: CGFloat,
        t: CGFloat,
        lastKickT: inout CGFloat,
        onPeg: ((PegNode) -> Void)? = nil
    ) -> Bool {
        let r = ballRadius
        let left = size.width * 0.03 + r
        let right = size.width * 0.97 - r
        let top = size.height * 0.98 - r
        let floor = size.height * 0.04
        let reach = r + pegRadius
        let damping = tuning.woodDampingCG

        let g = tuning.gravityVector
        vel.dx += g.dx * dt
        vel.dy += g.dy * dt
        let damp = max(CGFloat(0), 1 - damping * dt)
        vel.dx *= damp
        vel.dy *= damp
        pos.x += vel.dx * dt
        pos.y += vel.dy * dt

        // Walls: reflect only the into-wall component, then kill residual push-in
        // so gravity-into-wall (tilt ±90°) cannot chatter every substep.
        if pos.x < left {
            pos.x = left
            if vel.dx < 0 { vel.dx = -vel.dx * tuning.wallRestitutionCG }
            if vel.dx < 0 { vel.dx = 0 }
        } else if pos.x > right {
            pos.x = right
            if vel.dx > 0 { vel.dx = -vel.dx * tuning.wallRestitutionCG }
            if vel.dx > 0 { vel.dx = 0 }
        }
        if pos.y > top {
            pos.y = top
            if vel.dy > 0 { vel.dy = -vel.dy * tuning.wallRestitutionCG }
            if vel.dy > 0 { vel.dy = 0 }
        }

        if t - lastKickT >= 0.04 {
            var bestPeg: PegNode?
            var bestDepth: CGFloat = 0
            var bestN = CGVector.zero
            for peg in pegs where !peg.isCleared {
                let dx = pos.x - peg.position.x
                let dy = pos.y - peg.position.y
                let dist = hypot(dx, dy)
                let depth = reach - dist
                guard depth > 0 else { continue }
                var n = CGVector(dx: dx, dy: dy)
                if dist < 0.5 {
                    n = CGVector(dx: 0, dy: 1)
                } else {
                    n.dx /= dist
                    n.dy /= dist
                }
                let vRad = vel.dx * n.dx + vel.dy * n.dy
                // Only when approaching, or deeply stuck inside.
                guard vRad < -2 || depth > r * 0.35 else { continue }
                if depth > bestDepth {
                    bestDepth = depth
                    bestPeg = peg
                    bestN = n
                }
            }
            if let peg = bestPeg {
                let bounced = bounceResponse(
                    ballPos: pos,
                    ballVel: vel,
                    pegPos: peg.position,
                    normal: bestN,
                    pegSurface: peg.surfaceBounciness
                )
                pos = bounced.pos
                vel = bounced.vel
                lastKickT = t
                onPeg?(peg)
            }
        }

        let speed = hypot(vel.dx, vel.dy)
        if speed > tuning.maxBallSpeedCG {
            let s = tuning.maxBallSpeedCG / speed
            vel.dx *= s
            vel.dy *= s
        }

        return pos.y <= floor
    }

    private func simulateFreeFlight() -> [FlightSample] {
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
            let hitFloor = stepFlight(
                pos: &pos, vel: &vel, dt: dt, t: t,
                lastKickT: &lastKickT
            )
            t += dt
            // Count wall chatter for early exit (tilt ±90° used to scribble forever).
            if (before.x <= size.width * 0.03 + ballRadius + 0.5 && pos.x <= before.x + 0.01)
                || (before.x >= size.width * 0.97 - ballRadius - 0.5 && pos.x >= before.x - 0.01) {
                if abs(pos.x - prevX) < 0.5 { wallHits += 1 } else { wallHits = 0 }
            } else {
                wallHits = 0
            }
            prevX = pos.x
            if lastKickT == t { pegHits += 1 }

            samples.append(FlightSample(t: t, pos: pos, vel: vel))
            if hitFloor { break }
            if hypot(vel.dx, vel.dy) < 12 && t > 0.8 { break }
            if pegHits > 48 { break }
            if wallHits > 30 { break }
            if t > 10 { break }
        }
        return samples
    }

    /// Reflect into-peg radial, then add fixed outward bumper kick (always adds speed).
    private func bounceResponse(
        ballPos: CGPoint,
        ballVel: CGVector,
        pegPos: CGPoint,
        normal: CGVector,
        pegSurface: CGFloat
    ) -> (pos: CGPoint, vel: CGVector) {
        var n = normal
        let nLen = hypot(n.dx, n.dy)
        if nLen < 0.5 {
            n = CGVector(dx: 0, dy: 1)
        } else if abs(nLen - 1) > 0.01 {
            n.dx /= nLen
            n.dy /= nLen
        }

        var v = ballVel
        let vRad = v.dx * n.dx + v.dy * n.dy
        // Passive rubber: reverse approach (e ≤ 1) — does not invent energy.
        if vRad < 0 {
            let e = tuning.effectiveRestitution(pegSurface: pegSurface)
            v.dx -= (1 + e) * vRad * n.dx
            v.dy -= (1 + e) * vRad * n.dy
        }
        // Active bumper: fixed outward punch — this is what makes pegs addictive.
        let kick = tuning.effectiveBumperKick
        v.dx += n.dx * kick
        v.dy += n.dy * kick

        let speed = hypot(v.dx, v.dy)
        if speed > tuning.maxBallSpeedCG {
            let c = tuning.maxBallSpeedCG / speed
            v.dx *= c
            v.dy *= c
        }

        let sep = ballRadius + pegRadius + 0.5
        let out = CGPoint(x: pegPos.x + n.dx * sep, y: pegPos.y + n.dy * sep)
        return (out, v)
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
        guard phase == .aim, ballsLeft > 0, ball == nil else { return }
        isPaused = false
        view?.isPaused = false

        let launch = launchState()
        ballsLeft -= 1
        phase = .flying
        shotAge = 0
        shotPlink = 0
        critActive = false
        statusText = "…"
        aimGuide?.isHidden = true
        shooter?.isHidden = true
        publish()

        let node = SKShapeNode(circleOfRadius: ballRadius)
        node.fillColor = SKColor(red: 1, green: 0.95, blue: 0.85, alpha: 1)
        node.strokeColor = SKColor(red: 1, green: 0.75, blue: 0.35, alpha: 1)
        node.lineWidth = 2
        node.glowWidth = 5
        node.position = launch.origin
        node.zPosition = 30
        node.name = "ball"

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
    }

    private func endShot() {
        let lit = pegs.filter { $0.isLit && !$0.isCleared }
        for peg in lit {
            let color: SKColor
            switch peg.kind {
            case .orange: color = .orange
            case .crit: color = SKColor(red: 1, green: 0.9, blue: 0.2, alpha: 1)
            case .refresh: color = SKColor(red: 0.4, green: 1, blue: 0.6, alpha: 1)
            case .blue: color = .cyan
            }
            spark(at: peg.position, color: color)
            peg.popAway()
        }
        pegs.removeAll { $0.isCleared }

        runPlink += shotPlink
        ball?.removeFromParent()
        ball = nil
        trailPoints = []
        trailNode?.removeAllChildren()
        shooter?.isHidden = false
        critActive = false

        let orange = pegs.filter(\.isOrangeTarget).count
        if orange == 0 {
            phase = .won
            statusText = "Fever! +\(shotPlink) plink"
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
        statusText = "\(orange) orange · shot +\(shotPlink) · run \(runPlink)"
        shotPlink = 0
        redrawAim()
        publish()
    }

    func didBegin(_ contact: SKPhysicsContact) {
        _ = contact
    }

    private func lightPegFromFlight(_ peg: PegNode) {
        let newly = peg.light(at: lastUpdateTime)
        guard newly else { return }

        switch peg.kind {
        case .crit:
            if !critActive {
                critActive = true
                shotPlink = max(1, shotPlink) * 2 // Peglin-ish: retroactive crit
            }
            shotPlink += critActive ? 4 : 2
            spark(at: peg.position, color: SKColor(red: 1, green: 0.9, blue: 0.2, alpha: 1))
            statusText = "CRIT! plink \(shotPlink)"

        case .refresh:
            shotPlink += critActive ? 2 : 1
            var restored = 0
            for other in pegs where other !== peg {
                if other.isLit && other.kind != .orange && !other.isCleared {
                    other.refreshReset()
                    restored += 1
                }
            }
            spark(at: peg.position, color: SKColor(red: 0.4, green: 1, blue: 0.6, alpha: 1))
            statusText = "Refresh ×\(restored) · plink \(shotPlink)"

        case .blue, .orange:
            shotPlink += critActive ? 2 : 1
            spark(at: peg.position, color: .white)
            let orange = pegs.filter(\.isOrangeTarget).count
            let litOrange = pegs.filter { $0.kind == .orange && $0.isLit && !$0.isCleared }.count
            let critTag = critActive ? " · CRIT" : ""
            statusText = "\(orange) orange · \(litOrange) lit · plink \(shotPlink)\(critTag)"
        }
        publish()
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

    private func redrawTrail() {
        guard let trailNode else { return }
        trailNode.removeAllChildren()
        let n = trailPoints.count
        for (i, p) in trailPoints.enumerated() {
            let t = CGFloat(i + 1) / CGFloat(max(n, 1))
            let ghost = SKShapeNode(circleOfRadius: ballRadius * (0.35 + t * 0.5))
            ghost.fillColor = SKColor(red: 1, green: 0.92, blue: 0.7, alpha: 0.05 + t * 0.25)
            ghost.strokeColor = .clear
            ghost.position = p
            trailNode.addChild(ghost)
        }
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
            var pos = live.position
            var kickT = CGFloat(ballLastKickAt)
            let h: CGFloat = 1 / 120
            var remaining = frameDt
            var hitFloor = false
            while remaining > 1e-6 {
                let step = min(h, remaining)
                shotAge += TimeInterval(step)
                hitFloor = stepFlight(
                    pos: &pos,
                    vel: &ballVel,
                    dt: step,
                    t: CGFloat(shotAge),
                    lastKickT: &kickT,
                    onPeg: { [weak self] peg in self?.lightPegFromFlight(peg) }
                ) || hitFloor
                remaining -= step
                if hitFloor { break }
            }
            ballLastKickAt = TimeInterval(kickT)
            live.position = pos

            let speed = hypot(ballVel.dx, ballVel.dy)
            if shotAge > 8, speed < 40 {
                phase = .settling
                settleFrames = 0
            }
            if hitFloor, shotAge > 0.35 {
                phase = .settling
                settleFrames = 0
            }
            if trailPoints.last.map({ hypot(pos.x - $0.x, pos.y - $0.y) > 8 }) ?? true {
                trailPoints.append(pos)
                if trailPoints.count > 24 { trailPoints.removeFirst(trailPoints.count - 24) }
                redrawTrail()
            }
            if pos.y < -60 || pos.x < -60 || pos.x > size.width + 60 {
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

    private func publish() {
        let orange = pegs.filter(\.isOrangeTarget).count
        let show = phase == .won || phase == .lost
        onHud?(HudSnapshot(
            levelName: levels[levelIndex].name,
            status: statusText,
            ballsLeft: ballsLeft,
            orangeLeft: orange,
            plink: phase == .flying || phase == .settling ? shotPlink : runPlink,
            critActive: critActive,
            orbName: tuning.orb.name,
            phase: phase,
            showBanner: show,
            bannerTitle: phase == .won ? "Fever!" : (phase == .lost ? "Try again" : ""),
            bannerBody: phase == .won
                ? "Oranges cleared · \(runPlink + shotPlink) plink"
                : (phase == .lost ? "Orange pegs remain · \(runPlink) plink" : ""),
            canAdvance: phase == .won && levelIndex + 1 < levels.count
        ))
    }
}
