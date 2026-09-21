//
//  World2POIDrawnArtwork.swift
//  abbies.world.ios
//
//  Drawn stand-in exteriors for registered places whose painted art has not
//  been generated yet.
//
//  Prefer the shared `under_construction` cake-tower plate via
//  `World2SemanticImage` for unqualified `poi.*` assets. Keep a drawnArtStyle
//  only when a place needs a temporary bespoke silhouette before art lands.
//

import SwiftUI

struct World2POIDrawnArtwork: View {
    let style: World2POIArtStyle

    var body: some View {
        switch style {
        case .bearsCottage:
            World2BearsCottage()
        case .whizbangGadgetBarn:
            World2WhizbangGadgetBarn()
        case .plinkPavilion:
            World2PlinkPavilion()
        }
    }
}

/// A storybook cottage: stone chimney with a curl of smoke, thatched roof, warm
/// windows, and a round door.
private struct World2BearsCottage: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let wall = Color(red: 0.93, green: 0.85, blue: 0.70)
    private let timber = Color(red: 0.44, green: 0.28, blue: 0.17)
    private let roof = Color(red: 0.72, green: 0.52, blue: 0.24)
    private let roofShade = Color(red: 0.52, green: 0.35, blue: 0.15)

    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height

            ZStack(alignment: .bottom) {
                smoke(width: width, height: height)
                    .frame(width: width * 0.18, height: height * 0.26)
                    .offset(x: -width * 0.22, y: -height * 0.70)

                chimney(width: width, height: height)

                VStack(spacing: -height * 0.015) {
                    roofShape(width: width, height: height)
                    walls(width: width, height: height)
                }
                .frame(width: width, alignment: .center)
            }
            .frame(width: width, height: height, alignment: .bottom)
        }
        .accessibilityLabel("A storybook cottage with smoke curling from its chimney")
        .accessibilityIdentifier("world2.poi.artwork.bearsCottage")
    }

    private func roofShape(width: CGFloat, height: CGFloat) -> some View {
        World2ThatchRoof()
            .fill(
                LinearGradient(
                    colors: [roof, roofShade],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .overlay(
                World2ThatchRoof()
                    .stroke(roofShade, lineWidth: 2)
            )
            .frame(width: width * 0.86, height: height * 0.34)
    }

    private func walls(width: CGFloat, height: CGFloat) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: width * 0.03)
                .fill(wall)
                .overlay(
                    RoundedRectangle(cornerRadius: width * 0.03)
                        .stroke(timber.opacity(0.65), lineWidth: 2)
                )

            // Timber framing, the shorthand every picture book uses for "old".
            VStack {
                Rectangle().fill(timber.opacity(0.55)).frame(height: 3)
                Spacer()
            }
            HStack {
                Rectangle().fill(timber.opacity(0.4)).frame(width: 3)
                Spacer()
                Rectangle().fill(timber.opacity(0.4)).frame(width: 3)
            }

            HStack(spacing: width * 0.07) {
                window(side: width * 0.13)
                door(width: width * 0.15, height: height * 0.24)
                window(side: width * 0.13)
            }
            .frame(maxHeight: .infinity, alignment: .bottom)
            .padding(.bottom, height * 0.012)
        }
        .frame(width: width * 0.66, height: height * 0.30)
        .shadow(color: .black.opacity(0.32), radius: 8, y: 5)
    }

    private func window(side: CGFloat) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: side * 0.18)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 1.00, green: 0.88, blue: 0.55),
                            Color(red: 0.98, green: 0.72, blue: 0.32),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            RoundedRectangle(cornerRadius: side * 0.18)
                .stroke(timber, lineWidth: side * 0.10)
            Rectangle().fill(timber).frame(width: side * 0.08)
            Rectangle().fill(timber).frame(height: side * 0.08)
        }
        .frame(width: side, height: side)
        .shadow(color: .orange.opacity(0.55), radius: 6)
    }

    private func door(width: CGFloat, height: CGFloat) -> some View {
        ZStack(alignment: .trailing) {
            UnevenRoundedRectangle(
                topLeadingRadius: width * 0.48,
                bottomLeadingRadius: 2,
                bottomTrailingRadius: 2,
                topTrailingRadius: width * 0.48
            )
            .fill(timber)

            Circle()
                .fill(Color(red: 0.95, green: 0.80, blue: 0.35))
                .frame(width: width * 0.14, height: width * 0.14)
                .padding(.trailing, width * 0.14)
        }
        .frame(width: width, height: height)
    }

    private func chimney(width: CGFloat, height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: width * 0.012)
            .fill(Color(red: 0.55, green: 0.52, blue: 0.50))
            .overlay(
                RoundedRectangle(cornerRadius: width * 0.012)
                    .stroke(.black.opacity(0.22), lineWidth: 1.5)
            )
            .frame(width: width * 0.09, height: height * 0.26)
            .offset(x: -width * 0.22, y: -height * 0.46)
    }

    private func smoke(width: CGFloat, height: CGFloat) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 18.0, paused: reduceMotion)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate
            ZStack {
                ForEach(0..<3, id: \.self) { index in
                    let phase = reduceMotion
                        ? Double(index) * 0.33
                        : ((time * 0.35 + Double(index) * 0.33)
                            .truncatingRemainder(dividingBy: 1.0))
                    Circle()
                        .fill(.white.opacity(0.42 * (1 - phase)))
                        .frame(width: width * 0.22 * (0.5 + phase))
                        .offset(
                            x: CGFloat(sin(phase * 3.1 + Double(index)) * Double(width) * 0.16),
                            y: -CGFloat(phase) * height * 0.9
                        )
                }
            }
        }
        .accessibilityHidden(true)
    }
}

/// A thatched roof: wide eaves, soft ridge.
private struct World2ThatchRoof: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addQuadCurve(
            to: CGPoint(x: rect.midX, y: rect.minY),
            control: CGPoint(x: rect.minX + rect.width * 0.28, y: rect.minY + rect.height * 0.12)
        )
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: rect.maxY),
            control: CGPoint(x: rect.maxX - rect.width * 0.28, y: rect.minY + rect.height * 0.12)
        )
        path.addQuadCurve(
            to: CGPoint(x: rect.minX, y: rect.maxY),
            control: CGPoint(x: rect.midX, y: rect.maxY - rect.height * 0.16)
        )
        path.closeSubpath()
        return path
    }
}

/// A squat gadget barn: copper roof, spring door, and a launch chimney.
private struct World2WhizbangGadgetBarn: View {
    private let wall = Color(red: 0.86, green: 0.42, blue: 0.22)
    private let roof = Color(red: 0.72, green: 0.55, blue: 0.28)
    private let metal = Color(red: 0.55, green: 0.62, blue: 0.70)

    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height
            VStack(spacing: -height * 0.02) {
                ZStack(alignment: .top) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(metal)
                        .frame(width: width * 0.16, height: height * 0.22)
                        .offset(x: width * 0.22)
                    Triangle()
                        .fill(roof)
                        .frame(width: width * 0.92, height: height * 0.28)
                }
                RoundedRectangle(cornerRadius: width * 0.04)
                    .fill(wall)
                    .overlay(
                        RoundedRectangle(cornerRadius: width * 0.08)
                            .fill(Color(red: 0.28, green: 0.18, blue: 0.14))
                            .frame(width: width * 0.28, height: height * 0.22)
                            .offset(y: height * 0.06)
                    )
                    .frame(height: height * 0.48)
            }
            .frame(width: width, height: height, alignment: .bottom)
        }
        .accessibilityLabel("A copper gadget barn with a launch chimney")
        .accessibilityIdentifier("world2.poi.artwork.whizbang")
    }
}

/// A round glass-and-brass pavilion with a marble fountain on the roof.
private struct World2PlinkPavilion: View {
    private let brass = Color(red: 0.78, green: 0.62, blue: 0.32)
    private let glass = Color(red: 0.55, green: 0.82, blue: 0.80)
    private let pink = Color(red: 0.83, green: 0.33, blue: 0.54)

    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height
            VStack(spacing: -height * 0.04) {
                ZStack {
                    Circle()
                        .fill(pink.opacity(0.85))
                        .frame(width: width * 0.22, height: width * 0.22)
                        .offset(y: -height * 0.02)
                    Circle()
                        .fill(Color(red: 0.37, green: 0.78, blue: 0.85))
                        .frame(width: width * 0.12, height: width * 0.12)
                        .offset(y: -height * 0.08)
                }
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [glass, brass],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .overlay(
                        Capsule()
                            .fill(Color(red: 0.28, green: 0.16, blue: 0.18))
                            .frame(width: width * 0.22, height: height * 0.18)
                            .offset(y: height * 0.08)
                    )
                    .frame(width: width * 0.78, height: height * 0.58)
            }
            .frame(width: width, height: height, alignment: .bottom)
        }
        .accessibilityLabel("A glass pavilion with a marble fountain on the roof")
        .accessibilityIdentifier("world2.poi.artwork.plinkPavilion")
    }
}

private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: rect.midX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
            path.closeSubpath()
        }
    }
}

#Preview {
    World2POIDrawnArtwork(style: .bearsCottage)
        .frame(width: 240, height: 210)
        .background(Color(red: 0.32, green: 0.48, blue: 0.32))
}
