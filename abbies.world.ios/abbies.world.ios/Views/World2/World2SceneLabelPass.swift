//
//  World2SceneLabelPass.swift
//  abbies.world.ios
//
//  Draws the resolved name pills after the scene art.
//

import SwiftUI

struct World2SceneLabelPass: View {
    let items: [World2SceneLabelItem]
    let obstacles: [CGRect]
    let bounds: CGRect

    var body: some View {
        let centers = World2SceneLabelLayout.resolve(
            items: items,
            obstacles: obstacles,
            bounds: bounds
        )
        ZStack {
            ForEach(items) { item in
                Text(item.text)
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .frame(maxWidth: item.size.width)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        item.emphasized ? Color.orange.opacity(0.9) : Color.black.opacity(0.62),
                        in: Capsule()
                    )
                    .position(centers[item.id] ?? item.preferredCenter)
                    .accessibilityIdentifier("world2.sceneLabel.\(item.id)")
            }
        }
        .frame(width: bounds.width, height: bounds.height)
        .allowsHitTesting(false)
        .accessibilityIdentifier("world2.sceneLabel.pass")
    }
}
