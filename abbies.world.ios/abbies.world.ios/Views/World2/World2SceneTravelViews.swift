//
//  World2SceneTravelViews.swift
//  abbies.world.ios
//
//  NESW chrome for scene travel. Every map shows four sockets. A live path
//  gets a named arrow; an empty path gets a quieter ghost that rubber-bands.
//

import SwiftUI

struct World2CompassSocket: Equatable {
    var compass: World2Compass
    var title: String
    var destinationSceneID: String?
    var isOpen: Bool

    var destinationWorldID: WorldId? {
        destinationSceneID.flatMap(WorldId.init(sceneID:))
    }
}

struct World2CompassNavigation: View {
    let sockets: [World2CompassSocket]
    let bottomInset: CGFloat
    let onSelect: (World2Compass) -> Void

    var body: some View {
        ZStack {
            ForEach(sockets) { socket in
                World2TravelArrow(
                    title: socket.title,
                    direction: socket.compass.label,
                    systemName: socket.compass.systemImage,
                    tint: tint(for: socket),
                    isGhost: !socket.isOpen
                ) {
                    onSelect(socket.compass)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: alignment(for: socket.compass))
                .padding(insets(for: socket.compass))
                .accessibilityIdentifier(identifier(for: socket))
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.world.travelArrows")
    }

    private func alignment(for compass: World2Compass) -> Alignment {
        switch compass {
        case .north: return .top
        case .south: return .bottom
        case .east: return .trailing
        case .west: return .leading
        }
    }

    private func insets(for compass: World2Compass) -> EdgeInsets {
        switch compass {
        case .north:
            return EdgeInsets(top: 92, leading: 180, bottom: 0, trailing: 180)
        case .south:
            return EdgeInsets(top: 0, leading: 180, bottom: bottomInset, trailing: 180)
        case .east:
            return EdgeInsets(top: 110, leading: 0, bottom: 110, trailing: 18)
        case .west:
            return EdgeInsets(top: 110, leading: 18, bottom: 110, trailing: 0)
        }
    }

    private func tint(for socket: World2CompassSocket) -> Color {
        guard socket.isOpen else { return .white.opacity(0.55) }
        switch socket.destinationWorldID {
        case .farm: return .green
        case .threeBears: return .brown
        case .blankSlate: return .cyan
        case .work: return .orange
        default: return .indigo
        }
    }

    private func identifier(for socket: World2CompassSocket) -> String {
        if socket.isOpen {
            if let destination = socket.destinationWorldID {
                return "world2.world.\(destination.rawValue)"
            }
            return "world2.compass.\(socket.compass.rawValue).live"
        }
        return "world2.compass.\(socket.compass.rawValue)"
    }
}

extension World2CompassSocket: Identifiable {
    var id: World2Compass { compass }
}

struct World2TravelArrow: View {
    let title: String
    let direction: String
    let systemName: String
    let tint: Color
    var isGhost: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: systemName)
                    .font(.system(size: 25, weight: .black))
                    .frame(width: 34, height: 34)
                    .background(.white.opacity(isGhost ? 0.10 : 0.20), in: Circle())

                VStack(alignment: .leading, spacing: 0) {
                    Text(direction)
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .foregroundStyle(.white.opacity(isGhost ? 0.50 : 0.72))
                    Text(title)
                        .font(.system(size: 16, weight: .black, design: .rounded))
                }
            }
            .foregroundStyle(.white.opacity(isGhost ? 0.78 : 1))
            .padding(.leading, 9)
            .padding(.trailing, 15)
            .padding(.vertical, 8)
            .background(tint.opacity(isGhost ? 0.42 : 0.94), in: Capsule())
            .overlay(Capsule().stroke(.white.opacity(isGhost ? 0.35 : 0.72), lineWidth: 2))
            .shadow(color: tint.opacity(isGhost ? 0.18 : 0.75), radius: isGhost ? 6 : 13)
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            isGhost
                ? "\(direction) is not a path yet"
                : "Travel \(direction.lowercased()) to \(title)"
        )
        .accessibilityHint(isGhost ? "Pulls back" : "Opens \(title)")
    }
}

struct World2PortalFlashOverlay: View {
    let progress: Double
    let kind: World2SceneTransition

    var body: some View {
        switch kind {
        case .portal:
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color.white.opacity(min(progress * 1.2, 1)),
                            Color.cyan.opacity(progress * 0.85),
                            Color.indigo.opacity(progress * 0.55),
                        ],
                        center: .center,
                        startRadius: 8,
                        endRadius: 900
                    )
                )
                .scaleEffect(0.2 + progress * 1.6)
                .opacity(progress < 0.85 ? 1 : (1 - (progress - 0.85) / 0.15))
                .ignoresSafeArea()
                .allowsHitTesting(false)
                .accessibilityIdentifier("world2.travel.portalFlash")
        case .dream:
            Color.black
                .opacity(progress)
                .ignoresSafeArea()
                .allowsHitTesting(false)
                .accessibilityIdentifier("world2.travel.dreamVeil")
        case .fade:
            Color.black
                .opacity(progress * 0.72)
                .ignoresSafeArea()
                .allowsHitTesting(false)
        case .slide:
            EmptyView()
        }
    }
}
