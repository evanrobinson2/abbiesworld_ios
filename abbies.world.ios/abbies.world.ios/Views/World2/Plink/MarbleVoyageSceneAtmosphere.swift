import SwiftUI

/// Leaf / mote / shaft embellishments that adapt to the active voyage scene.
/// Faux-parallax: `parallax` shifts near leaves more than far ones (Canvas depths).
struct MarbleVoyageSceneAtmosphere: View {
    enum Mood: Equatable, Sendable {
        case titleSkyDock
        case titleCoral
        case titlePink
        case titleMeadow
        case climb
        case fox
        case bramble
        case stag
        case bizarro
        case shrine
        case treasure
        case mystery
        case victory
        case defeat

        static func titlePlate(_ plate: MarbleVoyageTitlePlate) -> Mood {
            switch plate {
            case .skyDock: return .titleSkyDock
            case .coralCliffs: return .titleCoral
            case .pinkGrove: return .titlePink
            case .skyMeadow: return .titleMeadow
            }
        }

        static func enemy(_ kind: PeglinEnemyKind?) -> Mood {
            switch kind {
            case .foxSpirit, .burrowJackal: return .fox
            case .brambleSpirit: return .bramble
            case .stagSpirit: return .stag
            case .bizarroAbbie: return .bizarro
            case nil: return .climb
            }
        }

        static func node(_ kind: MarbleVoyageNodeKind) -> Mood {
            switch kind {
            case .start, .fight: return .climb
            case .shrine: return .shrine
            case .treasure: return .treasure
            case .mystery: return .mystery
            case .boss: return .bizarro
            }
        }

        var palette: [Color] {
            switch self {
            case .titleSkyDock, .climb:
                return [
                    Color(red: 0.45, green: 0.78, blue: 0.38),
                    Color(red: 0.95, green: 0.78, blue: 0.28),
                    Color(red: 0.55, green: 0.72, blue: 0.32),
                    Color(red: 0.85, green: 0.55, blue: 0.22),
                    Color(red: 0.72, green: 0.88, blue: 0.45),
                ]
            case .titleCoral:
                return [
                    Color(red: 0.95, green: 0.45, blue: 0.38),
                    Color(red: 0.25, green: 0.72, blue: 0.78),
                    Color(red: 1.0, green: 0.72, blue: 0.42),
                    Color(red: 0.95, green: 0.55, blue: 0.55),
                ]
            case .titlePink:
                return [
                    Color(red: 0.95, green: 0.55, blue: 0.72),
                    Color(red: 0.65, green: 0.85, blue: 0.45),
                    Color(red: 0.88, green: 0.42, blue: 0.62),
                    Color(red: 0.95, green: 0.78, blue: 0.55),
                ]
            case .titleMeadow:
                return [
                    Color(red: 0.55, green: 0.85, blue: 0.55),
                    Color(red: 0.45, green: 0.72, blue: 0.95),
                    Color(red: 0.95, green: 0.88, blue: 0.45),
                    Color(red: 0.72, green: 0.92, blue: 0.65),
                ]
            case .fox:
                return [
                    Color(red: 0.95, green: 0.48, blue: 0.22),
                    Color(red: 0.85, green: 0.32, blue: 0.18),
                    Color(red: 0.98, green: 0.78, blue: 0.35),
                    Color(red: 0.72, green: 0.42, blue: 0.22),
                ]
            case .bramble:
                return [
                    Color(red: 0.35, green: 0.55, blue: 0.28),
                    Color(red: 0.55, green: 0.32, blue: 0.55),
                    Color(red: 0.72, green: 0.45, blue: 0.55),
                    Color(red: 0.28, green: 0.42, blue: 0.22),
                ]
            case .stag:
                return [
                    Color(red: 0.42, green: 0.58, blue: 0.32),
                    Color(red: 0.72, green: 0.55, blue: 0.28),
                    Color(red: 0.55, green: 0.42, blue: 0.25),
                    Color(red: 0.85, green: 0.75, blue: 0.4),
                ]
            case .bizarro:
                return [
                    Color(red: 0.95, green: 0.25, blue: 0.65),
                    Color(red: 0.35, green: 0.55, blue: 1.0),
                    Color(red: 0.85, green: 0.35, blue: 0.95),
                    Color(red: 0.45, green: 0.95, blue: 0.85),
                ]
            case .shrine:
                return [
                    Color(red: 0.55, green: 0.92, blue: 0.75),
                    Color(red: 0.95, green: 0.92, blue: 0.75),
                    Color(red: 0.65, green: 0.85, blue: 0.95),
                    Color(red: 0.85, green: 0.78, blue: 0.45),
                ]
            case .treasure:
                return [
                    Color(red: 1.0, green: 0.82, blue: 0.25),
                    Color(red: 0.95, green: 0.65, blue: 0.18),
                    Color(red: 0.85, green: 0.55, blue: 0.15),
                    Color(red: 1.0, green: 0.92, blue: 0.55),
                ]
            case .mystery:
                return [
                    Color(red: 0.55, green: 0.42, blue: 0.92),
                    Color(red: 0.72, green: 0.55, blue: 0.95),
                    Color(red: 0.35, green: 0.55, blue: 0.85),
                    Color(red: 0.85, green: 0.65, blue: 0.95),
                ]
            case .victory:
                return [
                    Color(red: 0.45, green: 0.95, blue: 0.55),
                    Color(red: 1.0, green: 0.88, blue: 0.35),
                    Color(red: 0.65, green: 0.9, blue: 1.0),
                ]
            case .defeat:
                return [
                    Color(red: 0.55, green: 0.28, blue: 0.32),
                    Color(red: 0.35, green: 0.32, blue: 0.42),
                    Color(red: 0.65, green: 0.4, blue: 0.35),
                ]
            }
        }

        var shaftTint: Color {
            switch self {
            case .bizarro: return Color(red: 0.85, green: 0.45, blue: 1.0)
            case .fox, .treasure: return Color(red: 1.0, green: 0.75, blue: 0.35)
            case .shrine, .victory: return Color(red: 0.75, green: 0.95, blue: 0.85)
            case .titleCoral: return Color(red: 1.0, green: 0.65, blue: 0.45)
            case .titlePink: return Color(red: 1.0, green: 0.7, blue: 0.85)
            default: return Color(red: 1, green: 0.9, blue: 0.65)
            }
        }

        var moteTint: Color {
            switch self {
            case .bizarro: return Color(red: 0.9, green: 0.7, blue: 1.0)
            case .mystery: return Color(red: 0.8, green: 0.75, blue: 1.0)
            default: return Color(red: 1, green: 0.95, blue: 0.7)
            }
        }
    }

    var mood: Mood
    /// Screen-space faux-parallax (points). Near leaves follow more than far ones.
    var parallax: CGSize = .zero
    var reduceMotion: Bool
    var intensity: Double = 1
    var seed: UInt64 = 42
    /// Briefly boosts leaf opacity after a mood switch (scene change “whoosh”).
    var transitionBoost: Double = 0

    private struct Leaf: Identifiable {
        let id: Int
        let x0: CGFloat
        let size: CGFloat
        let drift: CGFloat
        let spin: Double
        let duration: Double
        let delay: Double
        let depth: CGFloat
        let paletteIndex: Int
    }

    private struct Mote: Identifiable {
        let id: Int
        let x: CGFloat
        let y: CGFloat
        let size: CGFloat
        let duration: Double
        let delay: Double
        let depth: CGFloat
    }

    private let leaves: [Leaf]
    private let motes: [Mote]

    init(
        mood: Mood,
        parallax: CGSize = .zero,
        reduceMotion: Bool,
        intensity: Double = 1,
        seed: UInt64 = 42,
        transitionBoost: Double = 0
    ) {
        self.mood = mood
        self.parallax = parallax
        self.reduceMotion = reduceMotion
        self.intensity = intensity
        self.seed = seed
        self.transitionBoost = transitionBoost
        var rng = SeededGenerator(seed: seed)
        leaves = (0..<30).map { i in
            Leaf(
                id: i,
                x0: CGFloat.random(in: -0.08...1.08, using: &rng),
                size: CGFloat.random(in: 9...28, using: &rng),
                drift: CGFloat.random(in: -0.2...0.22, using: &rng),
                spin: Double.random(in: 110...440, using: &rng),
                duration: Double.random(in: 8...17, using: &rng),
                delay: Double.random(in: 0...11, using: &rng),
                depth: CGFloat.random(in: 0.12...1.0, using: &rng),
                paletteIndex: Int.random(in: 0...7, using: &rng)
            )
        }
        motes = (0..<16).map { i in
            Mote(
                id: i,
                x: CGFloat.random(in: 0.04...0.96, using: &rng),
                y: CGFloat.random(in: 0.06...0.88, using: &rng),
                size: CGFloat.random(in: 2.2...6.2, using: &rng),
                duration: Double.random(in: 2.2...5.2, using: &rng),
                delay: Double.random(in: 0...4, using: &rng),
                depth: CGFloat.random(in: 0.2...1.0, using: &rng)
            )
        }
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: reduceMotion ? 1.0 / 10.0 : 1.0 / 28.0)) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            Canvas { context, size in
                let boost = 1.0 + transitionBoost * 0.55
                let gain = intensity * boost * (reduceMotion ? 0.45 : 1.0)
                drawLightShafts(context: &context, size: size, t: t, gain: gain)
                drawMotes(context: &context, size: size, t: t, gain: gain)
                drawLeaves(context: &context, size: size, t: t, gain: gain)
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func drawLightShafts(context: inout GraphicsContext, size: CGSize, t: Double, gain: Double) {
        let pulse = 0.55 + 0.45 * sin(t * 0.55)
        let px = parallax.width * 0.25
        for i in 0..<4 {
            let phase = Double(i) * 0.7
            let sway = sin(t * 0.35 + phase) * 28 + Double(px)
            var path = Path()
            let topX = size.width * (0.08 + CGFloat(i) * 0.07) + sway
            path.move(to: CGPoint(x: topX, y: -20))
            path.addLine(to: CGPoint(x: topX + 36, y: -20))
            path.addLine(to: CGPoint(x: topX + size.width * 0.22, y: size.height * 0.72))
            path.addLine(to: CGPoint(x: topX + size.width * 0.12, y: size.height * 0.72))
            path.closeSubpath()
            context.fill(
                path,
                with: .linearGradient(
                    Gradient(colors: [
                        Color.white.opacity(0.14 * pulse * gain),
                        mood.shaftTint.opacity(0.05 * gain),
                        .clear,
                    ]),
                    startPoint: CGPoint(x: topX, y: 0),
                    endPoint: CGPoint(x: topX, y: size.height * 0.7)
                )
            )
        }
    }

    private func drawMotes(context: inout GraphicsContext, size: CGSize, t: Double, gain: Double) {
        for mote in motes {
            let life = (t + mote.delay) / mote.duration
            let phase = life - floor(life)
            let bob = sin(t * 1.4 + Double(mote.id)) * 10
            // Far = less parallax (depth→1), near = more (depth→0).
            let shiftX = parallax.width * (1.15 - mote.depth)
            let shiftY = parallax.height * (1.15 - mote.depth) * 0.65
            let alpha = sin(phase * .pi) * 0.5 * gain
            let rect = CGRect(
                x: mote.x * size.width - mote.size / 2 + shiftX,
                y: mote.y * size.height + bob - mote.size / 2 + shiftY,
                width: mote.size,
                height: mote.size
            )
            context.fill(Path(ellipseIn: rect), with: .color(mood.moteTint.opacity(alpha)))
            context.fill(
                Path(ellipseIn: rect.insetBy(dx: -mote.size * 0.55, dy: -mote.size * 0.55)),
                with: .color(Color.white.opacity(alpha * 0.2))
            )
        }
    }

    private func drawLeaves(context: inout GraphicsContext, size: CGSize, t: Double, gain: Double) {
        let palette = mood.palette
        guard !palette.isEmpty else { return }
        for leaf in leaves {
            let life = (t + leaf.delay) / leaf.duration
            let phase = life - floor(life)
            let y = -0.12 + CGFloat(phase) * 1.28
            let x = leaf.x0 + leaf.drift * sin(CGFloat(phase) * .pi * 2) * (0.55 + leaf.depth * 0.5)
            let angle = leaf.spin * phase + Double(leaf.id) * 17
            let scale = 0.75 + 0.35 * leaf.depth
            let opacity = Double((1.05 - leaf.depth) * 0.82)
                * Double(min(1, max(0, sin(phase * .pi) * 1.15)))
                * gain
            let tint = palette[leaf.paletteIndex % palette.count]
            // Near leaves (low depth) ride the parallax harder — faux depth.
            let shiftX = parallax.width * (1.25 - leaf.depth)
            let shiftY = parallax.height * (1.25 - leaf.depth) * 0.7

            var transform = CGAffineTransform.identity
            transform = transform.translatedBy(
                x: x * size.width + shiftX,
                y: y * size.height + shiftY
            )
            transform = transform.rotated(by: CGFloat(angle * .pi / 180))
            transform = transform.scaledBy(x: scale, y: scale)

            var leafPath = Path()
            leafPath.move(to: CGPoint(x: 0, y: -leaf.size * 0.55))
            leafPath.addQuadCurve(
                to: CGPoint(x: 0, y: leaf.size * 0.55),
                control: CGPoint(x: leaf.size * 0.55, y: 0)
            )
            leafPath.addQuadCurve(
                to: CGPoint(x: 0, y: -leaf.size * 0.55),
                control: CGPoint(x: -leaf.size * 0.55, y: 0)
            )
            leafPath.closeSubpath()

            context.fill(leafPath.applying(transform), with: .color(tint.opacity(opacity)))
            var vein = Path()
            vein.move(to: CGPoint(x: 0, y: -leaf.size * 0.4))
            vein.addLine(to: CGPoint(x: 0, y: leaf.size * 0.35))
            context.stroke(
                vein.applying(transform),
                with: .color(Color.black.opacity(opacity * 0.22)),
                lineWidth: 1
            )
        }
    }
}

/// Tracks climb ScrollView offset for faux-parallax overlays.
struct MarbleVoyageClimbScrollOffsetKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}
