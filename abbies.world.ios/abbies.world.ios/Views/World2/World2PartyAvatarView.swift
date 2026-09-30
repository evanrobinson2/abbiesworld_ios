//
//  World2PartyAvatarView.swift
//  abbies.world.ios
//
//  Meshy USDZ avatar. Abbie stands in the bind pose when idle because her
//  clip named Idle is a slow walk. Walk and run are separate files.
//

import RealityKit
import SwiftUI
import UIKit
import simd

struct World2PartyAvatarViewport: View {
    let actor: World2PartyActorID
    let gait: World2PartyGait
    let heading: Float
    let stride: Double
    let size: CGFloat

    @State private var coordinator = World2ActorSceneCoordinator()
    @State private var loadFailed = false

    var body: some View {
        ZStack {
            if loadFailed, !World2WorldSync.shared.usesServerDocument {
                Image(actor.imageAssetName)
                    .resizable()
                    .scaledToFit()
            }

            RealityView { content in
                content.camera = .virtual
                let root = coordinator.ensureRoot()
                if root.parent == nil {
                    content.add(root)
                }
            } update: { _ in
                coordinator.setYaw(heading - actor.chestYawBias)
                coordinator.setGait(gait)
                coordinator.setPlaybackRate(Float(stride))
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
final class World2ActorSceneCoordinator {
    private struct ClipBinding {
        var entity: Entity
        var host: Entity
        var resource: AnimationResource
        var name: String
    }

    private let root = Entity()
    private var idleClip: ClipBinding?
    private var walkClip: ClipBinding?
    private var runClip: ClipBinding?
    private var playback: AnimationPlaybackController?
    private var loadedActor: World2PartyActorID?
    private var appliedGait: World2PartyGait?
    private var frozen = false
    private var didConfigureLights = false
    private var yaw: Float = 0.72

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
        if loadedActor == actor, walkClip != nil, runClip != nil { return true }
        idleClip?.entity.removeFromParent()
        walkClip?.entity.removeFromParent()
        runClip?.entity.removeFromParent()
        idleClip = nil
        walkClip = nil
        runClip = nil
        playback?.stop()
        playback = nil
        appliedGait = nil
        frozen = false
        loadedActor = actor

        guard let walkURL = Self.resourceURL(named: actor.walkUSDZResourceName),
              let runURL = Self.resourceURL(named: actor.runUSDZResourceName) else {
            World2Diagnostics.log(
                "party_avatar_missing",
                ["actor": actor.rawValue]
            )
            return false
        }

        do {
            let walking = try await Entity(contentsOf: walkURL)
            let running = try await Entity(contentsOf: runURL)
            guard let walkBinding = bind(walking, hints: actor.walkClipHints),
                  let runBinding = bind(running, hints: actor.runClipHints) else {
                World2Diagnostics.log(
                    "party_avatar_clip_missing",
                    ["actor": actor.rawValue]
                )
                return false
            }

            _ = ensureRoot()
            if let idleName = actor.idleUSDZResourceName,
               let idleURL = Self.resourceURL(named: idleName),
               let idleEntity = try? await Entity(contentsOf: idleURL),
               let idleBinding = bind(idleEntity, hints: actor.idleClipHints) {
                root.addChild(idleBinding.entity)
                idleClip = idleBinding
            }
            root.addChild(walkBinding.entity)
            root.addChild(runBinding.entity)
            walkClip = walkBinding
            runClip = runBinding
            applyYaw()

            World2Diagnostics.log(
                "party_avatar_loaded",
                [
                    "actor": actor.rawValue,
                    "idle": idleClip?.name ?? "bind-pose",
                    "walk": walkBinding.name,
                    "run": runBinding.name,
                ]
            )
            setGait(.idle, force: true)
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
        let intoScene: Float = 0.72
        yaw = facingRight ? intoScene : (intoScene + .pi)
        applyYaw()
    }

    func setYaw(_ yaw: Float) {
        self.yaw = yaw
        applyYaw()
    }

    func setPlaybackRate(_ rate: Float) {
        let clamped = min(max(rate, 0.55), 1.15)
        playback?.speed = clamped
    }

    /// Orbit the studio camera around a figurine that stays put (run in place).
    func setOrbit(azimuth: Float, elevation: Float) {
        guard let camera = root.children.first(where: { $0 is PerspectiveCamera }) else { return }
        let radius: Float = 3.15
        let elev = min(max(elevation, 0.15), 1.25)
        let x = radius * cos(elev) * sin(azimuth)
        let y = 0.55 + radius * sin(elev) * 0.55
        let z = radius * cos(elev) * cos(azimuth)
        camera.look(at: [0, 0.62, 0], from: [x, y, z], relativeTo: nil)
    }

    /// Visual labels for the studio. Clip names now match the motion.
    var visualGaits: [World2PartyGait] { [.idle, .walk, .run] }

    func playClip(named name: String) {
        frozen = false
        setGait(Self.gait(forPresentedName: name, actor: loadedActor), force: true)
    }

    static func gait(forPresentedName name: String, actor: World2PartyActorID?) -> World2PartyGait {
        let lowered = name.lowercased()
        if lowered.contains("run") { return .run }
        if lowered.contains("walk") { return .walk }
        return .idle
    }

    func freeze() {
        frozen = true
        playback?.stop()
        playback = nil
        appliedGait = nil
        show(idleClip ?? walkClip)
    }

    func setGait(_ gait: World2PartyGait, force: Bool = false) {
        guard walkClip != nil, runClip != nil else { return }
        if frozen, !force { return }
        if !force, appliedGait == gait { return }
        frozen = false
        appliedGait = gait

        switch gait {
        case .idle:
            if let idleClip {
                show(idleClip)
                play(idleClip.resource, on: idleClip.host, transition: 0.35)
            } else if let walkClip {
                show(walkClip)
                playback?.stop()
                playback = nil
            }
        case .walk:
            guard let walkClip else { return }
            show(walkClip)
            play(walkClip.resource, on: walkClip.host, transition: 0.2)
        case .run:
            guard let runClip else { return }
            show(runClip)
            play(runClip.resource, on: runClip.host, transition: 0.15)
        }
    }

    private func show(_ binding: ClipBinding?) {
        let shown = binding?.entity
        idleClip?.entity.isEnabled = idleClip?.entity === shown
        walkClip?.entity.isEnabled = walkClip?.entity === shown
        runClip?.entity.isEnabled = runClip?.entity === shown
    }

    private func applyYaw() {
        let turn = simd_quatf(angle: yaw, axis: SIMD3<Float>(0, 1, 0))
        idleClip?.entity.orientation = turn
        walkClip?.entity.orientation = turn
        runClip?.entity.orientation = turn
    }

    private func play(
        _ resource: AnimationResource,
        on owner: Entity,
        transition: TimeInterval
    ) {
        playback?.stop()
        let looping = resource.repeat(count: 10_000)
        playback = owner.playAnimation(looping, transitionDuration: transition)
    }

    /// Files are exported Y-up. Measure after load and keep the feet on y = 0.
    private func bind(_ entity: Entity, hints: [String]) -> ClipBinding? {
        normalizeHeight(entity, targetHeight: 1.15)
        entity.position = .zero
        addFootShadow(to: entity)
        guard let (host, resource, name) = skeletalClip(in: entity, hints: hints) else {
            return nil
        }
        return ClipBinding(entity: entity, host: host, resource: resource, name: name)
    }

    /// Contact mark in the same space as the feet. A SwiftUI ellipse on the
    /// view sat about a body-length below the mesh because the camera frames
    /// the figurine in the middle of the square.
    private func addFootShadow(to entity: Entity) {
        var material = UnlitMaterial()
        material.color = .init(tint: UIColor.black.withAlphaComponent(0.42))
        material.blending = .transparent(opacity: .init(scale: 0.55))
        let shadow = ModelEntity(
            mesh: .generatePlane(width: 0.46, depth: 0.22, cornerRadius: 0.11),
            materials: [material]
        )
        shadow.name = "footShadow"
        shadow.position = [0, 0.015, 0]
        entity.addChild(shadow)
    }

    private func skeletalClip(
        in entity: Entity,
        hints: [String]
    ) -> (Entity, AnimationResource, String)? {
        var found: [(Entity, AnimationResource, String)] = []
        func walk(_ node: Entity) {
            for animation in node.availableAnimations {
                let name = animation.name ?? ""
                guard name.contains("Armature/") else { continue }
                let short = name.split(separator: "/").last.map(String.init) ?? name
                let cleaned = short.replacingOccurrences(of: "[0]", with: "")
                found.append((node, animation, cleaned))
            }
            for child in node.children { walk(child) }
        }
        walk(entity)
        guard !found.isEmpty else { return nil }
        for hint in hints {
            if let hit = found.first(where: {
                $0.2.caseInsensitiveCompare(hint) == .orderedSame
                    || $0.2.localizedCaseInsensitiveContains(hint)
            }) {
                return hit
            }
        }
        return found[0]
    }

    private func normalizeHeight(_ entity: Entity, targetHeight: Float) {
        let bounds = entity.visualBounds(relativeTo: nil)
        let height = bounds.extents.y
        guard height > 0.001 else { return }
        let scale = targetHeight / height
        entity.scale = SIMD3<Float>(repeating: scale)
        entity.position.y -= bounds.min.y * scale
    }

    private static func resourceURL(named name: String) -> URL? {
        if World2WorldSync.shared.usesServerDocument {
            guard let file = World2WorldSync.shared.clipFile(engineName: name) else {
                return nil
            }
            return AssetBootstrapService.shared.cachedFileURL(named: file)
        }
        if let remote = AssetBootstrapService.shared.cachedFileURL(named: name) {
            return remote
        }
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
