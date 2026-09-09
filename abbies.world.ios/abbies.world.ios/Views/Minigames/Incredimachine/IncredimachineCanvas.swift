//
//  IncredimachineCanvas.swift
//  abbies.world.ios
//

import SwiftUI
import SpriteKit
import UIKit

struct IncredimachineCanvas: UIViewRepresentable {
    @ObservedObject var viewModel: IncredimachineViewModel

    func makeUIView(context: Context) -> SKView {
        let view = SKView()
        view.preferredFramesPerSecond = 60
        view.ignoresSiblingOrder = true
        presentScene(in: view)
        return view
    }

    func updateUIView(_ uiView: SKView, context: Context) {
        if let scene = uiView.scene as? IncredimachineScene {
            scene.apply(viewModel: viewModel)
        } else {
            presentScene(in: uiView)
        }
    }

    private func presentScene(in view: SKView) {
        let scene = IncredimachineScene(viewModel: viewModel)
        scene.scaleMode = .resizeFill
        view.presentScene(scene)
    }
}

@MainActor
final class IncredimachineScene: SKScene, SKPhysicsContactDelegate {
    private weak var gameViewModel: IncredimachineViewModel?
    private var lastLaunchToken = -1
    private var lastFlightID = UUID()
    private var ragdoll: RagdollNode?
    private var fanNode: SKNode?
    private var bounceNode: SKNode?
    private var balloonNode: SKNode?
    private var bedNode: SKNode?
    private var hasSetUp = false
    private var balloonUsed = false
    private var settledFrames = 0

    init(viewModel: IncredimachineViewModel) {
        gameViewModel = viewModel
        super.init(size: CGSize(width: 1100, height: 700))
        backgroundColor = SKColor(red: 0.08, green: 0.07, blue: 0.18, alpha: 1)
        physicsWorld.gravity = CGVector(dx: 0, dy: -7.4)
        physicsWorld.contactDelegate = self
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func didMove(to view: SKView) {
        hasSetUp = true
        rebuildWorld()
        spawnRagdoll(atCannon: true)
    }

    override func didChangeSize(_ oldSize: CGSize) {
        super.didChangeSize(oldSize)
        guard hasSetUp, size.width > 1, size.height > 1 else { return }
        rebuildWorld()
        if gameViewModel?.phase != .flying {
            spawnRagdoll(atCannon: true)
        }
    }

    func apply(viewModel: IncredimachineViewModel) {
        gameViewModel = viewModel
        if viewModel.launchToken != lastLaunchToken {
            lastLaunchToken = viewModel.launchToken
            lastFlightID = viewModel.flightID
            balloonUsed = false
            settledFrames = 0
            spawnRagdoll(atCannon: true)
            launch()
        } else if viewModel.phase == .setup, viewModel.flightID != lastFlightID {
            lastFlightID = viewModel.flightID
            balloonUsed = false
            spawnRagdoll(atCannon: true)
        } else if viewModel.phase == .setup {
            ragdoll?.applyHead(viewModel.selectedHead?.image)
        }
        updateGadgets(settings: viewModel.settings)
    }

    override func update(_ currentTime: TimeInterval) {
        guard gameViewModel?.phase == .flying, let ragdoll else { return }

        if gameViewModel?.settings.fanOn == true, let fanNode {
            let fanRect = fanNode.calculateAccumulatedFrame()
            ragdoll.bodies.forEach { part in
                if fanRect.contains(part.position) {
                    part.physicsBody?.applyForce(CGVector(dx: 18, dy: 420))
                }
            }
        }

        let speed = ragdoll.torso.physicsBody?.velocity.dx ?? 0
        let vertical = ragdoll.torso.physicsBody?.velocity.dy ?? 0
        let moving = hypot(speed, vertical) > 18
        if ragdoll.torso.position.x > size.width * 0.62, !moving {
            settledFrames += 1
            if settledFrames > 28 {
                gameViewModel?.recordLanding()
            }
        } else {
            settledFrames = 0
        }

        if ragdoll.torso.position.y < -80 || ragdoll.torso.position.x < -120 {
            gameViewModel?.recordMiss()
        }
    }

    func didBegin(_ contact: SKPhysicsContact) {
        let masks = contact.bodyA.categoryBitMask | contact.bodyB.categoryBitMask
        if masks & PhysicsCategory.bed != 0, masks & PhysicsCategory.ragdoll != 0 {
            gameViewModel?.recordLanding()
        }
        if masks & PhysicsCategory.balloon != 0, masks & PhysicsCategory.ragdoll != 0, !balloonUsed {
            balloonUsed = true
            ragdoll?.torso.physicsBody?.applyImpulse(CGVector(dx: 4, dy: 42))
            balloonNode?.run(.sequence([
                .scale(to: 1.35, duration: 0.12),
                .fadeOut(withDuration: 0.2),
                .removeFromParent()
            ]))
        }
    }

    private func rebuildWorld() {
        enumerateChildNodes(withName: "//world_root") { node, _ in
            node.removeFromParent()
        }

        let root = SKNode()
        root.name = "world_root"
        addChild(root)

        let sky = SKShapeNode(rectOf: size)
        sky.fillColor = SKColor(red: 0.12, green: 0.1, blue: 0.28, alpha: 1)
        sky.strokeColor = .clear
        sky.position = CGPoint(x: size.width / 2, y: size.height / 2)
        sky.zPosition = -20
        root.addChild(sky)

        addMoon(to: root)
        addCannon(to: root)

        let floor = SKNode()
        floor.position = CGPoint(x: size.width / 2, y: 18)
        floor.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: size.width * 1.4, height: 36))
        floor.physicsBody?.isDynamic = false
        floor.physicsBody?.categoryBitMask = PhysicsCategory.world
        floor.physicsBody?.collisionBitMask = PhysicsCategory.ragdoll
        floor.physicsBody?.friction = 0.7
        floor.physicsBody?.restitution = 0.18
        root.addChild(floor)

        let floorVisual = SKShapeNode(rectOf: CGSize(width: size.width, height: 36), cornerRadius: 8)
        floorVisual.fillColor = SKColor(red: 0.35, green: 0.22, blue: 0.12, alpha: 1)
        floorVisual.strokeColor = .clear
        floorVisual.position = CGPoint(x: size.width / 2, y: 18)
        root.addChild(floorVisual)

        let wall = SKNode()
        wall.position = CGPoint(x: size.width - 8, y: size.height / 2)
        wall.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 16, height: size.height))
        wall.physicsBody?.isDynamic = false
        wall.physicsBody?.categoryBitMask = PhysicsCategory.world
        wall.physicsBody?.collisionBitMask = PhysicsCategory.ragdoll
        wall.physicsBody?.restitution = 0.35
        root.addChild(wall)

        bounceNode = makeBouncePad()
        root.addChild(bounceNode!)
        fanNode = makeFan()
        root.addChild(fanNode!)
        balloonNode = makeBalloon()
        root.addChild(balloonNode!)
        bedNode = makeBed()
        root.addChild(bedNode!)

        if let settings = gameViewModel?.settings {
            updateGadgets(settings: settings)
        }
    }

    private func addMoon(to root: SKNode) {
        let moon = SKShapeNode(circleOfRadius: min(size.width, size.height) * 0.07)
        moon.fillColor = SKColor(red: 1, green: 0.92, blue: 0.62, alpha: 1)
        moon.strokeColor = .white
        moon.lineWidth = 3
        moon.position = CGPoint(x: size.width * 0.82, y: size.height * 0.84)
        moon.zPosition = -10
        root.addChild(moon)
    }

    private func addCannon(to root: SKNode) {
        let base = SKShapeNode(rectOf: CGSize(width: 88, height: 36), cornerRadius: 10)
        base.fillColor = SKColor(red: 0.45, green: 0.28, blue: 0.12, alpha: 1)
        base.strokeColor = .white
        base.position = CGPoint(x: size.width * 0.11, y: 52)
        root.addChild(base)

        let barrel = SKShapeNode(rectOf: CGSize(width: 110, height: 28), cornerRadius: 12)
        barrel.fillColor = SKColor(red: 0.72, green: 0.22, blue: 0.16, alpha: 1)
        barrel.strokeColor = .white
        barrel.position = CGPoint(x: size.width * 0.16, y: 86)
        barrel.zRotation = 0.55
        root.addChild(barrel)
    }

    private func makeBouncePad() -> SKNode {
        let node = SKShapeNode(rectOf: CGSize(width: 150, height: 22), cornerRadius: 8)
        node.name = "bounce"
        node.fillColor = SKColor(red: 0.2, green: 0.85, blue: 0.55, alpha: 1)
        node.strokeColor = .white
        node.position = CGPoint(x: size.width * 0.42, y: 64)
        node.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 150, height: 22))
        node.physicsBody?.isDynamic = false
        node.physicsBody?.categoryBitMask = PhysicsCategory.gadget
        node.physicsBody?.collisionBitMask = PhysicsCategory.ragdoll
        node.physicsBody?.restitution = 1.35
        node.physicsBody?.friction = 0.1
        return node
    }

    private func makeFan() -> SKNode {
        let node = SKShapeNode(rectOf: CGSize(width: 70, height: 160), cornerRadius: 18)
        node.name = "fan"
        node.fillColor = SKColor(red: 0.35, green: 0.7, blue: 1, alpha: 0.55)
        node.strokeColor = .white
        node.position = CGPoint(x: size.width * 0.55, y: size.height * 0.42)
        node.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 70, height: 160))
        node.physicsBody?.isDynamic = false
        node.physicsBody?.categoryBitMask = PhysicsCategory.gadget
        node.physicsBody?.collisionBitMask = 0
        return node
    }

    private func makeBalloon() -> SKNode {
        let node = SKShapeNode(circleOfRadius: 28)
        node.name = "balloon"
        node.fillColor = SKColor(red: 1, green: 0.42, blue: 0.62, alpha: 1)
        node.strokeColor = .white
        node.lineWidth = 3
        node.position = CGPoint(x: size.width * 0.68, y: size.height * 0.58)
        node.physicsBody = SKPhysicsBody(circleOfRadius: 28)
        node.physicsBody?.isDynamic = false
        node.physicsBody?.categoryBitMask = PhysicsCategory.balloon
        node.physicsBody?.contactTestBitMask = PhysicsCategory.ragdoll
        node.physicsBody?.collisionBitMask = 0
        return node
    }

    private func makeBed() -> SKNode {
        let node = SKShapeNode(rectOf: CGSize(width: 210, height: 54), cornerRadius: 26)
        node.name = "bed"
        node.fillColor = SKColor(red: 0.85, green: 0.95, blue: 1, alpha: 1)
        node.strokeColor = .white
        node.lineWidth = 4
        node.position = CGPoint(x: size.width * 0.84, y: 58)
        node.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 200, height: 40))
        node.physicsBody?.isDynamic = false
        node.physicsBody?.categoryBitMask = PhysicsCategory.bed
        node.physicsBody?.contactTestBitMask = PhysicsCategory.ragdoll
        node.physicsBody?.collisionBitMask = PhysicsCategory.ragdoll
        node.physicsBody?.restitution = 0.05
        node.physicsBody?.friction = 1.2
        return node
    }

    private func updateGadgets(settings: MachineSettings) {
        bounceNode?.alpha = settings.bounceOn ? 1 : 0.18
        bounceNode?.physicsBody?.collisionBitMask = settings.bounceOn ? PhysicsCategory.ragdoll : 0
        fanNode?.alpha = settings.fanOn ? 1 : 0.18
        balloonNode?.isHidden = !settings.balloonOn
        balloonNode?.physicsBody?.contactTestBitMask = settings.balloonOn ? PhysicsCategory.ragdoll : 0
    }

    private func spawnRagdoll(atCannon: Bool) {
        ragdoll?.removeFromParent()
        let doll = RagdollNode(headImage: gameViewModel?.selectedHead?.image)
        doll.position = atCannon
            ? CGPoint(x: size.width * 0.2, y: 118)
            : CGPoint(x: size.width * 0.2, y: 118)
        doll.zPosition = 40
        addChild(doll)
        doll.attachJoints(in: self)
        ragdoll = doll
    }

    private func launch() {
        guard let ragdoll, let settings = gameViewModel?.settings else { return }
        let power = 18 + settings.power * 42
        let dx = CGFloat(cos(settings.launchRadians) * power)
        let dy = CGFloat(sin(settings.launchRadians) * power)
        ragdoll.torso.physicsBody?.applyImpulse(CGVector(dx: dx, dy: dy))
        ragdoll.head.physicsBody?.applyAngularImpulse(CGFloat(settings.spin * 0.018))
    }
}

final class RagdollNode: SKNode {
    let head: SKSpriteNode
    let torso: SKShapeNode
    let leftArm: SKShapeNode
    let rightArm: SKShapeNode
    let leftLeg: SKShapeNode
    let rightLeg: SKShapeNode

    var bodies: [SKNode] { [head, torso, leftArm, rightArm, leftLeg, rightLeg] }

    init(headImage: UIImage?) {
        let headSize: CGFloat = 46
        let texture = headImage.map { SKTexture(image: $0) }
        head = SKSpriteNode(texture: texture, size: CGSize(width: headSize, height: headSize))
        if texture == nil {
            head.color = SKColor(red: 0.7, green: 0.45, blue: 0.95, alpha: 1)
            head.colorBlendFactor = 1
        }

        torso = Self.limb(size: CGSize(width: 28, height: 38), color: SKColor(red: 0.95, green: 0.62, blue: 0.22, alpha: 1))
        leftArm = Self.limb(size: CGSize(width: 12, height: 28), color: SKColor(red: 1, green: 0.78, blue: 0.45, alpha: 1))
        rightArm = Self.limb(size: CGSize(width: 12, height: 28), color: SKColor(red: 1, green: 0.78, blue: 0.45, alpha: 1))
        leftLeg = Self.limb(size: CGSize(width: 14, height: 32), color: SKColor(red: 0.35, green: 0.45, blue: 0.9, alpha: 1))
        rightLeg = Self.limb(size: CGSize(width: 14, height: 32), color: SKColor(red: 0.35, green: 0.45, blue: 0.9, alpha: 1))

        super.init()
        name = "ragdoll"

        torso.position = .zero
        head.position = CGPoint(x: 0, y: 42)
        leftArm.position = CGPoint(x: -22, y: 8)
        rightArm.position = CGPoint(x: 22, y: 8)
        leftLeg.position = CGPoint(x: -10, y: -34)
        rightLeg.position = CGPoint(x: 10, y: -34)

        head.physicsBody = SKPhysicsBody(circleOfRadius: headSize * 0.46)
        torso.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 28, height: 38))
        leftArm.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 12, height: 28))
        rightArm.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 12, height: 28))
        leftLeg.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 14, height: 32))
        rightLeg.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: 14, height: 32))

        for part in [head, torso, leftArm, rightArm, leftLeg, rightLeg] {
            part.physicsBody?.affectedByGravity = true
            part.physicsBody?.mass = part === head ? 0.18 : 0.12
            part.physicsBody?.allowsRotation = true
            part.physicsBody?.categoryBitMask = PhysicsCategory.ragdoll
            part.physicsBody?.contactTestBitMask = PhysicsCategory.bed | PhysicsCategory.balloon
            part.physicsBody?.collisionBitMask = PhysicsCategory.world | PhysicsCategory.gadget | PhysicsCategory.bed | PhysicsCategory.ragdoll
            part.physicsBody?.restitution = 0.28
            part.physicsBody?.friction = 0.4
            part.physicsBody?.linearDamping = 0.12
            part.physicsBody?.angularDamping = 0.2
            addChild(part)
        }
        head.physicsBody?.collisionBitMask = PhysicsCategory.world | PhysicsCategory.gadget | PhysicsCategory.bed
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func attachJoints(in scene: SKScene) {
        func pin(_ a: SKNode, _ b: SKNode, at local: CGPoint) {
            guard let bodyA = a.physicsBody, let bodyB = b.physicsBody else { return }
            let anchor = convert(local, to: scene)
            let joint = SKPhysicsJointPin.joint(withBodyA: bodyA, bodyB: bodyB, anchor: anchor)
            scene.physicsWorld.add(joint)
        }
        pin(head, torso, at: CGPoint(x: 0, y: 22))
        pin(leftArm, torso, at: CGPoint(x: -16, y: 14))
        pin(rightArm, torso, at: CGPoint(x: 16, y: 14))
        pin(leftLeg, torso, at: CGPoint(x: -8, y: -20))
        pin(rightLeg, torso, at: CGPoint(x: 8, y: -20))
    }

    func applyHead(_ image: UIImage?) {
        guard let image else { return }
        head.texture = SKTexture(image: image)
        head.colorBlendFactor = 0
    }

    private static func limb(size: CGSize, color: SKColor) -> SKShapeNode {
        let node = SKShapeNode(rectOf: size, cornerRadius: min(size.width, size.height) * 0.35)
        node.fillColor = color
        node.strokeColor = .white
        node.lineWidth = 2
        return node
    }
}
