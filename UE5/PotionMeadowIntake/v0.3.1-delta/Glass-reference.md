# Marble Voyage glass reference

Source: https://github.com/evanrobinson2/abbiesworld_ios/blob/169c404ccf0b3f108f4a161580197046251eb7b4/abbies.world.ios/abbies.world.ios/Views/World2/Plink/Core/PeggleScene.swift#L816

Branch: `review/marble-voyage-plink`. Inspected the actual `drawBackdrop` implementation, rather than inferring an effect from the name.

The original uses a Gaussian blur radius 5.5, dark wash RGBA (0.05, 0.10, 0.14, 0.48), pale glass RGBA (0.72, 0.86, 0.88, 0.10), across the complete playfield. The native port uses Slate's real post-process backdrop blur with these wash colors. SwiftUI control materials are separate from the board effect.

Removed inset blue floor panels, opaque rounded blue fog cells, repeated circular gradients, and internal fog borders. Fog coverage now meets edge-to-edge to create one continuous dark veil; a thin highlight appears only at the cleared frontier. Cleared floor uses a quiet single-line lattice. Gold outlines identify immediately adjacent selectable squares. Existing one-square movement, once-only reveal healing, enemy recovery, potions and difficulty are unchanged.

Exact inspected source excerpt:

```swift
    private func drawBackdrop(w: CGFloat, h: CGFloat) {
        if let image = sceneBackdropImage {
            let texture = SKTexture(image: image)
            texture.filteringMode = .linear
            let imgW = max(1, image.size.width)
            let imgH = max(1, image.size.height)
            let scale = max(w / imgW, h / imgH) // aspect-fill — crop edges, no letterbox bands
            let drawW = imgW * scale
            let drawH = imgH * scale
            let letterbox = SKSpriteNode(
                color: SKColor(red: 0.04, green: 0.06, blue: 0.10, alpha: 1),
                size: CGSize(width: w, height: h)
            )
            letterbox.position = CGPoint(x: w / 2, y: h / 2)
            letterbox.zPosition = -21
            addChild(letterbox)

            // Soft blur + dim so the plate is atmosphere, not competing with pegs.
            let sky = SKSpriteNode(texture: texture, size: CGSize(width: drawW, height: drawH))
            sky.position = .zero
            sky.alpha = 0.72
            sky.color = SKColor(red: 0.55, green: 0.62, blue: 0.68, alpha: 1)
            sky.colorBlendFactor = 0.28

            let frosted = SKEffectNode()
            frosted.shouldEnableEffects = true
            frosted.shouldRasterize = true
            frosted.filter = CIFilter(name: "CIGaussianBlur", parameters: [
                kCIInputRadiusKey: 5.5,
            ])
            frosted.position = CGPoint(x: w / 2, y: h / 2)
            frosted.zPosition = -20
            frosted.name = "sceneBackdrop"
            frosted.addChild(sky)
            addChild(frosted)

            // Glass wash — cool tint so orange pegs stay readable.
            let wash = SKSpriteNode(
                color: SKColor(red: 0.05, green: 0.10, blue: 0.14, alpha: 0.48),
                size: CGSize(width: w, height: h)
            )
            wash.position = CGPoint(x: w / 2, y: h / 2)
            wash.zPosition = -18
            wash.name = "sceneBackdropWash"
            addChild(wash)

            let glass = SKSpriteNode(
                color: SKColor(red: 0.72, green: 0.86, blue: 0.88, alpha: 0.10),
                size: CGSize(width: w, height: h)
            )
            glass.position = CGPoint(x: w / 2, y: h / 2)
            glass.zPosition = -17
            glass.name = "sceneBackdropGlass"
            addChild(glass)
        } else {
            let sky = SKSpriteNode(
                color: SKColor(red: 0.04, green: 0.06, blue: 0.12, alpha: 1),
                size: CGSize(width: w, height: h)
            )
            sky.position = CGPoint(x: w / 2, y: h / 2)
            sky.zPosition = -20
            addChild(sky)
        }

        // Playfield frame matches physics walls (full board, small inset).
        let panel = SKShapeNode(
            rectOf: CGSize(width: w * 0.94, height: h * 0.92),
            cornerRadius: 22
        )
        panel.fillColor = SKColor(red: 0.08, green: 0.12, blue: 0.18, alpha: 0.12)
        panel.strokeColor = SKColor(red: 0.55, green: 0.9, blue: 0.7, alpha: 0.7)
        panel.lineWidth = 3
        panel.position = CGPoint(x: w / 2, y: h / 2)
        panel.zPosition = -10
        panel.name = "playfieldFrame"
```
