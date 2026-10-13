import SwiftUI
import WebKit

/// Hosted café, reached from the existing World2 POI route. No standalone launch.
struct World2CafeView: View {
    let onExit: () -> Void
    @Environment(\.scenePhase) private var scenePhase
    @State private var failed = false
    @State private var reloadID = UUID()
    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.ignoresSafeArea()
            CafeWebView(active: scenePhase == .active, onError: { failed = true })
                .id(reloadID)
            Button(action: onExit) { Label("Back to World", systemImage: "arrow.left") }
                .buttonStyle(.borderedProminent).padding(12)
                .accessibilityIdentifier("cafe.backToWorld")
                .zIndex(2)
            if failed {
                VStack(spacing: 16) {
                    Text("The café needs an internet connection.")
                    Button("Try again") { failed = false; reloadID = UUID() }
                }.padding().background(.regularMaterial).frame(maxWidth: .infinity, maxHeight: .infinity)
                    .allowsHitTesting(true)
            }
        }.accessibilityIdentifier("world2.cafe")
    }
}

private struct CafeWebView: UIViewRepresentable {
    let active: Bool
    let onError: () -> Void
    private let url = URL(string: "https://cafe-studio-review.vercel.app/play-cafe.html")!
    func makeCoordinator() -> Coordinator { Coordinator(onError: onError) }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = .all
        let web = WKWebView(frame: .zero, configuration: configuration)
        web.navigationDelegate = context.coordinator
        web.scrollView.bounces = false
        web.isOpaque = false
        web.backgroundColor = .black
        web.load(URLRequest(url: url))
        return web
    }
    func updateUIView(_ web: WKWebView, context: Context) {
        guard context.coordinator.active != active else { return }
        context.coordinator.active = active
        web.setAllMediaPlaybackSuspended(!active)
        if !active { web.evaluateJavaScript("window.dispatchEvent(new Event('pagehide')); document.querySelectorAll('audio,video').forEach(e=>e.pause());", completionHandler: nil) }
    }
    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) {
        web.setAllMediaPlaybackSuspended(true)
        web.evaluateJavaScript("window.dispatchEvent(new Event('pagehide')); document.querySelectorAll('audio,video').forEach(e=>e.pause());", completionHandler: nil)
        web.stopLoading()
        web.navigationDelegate = nil
    }
    final class Coordinator: NSObject, WKNavigationDelegate {
        let onError: () -> Void
        var active = true
        init(onError: @escaping () -> Void) { self.onError = onError }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url,
                  url.scheme == "https", url.host == "cafe-studio-review.vercel.app" else {
                decisionHandler(.cancel); return
            }
            decisionHandler(navigationAction.targetFrame?.isMainFrame == false ? .cancel : .allow)
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { onError() }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { onError() }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { onError() }
    }
}
