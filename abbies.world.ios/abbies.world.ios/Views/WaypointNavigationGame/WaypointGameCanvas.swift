//
//  WaypointGameCanvas.swift
//  My First Swift
//
//  Created for Waypoint Navigation Minigame
//

import SwiftUI
import SpriteKit
import UIKit

struct WaypointGameCanvas: UIViewRepresentable {
    @ObservedObject var viewModel: WaypointGameViewModel
    
    func makeUIView(context: Context) -> SKView {
        let view = SKView()
        view.preferredFramesPerSecond = 60
        view.ignoresSiblingOrder = true
        
        let scene = WaypointGameScene(viewModel: viewModel)
        scene.scaleMode = .aspectFit
        scene.backgroundColor = .clear
        
        view.presentScene(scene)
        
        return view
    }
    
    func updateUIView(_ uiView: SKView, context: Context) {
        // Update scene if needed
    }
}

class WaypointGameScene: SKScene {
    weak var gameViewModel: WaypointGameViewModel?
    
    private var buggyNode: SKSpriteNode?
    private var moonbaseNode: SKSpriteNode?
    private var waypointNodes: [SKShapeNode] = []
    private var pathNode: SKShapeNode?
    
    init(viewModel: WaypointGameViewModel) {
        self.gameViewModel = viewModel
        super.init(size: CGSize(width: 860, height: 500))
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func didMove(to view: SKView) {
        setupScene()
    }
    
    private func setupScene() {
        // Draw stars background
        drawStars()
        
        // Setup path node
        pathNode = SKShapeNode()
        pathNode?.strokeColor = .green
        pathNode?.lineWidth = 3
        pathNode?.lineCap = .round
        pathNode?.lineJoin = .round
        pathNode?.zPosition = 1
        addChild(pathNode!)
        
        // Setup waypoint nodes
        updateWaypoints()
        
        // Setup buggy
        updateBuggy()
        
        // Setup moonbase
        updateMoonbase()
    }
    
    private func drawStars() {
        for i in 0..<50 {
            let x = CGFloat((i * 137) % Int(size.width))
            let y = CGFloat((i * 211) % Int(size.height))
            
            let star = SKShapeNode(circleOfRadius: 0.5)
            star.fillColor = .white
            star.strokeColor = .white
            star.position = CGPoint(x: x, y: y)
            star.zPosition = 0
            addChild(star)
        }
    }
    
    override func update(_ currentTime: TimeInterval) {
        updateWaypoints()
        updateBuggy()
        updatePath()
    }
    
    private func updateWaypoints() {
        guard let viewModel = gameViewModel else { return }
        
        // Remove old waypoint nodes
        waypointNodes.forEach { $0.removeFromParent() }
        waypointNodes.removeAll()
        
        // Create waypoint nodes
        for waypoint in viewModel.gameState.waypoints {
            let node = SKShapeNode(circleOfRadius: waypoint.size)
            
            // Set color based on state
            switch waypoint.state {
            case .unknown:
                node.fillColor = UIColor(red: 0, green: 200/255, blue: 1, alpha: 0.5)
                node.strokeColor = UIColor(red: 0, green: 1, blue: 1, alpha: 1)
            case .good:
                node.fillColor = .green
                node.strokeColor = .green
            case .bad:
                node.fillColor = .red
                node.strokeColor = .red
            }
            
            node.lineWidth = 2
            node.position = waypoint.position
            node.zPosition = 2
            node.name = "waypoint_\(waypoint.id)"
            
            // Add label if present
            if let label = waypoint.label {
                let labelNode = SKLabelNode(text: label)
                labelNode.fontName = "Arial-BoldMT"
                labelNode.fontSize = 12
                labelNode.fontColor = waypoint.state == .unknown ? .black : .white
                labelNode.verticalAlignmentMode = .center
                labelNode.zPosition = 3
                node.addChild(labelNode)
            }
            
            addChild(node)
            waypointNodes.append(node)
        }
    }
    
    private func updateBuggy() {
        guard let viewModel = gameViewModel else { return }
        
        // Remove old buggy node
        buggyNode?.removeFromParent()
        
        guard let buggyImage = viewModel.gameState.buggyImage else { return }
        
        let texture = SKTexture(image: buggyImage)
        buggyNode = SKSpriteNode(texture: texture)
        
        // Apply pulse animation
        let baseScale: CGFloat = 0.08
        let pulseScale = baseScale * (1 + viewModel.gameState.buggyPulse)
        buggyNode?.setScale(pulseScale)
        
        buggyNode?.position = viewModel.gameState.buggyPosition
        buggyNode?.zPosition = 4
        
        // Add glow effect
        let glowSize = CGSize(width: 20 * (1 + viewModel.gameState.buggyPulse * 0.5),
                             height: 12 * (1 + viewModel.gameState.buggyPulse * 0.5))
        let glow = SKShapeNode(ellipseOf: glowSize)
        glow.fillColor = .green
        glow.alpha = 0.3
        glow.position = CGPoint(x: 0, y: 5)
        glow.zPosition = -1
        buggyNode?.addChild(glow)
        
        // Inner glow
        let innerGlow = SKShapeNode(ellipseOf: CGSize(width: 15 * (1 + viewModel.gameState.buggyPulse * 0.5),
                                                      height: 8 * (1 + viewModel.gameState.buggyPulse * 0.5)))
        innerGlow.fillColor = .green
        innerGlow.alpha = 0.6
        innerGlow.position = CGPoint(x: 0, y: 5)
        innerGlow.zPosition = -1
        buggyNode?.addChild(innerGlow)
        
        addChild(buggyNode!)
    }
    
    private func updateMoonbase() {
        guard let viewModel = gameViewModel else { return }
        
        // Remove old moonbase node
        moonbaseNode?.removeFromParent()
        
        guard let moonbaseImage = viewModel.gameState.moonbaseImage else { return }
        
        let texture = SKTexture(image: moonbaseImage)
        moonbaseNode = SKSpriteNode(texture: texture)
        moonbaseNode?.setScale(0.08)
        moonbaseNode?.position = CGPoint(x: size.width - moonbaseNode!.size.width/2 - 5,
                                         y: size.height - moonbaseNode!.size.height/2 - 5)
        moonbaseNode?.zPosition = 2
        addChild(moonbaseNode!)
    }
    
    private func updatePath() {
        guard let viewModel = gameViewModel else { return }
        
        let clickedGoodWaypoints = viewModel.gameState.waypoints
            .filter { $0.isClicked && $0.isTraversable }
            .sorted { $0.index < $1.index }
        
        guard clickedGoodWaypoints.count > 1 else {
            pathNode?.path = nil
            return
        }
        
        let path = CGMutablePath()
        path.move(to: clickedGoodWaypoints[0].position)
        
        for i in 1..<clickedGoodWaypoints.count {
            path.addLine(to: clickedGoodWaypoints[i].position)
        }
        
        pathNode?.path = path
        pathNode?.strokeColor = .green
        pathNode?.lineWidth = 3
        pathNode?.lineCap = .round
        pathNode?.lineJoin = .round
        
        // Create dashed line effect (approximate with multiple short segments)
        // For now, use solid line - can enhance later with custom shader
    }
    
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let location = touch.location(in: self)
        
        // Convert to game coordinates
        gameViewModel?.handleWaypointClick(at: location, canvasSize: size)
    }
}

