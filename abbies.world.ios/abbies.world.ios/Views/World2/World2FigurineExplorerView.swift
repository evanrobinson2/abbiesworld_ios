//
//  World2FigurineExplorerView.swift
//  abbies.world.ios
//
//  Sandbox inside the Figurine Explorer on Daddy's Citadel.
//  Cycle bundled Meshy characters, play a clip in place, orbit the camera.
//

import RealityKit
import SwiftUI

struct World2FigurineExplorerView: View {
    let onExit: () -> Void

    @State private var coordinator = World2ActorSceneCoordinator()
    @State private var actor: World2PartyActorID = .daddy
    @State private var activeClip = "idle"
    @State private var frozen = false
    @State private var azimuth: Float = 0.85
    @State private var elevation: Float = 0.42
    @State private var dragAzimuth: Float = 0.85
    @State private var dragElevation: Float = 0.42
    @State private var loadFailed = false

    private let archetype = World2POIRegistry.figurineExplorer

    var body: some View {
        GeometryReader { geo in
            ZStack {
                World2SemanticImage(
                    semanticName: archetype.interiorAsset ?? "poi.figurineExplorer.interior",
                    fallbackIcon: "figure.stand",
                    fallbackLabel: "Figurine Explorer"
                )
                .scaledToFill()
                .frame(width: geo.size.width, height: geo.size.height)
                .clipped()
                .ignoresSafeArea()

                RealityView { content in
                    content.camera = .virtual
                    let root = coordinator.ensureRoot()
                    if root.parent == nil {
                        content.add(root)
                    }
                } update: { _ in
                    coordinator.setOrbit(azimuth: azimuth, elevation: elevation)
                    coordinator.setYaw(0.35)
                }
                .opacity(loadFailed ? 0.15 : 1)
                .frame(
                    width: min(geo.size.width * 0.7, 720),
                    height: min(geo.size.height * 0.62, 640)
                )
                .gesture(orbitGesture)
                .accessibilityIdentifier("world2.figurineExplorer.viewport")

                if loadFailed {
                    Text("Could not load \(actor.displayName)")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }

                VStack(spacing: 12) {
                    header
                    Spacer()
                    controlDeck
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 16)
            }
        }
        .ignoresSafeArea()
        .task(id: actor.rawValue) {
            await reload()
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.figurineExplorer")
        .world2InteriorActions(
            exitAccessibilityID: "world2.figurineExplorer.exit",
            onExit: onExit
        )
    }

    private var header: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(archetype.name)
                    .font(.system(size: 18, weight: .black, design: .rounded))
                Text(statusLine)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .accessibilityIdentifier("world2.figurineExplorer.status")
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

            Spacer()
        }
    }

    private var controlDeck: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Drag the figure to walk around it. Clips play on the spot.")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.9))

            HStack(spacing: 8) {
                ForEach(World2PartyActorID.allCases) { candidate in
                    Button {
                        actor = candidate
                    } label: {
                        Text(candidate.displayName)
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .foregroundStyle(actor == candidate ? .black : .white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(
                                actor == candidate ? Color.yellow : Color.white.opacity(0.16),
                                in: Capsule()
                            )
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.figurineExplorer.actor.\(candidate.rawValue)")
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    clipButton(title: "Freeze", id: "freeze", isOn: frozen) {
                        frozen = true
                        activeClip = "freeze"
                        coordinator.freeze()
                    }
                    ForEach(coordinator.visualGaits, id: \.self) { gait in
                        let title = gait.rawValue.capitalized
                        clipButton(
                            title: title,
                            id: gait.rawValue,
                            isOn: !frozen && activeClip == gait.rawValue
                        ) {
                            frozen = false
                            activeClip = gait.rawValue
                            coordinator.setGait(gait, force: true)
                        }
                    }
                }
            }
        }
        .padding(14)
        .background(.black.opacity(0.62), in: RoundedRectangle(cornerRadius: 18))
    }

    private func clipButton(
        title: String,
        id: String,
        isOn: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(isOn ? .black : .white)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isOn ? Color.orange : Color.white.opacity(0.16), in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.figurineExplorer.clip.\(id)")
    }

    private var orbitGesture: some Gesture {
        DragGesture(minimumDistance: 4)
            .onChanged { value in
                azimuth = dragAzimuth - Float(value.translation.width) * 0.008
                elevation = min(
                    max(dragElevation + Float(value.translation.height) * 0.003, 0.15),
                    1.15
                )
            }
            .onEnded { _ in
                dragAzimuth = azimuth
                dragElevation = elevation
            }
    }

    private var statusLine: String {
        let degrees = Int((azimuth * 180 / .pi).rounded())
        let clip = frozen ? "freeze" : activeClip
        return "\(actor.displayName) · \(clip) · orbit \(degrees)° · in place"
    }

    private func reload() async {
        loadFailed = false
        let ok = await coordinator.load(actor: actor)
        loadFailed = !ok
        frozen = false
        activeClip = World2PartyGait.idle.rawValue
        coordinator.setGait(.idle, force: true)
        coordinator.setYaw(0.35)
        coordinator.setOrbit(azimuth: azimuth, elevation: elevation)
    }
}
