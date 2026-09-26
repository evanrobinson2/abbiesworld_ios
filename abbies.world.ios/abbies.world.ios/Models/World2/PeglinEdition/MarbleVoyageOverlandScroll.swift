import CoreGraphics
import Foundation

// MARK: - Generic overland chart tour
//
// Map orientation: summit / boss at the TOP of the screen; Abbie docks at the BOTTOM
// and climbs UP. Cast intro starts on the boss (frame 0) and scrubs down toward Abbie.

enum MarbleVoyageOverlandScroll {

    /// How tiles are walked during the cast intro (frame order).
    enum CastOrder: String, CaseIterable, Sendable {
        /// Every fight, high column first (boss at top) → Abbie’s dock. Preferred.
        case bossToAbbie
        /// Summit first, then land bosses only (high→low).
        case summitThenLandsDescending
        /// Land bosses high→low, summit last.
        case landsDescendingThenSummit

        /// @available(*, deprecated, renamed: "bossToAbbie")
        static let topToBottom = CastOrder.bossToAbbie
        /// @available(*, deprecated, renamed: "bossToAbbie")
        static let climbAscending = CastOrder.bossToAbbie
    }

    struct Stop: Equatable, Sendable {
        var nodeID: String
        var pointY: CGFloat
        var focusAnchorY: CGFloat
        var card: Card?
    }

    struct Card: Equatable, Sendable {
        var name: String
        var role: String
        var roleKind: MarbleVoyageGangFightRole
        var blurb: String
        var stageTitle: String
        var hp: Int
        var atk: Int
        var threat: Int
        var kind: PlinkAttackerKind?
    }

    static func cameraOffset(
        centering pointY: CGFloat,
        viewportHeight: CGFloat,
        maxOffset: CGFloat,
        anchorY: CGFloat
    ) -> CGFloat {
        let raw = pointY - viewportHeight * anchorY
        return min(max(0, raw), maxOffset)
    }

    /// Which edge the foe card should hug so it does not cover the focused tile.
    enum CardDock: String, Sendable {
        case leading
        case trailing
    }

    /// True when a foe name can sit on one line at `fontSize` inside `availableWidth`
    /// (black rounded approx). Used to catch MORRO̸W wrap regressions.
    static func foeNameFitsOneLine(
        _ name: String,
        fontSize: CGFloat,
        availableWidth: CGFloat
    ) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !trimmed.isEmpty, availableWidth > 8, fontSize > 4 else { return true }
        // Black rounded caps are wide — ~0.62em average; leave a little pad.
        let estimated = CGFloat(trimmed.count) * fontSize * 0.62
        return estimated <= availableWidth
    }

    /// Prefer the side opposite the focused tile’s X (chart / viewport space).
    static func preferredCardDock(
        focusX: CGFloat,
        contentWidth: CGFloat
    ) -> CardDock {
        guard contentWidth > 1 else { return .trailing }
        return focusX < contentWidth * 0.5 ? .trailing : .leading
    }

    /// Axis-aligned card rect in viewport coords (top-leading origin).
    static func cardRect(
        dock: CardDock,
        viewport: CGSize,
        cardSize: CGSize = CGSize(
            width: MarbleVoyageDesignRules.climbFoeCardMaxWidth,
            height: MarbleVoyageDesignRules.climbFoeCardEstimateHeight
        ),
        leadingPad: CGFloat = 22,
        trailingPad: CGFloat = 22,
        topPad: CGFloat = 120
    ) -> CGRect {
        let x: CGFloat
        switch dock {
        case .leading:
            x = leadingPad
        case .trailing:
            x = viewport.width - trailingPad - cardSize.width
        }
        return CGRect(x: x, y: topPad, width: cardSize.width, height: cardSize.height)
    }

    /// Focused tile rect in viewport coords given camera offset (content Y → viewport).
    static func focusedTileRectInViewport(
        contentPoint: CGPoint,
        tileSize: CGFloat,
        cameraOffsetY: CGFloat
    ) -> CGRect {
        let viewY = contentPoint.y - cameraOffsetY
        return CGRect(
            x: contentPoint.x - tileSize * 0.5,
            y: viewY - tileSize * 0.5,
            width: tileSize,
            height: tileSize
        )
    }

    /// True when the foe card would cover the focused chart tile (useful map art).
    static func cardOccludesFocusedTile(
        card: CGRect,
        tile: CGRect,
        minClearance: CGFloat = MarbleVoyageDesignRules.climbFoeCardMinClearance
    ) -> Bool {
        let inflated = tile.insetBy(dx: -minClearance, dy: -minClearance)
        return card.intersects(inflated)
    }

    /// Tour nodes in cast / scrub order.
    static func orderedTourNodes(
        from nodes: [MarbleVoyageNode],
        order: CastOrder
    ) -> [MarbleVoyageNode] {
        let fights = nodes.filter { $0.kind == .fight || $0.kind == .boss }
        let bosses = fights.filter {
            let role = resolvedRole(for: $0)
            return role == .bigBoss || role == .miniBoss
        }
        let lands = bosses
            .filter { resolvedRole(for: $0) == .miniBoss }
            .sorted { $0.column > $1.column }
        let summit = bosses.first { resolvedRole(for: $0) == .bigBoss }

        switch order {
        case .bossToAbbie:
            // High column (summit / top of screen) → low column (dock / bottom).
            return fights.sorted { ($0.column, $0.row) > ($1.column, $1.row) }
        case .summitThenLandsDescending:
            return [summit].compactMap { $0 } + lands
        case .landsDescendingThenSummit:
            return lands + [summit].compactMap { $0 }
        }
    }

    static func makeCastStops(
        run: MarbleVoyageRun,
        positions: [String: CGPoint],
        order: CastOrder,
        fighterKind: (MarbleVoyageNode) -> PlinkAttackerKind?,
        focusAnchorY: CGFloat = MarbleVoyageDesignRules.climbRevealFocusAnchorY
    ) -> [Stop] {
        orderedTourNodes(from: run.nodes, order: order).compactMap { node in
            guard let fighter = fighterKind(node),
                  let point = positions[node.id]
            else { return nil }
            let role = resolvedRole(for: node)
            return Stop(
                nodeID: node.id,
                pointY: point.y,
                focusAnchorY: focusAnchorY,
                card: Card(
                    name: fighter.shortName,
                    role: roleLabel(for: role),
                    roleKind: role,
                    blurb: fighter.castBlurb,
                    stageTitle: node.title,
                    hp: run.enemyMaxHP(for: node),
                    atk: run.enemyAttack(for: node),
                    threat: node.threat,
                    kind: fighter
                )
            )
        }
    }

    private static func resolvedRole(for node: MarbleVoyageNode) -> MarbleVoyageGangFightRole {
        node.gangRole ?? (node.kind == .boss ? .bigBoss : .henchman)
    }

    private static func roleLabel(for role: MarbleVoyageGangFightRole) -> String {
        switch role {
        case .bigBoss: return "SUMMIT BOSS"
        case .miniBoss: return "LAND BOSS"
        case .henchman: return "FIGHT"
        }
    }
}
