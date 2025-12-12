//
//  CarouselConfig.swift
//  SwiftCarousel
//
//  Created by Evan Robinson on 12/11/25.
//

import SwiftUI

struct CarouselConfig {
    // Layout
    var tileWidth: CGFloat = 160
    var tileHeight: CGFloat = 160
    var tileSpacing: CGFloat = 16
    var horizontalPadding: CGFloat = 16
    var verticalPadding: CGFloat = 0
    var cornerRadius: CGFloat = 8
    
    // Selection styling
    var selectionBorderColor: Color = .blue
    var selectionBorderWidth: CGFloat = 3
    var selectionScaleFactor: CGFloat = 1.05
    var pulseAmplitude: CGFloat = 0.05  // Increased from 0.02 for more visible pulse
    var pulseDuration: TimeInterval = 0.8  // Decreased from 1.5 for faster pulse
    
    static func `default`() -> CarouselConfig {
        CarouselConfig()
    }
}

