//
//  Color+Hex.swift
//  My First Swift
//
//  Created by AI Assistant
//

import SwiftUI

extension Color {
    init?(hex: String) {
        // Remove # if present and any whitespace
        var hex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hex.hasPrefix("#") {
            hex = String(hex.dropFirst())
        }
        
        // Validate hex string (only 0-9, A-F, a-f)
        let hexChars = CharacterSet(charactersIn: "0123456789ABCDEFabcdef")
        guard hex.rangeOfCharacter(from: hexChars.inverted) == nil else {
            print("⚠️ Color(hex:): Invalid hex characters in '\(hex)'")
            return nil
        }
        
        var int: UInt64 = 0
        guard Scanner(string: hex).scanHexInt64(&int) else {
            print("⚠️ Color(hex:): Scanner failed to parse '\(hex)'")
            return nil
        }
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            return nil
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

