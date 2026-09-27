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

    func testClimbFoeCardClearsNeighborMysteryWhenFocusIsLeft() {
        // Screenshot regression: left FIGHT + right MYSTERY — trailing dock at default
        // top pad covers the mystery. Placement must pick a clear alternative.
        let viewport = CGSize(width: 1180, height: 820)
        let tileSize: CGFloat = 200
        let fight = MarbleVoyageOverlandScroll.focusedTileRectInViewport(
            contentPoint: CGPoint(x: 280, y: viewport.height * 0.42),
            tileSize: tileSize,
            cameraOffsetY: 0
        )
        let mystery = MarbleVoyageOverlandScroll.focusedTileRectInViewport(
            contentPoint: CGPoint(x: 900, y: viewport.height * 0.42),
            tileSize: tileSize,
            cameraOffsetY: 0
        )
        let treasure = MarbleVoyageOverlandScroll.focusedTileRectInViewport(
            contentPoint: CGPoint(x: 590, y: viewport.height * 0.72),
            tileSize: tileSize,
            cameraOffsetY: 0
        )

        let placement = MarbleVoyageOverlandScroll.preferredCardPlacement(
            focusX: 280,
            contentWidth: 1180,
            focusTile: fight,
            neighborTiles: [mystery, treasure],
            viewport: viewport
        )
        let card = MarbleVoyageOverlandScroll.cardRect(
            dock: placement.dock,
            viewport: viewport,
            topPad: placement.topPad
        )

        XCTAssertFalse(
            MarbleVoyageOverlandScroll.cardOccludesFocusedTile(card: card, tile: fight),
            "Card must not cover the focused fight tile (dock=\(placement.dock) top=\(placement.topPad))"
        )
        let mysteryHit = MarbleVoyageOverlandScroll.neighborOcclusionArea(
            card: card,
            tiles: [mystery]
        )
        XCTAssertLessThan(
            mysteryHit,
            40,
            "Card must not cover the mystery neighbor (area=\(mysteryHit) dock=\(placement.dock) top=\(placement.topPad))"
        )
    }

    func testBatDivekickerPortraitFaceBBoxIsEyeCentered() {
        guard let bbox = PlinkAttackerKind.batDivekicker.portraitFaceBBox else {
            return XCTFail("batDivekicker needs an explicit face bbox")
        }
        // Must sit lower than topCenterHead so ears/wing tips aren't the whole crop.
        XCTAssertGreaterThan(bbox.y, NormalizedRect.topCenterHead.y + 0.08)
        XCTAssertLessThan(bbox.w, 0.55)
        XCTAssertLessThan(bbox.h, 0.40)
        // Left-biased head on the wide-wing plate.
        XCTAssertLessThan(bbox.x, 0.22)
        XCTAssertGreaterThan(bbox.x + bbox.w, 0.40)
    }

    func testPorcupinePortraitIsNotTheQuillCrop() {
        guard let bbox = PlinkAttackerKind.porcupineBoxer.portraitFaceBBox else {
            return XCTFail("porcupine must not use the default top-center crop (that frame is quills)")
        }
        XCTAssertGreaterThan(bbox.y, NormalizedRect.topCenterHead.y + 0.15)
        XCTAssertGreaterThan(bbox.h, 0.2)
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

    func testVoyageTilesStayLegible() {
        let ipad = CGSize(width: 1180, height: 820)
        let report = VoyageTileLegibility.abbieTrayClearsChartHandle(viewport: ipad)
        XCTAssertTrue(
            report.ok,
            report.failures.map(\.message).joined(separator: "\n")
        )
        // Narrower landscape still keeps HP on one line and clear of the handle.
        let compact = VoyageTileLegibility.abbieTrayClearsChartHandle(
            viewport: CGSize(width: 1024, height: 768)
        )
        XCTAssertTrue(compact.ok, compact.failures.map(\.message).joined(separator: "\n"))

        // The old 0.72 inset left a dead ring — art must fill the square.
        let edge = VoyageTileLegibility.chartArtEdgeFraction()
        XCTAssertGreaterThanOrEqual(edge * edge, VoyageTileLegibility.minPortraitFill)
        XCTAssertFalse(
            VoyageTileLegibility.chartPortraitIsLegible(imageAspect: 1089.0 / 1445.0, usesFaceCrop: false),
            "Tall full-body plates letterbox below the fill floor unless face-cropped"
        )
        XCTAssertTrue(
            VoyageTileLegibility.chartPortraitIsLegible(imageAspect: 1, usesFaceCrop: false),
            "Square Abbie bust fills a square tile"
        )
        XCTAssertTrue(
            VoyageTileLegibility.chartPortraitIsLegible(imageAspect: 1089.0 / 1445.0, usesFaceCrop: true)
        )
        XCTAssertFalse(
            VoyageTileLegibility.textFitsOneLine("120/120", fontSize: 16, width: 18),
            "A one-glyph column is the stacked HP bug"
        )
    }

    func testFightAimTrackpadIsFixedSize() {
        XCTAssertEqual(MarbleVoyageDesignRules.fightAimTrackpadWidth, 200, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.fightAimTrackpadHeight, 136, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.fightAimTrackpadThumbSize, 48, accuracy: 0.01)
        // Wide enough for a thumb; tall enough for downward turbo pull.
        XCTAssertGreaterThan(MarbleVoyageDesignRules.fightAimTrackpadWidth, 160)
        XCTAssertLessThan(MarbleVoyageDesignRules.fightAimTrackpadWidth, 240)
        XCTAssertGreaterThan(MarbleVoyageDesignRules.fightAimTrackpadHeight, 110)
        XCTAssertLessThan(MarbleVoyageDesignRules.fightAimTrackpadHeight, 160)
        XCTAssertEqual(MarbleVoyageDesignRules.fightPowerSlotCount, 2)
        XCTAssertGreaterThanOrEqual(MarbleVoyageDesignRules.fightPowerSlotSize, 70)
        XCTAssertEqual(MarbleVoyageDesignRules.climbAbbieCardMaxWidth, 420, accuracy: 0.01)
        XCTAssertEqual(MarbleVoyageDesignRules.climbFoeCardMaxWidth, 300, accuracy: 0.01)
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
