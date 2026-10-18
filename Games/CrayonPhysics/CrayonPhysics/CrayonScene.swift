import SpriteKit
import UIKit

/// SpriteKit is the first integration backend, not a claim of Box2D parity.
/// Source geometry is kept independent so the solver can be replaced after tracing.
@MainActor
final class CrayonScene: SKScene {
    let level: SourceLevel
    let sprites: [String: SourceSprite]
    let presentation: Presentation
    var onComplete: (() -> Void)?
    var onCue: ((String) -> Void)?
    var onStrokeStopped: (() -> Void)?
    var eraseMode = false { didSet { cancelStroke() } }
    private var ball: SKNode?
    private var remainingStars: [(SKNode, CGFloat)] = []
    private var bodyNodes: [Int: SKNode] = [:]
    private var drawnNodes: [SKNode] = []
    private var drawingBounds: [ObjectIdentifier: CGRect] = [:]
    private var stroke: [CGPoint] = []
    private var preview = SKShapeNode()
    private weak var activeTouch: UITouch?
    private var finished = false
    private var built = false
    private var cleanupFrames = 0
    private var physicsPointsPerMeter: CGFloat = 1
    private static let physical: UInt32 = 1

    init(level: SourceLevel, sprites: [String: SourceSprite], presentation: Presentation = .vanilla) {
        self.level = level
        self.sprites = sprites
        self.presentation = presentation
        super.init(size: CGSize(width: 800, height: 600))
        backgroundColor = presentation.paper
    }
    required init?(coder aDecoder: NSCoder) { fatalError("Use init(level:sprites:)") }

    override func didMove(to view: SKView) {
        guard !built else { return }
        built = true
        view.isMultipleTouchEnabled = true
        // SpriteKit gravity/forces use SI units while nodes/velocity use scene points.
        // Derive its length conversion from its public area (square meters), rather
        // than assuming a private fixed points-per-meter constant.
        let probe = SKPhysicsBody(rectangleOf: CGSize(width: 100, height: 100))
        physicsPointsPerMeter = sqrt(10000 / probe.area)
        let acceleration = WorldCoordinates.vector(level.gravity)
        physicsWorld.gravity = CGVector(dx: acceleration.dx / physicsPointsPerMeter,
                                        dy: acceleration.dy / physicsPointsPerMeter)
        if let background = makeSprite(level.background) {
            background.position = CGPoint(x: 400, y: 300)
            background.size = size
            background.zPosition = -100
            addChild(background)
        }
        for source in level.bodies { addBody(source) }
        for joint in level.joints {
            guard let first = bodyNodes[joint.body1], let second = bodyNodes[joint.body2],
                  let bodyA = first.physicsBody, let bodyB = second.physicsBody else { continue }
            let local = CGPoint(x: CGFloat(joint.anchor1.x) * WorldCoordinates.scale,
                                y: -CGFloat(joint.anchor1.y) * WorldCoordinates.scale)
            let anchor = first.convert(local, to: self)
            let pin = SKPhysicsJointPin.joint(withBodyA: bodyA, bodyB: bodyB, anchor: anchor)
            physicsWorld.add(pin)
        }
        // The ending contains a deliberately off-screen collectable and no tagged ball.
        if !level.isEnding {
            for source in level.stars {
                let node: SKNode
                if let key = source.sprite, let sprite = makeSprite(key) { node = sprite }
                else { node = starShape() }
                node.position = WorldCoordinates.point(source.position)
                node.zPosition = 10
                addChild(node)
                remainingStars.append((node, CGFloat(source.radius) * WorldCoordinates.scale))
            }
        }
        preview.strokeColor = presentation.ink
        preview.lineWidth = presentation.brushWidth
        preview.strokeTexture = brushTexture()
        preview.zPosition = 50
        addChild(preview)
    }

    private func addBody(_ source: SourceBody) {
        let node = SKNode()
        node.position = WorldCoordinates.point(source.position)
        node.zRotation = -CGFloat(source.rotation)
        node.name = "source-\(source.id)"
        if let key = source.sprite, let art = makeSprite(key) { node.addChild(art) }
        // Static source geometry is already depicted in the background artwork.
        // The XML tag is misleading: source body width is halved in collision code.
        let halfWidth = CGFloat(source.radius.x) * WorldCoordinates.scale / 2
        let halfHeight = CGFloat(source.radius.y) * WorldCoordinates.scale / 2
        let body = source.shape == 1
            ? SKPhysicsBody(circleOfRadius: halfWidth)
            : SKPhysicsBody(rectangleOf: CGSize(width: 2 * halfWidth, height: 2 * halfHeight))
        body.isDynamic = !source.isStatic
        body.friction = CGFloat(source.friction)
        body.restitution = 0
        body.linearDamping = 0
        body.angularDamping = 0
        if !source.isStatic { body.mass = CGFloat(source.mass) }
        body.velocity = WorldCoordinates.vector(source.velocity)
        body.angularVelocity = -CGFloat(source.angularVelocity)
        body.categoryBitMask = Self.physical
        body.collisionBitMask = Self.physical
        body.usesPreciseCollisionDetection = true
        node.physicsBody = body
        addChild(node)
        if !source.isStatic {
            let force = WorldCoordinates.vector(source.force)
            body.applyForce(CGVector(dx: force.dx / physicsPointsPerMeter, dy: force.dy / physicsPointsPerMeter))
            let factor = WorldCoordinates.scale / physicsPointsPerMeter
            body.applyTorque(-CGFloat(source.torque) * factor * factor)
        }
        bodyNodes[source.id] = node
        if source.special == "da_ball" { ball = node }
    }

    private func makeSprite(_ key: String) -> SKSpriteNode? {
        guard let definition = sprites[key],
              let url = GameResources.bundle.url(forResource: presentation.spriteImages[key] ?? definition.image, withExtension: nil),
              let image = UIImage(contentsOfFile: url.path) else { return nil }
        let whole = SKTexture(image: image)
        if let r = definition.rect {
            let bounds = CGRect(x: CGFloat(r.x) / image.size.width,
                                y: CGFloat(1) - CGFloat(r.y + r.h) / image.size.height,
                                width: CGFloat(r.w) / image.size.width, height: CGFloat(r.h) / image.size.height)
            let texture = SKTexture(rect: bounds, in: whole)
            let node = SKSpriteNode(texture: texture, size: CGSize(width: CGFloat(r.w), height: CGFloat(r.h)))
            if !definition.frames.isEmpty {
                let steps = definition.frames.map { frame -> SKAction in
                    let r = frame.rect
                    let crop = CGRect(x: CGFloat(r.x) / image.size.width,
                                      y: CGFloat(1) - CGFloat(r.y + r.h) / image.size.height,
                                      width: CGFloat(r.w) / image.size.width, height: CGFloat(r.h) / image.size.height)
                    return SKAction.sequence([SKAction.setTexture(SKTexture(rect: crop, in: whole)), SKAction.wait(forDuration: frame.duration)])
                }
                node.run(SKAction.repeatForever(SKAction.sequence(steps)))
            }
            return node
        }
        return SKSpriteNode(texture: whole)
    }

    private func starShape() -> SKShapeNode {
        let path = CGMutablePath()
        for index in 0..<10 {
            let angle = CGFloat(index) * .pi / 5 + .pi / 2
            let radius: CGFloat = index.isMultiple(of: 2) ? 18 : 8
            let p = CGPoint(x: cos(angle) * radius, y: sin(angle) * radius)
            if index == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
        let star = SKShapeNode(path: path)
        star.fillColor = .systemYellow
        star.strokeColor = .systemOrange
        return star
    }

    private func brushTexture() -> SKTexture? {
        guard let url = GameResources.bundle.url(forResource: presentation.brushFilename, withExtension: nil),
              let image = UIImage(contentsOfFile: url.path) else { return nil }
        return SKTexture(image: image)
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        // Prefer a reported stylus when several contacts begin together. Generic styluses
        // that report as direct touches still work; hardware palm rejection is unverified.
        guard activeTouch == nil, !finished,
              let touch = touches.first(where: { $0.type == .pencil }) ?? touches.first else { return }
        let p = touch.location(in: self)
        guard frame.contains(p) else { return }
        activeTouch = touch
        if eraseMode { erase(at: p) } else { stroke = [p]; refreshPreview() }
    }
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = activeTouch, touches.contains(touch) else { return }
        if eraseMode { erase(at: touch.location(in: self)); return }
        for sample in event?.coalescedTouches(for: touch) ?? [touch] {
            let p = sample.location(in: self)
            guard frame.contains(p) else { continue }
            if let last = stroke.last, hypot(last.x - p.x, last.y - p.y) < 2 { continue }
            if stroke.count < 4096 { stroke.append(p); onCue?("draw") }
        }
        refreshPreview()
    }
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = activeTouch, touches.contains(touch) else { return }
        if !eraseMode {
            let final = touch.location(in: self)
            if frame.contains(final) { stroke.append(final) }
            commitStroke()
        }
        cancelStroke()
    }
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) { cancelStroke() }
    func cancelStroke() { activeTouch = nil; stroke.removeAll(); preview.path = nil; onStrokeStopped?() }

    private func refreshPreview() {
        let path = CGMutablePath()
        if let first = stroke.first {
            path.move(to: first)
            for point in stroke.dropFirst() { path.addLine(to: point) }
        }
        preview.path = path
    }

    private func commitStroke() {
        guard let rectangle = StrokeRecognizer.recognize(stroke) else { return }
        let bounds = CGRect(x: -rectangle.size.width / 2, y: -rectangle.size.height / 2,
                            width: rectangle.size.width, height: rectangle.size.height)
        let node: SKShapeNode
        // FUN_004d9b00 preserves stroke art only for an unrotated high-score box.
        // Physics still uses the fitted rectangle in both rendering branches.
        if rectangle.angle == 0 && rectangle.score > 0.75 {
            let path = CGMutablePath()
            path.addLines(between: stroke.map {
                CGPoint(x: $0.x - rectangle.center.x, y: $0.y - rectangle.center.y)
            })
            node = SKShapeNode(path: path)
        } else {
            node = SKShapeNode(rect: bounds)
        }
        node.strokeColor = presentation.ink
        node.lineWidth = presentation.brushWidth
        node.strokeTexture = preview.strokeTexture
        node.position = rectangle.center
        node.zRotation = rectangle.angle
        node.zPosition = 20
        // Source emits rectangle bodies. Fitting/raster scoring remains approximate.
        let body = SKPhysicsBody(rectangleOf: rectangle.size)
        // FUN_004c9840: mass = 2 * width * height, in world units.
        body.mass = 2 * rectangle.size.width * rectangle.size.height / (WorldCoordinates.scale * WorldCoordinates.scale)
        body.friction = 0.2
        body.restitution = 0
        body.linearDamping = 0
        body.angularDamping = 0
        body.categoryBitMask = Self.physical
        body.collisionBitMask = Self.physical
        body.usesPreciseCollisionDetection = true
        node.physicsBody = body
        addChild(node)
        drawnNodes.append(node)
        drawingBounds[ObjectIdentifier(node)] = bounds
    }

    private func erase(at point: CGPoint) {
        // FUN_004c99a0 removes the first dynamic body tagged "removeable".
        // Test in local coordinates so rotated drawings do not use a larger AABB.
        guard let index = drawnNodes.firstIndex(where: { node in
            let local = node.convert(point, from: self)
            return drawingBounds[ObjectIdentifier(node)]?.contains(local) == true
        }) else { return }
        let removed = drawnNodes.remove(at: index)
        drawingBounds.removeValue(forKey: ObjectIdentifier(removed))
        removed.removeFromParent()
        onCue?("erase")
    }

    override func didSimulatePhysics() {
        cleanupFrames += 1
        if cleanupFrames > 100 { cleanupFrames = 0; cleanFallenBodies() }
        guard !finished, !level.isEnding, let ball else { return }
        // FUN_004c91f0: strict distance < ball width / 2 + first star radius.
        let ballRadius = CGFloat(level.bodies.first(where: { $0.special == "da_ball" })?.radius.x ?? 0) * WorldCoordinates.scale / 2
        let threshold = ballRadius + (remainingStars.first?.1 ?? 0)
        remainingStars.removeAll { star, radius in
            if hypot(ball.position.x - star.position.x, ball.position.y - star.position.y) < threshold {
                star.removeFromParent()
                onCue?("star")
                return true
            }
            return false
        }
        if remainingStars.isEmpty {
            finished = true
            onComplete?()
        }
    }

    private func cleanFallenBodies() {
        // FUN_004c9360 restores the tagged ball below world Y=15 and removes bodies below Y=30.
        if let ball, ball.position.y < 100 - 15 * WorldCoordinates.scale,
           let source = level.bodies.first(where: { $0.special == "da_ball" }) {
            ball.position = WorldCoordinates.point(source.position)
            ball.physicsBody?.velocity = WorldCoordinates.vector(source.velocity)
            ball.physicsBody?.angularVelocity = -CGFloat(source.angularVelocity)
        }
        let cutoff = 100 - 30 * WorldCoordinates.scale
        for node in bodyNodes.values where node !== ball && node.position.y < cutoff { node.removeFromParent() }
        drawnNodes.removeAll { node in
            if node.position.y < cutoff {
                drawingBounds.removeValue(forKey: ObjectIdentifier(node))
                node.removeFromParent()
                return true
            }
            return false
        }
    }
}
