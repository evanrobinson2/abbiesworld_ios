#include "CrayonPhysicsCore.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <vector>

static CPBodyDefinition body(float x, float y, float w, float h, int shape = 0, bool fixed = false) {
    CPBodyDefinition d{};
    d.x = x; d.y = y; d.width = w; d.height = h;
    d.shape = shape; d.isStatic = fixed; d.mass = 2*w*h; d.friction = 0.2f;
    return d;
}
static CPBodyState state(CPWorld* world, int handle) {
    CPBodyState s{}; assert(CPWorldGetBody(world, handle, &s)); return s;
}
static void near(float actual, float expected, float tolerance = 0.0001f) {
    assert(std::isfinite(actual)); assert(std::fabs(actual - expected) < tolerance);
}
static std::vector<CPBodyState> replay() {
    auto world = CPWorldCreate(0, 10, 10);
    CPWorldAddBody(world, body(0, 5, 20, 1, 0, true));
    int ball = CPWorldAddBody(world, body(-2, 0, 1, 1, 1));
    auto weight = body(-2.4f, -3, 2, 2);
    weight.rotation = 0.3f;
    CPWorldAddBody(world, weight);
    std::vector<CPBodyState> states;
    for (int i = 0; i < 300; ++i) {
        CPWorldStep(world);
        states.push_back(state(world, ball));
    }
    CPWorldDestroy(world);
    return states;
}
int main() {
    // Semi-implicit Euler, exactly 60 steps, no damping or velocity caps.
    auto world = CPWorldCreate(0, 10, 10);
    int falling = CPWorldAddBody(world, body(0, 0, 1, 1));
    for (int i = 0; i < 60; ++i) CPWorldStep(world);
    near(state(world, falling).vy, 10); near(state(world, falling).y, 10.0f * 61 / 120);
    CPWorldDestroy(world);

    // Circle against a static floor settles at radius+half-floor-height.
    // Run both allocation orders, exercising reversed contact dispatch.
    for (int order = 0; order < 2; ++order) {
        world = CPWorldCreate(0, 10, 10);
        int ball;
        if (order == 0) CPWorldAddBody(world, body(0, 5, 20, 1, 0, true));
        ball = CPWorldAddBody(world, body(0, 0, 1, 1, 1));
        if (order == 1) CPWorldAddBody(world, body(0, 5, 20, 1, 0, true));
        for (int i = 0; i < 600; ++i) CPWorldStep(world);
        near(state(world, ball).y, 4, 0.025f); near(state(world, ball).vy, 0, 0.01f);
        CPWorldRemoveBody(world, ball); assert(!CPWorldGetBody(world, ball, nullptr));
        for (int i = 0; i < 10; ++i) CPWorldStep(world);
        CPWorldDestroy(world);
    }

    // Two serialized local anchors, initial impulse and relaxation must survive
    // loading. The hanging body stays one world unit below its static anchor.
    world = CPWorldCreate(0, 10, 10);
    int pin = CPWorldAddBody(world, body(0, 0, 0.1f, 0.1f, 0, true));
    int hanging = CPWorldAddBody(world, body(0, 1, 0.5f, 1));
    assert(CPWorldAddJoint(world, pin, hanging, 0, 0, 0, -1, 0.8f, 0, -0.1f));
    for (int i = 0; i < 600; ++i) CPWorldStep(world);
    near(state(world, hanging).y, 1, 0.001f);
    CPWorldRemoveBody(world, pin); // Removes associated joint and cached contacts.
    for (int i = 0; i < 60; ++i) CPWorldStep(world);
    near(state(world, hanging).vy, 10);
    CPWorldDestroy(world);
    const auto expected = replay();
    for (int repeat = 0; repeat < 10; ++repeat) {
        // Perturb allocator reuse between otherwise identical contact-rich runs.
        auto unrelated = CPWorldCreate(0, 10, 10);
        for (int i = 0; i < repeat + 1; ++i) CPWorldAddBody(unrelated, body(float(i), 0, 1, 1));
        const auto actual = replay();
        for (size_t i = 0; i < expected.size(); ++i) {
            assert(actual[i].x == expected[i].x && actual[i].y == expected[i].y);
            assert(actual[i].vx == expected[i].vx && actual[i].vy == expected[i].vy);
            assert(actual[i].rotation == expected[i].rotation);
            assert(actual[i].angularVelocity == expected[i].angularVelocity);
        }
        CPWorldDestroy(unrelated);
    }
    std::puts("PASS: fixed step, free fall, circle-floor contacts, local-anchor joint, removal, allocator-independent replay");
}
