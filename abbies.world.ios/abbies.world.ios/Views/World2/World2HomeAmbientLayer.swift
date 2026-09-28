//
//  World2HomeAmbientLayer.swift
//  abbies.world.ios
//
//  Home map FX: soft floating leaves + waterfall mist along an editable stroke.
//

import SwiftUI

/// Decorative FX for `scene.home`. Never intercepts touches.
struct World2HomeAmbientLayer: View {
    let mapRect: CGRect
    var isActive: Bool = true
    var sceneID: String = "scene.home"

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject private var strokeStore = World2WaterfallStrokeStore.shared

    private let leaves: [HomeLeaf]
    private let droplets: [WaterDroplet]

    /// Muted greens so leaves sit into the moss instead of shouting over it.
    private static let palette: [Color] = [
        Color(red: 0.42, green: 0.62, blue: 0.28),
        Color(red: 0.52, green: 0.70, blue: 0.32),
        Color(red: 0.38, green: 0.55, blue: 0.26),
        Color(red: 0.58, green: 0.64, blue: 0.30),
        Color(red: 0.62, green: 0.52, blue: 0.24),
        Color(red: 0.48, green: 0.58, blue: 0.28),
        Color(red: 0.35, green: 0.50, blue: 0.24),
        Color(red: 0.55, green: 0.42, blue: 0.22),
    ]

    init(mapRect: CGRect, isActive: Bool = true, sceneID: String = "scene.home") {
        self.mapRect = mapRect
        self.isActive = isActive
        self.sceneID = sceneID
        var rng = SeededGenerator(seed: 2_026_09_27)
        leaves = (0..<28).map { i in
            HomeLeaf(
                id: i,
                x0: CGFloat.random(in: -0.05...1.05, using: &rng),
                size: CGFloat.random(in: 9...18, using: &rng),
                drift: CGFloat.random(in: -0.16...0.16, using: &rng),
                spin: Double.random(in: 40...180, using: &rng),
                duration: Double.random(in: 14...26, using: &rng),
                delay: Double.random(in: 0...14, using: &rng),
                depth: CGFloat.random(in: 0.15...1.0, using: &rng),
                paletteIndex: Int.random(in: 0..<Self.palette.count, using: &rng)
            )
        }
        droplets = (0..<48).map { i in
            WaterDroplet(
                id: i,
                t0: Double.random(in: 0...1, using: &rng),
                // ~40% faster fall so the cascade reads as moving water.
                speed: Double.random(in: 0.18...0.40, using: &rng),
                size: CGFloat.random(in: 2.0...4.2, using: &rng),
                lateral: Double.random(in: -1...1, using: &rng),
                phase: Double.random(in: 0...(2 * .pi), using: &rng),
                // ~25% more opaque than the first pass.
                opacity: Double.random(in: 0.20...0.50, using: &rng)
            )
        }
    }

    private var motionEnabled: Bool {
        isActive && scenePhase == .active
    }

    private var stroke: World2WaterfallStroke {
        strokeStore.stroke(for: sceneID)
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: reduceMotion ? 1.0 / 10.0 : 1.0 / 24.0)) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            Canvas { context, size in
                guard size.width > 8, size.height > 8 else { return }
                // Water ~25% stronger than first pass; leaves a bit more opaque (Evan).
                let waterGain = motionEnabled ? (reduceMotion ? 0.44 : 0.88) : 0.31
                let leafGain = motionEnabled ? (reduceMotion ? 0.52 : 0.82) : 0.38
                drawWaterfall(context: &context, size: size, t: t, gain: waterGain)
                for leaf in leaves {
                    drawLeaf(leaf, context: &context, size: size, t: t, gain: leafGain)
                }
            }
        }
        .frame(width: mapRect.width, height: mapRect.height)
        .blur(radius: reduceMotion ? 0.6 : 1.15)
        .opacity(0.9)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .accessibilityIdentifier("world2.homeAmbient")
    }

    private func drawWaterfall(
        context: inout GraphicsContext,
        size: CGSize,
        t: Double,
        gain: Double
    ) {
        let path = stroke
        guard !path.isEmpty else { return }

        // Soft veil along the stroke.
        if let top = path.sample(at: 0.08), let mid = path.sample(at: 0.5), let bot = path.sample(at: 0.9) {
            var sheen = context
            sheen.opacity = 0.125 * gain
            var veil = Path()
            let hw = mid.halfWidth * size.width
            veil.move(to: CGPoint(x: top.x * size.width - hw * 0.7, y: top.y * size.height))
            veil.addLine(to: CGPoint(x: top.x * size.width + hw * 0.7, y: top.y * size.height))
            veil.addLine(to: CGPoint(x: bot.x * size.width + hw * 1.1, y: bot.y * size.height))
            veil.addLine(to: CGPoint(x: bot.x * size.width - hw * 1.1, y: bot.y * size.height))
            veil.closeSubpath()
            sheen.fill(
                veil,
                with: .linearGradient(
                    Gradient(colors: [
                        Color.white.opacity(0.0),
                        Color(red: 0.78, green: 0.90, blue: 1.0).opacity(0.5),
                        Color.white.opacity(0.0),
                    ]),
                    startPoint: CGPoint(x: mid.x * size.width - hw, y: mid.y * size.height),
                    endPoint: CGPoint(x: mid.x * size.width + hw, y: mid.y * size.height)
                )
            )

            // Pool mist near the bottom of the stroke.
            var mistCtx = context
            let pulse = 0.6 + 0.4 * sin(t * 1.5)
            mistCtx.opacity = 0.175 * pulse * gain
            let r = size.height * 0.04
            mistCtx.fill(
                Path(ellipseIn: CGRect(
                    x: bot.x * size.width - r * 1.6,
                    y: bot.y * size.height - r * 0.4,
                    width: r * 3.2,
                    height: r * 1.2
                )),
                with: .color(.white)
            )
        }

        for drop in droplets {
            let life = t * drop.speed + drop.phase
            let phase = life - floor(life)
            // Bias samples toward the upper cascade so the fall reads.
            let sampleT = (phase + drop.t0).truncatingRemainder(dividingBy: 1)
            guard let sample = path.sample(at: sampleT) else { continue }
            let fade = sin(phase * .pi)
            let alpha = drop.opacity * fade * gain
            let lateral = drop.lateral * sample.halfWidth
            let x = sample.x + lateral
            let y = sample.y
            let r = drop.size * (0.85 + 0.35 * (1 - phase))
            let rect = CGRect(
                x: CGFloat(x) * size.width - r * 0.35,
                y: CGFloat(y) * size.height - r * 1.2,
                width: r * 0.7,
                height: r * 2.4
            )
            var dropCtx = context
            dropCtx.opacity = min(1, alpha)
            dropCtx.fill(
                Path(ellipseIn: rect),
                with: .color(Color(red: 0.82, green: 0.93, blue: 1.0))
            )
        }
    }

    private func drawLeaf(
        _ leaf: HomeLeaf,
        context: inout GraphicsContext,
        size: CGSize,
        t: Double,
        gain: Double
    ) {
        let life = (t + leaf.delay) / leaf.duration
        let phase = life - floor(life)
        let y = -0.08 + CGFloat(phase) * 1.20
        let x = leaf.x0 + leaf.drift * sin(CGFloat(phase) * .pi * 2) * (0.55 + leaf.depth * 0.35)
        let angle = leaf.spin * phase + Double(leaf.id) * 17
        let scale = 0.75 + 0.35 * leaf.depth
        let opacity = Double((0.85 - leaf.depth * 0.35) * 0.92)
            * Double(min(1, max(0.2, sin(phase * .pi) * 1.1)))
            * gain
        let tint = Self.palette[leaf.paletteIndex % Self.palette.count]
        let leafSize = leaf.size

        var transform = CGAffineTransform.identity
        transform = transform.translatedBy(x: x * size.width, y: y * size.height)
        transform = transform.rotated(by: CGFloat(angle * .pi / 180))
        transform = transform.scaledBy(x: scale, y: scale)

        var leafPath = Path()
        leafPath.move(to: CGPoint(x: 0, y: -leafSize * 0.55))
        leafPath.addQuadCurve(
            to: CGPoint(x: 0, y: leafSize * 0.55),
            control: CGPoint(x: leafSize * 0.52, y: 0)
        )
        leafPath.addQuadCurve(
            to: CGPoint(x: 0, y: -leafSize * 0.55),
            control: CGPoint(x: -leafSize * 0.52, y: 0)
        )
        leafPath.closeSubpath()

        var leafCtx = context
        leafCtx.opacity = min(1, opacity)
        leafCtx.fill(leafPath.applying(transform), with: .color(tint))
        var vein = Path()
        vein.move(to: CGPoint(x: 0, y: -leafSize * 0.35))
        vein.addLine(to: CGPoint(x: 0, y: leafSize * 0.3))
        leafCtx.stroke(
            vein.applying(transform),
            with: .color(Color.black.opacity(0.12)),
            lineWidth: 0.7
        )
    }
}

private struct HomeLeaf: Identifiable {
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

private struct WaterDroplet: Identifiable {
    let id: Int
    /// Offset along the stroke (0…1).
    let t0: Double
    let speed: Double
    let size: CGFloat
    /// -1…1 across the local half-width.
    let lateral: Double
    let phase: Double
    let opacity: Double
}
