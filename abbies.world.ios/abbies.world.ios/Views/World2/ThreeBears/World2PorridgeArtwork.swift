//
//  World2PorridgeArtwork.swift
//  abbies.world.ios
//
//  The Bowl of Perfect Porridge, drawn rather than generated.
//
//  It shows up in three places — the tasting table, the celebration, and the
//  furniture drawer — so it is one view with a size knob and an option to settle
//  the animation down for small cards.
//

import SwiftUI

/// A bowl of porridge. `level` drives how much steam, how big the bowl, and how
/// much honey, which is what the player is actually judging during a round.
struct World2PorridgeBowl: View {
    var level: World2JustRightLevel = .justRight
    var attribute: World2JustRightAttribute = .temperature
    /// The magic version: rainbow steam and endless sparkles.
    var isMagical = false
    var isAnimated = true

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var animates: Bool { isAnimated && !reduceMotion }

    /// Only the attribute being judged varies. Everything else stays neutral so
    /// a round has exactly one thing to look at.
    private var bowlScale: CGFloat {
        guard attribute == .size else { return 1.0 }
        switch level {
        case .tooLittle: return 0.66
        case .justRight: return 0.88
        case .tooMuch: return 1.18
        }
    }

    private var steamCount: Int {
        guard attribute == .temperature else { return 2 }
        switch level {
        case .tooLittle: return 0
        case .justRight: return 2
        case .tooMuch: return 5
        }
    }

    private var honeyDrizzleCount: Int {
        guard attribute == .sweetness else { return 2 }
        switch level {
        case .tooLittle: return 0
        case .justRight: return 2
        case .tooMuch: return 6
        }
    }

    var body: some View {
        GeometryReader { geometry in
            let side = min(geometry.size.width, geometry.size.height)
            ZStack {
                if isMagical {
                    magicalAura(side: side)
                }

                VStack(spacing: -side * 0.03) {
                    steam(side: side)
                    bowl(side: side)
                }
                .frame(width: side, height: side)
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
        .accessibilityLabel(accessibilityLabel)
        .accessibilityIdentifier("world2.porridge.bowl")
    }

    private var accessibilityLabel: String {
        guard !isMagical else {
            return "A bowl of perfect porridge with rainbow steam and sparkles"
        }
        switch attribute {
        case .temperature:
            switch level {
            case .tooMuch: return "A bowl with lots of steam rising"
            case .justRight: return "A bowl with a little steam rising"
            case .tooLittle: return "A bowl with no steam"
            }
        case .size:
            switch level {
            case .tooMuch: return "A very big bowl"
            case .justRight: return "A middle-sized bowl"
            case .tooLittle: return "A very small bowl"
            }
        case .sweetness:
            switch level {
            case .tooMuch: return "A bowl covered in honey"
            case .justRight: return "A bowl with a little honey"
            case .tooLittle: return "A bowl with no honey"
            }
        }
    }

    // MARK: - Pieces

    private func steam(side: CGFloat) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 24.0, paused: !animates)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate
            HStack(spacing: side * 0.045) {
                ForEach(0..<max(steamCount, isMagical ? 3 : steamCount), id: \.self) { index in
                    World2SteamCurl(
                        phase: animates ? time * 1.1 + Double(index) * 0.7 : Double(index),
                        isRainbow: isMagical,
                        index: index
                    )
                    .frame(width: side * 0.09, height: side * 0.30)
                }
            }
            .frame(height: side * 0.32)
        }
    }

    private func bowl(side: CGFloat) -> some View {
        ZStack {
            // Porridge surface, sitting just inside the rim.
            Ellipse()
                .fill(
                    LinearGradient(
                        colors: isMagical
                            ? [
                                Color(red: 1.00, green: 0.93, blue: 0.75),
                                Color(red: 0.99, green: 0.83, blue: 0.62),
                            ]
                            : [
                                Color(red: 0.96, green: 0.90, blue: 0.76),
                                Color(red: 0.87, green: 0.78, blue: 0.62),
                            ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: side * 0.62, height: side * 0.20)
                .offset(y: -side * 0.15)

            honey(side: side)

            World2BowlShape()
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.42, green: 0.71, blue: 0.86),
                            Color(red: 0.21, green: 0.47, blue: 0.70),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: side * 0.72, height: side * 0.40)
                .overlay(
                    World2BowlShape()
                        .stroke(.white.opacity(0.55), lineWidth: side * 0.012)
                        .frame(width: side * 0.72, height: side * 0.40)
                )
                .shadow(color: .black.opacity(0.28), radius: side * 0.03, y: side * 0.02)
        }
        .scaleEffect(bowlScale)
        .frame(width: side, height: side * 0.52)
    }

    private func honey(side: CGFloat) -> some View {
        ZStack {
            ForEach(0..<honeyDrizzleCount, id: \.self) { index in
                let spread = Double(index) - Double(max(honeyDrizzleCount - 1, 1)) / 2.0
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 1.00, green: 0.80, blue: 0.29),
                                Color(red: 0.91, green: 0.62, blue: 0.16),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: side * 0.055, height: side * 0.105)
                    .rotationEffect(.degrees(spread * 22))
                    .offset(x: side * 0.052 * spread, y: -side * 0.155)
            }
        }
    }

    private func magicalAura(side: CGFloat) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 20.0, paused: !animates)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.pink.opacity(0.32),
                                Color.purple.opacity(0.0),
                            ],
                            center: .center,
                            startRadius: side * 0.05,
                            endRadius: side * 0.48
                        )
                    )

                ForEach(0..<9, id: \.self) { index in
                    let angle = Double(index) / 9.0 * 2 * .pi
                        + (animates ? time * 0.5 : 0)
                    let radius = side * (0.30 + 0.035 * sin(time * 1.7 + Double(index)))
                    Image(systemName: index.isMultiple(of: 2) ? "sparkle" : "star.fill")
                        .font(.system(size: side * 0.062, weight: .black))
                        .foregroundStyle(World2PorridgeArtPalette.rainbow[index % 6])
                        .opacity(animates ? 0.55 + 0.45 * sin(time * 2.1 + Double(index)) : 0.85)
                        .offset(
                            x: CGFloat(cos(angle)) * radius,
                            y: CGFloat(sin(angle)) * radius * 0.72
                        )
                }
            }
        }
        .accessibilityHidden(true)
    }
}

enum World2PorridgeArtPalette {
    static let rainbow: [Color] = [
        Color(red: 1.00, green: 0.38, blue: 0.47),
        Color(red: 1.00, green: 0.64, blue: 0.29),
        Color(red: 1.00, green: 0.87, blue: 0.35),
        Color(red: 0.47, green: 0.85, blue: 0.53),
        Color(red: 0.39, green: 0.72, blue: 0.96),
        Color(red: 0.72, green: 0.52, blue: 0.94),
    ]
}

/// One rising curl of steam. Rainbow when the porridge is the magic one.
private struct World2SteamCurl: View {
    let phase: Double
    let isRainbow: Bool
    let index: Int

    var body: some View {
        GeometryReader { geometry in
            let size = geometry.size
            let sway = sin(phase) * Double(size.width) * 0.45
            let rise = (phase.truncatingRemainder(dividingBy: 2.4)) / 2.4

            Path { path in
                path.move(to: CGPoint(x: size.width / 2, y: size.height))
                path.addCurve(
                    to: CGPoint(x: size.width / 2 + sway, y: 0),
                    control1: CGPoint(
                        x: size.width / 2 - sway,
                        y: size.height * 0.62
                    ),
                    control2: CGPoint(
                        x: size.width / 2 + sway * 1.5,
                        y: size.height * 0.30
                    )
                )
            }
            .stroke(
                isRainbow
                    ? AnyShapeStyle(
                        LinearGradient(
                            colors: World2PorridgeArtPalette.rainbow,
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
                    : AnyShapeStyle(Color.white.opacity(0.62)),
                style: StrokeStyle(
                    lineWidth: max(size.width * 0.34, 2),
                    lineCap: .round
                )
            )
            .opacity(0.35 + 0.55 * (1 - rise))
            .blur(radius: isRainbow ? 0.6 : 1.4)
        }
        .accessibilityHidden(true)
    }
}

/// A rounded bowl: flat rim, tapered body.
private struct World2BowlShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY + rect.height * 0.12))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: rect.minY + rect.height * 0.12),
            control: CGPoint(x: rect.midX, y: rect.minY - rect.height * 0.10)
        )
        path.addCurve(
            to: CGPoint(x: rect.midX, y: rect.maxY),
            control1: CGPoint(x: rect.maxX - rect.width * 0.04, y: rect.maxY * 0.82),
            control2: CGPoint(x: rect.midX + rect.width * 0.26, y: rect.maxY)
        )
        path.addCurve(
            to: CGPoint(x: rect.minX, y: rect.minY + rect.height * 0.12),
            control1: CGPoint(x: rect.midX - rect.width * 0.26, y: rect.maxY),
            control2: CGPoint(x: rect.minX + rect.width * 0.04, y: rect.maxY * 0.82)
        )
        path.closeSubpath()
        return path
    }
}

#Preview("Magical") {
    World2PorridgeBowl(isMagical: true)
        .frame(width: 260, height: 260)
        .background(.indigo)
}

#Preview("Tasting row") {
    HStack {
        World2PorridgeBowl(level: .tooMuch, attribute: .temperature)
        World2PorridgeBowl(level: .justRight, attribute: .temperature)
        World2PorridgeBowl(level: .tooLittle, attribute: .temperature)
    }
    .frame(height: 200)
    .background(.brown)
}
