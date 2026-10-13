@preconcurrency import Metal
@preconcurrency import MetalPerformanceShaders
import RealityKit

/// Half-resolution highlight bloom. Resources are reused until the viewport changes.
@available(iOS 26.0, *)
nonisolated struct RooftopGlow: PostProcessEffect {
    private var extract: (any MTLComputePipelineState)?
    private var composite: (any MTLComputePipelineState)?
    private var blur: MPSImageGaussianBlur?
    private var highlights: (any MTLTexture)?
    private var blurred: (any MTLTexture)?

    mutating func prepare(for device: any MTLDevice) {
        guard let library = device.makeDefaultLibrary(),
              let e = library.makeFunction(name: "rooftopGlowExtract"),
              let c = library.makeFunction(name: "rooftopGlowComposite") else { return }
        extract = try? device.makeComputePipelineState(function: e)
        composite = try? device.makeComputePipelineState(function: c)
        blur = MPSImageGaussianBlur(device: device, sigma: 10)
        blur?.edgeMode = .clamp
    }

    mutating func postProcess(context: borrowing PostProcessEffectContext<any MTLCommandBuffer>) {
        let source = context.sourceColorTexture, target = context.targetColorTexture
        let width = max(1, source.width / 2), height = max(1, source.height / 2)
        if highlights?.width != width || highlights?.height != height {
            let d = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .rgba16Float, width: width, height: height, mipmapped: false)
            d.usage = [.shaderRead, .shaderWrite]; d.storageMode = .private
            highlights = context.device.makeTexture(descriptor: d)
            blurred = context.device.makeTexture(descriptor: d)
        }
        guard let extract, let composite, let blur, let highlights, let blurred else {
            if let blit = context.commandBuffer.makeBlitCommandEncoder() {
                blit.copy(from: source, to: target); blit.endEncoding()
            }
            return
        }
        if let encoder = context.commandBuffer.makeComputeCommandEncoder() {
            encoder.setComputePipelineState(extract)
            encoder.setTexture(source, index: 0); encoder.setTexture(highlights, index: 1)
            encoder.dispatchThreads(MTLSize(width: width, height: height, depth: 1), threadsPerThreadgroup: MTLSize(width: 8, height: 8, depth: 1))
            encoder.endEncoding()
        }
        blur.encode(commandBuffer: context.commandBuffer, sourceTexture: highlights, destinationTexture: blurred)
        if let encoder = context.commandBuffer.makeComputeCommandEncoder() {
            encoder.setComputePipelineState(composite)
            encoder.setTexture(source, index: 0); encoder.setTexture(blurred, index: 1); encoder.setTexture(target, index: 2)
            encoder.dispatchThreads(MTLSize(width: target.width, height: target.height, depth: 1), threadsPerThreadgroup: MTLSize(width: 8, height: 8, depth: 1))
            encoder.endEncoding()
        }
    }
}
