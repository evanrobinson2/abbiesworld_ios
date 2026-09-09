//
//  IncredimachineModels.swift
//  abbies.world.ios
//
//  Whizbang / Incredimachine — gadget launcher + ragdoll flyer.
//

import Foundation
import UIKit
import SwiftUI

enum IncredimachinePhase: Equatable {
    case setup
    case flying
    case landed
}

struct MachineSettings: Equatable {
    /// 0...1 maps to 20°...80° from the floor.
    var angle: Double = 0.55
    /// 0...1 launch spring.
    var power: Double = 0.7
    /// 0...1 ragdoll tumble.
    var spin: Double = 0.35
    var fanOn = false
    var bounceOn = true
    var balloonOn = false

    var launchDegrees: Double {
        20 + angle * 60
    }

    var launchRadians: Double {
        launchDegrees * .pi / 180
    }
}

struct NormalizedRect: Equatable, Codable {
    var x: Double
    var y: Double
    var w: Double
    var h: Double

    static let topCenterHead = NormalizedRect(x: 0.22, y: 0.02, w: 0.56, h: 0.44)

    var cgRect: CGRect {
        CGRect(x: x, y: y, width: w, height: h)
    }

    func clamped() -> NormalizedRect {
        let x = min(max(self.x, 0), 0.95)
        let y = min(max(self.y, 0), 0.95)
        let w = min(max(self.w, 0.08), 1 - x)
        let h = min(max(self.h, 0.08), 1 - y)
        return NormalizedRect(x: x, y: y, w: w, h: h)
    }
}

struct FlyerHead: Identifiable, Equatable {
    let id: String
    let name: String
    let image: UIImage
    let source: HeadSource
}

enum HeadSource: String, Equatable {
    case bundled
    case extracted
    case drawn
}

enum HeadDAGNode: String {
    case loadSource
    case reasonHeadBox
    case cropHead
    case drawHead
}

enum DoodleHead: String, CaseIterable, Identifiable {
    case boo
    case snack
    case pip
    case bean

    var id: String { rawValue }

    var title: String {
        switch self {
        case .boo: return "Boo"
        case .snack: return "Snack"
        case .pip: return "Pip"
        case .bean: return "Bean"
        }
    }

    var fill: UIColor {
        switch self {
        case .boo: return UIColor(red: 0.62, green: 0.42, blue: 0.92, alpha: 1)
        case .snack: return UIColor(red: 0.28, green: 0.62, blue: 0.38, alpha: 1)
        case .pip: return UIColor(red: 0.42, green: 0.32, blue: 0.72, alpha: 1)
        case .bean: return UIColor(red: 0.92, green: 0.48, blue: 0.22, alpha: 1)
        }
    }
}

enum DoodleHeadFactory {
    static func image(for doodle: DoodleHead, size: CGFloat = 256) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size))
        return renderer.image { ctx in
            let rect = CGRect(x: size * 0.08, y: size * 0.08, width: size * 0.84, height: size * 0.84)
            doodle.fill.setFill()
            UIColor.white.setStroke()
            let path = UIBezierPath(ovalIn: rect)
            path.lineWidth = size * 0.04
            path.fill()
            path.stroke()

            UIColor.white.setFill()
            UIBezierPath(ovalIn: CGRect(x: size * 0.28, y: size * 0.32, width: size * 0.16, height: size * 0.2)).fill()
            UIBezierPath(ovalIn: CGRect(x: size * 0.56, y: size * 0.32, width: size * 0.16, height: size * 0.2)).fill()

            UIColor.black.setFill()
            UIBezierPath(ovalIn: CGRect(x: size * 0.32, y: size * 0.38, width: size * 0.08, height: size * 0.1)).fill()
            UIBezierPath(ovalIn: CGRect(x: size * 0.60, y: size * 0.38, width: size * 0.08, height: size * 0.1)).fill()

            let smile = UIBezierPath()
            smile.move(to: CGPoint(x: size * 0.34, y: size * 0.64))
            smile.addQuadCurve(
                to: CGPoint(x: size * 0.66, y: size * 0.64),
                controlPoint: CGPoint(x: size * 0.5, y: size * 0.78)
            )
            UIColor.black.setStroke()
            smile.lineWidth = size * 0.045
            smile.lineCapStyle = .round
            smile.stroke()
        }
    }
}

enum PhysicsCategory {
    static let ragdoll: UInt32 = 1
    static let world: UInt32 = 2
    static let gadget: UInt32 = 4
    static let bed: UInt32 = 8
    static let balloon: UInt32 = 16
}
