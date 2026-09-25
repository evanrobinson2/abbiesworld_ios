//
//  ServerMediaPack.swift
//  abbies.world.ios
//
//  Server-managed media pack models per CLIENT_MEDIA_PACK_CONTRACT_V1.
//

import Foundation

// MARK: - Pack Index Response

struct PackIndexResponse: Codable {
    let packs: [PackIndexEntry]
}

struct PackIndexEntry: Codable, Identifiable {
    let packId: String
    let displayName: String
    let version: Int
    let manifestChecksum: String
    let availability: PackAvailability?
    let compatibility: PackCompatibility?
    let requiredCapabilities: [String]?
    
    var id: String { packId }
    
    enum CodingKeys: String, CodingKey {
        case packId = "pack_id"
        case displayName = "display_name"
        case version
        case manifestChecksum = "manifest_checksum"
        case availability
        case compatibility
        case requiredCapabilities = "required_capabilities"
    }
}

struct PackAvailability: Codable {
    let isAvailable: Bool
    let startDate: Date?
    let endDate: Date?
    
    enum CodingKeys: String, CodingKey {
        case isAvailable = "is_available"
        case startDate = "start_date"
        case endDate = "end_date"
    }
}

struct PackCompatibility: Codable {
    let minAppVersion: String?
    let minIOSVersion: String?
    
    enum CodingKeys: String, CodingKey {
        case minAppVersion = "min_app_version"
        case minIOSVersion = "min_ios_version"
    }
}

// MARK: - Pack Manifest

struct PackManifest: Codable, Identifiable {
    let packId: String
    let version: Int
    let manifestChecksum: String
    let displayName: String
    let kidLabel: String?
    let symbolName: String?
    let rows: [PackRow]
    let background: PackAsset?
    let music: [PackMusicTrack]?
    let chrome: PackChrome?
    
    var id: String { packId }
    
    enum CodingKeys: String, CodingKey {
        case packId = "pack_id"
        case version
        case manifestChecksum = "manifest_checksum"
        case displayName = "display_name"
        case kidLabel = "kid_label"
        case symbolName = "symbol_name"
        case rows
        case background
        case music
        case chrome
    }
}

struct PackRow: Codable, Identifiable {
    let rowId: String
    let label: String
    let accessibilityLabel: String?
    let spokenCue: String?
    let minimumSelections: Int
    let maximumSelections: Int
    let items: [PackItem]
    
    var id: String { rowId }
    
    enum CodingKeys: String, CodingKey {
        case rowId = "row_id"
        case label
        case accessibilityLabel = "accessibility_label"
        case spokenCue = "spoken_cue"
        case minimumSelections = "minimum_selections"
        case maximumSelections = "maximum_selections"
        case items
    }
}

struct PackItem: Codable, Identifiable {
    let itemId: String
    let name: String
    let accessibilityLabel: String?
    let spokenCue: String?
    let thumbnail: PackAsset
    let reference: PackAsset?
    
    var id: String { itemId }
    
    enum CodingKeys: String, CodingKey {
        case itemId = "item_id"
        case name
        case accessibilityLabel = "accessibility_label"
        case spokenCue = "spoken_cue"
        case thumbnail
        case reference
    }
}

struct PackAsset: Codable {
    let url: String
    let checksum: String
    
    enum CodingKeys: String, CodingKey {
        case url
        case checksum
    }
}

struct PackMusicTrack: Codable, Identifiable {
    let trackId: String
    let name: String
    let url: String
    let checksum: String
    let durationSeconds: Double?
    
    var id: String { trackId }
    
    enum CodingKeys: String, CodingKey {
        case trackId = "track_id"
        case name
        case url
        case checksum
        case durationSeconds = "duration_seconds"
    }
}

struct PackChrome: Codable {
    let style: String?
    let borderColor: String?
    let backgroundColor: String?
    let tileStyle: String?
    
    enum CodingKeys: String, CodingKey {
        case style
        case borderColor = "border_color"
        case backgroundColor = "background_color"
        case tileStyle = "tile_style"
    }
}

// MARK: - Pack Generation Request

struct PackGenerationRequest: Codable {
    let packId: String
    let packVersion: Int
    let packManifestChecksum: String
    let packSelections: [PackSelection]
    let freeTextDescription: String?
    let imageWidth: Int
    let imageHeight: Int
    
    enum CodingKeys: String, CodingKey {
        case packId = "packId"
        case packVersion = "packVersion"
        case packManifestChecksum = "packManifestChecksum"
        case packSelections = "packSelections"
        case freeTextDescription = "freeTextDescription"
        case imageWidth = "imageWidth"
        case imageHeight = "imageHeight"
    }
}

struct PackSelection: Codable {
    let rowId: String
    let itemId: String
}

// MARK: - Generation Response Media Pack Info

struct MediaPackResponseInfo: Codable {
    let packId: String
    let packVersion: Int
    let packVersionId: String?
    let manifestChecksum: String
    let selections: [PackSelection]
    let referenceAssetIds: [String]?
}

// MARK: - Convenience Extensions

extension PackManifest {
    func row(for rowId: String) -> PackRow? {
        rows.first { $0.rowId == rowId }
    }
    
    var usesFourCarousels: Bool {
        rows.count >= 4
    }
    
    var friendRow: PackRow? { rows.first }
    var outfitRow: PackRow? { rows.count > 1 ? rows[1] : nil }
    var placeRow: PackRow? { rows.count > 2 ? rows[2] : nil }
    var styleRow: PackRow? { rows.count > 3 ? rows[3] : nil }
}

extension PackItem {
    func asIngredient(packId: String, rowId: String) -> Ingredient {
        Ingredient(
            id: itemId,
            name: name,
            category: rowId,
            styleInjection: "",
            imageURL: thumbnail.url
        )
    }
}
