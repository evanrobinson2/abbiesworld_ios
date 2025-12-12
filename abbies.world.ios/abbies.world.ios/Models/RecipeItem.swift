//
//  RecipeItem.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//

import Foundation

struct RecipeItem: Codable, Identifiable {
    let id: String
    let slotIndex: Int?  // Optional to match API (can be null)
    
    enum CodingKeys: String, CodingKey {
        case id
        case slotIndex = "slot_index"  // API returns snake_case
    }
}

struct CreateRequest: Codable {
    let recipeItems: [RecipeItem]
    let freeTextDescription: String?
    let referenceImageIds: [String]?
    
    enum CodingKeys: String, CodingKey {
        case recipeItems
        case freeTextDescription
        case referenceImageIds
    }
}
