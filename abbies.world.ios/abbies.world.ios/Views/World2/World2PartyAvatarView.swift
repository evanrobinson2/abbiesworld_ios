//
//  World2PartyAvatarView.swift
//  abbies.world.ios
//
//  Meshy USDZ avatar for a party piece. Idle clip while settled; run clip
//  while walking to a selected POI. Falls back to the 2D figurine if load fails.
//

import RealityKit
import SwiftUI
import simd

struct World2PartyAvatarViewport: View {
    let actor: World2PartyActorID
    let isWalking: Bool
    let facingRight: Bool
    let size: CGFloat

    @State private var coordinator = AvatarSceneCoordinator()
    @State private var loadFailed = false

    var body: some View {
        ZStack {
            if loadFailed {
                Image(actor.imageAssetName)
                    .resizable()
                    .scaledToFit()
                    .scaleEffect(x: facingRight ? 1 : -1, y: 1)
            }

            RealityView { content in
                content.camera = .virtual
                let root = coordinator.ensureRoot()
                if root.parent == nil {
                    content.add(root)
                }
            } update: { _ in
                coordinator.setFacingRight(facingRight)
                coordinator.setWalking(isWalking)
            }
            .opacity(loadFailed ? 0 : 1)
            .task(id: actor.rawValue) {
                let ok = await coordinator.load(actor: actor)
                loadFailed = !ok
            }
        }
        .frame(width: size, height: size)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

@MainActor
private final class AvatarSceneCoordinator {
    private let root = Entity()
    private var character: Entity?
    private var idleAnimation: AnimationResource?
    private var runAnimation: AnimationResource?
    private var playback: AnimationPlaybackController?
    private var loadedActor: World2PartyActorID?
    private var appliedWalking: Bool?
    private var didConfigureLights = false

    func ensureRoot() -> Entity {
        if !didConfigureLights {
            didConfigureLights = true
            root.name = "partyAvatarRoot"

            let key = DirectionalLight()
            key.light.color = .white
            key.light.intensity = 2200
            key.look(at: [0, 0.5, 0], from: [2.2, 3.4, 2.4], relativeTo: nil)
            root.addChild(key)

            let fill = DirectionalLight()
            fill.light.color = .init(red: 0.78, green: 0.86, blue: 1.0, alpha: 1)
            fill.light.intensity = 700
            fill.look(at: [0, 0.5, 0], from: [-2.5, 1.8, -1.5], relativeTo: nil)
            root.addChild(fill)

            let camera = PerspectiveCamera()
            camera.camera.fieldOfViewInDegrees = 32
            camera.look(at: [0, 0.55, 0], from: [2.6, 2.4, 2.6], relativeTo: nil)
            root.addChild(camera)
        }
        return root
    }

    func load(actor: World2PartyActorID) async -> Bool {
        if loadedActor == actor, character != nil { return true }
        character?.removeFromParent()
        character = nil
        idleAnimation = nil
        runAnimation = nil
        playback?.stop()
        playback = nil
        appliedWalking = nil
        loadedActor = actor

        guard let url = Self.resourceURL(for: actor) else {
            World2Diagnostics.log(
                "party_avatar_missing",
                ["actor": actor.rawValue]
            )
            return false
        }

        do {
            let entity = try await Entity(contentsOf: url)
            normalizeHeight(entity, targetHeight: 1.15)
            entity.position = .zero
            _ = ensureRoot()
            root.addChild(entity)
            character = entity

            var library: [String: AnimationResource] = [:]
            collectAnimations(from: entity, into: &library)
            idleAnimation = resolve(hints: actor.idleClipHints, in: library)
            runAnimation = resolve(hints: actor.runClipHints, in: library)

            World2Diagnostics.log(
                "party_avatar_loaded",
                [
                    "actor": actor.rawValue,
                    "clips": library.keys.sorted().joined(separator: ","),
                    "idle": idleAnimation?.name ?? "none",
                    "run": runAnimation?.name ?? "none",
                ]
            )
            setWalking(false, force: true)
            return true
        } catch {
            World2Diagnostics.log(
                "party_avatar_load_failed",
                ["actor": actor.rawValue, "error": error.localizedDescription]
            )
            return false
        }
    }

    func setFacingRight(_ facingRight: Bool) {
        guard let character else { return }
        let yaw: Float = facingRight ? 0.55 : (0.55 + .pi)
        character.orientation = simd_quatf(angle: yaw, axis: [0, 1, 0])
    }

    func setWalking(_ isWalking: Bool, force: Bool = false) {
        guard let character else { return }
        if !force, appliedWalking == isWalking { return }
        appliedWalking = isWalking
        playback?.stop()
        // Abbie's Meshy pack has no true idle — freeze when idleAnimation is nil.
        guard let resource = isWalking ? runAnimation : idleAnimation else { return }
        // Loop "forever" with a huge repeat count (API takes Int on this SDK).
        if let looping = try? resource.repeat(count: .max) {
            playback = character.playAnimation(looping, transitionDuration: 0.18)
        } else {
            playback = character.playAnimation(resource, transitionDuration: 0.18)
        }
    }

    private func normalizeHeight(_ entity: Entity, targetHeight: Float) {
        let bounds = entity.visualBounds(relativeTo: nil)
        let height = bounds.extents.y
        guard height > 0.001 else { return }
        let scale = targetHeight / height
        entity.scale = SIMD3<Float>(repeating: scale)
        entity.position.y -= bounds.min.y * scale
    }

    private func collectAnimations(
        from entity: Entity,
        into library: inout [String: AnimationResource]
    ) {
        for animation in entity.availableAnimations {
            let rawName = animation.name ?? ""
            let name = rawName.isEmpty ? "unnamed_\(library.count)" : rawName
            library[name] = animation
        }
        for child in entity.children {
            collectAnimations(from: child, into: &library)
        }
    }

    private func resolve(
        hints: [String],
        in library: [String: AnimationResource]
    ) -> AnimationResource? {
        guard !hints.isEmpty else { return nil }
        let names = Array(library.keys)
        for hint in hints {
            if let exact = names.first(where: { $0.caseInsensitiveCompare(hint) == .orderedSame }) {
                return library[exact]
            }
            if let partial = names.first(where: {
                $0.localizedCaseInsensitiveContains(hint)
            }) {
                return library[partial]
            }
        }
        return nil
    }

    private static func resourceURL(for actor: World2PartyActorID) -> URL? {
        let name = actor.usdzResourceName
        let subdirs = ["World2Actors", "Resources/World2Actors", nil as String?]
        for subdir in subdirs {
            if let subdir,
               let url = Bundle.main.url(
                forResource: name,
                withExtension: "usdz",
                subdirectory: subdir
               ) {
                return url
            }
            if subdir == nil,
               let url = Bundle.main.url(forResource: name, withExtension: "usdz") {
                return url
            }
        }
        return nil
    }
}
