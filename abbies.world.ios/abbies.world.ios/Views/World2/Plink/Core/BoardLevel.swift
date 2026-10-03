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

    /// Fox Land + Peglin cavern — intentional motifs (rails retired from cavern).
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

    // MARK: Peglin cavern (dense force pegs — no legacy curved barrier rails)

    /// Dense force-orange majority, stone clusters, buckets. Curved U/loop rails retired.
    private static let peglinCavernArcs = BoardLevel(
        id: "peglin.cavernArcs",
        name: "Cavern Arcs",
        blurb: "Summit density · force pegs · buckets",
        balls: 10,
        pegs: spaced(
            // Specials first so density culling never drops R / bombs / crits.
            cavernSpecials()
                + cavernForceField()
                + stoneTriangles(),
            minDist: 0.022
        ),
        rails: [],
        buckets: cavernBuckets(),
        pegRadius: 6.8,
        referenceWidth: 900,
        referenceHeight: 1100
    )

    // MARK: Fox Land patterns (kept; lighter density)

    private static let foxNineTails = BoardLevel(
        id: "fox.nineTails",
        name: "Nine Tails",
        blurb: "Spaced tails — Brawl land bosses",
        balls: 14,
        pegs: spaced(
            foxBody()
                + foxTails(count: 11, pegsPerTail: 8)
                + [
                    PegSpec(nx: 0.50, ny: 0.22, kind: .crit),
                    PegSpec(nx: 0.50, ny: 0.72, kind: .orange),
                    PegSpec(nx: 0.28, ny: 0.40, kind: .blue),
                    PegSpec(nx: 0.72, ny: 0.40, kind: .blue),
                    PegSpec(nx: 0.38, ny: 0.58, kind: .bomb),
                    PegSpec(nx: 0.62, ny: 0.58, kind: .bomb),
                ],
            minDist: 0.038
        ),
        rails: [],
        buckets: defaultBuckets(),
        pegRadius: 8.5,
        referenceWidth: 1000,
        referenceHeight: 900
    )

    private static let foxPawPrint = BoardLevel(
        id: "fox.pawPrint",
        name: "Fox Paw",
        blurb: "Dense paw — forgiving scrap with bounce room",
        balls: 14,
        pegs: spaced(foxPawPegs(), minDist: 0.036),
        rails: [],
        buckets: defaultBuckets(),
        pegRadius: 8.5,
        referenceWidth: 1000,
        referenceHeight: 900
    )

    private static let foxLanternRings = BoardLevel(
        id: "fox.lanternRings",
        name: "Lantern Rings",
        blurb: "Ring lanes — Swift foes and flyers",
        balls: 14,
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
        blurb: "Chevron tracks — Craft puzzle lanes",
        balls: 14,
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
    // Tighter hex-ish lattice — more mayhem / bounce chains.
    let rows: [(cy: CGFloat, xs: [CGFloat])] = [
        (0.16, strideArray(from: 0.16, through: 0.84, by: 0.06)),
        (0.21, strideArray(from: 0.13, through: 0.87, by: 0.055)),
        (0.26, strideArray(from: 0.15, through: 0.85, by: 0.055)),
        (0.31, strideArray(from: 0.12, through: 0.88, by: 0.05)),
        (0.36, strideArray(from: 0.14, through: 0.86, by: 0.05)),
        (0.41, strideArray(from: 0.12, through: 0.88, by: 0.05)),
        (0.46, strideArray(from: 0.13, through: 0.87, by: 0.05)),
        (0.51, strideArray(from: 0.12, through: 0.88, by: 0.05)),
        (0.56, strideArray(from: 0.14, through: 0.86, by: 0.05)),
        (0.61, strideArray(from: 0.13, through: 0.87, by: 0.055)),
        (0.66, strideArray(from: 0.16, through: 0.84, by: 0.055)),
        (0.71, strideArray(from: 0.18, through: 0.82, by: 0.06)),
        (0.76, strideArray(from: 0.22, through: 0.78, by: 0.065)),
    ]
    for row in rows {
        for (i, x) in row.xs.enumerated() {
            // Narrower skip lanes — denser default.
            if i % 9 == 4 { continue }
            out.append(PegSpec(nx: x, ny: row.cy, kind: .orange))
        }
    }
    // Arc-following force beads (peg motif only — no physics barrier rails).
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

private func foxPawPegs() -> [PegSpec] {
    var pegs: [PegSpec] = []
    pegs += pad(cx: 0.50, cy: 0.54, r: 0.11, n: 12, kind: .orange)
    pegs.append(PegSpec(nx: 0.50, ny: 0.54, kind: .orange))
    pegs += pad(cx: 0.28, cy: 0.32, r: 0.055, n: 7, kind: .orange)
    pegs += pad(cx: 0.42, cy: 0.26, r: 0.055, n: 7, kind: .orange)
    pegs += pad(cx: 0.58, cy: 0.26, r: 0.055, n: 7, kind: .orange)
    pegs += pad(cx: 0.72, cy: 0.32, r: 0.055, n: 7, kind: .orange)
    pegs += pad(cx: 0.50, cy: 0.42, r: 0.08, n: 8, kind: .blue)
    pegs.append(PegSpec(nx: 0.50, ny: 0.40, kind: .crit))
    pegs.append(PegSpec(nx: 0.50, ny: 0.70, kind: .orange))
    pegs.append(PegSpec(nx: 0.22, ny: 0.54, kind: .blue))
    pegs.append(PegSpec(nx: 0.78, ny: 0.54, kind: .blue))
    pegs.append(PegSpec(nx: 0.36, ny: 0.48, kind: .bomb))
    pegs.append(PegSpec(nx: 0.64, ny: 0.48, kind: .bomb))
    return pegs
}

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

// MARK: - Arc peg helpers

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
