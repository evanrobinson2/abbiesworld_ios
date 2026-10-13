import XCTest
import simd
@testable import abbies_world_ios

@MainActor
final class RooftopSceneTests: XCTestCase {
    func testPetalPoolRemainsFiniteAndEntersBelowRoof() {
        for i in 0..<RooftopMotion.maximumPetals {
            for tick in 0..<2000 {
                let pose = RooftopMotion.petal(i, time: Double(tick) * 0.17, breeze: 1)
                XCTAssertTrue(pose.position.x.isFinite && pose.position.y.isFinite && pose.position.z.isFinite)
                XCTAssertGreaterThanOrEqual(pose.position.y, 0.12)
                XCTAssertLessThanOrEqual(pose.position.y, 3.54)
                XCTAssertGreaterThan(pose.scale, 0)
                if pose.position.y > 2.5 {
                    XCTAssertGreaterThan(pose.position.x, 1.7, "High petals must remain outside the roof's open edge")
                }
            }
        }
    }

    func testLongRunningMotionHasNoAccumulatingSimulation() {
        for i in 0..<RooftopMotion.maximumPetals {
            let pose = RooftopMotion.petal(i, time: 86400 * 30, breeze: 1)
            XCTAssertTrue(pose.position.x.isFinite)
            XCTAssertLessThan(pose.position.y, 3.54)
            let duplicate = RooftopMotion.petal(i, time: 86400 * 30, breeze: 1)
            XCTAssertEqual(pose.position, duplicate.position)
        }
    }

    func testCameraInspectionRangeRemainsBounded() {
        XCTAssertEqual(RooftopMotion.cameraInput(yaw: 99, pitch: -99, zoom: 12),
                       SIMD3(RooftopMotion.maximumYaw, -RooftopMotion.maximumPitch, RooftopMotion.maximumZoom))
        XCTAssertEqual(RooftopMotion.cameraInput(yaw: 0, pitch: 0, zoom: -99).z, RooftopMotion.minimumZoom)
        XCTAssertEqual(RooftopMotion.smoothing(delta: 3600), RooftopMotion.smoothing(delta: 0.1))
    }

    func testLightingProofHasCompleteMaterialMapsAndWholeBlossomGeometry() throws {
        let manifest = try JSONDecoder().decode(RooftopManifest.self, from: Data(contentsOf: RooftopMeshData.url("rooftop-proof-manifest.json")))
        XCTAssertTrue(manifest.parts.contains { $0.name == "window" })
        for part in manifest.parts {
            let data = try RooftopMeshData(data: Data(contentsOf: RooftopMeshData.url(part.mesh)))
            XCTAssertEqual(data.indices.count / 3, part.triangles)
            for suffix in part.name == "window" ? [""] : ["", "-normal", "-ao"] {
                XCTAssertTrue(FileManager.default.fileExists(atPath: try RooftopMeshData.url("rooftop-proof-\(part.name)\(suffix).png").path))
            }
        }
        let json = try Data(contentsOf: RooftopMeshData.url("rooftop-proof-cherry.json"))
        let parts = try XCTUnwrap(JSONSerialization.jsonObject(with: json) as? [[String: Any]])
        for part in parts {
            let name = try XCTUnwrap(part["mesh"] as? String)
            let data = try RooftopMeshData(data: Data(contentsOf: RooftopMeshData.url(name)))
            XCTAssertEqual(data.indices.count / 3, part["triangles"] as? Int)
            XCTAssertTrue(data.normals.allSatisfy { abs(simd_length($0) - 1) < 0.01 })
        }
    }

    func testMeshRejectsCorruptionBeforeResourceCreation() {
        XCTAssertThrowsError(try RooftopMeshData(data: Data()))
        XCTAssertThrowsError(try RooftopMeshData(data: Data([82,84,77,49] + Array(repeating: 255, count: 8))))
        var bytes = Data([82,84,77,49, 1,0,0,0, 3,0,0,0])
        bytes.append(Data(repeating: 0, count: 32))
        bytes.append(Data([1,0,0,0, 0,0,0,0, 0,0,0,0]))
        XCTAssertThrowsError(try RooftopMeshData(data: bytes), "Index 1 is out of bounds for one vertex")
    }

    func testBundledSceneFitsFirstPassBudgetsAndAllMeshesDecode() throws {
        let manifest = try JSONDecoder().decode(RooftopManifest.self, from: Data(contentsOf: RooftopMeshData.url("rooftop-manifest.json")))
        XCTAssertEqual(manifest.version, 1)
        XCTAssertLessThanOrEqual(manifest.parts.count, 24)
        XCTAssertLessThanOrEqual(manifest.triangles, 180_000)
        XCTAssertEqual(Set(manifest.parts.map(\.name)).count, manifest.parts.count)
        var actualTriangles = 0
        for part in manifest.parts {
            let mesh = try RooftopMeshData(data: Data(contentsOf: RooftopMeshData.url(part.mesh)))
            XCTAssertEqual(mesh.indices.count / 3, part.triangles)
            XCTAssertTrue(FileManager.default.fileExists(atPath: try RooftopMeshData.url(part.texture).path))
            actualTriangles += mesh.indices.count / 3
        }
        XCTAssertEqual(actualTriangles, manifest.triangles)
    }
}
