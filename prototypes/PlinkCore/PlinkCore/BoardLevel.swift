import Foundation
import CoreGraphics

struct PegSpec {
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

    /// Five distinct layouts to switch from the tune drawer.
    static let catalog: [BoardLevel] = [
        BoardLevel(
            id: "rings",
            name: "Twin Rings",
            blurb: "Two nested circles — aim into the gap",
            balls: 10,
            pegs: ring(cx: 0.50, cy: 0.42, r: 0.22, n: 14, kind: .blue)
                + ring(cx: 0.50, cy: 0.42, r: 0.12, n: 8, kind: .orange)
                + [
                    PegSpec(nx: 0.50, ny: 0.42, kind: .orange),
                    PegSpec(nx: 0.50, ny: 0.28, kind: .crit),
                    PegSpec(nx: 0.50, ny: 0.56, kind: .refresh),
                ]
        ),
        BoardLevel(
            id: "pillars",
            name: "Twin Pillars",
            blurb: "Two tall columns — bank off the walls",
            balls: 10,
            pegs: column(x: 0.32, y0: 0.22, step: 0.085, n: 7, kind: .blue)
                + column(x: 0.68, y0: 0.22, step: 0.085, n: 7, kind: .blue)
                + column(x: 0.50, y0: 0.30, step: 0.10, n: 5, kind: .orange)
                + [
                    PegSpec(nx: 0.40, ny: 0.55, kind: .orange),
                    PegSpec(nx: 0.60, ny: 0.55, kind: .orange),
                    PegSpec(nx: 0.50, ny: 0.22, kind: .crit),
                    PegSpec(nx: 0.50, ny: 0.70, kind: .refresh),
                ]
        ),
        BoardLevel(
            id: "arch",
            name: "Rainbow Arch",
            blurb: "Wide arc of blues, orange jewels underneath",
            balls: 10,
            pegs: arc(cx: 0.50, cy: 0.58, r: 0.32, a0: -.pi * 0.92, a1: .pi * 0.92, n: 13, kind: .blue)
                + arc(cx: 0.50, cy: 0.58, r: 0.18, a0: -.pi * 0.7, a1: .pi * 0.7, n: 7, kind: .orange)
                + [
                    PegSpec(nx: 0.50, ny: 0.58, kind: .orange),
                    PegSpec(nx: 0.35, ny: 0.72, kind: .blue),
                    PegSpec(nx: 0.65, ny: 0.72, kind: .blue),
                    PegSpec(nx: 0.22, ny: 0.48, kind: .crit),
                    PegSpec(nx: 0.78, ny: 0.48, kind: .refresh),
                ]
        ),
        BoardLevel(
            id: "honey",
            name: "Honeycomb",
            blurb: "Dense staggered field — chaos ricochets",
            balls: 12,
            pegs: staggeredGrid(x0: 0.20, y0: 0.24, dx: 0.11, dy: 0.09, cols: 7, rows: 6) { c, r in
                if c == 3 && r == 1 { return .crit }
                if c == 3 && r == 4 { return .refresh }
                return (c + r * 2) % 4 == 0 ? .orange : .blue
            }
        ),
        BoardLevel(
            id: "fortress",
            name: "Orange Fortress",
            blurb: "Blue shell around a packed orange core",
            balls: 12,
            pegs: ring(cx: 0.50, cy: 0.40, r: 0.26, n: 14, kind: .blue)
                + ring(cx: 0.50, cy: 0.40, r: 0.15, n: 9, kind: .orange)
                + ring(cx: 0.50, cy: 0.40, r: 0.06, n: 5, kind: .orange)
                + [
                    PegSpec(nx: 0.50, ny: 0.40, kind: .orange),
                    PegSpec(nx: 0.25, ny: 0.68, kind: .orange),
                    PegSpec(nx: 0.75, ny: 0.68, kind: .orange),
                    PegSpec(nx: 0.50, ny: 0.72, kind: .blue),
                    PegSpec(nx: 0.50, ny: 0.18, kind: .crit),
                    PegSpec(nx: 0.18, ny: 0.40, kind: .refresh),
                    PegSpec(nx: 0.82, ny: 0.40, kind: .refresh),
                ]
        ),
    ]
}

// MARK: - Layout helpers

private func ring(cx: CGFloat, cy: CGFloat, r: CGFloat, n: Int, kind: PegKind) -> [PegSpec] {
    (0..<n).map { i in
        let a = (CGFloat(i) / CGFloat(n)) * .pi * 2 - .pi / 2
        return PegSpec(nx: cx + cos(a) * r, ny: cy + sin(a) * r * 0.88, kind: kind)
    }
}

private func column(x: CGFloat, y0: CGFloat, step: CGFloat, n: Int, kind: PegKind) -> [PegSpec] {
    (0..<n).map { i in PegSpec(nx: x, ny: y0 + CGFloat(i) * step, kind: kind) }
}

private func arc(cx: CGFloat, cy: CGFloat, r: CGFloat, a0: CGFloat, a1: CGFloat, n: Int, kind: PegKind) -> [PegSpec] {
    (0..<n).map { i in
        let t = n == 1 ? 0.5 : CGFloat(i) / CGFloat(n - 1)
        let a = a0 + (a1 - a0) * t
        return PegSpec(nx: cx + cos(a) * r, ny: cy + sin(a) * r * 0.78, kind: kind)
    }
}

private func staggeredGrid(
    x0: CGFloat,
    y0: CGFloat,
    dx: CGFloat,
    dy: CGFloat,
    cols: Int,
    rows: Int,
    kind: (Int, Int) -> PegKind
) -> [PegSpec] {
    var out: [PegSpec] = []
    for r in 0..<rows {
        let offset = (r % 2 == 0) ? 0 : dx * 0.5
        for c in 0..<cols {
            let nx = x0 + CGFloat(c) * dx + offset
            let ny = y0 + CGFloat(r) * dy
            guard nx > 0.08, nx < 0.92, ny > 0.15, ny < 0.78 else { continue }
            out.append(PegSpec(nx: nx, ny: ny, kind: kind(c, r)))
        }
    }
    return out
}
