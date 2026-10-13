//
//  World2WaterfallStroke.swift
//  abbies.world.ios
//
//  Editable polyline that drives home waterfall FX. Measured from the plate
//  mask / art, then tweakable in Build → Waterfall.
//

import Combine
import Foundation
import SwiftUI

struct World2WaterfallStrokePoint: Codable, Equatable, Identifiable {
    var id: String
    /// Normalized 0…1 on the map plate.
    var x: Double
    var y: Double
    /// Half-width of the cascade band at this sample (normalized).
    var halfWidth: Double

    init(id: String = UUID().uuidString, x: Double, y: Double, halfWidth: Double = 0.022) {
        self.id = id
        self.x = min(1, max(0, x))
        self.y = min(1, max(0, y))
        self.halfWidth = min(0.12, max(0.008, halfWidth))
    }

    var point: CGPoint { CGPoint(x: x, y: y) }
}

struct World2WaterfallStroke: Codable, Equatable {
    var sceneID: String
    var points: [World2WaterfallStrokePoint]

    /// Cascade path on the home plate. Prior seed + ~1" right on iPad
    /// (Evan 2026-09-27 evening).
    static func homeSeed() -> World2WaterfallStroke {
        World2WaterfallStroke(
            sceneID: "scene.home",
            points: [
                .init(x: 0.280, y: 0.36, halfWidth: 0.018),
                .init(x: 0.288, y: 0.50, halfWidth: 0.020),
                .init(x: 0.298, y: 0.64, halfWidth: 0.022),
                .init(x: 0.310, y: 0.78, halfWidth: 0.024),
                .init(x: 0.320, y: 0.92, halfWidth: 0.028),
            ]
        )
    }

    var isEmpty: Bool { points.count < 2 }

    /// Sample position + half-width along the polyline (t in 0…1).
    func sample(at t: Double) -> (x: Double, y: Double, halfWidth: Double)? {
        guard points.count >= 2 else { return nil }
        let clamped = min(1, max(0, t))
        if points.count == 2 {
            let a = points[0], b = points[1]
            return (
                a.x + (b.x - a.x) * clamped,
                a.y + (b.y - a.y) * clamped,
                a.halfWidth + (b.halfWidth - a.halfWidth) * clamped
            )
        }
        // Arc-length parameterization for even droplet spacing.
        var lengths: [Double] = [0]
        var total = 0.0
        for i in 1..<points.count {
            let dx = points[i].x - points[i - 1].x
            let dy = points[i].y - points[i - 1].y
            total += (dx * dx + dy * dy).squareRoot()
            lengths.append(total)
        }
        guard total > 1e-6 else {
            let p = points[0]
            return (p.x, p.y, p.halfWidth)
        }
        let target = clamped * total
        var i = 1
        while i < lengths.count, lengths[i] < target { i += 1 }
        let i1 = min(i, points.count - 1)
        let i0 = max(0, i1 - 1)
        let seg = max(1e-6, lengths[i1] - lengths[i0])
        let u = (target - lengths[i0]) / seg
        let a = points[i0], b = points[i1]
        return (
            a.x + (b.x - a.x) * u,
            a.y + (b.y - a.y) * u,
            a.halfWidth + (b.halfWidth - a.halfWidth) * u
        )
    }
}

@MainActor
final class World2WaterfallStrokeStore: ObservableObject {
    static let shared = World2WaterfallStrokeStore()

    @Published private(set) var strokeByScene: [String: World2WaterfallStroke] = [:]

    /// Bump when the authored home seed moves so devices drop stale strokes.
    private let defaultsKey = "world2.ambient.waterfallStroke.v3"

    private init() {
        load()
        if strokeByScene["scene.home"] == nil {
            strokeByScene["scene.home"] = .homeSeed()
            persist()
        }
    }

    func stroke(for sceneID: String) -> World2WaterfallStroke {
        if let existing = strokeByScene[sceneID], !existing.isEmpty {
            return existing
        }
        if sceneID == "scene.home" || sceneID == WorldId.home.sceneID {
            return .homeSeed()
        }
        return World2WaterfallStroke(sceneID: sceneID, points: [])
    }

    func setPoints(_ points: [World2WaterfallStrokePoint], for sceneID: String) {
        var next = points.sorted { $0.y < $1.y }
        if next.count > 12 { next = Array(next.prefix(12)) }
        strokeByScene[sceneID] = World2WaterfallStroke(sceneID: sceneID, points: next)
        persist()
    }

    func updatePoint(_ point: World2WaterfallStrokePoint, for sceneID: String) {
        var stroke = self.stroke(for: sceneID)
        if let idx = stroke.points.firstIndex(where: { $0.id == point.id }) {
            stroke.points[idx] = point
            stroke.points.sort { $0.y < $1.y }
            strokeByScene[sceneID] = stroke
            persist()
        }
    }

    func addPoint(at normalized: CGPoint, for sceneID: String) {
        var stroke = self.stroke(for: sceneID)
        stroke.points.append(
            World2WaterfallStrokePoint(x: normalized.x, y: normalized.y, halfWidth: 0.022)
        )
        stroke.points.sort { $0.y < $1.y }
        strokeByScene[sceneID] = stroke
        persist()
    }

    func removePoint(id: String, for sceneID: String) {
        var stroke = self.stroke(for: sceneID)
        stroke.points.removeAll { $0.id == id }
        strokeByScene[sceneID] = stroke
        persist()
    }

    func resetToSeed(for sceneID: String) {
        if sceneID == "scene.home" || sceneID == WorldId.home.sceneID {
            strokeByScene["scene.home"] = .homeSeed()
        } else {
            strokeByScene[sceneID] = World2WaterfallStroke(sceneID: sceneID, points: [])
        }
        persist()
    }

    func clear(for sceneID: String) {
        strokeByScene[sceneID] = World2WaterfallStroke(sceneID: sceneID, points: [])
        persist()
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: defaultsKey),
              let decoded = try? JSONDecoder().decode([String: World2WaterfallStroke].self, from: data)
        else { return }
        strokeByScene = decoded
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(strokeByScene) else { return }
        UserDefaults.standard.set(data, forKey: defaultsKey)
    }
}
