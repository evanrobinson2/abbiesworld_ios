//
//  PackRowView.swift
//  abbies.world.ios
//
//  Generic carousel row view that renders from server manifest data.
//  Per CLIENT_MEDIA_PACK_CONTRACT_V1 - no hardcoded pack-specific views.
//

import SwiftUI

struct PackRowView: View {
    let row: PackRow
    let manifest: PackManifest
    @Binding var selectedItemId: String?
    let onItemSelected: (PackItem) -> Void
    
    var customTileSize: CGFloat? = nil
    
    @StateObject private var imageLoader = PackRowImageLoader()
    
    private var carouselItems: [CarouselItem] {
        row.items.map { item in
            CarouselItem(
                id: item.itemId,
                imageName: nil,
                imageURL: item.thumbnail.url,
                displayName: item.name,
                shortDescription: nil
            )
        }
    }
    
    private var selectedIndexBinding: Binding<Int?> {
        Binding(
            get: {
                guard let selectedId = selectedItemId else { return nil }
                return row.items.firstIndex { $0.itemId == selectedId }
            },
            set: { newValue in
                if let index = newValue, index >= 0 && index < row.items.count {
                    selectedItemId = row.items[index].itemId
                } else {
                    selectedItemId = nil
                }
            }
        )
    }
    
    private var carouselConfig: CarouselConfig {
        var config = CarouselConfig.default()
        let tileSize = customTileSize ?? 280
        config.tileWidth = tileSize
        config.tileHeight = tileSize
        config.horizontalPadding = 20
        
        if let chrome = manifest.chrome {
            if let borderColor = chrome.borderColor {
                config.selectionBorderColor = Color(hex: borderColor) ?? .blue
            }
            switch chrome.tileStyle?.lowercased() {
            case "sticker", "halloween":
                config.tileChrome = .halloweenSticker
            case "animal", "animalsticker":
                config.tileChrome = .animalSticker
            default:
                config.tileChrome = .plain
            }
        } else {
            config.tileSpacing = 16
            config.cornerRadius = 8
            config.selectionBorderColor = .blue
            config.tileChrome = .plain
        }
        
        return config
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(row.label)
                .font(.headline)
                .foregroundColor(.white)
                .padding(.horizontal)
                .accessibilityLabel(row.accessibilityLabel ?? row.label)
            
            Carousel(
                items: carouselItems,
                selectedIndex: selectedIndexBinding,
                config: carouselConfig,
                onSelect: { carouselItem in
                    if let item = row.items.first(where: { $0.itemId == carouselItem.id }) {
                        selectedItemId = item.itemId
                        onItemSelected(item)
                    }
                }
            )
        }
    }
}

@MainActor
class PackRowImageLoader: ObservableObject {
    @Published var loadedImages: [String: UIImage] = [:]
    
    private let packManager = MediaPackManager.shared
    
    func loadImages(for row: PackRow) async {
        for item in row.items {
            if loadedImages[item.itemId] == nil {
                if let image = await packManager.loadThumbnail(for: item) {
                    loadedImages[item.itemId] = image
                }
            }
        }
    }
}

// MARK: - Pack Content View (Full manifest rendering)

struct PackContentView: View {
    let manifest: PackManifest
    @Binding var selections: [String: String]
    let onSelectionChanged: () -> Void
    
    var customTileSize: CGFloat? = nil
    
    var body: some View {
        VStack(spacing: 16) {
            ForEach(manifest.rows) { row in
                PackRowView(
                    row: row,
                    manifest: manifest,
                    selectedItemId: binding(for: row.rowId),
                    onItemSelected: { item in
                        selections[row.rowId] = item.itemId
                        onSelectionChanged()
                    },
                    customTileSize: customTileSize
                )
            }
        }
    }
    
    private func binding(for rowId: String) -> Binding<String?> {
        Binding(
            get: { selections[rowId] },
            set: { newValue in
                if let value = newValue {
                    selections[rowId] = value
                } else {
                    selections.removeValue(forKey: rowId)
                }
            }
        )
    }
}

// MARK: - Selection State Helper

struct PackSelectionState {
    var selections: [String: String] = [:]
    
    func isComplete(for manifest: PackManifest) -> Bool {
        for row in manifest.rows {
            if row.minimumSelections > 0 {
                guard let itemId = selections[row.rowId],
                      row.items.contains(where: { $0.itemId == itemId }) else {
                    return false
                }
            }
        }
        return true
    }
    
    func validationErrors(for manifest: PackManifest) -> [String: String] {
        var errors: [String: String] = [:]
        
        for row in manifest.rows {
            if row.minimumSelections > 0 && selections[row.rowId] == nil {
                errors[row.rowId] = "Selection required"
            }
        }
        
        return errors
    }
    
    mutating func reset() {
        selections.removeAll()
    }
}
