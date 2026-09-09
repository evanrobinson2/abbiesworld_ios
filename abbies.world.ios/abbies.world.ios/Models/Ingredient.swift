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
    let imageName: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case category
        case styleInjection = "style_injection"
        case imageURL = "image_url"
        case imageName = "image_name"
    }
    
    init(
        id: String,
        name: String,
        category: String,
        styleInjection: String,
        imageURL: String?,
        imageName: String? = nil
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.styleInjection = styleInjection
        self.imageURL = imageURL
        self.imageName = imageName
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        category = try container.decode(String.self, forKey: .category)
        styleInjection = try container.decodeIfPresent(String.self, forKey: .styleInjection) ?? ""
        imageURL = try container.decodeIfPresent(String.self, forKey: .imageURL)
        imageName = try container.decodeIfPresent(String.self, forKey: .imageName)
    }
}
