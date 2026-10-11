import SwiftUI
import WebKit

/// Offline, bundled microscope game. The native shell owns navigation and saves.
struct AmberShallowsView: View {
    let saveScope: String
    var onDismiss: () -> Void
    @Environment(\.scenePhase) private var scenePhase
    @State private var ready = false
    @State private var failure: String?
    @State private var attempt = UUID()

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color(red: 0.09, green: 0.15, blue: 0.10).ignoresSafeArea()
            AmberShallowsWebView(
                saveScope: saveScope, isActive: scenePhase == .active,
                onReady: { ready = true }, onFailure: { failure = $0 }
            )
            .id(attempt)
            .ignoresSafeArea()
            .accessibilityIdentifier("world2.microscope.web")

            if !ready && failure == nil {
                ProgressView("Looking into a little world…")
                    .tint(.white).foregroundStyle(.white)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .allowsHitTesting(false)
            }
            if let failure {
                VStack(spacing: 16) {
                    Text("The microscope needs a moment").font(.title2.bold())
                    Text(failure).multilineTextAlignment(.center)
                    Button("Try again") {
                        self.failure = nil; ready = false; attempt = UUID()
                    }.buttonStyle(.borderedProminent)
                }
                .padding(28).background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            Button(action: onDismiss) {
                Label("Back to Abbie’s World", systemImage: "chevron.left")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .padding(.horizontal, 18).padding(.vertical, 12)
                    .background(.ultraThinMaterial, in: Capsule())
            }
            .foregroundStyle(.white)
            .padding(.leading, 20).padding(.top, 10)
            .accessibilityIdentifier("world2.microscope.exit")
        }
        .accessibilityIdentifier("world2.microscope")
    }
}

private struct AmberShallowsWebView: UIViewRepresentable {
    let saveScope: String
    let isActive: Bool
    let onReady: () -> Void
    let onFailure: (String) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(saveScope: saveScope, onReady: onReady, onFailure: onFailure)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // No shared cookies/localStorage: native progress is explicitly profile scoped.
        config.websiteDataStore = .nonPersistent()
        let controller = config.userContentController
        controller.add(context.coordinator, name: "amber")
        let saved = UserDefaults.standard.string(forKey: context.coordinator.saveKey) ?? "null"
        let seed = String(data: try! JSONEncoder().encode(saved), encoding: .utf8)!
        let script = """
        window.amberActive = \(isActive ? "true" : "false");
        let amberSaved = \(seed);
        window.amberStorage = {
          getItem: () => amberSaved,
          setItem: (_, value) => {
            amberSaved = value;
            window.webkit.messageHandlers.amber.postMessage({type:'save', value});
          }
        };
        window.addEventListener('pagehide', () => window.amberSave?.());
        window.addEventListener('error', () => window.webkit.messageHandlers.amber.postMessage({type:'error'}));
        window.addEventListener('unhandledrejection', () => window.webkit.messageHandlers.amber.postMessage({type:'error'}));
        """
        controller.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.isScrollEnabled = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        guard let manifestURL = Self.resource("amber-shallows-registry", extension: "json"),
              let data = try? Data(contentsOf: manifestURL),
              let record = try? JSONDecoder().decode(GameAssetRecord.self, from: data),
              record.gameKey == "amber-shallows", record.key == "runtime/microscope",
              record.schemaVersion == 1, record.revision == 1,
              record.source.type == .bundled, record.source.bundleName == "amber-shallows.html",
              let url = Self.resource("amber-shallows", extension: "html") else {
            DispatchQueue.main.async { onFailure("The little world is missing from this app build.") }
            return web
        }
        web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        return web
    }

    private static func resource(_ name: String, extension ext: String) -> URL? {
        Bundle.main.url(forResource: name, withExtension: ext, subdirectory: "Resources/AmberShallows")
            ?? Bundle.main.url(forResource: name, withExtension: ext, subdirectory: "AmberShallows")
            ?? Bundle.main.url(forResource: name, withExtension: ext)
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        web.evaluateJavaScript("window.amberActive = \(isActive ? "true" : "false"); if (!window.amberActive) window.amberSave?.();", completionHandler: nil)
    }

    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) {
        // Stop rendering immediately; release the WebGL scene when the web view dies.
        web.evaluateJavaScript("window.amberActive=false;window.amberSave?.();window.amberStorage?.getItem();") { result, _ in
            if let value = result as? String { coordinator.save(value) }
            web.configuration.userContentController.removeScriptMessageHandler(forName: "amber")
            web.navigationDelegate = nil
            web.stopLoading()
            web.loadHTMLString("", baseURL: nil)
        }
    }

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let saveKey: String
        let onReady: () -> Void
        let onFailure: (String) -> Void

        init(saveScope: String, onReady: @escaping () -> Void, onFailure: @escaping (String) -> Void) {
            saveKey = "amber-shallows.v1." + saveScope
            self.onReady = onReady; self.onFailure = onFailure
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, let body = message.body as? [String: Any] else { return }
            switch body["type"] as? String {
            case "ready": onReady()
            case "error": onFailure("Try reopening the microscope. Your saved garden is safe.")
            case "save":
                if let value = body["value"] as? String { save(value) }
            default: break
            }
        }

        func save(_ value: String) {
            guard value.utf8.count < 512_000, let data = value.data(using: .utf8),
                  (try? JSONSerialization.jsonObject(with: data)) is [String: Any] else { return }
            UserDefaults.standard.set(value, forKey: saveKey)
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            let url = navigationAction.request.url
            decisionHandler(url?.isFileURL == true || url?.absoluteString == "about:blank" ? .allow : .cancel)
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            onFailure("The little world could not open. Please try again.")
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            onFailure("The little world could not open. Please try again.")
        }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            onFailure("The microscope rested to free up memory. Tap Try again to return.")
        }
    }
}
