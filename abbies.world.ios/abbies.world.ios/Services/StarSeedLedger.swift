//
//  StarSeedLedger.swift
//  abbies.world.ios
//
//  Local append-only ledger for the fictional child economy.
//

import Foundation
import Combine

struct StarSeedLedgerEntry: Codable, Identifiable, Equatable {
    let id: UUID
    let idempotencyKey: String
    let delta: Int
    let reason: String
    let occurredAt: Date
    let resultingBalance: Int
}

@MainActor
final class StarSeedLedger: ObservableObject {
    static let shared = StarSeedLedger()

    @Published private(set) var balance = 0
    @Published private(set) var entries: [StarSeedLedgerEntry] = []

    private let isTestMode: Bool
    private let ledgerURL: URL?

    private init() {
        isTestMode = ProcessInfo.processInfo.arguments.contains("-autoPlayDinoPicnic")
        ledgerURL = isTestMode ? nil : Self.makeLedgerURL()
        load()
    }

    @discardableResult
    func grant(
        _ amount: Int,
        reason: String,
        idempotencyKey: String
    ) -> Bool {
        guard amount > 0,
              !entries.contains(where: { $0.idempotencyKey == idempotencyKey }) else {
            return false
        }

        let newBalance = balance + amount
        let entry = StarSeedLedgerEntry(
            id: UUID(),
            idempotencyKey: idempotencyKey,
            delta: amount,
            reason: reason,
            occurredAt: Date(),
            resultingBalance: newBalance
        )
        entries.append(entry)
        balance = newBalance
        persist()
        return true
    }

    func hasEntry(idempotencyKey: String) -> Bool {
        entries.contains(where: { $0.idempotencyKey == idempotencyKey })
    }

    private func load() {
        guard let ledgerURL,
              let data = try? Data(contentsOf: ledgerURL),
              let decoded = try? JSONDecoder().decode([StarSeedLedgerEntry].self, from: data) else {
            entries = []
            balance = 0
            return
        }

        entries = decoded
        balance = decoded.last?.resultingBalance ?? 0
    }

    private func persist() {
        guard let ledgerURL else { return }

        do {
            let data = try JSONEncoder().encode(entries)
            try data.write(to: ledgerURL, options: .atomic)
        } catch {
            print("STAR_SEED_LEDGER_EVENT {\"event\":\"persist_error\",\"message\":\"\(Self.sanitize(error.localizedDescription))\"}")
        }
    }

    private static func makeLedgerURL() -> URL? {
        guard let applicationSupport = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first else {
            return nil
        }

        let directory = applicationSupport.appendingPathComponent(
            "AbbiesWorld",
            isDirectory: true
        )

        do {
            try FileManager.default.createDirectory(
                at: directory,
                withIntermediateDirectories: true
            )
            return directory.appendingPathComponent("star-seed-ledger-v1.json")
        } catch {
            print("STAR_SEED_LEDGER_EVENT {\"event\":\"directory_error\",\"message\":\"\(sanitize(error.localizedDescription))\"}")
            return nil
        }
    }

    private static func sanitize(_ value: String) -> String {
        value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: " ")
    }
}
