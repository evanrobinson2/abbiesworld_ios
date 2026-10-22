# LLMs doing 3D modelling: what the research says, and what it means for the imagination machine

Oracle note, 2026-10-22. Companion to the Blender game-art techniques thread.
Scope: published papers, benchmarks and practitioner write-ups on using Claude, ChatGPT and other LLMs/VLMs to build 3D, read for one question: **how do we build a critic and loss that accept Opus's correct fixes?** (Helmet study, PR #45: all 5 Opus critic edits were right, all 5 were rejected by the loss.)

## The short version

1. **Every strong system judges candidates by comparing them, not by a fixed scalar.** BlenderAlchemy, BlenderGym and GPTEval3D all run a VLM as a pairwise judge ("which of these two is closer to the target?") in a knockout tournament, and they always keep the current best as one of the candidates so the search can revert. Our loop asks a hand-built scalar to say yes. That is the reason good diagnoses get rejected.
2. **Turn the diagnosis into the loss.** CADCodeVerify has the model write yes/no verification questions about the object, then answer them on renders. BlenderWorld scores 223 tasks with 2,651 binary rubrics. For us: Opus reads the Midjourney image once and writes a checklist ("crest is a fan of 5+ straight blades", "eye slot is visible from 3/4 view", "brow ledge casts a shadow"). A cheap model answers the checklist on every candidate. The share of passed items becomes a loss term. A fix that Opus proposes for a failed item can now win.
3. **Verification compute scales better than generation compute.** BlenderGym: a small open verifier (InternVL2-8B) given more votes beat unscaled GPT-4o and Claude 3.5 Sonnet. With a large budget, spend a bigger share on verifying. This maps onto our fidelity dial: Haiku votes are cheap, so "high fidelity" should buy more votes, not only a bigger reviser.
4. **VLM judges are biased and must be de-biased.** About 26% of raw pairwise verdicts flip when you swap the order of the two images. The fix: judge every pair in both orders, keep only consistent verdicts, use two images per question rather than a big panel, render geometry as a normal-map montage, and use a different model family to evaluate than to propose.
5. **Cheap metrics are weak proxies.** Render-CLIP was at chance for mesh quality in one 2026 study. In 3DCodeBench, SigLIP-2 and DINOv3 view similarity tracked human preference best (Pearson 0.964, Spearman 0.972). Our SSIM and Canny terms are in the weak-proxy family; swap the part-crop SSIM for DINO/SigLIP/DreamSim feature distance.
6. **Multi-view helps the critic more than the generator.** Critics render 4-5 views (LL3M, CADCodeVerify, GPTEval3D). But 3DCodeBench found that giving the generator 1-4 reference views barely moved scores (at most 0.012 SigLIP-2). 3DHarnessBench found the big gains come from letting the model pick viewpoints and query the scene itself. So: generate pseudo multi-view targets for the loss and critic, and give Opus a "render me this view" tool.
7. **Program synthesis is the right bet for us.** Mesh-as-text models (LLaMA-Mesh, MeshLLM) make low-poly blobs with no editable structure. Every system that edits well (SceneCraft, LL3M, ShapeLib, 3D-GPT) writes code or parameters over a library of named parts. ShapeLib and SceneCraft also show the outer loop we want: consolidate repeated edits into reusable library functions, validated against several seed shapes. That is Evan's "reconstruct the rules" idea, already proven in the literature.
8. **Tool harnesses fix crashes, not shapes.** In 3DCodeBench, tracebacks and agent harnesses lifted executability to about 0.97-1.0 but shape scores barely moved (SigLIP-2 −0.010). Typical surviving failures: floating primitives, disconnected fragments. Add a connectivity check to the loss.

## Sources, and the one thing each teaches us

### Systems that write Blender code

- **LL3M: Large Language 3D Modelers** (2025). [arXiv 2508.08228](https://arxiv.org/abs/2508.08228), [code](https://github.com/threedle/ll3m).
  Six agents: planner, retrieval (BlenderRAG over 1,729 Blender doc pages), coder (Claude 3.7 Sonnet), critic (Gemini 2.0 Flash on 5 auto-framed views), verifier (checks the critic's fixes were actually applied), user proxy. RAG gave about 5x more complex operations and 26% fewer execution errors. Failure: VLMs miss spatial artifacts such as a disconnected handle.
  *Lesson:* split "is this fix right?" from "was this fix applied?". A cheap verifier step before scoring catches half-applied edits that the loss then blames on the idea.
- **SceneCraft** (ICML 2024). [arXiv 2403.01248](https://arxiv.org/abs/2403.01248).
  Plans a scene graph of relations, turns relations into scoring functions, solves layout, then GPT-4V critiques renders and revises the graph. An outer loop merges repeated fixes into a skill library. Constraint pass score 88.9 vs 5.6 for BlenderGPT.
  *Lesson:* the critique edits the constraints, not just the numbers. Our RULES list should be editable by the critic too.
- **3D-GPT** (2023). [arXiv 2310.12945](https://arxiv.org/abs/2310.12945).
  Task dispatcher, conceptualizer and modeler agents drive Infinigen's procedural generators through their parameters.
  *Lesson:* the LLM is good at choosing and wiring parameters of a strong procedural library, and weak at inventing geometry from nothing.
- **BlenderAlchemy** (ECCV 2024). [arXiv 2404.17672](https://arxiv.org/abs/2404.17672).
  Generator proposes b program variants, alternating small "tweak" edits with large "leap" edits; a VLM evaluator picks the best in a pairwise knockout; the current best always competes, so bad rounds revert. A text-to-image model makes a target image when only text is given. Balanced budgets (4x8 or 8x4) beat very wide or very deep searches. Vision in the evaluator gave most of the gain (CLIP 25.7 to 27.8; full system 28.2).
  *Lesson:* the evaluator, not the generator, is where vision pays. And "imagination" (make a target image first) is exactly what Midjourney already gives us.
- **ShapeLib** (2025). [arXiv 2502.08884](https://arxiv.org/abs/2502.08884).
  LLM designs a library of named shape functions from text descriptions plus about 20 seed shapes, writes several implementations per function, and keeps the one that fits the seeds best. Programs need fewer calls (9.6 vs 13.5) and are twice as semantically precise as ShapeCoder. Removing the seed shapes hurts.
  *Lesson:* grammar functions must be validated across several references, not one. The five props plus the helmet are our seed set.
- **MultiMat** (2025, procedural materials). [arXiv 2509.22151](https://arxiv.org/abs/2509.22151).
  Builds a node graph one node at a time, rendering each intermediate node and feeding the picture back; tree search backtracks on errors; a final numeric parameter polish improves fidelity.
  *Lesson:* "LLM chooses structure, optimizer polishes numbers" is the winning split here too. That matches our paper warrior finding that ES polish beat LLM numeric edits.

### CAD from text

- **CADCodeVerify** (ICLR 2025). [arXiv 2410.05340](https://arxiv.org/abs/2410.05340).
  Generate CadQuery code, render 4 views (0/90/180/270 degrees), have the VLM write and answer verification questions about the object, and feed the answers back as fixes. 7.3% lower point-cloud distance and 5.5% higher compile rate than prior work.
  *Lesson:* self-written yes/no questions are a usable, interpretable critic. This is the rubric loss in point 2.
- **CAD-Coder** (NeurIPS 2025). [arXiv 2505.19713](https://arxiv.org/abs/2505.19713).
  Trains an LLM with chain-of-thought plus a geometric (Chamfer) reward on executed code.
  *Lesson:* geometry rewards work when the target is exact 3D. Ours is a painting, so geometry alone will keep rejecting style-correct edits.

### Benchmarks and what they say about models and loops

- **BlenderGym** (CVPR 2025). [arXiv 2504.01786](https://arxiv.org/abs/2504.01786).
  245 start/goal scene pairs. Humans beat every VLM by a wide margin. Human-human pairwise agreement 0.79; best VLM verifier (Claude 3.5 Sonnet) 0.66; chance 0.5. Some models always prefer the second image. More verifier votes improved every metric, and the best split between generating and verifying shifts toward verifying as the budget grows.
  *Lesson:* treat the VLM verifier as noisy and buy accuracy with repeated, order-swapped votes.
- **3DCodeBench** (2026). [arXiv 2606.01057](https://arxiv.org/abs/2606.01057).
  12,963 Infinigen-derived tasks, Blender 5.0. Single-turn executability: Claude Opus 4.7 0.910, GPT-5.5 0.906. Two traceback retries raise the average from 0.702 to 0.974. Extra reference views change scores by 0.012 at most. SigLIP-2 correlates 0.964 with human votes. Pro models gain under 5 points from high thinking budgets; matching thinking to tier cuts cost 3-5x.
  *Lesson:* don't pay for high thinking on the reviser rounds; do pay for better metrics.
- **3DHarnessBench** (2026). [arXiv 2609.06535](https://arxiv.org/abs/2609.06535).
  Four harnesses: single view, multi-view, active view choice, full Blender function calls on the target. All frontier models improve as access grows; function calls drive most of it.
  *Lesson:* give Opus tools ("render from yaw 90", "measure crest height") instead of a fixed three-panel image.
- **BlenderWorld** (Oct 2026). [arXiv 2610.23986](https://arxiv.org/abs/2610.23986).
  223 tasks from real references, scored by multi-view renders against 2,651 binary rubrics plus holistic quality. Top fused scores: GPT-6-Astra 79.9, Opus-5 73.0. Main failure: fine-grained spatial coherence and structural reproduction.
  *Lesson:* the newest benchmark grades with rubrics, which is the scoring method we should copy.

### Judges and metrics

- **GPTEval3D: GPT-4V is a human-aligned evaluator for text-to-3D** (CVPR 2024). [arXiv 2401.04092](https://arxiv.org/abs/2401.04092).
  Pairwise comparisons on multi-view RGB grids plus surface-normal grids, one criterion at a time, ensembled over seeds, layouts and flips, aggregated into Elo. Kendall tau 0.710 with experts.
  *Lesson:* show normals next to shaded renders so geometry is judged as geometry, and judge one criterion per question.
- **De-biased VLM-as-3D-judge protocol** (2026). [arXiv 2606.20364](https://arxiv.org/abs/2606.20364).
  With a reference plus a seven-image panel, a 7B judge answered purely by position (100% flips). Fixes: two images per comparison, both orders, keep only consistent verdicts, 2x2 normal-map montage, separate judge families for training and evaluation, and sanity checks (clear gap should score 0.83-1.0, identical pairs about 0.5). Reference-free "which is better" rewards clean but wrong outputs.
- **Cross-model VLM judge for 3D mesh quality** (2026). [arXiv 2606.18451](https://arxiv.org/abs/2606.18451).
  About 26% of raw verdicts flip with order; correcting raised agreement from 0.33 to 0.71. Two judge families agree 0.83 (kappa 0.66). Render-CLIP agreed with the judge at chance (0.48).
- **DreamSim** (NeurIPS 2023). [arXiv 2306.09344](https://arxiv.org/abs/2306.09344).
  Perceptual similarity trained on human judgments over synthetic variations; it is sensitive to layout, pose and shape as well as texture, where LPIPS and SSIM mostly see texture.

### Mesh-token models (the road we are not taking)

- **LLaMA-Mesh** (NVIDIA, 2024). [arXiv 2411.09595](https://arxiv.org/abs/2411.09595). Writes OBJ vertices and faces as text.
- **MeshLLM** (2025). [arXiv 2508.01242](https://arxiv.org/abs/2508.01242). Builds meshes progressively from local parts.
  *Lesson:* fine for small low-poly props, but there is no named structure to edit, and no grammar to reuse. Keep these as a possible fallback for one-off props only.

### Multi-view targets from one image

- **Zero123++** [arXiv 2310.15110](https://arxiv.org/abs/2310.15110), **MV-Adapter** (ICCV 2025) [paper](https://openaccess.thecvf.com/content/ICCV2025/papers/Huang_MV-Adapter_Multi-View_Consistent_Image_Generation_Made_Easy_ICCV_2025_paper.pdf), **Hunyuan3D-2mv** [model card](https://www.huggingface.co/tencent/Hunyuan3D-2mv/blob/main/README.md), **CharacterGen** [arXiv 2402.17214](https://arxiv.org/abs/2402.17214).
  These turn one image into consistent side and back views, or into a rough mesh.
  *Lesson:* a Midjourney front view plus generated side/back views gives the loss the depth it is blind to today. Use the generated views for silhouette and landmark terms only (they invent detail), and keep the Midjourney view as the only style target.

### Practitioner write-ups

- **Claude + Blender MCP in practice** ([MindStudio](https://www.mindstudio.ai/blog/claude-blender-mcp-real-world-performance)). Works: scene setup, primitives, lighting, materials, batch scripts. Fails: organic shapes, faces, geometry nodes, proportion and taste, precise placement (several correction rounds).
- **From Blender MCP to 3D agents** ([dev.to](https://dev.to/glglgl/from-blender-mcp-to-3d-agent-the-evolution-of-ai-powered-blender-modeling-1m7d)). Viewport check after every step; clean topology decides whether output is usable.
- The MindStudio piece also advises: treat it as fast prototyping, read the generated script, and give exact numbers when precision matters. (Further reading, not reviewed here because it is paywalled: [3D modelling with Claude Code, UX Planet](https://uxplanet.org/3d-modeling-with-claude-code-a-practical-blender-workflow-97e6e0b536b0).)
  *Lesson:* practitioners agree with the papers. LLMs are good planners and coders, poor eyes for proportion. The eye has to be a separate, calibrated critic.

## What to change in tools/paper-helmet and tools/paper-warrior

### 1. Loss v3: a gate plus a vote plus a rubric

Keep `hloss.py` as a **gate**, not a judge: a candidate may not make silhouette IoU or landmark error worse than a tolerance (say 5%). Inside the gate, accept or reject by:

- **Rubric score.** Once per asset, Opus reads the Midjourney image and writes 10-20 binary checks, each tagged with the view it needs and the part crop it concerns. Haiku answers each check on each candidate (shaded + normal render, two images: reference crop and candidate crop). Loss term = share of failed checks.
- **Pairwise vote.** Current best vs candidate, two images plus the reference, asked in both orders, k votes. Keep only order-consistent votes. Accept if the candidate wins the majority.
- **Perceptual term.** Replace `parts_ssim` with DINOv2 (or DreamSim) feature distance on the same part crops.
- **Connectivity term.** Count disconnected mesh islands that are not meant to be separate parts.

### 2. Replay test before anything else

We already have the perfect calibration set: the 5 Opus helmet edits that were right but rejected, plus known-bad edits (the crumple filter, the back-view flip). Loss v3 passes if it accepts the 5 good edits and rejects the bad ones, with order-swap flip rate under 15%. This costs well under a dollar and tells us whether v3 fixes the bottleneck before we build more.

### 3. The fidelity dial, re-cut

| Dial | Reviser | Critic / verifier | Search |
|---|---|---|---|
| Haiku | Haiku edits + ES polish | Haiku, k=3 order-swapped votes, rubric | 1 x 4 |
| Sonnet | Sonnet edits + ES | Haiku k=5 + Sonnet tiebreak, rubric | 2 x 4 |
| Opus | Opus global read + leap edits, Haiku tweaks, ES | Haiku k=7, a non-Anthropic judge as a second family where available, rubric written by Opus | 4 x 8 |

The Opus tier spends most of its extra money on verifying, as BlenderGym recommends.

### 4. Prompt structure for the reviser (what the papers converge on)

- Coarse to fine, one idea per round (already in `critic.py`; keep it).
- Alternate **tweak** rounds (numbers only, 3-8 edits) and **leap** rounds (change structure: add a part, swap a grammar rule).
- Ask the reviser to name **which rubric items its edit should flip** and **which loss terms should move**. If the gate passes and the predicted rubric items flip, accept even when the old scalar disagrees. If the prediction fails, show it the actual result next round.
- Give it the rejection history with the reason (gate failure, lost vote, rubric unchanged), not just "rejected".
- Give it tools rather than a fixed panel: render from a named yaw, toggle normals, crop a part.
- Always include the current best in the candidate set so a bad round reverts.
- Add a verifier step after each edit ("is the crest now 5 blades?") before scoring, as LL3M does.

### 5. Multi-view targets

Generate side and back views from the Midjourney image (MV-Adapter, Zero123++ or Hunyuan3D-2mv; or a Midjourney turnaround sheet on the Mac). Use them only for silhouette and landmarks, with a lower weight than the front view. This attacks the depth-erasing problem from the helmet study (crest thickness, brow ledge, eye slot), which we currently patch with hand-written RULES.

### 6. Library learning

After each asset, look for edits that recur across parts (for example "hemmed plate edge" or "fan of straight blades") and promote them into the grammar as named functions, validated on all seed props, as ShapeLib and SceneCraft do. Over time the critic edits rules, not only parameters.

## Open questions

- Which second judge family can we call from the cloud container? Without one, the "different family" de-bias step falls back to Haiku vs Sonnet, which is weaker.
- Can DINOv2 run on CPU fast enough inside the ES loop, or only at accept/reject time? Likely accept/reject only.
- How much do generated side views hallucinate for stylized papercraft? Needs one test on the helmet before trusting it.
