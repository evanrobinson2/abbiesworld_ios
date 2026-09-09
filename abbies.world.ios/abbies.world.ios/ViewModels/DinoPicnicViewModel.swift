//
//  DinoPicnicViewModel.swift
//  abbies.world.ios
//

import Foundation
import Combine
import UIKit

@MainActor
final class DinoPicnicViewModel: ObservableObject {
    let feedGoal = 5

    @Published private(set) var phase: DinoPicnicPhase = .ready
    @Published private(set) var feedCount = 0
    @Published private(set) var currentRequest: DinoPicnicSnack = .berry
    @Published private(set) var currentPersonality: DinoPicnicPersonality = .breezy
    @Published private(set) var statusMessage = "Pick a snack for the dinosaur!"
    @Published private(set) var showTrajectoryHint = false
    @Published private(set) var awardedSeeds = 0
    @Published private(set) var roundID = UUID()
    @Published private(set) var replayCount = 0
    @Published var selectedSnack: DinoPicnicSnack = .berry

    let audioService = DinoPicnicAudioService()
    let ledger = StarSeedLedger.shared

    private var seed: UInt64
    private var plan: DinoPicnicRoundPlan
    private var firstTouchRecorded = false
    private var missCount = 0
    private var assistCount = 0
    private var snacksTried: Set<DinoPicnicSnack> = []
    private var didPrepare = false
    private let launchTime = Date()
    private let packID = "bundled.dino-picnic"
    private let packVersion = 1

    var partyProgress: Double {
        Double(feedCount) / Double(feedGoal)
    }

    var isComplete: Bool {
        phase == .celebrating
    }

    init() {
        let requestedSeed = Self.argumentValue(after: "-dinoPicnicSeed")
            .flatMap(UInt64.init)
        seed = requestedSeed ?? UInt64(Date().timeIntervalSince1970)
        plan = DinoPicnicRoundPlan.make(seed: seed, feedGoal: feedGoal)
        currentRequest = plan.requests[0]
        currentPersonality = plan.personalities[0]
    }

    func prepare() {
        guard !didPrepare else { return }
        didPrepare = true
        audioService.startBackgroundLoop()
        logEvent(
            "launch",
            extra: [
                "pack_id": packID,
                "pack_version": packVersion,
                "seed": seed
            ]
        )
        logEvent("ready")
    }

    func selectSnack(_ snack: DinoPicnicSnack) {
        selectedSnack = snack
        logEvent("snack_selected", extra: ["snack_id": snack.rawValue])
        UISelectionFeedbackGenerator().selectionChanged()
    }

    func recordFirstTouch() {
        guard !firstTouchRecorded else { return }
        firstTouchRecorded = true
        phase = .playing
        logEvent("first_touch")
    }

    func recordLaunch(
        snack: DinoPicnicSnack,
        power: Double
    ) {
        snacksTried.insert(snack)
        audioService.playRelease()
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        logEvent(
            "snack_launched",
            extra: [
                "snack_id": snack.rawValue,
                "power": Int(max(0, min(1, power)) * 100)
            ]
        )
    }

    func recordAssist() {
        assistCount += 1
        logEvent("assist_applied", extra: ["assist_count": assistCount])
    }

    func recordMiss() {
        missCount += 1
        showTrajectoryHint = missCount >= 2
        statusMessage = "So close—the snack is coming right back!"
    }

    func recordFeed(snack: DinoPicnicSnack) {
        guard phase != .celebrating else { return }

        let wasRequested = snack == currentRequest
        feedCount += 1
        missCount = 0
        showTrajectoryHint = false
        audioService.playFeed(requestedSnack: wasRequested)
        UINotificationFeedbackGenerator().notificationOccurred(.success)

        logEvent(
            "feed_completed",
            extra: [
                "snack_id": snack.rawValue,
                "requested": wasRequested,
                "feed_count": feedCount
            ]
        )

        if feedCount >= feedGoal {
            completeRound()
            return
        }

        currentRequest = plan.requests[feedCount]
        currentPersonality = plan.personalities[
            feedCount % plan.personalities.count
        ]
        statusMessage = wasRequested
            ? "\(currentPersonality.title) loved it! What should we toss next?"
            : "A surprise snack! \(currentPersonality.title) wants \(currentRequest.title.lowercased())."
    }

    func replay() {
        logEvent("replay_selected")
        replayCount += 1
        seed &+= 1
        plan = DinoPicnicRoundPlan.make(seed: seed, feedGoal: feedGoal)
        roundID = UUID()
        phase = .ready
        feedCount = 0
        currentRequest = plan.requests[0]
        currentPersonality = plan.personalities[0]
        statusMessage = "Pick a snack for the dinosaur!"
        showTrajectoryHint = false
        awardedSeeds = 0
        firstTouchRecorded = false
        missCount = 0
        assistCount = 0
        snacksTried = []
        audioService.startBackgroundLoop()
        logEvent("ready")
    }

    func cleanup() {
        audioService.stopAllAudio()
        logEvent(
            "exit",
            extra: [
                "feed_count": feedCount,
                "complete": isComplete
            ]
        )
    }

    private func completeRound() {
        phase = .celebrating
        statusMessage = "Picnic party complete!"
        audioService.playCelebration()

        logEvent(
            "round_completed",
            extra: [
                "assist_count": assistCount,
                "snack_variety": snacksTried.count
            ]
        )

        var reward = 0
        let firstCompletionGranted = ledger.grant(
            5,
            reason: "Dino Picnic first completion",
            idempotencyKey: "dino-picnic:first-completion:v1"
        )
        if firstCompletionGranted {
            reward += 5
        }

        if snacksTried.count >= 2,
           ledger.grant(
               1,
               reason: "Dino Picnic curiosity bonus",
               idempotencyKey: "dino-picnic:curiosity:\(roundID.uuidString)"
           ) {
            reward += 1
        }

        awardedSeeds = reward
        logEvent(
            "reward_granted",
            extra: [
                "amount": reward,
                "balance": ledger.balance,
                "first_completion_granted": firstCompletionGranted
            ]
        )
    }

    private func logEvent(
        _ name: String,
        extra: [String: Any] = [:]
    ) {
        var payload: [String: Any] = [
            "event": "dino_picnic.\(name)",
            "quest_run_id": roundID.uuidString,
            "seed": seed,
            "feed_count": feedCount,
            "elapsed_ms": Int(Date().timeIntervalSince(launchTime) * 1000)
        ]
        extra.forEach { payload[$0.key] = $0.value }

        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(
                  withJSONObject: payload,
                  options: [.sortedKeys]
              ),
              let json = String(data: data, encoding: .utf8) else {
            print("DINO_PICNIC_EVENT {\"event\":\"dino_picnic.error\",\"reason\":\"log_encoding\"}")
            return
        }

        print("DINO_PICNIC_EVENT \(json)")
    }

    private static func argumentValue(after flag: String) -> String? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: flag),
              arguments.indices.contains(index + 1) else {
            return nil
        }
        return arguments[index + 1]
    }
}
