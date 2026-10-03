import SpriteKit

enum PegKind {
    case blue
    case orange
    /// Crit: multiplies shot plink (retroactive) and powers later hits.
    case crit
    /// Refresh: restores lit blue pegs mid-shot so the board can be hit again.
    case refresh
}

/// Peglin-inspired peg: lights on hit; orange/crit/refresh add board verbs.
final class PegNode: SKShapeNode {
    let kind: PegKind
    private(set) var isLit = false
    private(set) var isCleared = false
    private var lastHitAt: TimeInterval = -1
    private let pegRadius: CGFloat

    /// Surface bounciness multiplier (1 = normal). Rubber slime would sit higher.
    var surfaceBounciness: CGFloat {
        switch kind {
        case .blue, .orange: return 1.0
        case .crit: return 1.05
        case .refresh: return 0.95
        }
    }

    var isOrangeTarget: Bool { kind == .orange && !isCleared }

    init(kind: PegKind, radius: CGFloat, categories: UInt32) {
        self.kind = kind
        self.pegRadius = radius
        super.init()
        path = CGPath(
            ellipseIn: CGRect(x: -radius, y: -radius, width: radius * 2, height: radius * 2),
            transform: nil
        )
        lineWidth = 2.5
        glowWidth = 1
        applyLook()

        let body = SKPhysicsBody(circleOfRadius: radius)
        body.isDynamic = false
        body.affectedByGravity = false
        body.allowsRotation = false
        body.restitution = 0.15
        body.friction = 0.1
        body.categoryBitMask = categories
        body.contactTestBitMask = 1 << 0
        body.collisionBitMask = 0
        physicsBody = body
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @discardableResult
    func light(at time: TimeInterval) -> Bool {
        guard !isCleared, !isLit else { return false }
        if time - lastHitAt < 0.05 { return false }
        lastHitAt = time
        isLit = true
        applyLook()
        run(.sequence([
            .scale(to: 1.2, duration: 0.06),
            .scale(to: 1.0, duration: 0.08),
        ]))
        return true
    }

    /// Refresh restores a lit non-orange peg so it can be hit again this shot.
    func refreshReset() {
        guard !isCleared, isLit, kind != .orange else { return }
        isLit = false
        applyLook()
    }

    func popAway() {
        guard !isCleared else { return }
        isCleared = true
        physicsBody = nil
        let color: SKColor
        switch kind {
        case .orange: color = SKColor(red: 1, green: 0.55, blue: 0.1, alpha: 1)
        case .crit: color = SKColor(red: 1, green: 0.85, blue: 0.2, alpha: 1)
        case .refresh: color = SKColor(red: 0.35, green: 0.95, blue: 0.55, alpha: 1)
        case .blue: color = SKColor(red: 0.4, green: 0.8, blue: 1, alpha: 1)
        }
        run(.sequence([
            .group([
                .scale(to: 1.5, duration: 0.12),
                .fadeOut(withDuration: 0.14),
                .run { [weak self] in
                    self?.fillColor = color
                    self?.glowWidth = 10
                },
            ]),
            .removeFromParent(),
        ]))
    }

    private func applyLook() {
        switch (kind, isLit) {
        case (.blue, false):
            fillColor = SKColor(red: 0.2, green: 0.55, blue: 0.95, alpha: 1)
            strokeColor = SKColor(red: 0.55, green: 0.8, blue: 1, alpha: 1)
            glowWidth = 1
        case (.blue, true):
            fillColor = SKColor(red: 0.55, green: 0.85, blue: 1, alpha: 1)
            strokeColor = .white
            glowWidth = 8
        case (.orange, false):
            fillColor = SKColor(red: 1.0, green: 0.45, blue: 0.08, alpha: 1)
            strokeColor = SKColor(red: 1.0, green: 0.75, blue: 0.25, alpha: 1)
            glowWidth = 2
        case (.orange, true):
            fillColor = SKColor(red: 1.0, green: 0.75, blue: 0.2, alpha: 1)
            strokeColor = .white
            glowWidth = 10
        case (.crit, false):
            fillColor = SKColor(red: 0.95, green: 0.82, blue: 0.15, alpha: 1)
            strokeColor = SKColor(red: 1, green: 0.95, blue: 0.55, alpha: 1)
            glowWidth = 3
        case (.crit, true):
            fillColor = SKColor(red: 1, green: 0.95, blue: 0.45, alpha: 1)
            strokeColor = .white
            glowWidth = 12
        case (.refresh, false):
            fillColor = SKColor(red: 0.2, green: 0.82, blue: 0.45, alpha: 1)
            strokeColor = SKColor(red: 0.55, green: 1, blue: 0.75, alpha: 1)
            glowWidth = 2
        case (.refresh, true):
            fillColor = SKColor(red: 0.55, green: 1, blue: 0.7, alpha: 1)
            strokeColor = .white
            glowWidth = 10
        }
        alpha = 1
    }
}
