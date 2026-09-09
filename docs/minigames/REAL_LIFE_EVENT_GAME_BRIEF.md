# Real-Life Event → Game Brief

Use this brief to turn a real event into safe, playful product input. Keep the raw family note local. Commit or send only the sanitized brief.

## Design sequence

1. Identify the smallest truthful lesson, feeling, or preparation goal.
2. Choose a playful mechanic that embodies it without becoming a quiz.
3. Remove unnecessary personal details.
4. Define a short child-observation gate before producing a full art pack.
5. Reward participation and curiosity, never compliance or emotional performance.

## Sanitized brief template

```yaml
brief_version: 1
title: ""

event:
  generic_situation: ""       # Example: "first dental cleaning"
  timing: ""                  # Example: "upcoming"; omit exact dates
  known_facts: []             # Only facts needed for truthful game content
  private_source: "LOCAL_ONLY"

intent:
  parent_goal: ""
  play_hypothesis: ""         # A hypothesis, not a diagnosis
  success_observation: ""     # Example: "chooses to replay one cleaning round"

experience:
  format: ""                  # prepare | practice | imagine | reflect
  core_mechanic: ""
  meaningful_choices: []
  gentle_assists: []
  round_length_seconds: 60
  failure_state: "none"

content:
  characters: []
  environments: []
  props: []
  audio_cues: []
  dialogue_facts: []
  avoid: []

economy:
  completion_reward: 0
  optional_curiosity_bonus: 0
  permanent_unlock: ""
  rating_affects_reward: false

verification:
  launch_argument: ""
  automated_path: ""
  required_events: []
  simulator_checks: []
  physical_ipad_gate: ""

cloud_handoff:
  sanitized: true
  excluded_details: []
  permitted_outputs: []
```

## Example: dental preparation

```yaml
title: "Dino Tooth Spa"
event:
  generic_situation: "first dental cleaning"
  timing: "upcoming"
  known_facts:
    - "A friendly adult may count and clean teeth."
    - "The cleaning tools can make sounds."
  private_source: "LOCAL_ONLY"
intent:
  parent_goal: "Make the sequence familiar and give Abbie playful agency."
  play_hypothesis: "Helping a dinosaur choose and use tools may make the sequence less unfamiliar."
  success_observation: "Abbie chooses to clean another dinosaur or retells one true step."
experience:
  format: "prepare"
  core_mechanic: "Choose an oversized tool, clean silly food spots, and pick the dinosaur's celebration."
  meaningful_choices: ["dinosaur", "tool", "celebration"]
  gentle_assists: ["large targets", "automatic final sparkle", "no timer"]
  round_length_seconds: 60
  failure_state: "none"
economy:
  completion_reward: 5
  optional_curiosity_bonus: 1
  permanent_unlock: "sparkle toothbrush sticker"
  rating_affects_reward: false
```

## Non-negotiable review

- Does the mechanic carry the idea without requiring reading?
- Is every personal detail necessary and parent-approved?
- Does every action receive immediate, gentle feedback?
- Can Abbie stop without losing currency, progress, or approval?
- Is the guide describing rather than judging?
- Will a deterministic textual test and a real-iPad observation both be performed?
