import Foundation

@main
struct VerifyAssetWorkbench {
    static func main() throws {
        precondition(World2WorkbenchIdeaCatalog.finishes.count == 6)
        precondition(World2WorkbenchIdeaCatalog.objectFamilies.count == 6)
        precondition(World2WorkbenchIdeaCatalog.personalities.count == 6)

        let recipe = World2AssetWorkbenchRecipe(
            finishID: "finish.pearlescent",
            objectFamilyID: "object.furniture",
            personalityID: "personality.fancy"
        )
        precondition(recipe.isValid)
        precondition(
            recipe.assetClass == World2AssetWorkbenchContract.assetClass
        )

        let candidates = (1...World2AssetWorkbenchContract.candidateCount).map {
            World2AssetWorkbenchCandidate(
                id: "candidate-\($0)",
                label: "Furniture Idea \($0)",
                registryKey: "workbench/packs/test/candidates/\($0)",
                registryRevision: 1,
                sha256: String(repeating: String($0), count: 64),
                mimeType: "image/png",
                pixelWidth: 1024,
                pixelHeight: 1024,
                placementLayer: .floor,
                qualificationState: .qualified
            )
        }
        let pack = World2AssetWorkbenchPack(
            id: "test-pack",
            recipe: recipe,
            candidates: candidates,
            createdAt: Date(timeIntervalSince1970: 0)
        )
        try pack.validateForPlayerPresentation()

        let selectedIDs = Set(["candidate-1", "candidate-3", "candidate-6"])
        let award = try World2AssetWorkbenchAward.make(
            from: pack,
            selectedCandidateIDs: selectedIDs,
            awardedAt: Date(timeIntervalSince1970: 1)
        )
        precondition(
            award.decorations.count == World2AssetWorkbenchContract.selectionCount
        )
        precondition(Set(award.decorations.map(\.registryKey)).count == 3)

        do {
            _ = try World2AssetWorkbenchAward.make(
                from: pack,
                selectedCandidateIDs: Set(["candidate-1", "candidate-2"])
            )
            preconditionFailure("Two selections must not produce an award.")
        } catch World2AssetWorkbenchError.invalidSelectionCount {
            // Expected.
        }

        var unsafeCandidates = candidates
        unsafeCandidates[0] = World2AssetWorkbenchCandidate(
            id: "candidate-1",
            label: "Unsafe candidate",
            registryKey: "workbench/packs/test/candidates/1",
            registryRevision: 1,
            sha256: String(repeating: "1", count: 64),
            mimeType: "image/png",
            pixelWidth: 1024,
            pixelHeight: 1024,
            placementLayer: .floor,
            qualificationState: .pending
        )
        let unsafePack = World2AssetWorkbenchPack(
            id: "unsafe-pack",
            recipe: recipe,
            candidates: unsafeCandidates,
            createdAt: Date(timeIntervalSince1970: 0)
        )
        do {
            try unsafePack.validateForPlayerPresentation()
            preconditionFailure("Pending candidates must not reach players.")
        } catch World2AssetWorkbenchError.unqualifiedPack {
            // Expected.
        }

        print(
            #"{"assetClass":"treehouse.generatedDecoration/v1","candidates":6,"selected":3,"status":"pass"}"#
        )
    }
}
