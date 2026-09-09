//
//  DinoPicnicCanvas.swift
//  abbies.world.ios
//

import SwiftUI
import SpriteKit
import UIKit

struct DinoPicnicCanvas: UIViewRepresentable {
    @ObservedObject var viewModel: DinoPicnicViewModel

    func makeUIView(context: Context) -> SKView {
        let view = SKView()
        view.preferredFramesPerSecond = 60
        view.ignoresSiblingOrder = true
        presentScene(in: view)
        return view
    }

    func updateUIView(_ uiView: SKView, context: Context) {
        if let scene = uiView.scene as? DinoPicnicScene,
           scene.roundID == viewModel.roundID {
            scene.setTrajectoryHintVisible(viewModel.showTrajectoryHint)
        } else {
            presentScene(in: uiView)
        }
    }

    private func presentScene(in view: SKView) {
        let scene = DinoPicnicScene(viewModel: viewModel)
        scene.scaleMode = .resizeFill
        view.presentScene(scene)
    }
}

@MainActor
final class DinoPicnicScene: SKScene {
    let roundID: UUID

    private weak var gameViewModel: DinoPicnicViewModel?
    private var dinoNode: PicnicDinoNode?
    private var requestBubble: SKNode?
    private var aimLine: SKShapeNode?
    private var hintLine: SKShapeNode?
    private var dragStart: CGPoint?
    private var dragCurrent: CGPoint?
    private var feedInProgress = false
    private var hasSetUp = false
    private var lastStretchSoundAt: TimeInterval = 0

    init(viewModel: DinoPicnicViewModel) {
        gameViewModel = viewModel
        roundID = viewModel.roundID
        super.init(size: CGSize(width: 1000, height: 700))
        backgroundColor = SKColor(red: 0.57, green: 0.85, blue: 0.96, alpha: 1)
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func didMove(to view: SKView) {
        hasSetUp = true
        gameViewModel?.prepare()
        buildBackground()
        spawnDinosaur()
        setTrajectoryHintVisible(gameViewModel?.showTrajectoryHint == true)

        if ProcessInfo.processInfo.arguments.contains("-autoPlayDinoPicnic") {
            runAutomatedRound()
        }
    }

    override func didChangeSize(_ oldSize: CGSize) {
        super.didChangeSize(oldSize)
        guard hasSetUp, size.width > 0, size.height > 0 else { return }
        buildBackground()
        if !feedInProgress {
            positionDinosaur()
        }
        setTrajectoryHintVisible(gameViewModel?.showTrajectoryHint == true)
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard !feedInProgress,
              gameViewModel?.isComplete == false,
              let touch = touches.first else {
            return
        }

        let location = touch.location(in: self)
        dragStart = location
        dragCurrent = location
        gameViewModel?.recordFirstTouch()
        showAimLine(from: location, to: location)
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first,
              let start = dragStart else {
            return
        }

        let location = touch.location(in: self)
        dragCurrent = location
        showAimLine(from: start, to: location)

        let now = CACurrentMediaTime()
        if now - lastStretchSoundAt > 0.09 {
            let distance = hypot(location.x - start.x, location.y - start.y)
            let power = min(1, distance / max(1, min(size.width, size.height) * 0.28))
            gameViewModel?.audioService.playStretch(power: power)
            lastStretchSoundAt = now
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let start = dragStart else { return }
        let end = touches.first?.location(in: self) ?? dragCurrent ?? start
        clearDrag()
        launchSnack(from: start, gestureEnd: end, forceAssist: false)
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        clearDrag()
    }

    func setTrajectoryHintVisible(_ visible: Bool) {
        hintLine?.removeFromParent()
        hintLine = nil
        guard visible,
              let dinoNode else {
            return
        }

        let start = CGPoint(x: size.width * 0.22, y: size.height * 0.2)
        let path = CGMutablePath()
        path.move(to: start)
        path.addQuadCurve(
            to: dinoNode.position,
            control: CGPoint(x: size.width * 0.48, y: size.height * 0.72)
        )
        let line = SKShapeNode(path: path)
        line.strokeColor = .white.withAlphaComponent(0.55)
        line.lineWidth = max(3, size.width * 0.004)
        line.lineCap = .round
        line.glowWidth = 2
        line.zPosition = 20
        hintLine = line
        addChild(line)
    }

    private func buildBackground() {
        childNode(withName: "picnic_background")?.removeFromParent()

        let layer = SKNode()
        layer.name = "picnic_background"
        layer.zPosition = -100

        let sky = SKShapeNode(rectOf: size)
        sky.fillColor = SKColor(red: 0.56, green: 0.84, blue: 0.96, alpha: 1)
        sky.strokeColor = .clear
        sky.position = CGPoint(x: size.width / 2, y: size.height / 2)
        layer.addChild(sky)

        let sun = SKShapeNode(circleOfRadius: min(size.width, size.height) * 0.08)
        sun.fillColor = SKColor(red: 1, green: 0.82, blue: 0.25, alpha: 1)
        sun.strokeColor = .white.withAlphaComponent(0.65)
        sun.lineWidth = 5
        sun.position = CGPoint(x: size.width * 0.12, y: size.height * 0.82)
        layer.addChild(sun)

        addCloud(to: layer, at: CGPoint(x: size.width * 0.32, y: size.height * 0.82), scale: 1)
        addCloud(to: layer, at: CGPoint(x: size.width * 0.76, y: size.height * 0.76), scale: 0.75)

        let hillPath = CGMutablePath()
        hillPath.move(to: CGPoint(x: 0, y: 0))
        hillPath.addCurve(
            to: CGPoint(x: size.width, y: size.height * 0.26),
            control1: CGPoint(x: size.width * 0.28, y: size.height * 0.42),
            control2: CGPoint(x: size.width * 0.62, y: size.height * 0.05)
        )
        hillPath.addLine(to: CGPoint(x: size.width, y: 0))
        hillPath.closeSubpath()
        let hills = SKShapeNode(path: hillPath)
        hills.fillColor = SKColor(red: 0.31, green: 0.72, blue: 0.39, alpha: 1)
        hills.strokeColor = .clear
        layer.addChild(hills)

        let grass = SKShapeNode(
            rectOf: CGSize(width: size.width, height: size.height * 0.2)
        )
        grass.fillColor = SKColor(red: 0.22, green: 0.62, blue: 0.31, alpha: 1)
        grass.strokeColor = .clear
        grass.position = CGPoint(x: size.width / 2, y: size.height * 0.1)
        layer.addChild(grass)

        addPicnicBlanket(to: layer)
        addChild(layer)
    }

    private func addCloud(to parent: SKNode, at position: CGPoint, scale: CGFloat) {
        let cloud = SKNode()
        cloud.position = position
        cloud.setScale(scale)
        for (offset, radius) in [
            (CGPoint(x: -38, y: 0), CGFloat(30)),
            (CGPoint(x: 0, y: 15), CGFloat(40)),
            (CGPoint(x: 40, y: 0), CGFloat(32))
        ] {
            let puff = SKShapeNode(circleOfRadius: radius)
            puff.fillColor = .white.withAlphaComponent(0.9)
            puff.strokeColor = .clear
            puff.position = offset
            cloud.addChild(puff)
        }
        parent.addChild(cloud)
    }

    private func addPicnicBlanket(to parent: SKNode) {
        let blanketSize = CGSize(width: size.width * 0.34, height: size.height * 0.13)
        let blanket = SKShapeNode(rectOf: blanketSize, cornerRadius: 16)
        blanket.fillColor = SKColor(red: 0.94, green: 0.34, blue: 0.4, alpha: 1)
        blanket.strokeColor = .white
        blanket.lineWidth = 5
        blanket.position = CGPoint(x: size.width * 0.25, y: size.height * 0.11)
        parent.addChild(blanket)

        for index in -2...2 {
            let stripe = SKShapeNode(
                rectOf: CGSize(width: blanketSize.width * 0.045, height: blanketSize.height)
            )
            stripe.fillColor = .white.withAlphaComponent(0.45)
            stripe.strokeColor = .clear
            stripe.position = CGPoint(
                x: blanket.position.x + CGFloat(index) * blanketSize.width * 0.18,
                y: blanket.position.y
            )
            parent.addChild(stripe)
        }
    }

    private func spawnDinosaur() {
        requestBubble?.removeFromParent()
        dinoNode?.removeFromParent()

        guard let viewModel = gameViewModel else { return }
        let dino = PicnicDinoNode(
            personality: viewModel.currentPersonality,
            diameter: max(120, min(size.width, size.height) * 0.23)
        )
        dino.zPosition = 10
        dinoNode = dino
        addChild(dino)
        positionDinosaur()
        dino.startIdleAnimation()
        startFlightMotion()
        addRequestBubble(snack: viewModel.currentRequest)
    }

    private func positionDinosaur() {
        dinoNode?.position = CGPoint(x: size.width * 0.73, y: size.height * 0.56)
        requestBubble?.position = CGPoint(
            x: (dinoNode?.position.x ?? size.width * 0.73) - size.width * 0.1,
            y: (dinoNode?.position.y ?? size.height * 0.56) + size.height * 0.18
        )
    }

    private func startFlightMotion() {
        guard let dinoNode else { return }
        let left = CGPoint(x: size.width * 0.64, y: size.height * 0.56)
        let right = CGPoint(x: size.width * 0.82, y: size.height * 0.6)
        dinoNode.run(
            .repeatForever(
                .sequence([
                    .move(to: right, duration: 1.8),
                    .move(to: left, duration: 1.8)
                ])
            ),
            withKey: "flight"
        )
    }

    private func addRequestBubble(snack: DinoPicnicSnack) {
        let bubble = SKNode()
        let circle = SKShapeNode(circleOfRadius: max(38, min(size.width, size.height) * 0.055))
        circle.fillColor = .white.withAlphaComponent(0.96)
        circle.strokeColor = SKColor(red: 0.3, green: 0.16, blue: 0.46, alpha: 1)
        circle.lineWidth = 5
        bubble.addChild(circle)

        let label = SKLabelNode(text: snack.symbol)
        label.fontSize = max(36, min(size.width, size.height) * 0.065)
        label.verticalAlignmentMode = .center
        label.horizontalAlignmentMode = .center
        bubble.addChild(label)

        bubble.zPosition = 30
        requestBubble = bubble
        addChild(bubble)
        positionDinosaur()
        bubble.run(
            .repeatForever(
                .sequence([
                    .scale(to: 1.08, duration: 0.45),
                    .scale(to: 0.96, duration: 0.45)
                ])
            )
        )
    }

    private func showAimLine(from start: CGPoint, to end: CGPoint) {
        aimLine?.removeFromParent()
        let path = CGMutablePath()
        path.move(to: start)
        path.addLine(to: end)
        let line = SKShapeNode(path: path)
        line.strokeColor = .white
        line.lineWidth = max(5, size.width * 0.006)
        line.lineCap = .round
        line.glowWidth = 3
        line.zPosition = 40
        aimLine = line
        addChild(line)
    }

    private func clearDrag() {
        aimLine?.removeFromParent()
        aimLine = nil
        dragStart = nil
        dragCurrent = nil
    }

    private func launchSnack(
        from start: CGPoint,
        gestureEnd: CGPoint,
        forceAssist: Bool
    ) {
        guard !feedInProgress,
              let viewModel = gameViewModel,
              let dinoNode else {
            return
        }

        feedInProgress = true
        dinoNode.removeAction(forKey: "flight")
        requestBubble?.removeAllActions()

        let snack = viewModel.selectedSnack
        let target = dinoNode.position
        let drag = CGVector(dx: gestureEnd.x - start.x, dy: gestureEnd.y - start.y)
        let distance = max(1, hypot(drag.dx, drag.dy))
        let towardTarget = CGVector(dx: target.x - start.x, dy: target.y - start.y)
        let targetDistance = max(1, hypot(towardTarget.dx, towardTarget.dy))
        let forwardDot = (drag.dx * towardTarget.dx + drag.dy * towardTarget.dy) /
            (distance * targetDistance)
        let reverseDot = (-drag.dx * towardTarget.dx - drag.dy * towardTarget.dy) /
            (distance * targetDistance)
        let bestDot = max(forwardDot, reverseDot)
        let shouldAssist = forceAssist || distance < 18 || bestDot < 0.88
        let power = min(1, distance / max(1, min(size.width, size.height) * 0.3))

        viewModel.recordLaunch(snack: snack, power: Double(power))
        if shouldAssist {
            viewModel.recordAssist()
        }

        let snackNode = makeSnackNode(snack)
        snackNode.position = start
        snackNode.zPosition = 25
        addChild(snackNode)

        let directionSign: CGFloat = forwardDot >= reverseDot ? 1 : -1
        let chosen = CGVector(
            dx: drag.dx * directionSign,
            dy: drag.dy * directionSign
        )
        let chosenLength = max(1, hypot(chosen.dx, chosen.dy))
        let normalized = CGVector(dx: chosen.dx / chosenLength, dy: chosen.dy / chosenLength)
        let launchStrength = max(70, min(size.width, size.height) * (0.18 + power * 0.18))

        let path = CGMutablePath()
        path.move(to: start)
        path.addCurve(
            to: target,
            control1: CGPoint(
                x: start.x + normalized.dx * launchStrength,
                y: start.y + normalized.dy * launchStrength + size.height * 0.12
            ),
            control2: CGPoint(
                x: (start.x + target.x) * 0.5,
                y: max(start.y, target.y) + size.height * (shouldAssist ? 0.22 : 0.14)
            )
        )

        let follow = SKAction.follow(path, asOffset: false, orientToPath: true, duration: 0.78)
        follow.timingMode = .easeInEaseOut
        snackNode.run(
            .sequence([
                .group([
                    follow,
                    .repeat(.rotate(byAngle: .pi * 2, duration: 0.24), count: 3)
                ]),
                .run { [weak self, weak snackNode] in
                    snackNode?.removeFromParent()
                    self?.completeFeed(snack: snack)
                }
            ])
        )
    }

    private func completeFeed(snack: DinoPicnicSnack) {
        guard let viewModel = gameViewModel,
              let dinoNode else {
            feedInProgress = false
            return
        }

        requestBubble?.removeFromParent()
        requestBubble = nil
        dinoNode.playEatingReaction()
        burstHearts(at: dinoNode.position)
        viewModel.recordFeed(snack: snack)

        if viewModel.isComplete {
            runCelebration()
            feedInProgress = false
            return
        }

        dinoNode.run(
            .sequence([
                .wait(forDuration: 0.55),
                .moveBy(x: size.width * 0.4, y: size.height * 0.18, duration: 0.5),
                .run { [weak self] in
                    self?.feedInProgress = false
                    self?.spawnDinosaur()
                }
            ])
        )
    }

    private func makeSnackNode(_ snack: DinoPicnicSnack) -> SKNode {
        let node = SKNode()
        let diameter = max(52, min(size.width, size.height) * 0.075)
        let shape: SKShapeNode

        switch snack {
        case .berry:
            shape = SKShapeNode(circleOfRadius: diameter / 2)
            shape.fillColor = SKColor(red: 0.9, green: 0.16, blue: 0.38, alpha: 1)
        case .sandwich:
            shape = SKShapeNode(rectOf: CGSize(width: diameter, height: diameter * 0.72), cornerRadius: 9)
            shape.fillColor = SKColor(red: 0.95, green: 0.71, blue: 0.3, alpha: 1)
        case .cookie:
            shape = SKShapeNode(circleOfRadius: diameter / 2)
            shape.fillColor = SKColor(red: 0.72, green: 0.43, blue: 0.2, alpha: 1)
        }

        shape.strokeColor = .white
        shape.lineWidth = 4
        node.addChild(shape)

        let label = SKLabelNode(text: snack.symbol)
        label.fontSize = diameter * 0.72
        label.verticalAlignmentMode = .center
        label.horizontalAlignmentMode = .center
        node.addChild(label)
        return node
    }

    private func burstHearts(at position: CGPoint) {
        for index in 0..<8 {
            let heart = SKLabelNode(text: index.isMultiple(of: 2) ? "♥" : "✦")
            heart.fontName = "AvenirNext-Heavy"
            heart.fontSize = 24 + CGFloat(index % 3) * 6
            heart.fontColor = index.isMultiple(of: 2) ? .systemPink : .systemYellow
            heart.position = position
            heart.zPosition = 50
            addChild(heart)

            let angle = CGFloat(index) / 8 * (.pi * 2)
            heart.run(
                .sequence([
                    .group([
                        .moveBy(
                            x: cos(angle) * 100,
                            y: sin(angle) * 80 + 40,
                            duration: 0.65
                        ),
                        .fadeOut(withDuration: 0.65),
                        .scale(to: 1.4, duration: 0.65)
                    ]),
                    .removeFromParent()
                ])
            )
        }
    }

    private func runCelebration() {
        for index in 0..<28 {
            let confetti = SKShapeNode(
                rectOf: CGSize(width: 10 + CGFloat(index % 3) * 3, height: 18)
            )
            let colors: [SKColor] = [
                .systemPink, .systemYellow, .systemTeal, .systemPurple, .systemOrange
            ]
            confetti.fillColor = colors[index % colors.count]
            confetti.strokeColor = .clear
            confetti.position = CGPoint(
                x: CGFloat(index) / 27 * size.width,
                y: size.height + CGFloat(index % 5) * 20
            )
            confetti.zPosition = 60
            addChild(confetti)
            confetti.run(
                .sequence([
                    .group([
                        .moveBy(x: CGFloat((index % 5) - 2) * 18, y: -size.height * 1.1, duration: 1.8),
                        .rotate(byAngle: .pi * CGFloat(index % 4 + 1), duration: 1.8)
                    ]),
                    .removeFromParent()
                ])
            )
        }
        dinoNode?.playCelebration()

        if ProcessInfo.processInfo.arguments.contains("-autoReplayDinoPicnic"),
           gameViewModel?.replayCount == 0 {
            run(
                .sequence([
                    .wait(forDuration: 0.9),
                    .run { [weak self] in
                        self?.gameViewModel?.replay()
                    }
                ])
            )
        }
    }

    private func runAutomatedRound() {
        guard let viewModel = gameViewModel else { return }
        viewModel.recordFirstTouch()
        let snacks = DinoPicnicSnack.allCases

        for index in 0..<viewModel.feedGoal {
            run(
                .sequence([
                    .wait(forDuration: 2.05 * Double(index + 1)),
                    .run { [weak self] in
                        guard let self,
                              self.feedInProgress == false,
                              let viewModel = self.gameViewModel else {
                            return
                        }
                        let snack = snacks[index % snacks.count]
                        viewModel.selectSnack(snack)
                        let start = CGPoint(x: self.size.width * 0.2, y: self.size.height * 0.22)
                        let end = CGPoint(x: start.x - 90, y: start.y - 55)
                        self.launchSnack(
                            from: start,
                            gestureEnd: end,
                            forceAssist: index == 0
                        )
                    }
                ])
            )
        }
    }
}

@MainActor
private final class PicnicDinoNode: SKNode {
    private let personality: DinoPicnicPersonality
    private let artLayer = SKNode()
    private let wing = SKShapeNode()

    init(personality: DinoPicnicPersonality, diameter: CGFloat) {
        self.personality = personality
        super.init()
        name = "picnic_dino"
        addChild(artLayer)

        let primary: SKColor = personality == .breezy
            ? SKColor(red: 0.22, green: 0.75, blue: 0.56, alpha: 1)
            : SKColor(red: 0.47, green: 0.35, blue: 0.86, alpha: 1)
        let accent: SKColor = personality == .breezy
            ? SKColor(red: 0.13, green: 0.54, blue: 0.78, alpha: 1)
            : SKColor(red: 0.95, green: 0.42, blue: 0.67, alpha: 1)

        let body = SKShapeNode(
            ellipseOf: CGSize(width: diameter * 1.05, height: diameter * 0.68)
        )
        body.fillColor = primary
        body.strokeColor = .white
        body.lineWidth = 5
        artLayer.addChild(body)

        let belly = SKShapeNode(
            ellipseOf: CGSize(width: diameter * 0.52, height: diameter * 0.36)
        )
        belly.fillColor = primary.withAlphaComponent(0.55)
        belly.strokeColor = .white.withAlphaComponent(0.55)
        belly.lineWidth = 3
        belly.position = CGPoint(x: -diameter * 0.08, y: -diameter * 0.08)
        artLayer.addChild(belly)

        let head = SKShapeNode(circleOfRadius: diameter * 0.31)
        head.fillColor = primary
        head.strokeColor = .white
        head.lineWidth = 5
        head.position = CGPoint(x: diameter * 0.44, y: diameter * 0.13)
        artLayer.addChild(head)

        let snout = SKShapeNode(
            ellipseOf: CGSize(width: diameter * 0.42, height: diameter * 0.24)
        )
        snout.fillColor = accent
        snout.strokeColor = .white.withAlphaComponent(0.75)
        snout.lineWidth = 3
        snout.position = CGPoint(x: diameter * 0.58, y: diameter * 0.02)
        artLayer.addChild(snout)

        let eye = SKShapeNode(circleOfRadius: diameter * 0.075)
        eye.fillColor = .white
        eye.strokeColor = .clear
        eye.position = CGPoint(x: diameter * 0.49, y: diameter * 0.23)
        artLayer.addChild(eye)

        let pupil = SKShapeNode(circleOfRadius: diameter * 0.035)
        pupil.fillColor = .black
        pupil.strokeColor = .clear
        pupil.position = CGPoint(x: diameter * 0.515, y: diameter * 0.225)
        artLayer.addChild(pupil)

        let smilePath = CGMutablePath()
        smilePath.move(to: CGPoint(x: diameter * 0.5, y: -diameter * 0.01))
        smilePath.addQuadCurve(
            to: CGPoint(x: diameter * 0.68, y: diameter * 0.01),
            control: CGPoint(x: diameter * 0.59, y: -diameter * 0.1)
        )
        let smile = SKShapeNode(path: smilePath)
        smile.strokeColor = .black.withAlphaComponent(0.65)
        smile.lineWidth = 4
        smile.lineCap = .round
        artLayer.addChild(smile)

        wing.path = CGPath(
            ellipseIn: CGRect(
                x: -diameter * 0.53,
                y: -diameter * 0.11,
                width: diameter * 0.5,
                height: diameter * 0.26
            ),
            transform: nil
        )
        wing.fillColor = accent
        wing.strokeColor = .white
        wing.lineWidth = 4
        wing.zPosition = -1
        artLayer.addChild(wing)

        for direction: CGFloat in [-1, 1] {
            let foot = SKShapeNode(
                ellipseOf: CGSize(width: diameter * 0.25, height: diameter * 0.12)
            )
            foot.fillColor = accent
            foot.strokeColor = .white
            foot.lineWidth = 3
            foot.position = CGPoint(
                x: direction * diameter * 0.23,
                y: -diameter * 0.36
            )
            artLayer.addChild(foot)
        }

        let horn = SKShapeNode()
        let hornPath = CGMutablePath()
        hornPath.move(to: CGPoint(x: diameter * 0.2, y: diameter * 0.33))
        hornPath.addLine(to: CGPoint(x: diameter * 0.29, y: diameter * 0.55))
        hornPath.addLine(to: CGPoint(x: diameter * 0.38, y: diameter * 0.34))
        hornPath.closeSubpath()
        horn.path = hornPath
        horn.fillColor = accent
        horn.strokeColor = .white
        horn.lineWidth = 3
        artLayer.addChild(horn)
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func startIdleAnimation() {
        artLayer.run(
            .repeatForever(
                .sequence([
                    .moveBy(x: 0, y: 8, duration: 0.35),
                    .moveBy(x: 0, y: -8, duration: 0.35)
                ])
            )
        )
        wing.run(
            .repeatForever(
                .sequence([
                    .rotate(toAngle: 0.2, duration: 0.12),
                    .rotate(toAngle: -0.28, duration: 0.12)
                ])
            )
        )
    }

    func playEatingReaction() {
        artLayer.run(
            .sequence([
                .group([
                    .scaleX(to: 1.22, duration: 0.12),
                    .scaleY(to: 0.78, duration: 0.12)
                ]),
                .group([
                    .scaleX(to: 0.88, duration: 0.12),
                    .scaleY(to: 1.18, duration: 0.12)
                ]),
                .scale(to: 1, duration: 0.16)
            ])
        )
    }

    func playCelebration() {
        removeAction(forKey: "flight")
        run(
            .repeat(
                .sequence([
                    .rotate(toAngle: 0.18, duration: 0.16),
                    .rotate(toAngle: -0.18, duration: 0.16)
                ]),
                count: 7
            )
        )
    }
}
