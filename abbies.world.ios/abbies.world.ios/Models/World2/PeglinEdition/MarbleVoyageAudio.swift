import Foundation

/// Voyage UI cues — reuses Plink CC0 SFX pack under Resources/SFX/Plink/.
enum MarbleVoyageAudio {
    static func tap() { PlinkSFX.play(.ui) }
    static func choosePath() { PlinkSFX.play(.march) }
    static func heal() { PlinkSFX.play(.win) }
    static func sting() { PlinkSFX.play(.hurt) }
    static func victory() { PlinkSFX.play(.win) }
    static func defeat() { PlinkSFX.play(.miss) }
    static func modeSelect() { PlinkSFX.play(.crit) }
    static func sceneTransition() { PlinkSFX.play(.launch) }
}
