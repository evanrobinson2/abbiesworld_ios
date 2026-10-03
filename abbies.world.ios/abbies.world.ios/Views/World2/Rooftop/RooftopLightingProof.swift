import Metal
import RealityKit
import UIKit

/// Isolated art study. Baseline assets and the editable Blender scene stay intact.
@MainActor
final class RooftopLightingProof {
    private var blossoms: [(ModelEntity, CustomMaterial)] = []
    private(set) var triangles = 0
    private(set) var batches = 0
    private var sun: DirectionalLight?
    var shadows = true { didSet { sun?.shadow = shadows ? Self.shadow() : nil } }

    private struct CherryPart: Decodable {
        let name: String
        let mesh: String
        let pivot: [Float]?
        let triangles: Int
    }

    func build(into root: Entity) async throws {
        let manifest = try JSONDecoder().decode(RooftopManifest.self,
            from: Data(contentsOf: RooftopMeshData.url("rooftop-proof-manifest.json")))
        let ambient = Entity()
        ambient.name = "Pastel sky and sheltered bounce"
        let environment = try await EnvironmentResource(equirectangular: Self.skyImage())
        ambient.components.set(ImageBasedLightComponent(source: .single(environment), intensityExponent: -0.5))
        root.addChild(ambient)
        for part in manifest.parts where part.name != "branches" {
            let mesh = try await decode(part.mesh, name: part.name)
            let color = try await texture(part.texture, semantic: .color)
            var material = PhysicallyBasedMaterial()
            material.baseColor = .init(tint: .white, texture: .init(color))
            material.roughness = .init(floatLiteral: part.name == "cushions" ? 0.94 : 0.8)
            material.metallic = .init(floatLiteral: 0)
            if part.name == "window" {
                material.emissiveColor = .init(color: UIColor(red: 1, green: 0.66, blue: 0.34, alpha: 1))
                material.emissiveIntensity = 2.2
            } else {
                let normal = try await texture("rooftop-proof-\(part.name)-normal.png", semantic: .normal)
                material.normal = .init(texture: .init(normal))
                let occlusion = try await texture("rooftop-proof-\(part.name)-ao.png", semantic: .raw)
                material.ambientOcclusion = .init(texture: .init(occlusion))
            }
            let model = ModelEntity(mesh: mesh, materials: [material])
            model.name = "lit \(part.name)"
            model.position = SIMD3(part.pivot[0], part.pivot[1], part.pivot[2])
            model.components.set(ImageBasedLightReceiverComponent(imageBasedLight: ambient))
            root.addChild(model)
            triangles += part.triangles; batches += 1
        }
        // Keep distant forms and lantern placements as context; they are outside the material proof.
        let baseline = try JSONDecoder().decode(RooftopManifest.self,
            from: Data(contentsOf: RooftopMeshData.url("rooftop-manifest.json")))
        for part in baseline.parts where part.name == "distance" || part.name.hasPrefix("lantern") || part.name == "fairylights" {
            let mesh = try await decode(part.mesh, name: part.name)
            let color = try await texture(part.texture, semantic: .color)
            var material = UnlitMaterial(applyPostProcessToneMap: false)
            material.color = .init(tint: .white, texture: .init(color)); material.faceCulling = .none
            let model = ModelEntity(mesh: mesh, materials: [material])
            model.position = SIMD3(part.pivot[0], part.pivot[1], part.pivot[2])
            root.addChild(model); triangles += part.triangles; batches += 1
        }
        guard let device = MTLCreateSystemDefaultDevice(), let library = device.makeDefaultLibrary() else {
            throw RooftopMeshData.AssetError.missing("lighting shader library")
        }
        let parts = try JSONDecoder().decode([CherryPart].self,
            from: Data(contentsOf: RooftopMeshData.url("rooftop-proof-cherry.json")))
        for (i, part) in parts.enumerated() {
            let mesh = try await decode(part.mesh, name: part.name)
            let model: ModelEntity
            if part.name.hasSuffix("twigs") {
                var bark = PhysicallyBasedMaterial()
                bark.baseColor = .init(tint: UIColor(red: 0.24, green: 0.105, blue: 0.135, alpha: 1))
                bark.roughness = .init(floatLiteral: 0.9)
                model = ModelEntity(mesh: mesh, materials: [bark])
            } else {
                var flower = try CustomMaterial(surfaceShader: .init(named: "rooftopBlossom", in: library),
                    geometryModifier: .init(named: "rooftopPetalWind", in: library), lightingModel: .lit)
                flower.faceCulling = .none
                flower.custom.value = SIMD4(1, part.name.hasSuffix("leaves") ? -1 : Float(i % 3) * 0.28, 0, Float(i) * 1.7)
                model = ModelEntity(mesh: mesh, materials: [flower])
                blossoms.append((model, flower))
            }
            if let p = part.pivot { model.position = SIMD3(p[0], p[1], p[2]) }
            model.components.set(ImageBasedLightReceiverComponent(imageBasedLight: ambient))
            model.model?.boundsMargin = 0.06
            model.name = part.name; root.addChild(model)
            triangles += part.triangles; batches += 1
        }
        let sun = DirectionalLight()
        sun.name = "Warm sun with real shadow map"
        sun.light.color = UIColor(red: 1, green: 0.78, blue: 0.58, alpha: 1)
        sun.light.intensity = 5500
        sun.shadow = Self.shadow()
        sun.look(at: [-3, 0, 1], from: [7, 3.8, -7], relativeTo: nil)
        root.addChild(sun); self.sun = sun
        let fill = PointLight()
        fill.name = "Rose light reflected into the nook"
        fill.light.color = UIColor(red: 1, green: 0.64, blue: 0.57, alpha: 1)
        fill.light.intensity = 1200; fill.light.attenuationRadius = 11
        fill.position = [-0.7, 2.5, 2.2]; root.addChild(fill)
    }

    func update(time: Double, breeze: Float) {
        for (model, original) in blossoms {
            var material = original
            material.custom.value.x = breeze
            material.custom.value.z = Float(time.truncatingRemainder(dividingBy: 600))
            model.model?.materials = [material]
        }
    }

    private static func shadow() -> DirectionalLightComponent.Shadow {
        var result = DirectionalLightComponent.Shadow()
        result.shadowProjection = .automatic(maximumDistance: 18)
        result.depthBias = 0.6
        return result
    }

    private func decode(_ file: String, name: String) async throws -> MeshResource {
        let url = try RooftopMeshData.url(file)
        let data = try await Task.detached(priority: .userInitiated) { try RooftopMeshData(data: Data(contentsOf: url)) }.value
        try Task.checkCancellation()
        return try data.resource(name: name)
    }
    private func texture(_ file: String, semantic: TextureResource.Semantic) async throws -> TextureResource {
        try await TextureResource(contentsOf: RooftopMeshData.url(file), options: .init(semantic: semantic))
    }
    private static func skyImage() -> CGImage {
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        let image = UIGraphicsImageRenderer(size: CGSize(width: 256, height: 128), format: format).image { ctx in
            let colors = [UIColor(red: 0.63, green: 0.66, blue: 0.91, alpha: 1).cgColor,
                          UIColor(red: 1, green: 0.80, blue: 0.68, alpha: 1).cgColor,
                          UIColor(red: 0.42, green: 0.27, blue: 0.38, alpha: 1).cgColor] as CFArray
            let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 0.48, 1])!
            ctx.cgContext.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: 0, y: 128), options: [])
        }
        return image.cgImage!
    }
}
