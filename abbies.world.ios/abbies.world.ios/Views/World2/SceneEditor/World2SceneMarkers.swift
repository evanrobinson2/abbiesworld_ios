//
//  World2SceneMarkers.swift
//  abbies.world.ios
//
//  What the map draws: the pads, and the places standing on them.
//
//  Pads read differently to players and developers on purpose. A child sees a
//  soft shimmering ring that says "something goes here one day"; a developer in
//  the scene editor sees the pad's name, what sizes it accepts, whether it is
//  locked, and can drag it.
//

import SwiftUI

/// How a pad should present itself right now.
enum World2HardpointMarkerMode: Equatable {
    /// Visible to a player as a quiet promise. Not interactive.
    case playerHint
    /// The hardpoint layer of the scene editor: full detail, draggable.
    case editing(isSelected: Bool)
    /// The places layer: a target to aim at while dragging a place.
    case snapTarget(isCandidate: Bool)
}

struct World2HardpointMarker: View {
    let hardpoint: World2SceneHardpoint
    let mode: World2HardpointMarkerMode
    let mapRect: CGRect
    let onTap: () -> Void
    let onMove: (World2NormalizedPoint) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @GestureState private var dragOffset = CGSize.zero

    private var isEditing: Bool {
        if case .editing = mode { return true }
        return false
    }

    private var isSelected: Bool {
        if case .editing(let selected) = mode { return selected }
        return false
    }

    private var isCandidate: Bool {
        if case .snapTarget(let candidate) = mode { return candidate }
        return false
    }

    private var tint: Color {
        switch mode {
        case .playerHint: return .white
        case .editing: return isSelected ? .cyan : .teal
        case .snapTarget: return isCandidate ? .green : .cyan
        }
    }

    /// The pull radius drawn to scale, so a developer can see what the magnet
    /// actually covers instead of guessing.
    private var pullDiameter: CGFloat {
        CGFloat(hardpoint.snapRadius) * mapRect.height * 2
    }

    var body: some View {
        content
            .position(
                x: mapRect.minX + mapRect.width * hardpoint.position.x,
                y: mapRect.minY + mapRect.height * hardpoint.position.y
            )
            .offset(dragOffset)
            .accessibilityElement(children: .combine)
            .accessibilityLabel(accessibilityLabel)
            .accessibilityValue(
                String(
                    format: "x %.3f, y %.3f, accepts %@",
                    hardpoint.position.x,
                    hardpoint.position.y,
                    hardpoint.acceptedSizeSummary
                )
            )
            .accessibilityIdentifier("world2.hardpoint.\(hardpoint.id)")
    }

    private var accessibilityLabel: String {
        switch mode {
        case .playerHint:
            return "Empty spot: \(hardpoint.name). Something new will go here."
        case .editing:
            return "Hardpoint \(hardpoint.name)\(hardpoint.isLocked ? ", locked" : "")"
        case .snapTarget:
            return "Snap target \(hardpoint.name)"
        }
    }

    @ViewBuilder
    private var content: some View {
        if isEditing {
            editingMarker
                .contentShape(Circle())
                .onTapGesture(perform: onTap)
                .gesture(dragGesture)
        } else {
            passiveMarker
                .allowsHitTesting(false)
        }
    }

    // MARK: - Player-facing

    private var passiveMarker: some View {
        ZStack {
            if case .snapTarget = mode {
                Circle()
                    .fill(tint.opacity(isCandidate ? 0.22 : 0.10))
                    .frame(width: pullDiameter, height: pullDiameter)
            }

            World2ShimmerRing(
                tint: tint,
                isAnimated: !reduceMotion,
                lineWidth: isCandidate ? 5 : 3
            )
            .frame(width: 76, height: 50)

            if isCandidate {
                Image(systemName: "arrow.down.to.line")
                    .font(.system(size: 20, weight: .black))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.6), radius: 3)
            } else if case .playerHint = mode {
                Image(systemName: "sparkle")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white.opacity(0.8))
                    .shadow(color: .black.opacity(0.5), radius: 3)
            }
        }
    }

    // MARK: - Developer-facing

    private var editingMarker: some View {
        VStack(spacing: 5) {
            ZStack {
                Circle()
                    .fill(tint.opacity(0.12))
                    .frame(width: pullDiameter, height: pullDiameter)
                Circle()
                    .stroke(
                        tint.opacity(0.55),
                        style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])
                    )
                    .frame(width: pullDiameter, height: pullDiameter)

                Circle()
                    .stroke(tint, lineWidth: isSelected ? 5 : 3)
                    .frame(width: 42, height: 42)

                Image(systemName: hardpoint.isLocked ? "lock.fill" : "target")
                    .font(.system(size: 17, weight: .black))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.6), radius: 3)
            }

            VStack(spacing: 0) {
                Text(hardpoint.name)
                    .font(.system(size: 11, weight: .black, design: .rounded))
                Text(hardpoint.acceptedSizeSummary.uppercased())
                    .font(.system(size: 8, weight: .black, design: .rounded))
                    .foregroundStyle(.white.opacity(0.75))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(tint.opacity(0.92), in: Capsule())
        }
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .updating($dragOffset) { value, state, _ in
                guard !hardpoint.isLocked else { return }
                state = value.translation
            }
            .onEnded { value in
                guard !hardpoint.isLocked, mapRect.width > 1, mapRect.height > 1 else {
                    return
                }
                onMove(
                    hardpoint.position.offset(
                        dx: value.translation.width / mapRect.width,
                        dy: value.translation.height / mapRect.height
                    )
                )
            }
    }
}

/// A soft dashed ring that rotates slowly. Reads as "reserved" rather than
/// "broken", which matters because players see these.
private struct World2ShimmerRing: View {
    let tint: Color
    let isAnimated: Bool
    let lineWidth: CGFloat

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 20.0, paused: !isAnimated)) { timeline in
            let phase = timeline.date.timeIntervalSinceReferenceDate
                .truncatingRemainder(dividingBy: 3.0) / 3.0
            Ellipse()
                .stroke(
                    tint.opacity(0.75),
                    style: StrokeStyle(
                        lineWidth: lineWidth,
                        lineCap: .round,
                        dash: [9, 7],
                        dashPhase: CGFloat(phase) * 32
                    )
                )
                .shadow(color: tint.opacity(0.7), radius: 6)
                .background(
                    Ellipse().fill(tint.opacity(0.12))
                )
        }
        .accessibilityHidden(true)
    }
}

// MARK: - Places

struct World2POIInstanceMarker: View {
    let archetype: World2POIArchetype
    let instance: World2POIInstance
    let mapRect: CGRect
    let viewSize: CGSize
    /// True while the places layer of the scene editor is live.
    let isEditable: Bool
    let isSelected: Bool
    /// True in the hardpoint layer, where places step out of the way.
    let isDimmed: Bool
    let onTap: () -> Void
    let onDragChanged: (World2NormalizedPoint) -> Void
    let onDragEnded: (World2NormalizedPoint) -> Void
    let onScale: (Double) -> Void
    let onRotation: (Double) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isPulsing = false
    @GestureState private var dragOffset = CGSize.zero
    @GestureState private var gestureScale = 1.0
    @GestureState private var gestureRotation = Angle.zero

    /// The name pill hangs under the artwork, so drop the stack to put the
    /// building — not the label — on the painted spot.
    private var artworkAnchorDrop: CGFloat {
        18 * markerScale
    }

    /// Keep buildings the same size relative to the painting when the map is
    /// letterboxed.
    private var markerScale: Double {
        guard viewSize.width > 1 else { return instance.transform.scale }
        return instance.transform.scale * (mapRect.width / viewSize.width)
    }

    private var glowColor: Color {
        if isEditable && isSelected { return .orange }
        switch archetype.kind {
        case .minigame: return .cyan
        case .cardFactory: return .yellow
        case .story: return .orange
        case .factory: return .mint
        case .home:
            return archetype.ownerID == PlayerId.ani.rawValue ? .purple : .pink
        }
    }

    private var isHighlighted: Bool {
        isPulsing || (isEditable && isSelected)
    }

    var body: some View {
        Group {
            if isEditable {
                markerContent
                    .contentShape(Rectangle())
                    .onTapGesture(perform: onTap)
                    .gesture(dragGesture)
                    .simultaneousGesture(scaleGesture)
                    .simultaneousGesture(rotationGesture)
            } else {
                Button(action: onTap) {
                    markerContent
                }
                .buttonStyle(.plain)
                .disabled(isDimmed)
            }
        }
        .opacity(isDimmed ? 0.42 : 1)
        .position(
            x: mapRect.minX + mapRect.width * instance.transform.position.x,
            y: mapRect.minY + mapRect.height * instance.transform.position.y
                + artworkAnchorDrop
        )
        .offset(dragOffset)
        .zIndex(Double(instance.zIndex))
        .onAppear { isPulsing = !reduceMotion && !isEditable }
        .onDisappear { isPulsing = false }
        .accessibilityLabel("Explore \(archetype.name)")
        .accessibilityHint(
            isEditable
                ? "Drag to move and snap, pinch to resize, rotate with two fingers"
                : "Opens details about what is inside"
        )
        .accessibilityValue(
            isEditable
                ? "\(instance.transform.debugSummary), \(instance.hardpointID.map { "on \($0)" } ?? "freehand")"
                : ""
        )
        .accessibilityIdentifier("world2.poi.\(archetype.id)")
    }

    private var markerContent: some View {
        VStack(spacing: 7) {
            artworkStack
            nameLabel
        }
    }

    /// Painted art when it has been qualified into the bundle, the archetype's
    /// drawn stand-in otherwise.
    @ViewBuilder
    private var exteriorArtwork: some View {
        if let drawnArtStyle = archetype.drawnArtStyle,
           AssetBootstrapService.shared.image(for: archetype.exteriorAsset) == nil {
            World2POIDrawnArtwork(style: drawnArtStyle)
        } else {
            World2SemanticImage(
                semanticName: archetype.exteriorAsset,
                fallbackIcon: archetype.icon,
                fallbackLabel: "\(archetype.name) artwork is not bundled"
            )
            .scaledToFit()
        }
    }

    private var artworkStack: some View {
        ZStack {
            Ellipse()
                .fill(glowColor.opacity(isHighlighted ? 0.58 : 0.28))
                .frame(width: 180 * markerScale, height: 100 * markerScale)
                .blur(radius: isHighlighted ? 22 : 14)

            exteriorArtwork
            .frame(width: 230 * markerScale, height: 205 * markerScale)
            .shadow(
                color: glowColor.opacity(isHighlighted ? 0.95 : 0.58),
                radius: isHighlighted ? 20 : 12
            )
            .shadow(color: .black.opacity(0.38), radius: 10, y: 6)

            if isEditable && isSelected {
                RoundedRectangle(cornerRadius: 22)
                    .stroke(.orange, style: StrokeStyle(lineWidth: 3, dash: [8, 6]))
                    .frame(width: 230 * markerScale, height: 205 * markerScale)
            }
        }
        .rotationEffect(.degrees(instance.transform.rotationDegrees) + gestureRotation)
        .scaleEffect(
            (isEditable || reduceMotion ? 1 : (isPulsing ? 1.06 : 0.98)) * gestureScale
        )
        .animation(
            isEditable || reduceMotion
                ? nil
                : .easeInOut(duration: 1.15).repeatForever(autoreverses: true),
            value: isPulsing
        )
    }

    private var nameLabel: some View {
        HStack(spacing: 5) {
            Image(systemName: isEditable ? "move.3d" : "hand.tap.fill")
            Text(archetype.name)
            if isEditable && !instance.isSnapped {
                Image(systemName: "pin.slash.fill")
            }
        }
        .font(.system(size: 16, weight: .black, design: .rounded))
        .foregroundStyle(.white)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(
            isEditable ? .orange.opacity(0.88) : .black.opacity(0.62),
            in: Capsule()
        )
    }

    private func proposedPosition(for translation: CGSize) -> World2NormalizedPoint {
        instance.transform.position.offset(
            dx: translation.width / max(mapRect.width, 1),
            dy: translation.height / max(mapRect.height, 1)
        )
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .updating($dragOffset) { value, state, _ in
                state = value.translation
            }
            .onChanged { value in
                onDragChanged(proposedPosition(for: value.translation))
            }
            .onEnded { value in
                guard mapRect.width > 1, mapRect.height > 1 else { return }
                onDragEnded(proposedPosition(for: value.translation))
            }
    }

    private var scaleGesture: some Gesture {
        MagnificationGesture()
            .updating($gestureScale) { value, state, _ in
                state = value
            }
            .onEnded { value in
                onScale(instance.transform.scale * value)
            }
    }

    private var rotationGesture: some Gesture {
        RotationGesture()
            .updating($gestureRotation) { value, state, _ in
                state = value
            }
            .onEnded { value in
                onRotation(instance.transform.rotationDegrees + value.degrees)
            }
    }
}
