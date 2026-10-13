import Foundation
import RealityKit
import simd

nonisolated struct RooftopManifest: Decodable, Sendable {
    struct Camera: Decodable, Sendable {
        let position: [Float]
        let target: [Float]
        let verticalFOV: Float
        let aspect: Float
    }
    struct Part: Decodable, Sendable {
        let name: String
        let texture: String
        let mesh: String
        let motion: String
        let pivot: [Float]
        let triangles: Int
    }
    let version: Int
    let camera: Camera
    let parts: [Part]
    let triangles: Int
}

/// Deliberately tiny offline mesh format: magic, counts, interleaved vertices, triangle indices.
/// Geometry remains real 3D. UV atlases contain the static sunset and roof's indirect lighting.
nonisolated struct RooftopMeshData: Sendable {
    var positions: [SIMD3<Float>] = []
    var normals: [SIMD3<Float>] = []
    var uvs: [SIMD2<Float>] = []
    var indices: [UInt32] = []

    enum AssetError: Error { case missing(String), invalidMesh, unsupportedVersion }

    init(data: Data) throws {
        guard data.count >= 12, Array(data.prefix(4)) == [82, 84, 77, 49] else { throw AssetError.invalidMesh }
        try data.withUnsafeBytes { bytes in
            func uint(_ offset: Int) -> UInt32 { UInt32(littleEndian: bytes.loadUnaligned(fromByteOffset: offset, as: UInt32.self)) }
            func float(_ offset: Int) -> Float { Float(bitPattern: uint(offset)) }
            let vertices = Int(uint(4)), count = Int(uint(8))
            guard vertices > 0, vertices <= 1_000_000, count <= 3_000_000, count % 3 == 0,
                  data.count == 12 + vertices * 32 + count * 4 else { throw AssetError.invalidMesh }
            positions.reserveCapacity(vertices); normals.reserveCapacity(vertices); uvs.reserveCapacity(vertices)
            for i in 0..<vertices {
                let o = 12 + i * 32
                let p = SIMD3(float(o), float(o + 4), float(o + 8))
                let n = SIMD3(float(o + 12), float(o + 16), float(o + 20))
                let uv = SIMD2(float(o + 24), float(o + 28))
                guard p.x.isFinite, p.y.isFinite, p.z.isFinite,
                      n.x.isFinite, n.y.isFinite, n.z.isFinite, uv.x.isFinite, uv.y.isFinite else {
                    throw AssetError.invalidMesh
                }
                positions.append(p); normals.append(n); uvs.append(uv)
            }
            indices = (0..<count).map { uint(12 + vertices * 32 + $0 * 4) }
            guard indices.allSatisfy({ $0 < vertices }) else { throw AssetError.invalidMesh }
        }
    }

    @MainActor func resource(name: String) throws -> MeshResource {
        var descriptor = MeshDescriptor(name: name)
        descriptor.positions = MeshBuffers.Positions(positions)
        descriptor.normals = MeshBuffers.Normals(normals)
        descriptor.textureCoordinates = MeshBuffers.TextureCoordinates(uvs)
        descriptor.primitives = .triangles(indices)
        return try MeshResource.generate(from: [descriptor])
    }

    static func url(_ filename: String, bundle: Bundle = .main) throws -> URL {
        let name = (filename as NSString).deletingPathExtension
        let ext = (filename as NSString).pathExtension
        if let url = bundle.url(forResource: name, withExtension: ext, subdirectory: "Rooftop3D") ??
            bundle.url(forResource: name, withExtension: ext, subdirectory: "RooftopLightingProof") ??
            bundle.url(forResource: name, withExtension: ext) { return url }
        throw AssetError.missing(filename)
    }
}
