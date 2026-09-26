import CoreImage
import XCTest
@testable import abbies_world_ios

final class World2DebugTicketTests: XCTestCase {
    func testTicketRoundTripsAPageAndDiagnostics() {
        let issuedAt = Date(timeIntervalSince1970: 1_757_810_000)
        let report = sampleReport(
            screen: .treehouse(poiId: "poi.abbieTreehouse"),
            presentations: ["settings"]
        )

        let ticket = World2DebugTicketCodec.make(
            from: report,
            issuedAt: issuedAt,
            build: "1.0.1"
        )
        let raw = World2DebugTicketCodec.urlString(for: ticket)
        let decoded = World2DebugTicketCodec.decode(raw)

        XCTAssertEqual(decoded, ticket)
        XCTAssertEqual(decoded?.screen, .treehouse(poiId: "poi.abbieTreehouse"))
        XCTAssertEqual(decoded?.playerID, .abbie)
        XCTAssertEqual(decoded?.worldID, .home)
        XCTAssertEqual(decoded?.presentation, "settings")
        XCTAssertEqual(decoded?.gems, 12)
        XCTAssertEqual(decoded?.quest, "quest.placeJukebox.inventory")
        XCTAssertEqual(decoded?.error, "layout missing")
        XCTAssertTrue(ticket.token.contains("s=th"))
        XCTAssertTrue(ticket.token.contains("i=poi.abbieTreehouse"))
        XCTAssertTrue(ticket.token.contains("p=abbie"))
        XCTAssertTrue(ticket.token.contains("#\(ticket.fingerprint)"))
        XCTAssertFalse(raw.contains("scene.blankSlate"))
    }

    func testVisibleBuildLabelIsANameAndAClockTime() {
        XCTAssertEqual(
            World2DebugBuildLabel.name(version: "1.0"),
            "Abbie's World 1.0"
        )
        XCTAssertEqual(
            World2DebugBuildLabel.name(version: "?"),
            "Abbie's World"
        )
        let builtAt = Date(timeIntervalSince1970: 1_757_810_000)
        let time = World2DebugBuildLabel.timeText(
            builtAt: builtAt,
            timeZone: TimeZone(secondsFromGMT: 0)!
        )
        XCTAssertEqual(time, "Sep 14, 12:33:20 AM")
        XCTAssertFalse(time.contains("s="))
    }

    func testANewBuildStampChangesTheQR() throws {
        let issuedAt = Date(timeIntervalSince1970: 1_757_810_000)
        let report = sampleReport(screen: .loading, presentations: [])
        let first = World2DebugTicketCodec.make(
            from: report,
            issuedAt: issuedAt,
            build: "1.0.1",
            buildStamp: "1757810000001"
        )
        let second = World2DebugTicketCodec.make(
            from: report,
            issuedAt: issuedAt,
            build: "1.0.1",
            buildStamp: "1757810000002"
        )
        let firstURL = World2DebugTicketCodec.urlString(for: first)
        let secondURL = World2DebugTicketCodec.urlString(for: second)

        XCTAssertNotEqual(firstURL, secondURL)
        XCTAssertNotEqual(first.fingerprint, second.fingerprint)
        XCTAssertTrue(firstURL.contains("bt=1757810000001"))
        XCTAssertEqual(World2DebugTicketCodec.decode(firstURL)?.buildStamp, "1757810000001")
        let firstCode = try XCTUnwrap(debugQRCode(firstURL))
        let secondCode = try XCTUnwrap(debugQRCode(secondURL))
        XCTAssertNotEqual(firstCode, secondCode)
    }

    func testUnknownPresentationIsRejected() {
        let issuedAt = Date(timeIntervalSince1970: 1_757_810_000)
        let ticket = World2DebugTicketCodec.make(
            from: sampleReport(screen: .homeWorld, presentations: []),
            issuedAt: issuedAt,
            build: "1.0.1"
        )
        let raw = World2DebugTicketCodec.urlString(for: ticket)
            .replacingOccurrences(of: "s=hm", with: "s=hm&m=secret")

        XCTAssertNil(World2DebugTicketCodec.decode(raw))
    }

    func testOverlayConfigLetsLaunchFlagWinOverSavedDefault() {
        let defaults = UserDefaults(suiteName: "world2.debug.ticket.tests")!
        defaults.removePersistentDomain(forName: "world2.debug.ticket.tests")
        defaults.set(true, forKey: World2DebugOverlaySettings.defaultsKey)

        XCTAssertFalse(
            World2DebugOverlaySettings.resolve(
                arguments: ["-world2NoDebugQR"],
                defaults: defaults,
                defaultWhenUnset: true
            )
        )
        XCTAssertTrue(
            World2DebugOverlaySettings.resolve(
                arguments: ["-world2DebugQR"],
                defaults: defaults,
                defaultWhenUnset: false
            )
        )
        defaults.removeObject(forKey: World2DebugOverlaySettings.defaultsKey)
        XCTAssertTrue(
            World2DebugOverlaySettings.resolve(
                arguments: [],
                defaults: defaults,
                defaultWhenUnset: true
            )
        )
        XCTAssertFalse(
            World2DebugOverlaySettings.resolve(
                arguments: [],
                defaults: defaults,
                defaultWhenUnset: false
            )
        )
    }

    func testSnapshotFileIsReadableBesideTheFingerprint() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("world2-debug-ticket-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: directory) }

        let ticket = World2DebugTicketCodec.make(
            from: sampleReport(screen: .furnitureStore, presentations: []),
            issuedAt: Date(timeIntervalSince1970: 1_757_810_000),
            build: "1.0.1"
        )
        let url = World2DebugTicketCodec.urlString(for: ticket)
        let snapshot = World2DebugTicketCodec.snapshot(
            ticket: ticket,
            url: url,
            report: sampleReport(screen: .furnitureStore, presentations: [])
        )

        let written = try World2DebugSnapshotStore.write(snapshot, to: directory, keeping: 1)
        let latest = directory.appendingPathComponent("latest.json")
        let text = try String(contentsOf: latest, encoding: .utf8)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decoded = try decoder.decode(World2DebugSnapshot.self, from: Data(text.utf8))

        XCTAssertEqual(written.lastPathComponent, "\(ticket.fingerprint).json")
        XCTAssertEqual(decoded, snapshot)
        XCTAssertTrue(text.contains(ticket.token))
        XCTAssertTrue(text.contains(url))
        XCTAssertTrue(text.contains("furniture_store"))
        XCTAssertTrue(text.contains("\"player\" : \"abbie\""))
    }

    private func debugQRCode(_ payload: String) -> Data? {
        guard let data = payload.data(using: .utf8),
              let filter = CIFilter(name: "CIQRCodeGenerator") else {
            return nil
        }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        guard let output = filter.outputImage else { return nil }
        return CIContext().pngRepresentation(
            of: output,
            format: .RGBA8,
            colorSpace: CGColorSpaceCreateDeviceRGB()
        )
    }

    private func sampleReport(
        screen: World2Screen,
        presentations: [String]
    ) -> World2DebugReport {
        World2DebugReport(
            screen: screen,
            playerID: .abbie,
            worldID: .home,
            sceneID: World2PlacedPlaceInstance.blankSlateSceneID,
            inspectedPOI: nil,
            gems: 12,
            quest: "quest.placeJukebox.inventory",
            error: "layout   missing",
            toast: nil,
            milestones: ["quest.placeJukebox.inventory"],
            completedPOIs: ["poi.cardFactory"],
            placeCount: 1,
            createdSceneCount: 0,
            inventoryCount: 2,
            deckCount: 0,
            presentations: presentations,
            lastEvent: "screen_changed",
            lastEventDetails: "screen=home_world"
        )
    }
}
