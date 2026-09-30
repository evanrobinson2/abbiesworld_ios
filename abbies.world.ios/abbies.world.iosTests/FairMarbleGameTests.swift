import XCTest
@testable import abbies_world_ios

final class FairMarbleGameTests: XCTestCase {
    func testOpeningBoardsAreStableAndPlayable() {
        for seed in 0..<200 {
            for colors in [5, 6] {
                let game = FairMarbleGame(seed: UInt64(seed), kinds: colors)
                XCTAssertTrue(game.matches.isEmpty)
                XCTAssertFalse(game.legalMoves.isEmpty)
                XCTAssertEqual(Set(game.cells.map(\.id)).count, 36)
            }
        }
    }

    func testInvalidSwapAndRowWrapDoNotConsumeTurn() {
        var game = FairMarbleGame(seed: 42)
        let before = game.cells
        XCTAssertFalse(game.adjacent(5, 6))
        XCTAssertFalse(game.swap(.init(from: 5, to: 6)))
        XCTAssertEqual(before, game.cells)
        XCTAssertEqual(game.connections, 0)
        XCTAssertFalse(game.buddyTurn)
    }

    func testHelpOnlyOnceAndNotOnBuddyTurn() {
        var game = FairMarbleGame(seed: 4)
        let hint = game.useHelp()
        XCTAssertNotNil(hint)
        XCTAssertEqual(game.helpTokens, 0)
        XCTAssertNil(game.useHelp())
        XCTAssertTrue(game.swap(hint!))
        settle(&game)
        XCTAssertTrue(game.buddyTurn)
        XCTAssertNil(game.useHelp())
    }

    func testMatchesClearAndSurvivorsFallKeepingIdentity() {
        var game = FairMarbleGame(layout: [0,1,2, 1,2,0, 3,3,3], size: 3)
        let top = game.cells[0]
        let middle = game.cells[3]
        XCTAssertEqual(game.matches, Set([6,7,8]))
        game.clearAndDrop()
        XCTAssertEqual(game.cells[3], top)
        XCTAssertEqual(game.cells[6], middle)
        XCTAssertEqual(Set(game.cells.map(\.id)).count, 9)
    }

    func testDeadBoardAndGivingUpLoseAndRestartResets() {
        var dead = FairMarbleGame(layout: [0,1,2, 1,2,3, 2,3,0], size: 3)
        XCTAssertTrue(dead.matches.isEmpty)
        XCTAssertTrue(dead.legalMoves.isEmpty)
        dead.finishTurn()
        XCTAssertEqual(dead.status, .lost)
        var game = FairMarbleGame(seed: 1)
        game.giveUp()
        XCTAssertEqual(game.status, .lost)
        XCTAssertFalse(game.swap(game.legalMoves[0]))
        game = FairMarbleGame(seed: 2)
        XCTAssertEqual(game.connections, 0)
        XCTAssertEqual(game.helpTokens, 1)
        XCTAssertFalse(game.buddyTurn)
        XCTAssertEqual(game.status, .playing)
    }

    func testTenMatchingTurnsWinAndCascadesDoNotInflateScore() {
        var won = 0
        for seed in 0..<50 {
            var game = FairMarbleGame(seed: UInt64(seed))
            while game.status == .playing {
                let oldScore = game.connections
                let oldTurn = game.buddyTurn
                XCTAssertTrue(game.swap(game.legalMoves[0]))
                settle(&game)
                XCTAssertEqual(game.connections, oldScore + 1)
                if game.status == .playing { XCTAssertNotEqual(game.buddyTurn, oldTurn) }
            }
            if game.status == .won {
                won += 1
                XCTAssertEqual(game.connections, 10)
            }
        }
        XCTAssertGreaterThan(won, 0)
    }

    private func settle(_ game: inout FairMarbleGame) {
        var limit = 0
        while !game.matches.isEmpty && limit < 100 {
            game.clearAndDrop()
            limit += 1
        }
        XCTAssertLessThan(limit, 100)
        game.finishTurn()
    }
}
