import CoreGraphics
import Foundation

/// Numeric design contract for Marble Voyage / Plink — regression gates before playtest.
///
/// Prefer encoding desired layout here; `scripts/check_voyage_design_rules.py` and
/// `MarbleVoyageDesignRulesTests` enforce the same thresholds. Run:
/// `./scripts/preflight_marble_voyage.sh` before handing Evan a major build.
enum MarbleVoyageDesignRules {
    // MARK: - Screen real estate (fight / title 4:3 plates on iPad landscape)

    /// Reference iPad landscape viewports (pts). Fitted 4:3 plates must fill width well.
    static let referenceLandscapeViewports: [(width: CGFloat, height: CGFloat)] = [
        (1180, 820),
        (1194, 834),
        (1366, 1024),
    ]

    /// Minimum `fitSize.width / bounds.width` on reference landscape viewports.
    /// Stops huge unused side pillarboxes when plates/layout regress.
    static let minPlateWidthFillFraction: CGFloat = 0.85

    /// Climb chart: full-bleed width (no side letterbox).
    static let climbChartMinWidthFraction: CGFloat = 0.98
    static let climbChartMaxWidthFraction: CGFloat = 1.00

    // MARK: - Fight chrome packing (header + board | enemy card)

    /// VStack gap between header and the board/card row — keep tiny so no dead band.
    static let maxFightChromeBoardSpacing: CGFloat = 4
    /// Compact Abbie portrait in the short header row.
    static let fightPortraitArtSize: CGFloat = 72
    /// Side cast card width as a fraction of the fight row (board keeps the rest).
    static let fightEnemyCardWidthFraction: CGFloat = 0.26
    /// Absolute card width clamp (iPad landscape).
    static let fightEnemyCardMinWidth: CGFloat = 220
    static let fightEnemyCardMaxWidth: CGFloat = 300
    /// Hero art on the side cast card.
    static let fightEnemyCardArtSize: CGFloat = 168
    /// Front-foe art scale vs base — unused when HP tiers drive size.
    static let fightFrontFoeArtScale: CGFloat = 1.4
    /// Rescue / hostage art scale on the cast card.
    static let fightRescueArtScale: CGFloat = 0.55

    /// Portrait size tier from foe max HP (not lane proximity).
    enum FightEnemySizeTier: Equatable {
        case small
        case medium
        case boss

        static func tier(maxHP: Int) -> FightEnemySizeTier {
            if maxHP >= 100 { return .boss }
            if maxHP >= 50 { return .medium }
            return .small
        }

        /// Multiplier of `fightPortraitArtSize`.
        var scale: CGFloat {
            switch self {
            case .small: return 0.55
            case .medium: return 0.90
            case .boss: return 1.40
            }
        }
    }

    static func fightEnemyPortraitSize(maxHP: Int, base: CGFloat = fightPortraitArtSize) -> CGFloat {
        base * FightEnemySizeTier.tier(maxHP: maxHP).scale
    }

    /// Horizontal slots for badguy-gang chrome (Raze / Vix / Morrow / Nib — grow sideways).
    static let fightAttackerSlotCount: Int = 4
    /// Board pane height ÷ viewport height after estimated chrome (reference iPads).
    /// Board fills the pane (no 4:3 letterbox); Leave/Marbles are overlays, not a chrome row.
    static let minFightBoardHeightFractionOfViewport: CGFloat = 0.70
    /// Estimated header height used by packing math / preflight (enemy lives in side card).
    static var estimatedFightChromeHeight: CGFloat {
        fightPortraitArtSize + 36 + maxFightChromeBoardSpacing
    }

    static func fightEnemyCardWidth(in rowWidth: CGFloat) -> CGFloat {
        let ideal = rowWidth * fightEnemyCardWidthFraction
        return min(fightEnemyCardMaxWidth, max(fightEnemyCardMinWidth, ideal))
    }

    // MARK: - Transparent UI chrome (power icons)

    /// Catalog imagesets that must keep true alpha (no opaque card-stock background).
    static let transparentUICatalogNames: [String] = [
        "world2_plink_power_icon_refresh",
        "world2_plink_power_icon_fire",
        "world2_plink_power_icon_split",
        "world2_plink_power_icon_tilt",
        "world2_plink_power_icon_magnet",
        "world2_plink_power_icon_bounce",
        "world2_plink_power_icon_bubble",
        "world2_plink_power_icon_spark",
        "world2_plink_power_icon_ghost",
        "world2_plink_power_icon_giant",
        "world2_token_marbleVoyage_climb_treasure",
        "world2_token_marbleVoyage_climb_mystery",
        "world2_token_marbleVoyage_climb_shrine",
    ]

    /// Corner samples must be at or below this alpha (0…255).
    static let maxCornerAlpha: UInt8 = 16
    /// Share of pixels with alpha < 16 (must look cut out, not a filled square).
    static let minTransparentPixelFraction: CGFloat = 0.12

    // MARK: - Battle hit feed readability

    static let battleFeedMinWidth: CGFloat = 160
    /// Round damage / highlight body text.
    static let battleFeedMinBodyFont: CGFloat = 12
    /// Status line / meta labels.
    static let battleFeedMinMetaFont: CGFloat = 11
    /// Cage/Hurt chip value.
    static let battleFeedMinChipValueFont: CGFloat = 14

    // MARK: - Fight aim trackpad (bottom-right marble chip)

    /// Fixed width of the NOW-marble aim pad (does not grow with copy).
    static let fightAimTrackpadWidth: CGFloat = 176
    /// Fixed height — tall enough for downward turbo pull.
    static let fightAimTrackpadHeight: CGFloat = 118
    /// Marble thumb size inside the trackpad.
    static let fightAimTrackpadThumbSize: CGFloat = 40

    // MARK: - Fight power slots (bottom-left FIFO wells)

    /// Default always-visible power wells (extra capacity is a future shop item).
    static let fightPowerSlotCount: Int = PlinkPowerUp.defaultSlotCapacity
    static let fightPowerSlotSize: CGFloat = 62

    // MARK: - Climb intro camera (manual cast flyby)

    /// Cast tour walk order — boss (top) → Abbie (bottom). Scrub frames match this.
    static let climbCastTourOrder: MarbleVoyageOverlandScroll.CastOrder = .bossToAbbie
    /// Where a focused tile sits in the viewport (0 top → 1 bottom).
    static let climbRevealFocusAnchorY: CGFloat = 0.38
    /// Brief hold before framing the first foe (summit).
    static let climbIntroSettleSeconds: TimeInterval = 0.8
    /// Camera ease onto each enemy portrait (slower flyby).
    static let climbRevealPanSeconds: TimeInterval = 1.45
    /// Delay between letters in the flying name card.
    static let climbRevealLetterSeconds: TimeInterval = 0.1
    /// Final ease from last foe → player / next choice after the cast is dismissed.
    static let climbRevealFinalPanSeconds: TimeInterval = 1.6
    /// Player / next-choice end framing in the scroll viewport.
    static let climbIntroPlayerScrollAnchorY: CGFloat = 0.58
    /// Finger drag → camera: lower = slower / more deliberate pan on the climb.
    static let climbPanDragSensitivity: CGFloat = 0.38
    /// Vertical drag distance (pts) that advances one cast frame while scrubbing.
    static let climbCastScrubPointsPerFrame: CGFloat = 72
    /// Foe / cast name card max width on the climb.
    static let climbFoeCardMaxWidth: CGFloat = 360
    /// Estimated card height used by occlusion checks (name + blurb + stats).
    static let climbFoeCardEstimateHeight: CGFloat = 280
    /// Minimum gap between card and focused tile before we treat it as covering art.
    static let climbFoeCardMinClearance: CGFloat = 16

    /// @available(*, deprecated, message: "Manual cast — hold is player-driven.")
    static let climbRevealHoldAfterNameSeconds: TimeInterval = 2.5
    /// @available(*, deprecated, message: "Replaced by per-enemy climbReveal* timings.")
    static let climbIntroPanSeconds: TimeInterval = climbRevealFinalPanSeconds

    // MARK: - VS splash portraits

    /// Enemy kinds that must resolve a bundled figurine (or idle portrait fallback).
    /// Burrow Jackal is an optional Fox alternate — idle token counts as figurine.
    static var versusEnemyKinds: [PeglinEnemyKind] { PeglinEnemyKind.allCases }

    // MARK: - Derived helpers

    /// Largest 4:3 rect width÷bounds.width (same geometry as `MarbleVoyagePlateLayout.fitSize`).
    static func plateWidthFillFraction(in bounds: CGSize) -> CGFloat {
        guard bounds.width > 1, bounds.height > 1 else { return 0 }
        let fitted = MarbleVoyagePlateLayout.fitSize(in: bounds)
        return fitted.width / bounds.width
    }

    static func isAcceptablePlateWidthFill(in bounds: CGSize) -> Bool {
        plateWidthFillFraction(in: bounds) >= minPlateWidthFillFraction
    }

    /// Board pane under chrome: fills remaining height ÷ full viewport height.
    /// Compact chrome raises this; a tall dead band under portraits lowers it.
    /// (Board no longer 4:3-letterboxes inside the pane.)
    static func fightBoardHeightFractionOfViewport(
        _ viewport: CGSize,
        chromeHeight: CGFloat = estimatedFightChromeHeight
    ) -> CGFloat {
        guard viewport.width > 1, viewport.height > 1 else { return 0 }
        let paneHeight = max(1, viewport.height - chromeHeight)
        return paneHeight / viewport.height
    }

    static func isAcceptableFightBoardPacking(in viewport: CGSize) -> Bool {
        fightBoardHeightFractionOfViewport(viewport) >= minFightBoardHeightFractionOfViewport
    }
}
