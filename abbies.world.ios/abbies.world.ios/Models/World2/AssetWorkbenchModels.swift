import Foundation

enum World2AssetWorkbenchContract {
    static let assetClass = "treehouse.generatedDecoration/v1"
    static let candidateCount = 6
    static let selectionCount = 3
}

enum World2WorkbenchIdeaAxis: String, Codable, CaseIterable {
    case finish
    case objectFamily = "object-family"
    case personality

    var title: String {
        switch self {
        case .finish: return "FINISH"
        case .objectFamily: return "WHAT TO MAKE"
        case .personality: return "PERSONALITY"
        }
    }

    var instruction: String {
        switch self {
        case .finish: return "Choose how it feels and shines"
        case .objectFamily: return "Choose a treehouse object family"
        case .personality: return "Choose its imaginative character"
        }
    }
}

struct World2WorkbenchIdeaCard: Codable, Identifiable, Equatable {
    let id: String
    let axis: World2WorkbenchIdeaAxis
    let title: String
    let shortDescription: String
    let symbolName: String
}

enum World2WorkbenchIdeaCatalog {
    static let finishes: [World2WorkbenchIdeaCard] = [
        card("finish.pearlescent", .finish, "Pearlescent", "Soft rainbow shine", "circle.hexagongrid.fill"),
        card("finish.patchwork", .finish, "Patchwork", "Colorful stitched pieces", "square.grid.3x3.fill"),
        card("finish.carved-wood", .finish, "Carved Wood", "Warm sculpted grain", "tree.fill"),
        card("finish.glassy", .finish, "Glassy", "Bright translucent color", "diamond.fill"),
        card("finish.plush", .finish, "Plush", "Soft and huggable", "cloud.fill"),
        card("finish.hand-painted", .finish, "Hand Painted", "Cheerful brush marks", "paintpalette.fill"),
    ]

    static let objectFamilies: [World2WorkbenchIdeaCard] = [
        card("object.furniture", .objectFamily, "Furniture", "A useful room piece", "chair.lounge.fill"),
        card("object.seating", .objectFamily, "Seating", "A cozy place to sit", "sofa.fill"),
        card("object.lighting", .objectFamily, "Lighting", "A magical room light", "lamp.floor.fill"),
        card("object.storage", .objectFamily, "Storage", "A playful place for things", "cabinet.fill"),
        card("object.rug", .objectFamily, "Rug", "A soft floor decoration", "rectangle.pattern.checkered"),
        card("object.wall-decoration", .objectFamily, "Wall Decor", "Something special to hang", "photo.artframe"),
    ]

    static let personalities: [World2WorkbenchIdeaCard] = [
        card("personality.fancy", .personality, "Fancy", "Detailed and celebratory", "crown.fill"),
        card("personality.playful", .personality, "Playful", "Bouncy and surprising", "party.popper.fill"),
        card("personality.dreamy", .personality, "Dreamy", "Cloudlike and magical", "moon.stars.fill"),
        card("personality.cozy", .personality, "Cozy", "Warm and welcoming", "house.and.flag.fill"),
        card("personality.storybook", .personality, "Storybook", "Made for an adventure", "books.vertical.fill"),
        card("personality.botanical", .personality, "Botanical", "Leaves, flowers, and vines", "leaf.fill"),
    ]

    static func cards(for axis: World2WorkbenchIdeaAxis) -> [World2WorkbenchIdeaCard] {
        switch axis {
        case .finish: return finishes
        case .objectFamily: return objectFamilies
        case .personality: return personalities
        }
    }

    static func card(id: String) -> World2WorkbenchIdeaCard? {
        for axis in World2WorkbenchIdeaAxis.allCases {
            if let match = cards(for: axis).first(where: { $0.id == id }) {
                return match
            }
        }
        return nil
    }

    private static func card(
        _ id: String,
        _ axis: World2WorkbenchIdeaAxis,
        _ title: String,
        _ shortDescription: String,
        _ symbolName: String
    ) -> World2WorkbenchIdeaCard {
        .init(
            id: id,
            axis: axis,
            title: title,
            shortDescription: shortDescription,
            symbolName: symbolName
        )
    }
}

struct World2AssetWorkbenchRecipe: Codable, Equatable {
    let assetClass: String
    let finishID: String
    let objectFamilyID: String
    let personalityID: String

    init(finishID: String, objectFamilyID: String, personalityID: String) {
        assetClass = World2AssetWorkbenchContract.assetClass
        self.finishID = finishID
        self.objectFamilyID = objectFamilyID
        self.personalityID = personalityID
    }

    var ideaIDs: [String] {
        [finishID, objectFamilyID, personalityID]
    }

    var displayName: String {
        var titles: [String] = []
        for ideaID in ideaIDs {
            if let title = World2WorkbenchIdeaCatalog.card(id: ideaID)?.title {
                titles.append(title)
            }
        }
        return titles.joined(separator: " · ")
    }

    var isValid: Bool {
        assetClass == World2AssetWorkbenchContract.assetClass
            && World2WorkbenchIdeaCatalog.card(id: finishID)?.axis == .finish
            && World2WorkbenchIdeaCatalog.card(id: objectFamilyID)?.axis == .objectFamily
            && World2WorkbenchIdeaCatalog.card(id: personalityID)?.axis == .personality
    }
}

enum World2WorkbenchPlacementLayer: String, Codable {
    case floor
    case wall
    case hanging

    var homeLayer: HomeLayout.PlacedDecoration.PlacementLayer {
        switch self {
        case .floor:
            return .floor
        case .wall, .hanging:
            return .wall
        }
    }
}

enum World2WorkbenchQualificationState: String, Codable {
    case qualified
    case rejected
    case pending
}

struct World2AssetWorkbenchCandidate: Codable, Identifiable, Equatable {
    let id: String
    let label: String
    let registryKey: String
    let registryRevision: Int
    let sha256: String
    let mimeType: String
    let pixelWidth: Int
    let pixelHeight: Int
    let placementLayer: World2WorkbenchPlacementLayer
    let qualificationState: World2WorkbenchQualificationState
}

struct World2AssetWorkbenchPack: Codable, Identifiable, Equatable {
    let id: String
    let recipe: World2AssetWorkbenchRecipe
    let candidates: [World2AssetWorkbenchCandidate]
    let createdAt: Date

    func validateForPlayerPresentation() throws {
        guard recipe.isValid else {
            throw World2AssetWorkbenchError.invalidRecipe
        }
        guard candidates.count == World2AssetWorkbenchContract.candidateCount,
              Set(candidates.map(\.id)).count == candidates.count,
              candidates.allSatisfy({
                  $0.qualificationState == .qualified
                      && $0.registryRevision > 0
                      && !$0.registryKey.isEmpty
                      && $0.sha256.count == 64
                      && $0.mimeType == "image/png"
                      && $0.pixelWidth > 0
                      && $0.pixelHeight > 0
              }) else {
            throw World2AssetWorkbenchError.unqualifiedPack
        }
    }
}

struct World2GeneratedDecoration: Codable, Identifiable, Equatable {
    let id: String
    let packID: String
    let label: String
    let registryKey: String
    let registryRevision: Int
    let sha256: String
    let placementLayer: World2WorkbenchPlacementLayer
    let recipe: World2AssetWorkbenchRecipe
    let awardedAt: Date
}

extension PlayerState {
    var availableGeneratedDecorations: [World2GeneratedDecoration] {
        generatedDecorations ?? []
    }

    func generatedDecoration(id: String) -> World2GeneratedDecoration? {
        availableGeneratedDecorations.first { $0.id == id }
    }
}

struct World2AssetWorkbenchAward: Codable, Equatable {
    let packID: String
    let decorations: [World2GeneratedDecoration]

    static func make(
        from pack: World2AssetWorkbenchPack,
        selectedCandidateIDs: Set<String>,
        awardedAt: Date = Date()
    ) throws -> World2AssetWorkbenchAward {
        try pack.validateForPlayerPresentation()
        guard selectedCandidateIDs.count == World2AssetWorkbenchContract.selectionCount else {
            throw World2AssetWorkbenchError.invalidSelectionCount
        }
        let selected = pack.candidates.filter { selectedCandidateIDs.contains($0.id) }
        guard selected.count == World2AssetWorkbenchContract.selectionCount else {
            throw World2AssetWorkbenchError.unknownCandidate
        }
        return .init(
            packID: pack.id,
            decorations: selected.map {
                .init(
                    id: "workbench-decoration-\($0.id)",
                    packID: pack.id,
                    label: $0.label,
                    registryKey: $0.registryKey,
                    registryRevision: $0.registryRevision,
                    sha256: $0.sha256,
                    placementLayer: $0.placementLayer,
                    recipe: pack.recipe,
                    awardedAt: awardedAt
                )
            }
        )
    }
}

enum World2AssetWorkbenchJobStage: String, Codable, CaseIterable {
    case queued
    case generating
    case carving
    case qualifying
    case publishing
    case ready
    case failed

    var displayName: String {
        switch self {
        case .queued: return "Warming up the workbench"
        case .generating: return "Imagining six possibilities"
        case .carving: return "Cutting out each creation"
        case .qualifying: return "Checking every detail"
        case .publishing: return "Packing the choices"
        case .ready: return "Your asset pack is ready"
        case .failed: return "The workbench needs another try"
        }
    }
}

struct World2AssetWorkbenchJob: Codable, Identifiable, Equatable {
    let id: String
    let stage: World2AssetWorkbenchJobStage
    let progress: Double
    let pack: World2AssetWorkbenchPack?
    let errorCode: String?
}

enum World2AssetWorkbenchError: Error, LocalizedError, Equatable {
    case invalidRecipe
    case invalidSelectionCount
    case unknownCandidate
    case unqualifiedPack
    case generationUnavailable
    case invalidServerResponse
    case serverFailure(String)

    var errorDescription: String? {
        switch self {
        case .invalidRecipe:
            return "Choose one idea from each row."
        case .invalidSelectionCount:
            return "Choose exactly three creations."
        case .unknownCandidate:
            return "One of those creations is no longer available."
        case .unqualifiedPack:
            return "The workbench did not receive six safe, qualified creations."
        case .generationUnavailable:
            return "The Asset Workbench is not connected to its generator yet."
        case .invalidServerResponse:
            return "The Asset Workbench received an invalid response."
        case .serverFailure:
            return "The Asset Workbench could not finish this pack."
        }
    }
}
