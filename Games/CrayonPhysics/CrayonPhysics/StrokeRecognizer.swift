import CoreGraphics
import Foundation

struct RecognizedRectangle {
    var center: CGPoint
    var size: CGSize
    var angle: CGFloat
    var score: CGFloat
}

/// Source-informed candidate fitting from FUN_004d7590. CoreGraphics raster sampling,
/// float precision and degenerate line behavior still need executable comparison.
enum StrokeRecognizer {
    static func recognize(_ points: [CGPoint]) -> RecognizedRectangle? {
        guard points.count >= 3 else { return nil }
        let minX = points.map(\.x).min()!, maxX = points.map(\.x).max()!
        let minY = points.map(\.y).min()!, maxY = points.map(\.y).max()!
        guard hypot(maxX - minX, maxY - minY) > 3 else { return nil }
        let outline = CGMutablePath()
        outline.addLines(between: points)
        outline.closeSubpath()
        let step: CGFloat = max(2, sqrt(max(1, (maxX - minX) * (maxY - minY)) / 4096))
        var filled: [CGPoint] = []
        var y = minY + step / 2
        while y < maxY {
            var x = minX + step / 2
            while x < maxX {
                let point = CGPoint(x: x, y: y)
                if outline.contains(point, using: .evenOdd) { filled.append(point) }
                x += step
            }
            y += step
        }
        // Source also proposes thin rectangles from near-collinear stroke extrema.
        let samples = filled.isEmpty ? points : filled
        var best: RecognizedRectangle?
        for candidate in sourceCandidates(points) {
            let angle = candidate.angle
            let c = cos(angle), s = sin(angle)
            let center = candidate.center
                let width = candidate.size.width
                let height = candidate.size.height
                let overlap = samples.filter { p in
                    let x = (p.x - center.x) * c + (p.y - center.y) * s
                    let y = -(p.x - center.x) * s + (p.y - center.y) * c
                    return abs(x) <= width / 2 && abs(y) <= height / 2
                }.count
                let coverage = CGFloat(overlap) / CGFloat(samples.count)
                let occupied = min(1, CGFloat(overlap) * step * step / (width * height))
                let score = filled.isEmpty ? coverage - width * height / 480000 : coverage - (1 - occupied)
                if score > (best?.score ?? 0) {
                    best = RecognizedRectangle(center: center, size: CGSize(width: width, height: height), angle: angle, score: score)
                }
        }
        return best
    }

    /// Uses original downward-positive coordinates to preserve extrema tie rules.
    static func sourceCandidates(_ scenePoints: [CGPoint]) -> [RecognizedRectangle] {
        let points = scenePoints.map { CGPoint(x: $0.x, y: 600 - $0.y) }
        guard let first = points.first else { return [] }
        var left = first, right = first, top = first, bottom = first
        for p in points.dropFirst() {
            if p.x < left.x { left = p }
            if p.x >= right.x { right = p }
            if p.y < top.y { top = p }
            if p.y >= bottom.y { bottom = p }
        }
        func delta(_ a: CGPoint, _ b: CGPoint) -> CGPoint { CGPoint(x: a.x - b.x, y: a.y - b.y) }
        func length(_ p: CGPoint) -> CGFloat { hypot(p.x, p.y) }
        func distance(_ a: CGPoint, _ b: CGPoint) -> CGFloat { length(delta(a, b)) }
        var result: [RecognizedRectangle] = []
        func append(_ center: CGPoint, _ w: CGFloat, _ h: CGFloat, _ angle: CGFloat = 0) {
            result.append(RecognizedRectangle(center: CGPoint(x: center.x, y: 600 - center.y),
                                              size: CGSize(width: w, height: h), angle: -angle, score: 0))
        }
        if ((distance(top, left) < 5 && distance(bottom, right) < 5) ||
            (distance(top, right) < 5 && distance(bottom, left) < 5)) && distance(top, bottom) > 3 {
            let axis = delta(top, bottom)
            let middle = CGPoint(x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2)
            var thickness: CGFloat = 2
            for _ in 0...10 {
                append(middle, length(axis) + 5, thickness, atan2(axis.y, axis.x))
                thickness *= 1.5
            }
        }
        let center = CGPoint(x: (left.x + right.x) / 2, y: (top.y + bottom.y) / 2)
        var w = max(3, right.x - left.x), h = max(3, bottom.y - top.y)
        append(center, w, h)
        for _ in 0..<3 {
            w = max(3, w * CGFloat(Float(0.95)))
            append(center, w, h)
            h = max(3, h * CGFloat(Float(0.95)))
            append(center, w, h)
        }
        let crossing = intersection(top, bottom, left, right) ?? .zero
        let a = delta(top, right), b = delta(left, bottom)
        let c = delta(right, bottom), d = delta(left, top)
        let angleA = atan2(b.y, b.x) + CGFloat(Float(3.14159))
        let angleB = atan2(d.y, d.x) + CGFloat(3.14159)
        let maxA = max(5, max(length(a), length(b))), maxB = max(5, max(length(c), length(d)))
        let minA = max(5, min(length(a), length(b))), minB = max(5, min(length(c), length(d)))
        append(crossing, maxA, maxB, angleA)
        append(crossing, maxB, maxA, angleB)
        append(crossing, minA, minB, angleA)
        append(crossing, minB, minA, angleB)
        return result
    }

    private static func intersection(_ a: CGPoint, _ b: CGPoint, _ c: CGPoint, _ d: CGPoint) -> CGPoint? {
        func sub(_ a: CGPoint, _ b: CGPoint) -> CGPoint { CGPoint(x: a.x - b.x, y: a.y - b.y) }
        func cross(_ a: CGPoint, _ b: CGPoint) -> CGFloat { a.x * b.y - a.y * b.x }
        let r = sub(b, a), s = sub(d, c), denominator = cross(r, s)
        guard denominator != 0 else { return nil }
        let delta = sub(c, a), t = cross(delta, s) / denominator, u = cross(delta, r) / denominator
        guard (0...1).contains(t), (0...1).contains(u) else { return nil }
        return CGPoint(x: a.x + t * r.x, y: a.y + t * r.y)
    }
}
