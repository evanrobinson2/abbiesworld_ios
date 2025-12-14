//
//  GoonPopperModels.swift
//  abbies.world.ios
//
//  Created for Goon Popper Minigame
//

import Foundation
import CoreGraphics
import UIKit
import SpriteKit
import Combine

// MARK: - Goon State

enum GoonState {
    case active      // Bouncing around
    case popped      // Falling down, stopped moving
}

// MARK: - Goon Model

class GoonNode: SKSpriteNode {
    let goonIndex: Int
    var state: GoonState = .active
    var isMoving: Bool = true
    
    init(texture: SKTexture, goonIndex: Int) {
        self.goonIndex = goonIndex
        super.init(texture: texture, color: .white, size: texture.size())
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

// MARK: - Game State

class GoonPopperGameState: ObservableObject {
    @Published var gameStarted: Bool = false
    @Published var gameOver: Bool = false
    @Published var elapsedTime: TimeInterval = 0
    @Published var startTime: Date?
    @Published var goonsPopped: Int = 0
    @Published var totalGoons: Int = 13
    
    // Asset images
    @Published var backgroundImage: UIImage?
    @Published var goonImages: [UIImage] = []
    @Published var playButtonImage: UIImage?
    
    // Selected background index (1-3)
    @Published var selectedBackgroundIndex: Int = 1
    
    // Computed properties
    var allGoonsPopped: Bool {
        goonsPopped >= totalGoons
    }
    
    var formattedTime: String {
        let minutes = Int(elapsedTime) / 60
        let seconds = Int(elapsedTime) % 60
        let milliseconds = Int((elapsedTime.truncatingRemainder(dividingBy: 1)) * 1000)
        return String(format: "%02d:%02d.%03d", minutes, seconds, milliseconds)
    }
}
