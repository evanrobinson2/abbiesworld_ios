//
//  World2SandboxToolRail.swift
//  abbies.world.ios
//
//  Dockable left tool rail. Expanded: tools only (no character portrait).
//  Docked: a bottom bump-out pulls it back open.
//

import SwiftUI

struct World2SandboxToolRail: View {
    @ObservedObject private var invent = World2SceneDecorationInventService.shared
    @ObservedObject private var world = World2WorldSync.shared
    @ObservedObject private var playerService = PlayerStateService.shared
    @AppStorage("world2.sandbox.toolRail.docked") private var isDocked = false

    var isBuilding: Bool = false
    let onEdit: () -> Void
    let onInvent: () -> Void
    let onDecorate: () -> Void
    var onCompletions: (() -> Void)? = nil
    var onOpenMinimap: (() -> Void)? = nil

    private var completionCount: Int {
        let inventory = playerService.currentPlayer?.availableGeneratedDecorations.count ?? 0
        return max(inventory, invent.history.reduce(0) { $0 + $1.result.awarded.count })
    }

    var body: some View {
        Group {
            if isDocked {
                dockedHook
                    .transition(.move(edge: .leading).combined(with: .opacity))
            } else {
                expandedRail
                    .transition(.move(edge: .leading).combined(with: .opacity))
            }
        }
        // Clear the scene title chip (leading banner) — one pad for docked + expanded.
        .padding(.top, 86)
        .animation(.spring(response: 0.38, dampingFraction: 0.84), value: isDocked)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.sandbox.toolRail")
    }

    /// Mini bump — the only chrome when docked.
    private var dockedHook: some View {
        Button {
            isDocked = false
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .black))
                VStack(spacing: 6) {
                    Image(systemName: "hammer.fill")
                        .font(.system(size: 11, weight: .black))
                    Image(systemName: "wand.and.stars")
                        .font(.system(size: 11, weight: .black))
                    Image(systemName: "paintbrush.pointed.fill")
                        .font(.system(size: 11, weight: .black))
                }
            }
            .foregroundStyle(.white)
            .padding(.leading, 8)
            .padding(.trailing, 10)
            .padding(.vertical, 12)
            .background(.black.opacity(0.55), in: UnevenRoundedRectangle(
                topLeadingRadius: 4,
                bottomLeadingRadius: 4,
                bottomTrailingRadius: 16,
                topTrailingRadius: 16
            ))
            .overlay(
                UnevenRoundedRectangle(
                    topLeadingRadius: 4,
                    bottomLeadingRadius: 4,
                    bottomTrailingRadius: 16,
                    topTrailingRadius: 16
                )
                .stroke(.white.opacity(0.35), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Show tools")
        .accessibilityIdentifier("world2.sandbox.toolRail.dockHook")
    }

    private var expandedRail: some View {
        VStack(spacing: 8) {
            railButton(
                symbol: "hammer.fill",
                tint: isBuilding ? .orange : Color(white: 0.22),
                label: isBuilding ? "Building" : "Build is off",
                id: "edit",
                dimmed: !isBuilding,
                action: onEdit
            )
            railButton(
                symbol: "wand.and.stars",
                tint: .purple,
                label: "Invent props",
                id: "invent",
                badge: invent.history.count,
                action: onInvent
            )
            if let onCompletions {
                railButton(
                    symbol: "photo.on.rectangle.angled",
                    tint: .indigo,
                    label: "Completions",
                    id: "completions",
                    badge: completionCount,
                    action: onCompletions
                )
            }
            if let onOpenMinimap {
                railButton(
                    symbol: "map.fill",
                    tint: .teal,
                    label: "Minimap",
                    id: "minimap",
                    action: onOpenMinimap
                )
            }
            railButton(
                symbol: "paintbrush.pointed.fill",
                tint: world.accentColor(.pink),
                label: "Decorate scene",
                id: "decorate",
                action: onDecorate
            )

            Button {
                isDocked = true
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 13, weight: .black))
                    .foregroundStyle(.white.opacity(0.85))
                    .frame(width: 44, height: 28)
                    .background(Color.white.opacity(0.12), in: Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Hide tools")
            .accessibilityIdentifier("world2.sandbox.toolRail.dock")
        }
        .padding(8)
        .background(.black.opacity(0.42), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(.white.opacity(0.28), lineWidth: 1)
        )
    }

    private func railButton(
        symbol: String,
        tint: Color,
        label: String,
        id: String,
        badge: Int = 0,
        dimmed: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: symbol)
                    .font(.system(size: 16, weight: .black))
                    .foregroundStyle(.white.opacity(dimmed ? 0.38 : 1))
                    .frame(width: 44, height: 44)
                    .background(tint.opacity(dimmed ? 1 : 0.92), in: Circle())
                    .overlay(
                        Circle().stroke(
                            .white.opacity(dimmed ? 0.18 : 0.55),
                            lineWidth: 1.5
                        )
                    )

                if badge > 0 {
                    Text("\(min(badge, 9))")
                        .font(.system(size: 10, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(minWidth: 16, minHeight: 16)
                        .padding(.horizontal, 2)
                        .background(.orange, in: Capsule())
                        .offset(x: 4, y: -4)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier("world2.sandbox.toolRail.\(id)")
    }
}
