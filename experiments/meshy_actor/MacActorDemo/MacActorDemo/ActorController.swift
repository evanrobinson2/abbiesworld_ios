import Foundation
import RealityKit
import simd

@MainActor
final class ActorController: ObservableObject {
    @Published var state: CharacterState = .idle
    @Published var currentClipName: String = "(none)"
    @Published var position: SIMD3<Float> = .zero
    @Published var skeletonDetected: Bool = false
    @Published var jointCount: Int = 0
    @Published var availableAnimationNames: [String] = []
    @Published var statusMessage: String = "Loading…"
    @Published var loadError: String?

    private(set) var character: Entity?
    private var animationMap: [CharacterState: AnimationResource] = [:]
    private var activePlayback: AnimationPlaybackController?
    private var moveDestination: SIMD3<Float>?
    private var moveSpeed: Float = 1.1
    private var oneShotReturnTask: Task<Void, Never>?

    func attach(character: Entity) {
        self.character = character
        refreshDebugFromEntity()
        buildAnimationMap()
        play(.idle, force: true)
        state = .idle
        statusMessage = "Ready"
    }

    func request(_ next: CharacterState) {
        if next != .walking {
            moveDestination = nil
        }
        transition(to: next)
    }

    /// Tap-to-move: walk in a straight line, then idle on arrival.
    func walkTo(_ destination: SIMD3<Float>) {
        guard character != nil else { return }
        moveDestination = destination
        transition(to: .walking)
        statusMessage = String(
            format: "Walking to (%.2f, %.2f, %.2f)",
            destination.x, destination.y, destination.z
        )
    }

    func tick(deltaTime: Float) {
        guard let character, let destination = moveDestination else { return }
        var pos = character.position
        let flatDest = SIMD3<Float>(destination.x, pos.y, destination.z)
        let delta = flatDest - pos
        let distance = length(SIMD2<Float>(delta.x, delta.z))
        if distance < 0.05 {
            character.position = flatDest
            position = character.position
            moveDestination = nil
            transition(to: .idle)
            statusMessage = "Arrived → idle"
            return
        }

        let step = min(moveSpeed * deltaTime, distance)
        let dir = normalize(SIMD3<Float>(delta.x, 0, delta.z))
        pos += dir * step
        character.position = pos
        position = pos

        if length_squared(SIMD2<Float>(dir.x, dir.z)) > 0.0001 {
            let yaw = atan2(dir.x, dir.z)
            character.orientation = simd_quatf(angle: yaw, axis: [0, 1, 0])
        }
    }

    private func transition(to next: CharacterState) {
        oneShotReturnTask?.cancel()
        oneShotReturnTask = nil
        play(next, force: true)
        state = next

        guard !next.loops else { return }

        let duration = animationMap[next]?.definition.duration ?? 2.5
        oneShotReturnTask = Task { [weak self] in
            let ns = UInt64(max(0.4, duration) * 1_000_000_000)
            try? await Task.sleep(nanoseconds: ns)
            guard !Task.isCancelled else { return }
            await MainActor.run {
                guard let self else { return }
                if self.state == next {
                    self.moveDestination = nil
                    self.play(.idle, force: true)
                    self.state = .idle
                    self.statusMessage = "\(next.buttonTitle) done → idle"
                }
            }
        }
    }

    private func play(_ state: CharacterState, force: Bool) {
        guard let character else { return }
        guard let resource = animationMap[state] else {
            currentClipName = "(missing: \(state.rawValue))"
            statusMessage = "No clip matched for \(state.rawValue)"
            return
        }
        if !force, self.state == state { return }

        activePlayback?.stop()
        if state.loops {
            if let looping = try? resource.repeat(count: Float.greatestFiniteMagnitude) {
                activePlayback = character.playAnimation(looping, transitionDuration: 0.2)
            } else {
                activePlayback = character.playAnimation(resource, transitionDuration: 0.2)
            }
        } else {
            activePlayback = character.playAnimation(resource, transitionDuration: 0.15)
        }
        currentClipName = resource.name.isEmpty ? state.rawValue : resource.name
    }

    private func buildAnimationMap() {
        animationMap.removeAll()
        guard let character else { return }

        var library: [String: AnimationResource] = [:]
        collectAnimations(from: character, into: &library)
        availableAnimationNames = library.keys.sorted()

        for state in CharacterState.allCases {
            if let match = resolveClip(for: state, in: library) {
                animationMap[state] = match
            }
        }
    }

    private func collectAnimations(from entity: Entity, into library: inout [String: AnimationResource]) {
        for animation in entity.availableAnimations {
            let name = animation.name.isEmpty ? "unnamed_\(library.count)" : animation.name
            library[name] = animation
        }
        for child in entity.children {
            collectAnimations(from: child, into: &library)
        }
    }

    private func resolveClip(
        for state: CharacterState,
        in library: [String: AnimationResource]
    ) -> AnimationResource? {
        let names = Array(library.keys)
        let hints = state.clipNameHints
        // Idle is intentionally unbound for this Meshy pack (no true idle clip).
        if hints.isEmpty { return nil }

        for hint in hints {
            if let exact = names.first(where: { $0.caseInsensitiveCompare(hint) == .orderedSame }) {
                return library[exact]
            }
            if let partial = names.first(where: { $0.localizedCaseInsensitiveContains(hint) }) {
                return library[partial]
            }
        }
        // Do not fall back to ordinal indices — Meshy names are already scrambled,
        // and ordinals would re-introduce the same mismatch.
        return nil
    }

    private func refreshDebugFromEntity() {
        guard let character else { return }
        position = character.position

        var joints = 0
        var foundSkeleton = false
        func walk(_ e: Entity) {
            if let model = e as? ModelEntity {
                let names = model.jointNames
                if !names.isEmpty {
                    foundSkeleton = true
                    joints = max(joints, names.count)
                }
            }
            if !e.availableAnimations.isEmpty {
                foundSkeleton = true
            }
            for child in e.children { walk(child) }
        }
        walk(character)
        skeletonDetected = foundSkeleton
        jointCount = joints
    }
}
