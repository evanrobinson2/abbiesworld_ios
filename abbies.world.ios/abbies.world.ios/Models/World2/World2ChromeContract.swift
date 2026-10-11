//
//  World2ChromeContract.swift
//  abbies.world.ios
//
//  Fixed frames for the scene title, the debug QR, and the Open ground badge.
//  Same view size always yields the same rect. Long copy is cut with "...".
//

import CoreGraphics
import Foundation

enum World2ChromeContract {
    /// Scene header. The QR is glued to its right edge and does not move
    /// when the place name changes.
    static let titleLeading: CGFloat = 18
    static let titleTop: CGFloat = 6
    /// Narrower chip so the left tool rail / character tile never sit under the banner.
    static let titleSlot = CGSize(width: 248, height: 64)
    static let qrGap: CGFloat = 8
    static let qrSize = CGSize(width: 176, height: 72)

    static let titleBudget = 18
    static let placeTitleBudget = 16
    static let sceneLabelBudget = 26
    static let qrTitleBudget = 16
    static let qrTokenBudget = 18
    /// Tray / inventory prop names — keep chips short so art stays primary.
    static let decorationBudget = 12

    /// Injects "..." when `text` is longer than `budget` characters.
    static func ellipsized(_ text: String, budget: Int) -> String {
        let clean = text
            .replacingOccurrences(of: "\n", with: " ")
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
        guard budget > 3 else { return "..." }
        guard clean.count > budget else { return clean }
        return String(clean.prefix(budget - 3)) + "..."
    }

    /// Prefer a short invent label: first 1–2 words, then hard budget.
    static func shortDecorationLabel(_ text: String, budget: Int = decorationBudget) -> String {
        let clean = text
            .replacingOccurrences(of: "\n", with: " ")
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
        guard !clean.isEmpty else { return "Prop" }
        let words = clean.split(separator: " ")
        let clipped: String
        if words.count >= 2, words[0].count + words[1].count + 1 <= budget {
            clipped = "\(words[0]) \(words[1])"
        } else {
            clipped = String(words[0])
        }
        return ellipsized(clipped, budget: budget)
    }

    static func qrFrame(in bounds: CGRect) -> CGRect {
        CGRect(
            x: bounds.minX + titleLeading + titleSlot.width + qrGap,
            y: bounds.minY + titleTop,
            width: qrSize.width,
            height: qrSize.height
        )
    }

    /// Header origin. Size never depends on the copy.
    static func headerFrame(in bounds: CGRect) -> CGRect {
        CGRect(
            x: bounds.minX + titleLeading,
            y: bounds.minY + titleTop,
            width: titleSlot.width,
            height: titleSlot.height
        )
    }
}
