import XCTest
import WebKit
@testable import abbies_world_ios

final class VoyageOpeningTests: XCTestCase {
    func testIntroIsAlwaysSkippableForSamePlayer() {
        let request = VoyageOpeningRequest(playerID: .abbie, canSkip: true, reason: "world_book_unlocked")
        XCTAssertTrue(request.allowsFinish(currentPlayerID: .abbie, watchedToEnd: false))
        XCTAssertTrue(request.allowsFinish(currentPlayerID: .abbie, watchedToEnd: true))
        XCTAssertFalse(request.allowsFinish(currentPlayerID: .ani, watchedToEnd: true))
        XCTAssertFalse(request.allowsFinish(currentPlayerID: nil, watchedToEnd: true))
    }

    func testSkipStillRequiresMatchingPlayer() {
        let request = VoyageOpeningRequest(playerID: .ani, canSkip: true, reason: "world_switcher_voyage")
        XCTAssertTrue(request.allowsFinish(currentPlayerID: .ani, watchedToEnd: false))
        XCTAssertFalse(request.allowsFinish(currentPlayerID: .abbie, watchedToEnd: false))
    }

    func testCompletionMilestoneSurvivesProgressionRoundTrip() throws {
        var progression = PlayerProgression()
        XCTAssertFalse(progression.achievedMilestones.contains(PlayerStateService.voyageOpeningMilestone))
        progression.achievedMilestones.append(PlayerStateService.voyageOpeningMilestone)
        let saved = try JSONEncoder().encode(progression)
        let restored = try JSONDecoder().decode(PlayerProgression.self, from: saved)
        XCTAssertTrue(restored.achievedMilestones.contains(PlayerStateService.voyageOpeningMilestone))
    }

    @MainActor
    func testBundledComicLoadsOfflineInWebKit() async throws {
        let folder = try XCTUnwrap(Bundle.main.url(forResource: "VoyageOpening", withExtension: "bundle"))
        let delegate = OpeningLoadProbe()
        let config = WKWebViewConfiguration()
        config.userContentController.add(delegate, name: "voyageOpening")
        let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 1194, height: 834), configuration: config)
        web.navigationDelegate = delegate
        web.loadFileURL(folder.appendingPathComponent("index.html"), allowingReadAccessTo: folder)
        await fulfillment(of: [delegate.loaded], timeout: 20)
        XCTAssertNil(delegate.error)
        let title = try await web.evaluateJavaScript("document.querySelector('#stage').getAttribute('aria-label')") as? String
        XCTAssertEqual(title, "Title")
        let controlsHidden = try await web.evaluateJavaScript("getComputedStyle(document.querySelector('.controls')).display === 'none'") as? Bool
        XCTAssertEqual(controlsHidden, true)
        let fontLoaded = try await web.callAsyncJavaScript("await document.fonts.ready; return document.fonts.check('900 30px Roboto');", arguments: [:], in: nil, contentWorld: .page) as? Bool
        XCTAssertEqual(fontLoaded, true)
        // Exercise every scene, then the actual end-of-story bridge exactly once.
        let sceneCount = try await web.evaluateJavaScript("shots.forEach(s => jump(s.start + s.duration - 0.1)); shots.length") as? Int
        XCTAssertEqual(sceneCount, 13)
        _ = try await web.evaluateJavaScript("jump(total); jump(total)")
        await fulfillment(of: [delegate.completed], timeout: 5)
        XCTAssertEqual(delegate.completionCount, 1)
        let renderError = try await web.evaluateJavaScript("window.openingError || ''") as? String
        XCTAssertNil(delegate.error, renderError ?? "")
        config.userContentController.removeScriptMessageHandler(forName: "voyageOpening")
    }
}

private final class OpeningLoadProbe: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    let loaded = XCTestExpectation(description: "Offline comic loaded")
    let completed = XCTestExpectation(description: "End of comic reached native host")
    var completionCount = 0
    var error: String?
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loaded.fulfill() }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        self.error = error.localizedDescription
        loaded.fulfill()
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.body as? String == "error" { error = "Comic reported a rendering error" }
        if message.body as? String == "complete" {
            completionCount += 1
            completed.fulfill()
        }
    }
}
