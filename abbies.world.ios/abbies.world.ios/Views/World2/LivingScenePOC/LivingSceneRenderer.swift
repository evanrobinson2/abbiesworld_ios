//
//  LivingSceneRenderer.swift
//  abbies.world.ios
//
//  SpriteKit proof that one static PNG can feel gently alive forever.
//  No video, no network, no runtime AI — only local transforms / crops / particles.
//

import SpriteKit
import UIKit

final class LivingSceneRenderer: SKScene {
    private let manifest: LivingSceneManifest
    private let showHardpointDebug: Bool

    private var worldRoot = SKNode()
    private var midLayer = SKNode()
    private var farLayer = SKNode()
    private var nearLayer = SKNode()
    private var effectLayer = SKNode()
    private var hardpointLayer = SKNode()

    private var sceneSize = CGSize.zero
    private var elapsed: TimeInterval = 0
    private var lastTappedHardpointID: String?
    private var fpsLabel: SKLabelNode?
    private var frameCounter = 0
    private var fpsSampleStart: TimeInterval = 0
    private var observedFPS: Double = 0

    var onHardpointTap: ((String) -> Void)?
    var onStats: ((Double) -> Void)?

    init(
        size: CGSize,
        manifest: LivingSceneManifest,
        showHardpointDebug: Bool = true
    ) {
        self.manifest = manifest
        self.showHardpointDebug = showHardpointDebug
        super.init(size: size)
        scaleMode = .resizeFill
        backgroundColor = .black
        anchorPoint = CGPoint(x: 0.5, y: 0.5)
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func didMove(to view: SKView) {
        removeAllChildren()
        buildScene()
    }

    override func didChangeSize(_ oldSize: CGSize) {
        guard oldSize != size, size.width > 1, size.height > 1 else { return }
        removeAllChildren()
        buildScene()
    }

    private func buildScene() {
        elapsed = 0
        worldRoot = SKNode()
        midLayer = SKNode()
        farLayer = SKNode()
        nearLayer = SKNode()
        effectLayer = SKNode()
        hardpointLayer = SKNode()

        guard let sceneTexture = texture(named: manifest.scene) else {
            addChild(errorLabel("Missing \(manifest.scene)"))
            return
        }

        sceneSize = sceneTexture.size()
        let fitted = fittedSceneSize(in: size, source: sceneSize)

        // Mid plate — canonical painting (stable hardpoint parent).
        let mid = SKSpriteNode(texture: sceneTexture, size: fitted)
        mid.zPosition = 10
        midLayer.addChild(mid)

        // Far / near bands: crude depth via cropped copies + different drift.
        if let far = bandNode(
            texture: sceneTexture,
            fitted: fitted,
            keepTopFraction: 0.48,
            alpha: 0.55
        ) {
            far.zPosition = 5
            farLayer.addChild(far)
        }
        if let near = bandNode(
            texture: sceneTexture,
            fitted: fitted,
            keepBottomFraction: 0.34,
            alpha: 0.40
        ) {
            near.zPosition = 15
            nearLayer.addChild(near)
        }

        for effect in manifest.effects {
            switch effect.effect {
            case "water_flow":
                if let node = maskedOverlay(
                    sceneTexture: sceneTexture,
                    fitted: fitted,
                    maskName: effect.mask,
                    name: "water",
                    tint: UIColor(red: 0.55, green: 0.85, blue: 1.0, alpha: 1),
                    blendMode: .add
                ) {
                    node.zPosition = 20
                    node.alpha = 0.22
                    node.userData = NSMutableDictionary(dictionary: [
                        "kind": "water",
                        "strength": effect.strength ?? 0.008,
                        "speed": effect.speed ?? 0.12,
                    ])
                    effectLayer.addChild(node)
                }
            case "soft_sway":
                if let node = maskedOverlay(
                    sceneTexture: sceneTexture,
                    fitted: fitted,
                    maskName: effect.mask,
                    name: "foliage",
                    tint: nil,
                    blendMode: .alpha
                ) {
                    node.zPosition = 18
                    node.alpha = 0.85
                    node.userData = NSMutableDictionary(dictionary: [
                        "kind": "foliage",
                        "strength": effect.strength ?? 0.004,
                        "speed": effect.speed ?? 0.08,
                    ])
                    effectLayer.addChild(node)
                }
            case "cloud_drift":
                if let node = maskedOverlay(
                    sceneTexture: sceneTexture,
                    fitted: fitted,
                    maskName: effect.mask,
                    name: "cloud",
                    tint: nil,
                    blendMode: .alpha
                ) {
                    node.zPosition = 8
                    node.alpha = 0.55
                    node.userData = NSMutableDictionary(dictionary: [
                        "kind": "cloud",
                        "strength": effect.strength ?? 0.006,
                        "speed": effect.speed ?? 0.015,
                    ])
                    effectLayer.addChild(node)
                }
            case "sparkles":
                addSparkles(effect: effect, fitted: fitted)
            default:
                break
            }
        }

        if showHardpointDebug {
            for hp in manifest.hardpoints {
                let radius = CGFloat(hp.radius) * fitted.width
                let ring = SKShapeNode(circleOfRadius: radius)
                ring.strokeColor = UIColor.systemYellow.withAlphaComponent(0.9)
                ring.fillColor = UIColor.systemYellow.withAlphaComponent(0.12)
                ring.lineWidth = 2
                ring.position = point(normalizedX: hp.x, normalizedY: hp.y, in: fitted)
                ring.name = "hardpoint.\(hp.id)"
                ring.zPosition = 50
                hardpointLayer.addChild(ring)

                let label = SKLabelNode(text: hp.id)
                label.fontName = "AvenirNext-Bold"
                label.fontSize = 11
                label.fontColor = .yellow
                label.verticalAlignmentMode = .center
                label.position = CGPoint(x: 0, y: radius + 10)
                ring.addChild(label)
            }
        }

        worldRoot.addChild(farLayer)
        worldRoot.addChild(midLayer)
        worldRoot.addChild(nearLayer)
        worldRoot.addChild(effectLayer)
        worldRoot.addChild(hardpointLayer)
        addChild(worldRoot)

        let fps = SKLabelNode(fontNamed: "Menlo-Bold")
        fps.fontSize = 12
        fps.fontColor = UIColor.white.withAlphaComponent(0.7)
        fps.horizontalAlignmentMode = .left
        fps.verticalAlignmentMode = .top
        fps.position = CGPoint(x: -size.width / 2 + 16, y: size.height / 2 - 16)
        fps.zPosition = 1000
        fps.text = "LivingScenePOC · -- fps"
        fpsLabel = fps
        addChild(fps)
        fpsSampleStart = 0
        frameCounter = 0
    }

    private func fittedSceneSize(in viewSize: CGSize, source: CGSize) -> CGSize {
        guard source.width > 0, source.height > 0 else { return viewSize }
        let scale = max(viewSize.width / source.width, viewSize.height / source.height)
        return CGSize(width: source.width * scale, height: source.height * scale)
    }

    private func point(normalizedX: Double, normalizedY: Double, in fitted: CGSize) -> CGPoint {
        // Image-normalized: (0,0) top-left of artwork → SpriteKit y-up centered.
        CGPoint(
            x: (CGFloat(normalizedX) - 0.5) * fitted.width,
            y: (0.5 - CGFloat(normalizedY)) * fitted.height
        )
    }

    private func texture(named fileName: String) -> SKTexture? {
        guard let url = LivingSceneBundle.url(named: fileName) else { return nil }
        guard let image = UIImage(contentsOfFile: url.path) else { return nil }
        let texture = SKTexture(image: image)
        texture.filteringMode = .linear
        return texture
    }

    private func bandNode(
        texture: SKTexture,
        fitted: CGSize,
        keepTopFraction: CGFloat? = nil,
        keepBottomFraction: CGFloat? = nil,
        alpha: CGFloat
    ) -> SKNode? {
        let crop = SKCropNode()
        let sprite = SKSpriteNode(texture: texture, size: fitted)
        crop.addChild(sprite)

        let mask = SKSpriteNode(color: .white, size: fitted)
        if let top = keepTopFraction {
            mask.size = CGSize(width: fitted.width, height: fitted.height * top)
            mask.position = CGPoint(x: 0, y: fitted.height * (0.5 - top / 2))
        } else if let bottom = keepBottomFraction {
            mask.size = CGSize(width: fitted.width, height: fitted.height * bottom)
            mask.position = CGPoint(x: 0, y: -fitted.height * (0.5 - bottom / 2))
        }
        crop.maskNode = mask
        crop.alpha = alpha
        return crop
    }

    private func maskedOverlay(
        sceneTexture: SKTexture,
        fitted: CGSize,
        maskName: String?,
        name: String,
        tint: UIColor?,
        blendMode: SKBlendMode
    ) -> SKNode? {
        guard let maskName, let maskTexture = texture(named: maskName) else { return nil }
        let crop = SKCropNode()
        crop.name = name

        let sprite = SKSpriteNode(texture: sceneTexture, size: fitted)
        if let tint {
            sprite.color = tint
            sprite.colorBlendFactor = 0.35
        }
        sprite.blendMode = blendMode
        crop.addChild(sprite)

        let mask = SKSpriteNode(texture: maskTexture, size: fitted)
        crop.maskNode = mask
        return crop
    }

    private func addSparkles(effect: LivingSceneManifest.Effect, fitted: CGSize) {
        let density = max(0.05, effect.density ?? 0.3)
        let regions = effect.regions ?? [
            LivingSceneManifest.Region(x: 0.45, y: 0.55, radius: 0.1)
        ]
        for (index, region) in regions.enumerated() {
            let emitter = SKEmitterNode()
            emitter.particleTexture = sparkleTexture()
            emitter.particleBirthRate = CGFloat(2.0 * density)
            emitter.numParticlesToEmit = 0
            emitter.particleLifetime = 5.5
            emitter.particleLifetimeRange = 2.0
            emitter.particleScale = 0.018
            emitter.particleScaleRange = 0.01
            emitter.particleScaleSpeed = -0.002
            emitter.particleAlpha = 0.55
            emitter.particleAlphaRange = 0.25
            emitter.particleAlphaSpeed = -0.08
            emitter.particleColor = UIColor(
                red: 0.75,
                green: 0.95,
                blue: 1.0,
                alpha: 1
            )
            emitter.particleColorBlendFactor = 1
            emitter.particleSpeed = 6
            emitter.particleSpeedRange = 4
            emitter.emissionAngleRange = .pi * 2
            emitter.particlePositionRange = CGVector(
                dx: CGFloat(region.radius) * fitted.width * 1.4,
                dy: CGFloat(region.radius) * fitted.height * 1.1
            )
            emitter.position = point(
                normalizedX: region.x,
                normalizedY: region.y,
                in: fitted
            )
            emitter.zPosition = 30
            emitter.name = "sparkle.\(index)"
            effectLayer.addChild(emitter)
        }
    }

    private func sparkleTexture() -> SKTexture {
        let side = 32
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: side, height: side))
        let image = renderer.image { ctx in
            let colors = [
                UIColor.white.cgColor,
                UIColor.white.withAlphaComponent(0).cgColor,
            ]
            let space = CGColorSpaceCreateDeviceRGB()
            guard let gradient = CGGradient(
                colorsSpace: space,
                colors: colors as CFArray,
                locations: [0, 1]
            ) else { return }
            ctx.cgContext.drawRadialGradient(
                gradient,
                startCenter: CGPoint(x: side / 2, y: side / 2),
                startRadius: 0,
                endCenter: CGPoint(x: side / 2, y: side / 2),
                endRadius: CGFloat(side) / 2,
                options: []
            )
        }
        return SKTexture(image: image)
    }

    private func errorLabel(_ text: String) -> SKLabelNode {
        let label = SKLabelNode(text: text)
        label.fontName = "AvenirNext-Bold"
        label.fontSize = 18
        label.fontColor = .red
        return label
    }

    override func update(_ currentTime: TimeInterval) {
        if fpsSampleStart == 0 {
            fpsSampleStart = currentTime
        }
        frameCounter += 1
        let sampleWindow = currentTime - fpsSampleStart
        if sampleWindow >= 0.5 {
            observedFPS = Double(frameCounter) / sampleWindow
            fpsLabel?.text = String(
                format: "LivingScenePOC · %.0f fps · closed-loop camera",
                observedFPS
            )
            onStats?(observedFPS)
            frameCounter = 0
            fpsSampleStart = currentTime
        }

        elapsed = currentTime
        let period = max(1.0, manifest.camera.period)
        // Closed loop: single phase θ ∈ [0, 2π). No reset seam.
        let theta = (elapsed / period) * (2.0 * .pi)
        let parallax = CGFloat(manifest.camera.parallax)
        let zoom = CGFloat(manifest.camera.zoom)

        let breatheX = sin(theta) * parallax
        // Integer harmonics only so the path closes after one period (no half-cycle flip).
        let breatheY = sin(theta * 2.0) * parallax * 0.45
        let breatheZoom = 1.0 + sin(theta) * zoom

        // Mid plate carries hardpoints — only global breathe, no independent drift.
        midLayer.position = .zero
        midLayer.setScale(1)

        farLayer.position = CGPoint(
            x: breatheX * size.width * CGFloat(manifest.camera.farParallaxScale),
            y: breatheY * size.height * CGFloat(manifest.camera.farParallaxScale)
        )
        nearLayer.position = CGPoint(
            x: breatheX * size.width * CGFloat(manifest.camera.nearParallaxScale),
            y: breatheY * size.height * CGFloat(manifest.camera.nearParallaxScale)
        )

        worldRoot.position = CGPoint(
            x: breatheX * size.width,
            y: breatheY * size.height
        )
        worldRoot.setScale(breatheZoom)

        for case let node as SKCropNode in effectLayer.children {
            guard let data = node.userData else { continue }
            let kind = data["kind"] as? String ?? ""
            let strength = CGFloat((data["strength"] as? Double) ?? 0.005)
            let speed = (data["speed"] as? Double) ?? 0.1
            let phase = theta * speed * period / (2 * .pi) * 2 * .pi

            switch kind {
            case "water":
                // Tiny cyclic shimmer — mask keeps land stable.
                node.position = CGPoint(
                    x: sin(phase * 1.7) * strength * sceneSize.width * 0.35,
                    y: cos(phase * 1.1) * strength * sceneSize.height * 0.2
                )
            case "foliage":
                node.zRotation = sin(phase) * strength * 0.9
                node.position = CGPoint(
                    x: sin(phase * 0.8) * strength * sceneSize.width * 0.25,
                    y: cos(phase * 1.3) * strength * sceneSize.height * 0.15
                )
            case "cloud":
                // Closed-loop drift (sine), never a hard wrap.
                node.position = CGPoint(
                    x: sin(phase) * strength * sceneSize.width * 2.5,
                    y: cos(phase * 0.5) * strength * sceneSize.height * 0.4
                )
            default:
                break
            }
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let location = touch.location(in: hardpointLayer)
        for hp in manifest.hardpoints {
            let fitted = fittedSceneSize(in: size, source: sceneSize)
            let center = point(normalizedX: hp.x, normalizedY: hp.y, in: fitted)
            let radius = CGFloat(hp.radius) * fitted.width
            let dx = location.x - center.x
            let dy = location.y - center.y
            if dx * dx + dy * dy <= radius * radius {
                lastTappedHardpointID = hp.id
                flashHardpoint(id: hp.id)
                onHardpointTap?(hp.id)
                return
            }
        }
    }

    private func flashHardpoint(id: String) {
        guard let ring = hardpointLayer.childNode(withName: "hardpoint.\(id)") as? SKShapeNode
        else { return }
        ring.run(
            .sequence([
                .customAction(withDuration: 0.01) { node, _ in
                    (node as? SKShapeNode)?.fillColor = UIColor.systemYellow.withAlphaComponent(0.35)
                },
                .wait(forDuration: 0.25),
                .customAction(withDuration: 0.01) { node, _ in
                    (node as? SKShapeNode)?.fillColor = UIColor.systemYellow.withAlphaComponent(0.12)
                },
            ])
        )
    }
}
