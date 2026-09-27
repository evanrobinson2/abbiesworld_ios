import SwiftUI

/// Soft cyan ripple on the aim / turbo pad only (never full-board warp).
struct PlinkTurboDistortion: ViewModifier {
    var strength: CGFloat
    var reduceMotion: Bool

    func body(content: Content) -> some View {
        let amp = max(0, min(1, strength))
        if amp < 0.01 {
            content
        } else if reduceMotion {
            content.overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(
                        Color(red: 0.45, green: 0.95, blue: 1.0).opacity(0.35 * amp),
                        lineWidth: 2
                    )
                    .allowsHitTesting(false)
            }
        } else {
            TimelineView(.animation) { timeline in
                let t = timeline.date.timeIntervalSinceReferenceDate
                content
                    .visualEffect { view, proxy in
                        let origin = CGPoint(
                            x: proxy.size.width * 0.5,
                            y: proxy.size.height * 0.72
                        )
                        // Keep amplitude tiny — confirmation, not a board takeover.
                        let amplitude = Float(5 * amp)
                        return view.distortionEffect(
                            ShaderLibrary.plinkTurboRipple(
                                .float(Float(t)),
                                .float2(origin),
                                .float(amplitude),
                                .float(22)
                            ),
                            maxSampleOffset: CGSize(width: 12, height: 12)
                        )
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(
                                Color(red: 0.45, green: 0.95, blue: 1.0).opacity(0.25 + 0.45 * amp),
                                lineWidth: 2
                            )
                            .allowsHitTesting(false)
                    }
            }
        }
    }
}

extension View {
    func plinkTurboDistortion(strength: CGFloat, reduceMotion: Bool) -> some View {
        modifier(PlinkTurboDistortion(strength: strength, reduceMotion: reduceMotion))
    }
}
