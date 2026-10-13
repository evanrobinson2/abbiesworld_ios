import SwiftUI
import WebKit

/// Café reached through the World2 map; the game keeps its viewport when the menu opens.
struct World2CafeView: View {
    let onExit: () -> Void
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var failed = false
    @State private var reloadID = UUID()
    @State private var menuOpen = false
    @AccessibilityFocusState private var menuFocused: Bool

    private let ink = Color(red: 0.17, green: 0.25, blue: 0.23)
    private let paper = Color(red: 0.97, green: 0.93, blue: 0.82)

    private func setMenu(_ open: Bool) {
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.22)) {
            menuOpen = open
        }
        menuFocused = open
    }

    var body: some View {
        GeometryReader { geometry in
            let wide = geometry.size.width > geometry.size.height
            ZStack(alignment: .topTrailing) {
                Color.black.ignoresSafeArea()
                CafeWebView(active: scenePhase == .active && !menuOpen,
                            onError: { failed = true })
                    .id(reloadID)
                    .allowsHitTesting(!menuOpen && !failed)
                    .accessibilityHidden(menuOpen || failed)
                if failed {
                    VStack(spacing: 16) {
                        Image(systemName: "wifi.exclamationmark").font(.largeTitle)
                        Text("The café needs an internet connection.")
                            .multilineTextAlignment(.center)
                        Button("Try again") { failed = false; reloadID = UUID() }
                            .buttonStyle(.borderedProminent)
                            .frame(minHeight: 48)
                    }
                    .padding(24).frame(maxWidth: 360)
                    .background(paper, in: RoundedRectangle(cornerRadius: 16))
                    .foregroundStyle(ink)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                if !menuOpen {
                    Button { setMenu(true) } label: {
                        Image(systemName: "line.3.horizontal")
                            .font(.system(size: 21, weight: .bold))
                            .frame(width: 48, height: 48)
                            .background(paper, in: RoundedRectangle(cornerRadius: 10))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(ink, lineWidth: 2))
                    }
                    .foregroundStyle(ink)
                    .padding(8)
                    .accessibilityLabel("Café menu")
                    .accessibilityIdentifier("cafe.menu")
                }
                if menuOpen {
                    Color.black.opacity(0.38)
                        .ignoresSafeArea()
                        .contentShape(Rectangle())
                        .onTapGesture { setMenu(false) }
                        .accessibilityHidden(true)
                    menu
                        .frame(width: wide ? min(340, geometry.size.width * 0.42) : nil)
                        .frame(maxWidth: wide ? nil : .infinity)
                        .frame(maxHeight: wide ? .infinity : min(320, geometry.size.height * 0.6))
                        .background(paper)
                        .overlay(Rectangle().stroke(ink.opacity(0.3), lineWidth: 2))
                        .frame(maxWidth: .infinity, maxHeight: .infinity,
                               alignment: wide ? .trailing : .bottom)
                        .transition(reduceMotion ? .opacity : .move(edge: wide ? .trailing : .bottom))
                        .accessibilityAddTraits(.isModal)
                        .accessibilityAction(.escape) { setMenu(false) }
                }
            }
            .tint(ink)
        }
        .statusBarHidden()
        .accessibilityIdentifier("world2.cafe")
    }

    private var menu: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Text("Your café").font(.title2.bold())
                    Spacer()
                    Button { setMenu(false) } label: {
                        Image(systemName: "xmark").font(.headline)
                            .frame(width: 48, height: 48)
                    }
                    .accessibilityLabel("Close café menu")
                    .accessibilityFocused($menuFocused)
                }
                Button { setMenu(false) } label: {
                    Label("Keep playing", systemImage: "play.fill")
                        .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                }
                Button(action: onExit) {
                    Label("Back to World", systemImage: "house.fill")
                        .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                }
                .accessibilityIdentifier("cafe.backToWorld")
            }
            .padding(20)
            .foregroundStyle(ink)
        }
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
        // SwiftUI reserves the safe area and exit bar. Web content receives
        // exactly the remaining viewport, without a second UIKit inset.
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.contentInset = .zero
        web.scrollView.scrollIndicatorInsets = .zero
        web.scrollView.showsHorizontalScrollIndicator = false
        web.scrollView.showsVerticalScrollIndicator = false
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
