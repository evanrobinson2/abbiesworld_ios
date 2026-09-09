//
//  HalloweenTileChrome.swift
//  abbies.world.ios
//
//  Sticker-style frame for Spooky pack tiles.
//

import SwiftUI

struct HalloweenTileChrome<Content: View>: View {
    let title: String
    let isSelected: Bool
    let size: CGSize
    let cornerRadius: CGFloat
    @ViewBuilder var content: () -> Content

    var body: some View {
        let radius = max(cornerRadius, 18)
        ZStack {
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .fill(Color(red: 1.0, green: 0.96, blue: 0.88))
                .shadow(color: Color.black.opacity(0.28), radius: isSelected ? 10 : 5, y: 4)

            content()
                .frame(width: size.width - 16, height: size.height - 28)
                .clipShape(RoundedRectangle(cornerRadius: radius - 8, style: .continuous))
                .padding(.bottom, 10)

            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(
                    AngularGradient(
                        colors: [
                            Color(red: 0.95, green: 0.45, blue: 0.12),
                            Color(red: 0.22, green: 0.08, blue: 0.28),
                            Color(red: 0.62, green: 0.28, blue: 0.82),
                            Color(red: 0.95, green: 0.45, blue: 0.12)
                        ],
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: isSelected ? 5 : 3.5, dash: [7, 5])
                )

            VStack {
                HStack {
                    CandyCornMark()
                    Spacer()
                    CandyCornMark()
                }
                Spacer()
                HStack {
                    CandyCornMark()
                    Spacer()
                    CandyCornMark()
                }
            }
            .padding(7)

            VStack {
                Spacer()
                Text(title)
                    .font(.system(size: min(15, size.width * 0.11), weight: .heavy, design: .rounded))
                    .foregroundColor(Color(red: 1.0, green: 0.95, blue: 0.82))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(
                        Capsule()
                            .fill(Color(red: 0.22, green: 0.07, blue: 0.28).opacity(0.92))
                    )
                    .padding(.bottom, 6)
            }
        }
        .frame(width: size.width, height: size.height)
    }
}

private struct CandyCornMark: View {
    var body: some View {
        Triangle()
            .fill(
                LinearGradient(
                    colors: [
                        Color(red: 1.0, green: 0.95, blue: 0.82),
                        Color(red: 1.0, green: 0.62, blue: 0.18),
                        Color(red: 1.0, green: 0.84, blue: 0.22)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .frame(width: 12, height: 14)
            .rotationEffect(.degrees(180))
            .shadow(radius: 0.5)
    }
}

private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}

struct CarouselCarveout<Content: View>: View {
    let mediaPack: MediaPack
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(mediaPack == .halloween ? 6 : 8)
            .background {
                if mediaPack == .halloween {
                    ZStack {
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .fill(Color(red: 0.16, green: 0.05, blue: 0.28).opacity(0.58))
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .strokeBorder(
                                Color(red: 0.98, green: 0.52, blue: 0.16).opacity(0.9),
                                style: StrokeStyle(lineWidth: 3, dash: [8, 6])
                            )
                        VStack {
                            HStack {
                                Image(systemName: "theatermasks.fill")
                                    .font(.system(size: 11, weight: .bold))
                                Spacer()
                                Image(systemName: "moon.stars.fill")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            Spacer()
                        }
                        .foregroundColor(Color(red: 1.0, green: 0.72, blue: 0.22).opacity(0.85))
                        .padding(8)
                    }
                } else {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.3))
                }
            }
    }
}
