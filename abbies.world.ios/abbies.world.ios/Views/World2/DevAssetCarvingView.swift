import SwiftUI

struct DevAssetCarvingView: View {
    @StateObject private var viewModel = DevAssetCarvingViewModel()
    @State private var reviewSelection: DevAssetReviewSelection?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                introduction
                sourceControls

                if let sourceImage = viewModel.sourceImage {
                    sourcePreview(sourceImage)
                    reviewSummary
                    candidateGrid
                    saveSection
                    diagnostics
                }
            }
            .padding(24)
        }
        .navigationTitle("Asset Carving Lab")
        .navigationBarTitleDisplayMode(.inline)
        .background(Color(uiColor: .systemGroupedBackground))
        .sheet(item: $reviewSelection) { selection in
            DevAssetReviewFlow(
                viewModel: viewModel,
                initialItemID: selection.id
            )
        }
        .accessibilityIdentifier("world2.assetCarving")
    }

    private var introduction: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Parent-only development tool", systemImage: "person.badge.shield.checkmark.fill")
                .font(.headline)
                .foregroundStyle(.orange)
            Text(
                "Paste an HTTPS link to a light-background atlas. The image is downloaded directly to this iPad, carved locally, and never uploaded by this tool."
            )
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding(16)
        .background(.orange.opacity(0.10), in: RoundedRectangle(cornerRadius: 16))
    }

    private var sourceControls: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("1. Source image")
                .font(.title3.bold())

            TextField(
                "https://cdn.example.com/furniture-atlas.png",
                text: $viewModel.sourceURL,
                axis: .vertical
            )
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(.URL)
            .textFieldStyle(.roundedBorder)
            .lineLimit(2...4)
            .accessibilityIdentifier("world2.assetCarving.sourceURL")

            HStack {
                Button {
                    Task {
                        await viewModel.loadPreview()
                    }
                } label: {
                    if viewModel.isLoading {
                        Label("Preparing Preview…", systemImage: "hourglass")
                    } else {
                        Label("Fetch and Preview", systemImage: "wand.and.stars")
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .disabled(
                    viewModel.isLoading
                        || viewModel.sourceURL.trimmingCharacters(
                            in: .whitespacesAndNewlines
                        ).isEmpty
                )
                .accessibilityIdentifier("world2.assetCarving.fetch")

                if !viewModel.assets.isEmpty {
                    Button("Start Over", role: .destructive) {
                        viewModel.resetReview()
                    }
                    .buttonStyle(.bordered)
                }

                Spacer()
                if viewModel.isLoading {
                    ProgressView()
                }
            }

            Text(viewModel.statusMessage)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(
                    viewModel.errorMessage == nil ? Color.secondary : Color.red
                )
                .accessibilityIdentifier("world2.assetCarving.status")

            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .accessibilityIdentifier("world2.assetCarving.error")
            }
        }
        .padding(18)
        .background(.background, in: RoundedRectangle(cornerRadius: 18))
    }

    private func sourcePreview(_ image: UIImage) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("2. Detected regions")
                .font(.title3.bold())
            Text("Numbered boxes show what the automatic edge pass treats as one item.")
                .font(.caption)
                .foregroundStyle(.secondary)

            GeometryReader { geometry in
                let imageSize = image.size
                let scale = min(
                    geometry.size.width / max(1, imageSize.width),
                    geometry.size.height / max(1, imageSize.height)
                )
                let displayedWidth = imageSize.width * scale
                let displayedHeight = imageSize.height * scale
                let offsetX = (geometry.size.width - displayedWidth) / 2
                let offsetY = (geometry.size.height - displayedHeight) / 2

                ZStack(alignment: .topLeading) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(
                            width: geometry.size.width,
                            height: geometry.size.height
                        )

                    ForEach(viewModel.assets) { asset in
                        let bounds = asset.sourceBounds
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(.orange, lineWidth: 2)
                            .frame(
                                width: bounds.width * scale,
                                height: bounds.height * scale
                            )
                            .overlay(alignment: .topLeading) {
                                Text(asset.id.replacingOccurrences(of: "item-", with: ""))
                                    .font(.system(size: 9, weight: .black, design: .monospaced))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 4)
                                    .padding(.vertical, 2)
                                    .background(.orange)
                            }
                            .offset(
                                x: offsetX + bounds.minX * scale,
                                y: offsetY + bounds.minY * scale
                            )
                    }
                }
            }
            .frame(height: 360)
            .background(.white, in: RoundedRectangle(cornerRadius: 14))
            .clipped()
        }
        .padding(18)
        .background(.background, in: RoundedRectangle(cornerRadius: 18))
    }

    private var reviewSummary: some View {
        HStack(spacing: 18) {
            Text("3. Review every item")
                .font(.title3.bold())
            Spacer()
            ReviewCount(label: "Pending", count: viewModel.pendingCount, color: .orange)
            ReviewCount(label: "Approved", count: viewModel.approvedCount, color: .green)
            ReviewCount(label: "Rejected", count: viewModel.rejectedCount, color: .red)
        }
        .accessibilityIdentifier("world2.assetCarving.reviewSummary")
    }

    private var candidateGrid: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 175), spacing: 14)],
            spacing: 14
        ) {
            ForEach(viewModel.assets) { asset in
                Button {
                    reviewSelection = DevAssetReviewSelection(id: asset.id)
                } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        ZStack {
                            CheckerboardBackground()
                            Image(uiImage: asset.strippedImage)
                                .resizable()
                                .scaledToFit()
                                .padding(8)
                        }
                        .frame(height: 132)
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                        HStack {
                            Text(asset.label)
                                .font(.subheadline.bold())
                                .lineLimit(1)
                            Spacer()
                            decisionIcon(asset.decision)
                        }

                        Text(asset.category)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        Text(asset.pixelSizeLabel)
                            .font(.caption2.monospaced())
                            .foregroundStyle(.tertiary)
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.background, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(decisionColor(asset.decision).opacity(0.55), lineWidth: 2)
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(
                    "\(asset.label), \(asset.category), \(asset.decision.rawValue)"
                )
                .accessibilityHint("Opens original and transparent previews for review.")
                .accessibilityIdentifier("world2.assetCarving.item.\(asset.id)")
            }
        }
    }

    private var saveSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("4. Save approved set")
                .font(.title3.bold())

            Text(
                viewModel.pendingCount == 0
                    ? "The manifest will include every decision. Only approved transparent PNGs are saved."
                    : "Review all \(viewModel.pendingCount) pending item\(viewModel.pendingCount == 1 ? "" : "s") before saving."
            )
            .font(.subheadline)
            .foregroundStyle(.secondary)

            HStack {
                Button {
                    viewModel.saveApprovedSet()
                } label: {
                    Label(
                        viewModel.isSaving ? "Saving…" : "Save Approved Set",
                        systemImage: "checkmark.seal.fill"
                    )
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .disabled(!viewModel.canSave)
                .accessibilityIdentifier("world2.assetCarving.save")

                if let directoryURL = viewModel.savedSession?.directoryURL {
                    ShareLink(item: directoryURL) {
                        Label("Share Approved Set", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.bordered)
                    .accessibilityIdentifier("world2.assetCarving.shareSet")
                }
            }
        }
        .padding(18)
        .background(.background, in: RoundedRectangle(cornerRadius: 18))
    }

    private var diagnostics: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Inspection summary")
                .font(.caption.bold())
            Text(viewModel.diagnosticSummary)
                .font(.caption2.monospaced())
                .textSelection(.enabled)
                .foregroundStyle(.secondary)
                .accessibilityIdentifier("world2.assetCarving.diagnostics")
        }
        .padding(14)
        .background(.black.opacity(0.05), in: RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func decisionIcon(_ decision: DevAssetReviewDecision) -> some View {
        switch decision {
        case .pending:
            Image(systemName: "questionmark.circle.fill").foregroundStyle(.orange)
        case .approved:
            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
        case .rejected:
            Image(systemName: "xmark.circle.fill").foregroundStyle(.red)
        }
    }

    private func decisionColor(_ decision: DevAssetReviewDecision) -> Color {
        switch decision {
        case .pending: return .orange
        case .approved: return .green
        case .rejected: return .red
        }
    }
}

private struct DevAssetReviewSelection: Identifiable {
    let id: String
}

private struct ReviewCount: View {
    let label: String
    let count: Int
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text("\(count)")
                .font(.headline.monospacedDigit())
                .foregroundStyle(color)
            Text(label)
                .font(.caption2.bold())
                .foregroundStyle(.secondary)
        }
    }
}

private struct DevAssetReviewFlow: View {
    @ObservedObject var viewModel: DevAssetCarvingViewModel
    let initialItemID: String

    @Environment(\.dismiss) private var dismiss
    @State private var currentItemID: String

    init(viewModel: DevAssetCarvingViewModel, initialItemID: String) {
        self.viewModel = viewModel
        self.initialItemID = initialItemID
        _currentItemID = State(initialValue: initialItemID)
    }

    var body: some View {
        NavigationStack {
            Group {
                if let index = viewModel.assets.firstIndex(
                    where: { $0.id == currentItemID }
                ) {
                    DevAssetItemReviewView(
                        asset: $viewModel.assets[index],
                        itemNumber: index + 1,
                        itemCount: viewModel.assets.count,
                        onApprove: { finish(.approved) },
                        onReject: { finish(.rejected) }
                    )
                } else {
                    ContentUnavailableView("Item unavailable", systemImage: "photo.badge.exclamationmark")
                }
            }
            .navigationTitle("Review Carved Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.large])
        .interactiveDismissDisabled(
            viewModel.assets.first(where: { $0.id == currentItemID })?.decision == .pending
        )
    }

    private func finish(_ decision: DevAssetReviewDecision) {
        guard let index = viewModel.assets.firstIndex(
            where: { $0.id == currentItemID }
        ) else { return }
        viewModel.assets[index].decision = decision

        if let nextID = viewModel.nextPendingID(after: currentItemID) {
            currentItemID = nextID
        } else {
            dismiss()
        }
    }
}

private struct DevAssetItemReviewView: View {
    @Binding var asset: DevCarvedAsset
    let itemNumber: Int
    let itemCount: Int
    let onApprove: () -> Void
    let onReject: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Item \(itemNumber) of \(itemCount) • \(asset.pixelSizeLabel) pixels")
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)

                HStack(alignment: .top, spacing: 16) {
                    comparisonImage(
                        title: "Original crop",
                        image: asset.originalCrop,
                        checkerboard: false
                    )
                    comparisonImage(
                        title: "Transparent preview",
                        image: asset.strippedImage,
                        checkerboard: true
                    )
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("Approved items need a meaningful label and category.")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text("Label")
                        .font(.caption.bold())
                    TextField("Item name", text: $asset.label)
                        .textFieldStyle(.roundedBorder)
                        .accessibilityIdentifier("world2.assetCarving.review.label")

                    Text("Category")
                        .font(.caption.bold())
                    TextField("Category", text: $asset.category)
                        .textFieldStyle(.roundedBorder)
                        .accessibilityIdentifier("world2.assetCarving.review.category")
                }

                HStack(spacing: 14) {
                    Button(action: onReject) {
                        Label("Reject and Next", systemImage: "xmark.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                    .accessibilityIdentifier("world2.assetCarving.review.reject")

                    Button(action: onApprove) {
                        Label("Approve and Next", systemImage: "checkmark.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .disabled(!hasReviewedMetadata)
                    .accessibilityIdentifier("world2.assetCarving.review.approve")
                }
                .font(.headline)
            }
            .padding(24)
        }
        .accessibilityIdentifier("world2.assetCarving.review")
    }

    private var hasReviewedMetadata: Bool {
        let label = asset.label.trimmingCharacters(in: .whitespacesAndNewlines)
        let category = asset.category.trimmingCharacters(in: .whitespacesAndNewlines)
        return !label.isEmpty
            && label.caseInsensitiveCompare("Item \(itemNumber)") != .orderedSame
            && !category.isEmpty
            && category.caseInsensitiveCompare("Uncategorized") != .orderedSame
    }

    private func comparisonImage(
        title: String,
        image: UIImage,
        checkerboard: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            ZStack {
                if checkerboard {
                    CheckerboardBackground()
                } else {
                    Color.white
                }
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .padding(12)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 330)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(.secondary.opacity(0.25), lineWidth: 1)
            )
        }
        .frame(maxWidth: .infinity)
    }
}

private struct CheckerboardBackground: View {
    var body: some View {
        Canvas { context, size in
            let cell: CGFloat = 14
            let columns = Int(ceil(size.width / cell))
            let rows = Int(ceil(size.height / cell))
            for row in 0..<rows {
                for column in 0..<columns {
                    let color: Color = (row + column).isMultiple(of: 2)
                        ? Color(uiColor: .systemGray5)
                        : Color(uiColor: .systemBackground)
                    context.fill(
                        Path(
                            CGRect(
                                x: CGFloat(column) * cell,
                                y: CGFloat(row) * cell,
                                width: cell,
                                height: cell
                            )
                        ),
                        with: .color(color)
                    )
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        DevAssetCarvingView()
    }
}
