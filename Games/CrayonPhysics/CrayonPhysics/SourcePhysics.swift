import CoreGraphics
import CrayonPhysicsCore

/// Source units and downward-positive Y stay inside the fixed-step solver.
final class SourcePhysics {
    private let world: OpaquePointer
    private var sourceHandles: [Int: Int32] = [:]

    init(level: SourceLevel) {
        world = CPWorldCreate(Float(level.gravity.x), Float(level.gravity.y), Int32(level.iterations))!
        for source in level.bodies {
            var d = CPBodyDefinition()
            d.x = Float(source.position.x); d.y = Float(source.position.y)
            d.rotation = Float(source.rotation)
            d.vx = Float(source.velocity.x); d.vy = Float(source.velocity.y)
            d.angularVelocity = Float(source.angularVelocity)
            d.width = Float(source.radius.x); d.height = Float(source.radius.y)
            d.mass = Float(source.mass); d.friction = Float(source.friction)
            d.forceX = Float(source.force.x); d.forceY = Float(source.force.y)
            d.torque = Float(source.torque); d.shape = Int32(source.shape)
            d.isStatic = source.isStatic ? 1 : 0
            sourceHandles[source.id] = CPWorldAddBody(world, d)
        }
        for joint in level.joints {
            guard let a = sourceHandles[joint.body1], let b = sourceHandles[joint.body2] else { continue }
            CPWorldAddJoint(world, a, b, Float(joint.anchor1.x), Float(joint.anchor1.y),
                            Float(joint.anchor2.x), Float(joint.anchor2.y), Float(joint.relaxation),
                            Float(joint.accumulatedImpulse.x), Float(joint.accumulatedImpulse.y))
        }
    }
    deinit { CPWorldDestroy(world) }
    func handle(for id: Int) -> Int32? { sourceHandles[id] }
    func step() { CPWorldStep(world) }
    func state(_ handle: Int32) -> CPBodyState? {
        var state = CPBodyState()
        return CPWorldGetBody(world, handle, &state) == 1 ? state : nil
    }
    func remove(_ handle: Int32) { CPWorldRemoveBody(world, handle) }
    func addDrawing(_ rectangle: RecognizedRectangle) -> Int32 {
        var d = CPBodyDefinition()
        d.x = Float((rectangle.center.x - 400) / WorldCoordinates.scale)
        d.y = Float((100 - rectangle.center.y) / WorldCoordinates.scale)
        d.rotation = -Float(rectangle.angle)
        d.width = Float(rectangle.size.width / WorldCoordinates.scale)
        d.height = Float(rectangle.size.height / WorldCoordinates.scale)
        d.mass = 2 * d.width * d.height; d.friction = 0.2
        return CPWorldAddBody(world, d)
    }
    func restoreBall(_ source: SourceBody) {
        guard let handle = sourceHandles[source.id], var current = state(handle) else { return }
        current.x = Float(source.position.x); current.y = Float(source.position.y)
        current.vx = Float(source.velocity.x); current.vy = Float(source.velocity.y)
        current.angularVelocity = Float(source.angularVelocity)
        // Release 1 restores position/velocities, retaining current rotation.
        CPWorldRestoreBody(world, handle, current)
    }
}
