import Foundation

/// Value-only rules: the UI owns animation, while this board owns every legal move.
struct FairMarbleGame {
    struct Marble: Equatable, Identifiable {
        let id: Int
        let kind: Int
    }
    struct Move: Equatable {
        let from: Int
        let to: Int
    }
    enum Status: Equatable { case playing, won, lost }
    let size: Int
    let kinds: Int
    let goal = 10
    private(set) var cells: [Marble]
    private(set) var connections = 0
    private(set) var helpTokens = 1
    private(set) var buddyTurn = false
    private(set) var status: Status = .playing
    private var nextID = 0
    private var rng: Generator

    init(seed: UInt64 = UInt64.random(in: 1...UInt64.max), size: Int = 6, kinds: Int = 5) {
        self.size = max(4, min(8, size))
        self.kinds = max(4, min(6, kinds))
        self.cells = []
        self.rng = Generator(state: seed)
        // Retry generation rather than handing a child an already-dead board.
        repeat {
            cells = []
            for index in 0..<(self.size * self.size) {
                var options = Array(0..<self.kinds)
                if index % self.size >= 2, cells[index - 1].kind == cells[index - 2].kind {
                    options.removeAll { $0 == cells[index - 1].kind }
                }
                if index >= 2 * self.size, cells[index - self.size].kind == cells[index - 2 * self.size].kind {
                    options.removeAll { $0 == cells[index - self.size].kind }
                }
                cells.append(makeMarble(options[Int(rng.next() % UInt64(options.count))]))
            }
        } while legalMoves.isEmpty
    }

    /// Fixed layouts make edge cases reproducible without depending on UI timing.
    init(layout: [Int], size: Int, seed: UInt64 = 1) {
        precondition(size >= 3 && layout.count == size * size)
        self.size = size
        self.kinds = max(4, (layout.max() ?? 3) + 1)
        self.rng = Generator(state: seed)
        self.cells = layout.enumerated().map { Marble(id: $0.offset, kind: $0.element) }
        self.nextID = layout.count
    }

    func adjacent(_ a: Int, _ b: Int) -> Bool {
        guard cells.indices.contains(a), cells.indices.contains(b) else { return false }
        return abs(a / size - b / size) + abs(a % size - b % size) == 1
    }

    var matches: Set<Int> {
        var result = Set<Int>()
        for index in cells.indices {
            if index % size + 2 < size,
               cells[index].kind == cells[index + 1].kind,
               cells[index].kind == cells[index + 2].kind {
                result.formUnion([index, index + 1, index + 2])
            }
            if index + 2 * size < cells.count,
               cells[index].kind == cells[index + size].kind,
               cells[index].kind == cells[index + 2 * size].kind {
                result.formUnion([index, index + size, index + 2 * size])
            }
        }
        return result
    }

    var legalMoves: [Move] {
        var result: [Move] = []
        for index in cells.indices {
            for neighbor in [index + 1, index + size] where adjacent(index, neighbor) {
                var copy = self
                copy.cells.swapAt(index, neighbor)
                if !copy.matches.isEmpty { result.append(Move(from: index, to: neighbor)) }
            }
        }
        return result
    }

    mutating func useHelp() -> Move? {
        guard status == .playing, !buddyTurn, helpTokens > 0, let move = legalMoves.first else { return nil }
        helpTokens -= 1
        return move
    }

    /// Invalid swaps are rejected without consuming a turn.
    mutating func swap(_ move: Move) -> Bool {
        guard status == .playing, adjacent(move.from, move.to), matches.isEmpty else { return false }
        cells.swapAt(move.from, move.to)
        guard !matches.isEmpty else {
            cells.swapAt(move.from, move.to)
            return false
        }
        connections += 1
        return true
    }

    /// Preserve marble identities so survivors visibly fall, rather than morph in place.
    mutating func clearAndDrop() {
        let removed = matches
        guard !removed.isEmpty else { return }
        for column in 0..<size {
            let survivors = (0..<size).map { $0 * size + column }.filter { !removed.contains($0) }.map { cells[$0] }
            let missing = size - survivors.count
            var replacements: [Marble] = []
            for _ in 0..<missing { replacements.append(makeMarble(Int(rng.next() % UInt64(kinds)))) }
            let stack = replacements + survivors
            for row in 0..<size { cells[row * size + column] = stack[row] }
        }
    }

    mutating func finishTurn() {
        guard status == .playing, matches.isEmpty else { return }
        if connections >= goal { status = .won }
        else if legalMoves.isEmpty { status = .lost }
        else { buddyTurn.toggle() }
    }

    mutating func giveUp() { if status == .playing { status = .lost } }

    private mutating func makeMarble(_ kind: Int) -> Marble {
        defer { nextID += 1 }
        return Marble(id: nextID, kind: kind)
    }

    private struct Generator {
        var state: UInt64
        mutating func next() -> UInt64 {
            state &+= 0x9E3779B97F4A7C15
            var z = state
            z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
            z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
            return z ^ (z >> 31)
        }
    }
}
