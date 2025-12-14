//
//  CarouselItem.swift
//  SwiftCarousel
//
//  Created by Evan Robinson on 12/11/25.
//

import SwiftUI

struct CarouselItem: Identifiable {
    let id: String
    let imageName: String?      // Optional: for bundle-based images
    let imageURL: String?       // Optional: for URL-based images
    let displayName: String
    let shortDescription: String? // Optional: short description (1-4 words) for placeholder tiles
    
    // Convenience initializer for bundle-based images (backward compatible)
    init(id: String, imageName: String, displayName: String, shortDescription: String? = nil) {
        self.id = id
        self.imageName = imageName
        self.imageURL = nil
        self.displayName = displayName
        self.shortDescription = shortDescription
    }
    
    // Initializer for URL-based images
    init(id: String, imageURL: String, displayName: String, shortDescription: String? = nil) {
        self.id = id
        self.imageName = nil
        self.imageURL = imageURL
        self.displayName = displayName
        self.shortDescription = shortDescription
    }
    
    // Full initializer for both (URL takes precedence)
    init(id: String, imageName: String? = nil, imageURL: String? = nil, displayName: String, shortDescription: String? = nil) {
        self.id = id
        self.imageName = imageName
        self.imageURL = imageURL
        self.displayName = displayName
        self.shortDescription = shortDescription
    }
    
    static func sampleItems(count: Int = 15) -> [CarouselItem] {
        let imageNames = [
            "01_star_puppy",
            "02_star_kitten",
            "03_star_bunny",
            "04_star_duckling",
            "05_star_teddy",
            "06_rainbow_party_dress",
            "07_rainbow_hoodie",
            "08_rainbow_jeans_shirt",
            "09_rainbow_suit",
            "10_rainbow_wedding_dress",
            "11_cotton_candy_shop",
            "12_cotton_playground_slide",
            "13_cotton_castle_gate",
            "14_cotton_picnic_blanket",
            "15_cotton_treehouse"
        ]
        
        return (0..<min(count, imageNames.count)).map { index in
            CarouselItem(
                id: "item_\(index)",
                imageName: imageNames[index],
                displayName: imageNames[index].replacingOccurrences(of: "_", with: " ").capitalized
            )
        }
    }
}

