//
//  World2ExitMarker.swift
//  abbies.world.ios
//
//  One exit language for overland travel: cardinal edge + destination plate
//  thumbnail (the mini scene you walk into) — never a placeholder pill.
//

import SwiftUI

enum World2ExitEdge: Equatable, Sendable {
    case leading
    case trailing
    case top
    case bottom

    var alignment: Alignment {
        switch self {
        case .leading: return .leading
        case .trailing: return .trailing
        case .top: return .top
        case .bottom: return .bottom
        }
    }

    var systemArrow: String {
        switch self {
        case .leading: return "arrow.left"
        case .trailing: return "arrow.right"
        case .top: return "arrow.up"
        case .bottom: return "arrow.down"
        }
    }

    var arrowOnTrailing: Bool {
        switch self {
        case .trailing, .bottom: return true
        case .leading, .top: return false
        }
    }

    /// Where the exit pill sits. `slot` separates pills that share an edge.
    func markerFrame(
        slot: Int,
        count: Int,
        in size: CGSize,
        topInset: CGFloat = 88,
        bottomInset: CGFloat = 24
    ) -> CGRect {
        // Wide enough for destination scene plate + label.
        let pill = CGSize(width: 268, height: 78)
        let spread = CGFloat(slot) - CGFloat(max(count - 1, 0)) / 2
        switch self {
        case .leading:
            let y = size.height * 0.42 + spread * 92
            return CGRect(x: 14, y: y - pill.height / 2, width: pill.width, height: pill.height)
        case .trailing:
            let y = size.height * 0.42 + spread * 92
            return CGRect(
                x: size.width - 14 - pill.width,
                y: y - pill.height / 2,
                width: pill.width,
                height: pill.height
            )
        case .top:
            let x = size.width * 0.5 + spread * (pill.width + 14)
            return CGRect(
                x: x - pill.width / 2,
                y: topInset,
                width: pill.width,
                height: pill.height
            )
        case .bottom:
            let x = size.width * 0.5 + spread * (pill.width + 14)
            return CGRect(
                x: x - pill.width / 2,
                y: size.height - bottomInset - pill.height,
                width: pill.width,
                height: pill.height
            )
        }
    }

    init(cardinal: World2CardinalDirection) {
        switch cardinal {
        case .west: self = .leading
        case .east: self = .trailing
        case .north: self = .top
        case .south: self = .bottom
        }
    }
}

/// Cardinal exit on the play map: arrow + destination scene thumbnail.
struct World2MapTravelExit: Identifiable, Equatable, Sendable {
    let destinationSceneID: String
    let title: String
    let plateAsset: String
    let direction: World2CardinalDirection

    var id: String { "\(direction.rawValue).\(destinationSceneID)" }

    /// Build edge exits from the overland graph, falling back to travel POI pads.
    static func build(
        connectors: [World2SceneConnector],
        travelPads: [(destinationSceneID: String, x: Double, y: Double)],
        presentation: (String) -> (title: String, plateAsset: String)
    ) -> [World2MapTravelExit] {
        var exits: [World2MapTravelExit] = []
        var seen = Set<String>()

        for connector in connectors {
            guard let destination = connector.toSceneID,
                  seen.insert(destination).inserted
            else { continue }
            let shown = presentation(destination)
            exits.append(
                World2MapTravelExit(
                    destinationSceneID: destination,
                    title: shown.title,
                    plateAsset: shown.plateAsset,
                    direction: connector.direction
                )
            )
        }

        if exits.isEmpty {
            for pad in travelPads {
                guard seen.insert(pad.destinationSceneID).inserted else { continue }
                let shown = presentation(pad.destinationSceneID)
                let direction = World2MinimapAutoLayout.direction(
                    fromPlateX: pad.x,
                    y: pad.y
                )
                exits.append(
                    World2MapTravelExit(
                        destinationSceneID: pad.destinationSceneID,
                        title: shown.title,
                        plateAsset: shown.plateAsset,
                        direction: direction
                    )
                )
            }
        }

        return exits.sorted {
            if $0.direction.rawValue != $1.direction.rawValue {
                return $0.direction.rawValue < $1.direction.rawValue
            }
            return $0.title < $1.title
        }
    }
}

struct World2ExitMarker: View {
    let title: String
    var subtitle: String = "EXIT"
    var edge: World2ExitEdge = .leading
    var tint: Color = Color(red: 0.16, green: 0.52, blue: 0.68)
    /// Destination scene plate — the mini map you are walking into.
    var plateAsset: String? = nil
    var compact: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: compact ? 8 : 10) {
                if !edge.arrowOnTrailing {
                    arrowBadge
                }
                if let plateAsset, !plateAsset.isEmpty {
                    World2SemanticImage(
                        semanticName: plateAsset,
                        fallbackIcon: "map.fill",
                        fallbackLabel: title
                    )
                    // Destination scene plate — the mini world you walk into.
                    .scaledToFill()
                    .frame(width: compact ? 52 : 78, height: compact ? 52 : 78)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(.white.opacity(0.85), lineWidth: 2)
                    )
                    .accessibilityHidden(true)
                }
                VStack(alignment: edge.arrowOnTrailing ? .trailing : .leading, spacing: 1) {
                    Text(subtitle)
                        .font(.system(size: compact ? 9 : 10, weight: .black, design: .rounded))
                        .foregroundStyle(.white.opacity(0.82))
                    Text(title)
                        .font(.system(size: compact ? 15 : 17, weight: .black, design: .rounded))
                        .lineLimit(2)
                        .multilineTextAlignment(edge.arrowOnTrailing ? .trailing : .leading)
                }
                .frame(maxWidth: .infinity, alignment: edge.arrowOnTrailing ? .trailing : .leading)
                if edge.arrowOnTrailing {
                    arrowBadge
                }
            }
            .foregroundStyle(.white)
            .padding(.leading, edge.arrowOnTrailing ? 14 : 8)
            .padding(.trailing, edge.arrowOnTrailing ? 8 : 14)
            .padding(.vertical, compact ? 6 : 10)
            .frame(minHeight: compact ? 56 : 88)
            .background(tint.opacity(0.94), in: Capsule())
            .overlay(Capsule().stroke(.white.opacity(0.72), lineWidth: 2))
            .shadow(color: tint.opacity(0.45), radius: 3, y: 1)
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Go \(subtitle.lowercased()) to \(title)")
        .accessibilityHint(subtitle)
    }

    private var arrowBadge: some View {
        Image(systemName: edge.systemArrow)
            .font(.system(size: compact ? 18 : 22, weight: .black))
            .frame(width: compact ? 28 : 34, height: compact ? 28 : 34)
            .background(.white.opacity(0.22), in: Circle())
            .accessibilityHidden(true)
    }
}
