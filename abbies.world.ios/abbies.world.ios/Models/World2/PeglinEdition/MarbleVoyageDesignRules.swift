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

    /// Climb chart: tall poster art-leads; fill most landscape width (small letterbox only).
    static let climbChartMinWidthFraction: CGFloat = 0.70
    static let climbChartMaxWidthFraction: CGFloat = 0.92

    // MARK: - Fight chrome packing (rescue strip above board)

    /// VStack gap between portrait/attacker strip and the board — keep tiny so no dead band.
    static let maxFightChromeBoardSpacing: CGFloat = 4
    /// Compact portrait art; shorter chrome → taller 4:3 board (and less side pillarbox).
    static let fightPortraitArtSize: CGFloat = 88
    /// Horizontal slots for badguy-gang chrome (Raze / Vix / Morrow / Nib — grow sideways).
    static let fightAttackerSlotCount: Int = 4
    /// Fitted board height ÷ viewport height after estimated chrome (reference iPads).
    static let minFightBoardHeightFractionOfViewport: CGFloat = 0.68
    /// Estimated top-bar + portrait-strip height used by packing math / preflight.
    static var estimatedFightChromeHeight: CGFloat {
        // Leave / phase bar ≈34 + spacing + banner (art + pad) + spacing under strip.
        34 + maxFightChromeBoardSpacing + (fightPortraitArtSize + 24) + maxFightChromeBoardSpacing
    }

    // MARK: - Transparent UI chrome (power icons)

    /// Catalog imagesets that must keep true alpha (no opaque card-stock background).
    static let transparentUICatalogNames: [String] = [
        "world2_plink_power_icon_refresh",
        "world2_plink_power_icon_fire",
        "world2_plink_power_icon_split",
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

    // MARK: - Climb intro camera

    /// Hold on summit / boss before panning (~3.7s so the boss portrait reads).
    static let climbIntroSettleSeconds: TimeInterval = 3.7
    /// Ease pan from boss → player (kid-readable “look how far”).
    static let climbIntroPanSeconds: TimeInterval = 4.0
    /// Player node ends centered in the scroll viewport.
    static let climbIntroPlayerScrollAnchorY: CGFloat = 0.5

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

    /// Board pane under chrome: largest 4:3 height ÷ full viewport height.
    /// Compact chrome raises this; a tall dead band under portraits lowers it.
    static func fightBoardHeightFractionOfViewport(
        _ viewport: CGSize,
        chromeHeight: CGFloat = estimatedFightChromeHeight
    ) -> CGFloat {
        guard viewport.width > 1, viewport.height > 1 else { return 0 }
        let pane = CGSize(
            width: viewport.width,
            height: max(1, viewport.height - chromeHeight)
        )
        let fitted = MarbleVoyagePlateLayout.fitSize(in: pane)
        return fitted.height / viewport.height
    }

    static func isAcceptableFightBoardPacking(in viewport: CGSize) -> Bool {
        fightBoardHeightFractionOfViewport(viewport) >= minFightBoardHeightFractionOfViewport
    }
}
