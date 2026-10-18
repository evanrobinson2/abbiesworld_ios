#include "CrayonPhysicsCore.h"
#include "box2d-lite/World.h"
#include "box2d-lite/Body.h"
#include "box2d-lite/Joint.h"
#include <algorithm>
#include <memory>

struct CPWorld {
    World solver;
    std::vector<std::unique_ptr<Body>> bodies;
    std::vector<std::unique_ptr<Joint>> joints;
    CPWorld(float x, float y, int iterations) : solver(Vec2(x, y), iterations) {}
    Body* get(int32_t handle) {
        return handle >= 0 && size_t(handle) < bodies.size() ? bodies[handle].get() : nullptr;
    }
};
CPWorld* CPWorldCreate(float x, float y, int32_t iterations) { return new CPWorld(x, y, iterations); }
void CPWorldDestroy(CPWorld* world) { delete world; }
int32_t CPWorldAddBody(CPWorld* world, CPBodyDefinition d) {
    if (!world || d.width <= 0 || d.height <= 0 || (!d.isStatic && d.mass <= 0)) return -1;
    auto body = std::make_unique<Body>();
    body->Set(Vec2(d.width, d.height), d.isStatic ? FLT_MAX : d.mass);
    body->shape = d.shape;
    body->position.Set(d.x, d.y); body->rotation = d.rotation;
    body->velocity.Set(d.vx, d.vy); body->angularVelocity = d.angularVelocity;
    body->force.Set(d.forceX, d.forceY); body->torque = d.torque;
    body->friction = d.friction;
    world->solver.Add(body.get());
    world->bodies.push_back(std::move(body));
    return int32_t(world->bodies.size() - 1);
}
void CPWorldRemoveBody(CPWorld* world, int32_t handle) {
    if (!world) return;
    Body* body = world->get(handle);
    if (!body) return;
    auto& joints = world->solver.joints;
    joints.erase(std::remove_if(joints.begin(), joints.end(), [body](Joint* joint) {
        return joint->body1 == body || joint->body2 == body;
    }), joints.end());
    world->joints.erase(std::remove_if(world->joints.begin(), world->joints.end(), [body](const auto& joint) {
        return joint->body1 == body || joint->body2 == body;
    }), world->joints.end());
    auto& bodies = world->solver.bodies;
    bodies.erase(std::remove(bodies.begin(), bodies.end(), body), bodies.end());
    auto& arbiters = world->solver.arbiters;
    for (auto it = arbiters.begin(); it != arbiters.end();) {
        if (it->first.body1 == body || it->first.body2 == body) it = arbiters.erase(it); else ++it;
    }
    world->bodies[handle].reset();
}
int32_t CPWorldGetBody(CPWorld* world, int32_t handle, CPBodyState* state) {
    Body* b = world ? world->get(handle) : nullptr;
    if (!b || !state) return 0;
    *state = {b->position.x, b->position.y, b->rotation, b->velocity.x, b->velocity.y, b->angularVelocity};
    return 1;
}
void CPWorldRestoreBody(CPWorld* world, int32_t handle, CPBodyState state) {
    Body* b = world ? world->get(handle) : nullptr;
    if (!b) return;
    b->position.Set(state.x, state.y); b->rotation = state.rotation;
    b->velocity.Set(state.vx, state.vy); b->angularVelocity = state.angularVelocity;
}
int32_t CPWorldAddJoint(CPWorld* world, int32_t first, int32_t second,
    float ax, float ay, float bx, float by, float relaxation, float px, float py) {
    if (!world) return 0;
    Body* a = world->get(first); Body* b = world->get(second);
    if (!a || !b || a == b || (a->invMass == 0 && b->invMass == 0)) return 0;
    auto joint = std::make_unique<Joint>();
    joint->body1 = a; joint->body2 = b;
    joint->localAnchor1.Set(ax, ay); joint->localAnchor2.Set(bx, by);
    joint->relaxation = relaxation; joint->P.Set(px, py);
    world->solver.Add(joint.get()); world->joints.push_back(std::move(joint));
    return 1;
}
void CPWorldStep(CPWorld* world) { if (world) world->solver.Step(1.0f / 60.0f); }
