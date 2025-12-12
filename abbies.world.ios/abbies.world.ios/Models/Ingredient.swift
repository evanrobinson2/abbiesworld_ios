//
//  Ingredient.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//

import Foundation

struct Ingredient: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let category: String
    let styleInjection: String
    let imageURL: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case category
        case styleInjection = "style_injection"
        case imageURL = "image_url"
    }
}
