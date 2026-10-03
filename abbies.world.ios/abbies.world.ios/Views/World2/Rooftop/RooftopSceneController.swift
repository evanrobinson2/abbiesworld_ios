import CoreMotion
import Foundation
import Observation
import RealityKit
import SwiftUI
import UIKit
import simd

@MainActor @Observable
final class RooftopSceneController {
    let root = Entity()
    let camera = PerspectiveCamera()
    private(set) var ready = false
    private(set) var errorMessage: String?
    private(set) var diagnosticText = "Preparing the rooftop…"
    let isLightingStudy: Bool
    var shadows = !ProcessInfo.processInfo.arguments.contains("-rooftopNoShadows") { didSet { lightingProof?.shadows = shadows } }
    @ObservationIgnored private var lightingProof: RooftopLightingProof?
    var breeze: Float = 1
    var tiltEnabled = true { didSet { configureMotion() } }
    var reducedMotion = false { didSet { configureMotion() } }
    var active = true { didSet { configureMotion() } }
    var pan = SIMD2<Float>.zero
    var zoom: Float = 1

    @ObservationIgnored private let motion = CMMotionManager()
    @ObservationIgnored private var referenceAttitude: CMAttitude?
    @ObservationIgnored private var referenceOrientation: UIInterfaceOrientation?
    @ObservationIgnored private var movers: [(Entity, Bool)] = []
    @ObservationIgnored private var petals: [ModelEntity] = []
    @ObservationIgnored private var subscription: EventSubscription?
    @ObservationIgnored private var cameraPosition = SIMD3<Float>(-4, 3, 8)
    @ObservationIgnored private var cameraTarget = SIMD3<Float>(0.3, 1, -3)
    @ObservationIgnored private var fieldOfView: Float = 45
    @ObservationIgnored private var currentCamera = SIMD3<Float>(0, 0, 1)
    @ObservationIgnored private var elapsed: Double = 0
    @ObservationIgnored private var pending: Double = 0
    @ObservationIgnored private var statsTime: Double = 0
    @ObservationIgnored private var frameTimes: [Double] = []
    @ObservationIgnored private var updateTimes: [Double] = []
    @ObservationIgnored private var triangleCount = 0
    @ObservationIgnored private var partCount = 0
    @ObservationIgnored private var loading = false

    init(lightingStudy: Bool = false) {
        isLightingStudy = lightingStudy
        root.name = "Rooftop3D"
        root.addChild(camera)
        camera.camera.near = 0.05
        camera.camera.far = 300
    }

    func attach(_ content: RealityViewCameraContent) {
        if root.parent == nil { content.add(root) }
        subscription?.cancel()
        subscription = content.subscribe(to: SceneEvents.Update.self) { [weak self] event in
            self?.update(delta: event.deltaTime)
        }
    }

    func load() async {
        guard !loading, !ready else { return }
        loading = true
        defer { loading = false }
        do {
            if isLightingStudy {
                let proof = RooftopLightingProof()
                try await proof.build(into: root)
                lightingProof = proof
                proof.shadows = shadows
                cameraPosition = [-3.1, 2.65, 5.8]
                cameraTarget = [0.7, 1.3, -3]
                fieldOfView = 58.9193
                setCamera()
                triangleCount = proof.triangles; partCount = proof.batches
                try makePetals()
                ready = true; diagnosticText = "Lighting study ready"; configureMotion()
                return
            }
            let url = try RooftopMeshData.url("rooftop-manifest.json")
            let manifest = try JSONDecoder().decode(RooftopManifest.self, from: Data(contentsOf: url))
            guard manifest.version == 1 else { throw RooftopMeshData.AssetError.unsupportedVersion }
            cameraPosition = vector(manifest.camera.position)
            cameraTarget = vector(manifest.camera.target)
            fieldOfView = manifest.camera.verticalFOV
            setCamera()
            triangleCount = manifest.triangles
            partCount = manifest.parts.count
            for part in manifest.parts {
                try Task.checkCancellation()
                let meshURL = try RooftopMeshData.url(part.mesh)
                let decoded = try await Task.detached(priority: .userInitiated) {
                    try RooftopMeshData(data: Data(contentsOf: meshURL))
                }.value
                try Task.checkCancellation()
                let mesh = try decoded.resource(name: part.name)
                let texture = try await TextureResource(contentsOf: RooftopMeshData.url(part.texture),
                    options: .init(semantic: .color))
                var material = UnlitMaterial(applyPostProcessToneMap: false)
                material.color = .init(tint: .white, texture: .init(texture))
                material.faceCulling = .none
                let entity = ModelEntity(mesh: mesh, materials: [material])
                entity.name = part.name
                entity.position = vector(part.pivot)
                root.addChild(entity)
                if part.motion != "static" { movers.append((entity, part.motion == "lantern")) }
                await Task.yield()
            }
            try makePetals()
            try await makeGlows()
            ready = true
            diagnosticText = "Rooftop ready"
            configureMotion()
        } catch is CancellationError {
            clearLoadedParts()
        } catch {
            clearLoadedParts()
            errorMessage = "The rooftop could not load. Please close it and try again."
            print("Rooftop3D asset load failed: \(error)")
        }
    }

    func resetCamera() {
        pan = .zero; zoom = 1
        currentCamera = SIMD3(0, 0, 1)
        setCamera()
        referenceAttitude = nil
    }

    func stop() {
        active = false
        subscription?.cancel(); subscription = nil
        motion.stopDeviceMotionUpdates()
        referenceAttitude = nil
    }

    private func clearLoadedParts() {
        for child in Array(root.children) where child !== camera { child.removeFromParent() }
        movers.removeAll(); petals.removeAll(); lightingProof = nil
    }

    private func configureMotion() {
        referenceAttitude = nil; referenceOrientation = nil
        guard active, ready, tiltEnabled, !reducedMotion, motion.isDeviceMotionAvailable else {
            motion.stopDeviceMotionUpdates(); return
        }
        motion.deviceMotionUpdateInterval = 1.0 / 30.0
        if !motion.isDeviceMotionActive { motion.startDeviceMotionUpdates(using: .xArbitraryZVertical) }
    }

    private func tilt() -> SIMD2<Float> {
        guard tiltEnabled, !reducedMotion, let attitude = motion.deviceMotion?.attitude else { return .zero }
        let orientation = (UIApplication.shared.connectedScenes.first as? UIWindowScene)?.interfaceOrientation ?? .landscapeLeft
        if referenceAttitude == nil || orientation != referenceOrientation {
            referenceAttitude = attitude.copy() as? CMAttitude
            referenceOrientation = orientation
        }
        guard let ref = referenceAttitude, let relative = attitude.copy() as? CMAttitude else { return .zero }
        relative.multiply(byInverseOf: ref)
        let q = relative.quaternion
        let x = Float(2 * atan2(q.x, q.w)), y = Float(2 * atan2(q.y, q.w))
        let axes: SIMD2<Float>
        switch orientation {
        case .landscapeLeft: axes = [x, -y]
        case .landscapeRight: axes = [-x, y]
        case .portraitUpsideDown: axes = [-y, -x]
        default: axes = [y, x]
        }
        return [RooftopMotion.clamp(axes.x * 0.10, -0.018, 0.018),
                RooftopMotion.clamp(axes.y * 0.08, -0.012, 0.012)]
    }

    private func update(delta: Double) {
        guard active, ready, delta.isFinite, delta > 0 else { return }
        let dt = min(delta, 0.1) // Never catch up a background interval.
        pending += dt
        let constrained = ProcessInfo.processInfo.isLowPowerModeEnabled ||
            ProcessInfo.processInfo.thermalState == .serious || ProcessInfo.processInfo.thermalState == .critical
        let step = constrained ? 1.0 / 20 : 1.0 / 30
        frameTimes.append(delta)
        guard pending >= step else { return }
        let start = CACurrentMediaTime()
        let tick = pending; pending = 0
        if !reducedMotion { elapsed += tick }
        let drift = tilt()
        let wanted = RooftopMotion.cameraInput(yaw: pan.x + drift.x, pitch: pan.y + drift.y, zoom: zoom)
        currentCamera += (wanted - currentCamera) * RooftopMotion.smoothing(delta: tick)
        setCamera()
        let amount: Float = reducedMotion ? 0 : breeze
        lightingProof?.update(time: elapsed, breeze: amount)
        for (index, pair) in movers.enumerated() {
            pair.0.orientation = RooftopMotion.sway(index: index, time: elapsed, breeze: amount, lantern: pair.1)
        }
        let count = reducedMotion || breeze == 0 ? 0 : (constrained ? 12 : RooftopMotion.maximumPetals)
        for (i, petal) in petals.enumerated() {
            petal.isEnabled = i < count
            if i < count {
                let pose = RooftopMotion.petal(i, time: elapsed, breeze: breeze)
                petal.transform = Transform(scale: SIMD3(repeating: pose.scale), rotation: pose.rotation, translation: pose.position)
            }
        }
        updateTimes.append((CACurrentMediaTime() - start) * 1000)
        statsTime += tick
        if statsTime >= 10 {
            let sorted = frameTimes.sorted()
            let p95 = sorted.isEmpty ? 0 : sorted[min(sorted.count - 1, Int(Double(sorted.count) * 0.95))] * 1000
            let meanCPU = updateTimes.reduce(0, +) / Double(max(1, updateTimes.count))
            diagnosticText = "\(triangleCount / 1000)k triangles · \(count) petals · \(Int(p95)) ms frame interval"
            let report: [String: Any] = ["lightingStudy": isLightingStudy, "triangles": triangleCount, "batches": partCount, "petals": count,
                "motionCPUmsMean": meanCPU, "updateIntervalP95ms": p95, "sampleFrames": frameTimes.count,
                "thermalState": ProcessInfo.processInfo.thermalState.rawValue,
                "lowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled,
                "note": "Scene update cadence and CPU motion cost, not a GPU benchmark or release approval."]
            if let data = try? JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys]),
               let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
                try? data.write(to: dir.appendingPathComponent("rooftop-performance.json"), options: .atomic)
            }
            frameTimes.removeAll(keepingCapacity: true); updateTimes.removeAll(keepingCapacity: true); statsTime = 0
        }
    }

    private func setCamera() {
        let offset = cameraPosition - cameraTarget
        let yaw = simd_quatf(angle: currentCamera.x, axis: [0, 1, 0])
        let right = simd_normalize(simd_cross(simd_normalize(-offset), SIMD3<Float>(0, 1, 0)))
        let pitch = simd_quatf(angle: currentCamera.y, axis: right)
        let eye = cameraTarget + yaw.act(pitch.act(offset))
        camera.look(at: cameraTarget, from: eye, relativeTo: nil)
        camera.camera.fieldOfViewInDegrees = fieldOfView / currentCamera.z
    }

    private func makePetals() throws {
        // A shared folded petal mesh, not alpha-heavy screen-sized quads.
        var d = MeshDescriptor(name: "shared falling cherry petal")
        d.positions = MeshBuffers.Positions([[-0.04,0,0], [0,0.016,0.045], [0.04,0,0], [0,0,-0.04], [0,0.012,0]])
        d.primitives = .triangles([0,1,4, 1,2,4, 2,3,4, 3,0,4])
        let mesh = try MeshResource.generate(from: [d])
        var rose = UnlitMaterial(applyPostProcessToneMap: false)
        rose.color = .init(tint: UIColor(red: 1, green: 0.38, blue: 0.52, alpha: 1)); rose.faceCulling = .none
        var peach = rose
        peach.color = .init(tint: UIColor(red: 1, green: 0.65, blue: 0.59, alpha: 1))
        for i in 0..<RooftopMotion.maximumPetals {
            let petal = ModelEntity(mesh: mesh, materials: [i % 3 == 0 ? peach : rose])
            petal.name = "pooled petal \(i)"; petal.isEnabled = false
            root.addChild(petal); petals.append(petal)
        }
    }

    private func makeGlows() async throws {
        let points = try JSONDecoder().decode([[Float]].self,
            from: Data(contentsOf: RooftopMeshData.url("rooftop-glows.json")))
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1; format.opaque = false
        let image = UIGraphicsImageRenderer(size: CGSize(width: 64, height: 64), format: format).image { context in
            let colors = [UIColor(red: 1, green: 0.87, blue: 0.48, alpha: 0.6).cgColor,
                          UIColor(red: 1, green: 0.52, blue: 0.16, alpha: 0.12).cgColor,
                          UIColor(red: 1, green: 0.4, blue: 0.1, alpha: 0).cgColor] as CFArray
            if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 0.18, 1]) {
                context.cgContext.drawRadialGradient(gradient, startCenter: CGPoint(x: 32, y: 32), startRadius: 0,
                    endCenter: CGPoint(x: 32, y: 32), endRadius: 32, options: [])
            }
        }
        guard let cgImage = image.cgImage else { return }
        let texture = try await TextureResource(image: cgImage, withName: "rooftop warm light halo", options: .init(semantic: .color))
        var material = UnlitMaterial(applyPostProcessToneMap: false)
        material.color = .init(tint: .white, texture: .init(texture))
        material.blending = .transparent(opacity: .init(scale: 1))
        material.faceCulling = .none; material.writesDepth = false
        let mesh = MeshResource.generatePlane(width: 0.17, height: 0.17)
        for point in points.prefix(12) {
            let glow = ModelEntity(mesh: mesh, materials: [material])
            glow.position = vector(point)
            // Move the halo a few millimeters off its bulb; depth testing still hides it behind timber.
            glow.position += simd_normalize(cameraPosition - glow.position) * 0.03
            glow.components.set(BillboardComponent())
            root.addChild(glow)
        }
    }

    private func vector(_ a: [Float]) -> SIMD3<Float> { SIMD3(a[0], a[1], a[2]) }
}
