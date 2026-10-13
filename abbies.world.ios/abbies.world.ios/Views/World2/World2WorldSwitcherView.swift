//
//  World2WorldSwitcherView.swift
//  abbies.world.ios
//
//  Abby avatar world picker — shows every known world.
//  Locked cards stay visible with a hint on how to unlock.
//

import SwiftUI

struct World2WorldSwitcherView: View {
    let entries: [World2SwitcherEntry]
    let onSelect: (World2SwitcherEntry) -> Void
    let onOpenPlayerMenu: () -> Void
    let onClose: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.12, green: 0.28, blue: 0.22),
                    Color(red: 0.08, green: 0.14, blue: 0.28),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 18) {
                HStack {
                    Button(action: onClose) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white.opacity(0.9))
                    }
                    .accessibilityIdentifier("world2.worldSwitcher.close")

                    Spacer()

                    VStack(spacing: 2) {
                        Text("Worlds")
                            .font(.system(size: 28, weight: .black, design: .rounded))
                        Text("Tap one to go — locked ones tell you how")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .opacity(0.85)
                            .multilineTextAlignment(.center)
                    }
                    .foregroundStyle(.white)

                    Spacer()

                    Button(action: onOpenPlayerMenu) {
                        Image(systemName: "shippingbox.fill")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white.opacity(0.9))
                            .padding(8)
                            .background(.white.opacity(0.15), in: Circle())
                    }
                    .accessibilityLabel("Player menu")
                    .accessibilityIdentifier("world2.worldSwitcher.playerMenu")
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)

                ScrollView {
                    LazyVGrid(
                        columns: [GridItem(.adaptive(minimum: 200), spacing: 16)],
                        spacing: 16
                    ) {
                        ForEach(entries) { entry in
                            Button {
                                onSelect(entry)
                            } label: {
                                entryCard(entry)
                            }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier("world2.worldSwitcher.entry.\(entry.id)")
                            .accessibilityValue(entry.isUnlocked ? "unlocked" : "locked")
                        }
                    }
                    .padding(20)
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.worldSwitcher.screen")
    }

    private func entryCard(_ entry: World2SwitcherEntry) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: iconName(for: entry))
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(entry.isUnlocked ? .white : .white.opacity(0.55))
                Spacer()
                if entry.isCurrent {
                    Text("HERE")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.85), in: Capsule())
                } else if !entry.isUnlocked {
                    Label("LOCKED", systemImage: "lock.fill")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange.opacity(0.9), in: Capsule())
                }
            }
            Text(entry.name)
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(.white.opacity(entry.isUnlocked ? 1 : 0.75))
                .lineLimit(2)
            Text(entry.summary)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.8))
                .lineLimit(3)
            if !entry.isUnlocked, let hint = entry.unlockHint {
                Text(hint)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.orange.opacity(0.95))
                    .lineLimit(4)
            }
            // Server revision is parent/debug metadata — keep off kid-facing cards.
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: 140, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(.white.opacity(entry.isCurrent ? 0.22 : entry.isUnlocked ? 0.12 : 0.06))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(
                    entry.isCurrent
                        ? Color.white.opacity(0.55)
                        : entry.isUnlocked
                            ? Color.white.opacity(0.2)
                            : Color.orange.opacity(0.45),
                    lineWidth: 2
                )
        )
        .opacity(entry.isUnlocked ? 1 : 0.92)
    }

    private func iconName(for entry: World2SwitcherEntry) -> String {
        if !entry.isUnlocked { return "lock.fill" }
        switch entry.kind {
        case .marbleVoyage: return "circle.grid.cross.fill"
        case .serverDocument:
            if entry.id.contains("home") { return "house.fill" }
            return "globe.americas.fill"
        }
    }
}
