# Abby and Ani’s Noodle House — encounter/session interface

Status: isolated native implementation. Shared overworld wiring, placement persistence, account admission, internet hosting and final art review remain pending.

## Placement and landing

Use pointy axial q/r cells (same convention as AmberVale board keys). Default restaurant footprint offsets are (0,0), (1,0), (0,1), (1,1), a connected staggered two-row region. Anchor is an axial cell. Rotation is an integer 0..5, each step (q,r) -> (-r,q+r), i.e. 60 degrees in axial coordinates. Mesh world-space bounds never determine occupancy. All four occupied cells and the adjacent entry cell must belong to the authoritative walkable land set; reject overlap, reserved entry obstruction, water, out-of-board cells, invalid rotation and non-increasing placement revisions. Entry must also be reachable in the board’s path graph; the isolated gate validates adjacency/land/reservation, while the board owner must validate route connectivity.

Completed movement event: universeId, worldId, playerProfileId, stable movementId, final axial cell. Emit only when movement completes. Do not emit on placement, actor spawn, hover, selection, camera focus, map load or merely crossing a cell. Preserve ordered RouteKeys alongside Route; Tiles/TileKeys are not route indices. Match any occupied cell of a placed restaurant within the same universe/world. Dedupe per player and movementId. Request a dialogue, not immediate level travel. Accept revalidates instance, cell and placement revision; moving away, declining or accepting consumes/invalidates the pending request. Different players receive independent requests. One landing produces one prompt, regardless of mesh components.

## Live session

Native AAWRestaurantMode is the entry bootstrap. Server spawns one replicated, always-relevant AAWRestaurantArena owning cooking, stations, orders, score, timers and chef positions. Every ~50ms it publishes a versioned authoritative snapshot. Clients render that state; they do not advance the kitchen timer/cooking. AAWRestaurantController receives an owned chef slot 0..3. Movement/work input uses unreliable RPCs with clamped direction and server delta time; pickup/place/pass uses reliable rate-limited RPCs. Expired input stops within 300ms. Pause/restart are host-only. Slot ownership is server-assigned and not selected by the input payload.

The current explicit RestaurantDevSession flag permits development direct-IP sessions. It is not account authentication. Without that flag or the automated network-proof flag, remote admission fails closed with a session-broker-required message. Do not ship either bypass as public admission.

Production broker proposal (not implemented): after accepted authoritative landing and universe membership verification, join/create a session keyed by universeId + POI instanceId + placement revision. Broker returns endpoint + short-lived single-use admission ticket bound to profile and session. Unreal host validates/consumes that ticket server-side before assigning a chef slot. Membership revocation must remove/deny players. Universe state/save endpoints store durable encounter results only; they are not realtime transport. Never forward Auth0 bearer tokens in Unreal travel URLs.

## Return/result

Server emits one durable result with stable encounter-run ID, universe/POI IDs, participants, served/score/missed and completion status. Universe owner validates/deduplicates before persisting with revision conflict handling. Existing ReturnToWorld currently opens the isolated frontend; restoring the exact shared overworld/universe is pending integration.

## Concrete operational dependencies

Shared HTTPS API activation and Supabase migration/connection are pending in the universe project. There is no authoritative multihex placement registry, completed-landing dispatcher, account session broker or deployed Unreal host/relay. These prevent claiming production online play and the integrated overworld encounter complete. Local two-process UE transport is verified independently.
