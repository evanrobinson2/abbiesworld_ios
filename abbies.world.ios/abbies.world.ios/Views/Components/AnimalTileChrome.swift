//
//  AnimalTileChrome.swift
//  abbies.world.ios
//
//  Friendly neighborhood frame for Animal Avenue tiles.
//

import SwiftUI

struct AnimalTileChrome<Content: View>: View {
    let title: String
    let isSelected: Bool
    let size: CGSize
    let cornerRadius: CGFloat
    @ViewBuilder var content: () -> Content

    var body: some View {
        let radius = max(cornerRadius, 18)

        ZStack {
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .fill(Color(red: 1.0, green: 0.98, blue: 0.90))
                .shadow(color: .black.opacity(0.22), radius: isSelected ? 10 : 5, y: 4)

            content()
                .frame(width: size.width - 16, height: size.height - 28)
                .clipShape(RoundedRectangle(cornerRadius: radius - 8, style: .continuous))
                .padding(.bottom, 10)

            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(
                    isSelected
                        ? Color(red: 0.10, green: 0.63, blue: 0.43)
                        : Color(red: 0.17, green: 0.55, blue: 0.76),
                    style: StrokeStyle(lineWidth: isSelected ? 5 : 3.5, dash: [5, 4])
                )

            VStack {
                HStack {
                    pawMark
                    Spacer()
                    pawMark
                }
                Spacer()
                HStack {
                    pawMark
                    Spacer()
                    pawMark
                }
            }
            .padding(7)

            VStack {
                Spacer()
                Text(title)
                    .font(.system(size: min(15, size.width * 0.11), weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 3)
                    .background(
                        Capsule()
                            .fill(Color(red: 0.08, green: 0.43, blue: 0.31).opacity(0.94))
                    )
                    .padding(.bottom, 6)
            }
        }
        .frame(width: size.width, height: size.height)
    }

    private var pawMark: some View {
        Image(systemName: "pawprint.fill")
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(Color(red: 0.95, green: 0.55, blue: 0.18))
            .shadow(radius: 0.5)
    }
}
