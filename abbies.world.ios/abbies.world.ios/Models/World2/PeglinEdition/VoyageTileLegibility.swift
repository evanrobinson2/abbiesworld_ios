import CoreGraphics
import Foundation

/// Shared contract for climb / fight tiles and trays.
/// Layout code asks this whether a tile is fully legible — tests fail before playtest.
enum VoyageTileLegibility {

    /// Square-frame art must cover at least this fraction of the tile (area).
    static let minPortraitFill: CGFloat = 0.78
    /// Inset around chart art. 0.04 → art edge is 92% of the tile.
    static let chartArtInsetFraction: CGFloat = 0.04
    /// Stat values never drop below this before we call them illegible.
    static let minStatFont: CGFloat = 15
    /// Closed chart handle size (bottom-trailing — must clear Abbie’s tray).
    static let chartHandleSize = CGSize(width: 168, height: 44)
    static let dockInset: CGFloat = 16

    struct Failure: Equatable, Sendable {
        var code: String
        var message: String
    }

    struct Report: Equatable, Sendable {
        var failures: [Failure]
        var ok: Bool { failures.isEmpty }
    }

    struct AbbieTrayPlan: Equatable, Sendable {
        var cardWidth: CGFloat
        /// Stats drop to their own row so digits never squeeze into a column.
        var twoRow: Bool
        var report: Report
    }

    /// Black-rounded width estimate (same factor as foe-name checks).
    static func estimatedTextWidth(_ text: String, fontSize: CGFloat) -> CGFloat {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, fontSize > 0 else { return 0 }
        return CGFloat(trimmed.count) * fontSize * 0.62
    }

    /// True when `text` fits one line at `fontSize`, optionally after `minScale`.
    static func textFitsOneLine(
        _ text: String,
        fontSize: CGFloat,
        width: CGFloat,
        minScale: CGFloat = 1
    ) -> Bool {
        guard width > 8, fontSize > 4 else { return false }
        let need = estimatedTextWidth(text, fontSize: fontSize * minScale)
        return need <= width
    }

    static func statPillWidth(title: String, value: String, valueFont: CGFloat) -> CGFloat {
        let titleW = estimatedTextWidth(title, fontSize: max(11, valueFont * 0.7))
        let valueW = estimatedTextWidth(value, fontSize: valueFont)
        return titleW + valueW + 8 + 20
    }

    /// Area of a fitted image inside a square frame (1 = no letterbox).
    /// `fill` always returns 1 (crop). `fit` letterboxes the long axis.
    static func portraitFillFraction(imageAspect: CGFloat, croppedToSquare: Bool) -> CGFloat {
        if croppedToSquare { return 1 }
        let aspect = max(0.05, imageAspect)
        return aspect >= 1 ? 1 / aspect : aspect
    }

    /// Tall plates must be face-cropped. Square busts may fit if they still fill the tile.
    static func chartPortraitIsLegible(imageAspect: CGFloat, usesFaceCrop: Bool) -> Bool {
        portraitFillFraction(imageAspect: imageAspect, croppedToSquare: usesFaceCrop) >= minPortraitFill
    }

    /// Art edge length as a fraction of the tile. Rejects the old 0.72 inset that left a dead ring.
    static func chartArtEdgeFraction() -> CGFloat {
        1 - chartArtInsetFraction * 2
    }

    static func abbieTrayPlan(
        viewportWidth: CGFloat,
        hpText: String,
        levelText: String,
        coinsText: String,
        stance: String,
        portrait: CGFloat = 72
    ) -> AbbieTrayPlan {
        let maxCard = min(
            MarbleVoyageDesignRules.climbAbbieCardMaxWidth,
            max(220, viewportWidth - dockInset * 2)
        )
        let valueFont = minStatFont + 1
        let pills = [
            statPillWidth(title: "HP", value: hpText, valueFont: valueFont),
            statPillWidth(title: "LV", value: levelText, valueFont: valueFont),
            statPillWidth(title: "COINS", value: coinsText, valueFont: valueFont),
        ]
        let pillRow = pills.reduce(0, +) + 12
        let stanceW = estimatedTextWidth(stance, fontSize: 22 * 0.7)
        let identity = portrait + 14 + max(stanceW, 96)
        let oneRow = identity + 14 + pillRow + 24

        var failures: [Failure] = []
        for (label, text) in [("HP", hpText), ("LV", levelText), ("COINS", coinsText)] {
            let need = estimatedTextWidth(text, fontSize: minStatFont)
            // A column narrower than the string is the stacked-digit bug.
            if need > maxCard {
                failures.append(Failure(
                    code: "abbie.stat.\(label)",
                    message: "\(label) “\(text)” cannot fit the Abbie tray on one line"
                ))
            }
        }
        if !textFitsOneLine(stance, fontSize: 22, width: maxCard - portrait - 48, minScale: 0.7) {
            failures.append(Failure(
                code: "abbie.stance",
                message: "Stance “\(stance)” does not fit beside the portrait"
            ))
        }

        if oneRow <= maxCard {
            return AbbieTrayPlan(
                cardWidth: max(280, oneRow),
                twoRow: false,
                report: Report(failures: failures)
            )
        }
        let twoRowWidth = max(identity + 24, pillRow + 24)
        if twoRowWidth > viewportWidth - dockInset * 2 {
            failures.append(Failure(
                code: "abbie.overflow",
                message: "Abbie tray is wider than the viewport"
            ))
        }
        return AbbieTrayPlan(
            cardWidth: min(maxCard, max(280, twoRowWidth)),
            twoRow: true,
            report: Report(failures: failures)
        )
    }

    static func abbieCardFrame(viewport: CGSize, plan: AbbieTrayPlan) -> CGRect {
        let height: CGFloat = plan.twoRow ? 132 : 92
        let width = min(plan.cardWidth, viewport.width - dockInset * 2)
        return CGRect(
            x: dockInset,
            y: viewport.height - dockInset - height,
            width: width,
            height: height
        )
    }

    static func chartHandleFrame(viewport: CGSize) -> CGRect {
        CGRect(
            x: viewport.width - dockInset - chartHandleSize.width,
            y: viewport.height - dockInset - chartHandleSize.height,
            width: chartHandleSize.width,
            height: chartHandleSize.height
        )
    }

    /// Abbie’s tray and the closed chart handle must both be fully on screen and not cover each other.
    static func abbieTrayClearsChartHandle(
        viewport: CGSize,
        hpText: String = "120/120",
        levelText: String = "1",
        coinsText: String = "0",
        stance: String = "Heavy Hands"
    ) -> Report {
        let plan = abbieTrayPlan(
            viewportWidth: viewport.width,
            hpText: hpText,
            levelText: levelText,
            coinsText: coinsText,
            stance: stance
        )
        var failures = plan.report.failures
        let card = abbieCardFrame(viewport: viewport, plan: plan)
        let handle = chartHandleFrame(viewport: viewport)
        let bounds = CGRect(origin: .zero, size: viewport)
        if !bounds.contains(card) {
            failures.append(Failure(code: "abbie.offscreen", message: "Abbie tray is clipped by the viewport"))
        }
        if !bounds.contains(handle) {
            failures.append(Failure(code: "chartHandle.offscreen", message: "Chart handle is clipped by the viewport"))
        }
        let gap = card.insetBy(dx: -8, dy: -8)
        if gap.intersects(handle) {
            failures.append(Failure(
                code: "abbie.overlapsHandle",
                message: "Abbie tray overlaps the chart handle"
            ))
        }
        return Report(failures: failures)
    }
}
