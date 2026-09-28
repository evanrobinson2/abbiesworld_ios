import SwiftUI
import UIKit

/// Compact map landmark tokens for Peglin Edition POIs.
/// Prefer carved isometric cutouts (`world2_token_peglin_*`); fall back to pin+glyph.
enum PeglinLandmarkTokenKind: String, CaseIterable, Sendable {
    case wreck
    case battle
    case workshop
    case path
    case challenge
    case orb
    case travel
    case bramble
    case foxLand
    case stagLand
    case forgottenRealm

    static func kind(forArchetypeID id: String) -> PeglinLandmarkTokenKind? {
        guard id.hasPrefix("poi.peglin.") else { return nil }
        if id == PeglinEdition.brambleGuardianID { return .bramble }
        if id == PeglinEdition.foxGuardianID { return .foxLand }
        if id == PeglinEdition.stagGuardianID { return .stagLand }
        if id == PeglinEdition.forgottenOrbID { return .forgottenRealm }
        if id.contains("wreck") { return .wreck }
        if id.contains("battleClearing") { return .battle }
        if id.contains("salvageWorkshop") || id.contains("workshop") { return .workshop }
        if id.contains("brokenPath") { return .path }
        if id.contains("guardian") { return .challenge }
        if id.contains("orb") { return .orb }
        if id.contains("path") { return .travel }
        return .travel
    }

    var semanticID: String { "token.peglin.\(rawValue)" }

    var catalogImageName: String { "world2_token_peglin_\(rawValue)" }

    var accent: Color {
        switch self {
        case .wreck: return Color(red: 0.55, green: 0.72, blue: 0.95)
        case .battle, .challenge: return Color(red: 0.95, green: 0.55, blue: 0.35)
        case .workshop: return Color(red: 0.95, green: 0.78, blue: 0.35)
        case .path, .travel: return Color(red: 0.45, green: 0.82, blue: 0.55)
        case .orb, .forgottenRealm: return Color(red: 0.55, green: 0.95, blue: 0.85)
        case .bramble: return Color(red: 0.45, green: 0.78, blue: 0.42)
        case .foxLand: return Color(red: 0.95, green: 0.45, blue: 0.35)
        case .stagLand: return Color(red: 0.35, green: 0.65, blue: 0.55)
        }
    }

    var glyph: String {
        switch self {
        case .wreck: return "airplane"
        case .battle, .challenge: return "circle.grid.cross.fill"
        case .workshop: return "wrench.and.screwdriver.fill"
        case .path, .travel: return "arrow.up.right"
        case .orb, .forgottenRealm: return "sparkles"
        case .bramble: return "hare.fill"
        case .foxLand: return "flame.fill"
        case .stagLand: return "leaf.fill"
        }
    }
}

/// Small game-map landmark token — carved isometric art when bundled.
struct PeglinLandmarkTokenView: View {
    let kind: PeglinLandmarkTokenKind
    var isSelected: Bool = false
    var size: CGFloat = 56

    var body: some View {
        Group {
            if let ui = UIImage(named: kind.catalogImageName) {
                carvedToken(ui)
            } else {
                proceduralPin
            }
        }
        .frame(width: size * 1.08, height: size * 1.12)
        .accessibilityHidden(true)
    }

    private func carvedToken(_ ui: UIImage) -> some View {
        ZStack {
            // Contact puddle — tight under the feet of the token, not a distant fog.
            Ellipse()
                .fill(Color.black.opacity(0.34))
                .frame(width: size * 0.58, height: size * 0.12)
                .offset(y: size * 0.46)

            Image(uiImage: ui)
                .resizable()
                .scaledToFit()
                .frame(width: size * 1.05, height: size * 1.05)
                .shadow(color: .black.opacity(isSelected ? 0.40 : 0.28), radius: isSelected ? 2 : 1, y: 1)
                .scaleEffect(isSelected ? 1.06 : 1.0)
        }
    }

    private var proceduralPin: some View {
        ZStack {
            Ellipse()
                .fill(Color.black.opacity(0.34))
                .frame(width: size * 0.55, height: size * 0.12)
                .offset(y: size * 0.48)

            PeglinMapPinShape()
                .fill(
                    LinearGradient(
                        colors: [
                            kind.accent.opacity(0.95),
                            kind.accent.opacity(0.65),
                            Color(red: 0.12, green: 0.18, blue: 0.22),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .overlay(
                    PeglinMapPinShape()
                        .stroke(Color.white.opacity(0.85), lineWidth: 2)
                )
                .shadow(color: kind.accent.opacity(0.55), radius: isSelected ? 10 : 5, y: 2)
                .frame(width: size, height: size * 1.25)

            Circle()
                .fill(Color.white.opacity(0.92))
                .frame(width: size * 0.48, height: size * 0.48)
                .offset(y: -size * 0.14)
                .overlay(
                    Image(systemName: kind.glyph)
                        .font(.system(size: size * 0.22, weight: .bold))
                        .foregroundStyle(kind.accent)
                        .offset(y: -size * 0.14)
                )
        }
    }
}

/// Classic map-pin silhouette (point down).
private struct PeglinMapPinShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        let cx = rect.midX
        let headR = w * 0.42
        let headCY = rect.minY + headR + h * 0.02
        path.addEllipse(
            in: CGRect(x: cx - headR, y: headCY - headR, width: headR * 2, height: headR * 2)
        )
        path.move(to: CGPoint(x: cx - headR * 0.55, y: headCY + headR * 0.55))
        path.addQuadCurve(
            to: CGPoint(x: cx, y: rect.maxY),
            control: CGPoint(x: cx - headR * 0.15, y: rect.maxY - h * 0.18)
        )
        path.addQuadCurve(
            to: CGPoint(x: cx + headR * 0.55, y: headCY + headR * 0.55),
            control: CGPoint(x: cx + headR * 0.15, y: rect.maxY - h * 0.18)
        )
        path.closeSubpath()
        return path
    }
}

/// Elbow-height Abbie portrait for Peglin battle HUD.
struct PeglinAbbieBattlePortrait: View {
    var state: PeglinCharacterState = .happy
    var size: CGFloat = 120
    /// Always the approved regal bust — never swap to older casual sheets.
    var preferRegalBust: Bool = true

    var body: some View {
        PeglinBattlePortraitFrame(
            uiImage: abbieUIImage,
            fallbackSystemName: "face.smiling",
            size: size,
            stroke: Color(red: 0.45, green: 0.82, blue: 0.55).opacity(0.7),
            accessibilityLabel: "Abbie \(state.rawValue)",
            accessibilityIdentifier: "world2.plink.battle.abbiePortrait",
            // Regal bust is already a full face — never HeadDAG-zoom it.
            faceCrop: false,
            contentMode: .fit
        )
        // Mood is a light tint only — no outfit/expression sheet swaps (Evan 2026-09-27).
        .saturation(moodSaturation)
        .brightness(moodBrightness)
        .colorMultiply(moodMultiply)
    }

    private var abbieUIImage: UIImage? {
        // Regal bust is the only battle Abbie art until matching expression sheets land.
        UIImage(named: PeglinAbbieArt.portraitCatalogName)
    }

    private var moodSaturation: Double {
        guard preferRegalBust else { return 1 }
        switch state {
        case .hurt: return 0.72
        case .defeated: return 0.35
        default: return 1
        }
    }

    private var moodBrightness: Double {
        guard preferRegalBust else { return 0 }
        switch state {
        case .hurt: return -0.04
        case .defeated: return -0.12
        default: return 0
        }
    }

    private var moodMultiply: Color {
        guard preferRegalBust else { return .white }
        switch state {
        case .hurt: return Color(red: 1.0, green: 0.82, blue: 0.82)
        case .defeated: return Color(red: 0.75, green: 0.72, blue: 0.78)
        default: return .white
        }
    }
}

/// Elbow-height enemy portrait (Bramble / Fox / Stag / Bizarro Abbie) for Peglin battle HUD.
struct PeglinEnemyBattlePortrait: View {
    var kind: PeglinEnemyKind
    var state: PeglinCharacterState = .idle
    var size: CGFloat = 120

    var body: some View {
        PeglinBattlePortraitFrame(
            uiImage: enemyUIImage,
            fallbackSystemName: enemyFallback,
            size: size,
            stroke: kind.isDistortedAbbie
                ? Color(red: 0.95, green: 0.2, blue: 0.55).opacity(0.9)
                : Color(red: 0.72, green: 0.55, blue: 0.95).opacity(0.75),
            accessibilityLabel: "\(kind.displayName) \(state.rawValue)",
            accessibilityIdentifier: "world2.plink.battle.enemyPortrait",
            distort: kind.isDistortedAbbie
        )
    }

    private var enemyUIImage: UIImage? {
        if let name = kind.portraitCatalogName(for: state), let img = UIImage(named: name) {
            return img
        }
        if let idle = kind.portraitCatalogName(for: .idle), let img = UIImage(named: idle) {
            return img
        }
        return nil
    }

    private var enemyFallback: String {
        switch kind {
        case .brambleSpirit: return "hare.fill"
        case .foxSpirit: return "pawprint.fill"
        case .stagSpirit: return "leaf.fill"
        case .burrowJackal: return "flame.fill"
        case .bizarroAbbie: return "person.fill.questionmark"
        }
    }
}

/// Wave-attacker portrait — named badguy gang (Raze/Vix/Morrow/Nib) or forest fauna.
struct PlinkAttackerBattlePortrait: View {
    var kind: PlinkAttackerKind
    var pose: PlinkAttackerPose = .idle
    var size: CGFloat = 72
    var stroke: Color = Color(red: 1.0, green: 0.55, blue: 0.28).opacity(0.9)

    var body: some View {
        PeglinBattlePortraitFrame(
            uiImage: kind.catalogImage(for: pose),
            fallbackSystemName: "bird.fill",
            size: size,
            stroke: stroke,
            accessibilityLabel: "\(kind.displayName) \(pose.rawValue)",
            accessibilityIdentifier: "world2.plink.battle.attackerPortrait",
            faceBBox: kind.portraitFaceBBox
        )
    }
}

/// Face-first portrait frame: HeadDAG top-center crop on tall full-bodies, then fill.
private struct PeglinBattlePortraitFrame: View {
    enum ContentMode {
        case fill
        case fit
    }

    var uiImage: UIImage?
    var fallbackSystemName: String
    var size: CGFloat
    var stroke: Color
    var accessibilityLabel: String
    var accessibilityIdentifier: String
    var distort: Bool = false
    /// When true, tall plates get a top-center head crop. Bust plates should leave this false.
    var faceCrop: Bool = true
    /// Optional per-character face box (normalized). Overrides the default top-center head crop.
    var faceBBox: NormalizedRect? = nil
    var contentMode: ContentMode = .fill

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: distort
                            ? [
                                Color(red: 0.35, green: 0.08, blue: 0.28).opacity(0.92),
                                Color(red: 0.12, green: 0.04, blue: 0.18).opacity(0.95),
                            ]
                            : [
                                Color(red: 0.18, green: 0.28, blue: 0.38).opacity(0.85),
                                Color(red: 0.08, green: 0.12, blue: 0.2).opacity(0.92),
                            ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

            portraitContent
                .frame(width: size, height: size)
                .clipped()
                .modifier(BizarroAbbieDistort(enabled: distort))
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(stroke, lineWidth: 2)
        )
        .shadow(color: .black.opacity(0.45), radius: 12, y: 6)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityIdentifier(accessibilityIdentifier)
    }

    @ViewBuilder
    private var portraitContent: some View {
        if let uiImage {
            let prepared = faceCrop ? Self.faceZoomed(uiImage, bbox: faceBBox) : uiImage
            Image(uiImage: prepared)
                .resizable()
                .aspectRatio(contentMode: contentMode == .fit ? .fit : .fill)
                .padding(contentMode == .fit ? size * 0.04 : 0)
        } else {
            Image(systemName: fallbackSystemName)
                .resizable()
                .scaledToFit()
                .foregroundStyle(.white.opacity(0.85))
                .padding(size * 0.22)
        }
    }

    /// HeadDAG fallback crop for tall full-body plates; square busts pass through.
    private static func faceZoomed(_ image: UIImage, bbox: NormalizedRect?) -> UIImage {
        let w = max(1, image.size.width)
        let h = max(1, image.size.height)
        let aspect = w / h
        // Tall / full-body → head box (per-kind override or top-center DAG fallback).
        if aspect < 0.92 {
            return HeadDAGService.shared.crop(image, bbox: bbox ?? .topCenterHead)
        }
        // Square-ish plates with an explicit face box still honor it (wide wing plates).
        if let bbox {
            return HeadDAGService.shared.crop(image, bbox: bbox)
        }
        return image
    }
}

private struct BizarroAbbieDistort: ViewModifier {
    var enabled: Bool

    func body(content: Content) -> some View {
        if enabled {
            content
                .hueRotation(.degrees(155))
                .saturation(1.55)
                .contrast(1.25)
                .colorMultiply(Color(red: 1.0, green: 0.55, blue: 0.95))
                .scaleEffect(x: -1, y: 1)
        } else {
            content
        }
    }
}

/// Full-body pixel Abbie for fight-zone overlay (beside the board).
struct PeglinAbbieFightSprite: View {
    var size: CGFloat = 140

    var body: some View {
        Group {
            if UIImage(named: PeglinAbbieArt.mapCatalogName) != nil {
                Image(PeglinAbbieArt.mapCatalogName)
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "figure.stand")
                    .resizable()
                    .scaledToFit()
                    .foregroundStyle(.white)
            }
        }
        .frame(width: size * 0.75, height: size)
        .shadow(color: .black.opacity(0.4), radius: 8, y: 4)
        .accessibilityLabel("Abbie")
        .accessibilityIdentifier("world2.plink.battle.abbieSprite")
    }
}

/// Full-body enemy figurine for the fight floor.
struct PeglinEnemyFigurine: View {
    var kind: PeglinEnemyKind
    var size: CGFloat = 120

    var body: some View {
        Group {
            if UIImage(named: kind.figurineCatalogName) != nil {
                Image(kind.figurineCatalogName)
                    .resizable()
                    .scaledToFit()
            } else if let idle = kind.portraitCatalogName(for: .idle),
                      UIImage(named: idle) != nil {
                Image(idle)
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "pawprint.fill")
                    .resizable()
                    .scaledToFit()
                    .foregroundStyle(.white.opacity(0.85))
            }
        }
        .modifier(BizarroAbbieDistort(enabled: kind.isDistortedAbbie))
        .frame(width: size, height: size)
        .shadow(color: .black.opacity(0.45), radius: 10, y: 5)
        .accessibilityLabel(kind.displayName)
        .accessibilityIdentifier("world2.plink.battle.enemyFigurine")
    }
}

