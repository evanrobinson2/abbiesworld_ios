//
//  GeneratedImage.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//

import Foundation

struct GeneratedImage: Codable, Identifiable, Equatable {
    let url: String
    let filename: String
    let createdAt: TimeInterval
    let prompt: String?
    let recipeItems: [RecipeItem]?
    let deleted: Bool?
    let isFavorite: Bool? // Server-provided favorite status
    
    // Computed property to determine if this is a partial image
    // Partial images have "_partial.png" in filename, null prompt, or empty recipeItems
    var isPartial: Bool {
        return filename.contains("_partial.png") || 
               (prompt == nil && (recipeItems == nil || recipeItems?.isEmpty == true))
    }
    
    var id: String { filename }
    
    enum CodingKeys: String, CodingKey {
        case url
        case filename
        case createdAt = "created_at"
        case prompt
        case recipeItems = "recipe_items"
        case deleted
        case isFavorite = "favorite" // Server uses "favorite" field
    }
}

struct HealthResponse: Codable {
    let status: String
    let service: String?
}
