//
//  World2SelectedPOIToolbar.swift
//  abbies.world.ios
//
//  Floating sandbox toolbar for the selected POI: delete, glow, sway, reskin.
//

import SwiftUI

struct World2SelectedPOIToolbar: View {
    let name: String
    let presentation: World2POIPresentation
    let onDelete: () -> Void
    let onToggleGlow: () -> Void
    let onToggleSway: () -> Void
    let onPickSkin: (World2POISkinPreset) -> Void
    var onRefine: (() -> Void)? = nil
    let onReset: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            Text(name)
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)

            HStack(spacing: 8) {
                toolButton(
                    symbol: "trash.fill",
                    tint: .red,
                    label: "Delete from scene",
                    id: "delete",
                    action: onDelete
                )
                toolButton(
                    symbol: presentation.glowEnabled ? "lightbulb.fill" : "lightbulb",
                    tint: .yellow,
                    label: presentation.glowEnabled ? "Glow on" : "Glow off",
                    id: "glow",
                    action: onToggleGlow
                )
                toolButton(
                    symbol: presentation.swayEnabled ? "wind" : "minus.circle",
                    tint: .mint,
                    label: presentation.swayEnabled ? "Sway on" : "Sway off",
                    id: "sway",
                    action: onToggleSway
                )

                Menu {
                    ForEach(World2POISkinPreset.allCases) { preset in
                        Button(preset.title) {
                            onPickSkin(preset)
                        }
                    }
                } label: {
                    Image(systemName: "paintpalette.fill")
                        .font(.system(size: 14, weight: .black))
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(Color.purple.opacity(0.92), in: Circle())
                }
                .accessibilityLabel("Reskin")
                .accessibilityIdentifier("world2.poi.toolbar.skin")

                if let onRefine {
                    World2DevRefineButton(
                        accessibilityID: "world2.dev.refine.poi",
                        action: onRefine
                    )
                }

                toolButton(
                    symbol: "arrow.counterclockwise",
                    tint: .cyan,
                    label: "Reset size and style",
                    id: "reset",
                    action: onReset
                )
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(.black.opacity(0.78), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(.white.opacity(0.35), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.35), radius: 10, y: 4)
    }

    private func toolButton(
        symbol: String,
        tint: Color,
        label: String,
        id: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .black))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(tint.opacity(0.92), in: Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier("world2.poi.toolbar.\(id)")
    }
}
