// Story bookkeeping only. Never changes physics, rendering, resources or elapsed time.
export const LIFE_FIDELITY={Low:{events:6,heroEvents:12,ancestors:64,cadence:1},Medium:{events:12,heroEvents:24,ancestors:128,cadence:.5},High:{events:18,heroEvents:32,ancestors:192,cadence:.25},Ultra:{events:24,heroEvents:48,ancestors:256,cadence:.1}};
export const storyBudget=world=>LIFE_FIDELITY[world.fidelity]||LIFE_FIDELITY.Medium;
