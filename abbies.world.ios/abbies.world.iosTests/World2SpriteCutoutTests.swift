import UIKit
import XCTest
@testable import abbies_world_ios

final class World2SpriteCutoutTests: XCTestCase {
    func testOpaqueGreyCardBecomesATransparentCutout() throws {
        let opaque = try greyCardWithRedBlob()
        XCTAssertFalse(DevAssetCarvingService.hasTransparentBorder(opaque))

        let cut = DevAssetCarvingService.spriteCutoutPNG(from: opaque)
        XCTAssertTrue(DevAssetCarvingService.hasTransparentBorder(cut))
        XCTAssertNotEqual(cut, opaque)
    }

    func testAlreadyCutOutArtIsLeftAlone() throws {
        let cutout = try transparentRedBlob()
        XCTAssertTrue(DevAssetCarvingService.hasTransparentBorder(cutout))
        XCTAssertEqual(DevAssetCarvingService.spriteCutoutPNG(from: cutout), cutout)
    }

    func testPortalSpritesAreCutoutsAndMapsAreNot() {
        XCTAssertTrue(DevAssetCarvingService.shouldCutoutSprite(semanticId: "poi.portal.exterior"))
        XCTAssertTrue(DevAssetCarvingService.shouldCutoutSprite(semanticId: "poi.homePortal.exterior"))
        XCTAssertTrue(DevAssetCarvingService.shouldCutoutSprite(semanticId: "decoration.lamp"))
        XCTAssertFalse(DevAssetCarvingService.shouldCutoutSprite(semanticId: "map.home"))
        XCTAssertFalse(DevAssetCarvingService.shouldCutoutSprite(semanticId: "poi.abbieTreehouse.interior"))
    }

    func testAssetSheetCarvesIslandsInReadingOrder() throws {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 220, height: 110))
        let image = renderer.image { _ in
            UIColor(white: 0.85, alpha: 1).setFill()
            UIRectFill(CGRect(x: 0, y: 0, width: 220, height: 110))
            UIColor.red.setFill()
            UIRectFill(CGRect(x: 18, y: 28, width: 52, height: 52))
            UIColor.blue.setFill()
            UIRectFill(CGRect(x: 148, y: 28, width: 52, height: 52))
        }
        let islands = try DevAssetCarvingService.carveSheetIslands(
            from: try XCTUnwrap(image.pngData())
        )
        XCTAssertEqual(islands.count, 2)
        XCTAssertTrue(firstOpaqueLooksRed(islands[0]))
        XCTAssertTrue(firstOpaqueLooksBlue(islands[1]))
    }

    func testSheetLayoutUsesTwoColumnsThenLandscape() {
        XCTAssertEqual(World2AssetSheetLayout.columns(for: 1), 1)
        XCTAssertEqual(World2AssetSheetLayout.columns(for: 4), 2)
        XCTAssertEqual(World2AssetSheetLayout.rows(for: 4), 2)
        XCTAssertEqual(World2AssetSheetLayout.columns(for: 6), 3)
        XCTAssertEqual(World2AssetSheetLayout.pixelSize(for: 4).width, 1024)
        XCTAssertEqual(World2AssetSheetLayout.pixelSize(for: 6).width, 1536)
    }

    private func greyCardWithRedBlob() throws -> Data {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 80, height: 80))
        let image = renderer.image { _ in
            UIColor(white: 0.85, alpha: 1).setFill()
            UIRectFill(CGRect(x: 0, y: 0, width: 80, height: 80))
            UIColor.red.setFill()
            UIRectFill(CGRect(x: 22, y: 22, width: 36, height: 36))
        }
        return try XCTUnwrap(image.pngData())
    }

    private func transparentRedBlob() throws -> Data {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 80, height: 80))
        let image = renderer.image { _ in
            UIColor.clear.setFill()
            UIRectFill(CGRect(x: 0, y: 0, width: 80, height: 80))
            UIColor.red.setFill()
            UIRectFill(CGRect(x: 22, y: 22, width: 36, height: 36))
        }
        return try XCTUnwrap(image.pngData())
    }

    private func firstOpaqueLooksRed(_ png: Data) -> Bool {
        guard let pixel = firstOpaquePixel(png) else { return false }
        return pixel.r > 180 && pixel.g < 80 && pixel.b < 80
    }

    private func firstOpaqueLooksBlue(_ png: Data) -> Bool {
        guard let pixel = firstOpaquePixel(png) else { return false }
        return pixel.b > 180 && pixel.r < 80 && pixel.g < 80
    }

    private func firstOpaquePixel(_ png: Data) -> (r: UInt8, g: UInt8, b: UInt8)? {
        guard let image = UIImage(data: png)?.cgImage else { return nil }
        let width = image.width
        let height = image.height
        var rgba = [UInt8](repeating: 0, count: width * height * 4)
        guard let context = CGContext(
            data: &rgba,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        for index in stride(from: 0, to: rgba.count, by: 4) where rgba[index + 3] > 200 {
            return (rgba[index], rgba[index + 1], rgba[index + 2])
        }
        return nil
    }
}
