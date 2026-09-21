//
//  World2SceneBackdrop.swift
//  abbies.world.ios
//
//  Hand-drawn backdrops for scenes whose painted map has not been generated yet.
//
//  A brand-new scene should look like somewhere. Without this, Three Bears Woods
//  would show the missing-asset placeholder, which reads as a bug to a child and
//  makes the new hardpoints impossible to judge against real art.
//

import SwiftUI

struct World2SceneBackdrop: View {
    let style: World2SceneBackdropStyle

    var body: some View {
        switch style {
        case .threeBearsWoods:
            World2ThreeBearsWoodsBackdrop()
        case .peggleLand:
            World2PeggleLandBackdrop()
        }
    }
}

private struct World2ThreeBearsWoodsBackdrop: View {
    /// Fixed layout rather than random: the pads in World2SceneCatalog are
    /// positioned against these trees, so the art must not move between runs.
    private static let backTrees: [(x: Double, scale: Double)] = [
        (0.04, 0.62), (0.13, 0.78), (0.22, 0.58), (0.31, 0.72),
        (0.40, 0.55), (0.60, 0.57), (0.69, 0.74), (0.78, 0.60),
        (0.88, 0.80), (0.96, 0.64),
    ]

    private static let frontTrees: [(x: Double, scale: Double)] = [
        (0.02, 1.05), (0.10, 0.88), (0.90, 0.92), (0.98, 1.08),
    ]

    var body: some View {
        GeometryReader { geometry in
            let size = geometry.size
            ZStack {
                sky
                sunGlow(in: size)
                farHills(in: size)
                treeLine(Self.backTrees, in: size, baseY: 0.48, tint: .init(
                    top: Color(red: 0.16, green: 0.34, blue: 0.24),
                    bottom: Color(red: 0.09, green: 0.22, blue: 0.16)
                ))
                clearing(in: size)
                path(in: size)
                treeLine(Self.frontTrees, in: size, baseY: 0.72, tint: .init(
                    top: Color(red: 0.11, green: 0.27, blue: 0.19),
                    bottom: Color(red: 0.05, green: 0.15, blue: 0.11)
                ))
            }
            .frame(width: size.width, height: size.height)
            .clipped()
        }
        .accessibilityLabel("A clearing in the woods with tall pine trees and a warm sunset")
        .accessibilityIdentifier("world2.backdrop.threeBearsWoods")
    }

    private var sky: some View {
        LinearGradient(
            colors: [
                Color(red: 0.99, green: 0.80, blue: 0.51),
                Color(red: 0.96, green: 0.64, blue: 0.51),
                Color(red: 0.61, green: 0.55, blue: 0.72),
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private func sunGlow(in size: CGSize) -> some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [
                        Color(red: 1.0, green: 0.96, blue: 0.80).opacity(0.95),
                        Color(red: 1.0, green: 0.85, blue: 0.55).opacity(0.0),
                    ],
                    center: .center,
                    startRadius: 2,
                    endRadius: size.width * 0.20
                )
            )
            .frame(width: size.width * 0.42, height: size.width * 0.42)
            .position(x: size.width * 0.66, y: size.height * 0.24)
    }

    private func farHills(in size: CGSize) -> some View {
        Path { path in
            path.move(to: CGPoint(x: 0, y: size.height * 0.52))
            path.addCurve(
                to: CGPoint(x: size.width * 0.44, y: size.height * 0.47),
                control1: CGPoint(x: size.width * 0.14, y: size.height * 0.41),
                control2: CGPoint(x: size.width * 0.30, y: size.height * 0.50)
            )
            path.addCurve(
                to: CGPoint(x: size.width, y: size.height * 0.51),
                control1: CGPoint(x: size.width * 0.66, y: size.height * 0.42),
                control2: CGPoint(x: size.width * 0.86, y: size.height * 0.46)
            )
            path.addLine(to: CGPoint(x: size.width, y: size.height))
            path.addLine(to: CGPoint(x: 0, y: size.height))
            path.closeSubpath()
        }
        .fill(
            LinearGradient(
                colors: [
                    Color(red: 0.36, green: 0.44, blue: 0.40),
                    Color(red: 0.24, green: 0.34, blue: 0.30),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    private struct TreeTint {
        let top: Color
        let bottom: Color
    }

    private func treeLine(
        _ trees: [(x: Double, scale: Double)],
        in size: CGSize,
        baseY: Double,
        tint: TreeTint
    ) -> some View {
        ZStack {
            ForEach(trees.indices, id: \.self) { index in
                let tree = trees[index]
                let height = size.height * 0.34 * tree.scale
                let width = height * 0.52
                World2ConiferShape()
                    .fill(
                        LinearGradient(
                            colors: [tint.top, tint.bottom],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: width, height: height)
                    .position(
                        x: size.width * tree.x,
                        y: size.height * baseY - height / 2
                    )
                    .shadow(color: .black.opacity(0.18), radius: 6, y: 4)
            }
        }
    }

    private func clearing(in size: CGSize) -> some View {
        Ellipse()
            .fill(
                RadialGradient(
                    colors: [
                        Color(red: 0.56, green: 0.70, blue: 0.38),
                        Color(red: 0.34, green: 0.51, blue: 0.28),
                    ],
                    center: .center,
                    startRadius: 8,
                    endRadius: size.width * 0.44
                )
            )
            .frame(width: size.width * 1.10, height: size.height * 0.62)
            .position(x: size.width * 0.5, y: size.height * 0.80)
    }

    private func path(in size: CGSize) -> some View {
        Path { path in
            path.move(to: CGPoint(x: size.width * 0.50, y: size.height * 0.56))
            path.addCurve(
                to: CGPoint(x: size.width * 0.36, y: size.height * 1.02),
                control1: CGPoint(x: size.width * 0.54, y: size.height * 0.74),
                control2: CGPoint(x: size.width * 0.40, y: size.height * 0.86)
            )
        }
        .stroke(
            Color(red: 0.80, green: 0.71, blue: 0.53).opacity(0.72),
            style: StrokeStyle(lineWidth: size.width * 0.055, lineCap: .round)
        )
        .blur(radius: 2)
    }
}

/// A simple three-tier pine. Cheap to draw and reads instantly as "woods".
private struct World2ConiferShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let trunkWidth = rect.width * 0.18
        let trunkTop = rect.maxY - rect.height * 0.14

        path.addRect(
            CGRect(
                x: rect.midX - trunkWidth / 2,
                y: trunkTop,
                width: trunkWidth,
                height: rect.maxY - trunkTop
            )
        )

        let tiers = 3
        for tier in 0..<tiers {
            let progress = Double(tier) / Double(tiers)
            let tierTop = rect.minY + rect.height * 0.30 * progress
            let tierBottom = tierTop + rect.height * 0.36
            let halfWidth = rect.width * (0.28 + 0.22 * progress)
            path.move(to: CGPoint(x: rect.midX, y: tierTop))
            path.addLine(to: CGPoint(x: rect.midX + halfWidth, y: tierBottom))
            path.addLine(to: CGPoint(x: rect.midX - halfWidth, y: tierBottom))
            path.closeSubpath()
        }

        return path
    }
}

private struct World2PeggleLandBackdrop: View {
    var body: some View {
        GeometryReader { geometry in
            let size = geometry.size
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.99, green: 0.82, blue: 0.90),
                        Color(red: 0.98, green: 0.78, blue: 0.55),
                        Color(red: 0.55, green: 0.82, blue: 0.74),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                Circle()
                    .fill(Color.white.opacity(0.35))
                    .frame(width: size.width * 0.28, height: size.width * 0.28)
                    .position(x: size.width * 0.82, y: size.height * 0.16)
                Capsule()
                    .fill(Color(red: 0.93, green: 0.82, blue: 0.62).opacity(0.9))
                    .frame(width: size.width * 0.22, height: size.height * 0.16)
                    .position(x: size.width * 0.50, y: size.height * 0.56)
                Capsule()
                    .fill(Color(red: 0.93, green: 0.82, blue: 0.62).opacity(0.55))
                    .frame(width: size.width * 0.14, height: size.height * 0.10)
                    .position(x: size.width * 0.22, y: size.height * 0.70)
                Capsule()
                    .fill(Color(red: 0.93, green: 0.82, blue: 0.62).opacity(0.55))
                    .frame(width: size.width * 0.14, height: size.height * 0.10)
                    .position(x: size.width * 0.78, y: size.height * 0.38)
            }
        }
        .accessibilityLabel("A candy-colored carnival meadow with three dirt pads")
        .accessibilityIdentifier("world2.backdrop.peggleLand")
    }
}

#Preview {
    World2SceneBackdrop(style: .threeBearsWoods)
        .frame(width: 640, height: 480)
}
