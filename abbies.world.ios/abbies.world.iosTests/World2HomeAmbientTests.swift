import XCTest
@testable import abbies_world_ios

final class World2HomeAmbientTests: XCTestCase {
    func testBundledHomePlateStillPresent() {
        XCTAssertNotNil(UIImage(named: "world2_1002_map_home"))
    }
}
