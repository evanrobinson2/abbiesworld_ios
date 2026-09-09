//
//  DinoPicnicAudioService.swift
//  abbies.world.ios
//
//  Offline procedural audio for the first vertical slice.
//

import Foundation
import AVFoundation

@MainActor
final class DinoPicnicAudioService {
    private var backgroundTimer: Timer?
    private var activePlayers: [AVAudioPlayer] = []
    private var backgroundStep = 0

    init() {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("DINO_PICNIC_EVENT {\"event\":\"audio_setup_error\"}")
        }
    }

    func startBackgroundLoop() {
        guard backgroundTimer == nil else { return }
        backgroundStep = 0
        playNextBackgroundNote()
        backgroundTimer = Timer.scheduledTimer(withTimeInterval: 0.55, repeats: true) {
            [weak self] _ in
            Task { @MainActor in
                self?.playNextBackgroundNote()
            }
        }
    }

    func playStretch(power: CGFloat) {
        let clamped = max(0, min(1, power))
        playTone(
            frequency: 240 + (Double(clamped) * 120),
            duration: 0.08,
            volume: 0.13
        )
    }

    func playRelease() {
        playTone(frequency: 520, duration: 0.11, volume: 0.25)
    }

    func playFeed(requestedSnack: Bool) {
        let notes = requestedSnack ? [660.0, 880.0] : [520.0, 740.0]
        playTone(frequency: notes[0], duration: 0.12, volume: 0.3)
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(100))
            self?.playTone(frequency: notes[1], duration: 0.16, volume: 0.28)
        }
    }

    func playCelebration() {
        let notes = [523.25, 659.25, 783.99, 1046.5]
        for (index, note) in notes.enumerated() {
            Task { @MainActor [weak self] in
                try? await Task.sleep(for: .milliseconds(120 * index))
                self?.playTone(frequency: note, duration: 0.22, volume: 0.32)
            }
        }
    }

    func stopAllAudio() {
        backgroundTimer?.invalidate()
        backgroundTimer = nil
        activePlayers.forEach { $0.stop() }
        activePlayers.removeAll()
    }

    private func playNextBackgroundNote() {
        let notes = [261.63, 329.63, 392.0, 329.63, 293.66, 349.23, 440.0, 349.23]
        let note = notes[backgroundStep % notes.count]
        backgroundStep += 1
        playTone(frequency: note, duration: 0.3, volume: 0.07)
    }

    private func playTone(
        frequency: Double,
        duration: Double,
        volume: Float
    ) {
        activePlayers.removeAll { !$0.isPlaying }

        guard let data = Self.makeWaveData(
            frequency: frequency,
            duration: duration,
            volume: volume
        ),
        let player = try? AVAudioPlayer(data: data) else {
            return
        }

        player.prepareToPlay()
        player.play()
        activePlayers.append(player)
    }

    private static func makeWaveData(
        frequency: Double,
        duration: Double,
        volume: Float
    ) -> Data? {
        let sampleRate = 22_050
        let sampleCount = max(1, Int(Double(sampleRate) * duration))
        let bytesPerSample = 2
        let dataSize = sampleCount * bytesPerSample

        var data = Data()
        data.append(contentsOf: "RIFF".utf8)
        data.appendLittleEndian(UInt32(36 + dataSize))
        data.append(contentsOf: "WAVE".utf8)
        data.append(contentsOf: "fmt ".utf8)
        data.appendLittleEndian(UInt32(16))
        data.appendLittleEndian(UInt16(1))
        data.appendLittleEndian(UInt16(1))
        data.appendLittleEndian(UInt32(sampleRate))
        data.appendLittleEndian(UInt32(sampleRate * bytesPerSample))
        data.appendLittleEndian(UInt16(bytesPerSample))
        data.appendLittleEndian(UInt16(16))
        data.append(contentsOf: "data".utf8)
        data.appendLittleEndian(UInt32(dataSize))

        for sampleIndex in 0..<sampleCount {
            let progress = Double(sampleIndex) / Double(sampleCount)
            let attack = min(1, progress / 0.08)
            let release = min(1, (1 - progress) / 0.22)
            let envelope = max(0, min(attack, release))
            let sample = sin(
                2 * Double.pi * frequency * Double(sampleIndex) / Double(sampleRate)
            )
            let value = Int16(
                max(-1, min(1, sample * envelope * Double(volume))) *
                Double(Int16.max)
            )
            data.appendLittleEndian(UInt16(bitPattern: value))
        }

        return data
    }
}

private extension Data {
    mutating func appendLittleEndian<T: FixedWidthInteger>(_ value: T) {
        var littleEndian = value.littleEndian
        Swift.withUnsafeBytes(of: &littleEndian) { bytes in
            append(contentsOf: bytes)
        }
    }
}
