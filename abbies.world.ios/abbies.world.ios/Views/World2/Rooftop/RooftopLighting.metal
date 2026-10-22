#include <metal_stdlib>
#include <RealityKit/RealityKit.h>
using namespace metal;

// Opaque, curved petals give MSAA genuine geometric coverage; no translucent sorting.
[[visible]] void rooftopBlossom(realitykit::surface_parameters p) {
    float2 uv = p.geometry().uv0();
    half center = half(smoothstep(0.0, 0.55, uv.y));
    half variation = half(p.uniforms().custom_parameter().y);
    half3 rose = mix(half3(0.67, 0.045, 0.14), half3(1.0, 0.54, 0.64), variation);
    half3 color = mix(rose, half3(1.0, 0.74, 0.76), center * 0.62h);
    if (variation < 0) {
        half vein = 1.0h - half(smoothstep(0.008, 0.026, abs(uv.x - 0.5)));
        color = mix(half3(0.22, 0.035, 0.075), half3(0.51, 0.13, 0.20), half(uv.y));
        color += half3(0.08, 0.035, 0.035) * vein;
    }
    p.surface().set_base_color(color);
    p.surface().set_roughness(0.8h);
    p.surface().set_specular(0.16h);
    // Stylized thin-petal transmission floor: pale undersides, never black cutouts.
    // This is an artistic approximation, not a second physically simulated light pass.
    p.surface().set_emissive_color(color * 0.08h);
}

[[visible]] void rooftopPetalWind(realitykit::geometry_parameters p) {
    float3 v = p.geometry().model_position();
    float4 control = p.uniforms().custom_parameter();
    float t = control.z;
    float bend = smoothstep(0.0, 2.8, length(v));
    float wave = sin(t * 0.85 + control.w + v.x * 1.2) + 0.28 * sin(t * 1.7 + v.z * 3.0);
    p.geometry().set_model_position_offset(float3(wave * 0.024, sin(t + v.x) * 0.009, wave * 0.01) * bend * control.x);
}

kernel void rooftopGlowExtract(texture2d<float, access::sample> source [[texture(0)]],
                               texture2d<half, access::write> dest [[texture(1)]],
                               uint2 gid [[thread_position_in_grid]]) {
    if (gid.x >= dest.get_width() || gid.y >= dest.get_height()) return;
    constexpr sampler s(coord::normalized, address::clamp_to_edge, filter::linear);
    float2 uv = (float2(gid) + 0.5) / float2(dest.get_width(), dest.get_height());
    float3 c = source.sample(s, uv).rgb;
    float l = max(c.r, max(c.g, c.b));
    float weight = smoothstep(0.55, 0.95, l);
    dest.write(half4(half3(c * weight), 1), gid);
}
kernel void rooftopGlowComposite(texture2d<float, access::read> source [[texture(0)]],
                                 texture2d<half, access::sample> glow [[texture(1)]],
                                 texture2d<float, access::write> dest [[texture(2)]],
                                 uint2 gid [[thread_position_in_grid]]) {
    if (gid.x >= dest.get_width() || gid.y >= dest.get_height()) return;
    constexpr sampler s(coord::normalized, address::clamp_to_edge, filter::linear);
    float2 uv = (float2(gid) + 0.5) / float2(dest.get_width(), dest.get_height());
    float4 c = source.read(gid);
    c.rgb += float3(glow.sample(s, uv).rgb) * 0.28;
    dest.write(c, gid);
}
