//
//  WorldBookPuzzleModels.swift
//  abbies.world.ios
//
//  One-puzzle world-entry unlock that unlocks Marble Voyage (optional replay after).
//

import Foundation
import UIKit

enum WorldBookCatalog {
    /// Closed book prop used for the zoom-in transition only.
    static let closedBook = "world2_marble_voyage_world_book"
    /// Fulfilled open-book plate kept in catalog; runtime uses Voyage glass stage instead.
    static let openBook = "world2_marble_voyage_open_book_board"
    /// Legacy karst plate — catalog fallback only (not offered in the picker).
    static let puzzlePlate = "world2_marble_voyage_puzzle_karst"
    /// One puzzle unlocks Marble Voyage. Replay is optional forever after.
    static let pageCount = 1
    static let semanticClosedBook = "ui.marbleVoyage.worldEntry.book"
    static let semanticOpenBook = "plate.marbleVoyage.unlock.openBook"
    static let semanticPuzzlePlate = "plate.marbleVoyage.unlock.puzzle.karst"

    /// Selectable floating-island pictures for the unlock jigsaw.
    static let puzzleDestinations: [WorldBookPuzzleDestination] = [
        .init(
            id: "choice1",
            catalogName: "world2_marble_voyage_puzzle_choice_1",
            semanticId: "plate.marbleVoyage.unlock.puzzleChoice1",
            title: "Glowing Clearing",
            blurb: "Tree light · moss steps · a quiet start"
        ),
        .init(
            id: "choice2",
            catalogName: "world2_marble_voyage_puzzle_choice_2",
            semanticId: "plate.marbleVoyage.unlock.puzzleChoice2",
            title: "Ancient Arches",
            blurb: "Waterfall gate · stone ribs · mist below"
        ),
        .init(
            id: "choice3",
            catalogName: "world2_marble_voyage_puzzle_choice_3",
            semanticId: "plate.marbleVoyage.unlock.puzzleChoice3",
            title: "Root Sanctuary",
            blurb: "Living wood · soft glow · hold fast"
        ),
        .init(
            id: "choice4",
            catalogName: "world2_marble_voyage_puzzle_choice_4",
            semanticId: "plate.marbleVoyage.unlock.puzzleChoice4",
            title: "Sky Bridge",
            blurb: "Rope path · high tree · wind in the leaves"
        ),
    ]

    /// Catalog image names for the destination picker (tests + loaders).
    static var puzzleChoices: [String] {
        puzzleDestinations.map(\.catalogName)
    }

    static func destination(catalogName: String) -> WorldBookPuzzleDestination? {
        puzzleDestinations.first { $0.catalogName == catalogName }
    }

    static func destination(id: String) -> WorldBookPuzzleDestination? {
        puzzleDestinations.first { $0.id == id }
    }
}

struct WorldBookPuzzleDestination: Identifiable, Equatable, Hashable {
    let id: String
    let catalogName: String
    let semanticId: String
    let title: String
    let blurb: String
}

enum WorldBookPuzzleDifficulty: String, CaseIterable, Codable, Identifiable {
    case casual
    case normal
    case challenging
    case insane

    var id: String { rawValue }

    var title: String {
        switch self {
        case .casual: return "Easy Trail"
        case .normal: return "Trail Scrap"
        case .challenging: return "High Path"
        case .insane: return "Myth"
        }
    }

    var blurb: String {
        switch self {
        case .casual: return "4 big pieces — finish the picture"
        case .normal: return "16 pieces — the usual climb"
        case .challenging: return "64 pieces — watch the edges"
        case .insane: return "1024 pieces — a legend, not a homework"
        }
    }

    var systemIcon: String {
        switch self {
        case .casual: return "leaf.fill"
        case .normal: return "flag.checkered"
        case .challenging: return "triangle.fill"
        case .insane: return "sparkles"
        }
    }

    /// Side length of the square grid.
    var gridSize: Int {
        switch self {
        case .casual: return 2
        case .normal: return 4
        case .challenging: return 8
        case .insane: return 32
        }
    }

    var pieceCount: Int { gridSize * gridSize }

    /// Pixel size of each rendered piece bitmap (before UI scale).
    var renderOutputSize: CGFloat {
        switch self {
        case .casual: return 360
        case .normal: return 280
        case .challenging: return 160
        case .insane: return 72
        }
    }
}

struct WorldBookPageProgress: Codable, Equatable {
    var pageIndex: Int
    var difficulty: WorldBookPuzzleDifficulty
    /// Catalog name of the chosen floating-island picture (nil until picker).
    var selectedPlateCatalogName: String?
    /// Normalized centers of pieces in board space (0…1), keyed by piece id.
    var piecePositions: [String: CGPointCodable]
    var placedPieceIDs: [String]
    var isSolved: Bool

    init(
        pageIndex: Int,
        difficulty: WorldBookPuzzleDifficulty,
        selectedPlateCatalogName: String? = nil,
        piecePositions: [String: CGPointCodable] = [:],
        placedPieceIDs: [String] = [],
        isSolved: Bool = false
    ) {
        self.pageIndex = pageIndex
        self.difficulty = difficulty
        self.selectedPlateCatalogName = selectedPlateCatalogName
        self.piecePositions = piecePositions
        self.placedPieceIDs = placedPieceIDs
        self.isSolved = isSolved
    }

    /// Active jigsaw plate — destination choice, else legacy karst fallback.
    var activePlateCatalogName: String {
        if let selectedPlateCatalogName,
           WorldBookCatalog.destination(catalogName: selectedPlateCatalogName) != nil {
            return selectedPlateCatalogName
        }
        return WorldBookCatalog.puzzlePlate
    }
}

struct CGPointCodable: Codable, Equatable {
    var x: Double
    var y: Double

    init(_ point: CGPoint) {
        x = point.x
        y = point.y
    }

    var cgPoint: CGPoint { CGPoint(x: x, y: y) }
}

struct WorldBookPlayerProgress: Codable, Equatable {
    var pages: [WorldBookPageProgress]
    /// Difficulty chosen for the current open session (new games default here).
    var preferredDifficulty: WorldBookPuzzleDifficulty

    /// Default unlock is a proper 4×4.
    static func fresh(difficulty: WorldBookPuzzleDifficulty = .normal) -> WorldBookPlayerProgress {
        WorldBookPlayerProgress(
            pages: (0..<WorldBookCatalog.pageCount).map {
                WorldBookPageProgress(pageIndex: $0, difficulty: difficulty)
            },
            preferredDifficulty: difficulty
        )
    }

    var solvedCount: Int { pages.filter(\.isSolved).count }
    var allSolved: Bool { pages.contains(where: \.isSolved) }
    var isSolved: Bool { allSolved }
}

enum WorldBookJigsawEdge: Int, Codable {
    /// Border of the puzzle — flat.
    case flat = 0
    /// Tab sticks out.
    case tab = 1
    /// Socket receives a tab.
    case blank = -1

    var inverse: WorldBookJigsawEdge {
        switch self {
        case .flat: return .flat
        case .tab: return .blank
        case .blank: return .tab
        }
    }
}

struct WorldBookJigsawPiece: Identifiable, Equatable {
    let id: String
    let row: Int
    let col: Int
    let top: WorldBookJigsawEdge
    let right: WorldBookJigsawEdge
    let bottom: WorldBookJigsawEdge
    let left: WorldBookJigsawEdge
    /// Ideal normalized center on the board (0…1).
    let homeCenter: CGPoint
}

enum WorldBookJigsawCutter {
    /// Build an interlocking grid. Seed keeps edges stable across resume.
    static func pieces(grid: Int, seed: UInt64) -> [WorldBookJigsawPiece] {
        precondition(grid >= 1)
        var rng = WorldBookSeededGenerator(seed: seed)
        var horizontal: [[WorldBookJigsawEdge]] = []
        for _ in 0..<grid {
            var row: [WorldBookJigsawEdge] = []
            for _ in 0..<(grid - 1) {
                row.append(Bool.random(using: &rng) ? .tab : .blank)
            }
            horizontal.append(row)
        }
        var vertical: [[WorldBookJigsawEdge]] = []
        for _ in 0..<(grid - 1) {
            var row: [WorldBookJigsawEdge] = []
            for _ in 0..<grid {
                row.append(Bool.random(using: &rng) ? .tab : .blank)
            }
            vertical.append(row)
        }

        var out: [WorldBookJigsawPiece] = []
        let step = 1.0 / Double(grid)
        for r in 0..<grid {
            for c in 0..<grid {
                let top: WorldBookJigsawEdge = r == 0 ? .flat : vertical[r - 1][c].inverse
                let bottom: WorldBookJigsawEdge = r == grid - 1 ? .flat : vertical[r][c]
                let left: WorldBookJigsawEdge = c == 0 ? .flat : horizontal[r][c - 1].inverse
                let right: WorldBookJigsawEdge = c == grid - 1 ? .flat : horizontal[r][c]
                let home = CGPoint(
                    x: (Double(c) + 0.5) * step,
                    y: (Double(r) + 0.5) * step
                )
                out.append(
                    WorldBookJigsawPiece(
                        id: "r\(r)c\(c)",
                        row: r,
                        col: c,
                        top: top,
                        right: right,
                        bottom: bottom,
                        left: left,
                        homeCenter: home
                    )
                )
            }
        }
        return out
    }

    /// Comic-outlined piece image clipped from the source plate.
    /// Source cells map onto the piece *core* so neighbors nestle into one picture.
    /// Pass fused sides so the shared barrier ink is omitted after a join.
    static func renderPiece(
        from image: UIImage,
        piece: WorldBookJigsawPiece,
        grid: Int,
        outputSize: CGFloat,
        fusedTop: Bool = false,
        fusedRight: Bool = false,
        fusedBottom: Bool = false,
        fusedLeft: Bool = false
    ) -> UIImage? {
        guard grid > 0, let cg = image.cgImage else { return nil }
        let tabFraction: CGFloat = 0.22
        let path = piecePath(
            size: outputSize,
            tab: tabFraction,
            top: piece.top,
            right: piece.right,
            bottom: piece.bottom,
            left: piece.left
        )
        let inset = outputSize * tabFraction
        let core = outputSize - inset * 2

        let format = UIGraphicsImageRendererFormat.default()
        format.opaque = false
        format.scale = max(2, UITraitCollection.current.displayScale)
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: outputSize, height: outputSize), format: format)
        return renderer.image { ctx in
            let cgCtx = ctx.cgContext
            cgCtx.saveGState()
            cgCtx.setShouldAntialias(true)
            cgCtx.interpolationQuality = .high
            path.addClip()

            let dest = CGRect(
                x: inset - core * CGFloat(piece.col),
                y: inset - core * CGFloat(piece.row),
                width: core * CGFloat(grid),
                height: core * CGFloat(grid)
            )
            UIImage(cgImage: cg).draw(in: dest)
            cgCtx.restoreGState()

            // Outer rim only — skip ink on fused sides so joins read as one surface.
            strokeOpenEdges(
                size: outputSize,
                inset: inset,
                core: core,
                top: fusedTop ? nil : piece.top,
                right: fusedRight ? nil : piece.right,
                bottom: fusedBottom ? nil : piece.bottom,
                left: fusedLeft ? nil : piece.left
            )
        }
    }

    private static func strokeOpenEdges(
        size: CGFloat,
        inset: CGFloat,
        core: CGFloat,
        top: WorldBookJigsawEdge?,
        right: WorldBookJigsawEdge?,
        bottom: WorldBookJigsawEdge?,
        left: WorldBookJigsawEdge?
    ) {
        let ink = UIColor(white: 0.08, alpha: 0.85)
        let hi = UIColor.white.withAlphaComponent(0.28)
        let width = max(2.0, size * 0.028)
        let hiWidth = max(0.8, size * 0.01)

        func strokeSide(_ build: (UIBezierPath) -> Void) {
            let p = UIBezierPath()
            build(p)
            ink.setStroke()
            p.lineWidth = width
            p.lineCapStyle = .round
            p.lineJoinStyle = .round
            p.stroke()
            hi.setStroke()
            p.lineWidth = hiWidth
            p.stroke()
        }

        if let edge = top {
            strokeSide { path in
                path.move(to: CGPoint(x: inset, y: inset))
                addEdge(path, from: .top, edge: edge, inset: inset, core: core, size: size)
            }
        }
        if let edge = right {
            strokeSide { path in
                path.move(to: CGPoint(x: inset + core, y: inset))
                addEdge(path, from: .right, edge: edge, inset: inset, core: core, size: size)
            }
        }
        if let edge = bottom {
            strokeSide { path in
                path.move(to: CGPoint(x: inset + core, y: inset + core))
                addEdge(path, from: .bottom, edge: edge, inset: inset, core: core, size: size)
            }
        }
        if let edge = left {
            strokeSide { path in
                path.move(to: CGPoint(x: inset, y: inset + core))
                addEdge(path, from: .left, edge: edge, inset: inset, core: core, size: size)
            }
        }
    }

    static func piecePath(
        size: CGFloat,
        tab: CGFloat,
        top: WorldBookJigsawEdge,
        right: WorldBookJigsawEdge,
        bottom: WorldBookJigsawEdge,
        left: WorldBookJigsawEdge
    ) -> UIBezierPath {
        let inset = size * tab
        let core = size - inset * 2
        let path = UIBezierPath()
        path.move(to: CGPoint(x: inset, y: inset))
        addEdge(path, from: .top, edge: top, inset: inset, core: core, size: size)
        addEdge(path, from: .right, edge: right, inset: inset, core: core, size: size)
        addEdge(path, from: .bottom, edge: bottom, inset: inset, core: core, size: size)
        addEdge(path, from: .left, edge: left, inset: inset, core: core, size: size)
        path.close()
        return path
    }

    private enum Side { case top, right, bottom, left }

    /// Classic neck + knob so tabs and blanks clearly mate.
    private static func addEdge(
        _ path: UIBezierPath,
        from side: Side,
        edge: WorldBookJigsawEdge,
        inset: CGFloat,
        core: CGFloat,
        size: CGFloat
    ) {
        let neck = core * 0.14
        let knob = inset * 0.92
        let knobW = core * 0.38

        func appendKnob(along axis: Side, sign: CGFloat) {
            switch axis {
            case .top:
                let y = inset
                let mid = size / 2
                path.addLine(to: CGPoint(x: mid - knobW / 2, y: y))
                path.addLine(to: CGPoint(x: mid - knobW / 2, y: y - sign * neck * 0.35))
                path.addCurve(
                    to: CGPoint(x: mid + knobW / 2, y: y - sign * neck * 0.35),
                    controlPoint1: CGPoint(x: mid - knobW * 0.15, y: y - sign * knob),
                    controlPoint2: CGPoint(x: mid + knobW * 0.15, y: y - sign * knob)
                )
                path.addLine(to: CGPoint(x: mid + knobW / 2, y: y))
            case .right:
                let x = inset + core
                let mid = size / 2
                path.addLine(to: CGPoint(x: x, y: mid - knobW / 2))
                path.addLine(to: CGPoint(x: x + sign * neck * 0.35, y: mid - knobW / 2))
                path.addCurve(
                    to: CGPoint(x: x + sign * neck * 0.35, y: mid + knobW / 2),
                    controlPoint1: CGPoint(x: x + sign * knob, y: mid - knobW * 0.15),
                    controlPoint2: CGPoint(x: x + sign * knob, y: mid + knobW * 0.15)
                )
                path.addLine(to: CGPoint(x: x, y: mid + knobW / 2))
            case .bottom:
                let y = inset + core
                let mid = size / 2
                path.addLine(to: CGPoint(x: mid + knobW / 2, y: y))
                path.addLine(to: CGPoint(x: mid + knobW / 2, y: y + sign * neck * 0.35))
                path.addCurve(
                    to: CGPoint(x: mid - knobW / 2, y: y + sign * neck * 0.35),
                    controlPoint1: CGPoint(x: mid + knobW * 0.15, y: y + sign * knob),
                    controlPoint2: CGPoint(x: mid - knobW * 0.15, y: y + sign * knob)
                )
                path.addLine(to: CGPoint(x: mid - knobW / 2, y: y))
            case .left:
                let x = inset
                let mid = size / 2
                path.addLine(to: CGPoint(x: x, y: mid + knobW / 2))
                path.addLine(to: CGPoint(x: x - sign * neck * 0.35, y: mid + knobW / 2))
                path.addCurve(
                    to: CGPoint(x: x - sign * neck * 0.35, y: mid - knobW / 2),
                    controlPoint1: CGPoint(x: x - sign * knob, y: mid + knobW * 0.15),
                    controlPoint2: CGPoint(x: x - sign * knob, y: mid - knobW * 0.15)
                )
                path.addLine(to: CGPoint(x: x, y: mid - knobW / 2))
            }
        }

        switch side {
        case .top:
            if edge == .flat {
                path.addLine(to: CGPoint(x: inset + core, y: inset))
            } else {
                appendKnob(along: .top, sign: edge == .tab ? 1 : -1)
                path.addLine(to: CGPoint(x: inset + core, y: inset))
            }
        case .right:
            if edge == .flat {
                path.addLine(to: CGPoint(x: inset + core, y: inset + core))
            } else {
                appendKnob(along: .right, sign: edge == .tab ? 1 : -1)
                path.addLine(to: CGPoint(x: inset + core, y: inset + core))
            }
        case .bottom:
            if edge == .flat {
                path.addLine(to: CGPoint(x: inset, y: inset + core))
            } else {
                appendKnob(along: .bottom, sign: edge == .tab ? 1 : -1)
                path.addLine(to: CGPoint(x: inset, y: inset + core))
            }
        case .left:
            if edge == .flat {
                path.addLine(to: CGPoint(x: inset, y: inset))
            } else {
                appendKnob(along: .left, sign: edge == .tab ? 1 : -1)
                path.addLine(to: CGPoint(x: inset, y: inset))
            }
        }
    }
}

/// Tiny deterministic RNG so the same page+difficulty always cuts the same tabs.
struct WorldBookSeededGenerator: RandomNumberGenerator {
    private var state: UInt64
    init(seed: UInt64) { state = seed == 0 ? 0x9E3779B97F4A7C15 : seed }
    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}

enum WorldBookPuzzleStore {
    private static func key(playerId: String) -> String {
        "world2.worldBook.progress.\(playerId)"
    }

    static func load(playerId: String) -> WorldBookPlayerProgress {
        guard let data = UserDefaults.standard.data(forKey: key(playerId: playerId)),
              let decoded = try? JSONDecoder().decode(WorldBookPlayerProgress.self, from: data)
        else {
            return .fresh()
        }
        var progress = decoded
        // Collapse legacy multi-page saves → single puzzle.
        let anySolved = progress.pages.contains(where: \.isSolved)
        let difficulty: WorldBookPuzzleDifficulty = {
            if progress.preferredDifficulty == .casual { return .normal }
            return progress.preferredDifficulty
        }()
        if progress.pages.count != WorldBookCatalog.pageCount
            || progress.preferredDifficulty == .casual
            || (progress.pages.first?.difficulty == .casual && !anySolved) {
            progress = WorldBookPlayerProgress(
                pages: [
                    WorldBookPageProgress(
                        pageIndex: 0,
                        difficulty: difficulty,
                        isSolved: anySolved
                    )
                ],
                preferredDifficulty: difficulty
            )
            save(progress, playerId: playerId)
        }
        return progress
    }

    static func save(_ progress: WorldBookPlayerProgress, playerId: String) {
        guard let data = try? JSONEncoder().encode(progress) else { return }
        UserDefaults.standard.set(data, forKey: key(playerId: playerId))
    }

    static func resetPage(playerId: String, pageIndex: Int, difficulty: WorldBookPuzzleDifficulty) {
        var progress = load(playerId: playerId)
        guard progress.pages.indices.contains(pageIndex) else { return }
        progress.pages[pageIndex] = WorldBookPageProgress(pageIndex: pageIndex, difficulty: difficulty)
        progress.preferredDifficulty = difficulty
        save(progress, playerId: playerId)
    }

    static func resetAll(playerId: String, difficulty: WorldBookPuzzleDifficulty) {
        let fresh = WorldBookPlayerProgress.fresh(difficulty: difficulty)
        save(fresh, playerId: playerId)
    }
}
