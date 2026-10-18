#include "box2d-lite/Arbiter.h"
#include "box2d-lite/Body.h"

int CollideBoxes(Contact*, Body*, Body*);
// Release 1 FUN_004c84d0 returns zero for a zero-length vector.
static Vec2 Normalized(Vec2 value) {
    float length = value.Length();
    return length > 0 ? (1.0f / length) * value : Vec2(0, 0);
}
static int BoxCircle(Contact* contact, Body* box, Body* circle) {
    const Vec2 half = 0.5f * box->width;
    const float radius = circle->width.x * 0.5f;
    const Vec2 delta = circle->position - box->position;
    if (delta.Length() > half.Length() + radius) return 0;
    const Mat22 rotation(box->rotation);
    const Vec2 local = rotation.Transpose() * delta;
    const Vec2 closest(Clamp(local.x, -half.x, half.x), Clamp(local.y, -half.y, half.y));
    const Vec2 difference = local - closest;
    const float squared = Dot(difference, difference);
    if (squared > radius * radius) return 0;
    contact->position = box->position + rotation * closest;
    contact->normal = Normalized(circle->position - contact->position);
    contact->separation = sqrtf(squared) - radius;
    // Decompiled circle routines leave the feature ID uncertain. A stable single
    // contact key permits warm starting; executable parity remains to be checked.
    contact->feature.value = 0;
    return 1;
}
int Collide(Contact* contact, Body* first, Body* second) {
    if (first->shape == 0 && second->shape == 0) return CollideBoxes(contact, first, second);
    if (first->shape == 1 && second->shape == 1) {
        const Vec2 delta = second->position - first->position;
        const float distance = delta.Length();
        const float radius = 0.5f * first->width.x;
        const float total = radius + 0.5f * second->width.x;
        if (distance > total) return 0;
        contact->normal = Normalized(delta);
        contact->position = first->position + radius * contact->normal;
        contact->separation = distance - total;
        contact->feature.value = 0;
        return 1;
    }
    if (first->shape == 0) return BoxCircle(contact, first, second);
    if (!BoxCircle(contact, second, first)) return 0;
    const Vec2 direction = Normalized(contact->position - first->position);
    contact->position = first->position + (0.5f * first->width.x) * direction;
    contact->normal = -contact->normal;
    return 1;
}
