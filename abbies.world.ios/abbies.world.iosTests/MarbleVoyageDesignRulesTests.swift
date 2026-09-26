import XCTest
import UIKit
@testable import abbies_world_ios

/// Regression gates for Marble Voyage / Plink design contract.
/// Prefer `./scripts/preflight_marble_voyage.sh` before playtest (no full app rebuild).
final class MarbleVoyageDesignRulesTests: XCTestCase {
    func testPlateWidthFillOnReferenceIPads() {
        for viewport in MarbleVoyageDesignRules.referenceLandscapeViewports {
            let bounds = CGSize(width: viewport.width, height: viewport.height)
            let fill = MarbleVoyageDesignRules.plateWidthFillFraction(in: bounds)
            XCTAssertGreaterThanOrEqual(
                fill,
                MarbleVoyageDesignRules.minPlateWidthFillFraction,
                "Huge pillarbox on \(Int(viewport.width))×\(Int(viewport.height)): fill=\(fill)"
            )
        }
    }

    func testClimbChartWidthBand() {
        let viewport = CGSize(width: 1180, height: 700)
        let content = MarbleVoyageClimbMap.contentSize(in: viewport)
        let frac = content.width / viewport.width
        XCTAssertGreaterThanOrEqual(frac, MarbleVoyageDesignRules.climbChartMinWidthFraction)
        XCTAssertLessThanOrEqual(frac, MarbleVoyageDesignRules.climbChartMaxWidthFraction)
    }

    func testPowerIconsHaveTransparentCorners() {
        var failures: [String] = []
        for name in MarbleVoyageDesignRules.transparentUICatalogNames {
            guard let image = UIImage(named: name),
                  let cg = image.cgImage else {
                failures.append("\(name): missing")
                continue
            }
            let w = cg.width
            let h = cg.height
            guard w > 2, h > 2 else {
                failures.append("\(name): too small")
                continue
            }
            guard let data = cg.dataProvider?.data,
                  let ptr = CFDataGetBytePtr(data) else {
                failures.append("\(name): no pixel data")
                continue
            }
            let bpp = cg.bitsPerPixel / 8
            let bpr = cg.bytesPerRow
            func alphaAt(x: Int, y: Int) -> UInt8 {
                let i = y * bpr + x * bpp
                // Premultiplied last / first — sample last byte as alpha for RGBA.
                if cg.alphaInfo == .premultipliedLast || cg.alphaInfo == .last {
                    return ptr[i + 3]
                }
                if cg.alphaInfo == .premultipliedFirst || cg.alphaInfo == .first {
                    return ptr[i]
                }
                return 255
            }
            let corners = [
                alphaAt(x: 0, y: 0),
                alphaAt(x: w - 1, y: 0),
                alphaAt(x: 0, y: h - 1),
                alphaAt(x: w - 1, y: h - 1),
            ]
            if corners.contains(where: { $0 > MarbleVoyageDesignRules.maxCornerAlpha }) {
                failures.append("\(name): opaque corners \(corners)")
            }
        }
        XCTAssertTrue(failures.isEmpty, failures.joined(separator: "\n"))
    }

    func testBattleFeedContractThresholds() {
        XCTAssertGreaterThanOrEqual(MarbleVoyageDesignRules.battleFeedMinWidth, 160)
        XCTAssertGreaterThanOrEqual(MarbleVoyageDesignRules.battleFeedMinBodyFont, 12)
        XCTAssertGreaterThanOrEqual(MarbleVoyageDesignRules.battleFeedMinMetaFont, 11)
        XCTAssertGreaterThanOrEqual(MarbleVoyageDesignRules.battleFeedMinChipValueFont, 14)
    }

    func testClimbIntroTimingContract() {
        XCTAssertEqual(MarbleVoyageDesignRules.climbIntroPanSeconds, 4.0, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.climbIntroSettleSeconds, 3.7, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.climbIntroPlayerScrollAnchorY, 0.5, accuracy: 0.01)
    }

    func testVersusEnemyFigurinesResolve() {
        var failures: [String] = []
        for kind in MarbleVoyageDesignRules.versusEnemyKinds {
            let fig = kind.figurineCatalogName
            let idle = kind.portraitCatalogName(for: .idle)
            let hasFig = UIImage(named: fig) != nil
            let hasIdle = idle.flatMap { UIImage(named: $0) } != nil
            if !hasFig && !hasIdle {
                failures.append("\(kind.rawValue): no figurine (\(fig)) or idle portrait")
            }
        }
        XCTAssertTrue(
            failures.isEmpty,
            "VS screen must resolve fox/enemy portraits:\n" + failures.joined(separator: "\n")
        )
    }

    func testRejectsUndersizedPlateFill() {
        // Ultra-wide 21:9 — 4:3 fit leaves large side bands; contract is for iPad refs only,
        // but helper must still report low fill.
        let wide = CGSize(width: 2100, height: 900)
        XCTAssertLessThan(
            MarbleVoyageDesignRules.plateWidthFillFraction(in: wide),
            MarbleVoyageDesignRules.minPlateWidthFillFraction
        )
    }
}
