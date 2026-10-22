#include <metal_stdlib>
#include <SwiftUI/SwiftUI.h>
using namespace metal;

/// Hardcore ripple from the aim / turbo pad (bottom-right). `position` is
/// the sample coordinate; we push pixels along the radial from `origin`.
[[ stitchable ]] float2 plinkTurboRipple(
    float2 position,
    float time,
    float2 origin,
    float amplitude,
    float wavelength
) {
    float2 delta = position - origin;
    float dist = length(delta);
    if (dist < 0.5) {
        return position;
    }
    float2 dir = delta / dist;
    float wave = sin(dist / max(wavelength, 1.0) - time * 16.0);
    float punch = sin(dist / max(wavelength * 0.45, 1.0) - time * 28.0) * 0.45;
    float falloff = exp(-dist * 0.0038);
    float shift = (wave + punch) * amplitude * falloff;
    return position + dir * shift;
}
