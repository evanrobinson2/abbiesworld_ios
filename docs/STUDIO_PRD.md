# Studio — Product Requirements

Status: draft, 2026-09-19. First slice is the Play canvas in `prototypes/studio-mock`.

The studio is the tool that makes Abbie's World 2 content. The iPad is the player. A new world is a document plus registry files. It does not need a new app build.

## Next development batch

Queued 2026-09-19. Do not start until this batch is opened.

1. Panels are resizable. Map / Scene (and the other two-view layouts) have a drag handle between them. Equal columns are only the default. The split persists for the session. Secondary now: Play is the default editor, and the map is the interface. Resize those power-user splits when someone is actually using them.

## 1. Where it lives

One web app. It absorbs the media inbox (`prototypes/media-drop`) and the asset browser (`prototypes/asset-viewer`). The inbox and the browser are rooms, not separate sites.

Login is Auth0 on the **same tenant as the iPad** (`dev-33h7qd4ytudlk0ls.us.auth0.com`, audience `https://api.abbies.world`). Media Drop's Marketplace tenant is the wrong login. A world saved there will not appear in the game. Children do not get this app.

Three stores:

- **Asset server** holds bytes. Game Asset API v1. The admin key stays on the server. The iPad keeps its read key.
- **Auth0 world list** is what the iPad plays. One account, any number of worlds.
- **Supabase** holds drafts and jobs only: prompts, Meshy tasks, carve reports, unpublished graphs. The iPad never reads Supabase. StoryBoard's database is a different product and is not reused.

Meshy, OpenAI, and carving keys never go in the browser or in the iOS app.

## 2. Boundary with the game

The studio writes the document the game already loads, plus the registry files that document names.

| Noun | What gets published |
| --- | --- |
| Scene | Backdrop, places dropped on it, the song for that scene |
| Place | Name, exterior, interior, and a `behavior` that is already a screen in the app |
| Edge | From this scene to that scene |
| Character | One file per gait: idle, walk, run |
| Decoration / prop | Carved image and its semantic id |
| Song | A file in the registry, chosen for a scene |
| World | The graph of those scenes, a name, a revision |

A new kind of screen still needs an iPad build. The in-game Asset Workbench stays on recipe cards. This studio does not put a free-text prompt in the child app.

If the world has no character models, the iPad does not draw a portrait and does not show the sticks. You tap places.

## 3. Editor UX

The north-star editor is the game, with inspired chrome and adaptive dialogues. The map is the interface for every edit. You do not open a second room to change a place. You click the place. Grown-up maker, not a child prompt box.

**Play (default).** One large view of the current scene. The background is letterboxed and fitted like the iPad overland plate. Places sit on it as sprites at their x/y. Click a place to select it. Click empty ground to select the scene.

**Adaptive dialogue.** A floating card, not a panel grid. It only shows fields that can change for the current selection.

- Scene: name, background, song, add place.
- Place: name, behavior (which existing screen it opens), exterior, interior, delete.
- Travel / portal: destination scene. No interior.

Studio may still pick images. The child app does not get a free-text prompt.

**Power layouts.** Map graph (scenes as nodes, a line is travel) and Scene / POI splits stay in the layout switcher. They are optional. Resizable panel splits stay queued; they are secondary once the canvas is the map.

**Later rooms.** Inbox, asset maker, character studio, and music inventory still exist as rooms. They feed the registry. They are not the editor. The painted minimap on the iPad is a picture the player sees. It is not the studio graph.

**Inbox.** Songs and pictures dropped in, including Suno and Midjourney. A drop can be sent to a maker. Nothing here is playable until it is published.

**Asset maker.** A batch of prompts. The server generates backgrounds, carves them, and you keep the ones that pass. Output is a registry image: a decoration, a background, or a place picture.

**Character studio.** The Meshy path that already works locally, run as a server job. Picture in, A-pose mesh, rig, then one animation action per file (idle, walk, run). Bind the clip, preview it, publish under `actors/`. Characters do not go through Midjourney.

**Music inventory.** Tracks the inbox accepted. Assign one to a scene.

## 4. Save to game

Save to game is the injector. It does not pack files into the app.

1. Pictures, models, and songs upload to the asset registry.
2. The graph, scenes, places, edges, and song choices are written to one world id.
3. The iPad lists worlds, you pick one, and it plays that document.

Until you save, the iPad does not change.

### Server

Today `worlds.auth0_sub` is the primary key, so a second save overwrites the first. That limit is fake. The table becomes a list: `id`, `auth0_sub`, `name`, `revision`, `document`, `updated_at`. The owner is a column. The one world already stored stays as the first row. Revision is per world.

- `GET /api/v1/worlds` returns id, name, and revision. Not the documents.
- `POST /api/v1/worlds` creates an empty world and returns its id.
- `GET` and `PUT /api/v1/worlds/{id}` are the pull and the save. `PUT` still sends `expectedRevision` for that id.
- `GET` and `PUT /api/v1/worlds/current` stay as the last world opened, so the iPad build that only knows `/current` does not break before the selector ships.

### iPad

A world selector. Pick a row, pull that id, play only that document. Edges and the song on each scene are read from the document. The real screens stay in the app. There is no second engine in the browser. Playing a saved world on the iPad is the simulator.

## 5. Build order (original)

1. Server world list, with `/current` kept as the last one opened.
2. Studio shell on the iPad's Auth0 tenant. Inbox and browser are rooms.
3. Asset maker: batch, generate, carve, publish.
4. Character studio: Meshy job, clip bind, publish `actors`.
5. Scene maker and world graph, one edge list.
6. Music inventory.
7. Save to game, then the iPad selector.

## 6. What we looked at

Looked up on 2026-09-19. These tools already do a piece of this. We are not adopting them.

| Tool | What they are good at | What we are not taking |
| --- | --- | --- |
| [AdventureForge](https://adventureforge.it/home) | A storyboard map of connected scenes, and hotspots dropped on a background | Their Phaser runtime, dialogue trees, and event-graph scripting |
| [Adventure Forge](https://adventureforge.itch.io/adventure-forge) | Scenes as the unit, with the flow drawn as a graph instead of one tangled web | Nested event logic and weighted "what happens next" |
| [PACE](https://github.com/rmarronnier/pace_editor) | Dragging interactive spots on a background, then saving the scene | Walk meshes, dialogue mode, quest mode |
| [World Forge](https://github.com/mcp-tool-shop-org/world-forge) | One editor, then an export pack another engine loads | Tile painting, and export lanes for Unreal and Godot |
| [Scenario](https://www.scenario.com) | A batch that stays one style, because later pictures are tied to pictures you already accepted | Training a private model |
| [Layer](https://www.layer.ai) | Batch jobs in one place | A catalog of hundreds of models |
| [Promethean AI](https://www.prometheanai.com/ai-world-building) | Place from a library you already have | A 3D level editor |
| [Meshy](https://docs.meshy.ai/en/api/image-to-3d) | Image to mesh, then rig, then one `action_id` per clip. A-pose first. Poll until the task succeeds | Using their website as the studio. We already have the pipeline locally |
| [Midjourney Create](https://docs.midjourney.com/hc/en-us/articles/33390732264589-Creating-on-Web) | The Imagine bar. Style reference is `--sref`. Aspect is `--ar` | A URL that fills the Imagine bar. Their docs say you type or paste. They do not publish a prefill link |

The gap: every prompt was going to be typed by hand, and nothing kept the next background in the same style as the last one.

## 7. Added capabilities

Three. No dialogue writer, no second game engine, no model picker.

### 7.1 Prompt engine

A button in the scene maker, the place editor, and the asset maker: "Write prompts."

You type a plain line ("a night market on the south edge, three stalls, a gate"). The asset server calls OpenAI `gpt-5.6` with reasoning effort `low` and returns a short JSON list:

- one prompt per candidate (scene background, place exterior, place interior, or a decoration batch);
- the aspect already on the prompt (`--ar`);
- the project's style pin already on the prompt, when one is set;
- no people, no brands, no text in the picture, and a flat background when the output will be carved.

The list is editable. It is stored on the draft so you can run it again. The model does not publish, and it does not see the admin key.

### 7.2 Open in Midjourney

On a 2D candidate, a button: "Open in Midjourney."

It copies the prompt and opens `https://www.midjourney.com/create` in a new tab. One line tells you the prompt is copied and to paste it into the Imagine bar. Midjourney does not offer a link that fills that box. If they publish one later, the button should use it and stop asking for a paste.

Characters do not get this button.

### 7.3 Style pin

One control on the project: "Use this as the style."

Point it at an accepted background, or paste a Midjourney `--sref` code. The prompt engine and the asset-maker batch both attach it. One pin per project. Clear it when the next world should look different.

This is how a new place stays in the same game without training a model.

## 8. Still out

- Custom-trained art models, node-based workflow editors, and a menu of generators.
- Dialogue trees, voice, and quests.
- A browser copy of the iPad, including its screens.
- Several Meshy actions merged into one file. RealityKit plays one clip per file.
- A free-text prompt inside the child app.

## 9. Not in the repo yet

The studio cannot be finished from these repos alone.

- A Supabase project for drafts and jobs. Not StoryBoard's.
- `MESHY_API_KEY` on the server, not in the browser.
- An Auth0 application for the studio on the iPad's tenant.

## 10. Feature list

| Feature | Original | Proposed |
| --- | --- | --- |
| One web app: inbox and asset browser are rooms | ✓ | ✓ |
| Same Auth0 tenant as the iPad. Grown-ups only | ✓ | ✓ |
| Supabase holds drafts and jobs. The iPad does not read it | ✓ | ✓ |
| Asset maker: batch, generate, carve, publish | ✓ | ✓ |
| Character studio: Meshy on the server, one gait per file | ✓ | ✓ |
| Play canvas is the default editor. Scene plate + place sprites. Click the thing. |  | ✓ |
| Adaptive dialogue: only the fields that apply to the selected scene or place |  | ✓ |
| Scene maker: drop the background, drop places, move them, configure them, pick a song, connect | ✓ | ✓ |
| World maker: a graph. Each scene is a node. A line is travel. Optional power layout. | ✓ | ✓ |
| Music inventory: assign a song to a scene | ✓ | ✓ |
| Server stores any number of worlds. Owner is a column, not the key | ✓ | ✓ |
| `/api/v1/worlds/current` stays the last world opened | ✓ | ✓ |
| Save to game writes the registry and that world id | ✓ | ✓ |
| iPad world selector, then play that document | ✓ | ✓ |
| Simulator is the iPad playing the world you just saved | ✓ | ✓ |
| No portrait and no sticks when the world has no character models | ✓ | ✓ |
| A new screen still needs an iPad build | ✓ | ✓ |
| Prompt engine (`gpt-5.6`) for scene, place, and batch prompts |  | ✓ |
| Open in Midjourney: copy the prompt, open Create, paste into the Imagine bar |  | ✓ |
| Style pin: one accepted background or `--sref` on later prompts |  | ✓ |
