import SwiftUI
import RealityKit
import simd

struct ContentView: View {
    @StateObject private var controller = ActorController()
    @State private var groundEntity: ModelEntity?
    @State private var characterLoaded = false

    var body: some View {
        ZStack(alignment: .topLeading) {
            RealityView { content in
                content.camera = .virtual

                let root = Entity()
                root.name = "root"

                let groundMesh = MeshResource.generatePlane(width: 12, depth: 12)
                var groundMaterial = SimpleMaterial(
                    color: .init(red: 0.22, green: 0.35, blue: 0.22, alpha: 1),
                    isMetallic: false
                )
                groundMaterial.roughness = 0.85
                let ground = ModelEntity(mesh: groundMesh, materials: [groundMaterial])
                ground.name = "ground"
                ground.generateCollisionShapes(recursive: false)
                // Input target so spatial taps hit the plane.
                ground.components.set(InputTargetComponent())
                root.addChild(ground)

                let key = DirectionalLight()
                key.light.color = .white
                key.light.intensity = 2500
                key.shadow = DirectionalLightComponent.Shadow()
                key.look(at: [0, 0, 0], from: [2.5, 5, 3], relativeTo: nil)
                root.addChild(key)

                let fill = DirectionalLight()
                fill.light.color = .init(red: 0.75, green: 0.82, blue: 1.0, alpha: 1)
                fill.light.intensity = 800
                fill.look(at: [0, 0, 0], from: [-3, 2.5, -2], relativeTo: nil)
                root.addChild(fill)

                // Fixed isometric-ish camera.
                let camera = PerspectiveCamera()
                camera.camera.fieldOfViewInDegrees = 35
                camera.look(at: [0, 0.6, 0], from: [3.4, 3.6, 3.4], relativeTo: nil)
                root.addChild(camera)

                content.add(root)
                groundEntity = ground
            } update: { content in
                // no-op; character attached once in task below
                _ = content
            }
            .gesture(
                SpatialTapGesture()
                    .targetedToAnyEntity()
                    .onEnded { value in
                        let world = value.convert(value.location3D, from: .local, to: .scene)
                        controller.walkTo([Float(world.x), 0, Float(world.z)])
                    }
            )
            .task {
                await loadCharacterIfNeeded()
            }
            .task {
                // Locomotion tick ~60Hz
                var last = CACurrentMediaTime()
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 16_000_000)
                    let now = CACurrentMediaTime()
                    let dt = Float(now - last)
                    last = now
                    controller.tick(deltaTime: dt)
                }
            }

            VStack(alignment: .leading, spacing: 12) {
                controlBar
                debugPanel
                if let err = controller.loadError {
                    Text(err)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(.red)
                        .padding(8)
                        .background(.black.opacity(0.7), in: RoundedRectangle(cornerRadius: 8))
                }
                Text(controller.statusMessage)
                    .font(.system(.caption, design: .monospaced))
                    .padding(8)
                    .background(.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 8))
                Text("Tap ground to walk · keys 1–5 for states")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.85))
            }
            .padding(16)
        }
        .background(Color.black)
        .focusable()
        .onKeyPress { press in
            handleKey(press.key)
        }
    }

    private var controlBar: some View {
        HStack(spacing: 8) {
            ForEach(CharacterState.allCases) { state in
                Button(state.buttonTitle) {
                    controller.request(state)
                }
                .buttonStyle(.borderedProminent)
                .tint(controller.state == state ? .orange : .blue)
                .keyboardShortcut(keyEquivalent(for: state), modifiers: [])
            }
        }
        .padding(10)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private var debugPanel: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("DEBUG")
                .font(.system(.caption, design: .monospaced).bold())
            Text("state: \(controller.state.rawValue)")
            Text("clip: \(controller.currentClipName)")
            Text(String(
                format: "pos: %.2f, %.2f, %.2f",
                controller.position.x,
                controller.position.y,
                controller.position.z
            ))
            Text("skeleton: \(controller.skeletonDetected ? "yes" : "no")")
            Text("joints: \(controller.jointCount)")
            Text("clips (\(controller.availableAnimationNames.count)):")
            ForEach(controller.availableAnimationNames, id: \.self) { name in
                Text("  • \(name)")
            }
        }
        .font(.system(size: 11, design: .monospaced))
        .foregroundStyle(.white)
        .padding(10)
        .frame(maxWidth: 360, alignment: .leading)
        .background(.black.opacity(0.65), in: RoundedRectangle(cornerRadius: 10))
    }

    private func keyEquivalent(for state: CharacterState) -> KeyEquivalent {
        switch state {
        case .idle: return "1"
        case .walking: return "2"
        case .running: return "3"
        case .waving: return "4"
        case .celebrating: return "5"
        }
    }

    private func handleKey(_ key: KeyEquivalent) -> KeyPress.Result {
        switch key.character {
        case "1": controller.request(.idle); return .handled
        case "2": controller.request(.walking); return .handled
        case "3": controller.request(.running); return .handled
        case "4": controller.request(.waving); return .handled
        case "5": controller.request(.celebrating); return .handled
        default: return .ignored
        }
    }

    @MainActor
    private func loadCharacterIfNeeded() async {
        guard !characterLoaded else { return }
        characterLoaded = true
        do {
            let url = try AssetLocator.requireCharacterURL()
            let character = try await Entity(contentsOf: url)
            normalizeHeight(character, targetHeight: 1.2)
            character.position = [0, 0, 0]

            // Attach under the ground's parent (scene root via ground).
            if let ground = groundEntity, let parent = ground.parent {
                parent.addChild(character)
            } else {
                // RealityView content may not have exposed ground yet — retry briefly.
                try? await Task.sleep(nanoseconds: 200_000_000)
                if let ground = groundEntity, let parent = ground.parent {
                    parent.addChild(character)
                } else {
                    throw NSError(
                        domain: "MacActorDemo",
                        code: 2,
                        userInfo: [NSLocalizedDescriptionKey: "Scene root not ready"]
                    )
                }
            }
            controller.attach(character: character)
            controller.statusMessage = "Loaded \(url.lastPathComponent)"
        } catch {
            controller.loadError = error.localizedDescription
            controller.statusMessage = "Load failed"
        }
    }

    private func normalizeHeight(_ entity: Entity, targetHeight: Float) {
        let bounds = entity.visualBounds(relativeTo: nil)
        let height = bounds.extents.y
        guard height > 0.001 else { return }
        let scale = targetHeight / height
        entity.scale = SIMD3<Float>(repeating: scale)
        let bottom = bounds.min.y * scale
        entity.position.y -= bottom
    }
}

enum AssetLocator {
    static func requireCharacterURL() throws -> URL {
        let urls = characterURLs()
        if let first = urls.first {
            return first
        }
        throw NSError(
            domain: "MacActorDemo",
            code: 1,
            userInfo: [
                NSLocalizedDescriptionKey:
                    "No character.usdz/glb found. Run: python3 mesh_pipeline.py"
            ]
        )
    }

    static func characterURLs() -> [URL] {
        var urls: [URL] = []
        if let usdz = Bundle.main.url(forResource: "character", withExtension: "usdz") {
            urls.append(usdz)
        }
        if let glb = Bundle.main.url(forResource: "character", withExtension: "glb") {
            urls.append(glb)
        }
        let file = URL(fileURLWithPath: #filePath)
        let meshyActor = file
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let output = meshyActor.appendingPathComponent("output")
        let usdz = output.appendingPathComponent("character.usdz")
        let glb = output.appendingPathComponent("character.glb")
        if FileManager.default.fileExists(atPath: usdz.path) { urls.append(usdz) }
        if FileManager.default.fileExists(atPath: glb.path) { urls.append(glb) }
        return urls
    }
}
