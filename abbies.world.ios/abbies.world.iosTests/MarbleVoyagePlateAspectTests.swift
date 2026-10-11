import XCTest
import UIKit
@testable import abbies_world_ios

/// Guards against the recurring agent bug: shipping voyage plates that get edge-cropped.
final class MarbleVoyagePlateAspectTests: XCTestCase {
    func testLayoutContractIsFourByThree() {
        XCTAssertEqual(MarbleVoyagePlateLayout.aspectWidthOverHeight, 4.0 / 3.0, accuracy: 0.0001)
        XCTAssertEqual(MarbleVoyagePlateLayout.preferredPixelSize.width, 2048)
        XCTAssertEqual(MarbleVoyagePlateLayout.preferredPixelSize.height, 1536)
        XCTAssertEqual(
            MarbleVoyagePlateLayout.preferredPixelSize.width
                / MarbleVoyagePlateLayout.preferredPixelSize.height,
            4.0 / 3.0,
            accuracy: 0.001
        )
    }

    func testEveryBundledVoyagePlateMatchesContract() {
        var failures: [String] = []
        for name in MarbleVoyagePlateLayout.catalogPlateNames {
            guard let image = UIImage(named: name) else {
                failures.append("\(name): missing from bundle")
                continue
            }
            let ratio = MarbleVoyagePlateLayout.aspectRatio(of: image)
            if !MarbleVoyagePlateLayout.isAcceptableAspect(ratio) {
                failures.append(
                    String(
                        format: "%@: %.4f (want 4:3 ±%.0f%%) size=%.0fx%.0f — will look clipped if Fill is used",
                        name,
                        ratio,
                        MarbleVoyagePlateLayout.aspectTolerance * 100,
                        image.size.width,
                        image.size.height
                    )
                )
            }
        }
        XCTAssertTrue(
            failures.isEmpty,
            "Voyage plates must be ~4:3 landscape and shown with Fit (never Fill):\n"
                + failures.joined(separator: "\n")
        )
    }

    func testRejectsClearlyWrongAspects() {
        XCTAssertFalse(MarbleVoyagePlateLayout.isAcceptableAspect(1.0)) // square
        XCTAssertFalse(MarbleVoyagePlateLayout.isAcceptableAspect(16.0 / 9.0)) // 16:9
        XCTAssertFalse(MarbleVoyagePlateLayout.isAcceptableAspect(9.0 / 16.0)) // portrait
        XCTAssertTrue(MarbleVoyagePlateLayout.isAcceptableAspect(1024.0 / 771.0))
        XCTAssertTrue(MarbleVoyagePlateLayout.isAcceptableAspect(4.0 / 3.0))
    }
}
