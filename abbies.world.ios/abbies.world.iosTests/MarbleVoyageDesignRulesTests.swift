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
        XCTAssertEqual(MarbleVoyageDesignRules.climbIntroSettleSeconds, 0.8, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.climbRevealPanSeconds, 1.45, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.climbRevealLetterSeconds, 0.1, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.climbRevealFinalPanSeconds, 1.6, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.climbIntroPlayerScrollAnchorY, 0.58, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.climbRevealFocusAnchorY, 0.38, accuracy: 0.01)
        // Default cast: boss (top) → Abbie (bottom). Scrub frames match.
        XCTAssertEqual(
            MarbleVoyageDesignRules.climbCastTourOrder,
            .bossToAbbie
        )
    }

    func testClimbFoeCardDocksOppositeFocusedTile() {
        // Focus on the left half → card must hug trailing so the portrait stays visible.
        XCTAssertEqual(
            MarbleVoyageOverlandScroll.preferredCardDock(focusX: 200, contentWidth: 1180),
            .trailing
        )
        // Focus on the right half → card hugs leading.
        XCTAssertEqual(
            MarbleVoyageOverlandScroll.preferredCardDock(focusX: 900, contentWidth: 1180),
            .leading
        )

        let viewport = CGSize(width: 1180, height: 820)
        let tileSize: CGFloat = 200
        // Tile framed near focus anchor on the left.
        let tile = MarbleVoyageOverlandScroll.focusedTileRectInViewport(
            contentPoint: CGPoint(x: 280, y: viewport.height * 0.38),
            tileSize: tileSize,
            cameraOffsetY: 0
        )
        let badCard = MarbleVoyageOverlandScroll.cardRect(dock: .leading, viewport: viewport)
        let goodCard = MarbleVoyageOverlandScroll.cardRect(dock: .trailing, viewport: viewport)
        XCTAssertTrue(
            MarbleVoyageOverlandScroll.cardOccludesFocusedTile(card: badCard, tile: tile),
            "Leading card covers a left-side focused foe — that is the bug we ship against"
        )
        XCTAssertFalse(
            MarbleVoyageOverlandScroll.cardOccludesFocusedTile(card: goodCard, tile: tile),
            "Trailing dock must leave the focused foe tile clear"
        )
    }

    func testFoeCardNameWrapCheck() {
        // Card column ≈ maxWidth 360 − padding − 100pt portrait − gaps ≈ 200pt.
        let available: CGFloat = 200
        XCTAssertTrue(
            MarbleVoyageOverlandScroll.foeNameFitsOneLine("MORROW", fontSize: 44, availableWidth: available)
        )
        XCTAssertTrue(
            MarbleVoyageOverlandScroll.foeNameFitsOneLine("PORCUPINE", fontSize: 44, availableWidth: available)
                || MarbleVoyageOverlandScroll.foeNameFitsOneLine("PORCUPINE", fontSize: 44 * 0.42, availableWidth: available),
            "PORCUPINE must fit at full size or after minimumScaleFactor 0.42"
        )
        // Absurd width must fail the pre-scale check so we know the helper works.
        XCTAssertFalse(
            MarbleVoyageOverlandScroll.foeNameFitsOneLine("PORCUPINE BOXER SUPREME", fontSize: 44, availableWidth: 80)
        )
    }

    func testFightAimTrackpadIsFixedSize() {
        XCTAssertEqual(MarbleVoyageDesignRules.fightAimTrackpadWidth, 176, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.fightAimTrackpadHeight, 118, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.fightAimTrackpadThumbSize, 40, accuracy: 0.01)
        // Wide enough for a thumb; tall enough for downward turbo pull.
        XCTAssertGreaterThan(MarbleVoyageDesignRules.fightAimTrackpadWidth, 140)
        XCTAssertLessThan(MarbleVoyageDesignRules.fightAimTrackpadWidth, 220)
        XCTAssertGreaterThan(MarbleVoyageDesignRules.fightAimTrackpadHeight, 100)
        XCTAssertLessThan(MarbleVoyageDesignRules.fightAimTrackpadHeight, 140)
    }

    func testOverlandScrollCameraOffsetClamps() {
        let mid = MarbleVoyageOverlandScroll.cameraOffset(
            centering: 400,
            viewportHeight: 700,
            maxOffset: 2000,
            anchorY: 0.5
        )
        XCTAssertEqual(mid, 50, accuracy: 0.01)

        let top = MarbleVoyageOverlandScroll.cameraOffset(
            centering: 10,
            viewportHeight: 700,
            maxOffset: 2000,
            anchorY: 0.5
        )
        XCTAssertEqual(top, 0, accuracy: 0.01)

        let bottom = MarbleVoyageOverlandScroll.cameraOffset(
            centering: 5000,
            viewportHeight: 700,
            maxOffset: 900,
            anchorY: 0.5
        )
        XCTAssertEqual(bottom, 900, accuracy: 0.01)
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
