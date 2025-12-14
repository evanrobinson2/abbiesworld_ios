//
//  ViewMode.swift
//  abbies.world.ios
//
//  View mode enum for different main view layouts
//

import Foundation

enum ViewMode: String, Codable {
    case `default` = "default"
    case fourCarousel = "fourCarousel"
    
    var displayName: String {
        switch self {
        case .default:
            return "Default"
        case .fourCarousel:
            return "4 Carousels"
        }
    }
}

