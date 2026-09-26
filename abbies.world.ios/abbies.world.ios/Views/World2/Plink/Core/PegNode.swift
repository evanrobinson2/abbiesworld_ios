import SpriteKit

enum PegKind {
    case blue
    case orange
    /// Crit: multiplies shot plink (retroactive) and powers later hits.
    case crit
    /// Refresh: restores lit blue pegs mid-shot so the board can be hit again.
    case refresh
    /// Bomb: no direct points — lights nearby pegs (AOE). Those score 1:1.
    case bomb
    /// Grey stone — dense blockers / clusters; tiny score, no force kick.
    case stone
    /// Gold: coin payout for the voyage shop (prevalence tuned on the run).
    case gold
}

/// Peglin-inspired peg: jewel body + highlight + kind glyph.
final class PegNode: SKShapeNode {
    let kind: PegKind
    private(set) var isLit = false
    private(set) var isCleared = false
    private var lastHitAt: TimeInterval = -1
    private let pegRadius: CGFloat

    private let core = SKShapeNode()
    private let shine = SKShapeNode()
    private let rim = SKShapeNode()
    private let glyph = SKShapeNode()

    /// Pegs never bleed speed — elastic only. Neutral (blue/stone) is worst via zero force kick.
    var surfaceBounciness: CGFloat { 1.0 }

    var isOrangeTarget: Bool { kind == .orange && !isCleared }

    init(kind: PegKind, radius: CGFloat, categories: UInt32) {
        self.kind = kind
        self.pegRadius = radius
        super.init()
        // Transparent outer hit shell — visuals live on children.
        path = CGPath(
            ellipseIn: CGRect(x: -radius, y: -radius, width: radius * 2, height: radius * 2),
            transform: nil
        )
        fillColor = .clear
        strokeColor = .clear
        lineWidth = 0

        buildJewel(radius: radius)
        applyLook()

        let body = SKPhysicsBody(circleOfRadius: radius)
        body.isDynamic = false
        body.affectedByGravity = false
        body.allowsRotation = false
        // Peglin PhysicsMaterial2D: Friction 0, Restitution ≈ 0.8
        body.restitution = 0.8
        body.friction = 0
        body.categoryBitMask = categories
        body.contactTestBitMask = 1 << 0
        body.collisionBitMask = 0
        physicsBody = body
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func buildJewel(radius: CGFloat) {
        core.path = CGPath(
            ellipseIn: CGRect(x: -radius * 0.92, y: -radius * 0.92, width: radius * 1.84, height: radius * 1.84),
            transform: nil
        )
        core.lineWidth = 0
        core.zPosition = 0
        addChild(core)

        rim.path = CGPath(
            ellipseIn: CGRect(x: -radius, y: -radius, width: radius * 2, height: radius * 2),
            transform: nil
        )
        rim.fillColor = .clear
        rim.lineWidth = max(2.0, radius * 0.18)
        rim.zPosition = 2
        addChild(rim)

        let shineR = radius * 0.32
        shine.path = CGPath(
            ellipseIn: CGRect(x: -shineR, y: -shineR, width: shineR * 2, height: shineR * 2),
            transform: nil
        )
        shine.fillColor = SKColor.white.withAlphaComponent(0.55)
        shine.strokeColor = .clear
        shine.position = CGPoint(x: -radius * 0.28, y: radius * 0.32)
        shine.zPosition = 3
        addChild(shine)

        glyph.fillColor = SKColor.white.withAlphaComponent(0.92)
        glyph.strokeColor = .clear
        glyph.zPosition = 4
        glyph.isHidden = true
        addChild(glyph)
        installGlyph(radius: radius)
    }

    private func installGlyph(radius: CGFloat) {
        let s = radius * 0.42
        switch kind {
        case .blue, .orange, .stone:
            glyph.isHidden = true
        case .crit:
            // Soft diamond / star facet.
            let path = CGMutablePath()
            path.move(to: CGPoint(x: 0, y: s))
            path.addLine(to: CGPoint(x: s * 0.7, y: 0))
            path.addLine(to: CGPoint(x: 0, y: -s))
            path.addLine(to: CGPoint(x: -s * 0.7, y: 0))
            path.closeSubpath()
            glyph.path = path
            glyph.isHidden = false
        case .refresh:
            // Plus / leaf spark.
            let path = CGMutablePath()
            let t = s * 0.32
            path.addRect(CGRect(x: -t, y: -s, width: t * 2, height: s * 2))
            path.addRect(CGRect(x: -s, y: -t, width: s * 2, height: t * 2))
            glyph.path = path
            glyph.isHidden = false
        case .bomb:
            glyph.path = CGPath(
                ellipseIn: CGRect(x: -s * 0.55, y: -s * 0.55, width: s * 1.1, height: s * 1.1),
                transform: nil
            )
            glyph.isHidden = false
        case .gold:
            // Coin disc.
            glyph.path = CGPath(
                ellipseIn: CGRect(x: -s * 0.7, y: -s * 0.7, width: s * 1.4, height: s * 1.4),
                transform: nil
            )
            glyph.isHidden = false
        }
    }

    @discardableResult
    func light(at time: TimeInterval) -> Bool {
        guard !isCleared, !isLit else { return false }
        if time - lastHitAt < 0.05 { return false }
        lastHitAt = time
        isLit = true
        applyLook()
        run(.sequence([
            .scale(to: 1.22, duration: 0.06),
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
        let burst = SKShapeNode(circleOfRadius: pegRadius * 1.35)
        burst.fillColor = core.fillColor.withAlphaComponent(0.55)
        burst.strokeColor = .white
        burst.lineWidth = 2
        burst.zPosition = 8
        addChild(burst)
        run(.sequence([
            .group([
                .scale(to: 1.55, duration: 0.12),
                .fadeOut(withDuration: 0.14),
            ]),
            .removeFromParent(),
        ]))
    }

    private func applyLook() {
        let palette = Self.palette(kind: kind, lit: isLit)
        core.fillColor = palette.fill
        rim.strokeColor = palette.rim
        shine.fillColor = SKColor.white.withAlphaComponent(isLit ? 0.75 : 0.45)
        shine.setScale(isLit ? 1.15 : 1.0)
        glyph.fillColor = palette.glyph
        glyph.alpha = kind == .blue || kind == .orange || kind == .stone ? 0 : (isLit ? 1 : 0.85)
        glowWidth = isLit ? palette.glow : max(1, palette.glow * 0.35)
        alpha = 1
    }

    private struct Palette {
        var fill: SKColor
        var rim: SKColor
        var glyph: SKColor
        var glow: CGFloat
    }

    private static func palette(kind: PegKind, lit: Bool) -> Palette {
        switch (kind, lit) {
        case (.blue, false):
            return Palette(
                fill: SKColor(red: 0.22, green: 0.58, blue: 0.98, alpha: 1),
                rim: SKColor(red: 0.7, green: 0.9, blue: 1, alpha: 1),
                glyph: .white,
                glow: 2
            )
        case (.blue, true):
            return Palette(
                fill: SKColor(red: 0.65, green: 0.9, blue: 1, alpha: 1),
                rim: .white,
                glyph: .white,
                glow: 10
            )
        case (.stone, false):
            return Palette(
                fill: SKColor(red: 0.42, green: 0.46, blue: 0.52, alpha: 1),
                rim: SKColor(red: 0.72, green: 0.76, blue: 0.82, alpha: 1),
                glyph: .white,
                glow: 1
            )
        case (.stone, true):
            return Palette(
                fill: SKColor(red: 0.58, green: 0.62, blue: 0.68, alpha: 1),
                rim: .white,
                glyph: .white,
                glow: 6
            )
        case (.orange, false):
            return Palette(
                fill: SKColor(red: 1.0, green: 0.48, blue: 0.12, alpha: 1),
                rim: SKColor(red: 1.0, green: 0.82, blue: 0.35, alpha: 1),
                glyph: .white,
                glow: 3
            )
        case (.orange, true):
            return Palette(
                fill: SKColor(red: 1.0, green: 0.78, blue: 0.28, alpha: 1),
                rim: .white,
                glyph: .white,
                glow: 12
            )
        case (.crit, false):
            return Palette(
                fill: SKColor(red: 0.98, green: 0.84, blue: 0.18, alpha: 1),
                rim: SKColor(red: 1, green: 0.96, blue: 0.65, alpha: 1),
                glyph: SKColor(red: 0.55, green: 0.35, blue: 0.05, alpha: 1),
                glow: 4
            )
        case (.crit, true):
            return Palette(
                fill: SKColor(red: 1, green: 0.95, blue: 0.5, alpha: 1),
                rim: .white,
                glyph: SKColor(red: 0.75, green: 0.45, blue: 0.05, alpha: 1),
                glow: 14
            )
        case (.refresh, false):
            return Palette(
                fill: SKColor(red: 0.22, green: 0.86, blue: 0.48, alpha: 1),
                rim: SKColor(red: 0.65, green: 1, blue: 0.8, alpha: 1),
                glyph: .white,
                glow: 3
            )
        case (.refresh, true):
            return Palette(
                fill: SKColor(red: 0.55, green: 1, blue: 0.72, alpha: 1),
                rim: .white,
                glyph: SKColor(red: 0.08, green: 0.45, blue: 0.22, alpha: 1),
                glow: 12
            )
        case (.bomb, false):
            return Palette(
                fill: SKColor(red: 0.32, green: 0.12, blue: 0.2, alpha: 1),
                rim: SKColor(red: 1.0, green: 0.48, blue: 0.22, alpha: 1),
                glyph: SKColor(red: 1.0, green: 0.55, blue: 0.25, alpha: 1),
                glow: 5
            )
        case (.bomb, true):
            return Palette(
                fill: SKColor(red: 1.0, green: 0.42, blue: 0.18, alpha: 1),
                rim: .white,
                glyph: .white,
                glow: 16
            )
        case (.gold, false):
            return Palette(
                fill: SKColor(red: 1.0, green: 0.78, blue: 0.18, alpha: 1),
                rim: SKColor(red: 1.0, green: 0.95, blue: 0.55, alpha: 1),
                glyph: SKColor(red: 0.55, green: 0.35, blue: 0.05, alpha: 1),
                glow: 8
            )
        case (.gold, true):
            return Palette(
                fill: SKColor(red: 1.0, green: 0.92, blue: 0.45, alpha: 1),
                rim: .white,
                glyph: SKColor(red: 0.75, green: 0.5, blue: 0.08, alpha: 1),
                glow: 18
            )
        }
    }
}
