# Modeler — Vision Specification
Status: product vision, not a claim of current implementation
Date: 2026-10-22
Project: Abbie's World / Atelier Ranch

## North star
Build a single cohesive AI modeler that translates creative intent into reusable, semantically meaningful, portable 3D assets and experiences. The enduring product is not just a mesh: it is the **ability to reconstruct, modify, compose, and upgrade an experience** as tools and media evolve.

An asset created for Abbie's World today should remain intelligible years later: what it is, why it exists, how it was made, how it behaves, and what experience it was intended to create. A future agent should be able to say “upgrade the moon base for a holographic display” without reconstructing its history by hand.

## Core pipeline
1. **Concept / reference**: generate or ingest an isolated, visually clear 2D concept optimized for modeling. Midjourney is the preferred concept-art tool when an authenticated browser session and computer-use capability are available; it is not a hard dependency. Fall back to available multimodal image generation, or ask the user for an uploaded reference. Other input formats (including existing 3D meshes) should be pluggable.
2. **Construct**: use the concept as a visual specification to engineer actual geometry, not merely run an opaque image-to-3D conversion. Favor clean topology, normals, UVs, materials, textures, bump/normal maps, sensible polygon budgets, and identifiable components. Procedural Blender/Python recipes are especially valuable where practical.
3. **Validate, optimize, and export** (extensible stage): inspect silhouette fidelity, topology, normals, UVs, material correctness, component names, transforms, scale, rig/animation readiness, performance and engine compatibility. Emit suitable targets, e.g. GLB/glTF for runtime, Blender source for editing, OBJ for interchange, STL for printing where appropriate. An STL cannot preserve all of the materials, rigs, or semantic data of a GLB; the canonical manifest must travel alongside such exports.

Stages should be replaceable, rerunnable, and composable. Keep the source of truth separate from individual renderers and export formats.

## One agent, many tools
The user should interact with **one agent with continuous context**, not coordinate separate art and modeling agents. The agent may orchestrate Midjourney browser automation, alternative image generators, Blender, validation scripts, asset stores, and game engines. Tool choice should be visible in provenance, but should not impose manual orchestration on the user. If Midjourney access is unavailable, gracefully choose a fallback rather than block the workflow.

## Semantic composition
Treat a model as a hierarchy of addressable parts with roles and relationships: wheel → suspension → car → fleet → city; room → moon base → world. Parts may expose meaningful names, pivots, constraints, sockets, optional rigs, animation affordances, and interaction hooks. “Open the driver's door” or “replace the front-left wheel” should target a known component, not require reverse-engineering triangles. Preserve the distinction between geometry, semantic meaning, behaviors, physics, and runtime effects: a mesh is the substrate, not a complete AAA engine.

## Durable asset package / manifest (must-have)
Each asset should ship with a machine-readable, versioned manifest (JSON or equivalent), plus its source files and outputs. Capture at least:
- stable asset ID, name, description, semantic part hierarchy, coordinate system, units, scale and relationships;
- creative brief, intended audience, story, emotional/interactive purpose, and **why this asset was created and placed here**;
- input references, source images, prompts, chosen variants, generated concepts, and links or IDs for source jobs;
- tool names, model versions where known, relevant settings, dates, creator/agent, source branch/commit, and licensing/rights information;
- construction recipe or scripts when available; dependencies and links to reusable subassemblies;
- geometry/material/rig/animation metadata, validation results, performance budgets, and export targets;
- change requests, feedback, decisions, rejected alternatives, approvals, and version lineage;
- optional experience semantics: how a child encounters, plays with, and feels about the object in its scene.

The project and repository—not the agent's transient chat context—hold durable memory. Preserve sufficient context to regenerate or migrate the asset without depending on the original conversation.

## Must-haves
1. A unified user-facing modeler with pluggable concept, construction, validation, and export tools.
2. Faithful, clean, editable, semantically structured 3D outputs.
3. Source-controlled text manifests, recipes, prompts, and decisions; immutable or traceable version history.
4. Provenance, purpose, context, dependencies, and export metadata bundled or linked with every asset.
5. Component composition and reuse, with stable IDs and sensible interfaces.
6. Graceful Midjourney fallback and user-upload reference path.
7. An explicit change-order workflow: request → targeted modification → validation → new version, without silently overwriting history.
8. Future regeneration: preserve intent independently of any specific model, renderer, file format, or display technology.

## Nice-to-haves / progressive capabilities
- Rerolls and side-by-side candidate comparisons, branching variants and human preference feedback.
- Quality scoring and automatic repair loops for topology, materials, fidelity, and performance.
- Learned preferences from accepted/rejected outputs across many modeling jobs.
- Parametric families, procedural recipes, and reusable libraries of components.
- Optional rigging, physics, destructibility, simulation, and animation hooks.
- Asset lineage graph, reproducible builds, batch regeneration, and cross-platform upgrades.
- Experience-level migration: adapt entire scenes to new modalities (AR, holographic displays, higher-fidelity simulation) while preserving their original play purpose.

## Working principle
Optimize for **leverage through composition**. Every completed model should improve the next one through reusable parts, reusable procedures, and explicit feedback. Complexity can increase without forcing a human to become a Blender artist or manually rebuild earlier work.

## Implementation guidance
Treat this as a product north star, not evidence that all features exist. First inspect the existing repo, branches, model-store pipeline, and CLAUDE.md. Integrate incrementally; do not overwrite existing project conventions. Keep implementation status and architectural decisions in separate documents. This file should remain the durable statement of **what and why**, while CLAUDE.md describes **how Claude should work** and architecture docs describe **what is built**.
