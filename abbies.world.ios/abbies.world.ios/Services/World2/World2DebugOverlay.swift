import CoreImage
import UIKit

/// Corner debug chip drawn in its own window so sheets and full-screen covers
/// cannot cover it. Touches outside the chip fall through to the game.
@MainActor
final class World2DebugBeacon {
    static let shared = World2DebugBeacon()

    private var window: World2DebugPassthroughWindow?
    private var chip: World2DebugChipView?
    private var lastURL: String?
    private var publishedPageID: String?

    private init() {}

    func attach() {
        guard World2DebugOverlaySettings.shared.isEnabled else {
            window?.isHidden = true
            return
        }
        guard ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] != "1" else {
            return
        }
        guard let scene = foregroundScene() else { return }
        if window?.windowScene !== scene {
            let overlay = World2DebugPassthroughWindow(windowScene: scene)
            overlay.windowLevel = .alert + 1
            overlay.backgroundColor = .clear
            overlay.isHidden = false
            let root = World2DebugPassthroughView()
            root.backgroundColor = .clear
            let chip = World2DebugChipView()
            root.addSubview(chip)
            root.chip = chip
            overlay.rootViewController = World2DebugRootController(root: root)
            window = overlay
            self.chip = chip
            lastURL = nil
        }
        window?.isHidden = false
        if let lastURL, let token = chip?.accessibilityLabel {
            apply(url: lastURL, token: token, screenName: chip?.screenName ?? "")
        }
    }

    func publish(_ report: World2DebugReport) {
        guard World2DebugOverlaySettings.shared.isEnabled else {
            clear()
            return
        }
        attach()
        let pageID = pageIdentity(report)
        guard pageID != publishedPageID else { return }
        publishedPageID = pageID
        let ticket = World2DebugTicketCodec.make(from: report)
        let url = World2DebugTicketCodec.urlString(for: ticket)
        let snapshot = World2DebugTicketCodec.snapshot(
            ticket: ticket,
            url: url,
            report: report
        )
        let path = (try? World2DebugSnapshotStore.write(snapshot))?.path ?? "unwritten"
        lastURL = url
        apply(url: url, token: ticket.token, screenName: report.screen.diagnosticName)
        World2Diagnostics.log(
            "debug_ticket",
            [
                "fingerprint": ticket.fingerprint,
                "path": path,
                "token": ticket.token,
                "url": url
            ]
        )
    }

    func clear() {
        lastURL = nil
        publishedPageID = nil
        chip?.isHidden = true
        window?.isHidden = true
    }

    /// Page pointer only. Later diagnostic logs must not mint a new code.
    private func pageIdentity(_ report: World2DebugReport) -> String {
        let fields: [String] = [
            report.screen.debugCode,
            report.screen.debugRouteID ?? "",
            report.playerID?.rawValue ?? "",
            report.worldID?.rawValue ?? "",
            report.sceneID,
            report.presentations.joined(separator: ","),
            report.inspectedPOI ?? "",
            String(report.gems),
            report.quest ?? "",
            report.error ?? "",
            report.toast ?? "",
            String(report.placeCount),
            String(report.createdSceneCount),
            String(report.inventoryCount),
            String(report.deckCount),
            report.milestones.joined(separator: ","),
            report.completedPOIs.joined(separator: ",")
        ]
        return fields.joined(separator: "|")
    }

    private func apply(url: String, token: String, screenName: String) {
        chip?.isHidden = false
        chip?.apply(url: url, token: token, screenName: screenName)
        window?.isHidden = false
        chip?.superview?.setNeedsLayout()
    }

    private func foregroundScene() -> UIWindowScene? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
    }
}

private final class World2DebugRootController: UIViewController {
    init(root: UIView) {
        super.init(nibName: nil, bundle: nil)
        view = root
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

private final class World2DebugPassthroughWindow: UIWindow {
    override var canBecomeKey: Bool { false }

    /// A nil hitTest on a front window eats the touch. Claiming only the chip
    /// lets UIKit deliver everything else to the game window underneath.
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        containsChip(point)
    }

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        guard containsChip(point) else { return nil }
        return super.hitTest(point, with: event)
    }

    private func containsChip(_ point: CGPoint) -> Bool {
        guard let root = rootViewController?.view as? World2DebugPassthroughView,
              let chip = root.chip,
              !chip.isHidden,
              chip.alpha > 0.01,
              chip.bounds.width > 1,
              chip.bounds.height > 1 else {
            return false
        }
        return chip.frame.contains(convert(point, to: root))
    }
}

private final class World2DebugPassthroughView: UIView {
    weak var chip: World2DebugChipView?

    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        guard let chip, !chip.isHidden else { return false }
        return chip.frame.contains(point)
    }

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        guard self.point(inside: point, with: event) else { return nil }
        return super.hitTest(point, with: event)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        guard let chip else { return }
        chip.frame = World2ChromeContract.qrFrame(in: bounds)
    }
}

private final class World2DebugChipView: UIControl {
    var preferredTextWidth: CGFloat = 200 {
        didSet {
            guard preferredTextWidth != oldValue else { return }
            tokenLabel.preferredMaxLayoutWidth = preferredTextWidth
        }
    }

    private let titleLabel = UILabel()
    private let tokenLabel = UILabel()
    private let codeView = UIImageView()
    private let row = UIStackView()
    private(set) var screenName = ""
    private var ticketURL = ""
    private var token = ""
    private var copiedReset: DispatchWorkItem?

    override init(frame: CGRect) {
        super.init(frame: frame)
        isAccessibilityElement = true
        accessibilityIdentifier = "world2.debug.qr"
        backgroundColor = .white
        layer.cornerRadius = 6
        layer.borderWidth = 1
        layer.borderColor = UIColor.black.cgColor
        clipsToBounds = true

        codeView.contentMode = .scaleAspectFit
        codeView.layer.magnificationFilter = .nearest
        codeView.translatesAutoresizingMaskIntoConstraints = false
        codeView.isUserInteractionEnabled = false

        titleLabel.font = roundedFont(size: 11, weight: .bold)
        titleLabel.textColor = .black
        titleLabel.text = World2DebugBuildLabel.currentName
        titleLabel.numberOfLines = 1
        titleLabel.lineBreakMode = .byClipping
        titleLabel.isUserInteractionEnabled = false
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        titleLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        tokenLabel.font = roundedFont(size: 10, weight: .semibold)
        tokenLabel.textColor = .black
        tokenLabel.numberOfLines = 1
        tokenLabel.lineBreakMode = .byClipping
        tokenLabel.textAlignment = .left
        tokenLabel.text = World2DebugBuildLabel.currentTimeText
        tokenLabel.preferredMaxLayoutWidth = preferredTextWidth
        tokenLabel.isUserInteractionEnabled = false
        tokenLabel.setContentHuggingPriority(.required, for: .horizontal)
        tokenLabel.setContentCompressionResistancePriority(.required, for: .vertical)

        let textColumn = UIStackView(arrangedSubviews: [titleLabel, tokenLabel])
        textColumn.axis = .vertical
        textColumn.alignment = .leading
        textColumn.spacing = 1
        textColumn.isUserInteractionEnabled = false
        textColumn.setContentHuggingPriority(.required, for: .horizontal)

        row.addArrangedSubview(codeView)
        row.addArrangedSubview(textColumn)
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = 4
        row.isLayoutMarginsRelativeArrangement = true
        row.layoutMargins = UIEdgeInsets(top: 4, left: 4, bottom: 4, right: 4)
        row.isUserInteractionEnabled = false
        row.translatesAutoresizingMaskIntoConstraints = false
        row.setContentHuggingPriority(.required, for: .horizontal)
        row.setContentHuggingPriority(.required, for: .vertical)
        addSubview(row)

        NSLayoutConstraint.activate([
            codeView.widthAnchor.constraint(equalToConstant: 64),
            codeView.heightAnchor.constraint(equalToConstant: 64),
            row.topAnchor.constraint(equalTo: topAnchor),
            row.leadingAnchor.constraint(equalTo: leadingAnchor),
            row.trailingAnchor.constraint(equalTo: trailingAnchor),
            row.bottomAnchor.constraint(equalTo: bottomAnchor),
            tokenLabel.widthAnchor.constraint(lessThanOrEqualToConstant: 128)
        ])
        addTarget(self, action: #selector(copyTicket), for: .touchUpInside)
    }

    override var intrinsicContentSize: CGSize {
        row.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func apply(url: String, token: String, screenName: String) {
        let urlChanged = url != ticketURL
        ticketURL = url
        self.token = token
        self.screenName = screenName
        accessibilityLabel = "\(World2DebugBuildLabel.currentName), \(World2DebugBuildLabel.currentTimeText)"
        accessibilityValue = url
        if copiedReset == nil {
            titleLabel.text = World2ChromeContract.ellipsized(
                World2DebugBuildLabel.currentName,
                budget: World2ChromeContract.qrTitleBudget
            )
            tokenLabel.text = World2ChromeContract.ellipsized(
                World2DebugBuildLabel.currentTimeText,
                budget: World2ChromeContract.qrTokenBudget
            )
        }
        if urlChanged {
            codeView.image = World2DebugQRImage.make(url)
        }
        invalidateIntrinsicContentSize()
        superview?.setNeedsLayout()
    }

    @objc private func copyTicket() {
        guard !ticketURL.isEmpty else { return }
        UIPasteboard.general.string = ticketURL
        titleLabel.text = "Copied"
        copiedReset?.cancel()
        let reset = DispatchWorkItem { [weak self] in
            self?.titleLabel.text = World2ChromeContract.ellipsized(
                World2DebugBuildLabel.currentName,
                budget: World2ChromeContract.qrTitleBudget
            )
            self?.copiedReset = nil
        }
        copiedReset = reset
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2, execute: reset)
    }
}

private func roundedFont(size: CGFloat, weight: UIFont.Weight) -> UIFont {
    let base = UIFont.systemFont(ofSize: size, weight: weight)
    guard let descriptor = base.fontDescriptor.withDesign(.rounded) else { return base }
    return UIFont(descriptor: descriptor, size: size)
}

private enum World2DebugQRImage {
    private static let context = CIContext()

    static func make(_ string: String) -> UIImage? {
        guard let data = string.data(using: .utf8),
              let filter = CIFilter(name: "CIQRCodeGenerator") else {
            return nil
        }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        guard let output = filter.outputImage else { return nil }
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 8, y: 8))
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else {
            return nil
        }
        return UIImage(cgImage: cgImage)
    }
}
