# Meshy Animated Actor Spike

Standalone proof that a stylized humanoid can go:

**2D character art → Meshy Image-to-3D → auto-rig → multi-clip animations → GLB/USDZ → RealityKit actor**

…with little or no Blender / manual 3D work.

This lives under `experiments/` and is **not** wired into the iOS game.

## Prerequisites

- `MESHY_API_KEY` in the environment (never commit the key)
- Python 3.9+ (stdlib only)
- Xcode 15+ / macOS 14+ for `MacActorDemo`

## Pipeline

```bash
export MESHY_API_KEY='…'
cd experiments/meshy_actor
python3 mesh_pipeline.py output/intermediates/source_character.png --out output
```

Stages (logged under `output/logs/`):

1. **Image-to-3D** — `pose_mode=a-pose`, remesh ~60k tris, textured GLB  
2. **Rigging** — skeleton + skin via `input_task_id`  
3. **Animations** — `action_ids` for idle / walk / run / wave / celebrate in **one** multi-clip GLB (+ USDZ via `fbx2usdz`)

Action IDs (from Meshy library, 2026-09-15):

| State | action_id | Library name |
|-------|-----------|--------------|
| idle | 0 | Idle |
| walk | 30 | Casual Walk |
| run | 14 | Run 2 |
| wave | 290 | Wave One Hand |
| celebrate | 59 | Victory Cheer |

**Observed remapping (this `character.glb` — names lie):**

| State | Bound clip | Looks like |
|-------|------------|------------|
| idle | *(unbound)* | no true idle in pack |
| walk | `Idle` | cautious walk |
| run | `Casual_Walk` | run |
| wave | `Run_02` | one-hand wave |
| celebrate | `Wave_One_Hand` | celebrate |

See `output/observed_clip_bindings.json`. Browser AUTO-GUESS uses this remap (storage key `v2`).

Outputs:

- `output/character.glb` — multi-clip animated character  
- `output/character.usdz` — RealityKit-friendly twin (when post-process succeeds)  
- `output/inspection.json` — mesh / skin / clip report  
- `output/pipeline_summary.json` — task IDs + credits  
- `output/intermediates/` — every stage artifact  

Inspect only:

```bash
python3 mesh_pipeline.py --inspect-only output/character.glb
```

## Browser explorer (pose binder)

```bash
cd experiments/meshy_actor
python3 -m http.server 8765
# open http://127.0.0.1:8765/browser_explorer/
```

**Pose binder (not hard-coded clip guesses):**

1. Enumerates **every** animation in `character.glb` plus extra packs (e.g. `celebrate_alone_59.glb`)
2. Click a pose to preview — big **clip name badge** on the pedestal
3. **ASSIGN CURRENT → STATE** or edit the binding dropdowns if auto-guess was wrong
4. Bindings persist in `localStorage`
5. State buttons (IDLE/WALK/RUN/WAVE/CELEBRATE) only play what you bound

Cheap appearance knobs still on the right (hue / tint / sparkles).

Reference art for the upcoming Character Studio POI: `references/art-garden-map.jpg`, `references/character-studio-poi.jpg`.

## Mac demo (deferred)

Partial SwiftUI + RealityKit sources remain under `MacActorDemo/` but are not the active proof path.

## Findings

See [`MESHY_ANIMATED_ACTOR_SPIKE.md`](./MESHY_ANIMATED_ACTOR_SPIKE.md) after a successful run.
