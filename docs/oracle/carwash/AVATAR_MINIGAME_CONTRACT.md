# Avatar-played minigames: explicit FPS contract

User direction, October 24, 2026. Applies to carwash, Hot Wheels and other games played as the avatar. This is an integration requirement, not an assertion that current adapters already implement it.

The same player enters, plays and leaves. Never create a replacement player identity, inventory or controller. Declare FPS mode before entry because it governs movement, look, interaction, pointer capture, touch arbitration and pause/exit. Low-poly placeholders are permitted when assets are missing; asset fidelity does not change the mode contract.

Lifecycle: nearby optional invitation → accept through shared transition → first mission step dresses the existing avatar in a fun carwash uniform → shared FPS station interaction → partial-score finish or standard exit → restore prior outfit/control mode and return to the world. Declining must leave control unchanged. The entering vehicle retains its stable identity and receives compatible rewards through the shared reward/inventory system.

Uniforms are temporary shared-wardrobe changes, not avatar substitutions. Preserve the prior outfit for cancellation and exit. Let the shared lifecycle own restoration, including interruption or failed entry. The wash owns only dirt/soap/wax/dry state, tool choice, score and its objectives. Shared systems own player/avatar, camera, input, navigation, inventory, wardrobe, pause, saves and transitions. Use existing integration APIs after inspecting them; do not invent a parallel framework inside the minigame.

At the wash station, the shared input arbiter distinguishes tool strokes from look/locomotion. Menus, focus loss, view changes and pause release active tool contact. The part map requests a 250 ms station/turntable view transition and three zoom levels. These are work views of the same player's station, not an orbit-player identity or free-flight controller. Standard exit remains reachable on keyboard and touch.

Optional chase: suspend the wash state through shared mission transitions, request pursuit as the same avatar, then resume the same vehicle, outfit context, tool and progress. No forced transition simply from proximity.

Acceptance checks before game integration: same player ID before/during/after; uniform first and restored on exit/cancel; keyboard and touch FPS controls match the host; no duplicate input handlers or camera ownership; no tool strokes while menus/view changes own input; existing world state survives; reward applies once to the entering vehicle; leave/re-enter and chase/resume preserve promised state. The Level 1 canvas does not yet pass these avatar-integration checks and is explicitly labeled as a surface-tool experiment.
