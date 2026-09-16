//
//  World2AtelierParticleField.swift
//  abbies.world.ios
//
//  Runtime particle generator for Imagination Atelier creation VFX.
//
//  Midjourney cannot ship reliable effect plates (P3.7). These effects are
//  drawn every frame instead — deterministic, Reduce Motion aware, and tuned
//  for a six-year-old watching a character get made.
//

import SwiftUI

/// Presets that match the P3.7 creation-effect list, plus a few atelier combos.
enum World2AtelierEffectKind: String, CaseIterable, Identifiable, Sendable {
    case spiralingSparkles
    case magicalSmoke
    case rainbowRibbon
    case glowingStars
    case transformationRing
    case risingBubbles
    case confettiBurst
    case revealAura
    /// Soft glow that can sit behind a carved handheld icon.
    case itemAura
    /// Busy chamber energy for the "creation in progress" screen.
    case creationChamber

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .spiralingSparkles: return "Spiraling Sparkles"
        case .magicalSmoke: return "Magical Smoke"
        case .rainbowRibbon: return "Rainbow Ribbon"
        case .glowingStars: return "Tiny Glowing Stars"
        case .transformationRing: return "Transformation Ring"
        case .risingBubbles: return "Rising Bubbles"
        case .confettiBurst: return "Confetti Burst"
        case .revealAura: return "Reveal Aura"
        case .itemAura: return "Item Aura"
        case .creationChamber: return "Creation Chamber"
        }
    }
}

/// Palette tokens for atelier magic — warm brass + pink/violet/turquoise cream.
enum World2AtelierParticlePalette {
    static let atelier: [Color] = [
        Color(red: 0.98, green: 0.72, blue: 0.28), // brass gold
        Color(red: 0.95, green: 0.45, blue: 0.62), // pink
        Color(red: 0.62, green: 0.42, blue: 0.92), // violet
        Color(red: 0.25, green: 0.82, blue: 0.78), // turquoise
        Color(red: 0.98, green: 0.92, blue: 0.72), // cream
        Color(red: 1.00, green: 0.55, blue: 0.22), // orange glow
    ]

    static let cool: [Color] = [
        Color(red: 0.45, green: 0.85, blue: 1.00),
        Color(red: 0.70, green: 0.55, blue: 1.00),
        Color(red: 0.95, green: 0.95, blue: 1.00),
        Color(red: 0.30, green: 0.95, blue: 0.85),
    ]

    static let warm: [Color] = [
        Color(red: 1.00, green: 0.75, blue: 0.25),
        Color(red: 1.00, green: 0.45, blue: 0.20),
        Color(red: 1.00, green: 0.90, blue: 0.55),
        Color(red: 0.95, green: 0.55, blue: 0.70),
    ]
}

private struct AtelierParticle: Identifiable {
    let id: Int
    let seed: Double
    let orbit: Double
    let speed: Double
    let size: CGFloat
    let colorIndex: Int
    let shape: ShapeKind

    enum ShapeKind: Int {
        case dot
        case star
        case flake
        case ribbon
        case puff
        case bubble
    }
}

/// Full-bleed or inset particle field. Pass a kind + optional tint palette.
struct World2AtelierParticleField: View {
    let kind: World2AtelierEffectKind
    var intensity: Double = 1.0
    var palette: [Color] = World2AtelierParticlePalette.atelier
    var isAnimated: Bool = true
    /// 0…1 normalized anchor for effects that orbit a point (default center).
    var anchor: UnitPoint = .center

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var particles: [AtelierParticle] {
        Self.bake(kind: kind, count: particleCount)
    }

    private var particleCount: Int {
        let base: Int
        switch kind {
        case .spiralingSparkles: base = 48
        case .magicalSmoke: base = 36
        case .rainbowRibbon: base = 28
        case .glowingStars: base = 40
        case .transformationRing: base = 42
        case .risingBubbles: base = 32
        case .confettiBurst: base = 64
        case .revealAura: base = 56
        case .itemAura: base = 24
        case .creationChamber: base = 72
        }
        return max(8, Int(Double(base) * intensity.clamped(to: 0.25...1.75)))
    }

    var body: some View {
        let animate = isAnimated && !reduceMotion
        TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: !animate)) { timeline in
            let time = animate
                ? timeline.date.timeIntervalSinceReferenceDate
                : 0
            Canvas { context, size in
                draw(
                    context: &context,
                    size: size,
                    time: time,
                    particles: particles
                )
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .accessibilityIdentifier("world2.atelier.particles.\(kind.rawValue)")
    }

    private func draw(
        context: inout GraphicsContext,
        size: CGSize,
        time: TimeInterval,
        particles: [AtelierParticle]
    ) {
        let origin = CGPoint(x: size.width * anchor.x, y: size.height * anchor.y)
        let scale = min(size.width, size.height)

        switch kind {
        case .revealAura, .itemAura, .creationChamber:
            drawAuraBloom(context: &context, origin: origin, scale: scale, time: time)
        default:
            break
        }

        for particle in particles {
            let point = position(
                for: particle,
                origin: origin,
                size: size,
                scale: scale,
                time: time
            )
            let opacity = opacity(for: particle, time: time)
            guard opacity > 0.02 else { continue }
            let color = palette[particle.colorIndex % palette.count].opacity(opacity)
            let radius = particle.size * CGFloat(intensity.clamped(to: 0.5...1.6))

            switch particle.shape {
            case .dot:
                let path = Path(
                    ellipseIn: CGRect(
                        x: point.x - radius * 0.5,
                        y: point.y - radius * 0.5,
                        width: radius,
                        height: radius
                    )
                )
                context.fill(path, with: .color(color))
            case .star:
                drawStar(
                    context: &context,
                    center: point,
                    radius: radius,
                    rotation: time * particle.speed + particle.seed,
                    color: color
                )
            case .flake:
                let rect = CGRect(
                    x: point.x - radius * 0.35,
                    y: point.y - radius * 0.55,
                    width: radius * 0.7,
                    height: radius * 1.1
                )
                var flipped = context
                flipped.translateBy(x: point.x, y: point.y)
                flipped.rotate(by: .radians(time * particle.speed + particle.seed))
                flipped.translateBy(x: -point.x, y: -point.y)
                flipped.fill(
                    Path(roundedRect: rect, cornerRadius: 1.5),
                    with: .color(color)
                )
            case .ribbon:
                var path = Path()
                let amp = radius * 2.2
                path.move(to: CGPoint(x: point.x - amp, y: point.y))
                path.addQuadCurve(
                    to: CGPoint(x: point.x + amp, y: point.y),
                    control: CGPoint(
                        x: point.x,
                        y: point.y + sin(time * 2 + particle.seed) * amp
                    )
                )
                context.stroke(
                    path,
                    with: .color(color),
                    style: StrokeStyle(lineWidth: max(2, radius * 0.35), lineCap: .round)
                )
            case .puff:
                let path = Path(
                    ellipseIn: CGRect(
                        x: point.x - radius,
                        y: point.y - radius * 0.7,
                        width: radius * 2,
                        height: radius * 1.4
                    )
                )
                context.fill(path, with: .color(color.opacity(opacity * 0.55)))
            case .bubble:
                let rect = CGRect(
                    x: point.x - radius * 0.5,
                    y: point.y - radius * 0.5,
                    width: radius,
                    height: radius
                )
                context.stroke(
                    Path(ellipseIn: rect),
                    with: .color(color),
                    lineWidth: max(1.2, radius * 0.12)
                )
                let highlight = Path(
                    ellipseIn: CGRect(
                        x: point.x - radius * 0.18,
                        y: point.y - radius * 0.22,
                        width: radius * 0.22,
                        height: radius * 0.18
                    )
                )
                context.fill(highlight, with: .color(Color.white.opacity(opacity * 0.7)))
            }
        }

        if kind == .transformationRing || kind == .creationChamber {
            drawRing(context: &context, origin: origin, scale: scale, time: time)
        }
    }

    private func drawAuraBloom(
        context: inout GraphicsContext,
        origin: CGPoint,
        scale: CGFloat,
        time: TimeInterval
    ) {
        let pulse = 0.85 + 0.15 * sin(time * 1.6)
        let radius = scale * (kind == .itemAura ? 0.28 : 0.42) * pulse * intensity
        let colors: [Color]
        switch kind {
        case .itemAura:
            colors = [
                palette[0].opacity(0.0),
                palette[0].opacity(0.22),
                palette[min(3, palette.count - 1)].opacity(0.08),
            ]
        default:
            colors = [
                Color.white.opacity(0.0),
                palette[3 % palette.count].opacity(0.18),
                palette[1 % palette.count].opacity(0.28),
                palette[0].opacity(0.12),
            ]
        }
        context.fill(
            Path(ellipseIn: CGRect(
                x: origin.x - radius,
                y: origin.y - radius,
                width: radius * 2,
                height: radius * 2
            )),
            with: .radialGradient(
                Gradient(colors: colors),
                center: origin,
                startRadius: 0,
                endRadius: radius
            )
        )
    }

    private func drawRing(
        context: inout GraphicsContext,
        origin: CGPoint,
        scale: CGFloat,
        time: TimeInterval
    ) {
        let radius = scale * (0.22 + 0.04 * sin(time * 2.1)) * intensity
        let path = Path(
            ellipseIn: CGRect(
                x: origin.x - radius,
                y: origin.y - radius,
                width: radius * 2,
                height: radius * 2
            )
        )
        context.stroke(
            path,
            with: .color(palette[3 % palette.count].opacity(0.75)),
            style: StrokeStyle(lineWidth: 4, lineCap: .round, dash: [10, 8])
        )
    }

    private func drawStar(
        context: inout GraphicsContext,
        center: CGPoint,
        radius: CGFloat,
        rotation: Double,
        color: Color
    ) {
        var path = Path()
        for i in 0..<8 {
            let angle = rotation + Double(i) * .pi / 4
            let r = i.isMultiple(of: 2) ? radius : radius * 0.38
            let point = CGPoint(
                x: center.x + CGFloat(cos(angle)) * r,
                y: center.y + CGFloat(sin(angle)) * r
            )
            if i == 0 {
                path.move(to: point)
            } else {
                path.addLine(to: point)
            }
        }
        path.closeSubpath()
        context.fill(path, with: .color(color))
    }

    private func position(
        for particle: AtelierParticle,
        origin: CGPoint,
        size: CGSize,
        scale: CGFloat,
        time: TimeInterval
    ) -> CGPoint {
        let t = time * particle.speed + particle.seed
        switch kind {
        case .spiralingSparkles, .creationChamber:
            let radius = scale * (0.08 + particle.orbit * 0.38)
            let angle = t * 1.4 + particle.orbit * .pi * 2
            return CGPoint(
                x: origin.x + CGFloat(cos(angle)) * radius,
                y: origin.y + CGFloat(sin(angle)) * radius * 0.92
            )
        case .magicalSmoke:
            let drift = (t * 0.08).truncatingRemainder(dividingBy: 1.0)
            return CGPoint(
                x: origin.x
                    + CGFloat(sin(t * 0.9 + particle.seed) * 0.18) * size.width
                    + CGFloat(particle.orbit - 0.5) * size.width * 0.35,
                y: origin.y + size.height * 0.28 - CGFloat(drift) * size.height * 0.7
            )
        case .rainbowRibbon:
            let x = size.width * (0.08 + particle.orbit * 0.84)
            let y = origin.y
                + CGFloat(sin(t * 1.6 + particle.orbit * 6)) * scale * 0.18
            return CGPoint(x: x, y: y)
        case .glowingStars, .revealAura, .itemAura:
            let radius = scale * (0.05 + particle.orbit * 0.45)
            let angle = particle.seed * .pi * 2 + t * 0.35
            let wobble = sin(t * 2.2 + particle.seed) * 0.04 * scale
            return CGPoint(
                x: origin.x + CGFloat(cos(angle)) * radius,
                y: origin.y + CGFloat(sin(angle)) * radius + CGFloat(wobble)
            )
        case .transformationRing:
            let radius = scale * (0.2 + 0.05 * sin(t))
            let angle = particle.orbit * .pi * 2 + t * 1.1
            return CGPoint(
                x: origin.x + CGFloat(cos(angle)) * radius,
                y: origin.y + CGFloat(sin(angle)) * radius
            )
        case .risingBubbles:
            let cycle = (t * 0.12 + particle.orbit).truncatingRemainder(dividingBy: 1.0)
            return CGPoint(
                x: origin.x
                    + CGFloat(particle.orbit - 0.5) * size.width * 0.55
                    + CGFloat(sin(t + particle.seed) * 12),
                y: size.height * (1.05 - cycle * 1.2)
            )
        case .confettiBurst:
            let cycle = (t * 0.18 + particle.orbit).truncatingRemainder(dividingBy: 1.0)
            return CGPoint(
                x: size.width * particle.orbit
                    + CGFloat(sin(t * 1.4 + particle.seed) * 18),
                y: size.height * (cycle * 1.2 - 0.1)
            )
        }
    }

    private func opacity(for particle: AtelierParticle, time: TimeInterval) -> Double {
        let t = time * particle.speed + particle.seed
        switch kind {
        case .magicalSmoke:
            let cycle = (t * 0.08).truncatingRemainder(dividingBy: 1.0)
            return (1 - cycle) * 0.55
        case .risingBubbles, .confettiBurst:
            let cycle = (t * 0.15 + particle.orbit).truncatingRemainder(dividingBy: 1.0)
            if cycle < 0.1 { return cycle / 0.1 }
            if cycle > 0.85 { return (1 - cycle) / 0.15 }
            return 0.9
        case .itemAura:
            return 0.35 + 0.25 * (0.5 + 0.5 * sin(t * 2))
        default:
            return 0.45 + 0.45 * (0.5 + 0.5 * sin(t * 1.7 + particle.seed))
        }
    }

    private static func bake(kind: World2AtelierEffectKind, count: Int) -> [AtelierParticle] {
        var generator = World2SeededGenerator(seed: UInt64(kind.rawValue.hashValue) &+ 0xA7E11E)
        return (0..<count).map { index in
            let shape: AtelierParticle.ShapeKind
            switch kind {
            case .spiralingSparkles, .glowingStars, .revealAura, .itemAura, .creationChamber:
                shape = index.isMultiple(of: 3) ? .star : .dot
            case .magicalSmoke:
                shape = .puff
            case .rainbowRibbon:
                shape = .ribbon
            case .transformationRing:
                shape = index.isMultiple(of: 2) ? .star : .dot
            case .risingBubbles:
                shape = .bubble
            case .confettiBurst:
                shape = .flake
            }
            return AtelierParticle(
                id: index,
                seed: Double.random(in: 0...6.28, using: &generator),
                orbit: Double.random(in: 0...1, using: &generator),
                speed: Double.random(in: 0.55...1.45, using: &generator),
                size: CGFloat.random(in: 4...14, using: &generator),
                colorIndex: index,
                shape: shape
            )
        }
    }
}

private extension Double {
    func clamped(to range: ClosedRange<Double>) -> Double {
        min(max(self, range.lowerBound), range.upperBound)
    }
}

/// Debug / lab screen so effects can be inspected without Midjourney plates.
struct World2AtelierEffectLabView: View {
    let onClose: () -> Void
    @State private var selected: World2AtelierEffectKind = .creationChamber
    @State private var intensity: Double = 1.0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.12, green: 0.10, blue: 0.18),
                    Color(red: 0.22, green: 0.16, blue: 0.12),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            World2AtelierParticleField(
                kind: selected,
                intensity: intensity,
                palette: palette(for: selected),
                isAnimated: !reduceMotion
            )
            .ignoresSafeArea()

            VStack(spacing: 14) {
                HStack {
                    Button(action: onClose) {
                        Label("Close", systemImage: "xmark")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(.black.opacity(0.65), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.atelier.effectLab.close")

                    Spacer()

                    Text(selected.displayName)
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(.black.opacity(0.5), in: Capsule())
                }
                .padding(.horizontal, 18)
                .padding(.top, 16)

                Spacer()

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(World2AtelierEffectKind.allCases) { kind in
                            Button {
                                selected = kind
                            } label: {
                                Text(kind.displayName)
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 10)
                                    .background(
                                        selected == kind
                                            ? Color.orange.opacity(0.9)
                                            : Color.white.opacity(0.18),
                                        in: Capsule()
                                    )
                            }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier("world2.atelier.effectLab.\(kind.rawValue)")
                        }
                    }
                    .padding(.horizontal, 18)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Intensity")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.8))
                    Slider(value: $intensity, in: 0.4...1.6)
                        .tint(.orange)
                }
                .padding(14)
                .background(.black.opacity(0.45), in: RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal, 18)
                .padding(.bottom, 22)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.atelier.effectLab")
    }

    private func palette(for kind: World2AtelierEffectKind) -> [Color] {
        switch kind {
        case .risingBubbles, .transformationRing:
            return World2AtelierParticlePalette.cool
        case .confettiBurst, .rainbowRibbon:
            return World2AtelierParticlePalette.atelier
        case .magicalSmoke:
            return [
                Color.white.opacity(0.9),
                Color(red: 0.85, green: 0.75, blue: 1.0),
                Color(red: 0.7, green: 0.85, blue: 1.0),
            ]
        default:
            return World2AtelierParticlePalette.warm + World2AtelierParticlePalette.atelier
        }
    }
}

#Preview("Creation Chamber") {
    World2AtelierParticleField(kind: .creationChamber)
        .background(Color.black)
}

#Preview("Effect Lab") {
    World2AtelierEffectLabView(onClose: {})
}
