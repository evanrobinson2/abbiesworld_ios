//
//  GoonPopperCanvas.swift
//  abbies.world.ios
//
//  Created for Goon Popper Minigame - SpriteKit Canvas
//

import SwiftUI
import SpriteKit
import UIKit

struct GoonPopperCanvas: UIViewRepresentable {
    @ObservedObject var viewModel: GoonPopperViewModel
    
    func makeUIView(context: Context) -> SKView {
        let view = SKView()
        view.preferredFramesPerSecond = 60
        view.ignoresSiblingOrder = true
        
        let scene = GoonPopperScene(viewModel: viewModel)
        scene.scaleMode = .aspectFit
        scene.backgroundColor = UIColor(hex: "#f0f0f0") ?? .gray
        
        view.presentScene(scene)
        
        return view
    }
    
    func updateUIView(_ uiView: SKView, context: Context) {
        // Update scene if needed
    }
}

class GoonPopperScene: SKScene {
    weak var gameViewModel: GoonPopperViewModel?
    
    private var backgroundNode: SKSpriteNode?
    private var goonNodes: [GoonNode] = []
    private var playButtonNode: SKSpriteNode?
    private var gameOverText: SKLabelNode?
    private var timerText: SKLabelNode?
    
    // Physics properties
    private let numGoons = 13
    private var goonsMoving: [Bool] = []
    
    init(viewModel: GoonPopperViewModel) {
        self.gameViewModel = viewModel
        super.init(size: CGSize(width: 1232, height: 928))
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func didMove(to view: SKView) {
        setupPhysics()
        setupScene()
    }
    
    private func setupPhysics() {
        physicsWorld.gravity = CGVector(dx: 0, dy: 0) // No gravity initially
        physicsBody = SKPhysicsBody(edgeLoopFrom: self.frame)
        physicsBody?.isDynamic = false
    }
    
    private func setupScene() {
        // Initialize goons moving array
        goonsMoving = Array(repeating: true, count: numGoons)
        
        // Setup background
        updateBackground()
        
        // Setup UI elements
        setupTimerText()
        setupGameOverText()
        setupPlayButton()
        
        // Setup goons when images are loaded
        if let viewModel = gameViewModel, !viewModel.gameState.goonImages.isEmpty {
            setupGoons()
        }
    }
    
    private func setupTimerText() {
        // Create outline effect using multiple label nodes
        let baseText = "Time: 00:00.000"
        let position = CGPoint(x: 100, y: size.height - 50)
        
        // Create black outline labels (behind)
        for offset in [(-2, -2), (-2, 2), (2, -2), (2, 2), (0, -2), (0, 2), (-2, 0), (2, 0)] {
            let outlineLabel = SKLabelNode(text: baseText)
            outlineLabel.fontName = "Arial-BoldMT"
            outlineLabel.fontSize = 36
            outlineLabel.fontColor = SKColor.black
            outlineLabel.position = CGPoint(x: position.x + CGFloat(offset.0), y: position.y + CGFloat(offset.1))
            outlineLabel.zPosition = 99
            addChild(outlineLabel)
        }
        
        // Create main white label (on top)
        timerText = SKLabelNode(text: baseText)
        timerText?.fontName = "Arial-BoldMT"
        timerText?.fontSize = 36
        timerText?.fontColor = .white
        timerText?.position = position
        timerText?.zPosition = 100
        
        addChild(timerText!)
    }
    
    private func setupGameOverText() {
        // Create outline effect using multiple label nodes
        let baseText = "GAME OVER!"
        let position = CGPoint(x: size.width / 2, y: size.height / 2)
        
        // Create black outline labels (behind)
        for offset in [(-2, -2), (-2, 2), (2, -2), (2, 2), (0, -2), (0, 2), (-2, 0), (2, 0)] {
            let outlineLabel = SKLabelNode(text: baseText)
            outlineLabel.fontName = "Arial-BoldMT"
            outlineLabel.fontSize = 36
            outlineLabel.fontColor = SKColor.black
            outlineLabel.position = CGPoint(x: position.x + CGFloat(offset.0), y: position.y + CGFloat(offset.1))
            outlineLabel.zPosition = 99
            outlineLabel.isHidden = true
            outlineLabel.name = "gameOverOutline"
            addChild(outlineLabel)
        }
        
        // Create main white label (on top)
        gameOverText = SKLabelNode(text: baseText)
        gameOverText?.fontName = "Arial-BoldMT"
        gameOverText?.fontSize = 36
        gameOverText?.fontColor = .white
        gameOverText?.position = position
        gameOverText?.zPosition = 100
        gameOverText?.isHidden = true
        
        addChild(gameOverText!)
    }
    
    private func setupPlayButton() {
        guard let playButtonImage = gameViewModel?.gameState.playButtonImage else {
            // Create placeholder if image not loaded
            playButtonNode = SKSpriteNode(color: .blue, size: CGSize(width: 100, height: 50))
            playButtonNode?.position = CGPoint(x: size.width / 2, y: size.height / 2 - 100)
            playButtonNode?.zPosition = 100
            playButtonNode?.isHidden = true
            playButtonNode?.name = "playButton"
            addChild(playButtonNode!)
            return
        }
        
        let texture = SKTexture(image: playButtonImage)
        playButtonNode = SKSpriteNode(texture: texture)
        playButtonNode?.setScale(0.5)
        playButtonNode?.position = CGPoint(x: size.width / 2, y: size.height / 2 - 100)
        playButtonNode?.zPosition = 100
        playButtonNode?.isHidden = true
        playButtonNode?.name = "playButton"
        addChild(playButtonNode!)
    }
    
    private func setupGoons() {
        // Remove existing goons
        goonNodes.forEach { $0.removeFromParent() }
        goonNodes.removeAll()
        
        guard let viewModel = gameViewModel else { return }
        guard !viewModel.gameState.goonImages.isEmpty else { return }
        
        // Create goon nodes
        for i in 0..<min(numGoons, viewModel.gameState.goonImages.count) {
            let goonImage = viewModel.gameState.goonImages[i]
            let texture = SKTexture(image: goonImage)
            let goon = GoonNode(texture: texture, goonIndex: i)
            
            // Set initial position (off-screen, staggered)
            goon.position = CGPoint(x: CGFloat(i * 150), y: size.height + 1000)
            goon.setScale(0.5)
            goon.zPosition = 10
            
            // Setup physics
            goon.physicsBody = SKPhysicsBody(texture: texture, size: goon.size)
            goon.physicsBody?.isDynamic = true
            goon.physicsBody?.restitution = CGFloat.random(in: 0.4...0.8) // Bounce
            goon.physicsBody?.friction = 0
            goon.physicsBody?.linearDamping = 0
            goon.physicsBody?.angularDamping = 0
            
            // Random velocity
            let velocityX = CGFloat.random(in: -200...200)
            let velocityY = CGFloat.random(in: 100...300)
            goon.physicsBody?.velocity = CGVector(dx: velocityX, dy: velocityY)
            
            // Random spin
            let spinDirection: CGFloat = Bool.random() ? 1 : -1
            goon.physicsBody?.angularVelocity = CGFloat.random(in: 100...300) * spinDirection
            
            goon.name = "goon_\(i)"
            goonNodes.append(goon)
            addChild(goon)
        }
    }
    
    private func updateBackground() {
        guard let viewModel = gameViewModel,
              let backgroundImage = viewModel.gameState.backgroundImage else {
            return
        }
        
        // Remove old background
        backgroundNode?.removeFromParent()
        
        let texture = SKTexture(image: backgroundImage)
        backgroundNode = SKSpriteNode(texture: texture)
        backgroundNode?.position = CGPoint(x: size.width / 2, y: size.height / 2)
        backgroundNode?.zPosition = 0
        addChild(backgroundNode!)
    }
    
    override func update(_ currentTime: TimeInterval) {
        guard let viewModel = gameViewModel else { return }
        
        // Update timer text
        if viewModel.gameState.gameStarted && !viewModel.gameState.gameOver {
            timerText?.text = "Time: \(viewModel.gameState.formattedTime)"
        }
        
        // Update background if it loads
        if backgroundNode == nil {
            updateBackground()
        }
        
        // Setup goons when images load
        if goonNodes.isEmpty && !viewModel.gameState.goonImages.isEmpty {
            setupGoons()
        }
        
        // Check if all goons are popped
        if viewModel.gameState.gameStarted && !viewModel.gameState.gameOver {
            let allPopped = goonNodes.allSatisfy { !$0.isMoving }
            if allPopped && viewModel.gameState.goonsPopped < viewModel.gameState.totalGoons {
                // All goons stopped moving
                viewModel.gameState.goonsPopped = viewModel.gameState.totalGoons
                viewModel.endGame()
            }
        }
        
        // Update game over UI
        if viewModel.gameState.gameOver {
            gameOverText?.isHidden = false
            playButtonNode?.isHidden = false
            // Show outline labels
            enumerateChildNodes(withName: "gameOverOutline") { node, _ in
                node.isHidden = false
            }
        } else {
            gameOverText?.isHidden = true
            playButtonNode?.isHidden = true
            // Hide outline labels
            enumerateChildNodes(withName: "gameOverOutline") { node, _ in
                node.isHidden = true
            }
        }
    }
    
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let location = touch.location(in: self)
        
        // Check if play button was tapped
        if let playButton = playButtonNode,
           playButton.contains(location),
           !playButton.isHidden {
            // Restart game
            restartGame()
            return
        }
        
        // Check if game is active
        guard let viewModel = gameViewModel else { return }
        
        if !viewModel.gameState.gameStarted || viewModel.gameState.gameOver {
            // Start game on first tap or restart
            viewModel.startGame()
            return
        }
        
        // Screen shake effect
        let shake = SKAction.sequence([
            SKAction.moveBy(x: -5, y: 0, duration: 0.05),
            SKAction.moveBy(x: 10, y: 0, duration: 0.05),
            SKAction.moveBy(x: -5, y: 0, duration: 0.05)
        ])
        camera?.run(shake)
        
        // Check if a goon was tapped
        for goon in goonNodes {
            if goon.contains(location) && goon.isMoving {
                popGoon(goon)
                break
            }
        }
    }
    
    private func popGoon(_ goon: GoonNode) {
        guard goon.isMoving else { return }
        
        // Mark as popped
        goon.isMoving = false
        goon.state = .popped
        
        // Make it fall down
        goon.physicsBody?.velocity = CGVector(dx: 0, dy: -200)
        goon.physicsBody?.applyImpulse(CGVector(dx: 0, dy: -1000))
        goon.physicsBody?.angularVelocity = 0
        
        // Update view model
        gameViewModel?.popGoon()
    }
    
    private func restartGame() {
        guard let viewModel = gameViewModel else { return }
        
        // Reset view model
        viewModel.resetGame()
        
        // Reset goons
        goonsMoving = Array(repeating: true, count: numGoons)
        for goon in goonNodes {
            goon.isMoving = true
            goon.state = .active
            
            // Reset position and physics
            goon.position = CGPoint(
                x: CGFloat.random(in: 100...(size.width - 100)),
                y: CGFloat.random(in: 100...(size.height - 100))
            )
            
            // Random velocity
            let velocityX = CGFloat.random(in: -200...200)
            let velocityY = CGFloat.random(in: 100...300)
            goon.physicsBody?.velocity = CGVector(dx: velocityX, dy: velocityY)
            
            // Random spin
            let spinDirection: CGFloat = Bool.random() ? 1 : -1
            goon.physicsBody?.angularVelocity = CGFloat.random(in: 100...300) * spinDirection
        }
        
        // Start new game
        viewModel.startGame()
    }
}

// MARK: - UIColor Extension

extension UIColor {
    convenience init?(hex: String) {
        var hex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hex.hasPrefix("#") {
            hex = String(hex.dropFirst())
        }
        
        var int: UInt64 = 0
        guard Scanner(string: hex).scanHexInt64(&int) else {
            return nil
        }
        
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            return nil
        }
        
        self.init(
            red: CGFloat(r) / 255,
            green: CGFloat(g) / 255,
            blue: CGFloat(b) / 255,
            alpha: CGFloat(a) / 255
        )
    }
}
