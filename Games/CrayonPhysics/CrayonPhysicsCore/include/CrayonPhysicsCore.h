#ifndef CRAYON_PHYSICS_CORE_H
#define CRAYON_PHYSICS_CORE_H
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
typedef struct CPWorld CPWorld;
typedef struct {
    float x, y, rotation, vx, vy, angularVelocity;
    float width, height, mass, friction, forceX, forceY, torque;
    int32_t shape, isStatic;
} CPBodyDefinition;
typedef struct { float x, y, rotation, vx, vy, angularVelocity; } CPBodyState;
CPWorld* CPWorldCreate(float gravityX, float gravityY, int32_t iterations);
void CPWorldDestroy(CPWorld* world);
int32_t CPWorldAddBody(CPWorld* world, CPBodyDefinition definition);
void CPWorldRemoveBody(CPWorld* world, int32_t handle);
int32_t CPWorldGetBody(CPWorld* world, int32_t handle, CPBodyState* state);
void CPWorldRestoreBody(CPWorld* world, int32_t handle, CPBodyState state);
int32_t CPWorldAddJoint(CPWorld* world, int32_t first, int32_t second,
    float anchor1X, float anchor1Y, float anchor2X, float anchor2Y,
    float relaxation, float impulseX, float impulseY);
void CPWorldStep(CPWorld* world);
#ifdef __cplusplus
}
#endif
#endif
