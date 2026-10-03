//
//  RecipeItem.swift
//  My First Swift
//
//  Created by Evan Robinson on 12/9/25.
//

import Foundation

struct RecipeItem: Codable, Identifiable, Equatable {
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
    /// `low` is the fast kid path (gpt-image-2.5-flare). Omitted unless set.
    var quality: String? = nil
    /// Image model id, e.g. `gpt-image-2.5-flare`. Omitted unless set.
    var imageModel: String? = nil
    var imageWidth: Int? = nil
    var imageHeight: Int? = nil

    enum CodingKeys: String, CodingKey {
        case recipeItems
        case freeTextDescription
        case referenceImageIds
        case quality
        case imageModel = "model"
        case imageWidth
        case imageHeight
    }

    init(
        recipeItems: [RecipeItem],
        freeTextDescription: String?,
        referenceImageIds: [String]?,
        quality: String? = nil,
        imageModel: String? = nil,
        imageWidth: Int? = nil,
        imageHeight: Int? = nil
    ) {
        self.recipeItems = recipeItems
        self.freeTextDescription = freeTextDescription
        self.referenceImageIds = referenceImageIds
        self.quality = quality
        self.imageModel = imageModel
        self.imageWidth = imageWidth
        self.imageHeight = imageHeight
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        recipeItems = try container.decode([RecipeItem].self, forKey: .recipeItems)
        freeTextDescription = try container.decodeIfPresent(String.self, forKey: .freeTextDescription)
        referenceImageIds = try container.decodeIfPresent([String].self, forKey: .referenceImageIds)
        quality = try container.decodeIfPresent(String.self, forKey: .quality)
        imageModel = try container.decodeIfPresent(String.self, forKey: .imageModel)
        imageWidth = try container.decodeIfPresent(Int.self, forKey: .imageWidth)
        imageHeight = try container.decodeIfPresent(Int.self, forKey: .imageHeight)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(recipeItems, forKey: .recipeItems)
        try container.encodeIfPresent(freeTextDescription, forKey: .freeTextDescription)
        try container.encodeIfPresent(referenceImageIds, forKey: .referenceImageIds)
        try container.encodeIfPresent(quality, forKey: .quality)
        try container.encodeIfPresent(imageModel, forKey: .imageModel)
        try container.encodeIfPresent(imageWidth, forKey: .imageWidth)
        try container.encodeIfPresent(imageHeight, forKey: .imageHeight)
    }
}
