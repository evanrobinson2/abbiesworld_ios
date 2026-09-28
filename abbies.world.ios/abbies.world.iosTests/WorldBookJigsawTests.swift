import XCTest
@testable import abbies_world_ios

final class WorldBookJigsawTests: XCTestCase {
    func testPieceCountsMatchDifficulties() {
        XCTAssertEqual(WorldBookPuzzleDifficulty.casual.pieceCount, 4)
        XCTAssertEqual(WorldBookPuzzleDifficulty.normal.pieceCount, 16)
        XCTAssertEqual(WorldBookPuzzleDifficulty.challenging.pieceCount, 64)
        XCTAssertEqual(WorldBookPuzzleDifficulty.insane.pieceCount, 1024)
    }

    func testCutterProducesInterlockingGrid() {
        let pieces = WorldBookJigsawCutter.pieces(grid: 4, seed: 42)
        XCTAssertEqual(pieces.count, 16)
        let topLeft = pieces.first { $0.row == 0 && $0.col == 0 }!
        XCTAssertEqual(topLeft.top, .flat)
        XCTAssertEqual(topLeft.left, .flat)
        let rightOfTopLeft = pieces.first { $0.row == 0 && $0.col == 1 }!
        XCTAssertEqual(topLeft.right.inverse, rightOfTopLeft.left)
    }

    func testTwoByTwoPiecesMateOnEverySharedEdge() {
        let pieces = WorldBookJigsawCutter.pieces(grid: 2, seed: 7)
        XCTAssertEqual(pieces.count, 4)
        let tl = pieces.first { $0.row == 0 && $0.col == 0 }!
        let tr = pieces.first { $0.row == 0 && $0.col == 1 }!
        let bl = pieces.first { $0.row == 1 && $0.col == 0 }!
        let br = pieces.first { $0.row == 1 && $0.col == 1 }!
        XCTAssertEqual(tl.right.inverse, tr.left)
        XCTAssertEqual(tl.bottom.inverse, bl.top)
        XCTAssertEqual(tr.bottom.inverse, br.top)
        XCTAssertEqual(bl.right.inverse, br.left)
    }

    func testRenderPieceReturnsOpaqueCutout() {
        let size = CGSize(width: 120, height: 120)
        let renderer = UIGraphicsImageRenderer(size: size)
        let source = renderer.image { ctx in
            UIColor.systemTeal.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
        }
        let piece = WorldBookJigsawCutter.pieces(grid: 2, seed: 3)[0]
        let out = WorldBookJigsawCutter.renderPiece(from: source, piece: piece, grid: 2, outputSize: 80)
        XCTAssertNotNil(out)
        XCTAssertEqual(out?.size.width, 80)
    }

    func testCutterIsDeterministicForSeed() {
        let a = WorldBookJigsawCutter.pieces(grid: 8, seed: 99).map(\.right)
        let b = WorldBookJigsawCutter.pieces(grid: 8, seed: 99).map(\.right)
        XCTAssertEqual(a, b)
    }

    func testProgressPersistsSolvedPages() {
        let player = "player.test.worldbook"
        WorldBookPuzzleStore.resetAll(playerId: player, difficulty: .normal)
        var progress = WorldBookPuzzleStore.load(playerId: player)
        XCTAssertEqual(progress.preferredDifficulty, .normal)
        XCTAssertEqual(progress.pages.count, 1)
        XCTAssertEqual(progress.pages[0].difficulty.gridSize, 4)
        XCTAssertFalse(progress.allSolved)
        progress.pages[0].isSolved = true
        WorldBookPuzzleStore.save(progress, playerId: player)
        let reloaded = WorldBookPuzzleStore.load(playerId: player)
        XCTAssertTrue(reloaded.allSolved)
        XCTAssertEqual(reloaded.solvedCount, 1)
    }

    func testUnlockHintMentionsCozyNookBook() {
        let hint = WorldId.marbleVoyage.unlockHint ?? ""
        XCTAssertTrue(hint.localizedCaseInsensitiveContains("cozy nook"))
        XCTAssertTrue(hint.localizedCaseInsensitiveContains("puzzle"))
        XCTAssertFalse(hint.localizedCaseInsensitiveContains("4 puzzle"))
    }

    func testCatalogAssetsPresent() {
        XCTAssertNotNil(UIImage(named: WorldBookCatalog.closedBook))
        XCTAssertNotNil(UIImage(named: WorldBookCatalog.openBook))
        XCTAssertNotNil(UIImage(named: WorldBookCatalog.puzzlePlate))
        XCTAssertEqual(WorldBookCatalog.puzzleDestinations.count, 4)
        for name in WorldBookCatalog.puzzleChoices {
            XCTAssertNotNil(UIImage(named: name), name)
        }
        for dest in WorldBookCatalog.puzzleDestinations {
            XCTAssertFalse(dest.title.isEmpty)
            XCTAssertFalse(dest.blurb.isEmpty)
        }
        // Closed book must be a transparent cottage prop, not an opaque plate.
        guard let book = UIImage(named: WorldBookCatalog.closedBook),
              let cg = book.cgImage else {
            return XCTFail("closed book missing cgImage")
        }
        XCTAssertTrue(cg.alphaInfo != .none && cg.alphaInfo != .noneSkipLast && cg.alphaInfo != .noneSkipFirst)
    }

    func testNewPlayerSeedsPlacedWorldBookNotInDrawer() {
        let player = PlayerState.newPlayer(id: .abbie)
        let bookID = DecorationInstance.marbleVoyageWorldBookInstanceID(for: .abbie)
        XCTAssertTrue(player.decorations.contains { $0.id == bookID })
        XCTAssertTrue(
            player.homeLayout.placedDecorations.contains {
                $0.decorationInstanceId == bookID
                    && $0.resolvedRoomId == TreehouseRoomID.cozyNook.rawValue
            }
        )
        XCTAssertFalse(player.unplacedFurnitureInventory.contains { $0.id == bookID })
        XCTAssertEqual(
            FurnitureItem.item(id: DecorationInstance.marbleVoyageWorldBookID)?.assetName,
            WorldBookCatalog.closedBook
        )
        // Not offered as a free stamp from the decorate catalog.
        XCTAssertFalse(FurnitureItem.storeCatalog.contains { $0.id == DecorationInstance.marbleVoyageWorldBookID })
    }

    func testActivePlateUsesSelectedDestination() {
        var page = WorldBookPageProgress(
            pageIndex: 0,
            difficulty: .normal,
            selectedPlateCatalogName: WorldBookCatalog.puzzleChoices[2]
        )
        XCTAssertEqual(page.activePlateCatalogName, WorldBookCatalog.puzzleChoices[2])
        page.selectedPlateCatalogName = "missing.plate"
        XCTAssertEqual(page.activePlateCatalogName, WorldBookCatalog.puzzlePlate)
    }

    func testDefaultFreshIsSingleFourByFour() {
        let fresh = WorldBookPlayerProgress.fresh()
        XCTAssertEqual(fresh.preferredDifficulty, .normal)
        XCTAssertEqual(fresh.pages.count, 1)
        XCTAssertEqual(fresh.pages.map(\.difficulty.gridSize), [4])
    }

    func testLegacyMultiPageMigratesToOne() {
        let player = "player.test.worldbook.migrate"
        let legacy = WorldBookPlayerProgress(
            pages: (0..<4).map { WorldBookPageProgress(pageIndex: $0, difficulty: .normal, isSolved: $0 == 2) },
            preferredDifficulty: .normal
        )
        WorldBookPuzzleStore.save(legacy, playerId: player)
        let loaded = WorldBookPuzzleStore.load(playerId: player)
        XCTAssertEqual(loaded.pages.count, 1)
        XCTAssertTrue(loaded.isSolved)
    }
}
