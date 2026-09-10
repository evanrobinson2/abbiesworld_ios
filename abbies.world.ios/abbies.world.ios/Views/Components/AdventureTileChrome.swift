//
//  AdventureTileChrome.swift
//  abbies.world.ios
//
//  Compass-and-rope frame for Adventure pack tiles.
//

import SwiftUI

struct AdventureTileChrome<Content: View>: View {
    let title: String
    let isSelected: Bool
    let size: CGSize
    let cornerRadius: CGFloat
    @ViewBuilder var content: () -> Content

    var body: some View {
        let radius = max(cornerRadius, 18)

        ZStack {
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .fill(Color(red: 1.0, green: 0.97, blue: 0.85))
                .shadow(color: .black.opacity(0.24), radius: isSelected ? 10 : 5, y: 4)

            content()
                .frame(width: size.width - 16, height: size.height - 28)
                .clipShape(RoundedRectangle(cornerRadius: radius - 8, style: .continuous))
                .padding(.bottom, 10)

            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(
                    isSelected
                        ? Color(red: 1.0, green: 0.69, blue: 0.16)
                        : Color(red: 0.05, green: 0.52, blue: 0.55),
                    style: StrokeStyle(lineWidth: isSelected ? 5 : 3.5, dash: [8, 4, 2, 4])
                )

            VStack {
                HStack {
                    compassMark
                    Spacer()
                    compassMark
                }
                Spacer()
                HStack {
                    compassMark
                    Spacer()
                    compassMark
                }
            }
            .padding(7)

            VStack {
                Spacer()
                Text(title)
                    .font(.system(size: min(15, size.width * 0.11), weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.55)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 3)
                    .background(
                        Capsule()
                            .fill(Color(red: 0.03, green: 0.30, blue: 0.40).opacity(0.96))
                    )
                    .padding(.bottom, 6)
            }
        }
        .frame(width: size.width, height: size.height)
    }

    private var compassMark: some View {
        Image(systemName: "safari.fill")
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(Color(red: 0.96, green: 0.58, blue: 0.11))
            .shadow(radius: 0.5)
    }
}
