import XCTest
import UIKit
import SpriteKit
@testable import CrayonPhysicsKit

final class CustomArtTests: XCTestCase {
    @MainActor
    func testEveryCustomRasterDecodesAndNoReferenceArtIsBundled() throws {
        let bundle = GameResources.bundle
        let catalog = try LevelCatalog.load()
        let names = Set(catalog.sprites.values.map(\.image)).union(["custom-brush.png", "custom-box-closed.png", "custom-box-open.png"])
        for name in names {
            XCTAssertTrue(name.hasPrefix("custom-"), name)
            let url = try XCTUnwrap(bundle.url(forResource: name, withExtension: nil), name)
            let image = try XCTUnwrap(UIImage(contentsOfFile: url.path), name)
            XCTAssertGreaterThan(image.size.width, 0, name)
            XCTAssertGreaterThan(image.size.height, 0, name)
        }
        for name in ["the_ball.png", "tree_01.png", "title_screen.jpg", "background_end.jpg",
                     "level_01_background_touch.png", "level_02_background.jpg", "level_04_background.jpg",
                     "level_05_background.jpg", "level_06_background.jpg", "level_07_background.jpg",
                     "level_08_background.jpg", "level_08_teeter.png", "level_07_pilar.png",
                     "level_05_propell.png", "end_ball.png", "crayon_brush_03.png"] {
            XCTAssertNil(bundle.url(forResource: name, withExtension: nil), "Reference raster shipped: \(name)")
        }
    }

    @MainActor
    func testEverySourceBodyHasVisibleCustomArtIncludingStaticTerrain() throws {
        let catalog = try LevelCatalog.load()
        for level in catalog.levels {
            let scene = CrayonScene(level: level, sprites: catalog.sprites)
            scene.didMove(to: SKView(frame: CGRect(x: 0, y: 0, width: 800, height: 600)))
            for body in level.bodies {
                let node = try XCTUnwrap(scene.childNode(withName: "source-\(body.id)"), level.id)
                XCTAssertFalse(node.children.isEmpty, "Invisible collision body \(level.id)/\(body.id)")
                if body.sprite == nil || catalog.sprites[body.sprite ?? ""]?.render == "body-brush" {
                    let shape = try XCTUnwrap(node.children.first as? SKShapeNode)
                    XCTAssertNotNil(shape.strokeTexture)
                    XCTAssertNotNil(shape.path)
                }
            }
        }
    }
}
