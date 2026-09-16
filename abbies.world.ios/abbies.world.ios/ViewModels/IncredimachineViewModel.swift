//
//  IncredimachineViewModel.swift
//  abbies.world.ios
//

import Foundation
import UIKit
import Combine

@MainActor
final class IncredimachineViewModel: ObservableObject {
    @Published var settings = MachineSettings()
    @Published var phase: IncredimachinePhase = .setup
    @Published var heads: [FlyerHead] = []
    @Published var selectedHeadID: String?
    @Published var statusMessage = "Twist the knobs, then launch!"
    @Published var isWorking = false
    @Published var awardedSeeds = 0
    @Published var flightID = UUID()
    @Published var launchToken = 0

    let ledger = StarSeedLedger.shared
    private let launchTime = Date()
    private var didPrepare = false
    private var firstLaunchRecorded = false

    var selectedHead: FlyerHead? {
        heads.first { $0.id == selectedHeadID } ?? heads.first
    }

    func prepare() {
        guard !didPrepare else { return }
        didPrepare = true
        heads = HeadDAGService.shared.bundledHeads()
        selectedHeadID = heads.first?.id
        logEvent("ready", extra: ["head_count": heads.count])

        if ProcessInfo.processInfo.arguments.contains("-autoPlayWhizbang") {
            settings = MachineSettings(angle: 0.62, power: 0.78, spin: 0.4, fanOn: false, bounceOn: true, balloonOn: true)
            statusMessage = "Auto-launching the Whizbang…"
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { [weak self] in
                self?.requestLaunch()
            }
        }
    }

    func cleanup() {
        logEvent("exit")
    }

    func selectHead(_ head: FlyerHead) {
        selectedHeadID = head.id
        UISelectionFeedbackGenerator().selectionChanged()
        statusMessage = "\(head.name) is in the seat!"
    }

    func requestLaunch() {
        guard phase != .flying, selectedHead != nil else { return }
        if !firstLaunchRecorded {
            firstLaunchRecorded = true
            logEvent("first_touch")
        }
        phase = .flying
        flightID = UUID()
        launchToken += 1
        statusMessage = "Whizbang… GO!"
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        logEvent("launched", extra: [
            "angle": Int(settings.launchDegrees),
            "power": Int(settings.power * 100),
            "fan": settings.fanOn,
            "bounce": settings.bounceOn,
            "balloon": settings.balloonOn
        ])
    }

    func resetMachine() {
        phase = .setup
        flightID = UUID()
        statusMessage = "Tune it again. Launch whenever you want."
    }

    func recordLanding() {
        guard phase == .flying else { return }
        phase = .landed
        statusMessage = "Cloud bed! What a floppy landing!"
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        logEvent("landed")
        if ledger.grant(5, reason: "whizbang.landing", idempotencyKey: "whizbang.first-landing") {
            awardedSeeds = 5
        }
    }

    func recordMiss() {
        guard phase == .flying else { return }
        phase = .setup
        statusMessage = "Bonk. Twist something and try again!"
        logEvent("miss")
    }

    func extractFromGallery() async {
        isWorking = true
        statusMessage = "Asking the picture where the head is…"
        defer { isWorking = false }
        do {
            let gallery = try await HeadDAGService.shared.fetchGallery()
            guard let pick = gallery.randomElement() else {
                statusMessage = "No pictures yet. Draw a head, or use a bundled flyer."
                return
            }
            let image = try await HeadDAGService.shared.loadImage(for: pick)
            let path = HeadDAGService.shared.assetPath(for: pick)
            let head = await HeadDAGService.shared.extractHead(
                from: image,
                sourcePath: path,
                name: (pick.prompt?.split(separator: ",").first).map(String.init) ?? "Gallery pal"
            )
            heads.insert(head, at: 0)
            selectedHeadID = head.id
            statusMessage = "Head extracted. \(head.name) is ready to flop!"
            logEvent("head_extracted", extra: ["filename": pick.filename])
        } catch {
            statusMessage = "Couldn’t reach the gallery. Using a bundled flyer."
            print("Whizbang: gallery extract failed: \(error.localizedDescription)")
        }
    }

    func drawOnlyHead() async {
        isWorking = true
        statusMessage = "Drawing only a head…"
        defer { isWorking = false }
        do {
            let reference = try await referencePathFromGallery()
            let result = try await HeadDAGService.shared.drawHead(
                referencePath: reference,
                name: "Drawn head"
            )
            let head = FlyerHead(
                id: "drawn-\(UUID().uuidString)",
                name: "Drawn head",
                image: result.image,
                source: .drawn
            )
            heads.insert(head, at: 0)
            selectedHeadID = head.id
            statusMessage = "New sticker head! Launch whenever you want."
            logEvent("head_drawn", extra: ["url": result.url])
        } catch {
            statusMessage = "Draw-head didn’t finish. Bundled flyers still work."
            print("Whizbang: draw-only head failed: \(error.localizedDescription)")
        }
    }

    private func referencePathFromGallery() async throws -> String? {
        let gallery = try await HeadDAGService.shared.fetchGallery()
        return gallery.first.map { HeadDAGService.shared.assetPath(for: $0) }
    }

    private func logEvent(_ name: String, extra: [String: Any] = [:]) {
        var payload: [String: Any] = [
            "event": "whizbang.\(name)",
            "elapsed_ms": Int(Date().timeIntervalSince(launchTime) * 1000),
            "phase": "\(phase)"
        ]
        extra.forEach { payload[$0.key] = $0.value }
        if let data = try? JSONSerialization.data(withJSONObject: payload),
           let line = String(data: data, encoding: .utf8) {
            print(line)
        }
    }
}
