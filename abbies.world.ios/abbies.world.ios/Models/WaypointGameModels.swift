//
//  WaypointGameModels.swift
//  My First Swift
//
//  Created for Waypoint Navigation Minigame
//

import Foundation
import CoreGraphics
import UIKit
import Combine

// MARK: - Waypoint State

enum WaypointState {
    case unknown
    case good
    case bad
}

// MARK: - Waypoint Model

struct Waypoint: Identifiable {
    let id: Int
    var position: CGPoint
    var size: CGFloat
    var label: String?
    var isTraversable: Bool
    var isClicked: Bool
    var state: WaypointState
    var index: Int
    
    init(id: Int, position: CGPoint, size: CGFloat, label: String? = nil, isTraversable: Bool, index: Int) {
        self.id = id
        self.position = position
        self.size = size
        self.label = label
        self.isTraversable = isTraversable
        self.isClicked = false
        self.state = .unknown
        self.index = index
    }
}

// MARK: - Victory Phase

enum VictoryPhase {
    case initialImage
    case cutscene
    case polaroidEntrance
    case carousel
    case gridView
    case finalCover
}

// MARK: - Game State

class WaypointGameState: ObservableObject {
    @Published var waypoints: [Waypoint] = []
    @Published var buggyPosition: CGPoint = CGPoint(x: 50, y: 450)
    @Published var gameComplete: Bool = false
    @Published var clickedGoodNodes: Int = 0
    @Published var totalGoodNodes: Int = 0
    @Published var goodNodesOrder: [Int] = []
    @Published var currentGoodNodeIndex: Int = 0
    @Published var buggyPulse: CGFloat = 0.0
    @Published var buggyPulseDirection: CGFloat = 1.0
    @Published var screenShake: Bool = false
    @Published var statusMessage: String = "Click any waypoint to begin discovering the safe path!"
    
    // Asset URLs (loaded from server)
    var buggyImage: UIImage?
    var moonbaseImage: UIImage?
    var destinationBannerImage: UIImage?
    var victoryImage: UIImage?
    var cutsceneImage: UIImage?
    var coverImage: UIImage?
    var polaroidImages: [UIImage] = []
    
    // Victory state
    @Published var victoryPhase: VictoryPhase = .initialImage
    @Published var currentPolaroidIndex: Int = 0
    @Published var polaroidClicks: Int = 0
    @Published var isGridView: Bool = false
}

// MARK: - Default Waypoint Configuration

extension WaypointGameState {
    static func defaultWaypoints() -> [Waypoint] {
        return [
            // Safe waypoints (traversable) - must be clicked in order
            Waypoint(id: 0, position: CGPoint(x: 100, y: 400), size: 25, label: "START", isTraversable: true, index: 0),
            Waypoint(id: 1, position: CGPoint(x: 200, y: 350), size: 20, isTraversable: true, index: 1),
            Waypoint(id: 3, position: CGPoint(x: 380, y: 250), size: 20, isTraversable: true, index: 3),
            Waypoint(id: 5, position: CGPoint(x: 350, y: 370), size: 20, isTraversable: true, index: 5),
            Waypoint(id: 6, position: CGPoint(x: 520, y: 220), size: 20, isTraversable: true, index: 6),
            Waypoint(id: 8, position: CGPoint(x: 680, y: 280), size: 20, isTraversable: true, index: 8),
            Waypoint(id: 10, position: CGPoint(x: 720, y: 140), size: 20, isTraversable: true, index: 10),
            Waypoint(id: 11, position: CGPoint(x: 760, y: 80), size: 25, label: "BASE", isTraversable: true, index: 11),
            
            // Unsafe waypoints (non-traversable) - can be clicked anytime
            Waypoint(id: 2, position: CGPoint(x: 280, y: 280), size: 20, isTraversable: false, index: 2),
            Waypoint(id: 4, position: CGPoint(x: 480, y: 320), size: 20, isTraversable: false, index: 4),
            Waypoint(id: 7, position: CGPoint(x: 620, y: 180), size: 20, isTraversable: false, index: 7),
            Waypoint(id: 9, position: CGPoint(x: 580, y: 380), size: 20, isTraversable: false, index: 9),
            Waypoint(id: 12, position: CGPoint(x: 150, y: 280), size: 20, isTraversable: false, index: 12),
            Waypoint(id: 13, position: CGPoint(x: 320, y: 430), size: 20, isTraversable: false, index: 13),
            Waypoint(id: 14, position: CGPoint(x: 450, y: 380), size: 20, isTraversable: false, index: 14),
            Waypoint(id: 15, position: CGPoint(x: 250, y: 150), size: 20, isTraversable: false, index: 15),
            Waypoint(id: 16, position: CGPoint(x: 620, y: 280), size: 20, isTraversable: false, index: 16),
            Waypoint(id: 17, position: CGPoint(x: 700, y: 380), size: 20, isTraversable: false, index: 17),
            Waypoint(id: 18, position: CGPoint(x: 350, y: 120), size: 20, isTraversable: false, index: 18),
        ]
    }
}

