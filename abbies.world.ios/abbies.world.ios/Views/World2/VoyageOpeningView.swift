import SwiftUI
import WebKit

struct VoyageOpeningRequest: Identifiable {
    let id = UUID()
    let playerID: PlayerId
    let canSkip: Bool
    let reason: String

    func allowsFinish(currentPlayerID: PlayerId?, watchedToEnd: Bool) -> Bool {
        currentPlayerID == playerID && (watchedToEnd || canSkip)
    }
}

/// The locally bundled comic is the same source as the art-director preview.
/// Always skippable; watching to the end still records the per-player milestone.
struct VoyageOpeningView: View {
    let request: VoyageOpeningRequest
    let onFinish: (Bool) -> Void
    @State private var failed = false
    @State private var reloadID = UUID()
    @State private var didFinish = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()
            VoyageOpeningWebView(onComplete: { finish(watchedToEnd: true) }, onError: { failed = true })
                .id(reloadID)
            // Always offer Skip — kids / parents shouldn't be stuck on a ~70s comic.
            Button("Skip intro") { finish(watchedToEnd: false) }
                .font(.system(size: 18, weight: .bold))
                .padding(14)
                .background(.black.opacity(0.8), in: Capsule())
                .foregroundStyle(.white)
                .padding(20)
                .accessibilityIdentifier("voyageOpening.skip")
            if failed {
                VStack(spacing: 20) {
                    Text("The story couldn’t load.").font(.headline)
                    Button("Try again") { failed = false; reloadID = UUID() }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(.black)
            }
        }
        .accessibilityIdentifier("voyageOpening")
        .onAppear {
            // UITest: prove the gate appears, then complete without waiting ~70s of comic.
            // Keep ≥2s so XCTest can observe `voyageOpening` before dismiss.
            guard ProcessInfo.processInfo.arguments.contains("-world2AutoCompleteVoyageOpening") else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
                finish(watchedToEnd: true)
            }
        }
    }

    private func finish(watchedToEnd: Bool) {
        guard !didFinish else { return }
        didFinish = true
        onFinish(watchedToEnd)
    }
}

private struct VoyageOpeningWebView: UIViewRepresentable {
    let onComplete: () -> Void
    let onError: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onComplete: onComplete, onError: onError) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(context.coordinator, name: "voyageOpening")
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.isInspectable = false
        guard let directory = Bundle.main.url(forResource: "VoyageOpening", withExtension: "bundle") else {
            DispatchQueue.main.async { onError() }
            return webView
        }
        webView.loadFileURL(directory.appendingPathComponent("index.html"), allowingReadAccessTo: directory)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.stopLoading()
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "voyageOpening")
        uiView.navigationDelegate = nil
    }

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let onComplete: () -> Void
        let onError: () -> Void
        private var finished = false
        private var failed = false
        init(onComplete: @escaping () -> Void, onError: @escaping () -> Void) {
            self.onComplete = onComplete
            self.onError = onError
        }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.name == "voyageOpening",
                  let event = message.body as? String else { return }
            if event == "error" { failed = true; onError(); return }
            guard event == "complete", !finished, !failed else { return }
            finished = true
            onComplete()
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed = true; onError() }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed = true; onError() }
    }
}
