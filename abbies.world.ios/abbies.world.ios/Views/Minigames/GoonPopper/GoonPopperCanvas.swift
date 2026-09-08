//
//  GoonPopperCanvas.swift
//  abbies.world.ios
//
//  Responsive SpriteKit canvas for the Balloon Pop minigame.
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
        scene.scaleMode = .resizeFill
        view.presentScene(scene)
        return view
    }
    
    func updateUIView(_ uiView: SKView, context: Context) {
        (uiView.scene as? GoonPopperScene)?.refreshBackgroundIfNeeded()
    }
}

private final class BalloonNode: SKNode {
    let balloonIndex: Int
    let balloonColor: SKColor
    var isPopped = false
    
    init(index: Int, size: CGSize, color: SKColor) {
        balloonIndex = index
        balloonColor = color
        super.init()
        name = "balloon_\(index)"
        
        let body = SKShapeNode(ellipseOf: size)
        body.fillColor = color
        body.strokeColor = color.withAlphaComponent(0.85)
        body.lineWidth = max(3, size.width * 0.04)
        addChild(body)
        
        let highlight = SKShapeNode(
            ellipseOf: CGSize(width: size.width * 0.18, height: size.height * 0.25)
        )
        highlight.fillColor = .white.withAlphaComponent(0.7)
        highlight.strokeColor = .clear
        highlight.position = CGPoint(x: -size.width * 0.2, y: size.height * 0.2)
        body.addChild(highlight)
        
        let knotPath = CGMutablePath()
        knotPath.move(to: CGPoint(x: 0, y: -size.height * 0.48))
        knotPath.addLine(to: CGPoint(x: -size.width * 0.09, y: -size.height * 0.62))
        knotPath.addLine(to: CGPoint(x: size.width * 0.09, y: -size.height * 0.62))
        knotPath.closeSubpath()
        let knot = SKShapeNode(path: knotPath)
        knot.fillColor = color
        knot.strokeColor = color
        addChild(knot)
        
        let stringPath = CGMutablePath()
        stringPath.move(to: CGPoint(x: 0, y: -size.height * 0.61))
        stringPath.addCurve(
            to: CGPoint(x: size.width * 0.08, y: -size.height * 1.05),
            control1: CGPoint(x: -size.width * 0.12, y: -size.height * 0.75),
            control2: CGPoint(x: size.width * 0.16, y: -size.height * 0.9)
        )
        let string = SKShapeNode(path: stringPath)
        string.strokeColor = .white.withAlphaComponent(0.9)
        string.lineWidth = max(2, size.width * 0.025)
        addChild(string)
        
        physicsBody = SKPhysicsBody(circleOfRadius: min(size.width, size.height) * 0.46)
        physicsBody?.affectedByGravity = false
        physicsBody?.restitution = 1
        physicsBody?.friction = 0
        physicsBody?.linearDamping = 0
        physicsBody?.angularDamping = 0
        physicsBody?.allowsRotation = false
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

private final class BombNode: SKNode {
    var hasExploded = false
    
    init(index: Int, diameter: CGFloat) {
        super.init()
        name = "bomb_\(index)"
        
        let bomb = SKShapeNode(circleOfRadius: diameter / 2)
        bomb.fillColor = SKColor(white: 0.08, alpha: 1)
        bomb.strokeColor = .white
        bomb.lineWidth = max(3, diameter * 0.055)
        addChild(bomb)
        
        let shine = SKShapeNode(circleOfRadius: diameter * 0.1)
        shine.fillColor = .white.withAlphaComponent(0.7)
        shine.strokeColor = .clear
        shine.position = CGPoint(x: -diameter * 0.17, y: diameter * 0.17)
        bomb.addChild(shine)
        
        let fusePath = CGMutablePath()
        fusePath.move(to: CGPoint(x: diameter * 0.17, y: diameter * 0.43))
        fusePath.addCurve(
            to: CGPoint(x: diameter * 0.42, y: diameter * 0.68),
            control1: CGPoint(x: diameter * 0.15, y: diameter * 0.62),
            control2: CGPoint(x: diameter * 0.35, y: diameter * 0.54)
        )
        let fuse = SKShapeNode(path: fusePath)
        fuse.strokeColor = .systemOrange
        fuse.lineWidth = max(4, diameter * 0.07)
        fuse.lineCap = .round
        addChild(fuse)
        
        let spark = SKLabelNode(text: "✦")
        spark.fontName = "AvenirNext-Heavy"
        spark.fontSize = diameter * 0.42
        spark.fontColor = .systemYellow
        spark.position = CGPoint(x: diameter * 0.44, y: diameter * 0.52)
        spark.verticalAlignmentMode = .center
        addChild(spark)
        spark.run(.repeatForever(.sequence([
            .scale(to: 1.25, duration: 0.18),
            .scale(to: 0.75, duration: 0.18)
        ])))
        
        physicsBody = SKPhysicsBody(circleOfRadius: diameter * 0.48)
        physicsBody?.affectedByGravity = false
        physicsBody?.restitution = 1
        physicsBody?.friction = 0
        physicsBody?.linearDamping = 0
        physicsBody?.allowsRotation = false
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

final class GoonPopperScene: SKScene {
    private weak var gameViewModel: GoonPopperViewModel?
    private var backgroundNode: SKSpriteNode?
    private var balloonNodes: [BalloonNode] = []
    private var bombNodes: [BombNode] = []
    private var celebrationLayer: SKNode?
    private var replayButton: SKShapeNode?
    private var hasSetUpScene = false
    
    private let balloonColors: [SKColor] = [
        .systemPink, .systemRed, .systemOrange, .systemYellow,
        .systemGreen, .systemTeal, .systemBlue, .systemPurple
    ]
    
    init(viewModel: GoonPopperViewModel) {
        gameViewModel = viewModel
        super.init(size: CGSize(width: 1000, height: 700))
        backgroundColor = SKColor(red: 0.35, green: 0.82, blue: 0.93, alpha: 1)
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func didMove(to view: SKView) {
        hasSetUpScene = true
        configureBounds()
        refreshBackgroundIfNeeded()
        spawnBalloons()
        runAutomatedTestIfRequested()
    }
    
    override func didChangeSize(_ oldSize: CGSize) {
        super.didChangeSize(oldSize)
        guard hasSetUpScene, size.width > 0, size.height > 0 else { return }
        configureBounds()
        fitBackground()
        keepBalloonsOnScreen()
    }
    
    private func configureBounds() {
        physicsBody = SKPhysicsBody(edgeLoopFrom: frame.insetBy(dx: 6, dy: 6))
        physicsBody?.isDynamic = false
        physicsBody?.friction = 0
        physicsBody?.restitution = 1
    }
    
    func refreshBackgroundIfNeeded() {
        guard backgroundNode == nil,
              let image = gameViewModel?.gameState.backgroundImage else {
            return
        }
        
        let node = SKSpriteNode(texture: SKTexture(image: image))
        node.position = CGPoint(x: size.width / 2, y: size.height / 2)
        node.zPosition = -100
        backgroundNode = node
        addChild(node)
        fitBackground()
    }
    
    private func fitBackground() {
        guard let backgroundNode,
              let textureSize = backgroundNode.texture?.size(),
              textureSize.width > 0,
              textureSize.height > 0 else {
            return
        }
        
        let scale = max(size.width / textureSize.width, size.height / textureSize.height)
        backgroundNode.size = CGSize(
            width: textureSize.width * scale,
            height: textureSize.height * scale
        )
        backgroundNode.position = CGPoint(x: size.width / 2, y: size.height / 2)
    }
    
    private func spawnBalloons() {
        balloonNodes.forEach { $0.removeFromParent() }
        balloonNodes.removeAll()
        bombNodes.forEach { $0.removeFromParent() }
        bombNodes.removeAll()
        
        let count = gameViewModel?.gameState.totalGoons ?? 13
        let shortSide = min(size.width, size.height)
        let balloonWidth = min(105, max(58, shortSide * 0.12))
        let balloonSize = CGSize(width: balloonWidth, height: balloonWidth * 1.18)
        let horizontalMargin = balloonSize.width * 0.7
        let verticalMargin = balloonSize.height * 0.85
        
        for index in 0..<count {
            let balloon = BalloonNode(
                index: index,
                size: balloonSize,
                color: balloonColors[index % balloonColors.count]
            )
            balloon.position = CGPoint(
                x: CGFloat.random(in: horizontalMargin...max(horizontalMargin, size.width - horizontalMargin)),
                y: CGFloat.random(in: verticalMargin...max(verticalMargin, size.height - verticalMargin))
            )
            balloon.zPosition = 10 + CGFloat(index)
            
            let horizontalSpeed = CGFloat.random(in: 55...125) * (Bool.random() ? 1 : -1)
            let verticalSpeed = CGFloat.random(in: 45...105) * (Bool.random() ? 1 : -1)
            balloon.physicsBody?.velocity = CGVector(dx: horizontalSpeed, dy: verticalSpeed)
            
            balloonNodes.append(balloon)
            addChild(balloon)
        }
        
        let bombDiameter = balloonWidth * 0.72
        for index in 0..<3 {
            let bomb = BombNode(index: index, diameter: bombDiameter)
            bomb.position = CGPoint(
                x: CGFloat.random(in: horizontalMargin...max(horizontalMargin, size.width - horizontalMargin)),
                y: CGFloat.random(in: verticalMargin...max(verticalMargin, size.height - verticalMargin))
            )
            bomb.zPosition = 50 + CGFloat(index)
            bomb.physicsBody?.velocity = CGVector(
                dx: CGFloat.random(in: 70...135) * (Bool.random() ? 1 : -1),
                dy: CGFloat.random(in: 55...115) * (Bool.random() ? 1 : -1)
            )
            bombNodes.append(bomb)
            addChild(bomb)
        }
    }
    
    private func keepBalloonsOnScreen() {
        let margin = min(size.width, size.height) * 0.08
        for balloon in balloonNodes where !balloon.isPopped {
            balloon.position = CGPoint(
                x: min(max(balloon.position.x, margin), max(margin, size.width - margin)),
                y: min(max(balloon.position.y, margin), max(margin, size.height - margin))
            )
        }
        for bomb in bombNodes where !bomb.hasExploded {
            bomb.position = CGPoint(
                x: min(max(bomb.position.x, margin), max(margin, size.width - margin)),
                y: min(max(bomb.position.y, margin), max(margin, size.height - margin))
            )
        }
    }
    
    private func runAutomatedTestIfRequested() {
        guard ProcessInfo.processInfo.arguments.contains("-autoPlayBalloonPop") else {
            return
        }
        
        gameViewModel?.startGame()
        for (index, balloon) in balloonNodes.enumerated() {
            run(.sequence([
                .wait(forDuration: 0.12 * Double(index + 1)),
                .run { [weak self, weak balloon] in
                    guard let self, let balloon else { return }
                    self.pop(balloon)
                }
            ]))
        }
    }
    
    override func update(_ currentTime: TimeInterval) {
        refreshBackgroundIfNeeded()
        
        if gameViewModel?.gameState.gameOver == true, celebrationLayer == nil {
            showCelebration()
        }
    }
    
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let location = touch.location(in: self)
        
        if gameViewModel?.gameState.gameOver == true {
            if let replayButton,
               let buttonParent = replayButton.parent,
               replayButton.contains(convert(location, to: buttonParent)) {
                restartGame()
            }
            return
        }
        
        if let bomb = bombNodes.reversed().first(where: {
            !$0.hasExploded && $0.contains(location)
        }) {
            if gameViewModel?.gameState.gameStarted != true {
                gameViewModel?.startGame()
            }
            explode(bomb)
            return
        }
        
        guard let balloon = balloonNodes.reversed().first(where: {
            !$0.isPopped && $0.contains(location)
        }) else {
            return
        }
        
        if gameViewModel?.gameState.gameStarted != true {
            gameViewModel?.startGame()
        }
        pop(balloon)
    }
    
    private func pop(_ balloon: BalloonNode) {
        guard !balloon.isPopped else { return }
        balloon.isPopped = true
        balloon.physicsBody = nil
        
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        emitConfetti(at: balloon.position, color: balloon.balloonColor)
        
        balloon.run(
            .sequence([
                .group([
                    .scale(to: 1.35, duration: 0.08),
                    .fadeOut(withDuration: 0.14),
                    .rotate(byAngle: .pi / 5, duration: 0.14)
                ]),
                .removeFromParent()
            ])
        )
        gameViewModel?.popGoon()
    }
    
    private func explode(_ bomb: BombNode) {
        guard !bomb.hasExploded else { return }
        bomb.hasExploded = true
        bomb.physicsBody = nil
        
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        emitConfetti(at: bomb.position, color: .systemRed)
        
        let blast = SKShapeNode(circleOfRadius: 18)
        blast.fillColor = .systemOrange
        blast.strokeColor = .systemYellow
        blast.lineWidth = 8
        blast.position = bomb.position
        blast.zPosition = 90
        addChild(blast)
        blast.run(.sequence([
            .group([
                .scale(to: 5, duration: 0.22),
                .fadeOut(withDuration: 0.22)
            ]),
            .removeFromParent()
        ]))
        
        bomb.run(.sequence([
            .group([
                .scale(to: 1.8, duration: 0.12),
                .fadeOut(withDuration: 0.18),
                .rotate(byAngle: .pi, duration: 0.18)
            ]),
            .removeFromParent()
        ]))
        gameViewModel?.hitBomb()
    }
    
    private func emitConfetti(at position: CGPoint, color: SKColor) {
        for index in 0..<10 {
            let piece = SKShapeNode(circleOfRadius: CGFloat.random(in: 3...7))
            piece.fillColor = index.isMultiple(of: 2) ? color : .white
            piece.strokeColor = .clear
            piece.position = position
            piece.zPosition = 80
            addChild(piece)
            
            let angle = CGFloat(index) / 10 * (.pi * 2)
            let distance = CGFloat.random(in: 45...100)
            piece.run(
                .sequence([
                    .group([
                        .moveBy(
                            x: cos(angle) * distance,
                            y: sin(angle) * distance,
                            duration: 0.35
                        ),
                        .fadeOut(withDuration: 0.35),
                        .scale(to: 0.2, duration: 0.35)
                    ]),
                    .removeFromParent()
                ])
            )
        }
    }
    
    private func showCelebration() {
        let layer = SKNode()
        layer.zPosition = 200
        
        let panelSize = CGSize(
            width: min(480, size.width * 0.72),
            height: min(260, size.height * 0.52)
        )
        let panel = SKShapeNode(rectOf: panelSize, cornerRadius: 28)
        panel.fillColor = SKColor.black.withAlphaComponent(0.78)
        panel.strokeColor = .white
        panel.lineWidth = 5
        panel.position = CGPoint(x: size.width / 2, y: size.height / 2)
        layer.addChild(panel)
        
        let title = SKLabelNode(text: "YOU POPPED THEM ALL!")
        title.fontName = "AvenirNext-Heavy"
        title.fontSize = min(38, panelSize.width * 0.075)
        title.fontColor = .systemYellow
        title.verticalAlignmentMode = .center
        title.position = CGPoint(x: 0, y: panelSize.height * 0.22)
        panel.addChild(title)
        
        let score = SKLabelNode(text: "Score: \(gameViewModel?.gameState.score ?? 0)")
        score.fontName = "AvenirNext-Heavy"
        score.fontSize = min(30, panelSize.width * 0.06)
        score.fontColor = .white
        score.verticalAlignmentMode = .center
        score.position = CGPoint(x: 0, y: 8)
        panel.addChild(score)
        
        let time = SKLabelNode(text: gameViewModel?.gameState.formattedTime ?? "")
        time.fontName = "AvenirNext-Bold"
        time.fontSize = min(24, panelSize.width * 0.05)
        time.fontColor = .white.withAlphaComponent(0.85)
        time.verticalAlignmentMode = .center
        time.position = CGPoint(x: 0, y: -27)
        panel.addChild(time)
        
        let button = SKShapeNode(
            rectOf: CGSize(width: min(260, panelSize.width * 0.62), height: 64),
            cornerRadius: 22
        )
        button.fillColor = .systemPink
        button.strokeColor = .white
        button.lineWidth = 3
        button.position = CGPoint(x: 0, y: -panelSize.height * 0.33)
        panel.addChild(button)
        
        let buttonLabel = SKLabelNode(text: "PLAY AGAIN")
        buttonLabel.fontName = "AvenirNext-Heavy"
        buttonLabel.fontSize = 25
        buttonLabel.fontColor = .white
        buttonLabel.verticalAlignmentMode = .center
        button.addChild(buttonLabel)
        
        celebrationLayer = layer
        replayButton = button
        addChild(layer)
        
        panel.setScale(0.6)
        panel.alpha = 0
        panel.run(.group([
            .scale(to: 1, duration: 0.25),
            .fadeIn(withDuration: 0.2)
        ]))
    }
    
    private func restartGame() {
        celebrationLayer?.removeFromParent()
        celebrationLayer = nil
        replayButton = nil
        gameViewModel?.resetGame()
        spawnBalloons()
        gameViewModel?.startGame()
    }
}
