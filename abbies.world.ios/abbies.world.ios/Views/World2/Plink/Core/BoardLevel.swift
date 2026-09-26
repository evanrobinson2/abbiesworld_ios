import Foundation
import CoreGraphics

struct PegSpec: Equatable {
    /// Normalized board coords: x 0…1 left→right, y 0…1 top→bottom (shooter at top).
    var nx: CGFloat
    var ny: CGFloat
    var kind: PegKind
}

struct BoardLevel: Identifiable {
    let id: String
    let name: String
    let blurb: String
    let balls: Int
    let pegs: [PegSpec]
    /// Curved track geometry (Peglin-style radical rails).
    var rails: [RailSpec]
    /// Bottom catch cups.
    var buckets: [BucketSpec]
    /// Peg radius in points at `referenceWidth`.
    var pegRadius: CGFloat
    /// Design canvas — scene scales pegs/rails from this.
    var referenceWidth: CGFloat
    var referenceHeight: CGFloat

    /// Fox Land + Peglin cavern — intentional motifs with radical rail geometry.
    static let catalog: [BoardLevel] = [
        peglinCavernArcs,
        foxNineTails,
        foxPawPrint,
        foxLanternRings,
        foxTrailChevrons,
    ]

    static func level(id: String) -> BoardLevel? {
        catalog.first { $0.id == id }
    }

    static func index(ofID id: String) -> Int {
        catalog.firstIndex { $0.id == id } ?? 0
    }

    // MARK: Peglin cavern (dense force pegs + curved rails)

    /// Closest match to Peglin forest cavern: U-rails, force-orange majority, stone clusters, buckets.
    private static let peglinCavernArcs = BoardLevel(
        id: "peglin.cavernArcs",
        name: "Cavern Arcs",
        blurb: "Dense force pegs · curved rails · buckets",
        balls: 12,
        pegs: spaced(
            // Specials first so density culling never drops R / bombs / crits.
            cavernSpecials()
                + cavernForceField()
                + stoneTriangles(),
            minDist: 0.028
        ),
        rails: cavernRails(),
        buckets: cavernBuckets(),
        pegRadius: 7.5,
        referenceWidth: 900,
        referenceHeight: 1100
    )

    // MARK: Fox Land patterns (kept; lighter density)

    private static let foxNineTails = BoardLevel(
        id: "fox.nineTails",
        name: "Nine Tails",
        blurb: "Fox Land — nine spaced tail arcs",
        balls: 16,
        pegs: spaced(
            foxBody()
                + foxTails(count: 9, pegsPerTail: 6)
                + [
                    PegSpec(nx: 0.50, ny: 0.22, kind: .crit),
                    PegSpec(nx: 0.50, ny: 0.72, kind: .orange),
                    PegSpec(nx: 0.28, ny: 0.40, kind: .blue),
                    PegSpec(nx: 0.72, ny: 0.40, kind: .blue),
                    PegSpec(nx: 0.38, ny: 0.58, kind: .bomb),
                    PegSpec(nx: 0.62, ny: 0.58, kind: .bomb),
                ]
        ),
        rails: [],
        buckets: defaultBuckets(),
        pegRadius: 10,
        referenceWidth: 1000,
        referenceHeight: 900
    )

    private static let foxPawPrint = BoardLevel(
        id: "fox.pawPrint",
        name: "Fox Paw",
        blurb: "Fox Land — paw pads with open lanes",
        balls: 16,
        pegs: spaced(
            pad(cx: 0.50, cy: 0.54, r: 0.11, n: 8, kind: .orange)
                + [PegSpec(nx: 0.50, ny: 0.54, kind: .orange)]
                + pad(cx: 0.28, cy: 0.32, r: 0.055, n: 5, kind: .orange)
                + pad(cx: 0.42, cy: 0.26, r: 0.055, n: 5, kind: .orange)
                + pad(cx: 0.58, cy: 0.26, r: 0.055, n: 5, kind: .orange)
                + pad(cx: 0.72, cy: 0.32, r: 0.055, n: 5, kind: .orange)
                + [
                    PegSpec(nx: 0.50, ny: 0.40, kind: .crit),
                    PegSpec(nx: 0.50, ny: 0.70, kind: .orange),
                    PegSpec(nx: 0.22, ny: 0.54, kind: .blue),
                    PegSpec(nx: 0.78, ny: 0.54, kind: .blue),
                    PegSpec(nx: 0.36, ny: 0.48, kind: .bomb),
                    PegSpec(nx: 0.64, ny: 0.48, kind: .bomb),
                ]
        ),
        rails: [],
        buckets: defaultBuckets(),
        pegRadius: 10,
        referenceWidth: 1000,
        referenceHeight: 900
    )

    private static let foxLanternRings = BoardLevel(
        id: "fox.lanternRings",
        name: "Lantern Rings",
        blurb: "Fox Land — glowing rings with open lanes",
        balls: 16,
        pegs: spaced(
            gappedRing(cx: 0.50, cy: 0.46, r: 0.30, n: 14, gapEvery: 7, kind: .orange)
                + gappedRing(cx: 0.50, cy: 0.46, r: 0.22, n: 12, gapEvery: 6, kind: .orange)
                + gappedRing(cx: 0.50, cy: 0.46, r: 0.14, n: 10, gapEvery: 5, kind: .orange)
                + [
                    PegSpec(nx: 0.50, ny: 0.46, kind: .orange),
                    PegSpec(nx: 0.50, ny: 0.20, kind: .crit),
                    PegSpec(nx: 0.50, ny: 0.70, kind: .orange),
                    PegSpec(nx: 0.28, ny: 0.46, kind: .blue),
                    PegSpec(nx: 0.72, ny: 0.46, kind: .blue),
                    PegSpec(nx: 0.40, ny: 0.58, kind: .bomb),
                    PegSpec(nx: 0.60, ny: 0.58, kind: .bomb),
                ]
        ),
        rails: [],
        buckets: defaultBuckets(),
        pegRadius: 10,
        referenceWidth: 1000,
        referenceHeight: 900
    )

    private static let foxTrailChevrons = BoardLevel(
        id: "fox.trailChevrons",
        name: "Fox Trail",
        blurb: "Fox Land — chevron tracks down the grove",
        balls: 16,
        pegs: spaced(
            chevron(cy: 0.24, halfWidth: 0.28, depth: 0.07, kind: .orange)
                + chevron(cy: 0.36, halfWidth: 0.32, depth: 0.07, kind: .orange)
                + chevron(cy: 0.48, halfWidth: 0.34, depth: 0.07, kind: .orange)
                + chevron(cy: 0.60, halfWidth: 0.30, depth: 0.07, kind: .orange)
                + [
                    PegSpec(nx: 0.50, ny: 0.18, kind: .crit),
                    PegSpec(nx: 0.50, ny: 0.72, kind: .orange),
                    PegSpec(nx: 0.22, ny: 0.48, kind: .blue),
                    PegSpec(nx: 0.78, ny: 0.48, kind: .blue),
                    PegSpec(nx: 0.36, ny: 0.54, kind: .bomb),
                    PegSpec(nx: 0.64, ny: 0.54, kind: .bomb),
                ]
        ),
        rails: [],
        buckets: defaultBuckets(),
        pegRadius: 10,
        referenceWidth: 1000,
        referenceHeight: 900
    )
}

// MARK: - Cavern builders

/// Dense force-orange field filling the cavern (majority of pegs).
private func cavernForceField() -> [PegSpec] {
    var out: [PegSpec] = []
    // Hex-ish lattice biased toward the glowing fire pegs in Peglin screenshots.
    let rows: [(cy: CGFloat, xs: [CGFloat])] = [
        (0.18, strideArray(from: 0.18, through: 0.82, by: 0.08)),
        (0.24, strideArray(from: 0.14, through: 0.86, by: 0.07)),
        (0.30, strideArray(from: 0.16, through: 0.84, by: 0.07)),
        (0.36, strideArray(from: 0.12, through: 0.88, by: 0.065)),
        (0.42, strideArray(from: 0.15, through: 0.85, by: 0.065)),
        (0.48, strideArray(from: 0.13, through: 0.87, by: 0.06)),
        (0.54, strideArray(from: 0.16, through: 0.84, by: 0.065)),
        (0.60, strideArray(from: 0.14, through: 0.86, by: 0.07)),
        (0.66, strideArray(from: 0.18, through: 0.82, by: 0.07)),
        (0.72, strideArray(from: 0.22, through: 0.78, by: 0.08)),
    ]
    for row in rows {
        for (i, x) in row.xs.enumerated() {
            // Skip a few cells as lanes through the lattice.
            if i % 9 == 4 { continue }
            out.append(PegSpec(nx: x, ny: row.cy, kind: .orange))
        }
    }
    // Arc-following force beads along the big U rails.
    out += arcPegs(cx: 0.28, cy: 0.48, r: 0.22, start: .pi * 0.15, end: .pi * 0.95, n: 14, kind: .orange)
    out += arcPegs(cx: 0.72, cy: 0.48, r: 0.22, start: .pi * 0.05, end: .pi * 0.85, n: 14, kind: .orange)
    out += arcPegs(cx: 0.50, cy: 0.38, r: 0.16, start: .pi * 0.2, end: .pi * 0.8, n: 10, kind: .orange)
    return out
}

private func stoneTriangles() -> [PegSpec] {
    var out: [PegSpec] = []
    let centers: [(CGFloat, CGFloat)] = [
        (0.22, 0.28), (0.50, 0.26), (0.78, 0.28),
        (0.34, 0.52), (0.66, 0.52),
        (0.26, 0.68), (0.74, 0.68),
        (0.48, 0.62),
    ]
    for (cx, cy) in centers {
        out.append(PegSpec(nx: cx, ny: cy, kind: .stone))
        out.append(PegSpec(nx: cx - 0.022, ny: cy + 0.028, kind: .stone))
        out.append(PegSpec(nx: cx + 0.022, ny: cy + 0.028, kind: .stone))
    }
    return out
}

private func cavernSpecials() -> [PegSpec] {
    [
        PegSpec(nx: 0.50, ny: 0.16, kind: .crit),
        PegSpec(nx: 0.32, ny: 0.34, kind: .crit),
        PegSpec(nx: 0.68, ny: 0.34, kind: .crit),
        PegSpec(nx: 0.20, ny: 0.44, kind: .refresh),
        PegSpec(nx: 0.80, ny: 0.44, kind: .refresh),
        PegSpec(nx: 0.42, ny: 0.58, kind: .bomb),
        PegSpec(nx: 0.58, ny: 0.58, kind: .bomb),
        PegSpec(nx: 0.50, ny: 0.78, kind: .orange),
    ]
}

private func cavernRails() -> [RailSpec] {
    [
        // Left deep U
        arcRail(cx: 0.26, cy: 0.50, r: 0.26, start: .pi * 0.08, end: .pi * 0.98, steps: 22, halfWidth: 0.014),
        // Right deep U
        arcRail(cx: 0.74, cy: 0.50, r: 0.26, start: .pi * 0.02, end: .pi * 0.92, steps: 22, halfWidth: 0.014),
        // Center nested bowl
        arcRail(cx: 0.50, cy: 0.42, r: 0.20, start: .pi * 0.18, end: .pi * 0.82, steps: 18, halfWidth: 0.012),
        // Upper swoops
        arcRail(cx: 0.38, cy: 0.28, r: 0.18, start: -.pi * 0.15, end: .pi * 0.55, steps: 14, halfWidth: 0.011),
        arcRail(cx: 0.62, cy: 0.28, r: 0.18, start: .pi * 0.45, end: .pi * 1.15, steps: 14, halfWidth: 0.011),
        // Mid crossing bars (gentle S)
        polylineRail([
            CGPoint(x: 0.18, y: 0.56), CGPoint(x: 0.32, y: 0.52),
            CGPoint(x: 0.42, y: 0.58), CGPoint(x: 0.58, y: 0.52),
            CGPoint(x: 0.68, y: 0.58), CGPoint(x: 0.82, y: 0.54),
        ], halfWidth: 0.010),
    ]
}

private func cavernBuckets() -> [BucketSpec] {
    [
        BucketSpec(nx: 0.18, ny: 0.90, radius: 0.055),
        BucketSpec(nx: 0.39, ny: 0.90, radius: 0.055),
        BucketSpec(nx: 0.61, ny: 0.90, radius: 0.055),
        BucketSpec(nx: 0.82, ny: 0.90, radius: 0.055),
    ]
}

private func defaultBuckets() -> [BucketSpec] {
    [
        BucketSpec(nx: 0.20, ny: 0.92, radius: 0.05),
        BucketSpec(nx: 0.40, ny: 0.92, radius: 0.05),
        BucketSpec(nx: 0.60, ny: 0.92, radius: 0.05),
        BucketSpec(nx: 0.80, ny: 0.92, radius: 0.05),
    ]
}

// MARK: - Fox motif builders

private func foxBody() -> [PegSpec] {
    pad(cx: 0.50, cy: 0.42, r: 0.06, n: 5, kind: .orange)
        + [PegSpec(nx: 0.50, ny: 0.42, kind: .orange)]
}

private func foxTails(count: Int, pegsPerTail: Int) -> [PegSpec] {
    guard count > 0, pegsPerTail > 0 else { return [] }
    var out: [PegSpec] = []
    for i in 0..<count {
        let t = count == 1 ? 0.5 : CGFloat(i) / CGFloat(count - 1)
        let angle = (-0.70 + 1.40 * t) * .pi
        for step in 1...pegsPerTail {
            let dist = 0.10 + CGFloat(step) * 0.055
            let nx = 0.50 + sin(angle) * dist
            let ny = 0.42 + abs(cos(angle)) * dist * 0.92
            out.append(PegSpec(nx: nx, ny: ny, kind: .orange))
        }
    }
    return out
}

private func pad(cx: CGFloat, cy: CGFloat, r: CGFloat, n: Int, kind: PegKind) -> [PegSpec] {
    (0..<n).map { i in
        let a = (CGFloat(i) / CGFloat(n)) * .pi * 2 - .pi / 2
        return PegSpec(nx: cx + cos(a) * r, ny: cy + sin(a) * r * 0.90, kind: kind)
    }
}

private func gappedRing(
    cx: CGFloat,
    cy: CGFloat,
    r: CGFloat,
    n: Int,
    gapEvery: Int,
    kind: PegKind
) -> [PegSpec] {
    (0..<n).compactMap { i in
        if gapEvery > 0, i % gapEvery == 0 { return nil }
        let a = (CGFloat(i) / CGFloat(n)) * .pi * 2 - .pi / 2
        return PegSpec(nx: cx + cos(a) * r, ny: cy + sin(a) * r * 0.88, kind: kind)
    }
}

private func chevron(cy: CGFloat, halfWidth: CGFloat, depth: CGFloat, kind: PegKind) -> [PegSpec] {
    let steps = 5
    var out: [PegSpec] = []
    for i in 0..<steps {
        let t = CGFloat(i) / CGFloat(steps - 1)
        out.append(PegSpec(
            nx: 0.50 - halfWidth * (1 - t),
            ny: cy + depth * t,
            kind: kind
        ))
        if i > 0 {
            out.append(PegSpec(
                nx: 0.50 + halfWidth * (1 - t),
                ny: cy + depth * t,
                kind: kind
            ))
        }
    }
    return out
}

// MARK: - Rail / arc helpers

private func arcRail(
    cx: CGFloat,
    cy: CGFloat,
    r: CGFloat,
    start: CGFloat,
    end: CGFloat,
    steps: Int,
    halfWidth: CGFloat
) -> RailSpec {
    let pts = (0...steps).map { i -> CGPoint in
        let t = CGFloat(i) / CGFloat(steps)
        let a = start + (end - start) * t
        // y grows downward in board space; classic math angles from +x.
        return CGPoint(x: cx + cos(a) * r, y: cy + sin(a) * r)
    }
    return RailSpec(points: pts, halfWidth: halfWidth)
}

private func polylineRail(_ pts: [CGPoint], halfWidth: CGFloat) -> RailSpec {
    RailSpec(points: pts, halfWidth: halfWidth)
}

private func arcPegs(
    cx: CGFloat,
    cy: CGFloat,
    r: CGFloat,
    start: CGFloat,
    end: CGFloat,
    n: Int,
    kind: PegKind
) -> [PegSpec] {
    guard n > 1 else { return [] }
    return (0..<n).map { i in
        let t = CGFloat(i) / CGFloat(n - 1)
        let a = start + (end - start) * t
        return PegSpec(nx: cx + cos(a) * r, ny: cy + sin(a) * r, kind: kind)
    }
}

private func strideArray(from: CGFloat, through: CGFloat, by: CGFloat) -> [CGFloat] {
    guard by > 0, through >= from else { return [] }
    var out: [CGFloat] = []
    var x = from
    while x <= through + 0.0001 {
        out.append(x)
        x += by
    }
    return out
}

// MARK: - Non-overlap

private func spaced(_ pegs: [PegSpec], minDist: CGFloat = 0.052) -> [PegSpec] {
    var kept: [PegSpec] = []
    for p in pegs {
        guard p.nx > 0.08, p.nx < 0.92, p.ny > 0.14, p.ny < 0.84 else { continue }
        let clashes = kept.contains { hypot($0.nx - p.nx, $0.ny - p.ny) < minDist }
        if clashes { continue }
        kept.append(p)
    }
    return kept
}
